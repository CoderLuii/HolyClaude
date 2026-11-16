import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const helper = await import('../scripts/report-release-timings.mjs').catch(() => ({}));
const sha = 'a'.repeat(40);
const stamp = n => `2026-11-16T00:${String(n).padStart(2, '0')}:00Z`;
function fixture() {
  const run = { id: 123, head_sha: sha, path: '.github/workflows/docker-publish.yml', run_attempt: 2, status: 'completed', conclusion: 'failure', created_at: stamp(0), updated_at: stamp(9) };
  const job = (id, name, attempt, start, end, steps = []) => ({ id, name, run_id: 123, head_sha: sha, run_attempt: attempt, status: 'completed', conclusion: 'success', started_at: stamp(start), completed_at: stamp(end), labels: ['ubuntu-24.04-arm'], steps });
  const step = (name, start, end) => ({ name, status: 'completed', conclusion: 'success', started_at: stamp(start), completed_at: stamp(end) });
  const jobs = [job(1, 'candidate (full, arm64)', 1, 1, 4, [step('Build and push candidate', 2, 3)]), job(2, 'qualify (full, arm64)', 1, 4, 6), { ...job(3, 'qualify (full, arm64)', 2, 7, 9), conclusion: 'failure' }];
  return { run, jobs };
}
test('timing exports exist', () => assert.equal(typeof helper.summarizeRun, 'function'));
test('failed-only rerun records retained build without turning failure green', () => {
  const f = fixture(); const s = helper.summarizeRun(f.run, f.jobs);
  assert.equal(s.conclusion, 'failure'); assert.equal(s.aggregateRunnerSeconds, 420);
  assert.equal(s.elapsedSeconds, 480); assert.equal(s.attempts[1].buildJobs, 0);
  assert.equal(s.retainedBuilds[0].jobId, 1); assert.equal(s.retainedBuilds[0].qualificationJobId, 3);
  assert.equal(s.jobs[0].architecture, 'arm64'); assert.equal(s.jobs[0].buildSeconds, 60);
  assert.equal(s.cacheState, 'unknown');
});
test('old combined jobs expose measured qualification tail separately', () => {
  const f = fixture(); f.run.run_attempt = 1; f.jobs = [f.jobs[0]];
  f.jobs[0].steps.push({ name: 'Verify architecture and product facts contract', status: 'completed', started_at: stamp(3), completed_at: stamp(4), conclusion: 'success' });
  const s = helper.summarizeRun(f.run, f.jobs);
  assert.equal(s.jobs[0].qualificationSeconds, 60); assert.equal(s.jobs[0].qualificationBasis, 'combined-job tail');
});
test('real API retained Full ARM64 build clone is carried, not another execution', () => {
  // Excerpt of run43813763342 filter=all responses captured November16 UTC.
  const steps = [
    { name: 'Build and push candidate', number: 11, status: 'completed', conclusion: 'success', started_at: '2026-11-16T06:01:40Z', completed_at: '2026-11-16T06:22:16Z' },
    { name: 'Upload candidate build', number: 14, status: 'completed', conclusion: 'success', started_at: '2026-11-16T06:22:21Z', completed_at: '2026-11-16T06:22:22Z' },
  ];
  const original = { id: 133121230548, run_id: 43813763342, head_sha: 'dd7b75d2eb7515d73cde4b6be66e874ae73e85f0', run_attempt: 1, name: 'candidate (full, arm64)', status: 'completed', conclusion: 'success', created_at: '2026-11-16T06:00:10Z', started_at: '2026-11-16T06:00:15Z', completed_at: '2026-11-16T06:24:15Z', runner_id: 1000005598, runner_name: 'GitHub Actions 1000005598', labels: ['ubuntu-24.04-arm'], steps };
  const clone = { ...original, id: 133139557504, run_attempt: 2, created_at: '2026-11-16T06:51:25Z' };
  const run = { ...fixture().run, id: original.run_id, head_sha: original.head_sha };
  const s = helper.summarizeRun(run, [clone, original]);
  assert.equal(s.aggregateRunnerSeconds, 1440); assert.equal(s.attempts[1].buildJobs, 0);
  assert.equal(s.carriedJobs[0].canonicalJobId, original.id); assert.equal(s.carriedJobs[0].jobId, clone.id);
  assert.equal(s.jobs.find(row => row.jobId === clone.id).runnerSeconds, 0);
});
test('genuine reruns with new timestamps and later failures remain separate executions', () => {
  const f = fixture(); const original = f.jobs[0];
  f.jobs.push({ ...original, id: 4, run_attempt: 2, started_at: stamp(6), completed_at: stamp(7), steps: [], conclusion: 'failure' });
  const s = helper.summarizeRun(f.run, f.jobs);
  assert.equal(s.carriedJobs.length, 0); assert.equal(s.attempts[1].buildJobs, 1);
  assert.equal(s.jobs.find(row => row.jobId === 4).conclusion, 'failure');
});
test('terminal cancelled runner job preserves unfinished phases as unknown', () => {
  // Run43820193636 job133146208699 was terminal while its runner steps remained incomplete.
  const f = fixture(); f.run = { ...f.run, id: 43820193636, run_attempt: 1, conclusion: 'cancelled' };
  f.jobs = [{ ...f.jobs[0], id: 133146208699, run_id: f.run.id, conclusion: 'cancelled', started_at: '2026-11-16T07:09:09Z', completed_at: '2026-11-16T07:49:09Z', steps: [
    { name: 'Build and push candidate', number: 10, status: 'in_progress', conclusion: null, started_at: '2026-11-16T07:11:00Z', completed_at: null },
    { name: 'Capture registry digests', number: 11, status: 'pending', conclusion: null, started_at: null, completed_at: null },
  ] }];
  const summary = helper.summarizeRun(f.run, f.jobs);
  assert.equal(summary.conclusion, 'cancelled'); assert.equal(summary.aggregateRunnerSeconds, 2400);
  assert.equal(summary.jobs[0].buildSeconds, null);
  assert.equal(summary.jobs[0].incompletePhases.length, 2);
  assert.equal(summary.jobs[0].incompletePhases[0].completedAt, null);
});
for (const [name, change] of [
  ['source mismatch', f => { f.jobs[0].head_sha = 'b'.repeat(40); }],
  ['wrong run', f => { f.jobs[0].run_id = 9; }],
  ['wrong workflow', f => { f.run.path = 'other.yml'; }],
  ['incomplete run', f => { f.run.status = 'in_progress'; }],
  ['missing final attempt jobs', f => { f.jobs.pop(); }],
  ['architecture mismatch', f => { f.jobs[0].labels = ['ubuntu-24.04']; }],
  ['invalid timestamp', f => { f.jobs[0].completed_at = stamp(0); }],
  ['duplicate identity', f => { f.jobs.push(f.jobs[0]); }],
]) test(`rejects ${name}`, () => { const f = fixture(); change(f); assert.throws(() => helper.summarizeRun(f.run, f.jobs)); });
test('collection detects rerun starting during snapshot and validates request identity', () => {
  const f = fixture(); let calls = 0;
  assert.throws(() => helper.collectRun('123', 'CoderLuii/HolyClaude', endpoint => endpoint.includes('/jobs?') ? [ { total_count: 3, jobs: f.jobs } ] : (++calls === 1 ? f.run : { ...f.run, run_attempt: 3 })));
  assert.throws(() => helper.collectRun('bad', 'CoderLuii/HolyClaude', () => f.run));
});
test('collection refuses truncated pagination and requested-run substitution', () => {
  const f = fixture();
  assert.throws(() => helper.collectRun('123', 'CoderLuii/HolyClaude', endpoint => endpoint.includes('/jobs?') ? [{ total_count: 4, jobs: f.jobs }] : f.run), /pagination/);
  assert.throws(() => helper.collectRun('124', 'CoderLuii/HolyClaude', () => f.run), /requested run/);
});
test('older successful build superseded by failed build is not reported as retained', () => {
  const f = fixture(); f.jobs.push({ ...f.jobs[0], id: 4, run_attempt: 2, conclusion: 'failure' });
  assert.equal(helper.summarizeRun(f.run, f.jobs).retainedBuilds.length, 0);
});
test('comparison keeps unknown cache/queue caveats and exact sources', () => {
  const f = fixture(); const a = helper.summarizeRun(f.run, f.jobs); const b = structuredClone(a); b.source = 'b'.repeat(40);
  const c = helper.compareTimings(a, b); assert.equal(c.sameSource, false); assert.match(c.caveats.join(' '), /cache/); assert.equal(c.targets[0].leftBuildSeconds, 60);
});
test('comparison preserves unknown latest cancelled build instead of older successful duration', () => {
  const f = fixture();
  f.jobs.push({ ...f.jobs[0], id: 4, run_attempt: 2, conclusion: 'cancelled', started_at: stamp(6), completed_at: stamp(7), steps: [{ name: 'Build and push candidate', status: 'in_progress', conclusion: null, started_at: stamp(6), completed_at: null }] });
  const s = helper.summarizeRun(f.run, f.jobs);
  assert.equal(helper.compareTimings(s, s).targets[0].leftBuildSeconds, null);
});
test('comparison retains earlier build duration for qualification-only retry', () => {
  const f = fixture(); const s = helper.summarizeRun(f.run, f.jobs);
  assert.equal(helper.compareTimings(s, s).targets[0].leftBuildSeconds, 60);
  assert.equal(helper.compareTimings(s, s).targets[0].leftQualificationSeconds, 120);
});
test('actual CLI uses readonly fake gh API and writes raw/report evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'release-timings-'));
  try {
    const f = fixture(); writeFileSync(join(dir, 'fixture.json'), JSON.stringify(f));
    writeFileSync(join(dir, 'fake.mjs'), `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module'; import{readFileSync}from'node:fs'; const f=JSON.parse(readFileSync(${JSON.stringify(join(dir, 'fixture.json'))})); cp.spawnSync=(cmd,args)=>{if(cmd!=='gh'||args[0]!=='api')throw Error('not readonly API');return {status:0,stdout:JSON.stringify(args[1].includes('/jobs?')?[{total_count:f.jobs.length,jobs:f.jobs}]:f.run)}};syncBuiltinESMExports();`);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(join(dir, 'fake.mjs')).href, resolve('scripts/report-release-timings.mjs'), '--run', '123', '--output', join(dir, 'out')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); const s = JSON.parse(readFileSync(join(dir, 'out', '123', 'timing.json')));
    assert.equal(s.conclusion, 'failure'); assert.match(readFileSync(join(dir, 'out', '123', 'report.md'), 'utf8'), /failure/);
    assert.equal(JSON.parse(readFileSync(join(dir, 'out', '123', 'jobs.json'))).length, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
