import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const helper = await import('../scripts/resolve-candidate-evidence.mjs').catch(() => ({}));
const sha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;
const targets = [['full', 'amd64'], ['full', 'arm64'], ['slim', 'amd64'], ['slim', 'arm64']];
function fixture() {
  const run = { id: 123, head_sha: sha, head_branch: 'release/v1.6.9', event: 'push', path: '.github/workflows/docker-publish.yml', status: 'completed', conclusion: 'success', run_attempt: 2 };
  let id = 1;
  const job = (name, attempt) => ({ id: id++, name, run_id: 123, head_sha: sha, run_attempt: attempt, status: 'completed', conclusion: 'success', started_at: '2026-11-15T01:00:00Z', completed_at: '2026-11-15T02:00:00Z' });
  const jobs = [job('validate release source', 2)];
  const artifacts = [];
  for (const [variant, arch] of targets) {
    const q = arch === 'arm64' ? 2 : 1;
    jobs.push(job(`candidate (${variant}, ${arch})`, 1), { ...job(`qualify (${variant}, ${arch})`, q), started_at: '2026-11-15T02:00:00Z', completed_at: '2026-11-15T03:00:00Z' });
    for (const [prefix, attempt] of [['candidate-build', 1], ['candidate-evidence', q], ['security-evidence', q]]) {
      artifacts.push({ id: id++, name: `${prefix}-${variant}-${arch}-${attempt}`, expired: false, digest, created_at: prefix === 'candidate-build' ? '2026-11-15T01:30:00Z' : '2026-11-15T02:30:00Z', workflow_run: { id: 123, head_sha: sha, head_branch: run.head_branch } });
    }
  }
  return { run, jobs, artifacts, source: sha, runId: '123' };
}
function select(f = fixture(), options = {}) { return helper.selectEvidence({ ...f, mode: 'promotion', ...options }); }
function record(target, attempt = 1) {
  const [variant, arch] = target;
  const suffix = `candidate-${sha}-123-${attempt}-${variant}-${arch}`;
  return { purpose: 'release', source_sha: sha, run_id: '123', run_attempt: String(attempt), release: 'v1.6.9', variant, arch, platform: `linux/${arch}`, dockerhub_ref: `coderluii/holyclaude:${suffix}`, ghcr_ref: `ghcr.io/coderluii/holyclaude:${suffix}`, dockerhub_digest: digest, ghcr_digest: digest, artifact_sha256: 'c'.repeat(64) };
}

test('resolver exports behavior for real API evidence selection', () => {
  assert.equal(typeof helper.selectEvidence, 'function');
  assert.equal(typeof helper.validateRecords, 'function');
});
test('promotion accepts selective qualification retries without rebuilding other targets', () => {
  const selection = select();
  assert.equal(selection.targets.length, 4);
  assert.equal(selection.targets[0].build.run_attempt, 1);
  assert.equal(selection.targets[1].qualify.run_attempt, 2);
  assert.equal(selection.targets[0].qualify.run_attempt, 1);
});
test('newer failed build or qualification invalidates old successful target', () => {
  for (const name of ['candidate (full, amd64)', 'qualify (full, amd64)']) {
    const f = fixture();
    f.run.run_attempt = 3;
    f.jobs.push({ ...f.jobs.find(j => j.name === name), id: 999, run_attempt: 3, conclusion: 'failure' });
    assert.throws(() => select(f), /latest.*successful/i);
  }
});
test('duplicate jobs in one attempt and duplicate or expired artifacts fail closed', () => {
  let f = fixture(); f.jobs.push({ ...f.jobs[1], id: 999 });
  assert.throws(() => select(f), /duplicate/i);
  f = fixture(); f.artifacts.push({ ...f.artifacts[0], id: 999 });
  assert.throws(() => select(f), /exactly one/i);
  f = fixture(); f.artifacts[0].expired = true;
  assert.throws(() => select(f), /expired/i);
});
test('wrong source/run/workflow/release and pending source validation fail closed', () => {
  for (const mutate of [
    f => { f.run.head_sha = 'd'.repeat(40); },
    f => { f.run.id = 456; },
    f => { f.run.path = '.github/workflows/other.yml'; },
    f => { f.run.head_branch = 'master'; },
    f => { f.jobs[0].conclusion = null; },
    f => { f.artifacts[0].workflow_run.head_sha = 'd'.repeat(40); },
    f => { f.artifacts[0].created_at = '2026-11-15T03:00:00Z'; },
  ]) { const f = fixture(); mutate(f); assert.throws(() => select(f)); }
});
test('build mode accepts in-progress run and uses one completed build target only', () => {
  const f = fixture(); f.run.status = 'in_progress'; f.run.conclusion = null;
  const s = select(f, { mode: 'build', variant: 'full', arch: 'arm64' });
  assert.equal(s.targets.length, 1);
  assert.equal(s.targets[0].build.run_attempt, 1);
});

test('manual benchmark build requires explicit purpose and release, and cannot be promoted', () => {
  const f = fixture(); Object.assign(f.run, { event: 'workflow_dispatch', head_branch: 'master', status: 'in_progress', conclusion: null });
  f.artifacts.forEach(a => { a.workflow_run.head_branch = 'master'; });
  const options = { mode: 'build', variant: 'full', arch: 'amd64', benchmark: true, release: 'v1.6.9' };
  const selection = select(f, options);
  assert.equal(selection.purpose, 'benchmark'); assert.equal(selection.release, 'v1.6.9');
  const build = { ...record(['full', 'amd64']), purpose: 'benchmark' };
  assert.doesNotThrow(() => helper.validateRecords({ selection, target: selection.targets[0], build }));
  for (const overrides of [{ benchmark: false }, { release: undefined }, { release: 'invalid' }, { mode: 'promotion' }]) assert.throws(() => select(f, { ...options, ...overrides }));
  f.run.event = 'push'; assert.throws(() => select(f, options));
});

test('release promotion rejects benchmark or missing-purpose evidence despite valid API source claims', () => {
  const selection = select(); const target = selection.targets[0];
  const build = record(['full', 'amd64']); const qualified = { ...build, build_attempt: '1' };
  for (const purpose of ['benchmark', undefined]) {
    assert.throws(() => helper.validateRecords({ selection, target, build: { ...build, purpose }, qualified }));
    assert.throws(() => helper.validateRecords({ selection, target, build, qualified: { ...qualified, purpose } }));
  }
});
test('downloaded records bind qualification to the exact selected build', () => {
  const s = select(); const target = s.targets[1];
  const build = record(['full', 'arm64']);
  const qualified = { ...build, run_attempt: '2', build_attempt: '1' };
  assert.doesNotThrow(() => helper.validateRecords({ selection: s, target, build, qualified }));
  for (const mutate of [
    r => { r.build_attempt = '2'; },
    r => { r.run_attempt = '1'; },
    r => { r.dockerhub_digest = `sha256:${'d'.repeat(64)}`; },
    r => { r.dockerhub_ref = r.dockerhub_ref.replace('-1-full', '-2-full'); },
    r => { r.source_sha = 'd'.repeat(40); },
    r => { r.artifact_sha256 = 'd'.repeat(64); },
  ]) { const r = structuredClone(qualified); mutate(r); assert.throws(() => helper.validateRecords({ selection: s, target, build, qualified: r })); }
});

test('a successful newer build supersedes an earlier qualification', () => {
  const f = fixture();
  f.jobs.push({ ...f.jobs[1], id: 999, run_attempt: 2 });
  f.artifacts.push({ ...f.artifacts[0], id: 1000, name: 'candidate-build-full-amd64-2' });
  assert.throws(() => select(f), /superseded/);
});

test('ZIP bytes must match API digest and unsafe member names cannot escape the output', () => {
  assert.equal(typeof helper.extractArtifact, 'function');
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-artifact-test-'));
  try {
    const archive = join(root, 'artifact.zip');
    const destination = join(root, 'output');
    const make = name => {
      const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1], "w") as z: z.writestr(sys.argv[2], "evidence")', archive, name], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return `sha256:${createHash('sha256').update(readFileSync(archive)).digest('hex')}`;
    };
    const validDigest = make('full-amd64.json');
    assert.throws(() => helper.extractArtifact(archive, destination, digest), /digest mismatch/);
    helper.extractArtifact(archive, destination, validDigest);
    assert.equal(readFileSync(join(destination, 'full-amd64.json'), 'utf8'), 'evidence');
    for (const name of ['../escaped.json', '/absolute.json', 'C:/escaped.json', '..\\escaped.json']) {
      const hash = make(name);
      assert.throws(() => helper.extractArtifact(archive, join(root, 'unsafe'), hash), /unsafe artifact/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing API timestamps and impossible future job attempts fail closed', () => {
  for (const mutate of [
    f => { delete f.artifacts[0].created_at; },
    f => { delete f.jobs[1].started_at; },
    f => { f.jobs[1].completed_at = 'invalid'; },
    f => { f.jobs[1].run_attempt = 3; },
    f => { f.run.run_attempt = undefined; },
  ]) { const f = fixture(); mutate(f); assert.throws(() => select(f)); }
});

test('ZIP normalized path collisions and special files are rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-zip-collision-'));
  try {
    const archive = join(root, 'artifact.zip');
    for (const mode of ['collision', 'device']) {
      const script = 'import sys,zipfile,stat\nwith zipfile.ZipFile(sys.argv[1], "w") as z:\n if sys.argv[2] == "collision":\n  z.writestr("a", "first")\n  z.writestr("./a", "second")\n else:\n  i=zipfile.ZipInfo("device"); i.create_system=3; i.external_attr=(stat.S_IFCHR|0o600)<<16; z.writestr(i, "")';
      const made = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', script, archive, mode], { encoding: 'utf8' });
      assert.equal(made.status, 0, made.stderr);
      const hash = `sha256:${createHash('sha256').update(readFileSync(archive)).digest('hex')}`;
      assert.throws(() => helper.extractArtifact(archive, join(root, mode), hash), /unsafe artifact/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('executable CLI resolves workflow-generated build and promotion records across paginated API fixtures', () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-cli-fixture-'));
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  const repo = process.cwd();
  const writerRoot = join(root, 'writer');
  mkdirSync(join(writerRoot, 'vendor', 'artifacts'), { recursive: true });
  mkdirSync(join(writerRoot, 'candidate-build')); mkdirSync(join(writerRoot, 'evidence'));
  const retainedArchive = 'cloudcli-ai-cloudcli-1.37.3-holyclaude-account-management.tgz';
  copyFileSync(join(repo, 'vendor', 'artifacts', retainedArchive), join(writerRoot, 'vendor', 'artifacts', retainedArchive));
  try {
    const f = fixture();
    const apiFixture = { ...f, downloads: {}, calls: join(root, 'calls.jsonl') };
    const scripts = {};
    for (const step of ['Write candidate build', 'Write candidate evidence']) {
      const start = workflow.indexOf(`      - name: ${step}\n`);
      assert.ok(start >= 0, `workflow step exists: ${step}`);
      const body = workflow.slice(start).match(/          python3 - <<'PY'\n([\s\S]*?)          PY/);
      assert.ok(body, `workflow record writer exists: ${step}`);
      scripts[step] = body[1].replace(/^ {10}/gm, '');
    }
    for (const [variant, arch] of targets) {
      const key = `${variant}-${arch}`;
      const q = arch === 'arm64' ? 2 : 1;
      const build = record([variant, arch]);
      for (const [prefix, attempt, step, directory] of [
        ['candidate-build', 1, 'Write candidate build', 'candidate-build'],
        ['candidate-evidence', q, 'Write candidate evidence', 'evidence'],
        ['security-evidence', q, null, 'security'],
      ]) {
        const artifact = f.artifacts.find(a => a.name === `${prefix}-${key}-${attempt}`);
        const stage = join(root, `${prefix}-${key}`); mkdirSync(join(stage, directory), { recursive: true });
        let member;
        if (step) {
          // Execute the real workflow's record writers, so schema drift fails here.
          const writer = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', scripts[step]], { cwd: writerRoot, encoding: 'utf8', env: { ...process.env, PURPOSE: 'release', SOURCE_SHA: sha, RELEASE: 'v1.6.9', RUN_ID: '123', RUN_ATTEMPT: String(attempt), BUILD_ATTEMPT: '1', VARIANT: variant, ARCH: arch, DOCKERHUB_REF: build.dockerhub_ref, GHCR_REF: build.ghcr_ref, DOCKERHUB_DIGEST: digest, GHCR_DIGEST: digest } });
          assert.equal(writer.status, 0, writer.stderr);
          member = `${key}.json`;
          // Writers use repository-relative vendor inputs and output directories.
          writeFileSync(join(stage, directory, member), readFileSync(join(writerRoot, directory, member)));
        } else { member = 'metadata.json'; writeFileSync(join(stage, directory, member), JSON.stringify({ imageDigest: digest, variant, arch })); }
        const zip = join(root, `${artifact.id}.zip`);
        const zipped = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1], "w") as z: z.write(sys.argv[2], sys.argv[3])', zip, join(stage, directory, member), member], { encoding: 'utf8' });
        assert.equal(zipped.status, 0, zipped.stderr);
        artifact.digest = `sha256:${createHash('sha256').update(readFileSync(zip)).digest('hex')}`;
        apiFixture.downloads[artifact.id] = zip;
      }
    }
    const fixturePath = join(root, 'api.json'); writeFileSync(fixturePath, JSON.stringify(apiFixture));
    const fakeGh = join(root, 'gh.mjs');
    writeFileSync(fakeGh, `import {readFileSync,appendFileSync} from 'node:fs';\nconst f=JSON.parse(readFileSync(process.env.CANDIDATE_API_FIXTURE,'utf8')); const args=process.argv.slice(2); appendFileSync(f.calls,JSON.stringify(args)+'\\n'); const path=args.at(-1);\nif(args[0]!=='api') throw Error('read-only api only');\nif(path.endsWith('/jobs?filter=all&per_page=100')) { if(!args.includes('--paginate')||!args.includes('--slurp')) throw Error('pagination missing'); process.stdout.write(JSON.stringify([{jobs:f.jobs.slice(0,4)},{jobs:f.jobs.slice(4)}])); }\nelse if(path.endsWith('/artifacts?per_page=100')) {if(!args.includes('--paginate')||!args.includes('--slurp')) throw Error('pagination missing'); process.stdout.write(JSON.stringify([{artifacts:f.artifacts.slice(0,5)},{artifacts:f.artifacts.slice(5)}]));}\nelse if(/\\/artifacts\\/\\d+\\/zip$/.test(path)) {process.stdout.write(readFileSync(f.downloads[path.split('/').at(-2)]));}\nelse if(path.endsWith('/runs/123')) process.stdout.write(JSON.stringify(f.run)); else throw Error('unexpected API '+path);\n`);
    const preload = join(root, 'preload.mjs');
    writeFileSync(preload, `import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module'; const original=cp.spawnSync; cp.spawnSync=(command,args,options)=>command==='gh'?original(process.execPath,[${JSON.stringify(fakeGh)},...args],options):original(command,args,options); syncBuiltinESMExports();`);
    const cli = fileURLToPath(new URL('../scripts/resolve-candidate-evidence.mjs', import.meta.url));
    const invoke = (mode, output, extra = []) => spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, cli, mode, '--run', '123', '--source', sha, '--output', output, ...(mode === 'build' ? ['--variant', 'full', '--arch', 'arm64'] : []), ...extra], { encoding: 'utf8', env: { ...process.env, GH_REPO: 'coderluii/holyclaude', CANDIDATE_API_FIXTURE: fixturePath } });
    const buildOutput = join(root, 'selected-build');
    let result = invoke('build', buildOutput); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(buildOutput, 'full-arm64.json'), 'utf8')).run_attempt, '1');
    const promotionOutput = join(root, 'promotion');
    result = invoke('promotion', promotionOutput); assert.equal(result.status, 0, result.stderr);
    for (const [variant, arch] of targets) {
      const key = `${variant}-${arch}`;
      const q = JSON.parse(readFileSync(join(promotionOutput, 'evidence', `${key}.json`), 'utf8'));
      assert.equal(q.build_attempt, '1'); assert.equal(q.run_attempt, arch === 'arm64' ? '2' : '1');
      assert.ok(existsSync(join(promotionOutput, 'candidate-build', key, `${key}.json`)));
      assert.ok(existsSync(join(promotionOutput, 'security-evidence', `security-evidence-${key}`, 'metadata.json')));
    }
    const selection = JSON.parse(readFileSync(join(promotionOutput, 'candidate-run-evidence', 'selection.json'), 'utf8'));
    assert.equal(selection.targets.length, 4);
    assert.equal(JSON.parse(readFileSync(join(promotionOutput, 'candidate-run-evidence', 'candidate-jobs.json'), 'utf8')).jobs.length, f.jobs.length);
    const calls = readFileSync(apiFixture.calls, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(calls.filter(args => args.at(-1).endsWith('/zip')).length, 13);
    // Dispatch builds are usable only in the explicit nonpromotable path.
    Object.assign(apiFixture.run, { event: 'workflow_dispatch', head_branch: 'benchmark-workflow', status: 'in_progress', conclusion: null });
    apiFixture.artifacts.forEach(a => { a.workflow_run.head_branch = 'benchmark-workflow'; });
    const benchmarkArtifact = apiFixture.artifacts.find(a => a.name === 'candidate-build-full-arm64-1');
    const benchmarkRecordPath = join(root, 'candidate-build-full-arm64', 'candidate-build', 'full-arm64.json');
    const benchmarkRecord = JSON.parse(readFileSync(benchmarkRecordPath, 'utf8')); benchmarkRecord.purpose = 'benchmark'; writeFileSync(benchmarkRecordPath, JSON.stringify(benchmarkRecord));
    const benchmarkZip = apiFixture.downloads[benchmarkArtifact.id];
    const zipped = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', 'import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1], "w") as z: z.write(sys.argv[2], "full-arm64.json")', benchmarkZip, benchmarkRecordPath], { encoding: 'utf8' });
    assert.equal(zipped.status, 0, zipped.stderr);
    benchmarkArtifact.digest = `sha256:${createHash('sha256').update(readFileSync(benchmarkZip)).digest('hex')}`;
    writeFileSync(fixturePath, JSON.stringify(apiFixture));
    result = invoke('build', join(root, 'benchmark'), ['--benchmark', '--release', 'v1.6.9']); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(root, 'benchmark', 'full-arm64.json'), 'utf8')).purpose, 'benchmark');
    for (const args of [[], ['--benchmark'], ['--release', 'v1.6.9']]) assert.notEqual(invoke('build', join(root, 'invalid-benchmark'), args).status, 0);
    assert.notEqual(invoke('promotion', join(root, 'invalid-promotion'), ['--benchmark', '--release', 'v1.6.9']).status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
