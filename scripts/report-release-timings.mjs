import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalizeRetainedJobs } from './resolve-candidate-evidence.mjs';

const fail = message => { throw new Error(message); };
const numeric = value => /^[1-9][0-9]*$/.test(String(value));
const workflow = '.github/workflows/docker-publish.yml';
function time(value) {
  if (typeof value !== 'string' || !/Z$/.test(value) || !Number.isFinite(Date.parse(value))) fail(`invalid UTC timestamp: ${value}`);
  return Date.parse(value);
}
function duration(start, end) {
  const seconds = (time(end) - time(start)) / 1000;
  if (seconds < 0) fail('negative duration');
  return seconds;
}
function phase(job, name) {
  const steps = (job.steps ?? []).filter(step => step.name === name && step.conclusion !== 'skipped');
  if (steps.length > 1) fail(`duplicate phase: ${name}`);
  if (steps.length && (steps[0].status !== 'completed' || !steps[0].started_at || !steps[0].completed_at)) return null;
  return steps.length ? duration(steps[0].started_at, steps[0].completed_at) : null;
}

export function summarizeRun(run, jobs) {
  if (!numeric(run.id) || !numeric(run.run_attempt) || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '') || run.path !== workflow) fail('invalid workflow run identity');
  if (run.status !== 'completed' || !run.conclusion) fail('run is incomplete');
  if (!Array.isArray(jobs) || !jobs.length) fail('missing jobs');
  const ids = new Set(); const names = new Set();
  const rows = jobs.map(job => {
    if (!numeric(job.id) || ids.has(job.id) || String(job.run_id) !== String(run.id) || job.head_sha !== run.head_sha || !numeric(job.run_attempt) || job.run_attempt > run.run_attempt) fail('invalid job identity/source/attempt');
    ids.add(job.id);
    const identity = `${job.run_attempt}:${job.name}`;
    if (names.has(identity)) fail('duplicate job name within attempt');
    names.add(identity);
    if (job.status !== 'completed' || !job.conclusion) fail('job is incomplete');
    const match = /^(candidate|qualify) \((full|slim), (amd64|arm64)\)$/.exec(job.name);
    const active = job.conclusion !== 'skipped';
    const seconds = active ? duration(job.started_at, job.completed_at) : 0;
    let architecture = null;
    if (match && active) {
      const labels = job.labels ?? [];
      const arm = labels.some(label => /arm64|aarch64|-arm$/i.test(label));
      const amd = labels.some(label => /x64|amd64|^ubuntu-24\.04$/i.test(label));
      if ((match[3] === 'arm64' && (!arm || amd)) || (match[3] === 'amd64' && (!amd || arm))) fail(`runner architecture mismatch: ${job.name}`);
      architecture = match[3];
    }
    const incompletePhases = (job.steps ?? []).filter(step => step.conclusion !== 'skipped' && (step.status !== 'completed' || !step.started_at || !step.completed_at)).map(step => ({ name: step.name, status: step.status ?? null, conclusion: step.conclusion ?? null, startedAt: step.started_at ?? null, completedAt: step.completed_at ?? null, seconds: null }));
    const verify = (job.steps ?? []).find(step => step.name === 'Verify architecture and product facts contract' && step.conclusion !== 'skipped' && step.status === 'completed' && step.started_at && step.completed_at);
    return { jobId: job.id, name: job.name, attempt: Number(job.run_attempt), conclusion: job.conclusion, startedAt: job.started_at, completedAt: job.completed_at, runnerSeconds: seconds, kind: match?.[1] === 'candidate' ? 'build' : match?.[1] === 'qualify' ? 'qualification' : 'other', target: match ? `${match[2]}-${match[3]}` : null, architecture, labels: job.labels ?? [], incompletePhases, buildSeconds: active ? phase(job, 'Build and push candidate') : null, qualificationSeconds: !active ? null : match?.[1] === 'qualify' ? seconds : verify ? duration(verify.started_at, job.completed_at) : null, qualificationBasis: match?.[1] === 'qualify' ? 'separate job including setup' : verify ? 'combined-job tail' : null, smokeSeconds: active ? phase(job, 'Run complete candidate smoke matrix') : null, securitySeconds: active ? phase(job, 'Generate digest-bound security evidence') : null };
  });
  if (Math.max(...rows.map(row => row.attempt)) !== Number(run.run_attempt)) fail('latest run attempt has no jobs');
  const canonical = canonicalizeRetainedJobs(jobs);
  const carriedJobs = canonical.carriedJobs.map(job => ({ ...job, canonicalJobId: job.originalJobId }));
  for (const row of rows) {
    const carried = carriedJobs.find(job => job.jobId === row.jobId);
    row.carried = Boolean(carried);
    if (carried) Object.assign(row, { canonicalJobId: carried.originalJobId, runnerSeconds: 0, buildSeconds: null, qualificationSeconds: null, smokeSeconds: null, securitySeconds: null });
  }
  const attempts = [...new Set(rows.map(row => row.attempt))].sort((a, b) => a - b).map(attempt => {
    const subset = rows.filter(row => row.attempt === attempt && row.conclusion !== 'skipped' && !row.carried);
    return { attempt, carriedJobs: carriedJobs.filter(job => job.attempt === attempt).length, buildJobs: subset.filter(row => row.kind === 'build').length, qualificationJobs: subset.filter(row => row.kind === 'qualification').length, aggregateRunnerSeconds: subset.reduce((sum, row) => sum + row.runnerSeconds, 0), elapsedSeconds: subset.length ? (Math.max(...subset.map(row => time(row.completedAt))) - Math.min(...subset.map(row => time(row.startedAt)))) / 1000 : 0 };
  });
  const retainedBuilds = [];
  for (const target of new Set(rows.filter(row => row.target).map(row => row.target))) {
    const builds = rows.filter(row => row.target === target && row.kind === 'build' && !row.carried).sort((a, b) => b.attempt - a.attempt);
    const qualifiers = rows.filter(row => row.target === target && row.kind === 'qualification' && !row.carried).sort((a, b) => b.attempt - a.attempt);
    const build = builds[0]; const qualifier = qualifiers[0];
    if (build?.conclusion === 'success' && qualifier && build.attempt < qualifier.attempt && time(build.completedAt) <= time(qualifier.startedAt)) retainedBuilds.push({ target, jobId: build.jobId, buildAttempt: build.attempt, qualificationJobId: qualifier.jobId, qualificationAttempt: qualifier.attempt, basis: 'job scheduling evidence; artifact reuse requires separate digest evidence' });
  }
  const active = rows.filter(row => row.conclusion !== 'skipped');
  return { runId: run.id, source: run.head_sha, workflow: run.path, runAttempt: Number(run.run_attempt), conclusion: run.conclusion, createdAt: run.created_at, updatedAt: run.updated_at, cacheState: 'unknown', queueSeconds: null, aggregateRunnerSeconds: rows.reduce((sum, row) => sum + row.runnerSeconds, 0), elapsedSeconds: active.length ? (Math.max(...active.map(row => time(row.completedAt))) - Math.min(...active.map(row => time(row.startedAt)))) / 1000 : 0, attempts, carriedJobs, retainedBuilds, jobs: rows };
}

export function compareTimings(left, right) {
  const latest = (summary, target, key) => {
    const executions = summary.jobs.filter(row => row.target === target && !row.carried && row.conclusion !== 'skipped');
    const kind = key === 'buildSeconds' || !executions.some(row => row.kind === 'qualification') ? 'build' : 'qualification';
    return executions.filter(row => row.kind === kind).sort((a, b) => b.attempt - a.attempt)[0]?.[key] ?? null;
  };
  return { leftRunId: left.runId, rightRunId: right.runId, leftSource: left.source, rightSource: right.source, sameSource: left.source === right.source, targets: [...new Set([...left.jobs, ...right.jobs].filter(row => row.target).map(row => row.target))].sort().map(target => ({ target, leftBuildSeconds: latest(left, target, 'buildSeconds'), rightBuildSeconds: latest(right, target, 'buildSeconds'), leftQualificationSeconds: latest(left, target, 'qualificationSeconds'), rightQualificationSeconds: latest(right, target, 'qualificationSeconds') })), caveats: ['Different source SHAs invalidate an unchanged-source comparison.', 'Even unchanged source does not control cache state, runner queue, setup or image pulls.', 'Old combined qualification tails and separate qualification jobs have different setup boundaries.', 'Job API does not establish cache hits or causal speedup; no fastest-release claim.'] };
}

export function collectRun(runId, repository, api) {
  if (!numeric(runId) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail('invalid run ID or repository');
  const endpoint = `repos/${repository}/actions/runs/${runId}`;
  const before = api(endpoint);
  if (String(before.id) !== String(runId)) fail('requested run mismatch');
  if (before.repository?.full_name && before.repository.full_name.toLowerCase() !== repository.toLowerCase()) fail('requested repository mismatch');
  const pages = api(`${endpoint}/jobs?filter=all&per_page=100`, true);
  if (!Array.isArray(pages) || pages.some(page => !Array.isArray(page.jobs))) fail('invalid paginated jobs response');
  const jobs = pages.flatMap(page => page.jobs);
  if (pages[0]?.total_count !== jobs.length) fail('incomplete job pagination');
  const after = api(endpoint);
  for (const key of ['id', 'head_sha', 'path', 'run_attempt', 'status', 'conclusion', 'updated_at']) if (before[key] !== after[key]) fail('run changed during timing snapshot');
  return { run: after, jobs, summary: summarizeRun(after, jobs) };
}

function api(endpoint, paginate = false) {
  const result = spawnSync('gh', ['api', endpoint, ...(paginate ? ['--paginate', '--slurp'] : [])], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) fail(`gh API failed: ${result.stderr ?? result.error?.message}`);
  return JSON.parse(result.stdout);
}
function report(summary, repository, collectedAt) {
  return `# Release timing\n\nCollected ${collectedAt}. [Run ${summary.runId}](https://github.com/${repository}/actions/runs/${summary.runId}), source \`${summary.source}\`, attempt ${summary.runAttempt}, conclusion **${summary.conclusion}**.\n\nAggregate runner execution: ${summary.aggregateRunnerSeconds}s. First job start to last job completion across attempts: ${summary.elapsedSeconds}s. These are different measures. Cache hits and isolated runner queue time: unknown.\n\n| Attempt | Builds | Qualifications | Carried API records | Aggregate runner seconds | Elapsed seconds |\n|---|---|---|---|---|---|\n${summary.attempts.map(row => `| ${row.attempt} | ${row.buildJobs} | ${row.qualificationJobs} | ${row.carriedJobs} | ${row.aggregateRunnerSeconds} | ${row.elapsedSeconds} |`).join('\n')}\n\nCarried API records (not executions): ${JSON.stringify(summary.carriedJobs)}.\n\nRetained build scheduling evidence: ${JSON.stringify(summary.retainedBuilds)}. Artifact digest reuse is not proved by timing alone. Failed and cancelled conclusions remain unchanged. Unfinished step durations are null (unknown), not zero; timing.json preserves their statuses and timestamps in incompletePhases.\n`;
}
function main() {
  const options = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    if (!['--run', '--output', '--compare'].includes(key) || options[key] || !process.argv[index + 1]) fail('usage: --run ID --output DIR [--compare ID]');
    options[key] = process.argv[index + 1];
  }
  if (!options['--run'] || !options['--output']) fail('run and output required');
  const repository = process.env.GH_REPO || process.env.GITHUB_REPOSITORY || 'CoderLuii/HolyClaude';
  const ids = [options['--run'], ...(options['--compare'] ? [options['--compare']] : [])];
  if (new Set(ids).size !== ids.length) fail('comparison needs distinct run IDs');
  const results = ids.map(id => collectRun(id, repository, api));
  const output = resolve(options['--output']); const collectedAt = new Date().toISOString();
  mkdirSync(output, { recursive: true });
  for (const result of results) {
    const directory = join(output, String(result.run.id)); mkdirSync(directory);
    for (const [name, value] of [['run.json', result.run], ['jobs.json', result.jobs], ['timing.json', { ...result.summary, repository, collectedAt }]]) writeFileSync(join(directory, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    writeFileSync(join(directory, 'report.md'), report(result.summary, repository, collectedAt), { flag: 'wx' });
  }
  if (results.length === 2) {
    const comparison = compareTimings(results[0].summary, results[1].summary);
    writeFileSync(join(output, 'comparison.json'), `${JSON.stringify({ ...comparison, collectedAt }, null, 2)}\n`, { flag: 'wx' });
    const table = comparison.targets.map(row => `| ${row.target} | ${row.leftBuildSeconds ?? 'unknown/not run'} | ${row.rightBuildSeconds ?? 'unknown/not run'} | ${row.leftQualificationSeconds ?? 'unknown/not run'} | ${row.rightQualificationSeconds ?? 'unknown/not run'} |`).join('\n');
    writeFileSync(join(output, 'comparison.md'), `# Timing comparison\n\nCollected ${collectedAt}. [Run ${comparison.leftRunId}](https://github.com/${repository}/actions/runs/${comparison.leftRunId}) source \`${comparison.leftSource}\`; [run ${comparison.rightRunId}](https://github.com/${repository}/actions/runs/${comparison.rightRunId}) source \`${comparison.rightSource}\`. Same source: ${comparison.sameSource}.\n\n| Target | Left build seconds | Right build seconds | Left qualification seconds | Right qualification seconds |\n|---|---|---|---|---|\n${table}\n\n${comparison.caveats.join('\n\n')}\n`, { flag: 'wx' });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
