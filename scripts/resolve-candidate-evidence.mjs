import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const targets = [['full', 'amd64'], ['full', 'arm64'], ['slim', 'amd64'], ['slim', 'arm64']];
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const fail = message => { throw new Error(message); };
const numeric = value => /^[1-9][0-9]*$/.test(String(value));

function latestJob(jobs, name, runId, source, runAttempt) {
  const matches = jobs.filter(job => job.name === name);
  if (!matches.length) fail(`missing job ${name}`);
  for (const job of matches) {
    if (!numeric(job.id) || !numeric(job.run_attempt) || Number(job.run_attempt) > Number(runAttempt) || String(job.run_id) !== String(runId) || job.head_sha !== source) fail(`invalid job identity: ${name}`);
  }
  const attempt = Math.max(...matches.map(job => Number(job.run_attempt)));
  const latest = matches.filter(job => Number(job.run_attempt) === attempt);
  if (latest.length !== 1) fail(`duplicate job ${name} in attempt ${attempt}`);
  if (latest[0].status !== 'completed' || latest[0].conclusion !== 'success') fail(`latest job must be successful: ${name}`);
  const [start, end] = [latest[0].started_at, latest[0].completed_at].map(value => typeof value === 'string' ? Date.parse(value) : NaN);
  if (![start, end].every(Number.isFinite) || end < start) fail(`invalid selected job timing: ${name}`);
  return latest[0];
}

function artifactFor(artifacts, name, job, run) {
  const matches = artifacts.filter(artifact => artifact.name === name);
  if (matches.length !== 1) fail(`expected exactly one artifact ${name}, found ${matches.length}`);
  const artifact = matches[0];
  if (artifact.expired || (artifact.expires_at && Date.parse(artifact.expires_at) <= Date.now())) fail(`expired artifact ${name}`);
  if (!numeric(artifact.id) || !digestPattern.test(artifact.digest ?? '')) fail(`invalid artifact identity/digest: ${name}`);
  if (String(artifact.workflow_run?.id) !== String(run.id) || artifact.workflow_run?.head_sha !== run.head_sha || artifact.workflow_run?.head_branch !== run.head_branch) fail(`artifact source/run mismatch: ${name}`);
  // Artifact upload happens inside its successful job. A name alone cannot
  // establish an attempt; API timestamps must substantiate the claim.
  const [created, start, end] = [artifact.created_at, job.started_at, job.completed_at].map(value => typeof value === 'string' ? Date.parse(value) : NaN);
  if (![created, start, end].every(Number.isFinite) || created < start || created > end) fail(`artifact outside selected job timing: ${name}`);
  return artifact;
}

export function selectEvidence({ mode, run, jobs, artifacts, source, runId, variant, arch, benchmark = false, release }) {
  if (!['build', 'promotion'].includes(mode)) fail('mode must be build or promotion');
  if (!numeric(runId) || !/^[0-9a-f]{40}$/.test(source ?? '')) fail('invalid requested run/source');
  if (!numeric(run.run_attempt) || String(run.id) !== String(runId) || run.head_sha !== source || run.path !== '.github/workflows/docker-publish.yml') fail('candidate workflow run source/release mismatch');
  if (benchmark) {
    if (mode !== 'build' || run.event !== 'workflow_dispatch' || typeof run.head_branch !== 'string' || !run.head_branch.trim() || !/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(release ?? '')) fail('benchmark requires manual build and explicit release metadata');
  } else if (release !== undefined || run.event !== 'push' || !/^release\/v[0-9]+\.[0-9]+\.[0-9]+$/.test(run.head_branch ?? '')) fail('candidate workflow run source/release mismatch');
  if (mode === 'promotion' && (run.status !== 'completed' || run.conclusion !== 'success')) fail('promotion requires successful candidate run');
  latestJob(jobs, 'validate release source', runId, source, run.run_attempt);
  const selectedTargets = mode === 'build' ? targets.filter(([v, a]) => v === variant && a === arch) : targets;
  if (!selectedTargets.length) fail('invalid variant/architecture');
  const selected = selectedTargets.map(([v, a]) => {
    const build = latestJob(jobs, `candidate (${v}, ${a})`, runId, source, run.run_attempt);
    const key = `${v}-${a}`;
    const result = { variant: v, arch: a, build, buildArtifact: artifactFor(artifacts, `candidate-build-${key}-${build.run_attempt}`, build, run) };
    if (mode === 'promotion') {
      const qualify = latestJob(jobs, `qualify (${v}, ${a})`, runId, source, run.run_attempt);
      if (Number(qualify.run_attempt) < Number(build.run_attempt) || (build.completed_at && qualify.started_at && Date.parse(qualify.started_at) < Date.parse(build.completed_at))) fail(`qualification superseded by build for ${key}`);
      Object.assign(result, { qualify, candidateArtifact: artifactFor(artifacts, `candidate-evidence-${key}-${qualify.run_attempt}`, qualify, run), securityArtifact: artifactFor(artifacts, `security-evidence-${key}-${qualify.run_attempt}`, qualify, run) });
    }
    return result;
  });
  return { schemaVersion: 1, purpose: benchmark ? 'benchmark' : 'release', run_id: String(runId), source_sha: source, release: benchmark ? release : run.head_branch.slice('release/'.length), targets: selected };
}

export function validateRecords({ selection, target, build, qualified }) {
  const check = (record, attempt, buildAttempt) => {
    if (!record || record.purpose !== selection.purpose || record.source_sha !== selection.source_sha || String(record.run_id) !== selection.run_id || String(record.run_attempt) !== String(attempt) || record.release !== selection.release || record.variant !== target.variant || record.arch !== target.arch || record.platform !== `linux/${target.arch}`) fail('downloaded candidate record identity mismatch');
    if (!/^[0-9a-f]{64}$/.test(record.artifact_sha256 ?? '')) fail('invalid retained artifact SHA256');
    const suffix = `candidate-${selection.source_sha}-${selection.run_id}-${buildAttempt}-${target.variant}-${target.arch}`;
    for (const [registry, image] of [['dockerhub', 'coderluii/holyclaude'], ['ghcr', 'ghcr.io/coderluii/holyclaude']]) {
      if (record[`${registry}_ref`] !== `${image}:${suffix}` || !digestPattern.test(record[`${registry}_digest`] ?? '')) fail(`downloaded ${registry} ref/digest mismatch`);
    }
  };
  check(build, target.build.run_attempt, target.build.run_attempt);
  if (qualified) {
    check(qualified, target.qualify.run_attempt, target.build.run_attempt);
    if (String(qualified.build_attempt) !== String(target.build.run_attempt)) fail('qualification build attempt mismatch');
    for (const key of ['dockerhub_ref', 'ghcr_ref', 'dockerhub_digest', 'ghcr_digest', 'artifact_sha256']) if (qualified[key] !== build[key]) fail(`qualification does not match selected build: ${key}`);
  }
}

function gh(args, options = {}) {
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`gh ${args[0]} failed: ${result.stderr ?? result.status}`);
  return result.stdout;
}
const jsonApi = path => JSON.parse(gh(['api', path]));
function paginated(path, key) {
  const pages = JSON.parse(gh(['api', '--paginate', '--slurp', path]));
  return pages.flatMap(page => { if (!Array.isArray(page[key])) fail(`missing API ${key} array`); return page[key]; });
}
function saveJson(path, data) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`); }

function download(repo, artifact, destination, temporary) {
  if (existsSync(destination) && readdirSync(destination).length) fail(`artifact output already contains files: ${destination}`);
  mkdirSync(destination, { recursive: true });
  const archive = join(temporary, `${artifact.id}.zip`);
  const fd = openSync(archive, 'w');
  try { gh(['api', `repos/${repo}/actions/artifacts/${artifact.id}/zip`], { stdio: ['ignore', fd, 'pipe'] }); } finally { closeSync(fd); }
  extractArtifact(archive, destination, artifact.digest);
}

export function extractArtifact(archive, destination, expectedDigest) {
  if (`sha256:${createHash('sha256').update(readFileSync(archive)).digest('hex')}` !== expectedDigest) fail('downloaded artifact ZIP digest mismatch');
  // The files are evidence inputs, not executable content. Reject path traversal,
  // links and duplicate members before extracting even a single member.
  const script = `import pathlib, stat, sys, zipfile\nroot = pathlib.Path(sys.argv[2]).resolve()\nwith zipfile.ZipFile(sys.argv[1]) as archive:\n seen = set()\n for member in archive.infolist():\n  path = pathlib.PurePosixPath(member.filename)\n  target = root.joinpath(*path.parts).resolve()\n  if path.is_absolute() or '..' in path.parts or '\\\\' in member.filename or ':' in member.filename or not target.is_relative_to(root) or stat.S_IFMT(member.external_attr >> 16) not in (0, stat.S_IFREG, stat.S_IFDIR) or target in seen:\n   raise SystemExit('unsafe artifact ZIP member: ' + member.filename)\n  seen.add(target)\n archive.extractall(root)\n`;
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', script, archive, destination], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) fail(`artifact extraction failed: ${result.stderr}`);
}

export function main(args = process.argv.slice(2)) {
  const mode = args.shift(); const options = {};
  while (args.length) {
    const key = args.shift();
    if (key === '--benchmark' && options[key] === undefined) { options[key] = true; continue; }
    if (!['--run', '--source', '--variant', '--arch', '--output', '--release'].includes(key) || !args.length || options[key] !== undefined) fail(`invalid argument ${key}`);
    options[key] = args.shift();
  }
  if (Boolean(options['--benchmark']) !== (options['--release'] !== undefined)) fail('--benchmark and --release must be supplied together');
  const repo = process.env.GH_REPO || process.env.GITHUB_REPOSITORY;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo ?? '')) fail('GH_REPO or GITHUB_REPOSITORY is required');
  const runId = options['--run']; const source = options['--source'];
  if (!numeric(runId)) fail('--run must be numeric');
  const base = `repos/${repo}/actions/runs/${runId}`;
  const run = jsonApi(base);
  const jobs = paginated(`${base}/jobs?filter=all&per_page=100`, 'jobs');
  const artifacts = paginated(`${base}/artifacts?per_page=100`, 'artifacts');
  const selection = selectEvidence({ mode, run, jobs, artifacts, source, runId, variant: options['--variant'], arch: options['--arch'], benchmark: Boolean(options['--benchmark']), release: options['--release'] });
  const output = resolve(options['--output'] || '.');
  const temporary = mkdtempSync(join(tmpdir(), 'holyclaude-candidate-evidence-'));
  try {
    for (const target of selection.targets) {
      const key = `${target.variant}-${target.arch}`;
      const buildDirectory = mode === 'build' ? output : join(output, 'candidate-build', key);
      download(repo, target.buildArtifact, buildDirectory, temporary);
      const build = JSON.parse(readFileSync(join(buildDirectory, `${key}.json`), 'utf8'));
      let qualified;
      if (mode === 'promotion') {
        const qualifiedDirectory = join(temporary, `qualified-${key}`);
        download(repo, target.candidateArtifact, qualifiedDirectory, temporary);
        qualified = JSON.parse(readFileSync(join(qualifiedDirectory, `${key}.json`), 'utf8'));
        download(repo, target.securityArtifact, join(output, 'security-evidence', `security-evidence-${key}`), temporary);
        saveJson(join(output, 'evidence', `${key}.json`), qualified);
      }
      validateRecords({ selection, target, build, qualified });
    }
    // Detect a concurrent rerun/new attempt before accepting the snapshot.
    const finalRun = jsonApi(base);
    if (finalRun.run_attempt !== run.run_attempt || finalRun.head_sha !== run.head_sha || (mode === 'promotion' && (finalRun.status !== 'completed' || finalRun.conclusion !== 'success'))) fail('candidate run changed during evidence download');
    if (mode === 'promotion') {
      saveJson(join(output, 'candidate-run-evidence', 'candidate-run.json'), run);
      saveJson(join(output, 'candidate-run-evidence', 'candidate-jobs.json'), { jobs });
      saveJson(join(output, 'candidate-run-evidence', 'selection.json'), selection);
    }
    return selection;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
