import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const candidate = workflow.slice(
  workflow.indexOf('  build-candidate:'),
  workflow.indexOf('  resolve-candidate-run:'),
);
const published = workflow.slice(workflow.indexOf('  post-publish-smoke:'), workflow.indexOf('  rollback-mutable-aliases:'));

function runWorkflowVersionParser(command, output) {
  const marker = '          const command = process.env.VERSION_COMMAND;';
  const start = candidate.indexOf(marker);
  const end = candidate.indexOf('\n          NODE', start);
  assert.ok(start >= 0 && end > start, 'workflow version parser must exist');
  const parser = candidate.slice(start, end).replace(/^ {10}/gm, '');
  return spawnSync(process.execPath, ['-e', parser], {
    encoding: 'utf8',
    env: { ...process.env, VERSION_COMMAND: command, VERSION_OUTPUT: output },
  });
}

function cloudcliSection(dockerfile) {
  const start = dockerfile.indexOf('ARG CLOUDCLI_VERSION=');
  const end = dockerfile.indexOf('# ---------- Store variant', start);
  assert.ok(start >= 0 && end > start, 'CloudCLI Dockerfile section must exist');
  return dockerfile.slice(start, end);
}

function runCloudcliGuardNormalization(baseline, current) {
  const commandMarker = '          python3 - "${RUNNER_TEMP}/cloudcli-section.baseline"';
  const commandStart = candidate.indexOf(commandMarker);
  const start = candidate.indexOf('\n', commandStart) + 1;
  const end = candidate.indexOf('\n          PY', start);
  assert.ok(commandStart >= 0 && start > commandStart && end > start, 'CloudCLI guard normalizer must exist');
  const script = candidate.slice(start, end).replace(/^ {10}/gm, '');
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-cloudcli-guard-'));
  const baselinePath = join(root, 'baseline');
  const currentPath = join(root, 'current');
  writeFileSync(baselinePath, baseline);
  writeFileSync(currentPath, current);
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-', baselinePath, currentPath], { input: script, encoding: 'utf8' });
  const normalized = readFileSync(baselinePath, 'utf8').replaceAll('\r\n', '\n');
  rmSync(root, { recursive: true, force: true });
  return { result, normalized };
}

function validateCandidateAttempts({ records, candidateRunAttempt }) {
  const normalizedCandidateAttempt = String(candidateRunAttempt);
  if (!/^\d+$/.test(normalizedCandidateAttempt)) {
    throw new Error('candidate run attempt is invalid');
  }
  const attempts = new Set(records.map((record) => String(record.run_attempt)));
  if (attempts.size !== 1 || !attempts.has(normalizedCandidateAttempt)) {
    throw new Error('candidate records do not share the candidate run attempt');
  }
  for (const record of records) {
    const suffix = `candidate-${record.source_sha}-${record.run_id}-${normalizedCandidateAttempt}-${record.variant}-${record.arch}`;
    if (!record.dockerhub_ref.endsWith(suffix) || !record.ghcr_ref.endsWith(suffix)) {
      throw new Error('candidate ref attempt does not match candidate run attempt');
    }
  }
}

function validateCandidateJobs(jobs, candidateRunAttempt) {
  const expected = new Set([
    'candidate (full, amd64)',
    'candidate (full, arm64)',
    'candidate (slim, amd64)',
    'candidate (slim, arm64)',
  ]);
  const candidateJobs = jobs.filter((job) => expected.has(job.name) && job.conclusion === 'success');
  assert.equal(candidateJobs.length, 4);
  assert.deepEqual(new Set(candidateJobs.map((job) => job.name)), expected);
  const attempts = new Set(candidateJobs.map((job) => String(job.run_attempt)));
  if (attempts.size !== 1 || !attempts.has(String(candidateRunAttempt))) {
    throw new Error('candidate jobs do not share the candidate run API attempt');
  }
}

function attemptFixture(runAttempt) {
  return ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64'].map((target) => {
    const [variant, arch] = target.split('-');
    const suffix = `candidate-sha-123-${runAttempt}-${variant}-${arch}`;
    return {
      source_sha: 'sha',
      run_id: '123',
      run_attempt: String(runAttempt),
      variant,
      arch,
      dockerhub_ref: `coderluii/holyclaude:${suffix}`,
      ghcr_ref: `ghcr.io/coderluii/holyclaude:${suffix}`,
    };
  });
}

function candidateJobFixture(runAttempt) {
  return ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64'].map((target) => {
    const [variant, arch] = target.split('-');
    return {
      name: `candidate (${variant}, ${arch})`,
      conclusion: 'success',
      run_attempt: runAttempt,
    };
  });
}

test('candidate matrix has exactly the four native full and slim targets', () => {
  const targets = [...candidate.matchAll(/- variant: (full|slim)\s+arch: (amd64|arm64)\s+runner: (ubuntu-24\.04(?:-arm)?)/g)]
    .map(([, variant, arch, runner]) => ({ variant, arch, runner }));
  assert.deepEqual(targets, [
    { variant: 'full', arch: 'amd64', runner: 'ubuntu-24.04' },
    { variant: 'full', arch: 'arm64', runner: 'ubuntu-24.04-arm' },
    { variant: 'slim', arch: 'amd64', runner: 'ubuntu-24.04' },
    { variant: 'slim', arch: 'arm64', runner: 'ubuntu-24.04-arm' },
  ]);
});

test('every native candidate runs the complete smoke suite against its digest', () => {
  for (const script of [
    'browser_runtime_smoke.sh',
    'cloudcli_auth_session_smoke.sh',
    'plugin_reproducibility_smoke.sh',
    'developer_tools_smoke.sh',
    'docker_rootless_smoke.sh',
    'docker_cloudcli_volume_smoke.sh',
    'docker_cli_persistence_smoke.sh',
    'docker_persistence_smoke.sh',
    'docker_ssh_mosh_smoke.sh',
  ]) {
    assert.equal((candidate.match(new RegExp(`tests/${script.replaceAll('.', '\\.')}`, 'g')) ?? []).length, 1, script);
  }
  assert.match(candidate, /IMAGE: \$\{\{ steps\.refs\.outputs\.dockerhub_ref \}\}@\$\{\{ steps\.digests\.outputs\.dockerhub_digest \}\}/);
  assert.match(candidate, /VARIANT: \$\{\{ matrix\.variant \}\}/);
  assert.match(candidate, /ARCH: \$\{\{ matrix\.arch \}\}/);
});

test('published images get a bounded native startup, version, and real browser check', () => {
  assert.equal((published.match(/- registry: (dockerhub|ghcr)/g) ?? []).length, 8);
  assert.match(published, /name: Smoke published startup and browser/);
  assert.match(published, /IMAGE: \$\{\{ steps\.image\.outputs\.ref \}\}@\$\{\{ steps\.image\.outputs\.digest \}\}/);
  assert.match(published, /uname -m/);
  assert.match(published, /org\.opencontainers\.image\.revision/);
  assert.match(published, /org\.opencontainers\.image\.version/);
  assert.match(published, /http:\/\/127\.0\.0\.1:3001\/health/);
  assert.match(published, /contracts\/product-facts\.json/);
  assert.match(published, /--user claude/);
  assert.match(published, /timeout 60 docker exec/);
  assert.match(published, /--headless=new[\s\S]*--dump-dom/);
  assert.match(published, /HolyClaude published browser/);
  assert.match(published, /trap cleanup EXIT/);
});

test('CloudCLI volume smoke bounds SQLite lock waits', () => {
  const smoke = readFileSync('tests/docker_cloudcli_volume_smoke.sh', 'utf8');
  assert.match(smoke, /sqlite3 -cmd (?:\\?"\.timeout 10000\\?") \/home\/claude\/\.cloudcli\/auth\.db/g);
});

test('post-promotion does not repeat the complete candidate suites', () => {
  assert.doesNotMatch(published, /tests\/(?:browser_runtime_smoke|cloudcli_auth_session_smoke|developer_tools_smoke|atuin_runtime_smoke|plugin_runtime_smoke|docker_lifecycle_smoke|docker_cloudcli_volume_smoke|docker_cli_persistence_smoke|(?:slim|full)(?:_additional)?_linux_advisory_runtime_checks)\.sh/);
  assert.match(candidate, /bash tests\/cloudcli_auth_session_smoke\.sh/);
  assert.match(candidate, /bash tests\/docker_cloudcli_volume_smoke\.sh/);
  assert.match(candidate, /bash tests\/docker_cli_persistence_smoke\.sh/);
  assert.match(candidate, /bash tests\/validate_optional_docker_client\.sh/);
  assert.match(workflow, /name: Roll back mutable aliases after failed final smoke/);
});

test('published cross-registry readback rejects changed config or ordered layers', () => {
  const start = workflow.indexOf('      - name: Verify cross-registry published image graph');
  const end = workflow.indexOf('      - name: Upload promotion evidence', start);
  assert.ok(start >= 0 && end > start);
  const step = workflow.slice(start, end);
  const scripts = [...step.matchAll(/          python3 - <<'PY'[^\n]*\n([\s\S]*?)          PY/g)];
  assert.equal(scripts.length, 2);
  const validator = scripts.at(-1)[1].replace(/^ {10}/gm, '');
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-published-graphs-'));
  try {
    mkdirSync(join(root, 'promotion', 'manifests'), { recursive: true });
    writeFileSync(join(root, 'promotion', 'final-digests.json'), JSON.stringify({ variants: { full: {}, slim: {} } }));
    const manifest = { config: { digest: 'sha256:config' }, layers: [{ digest: 'sha256:first' }, { digest: 'sha256:second' }] };
    for (const variant of ['full', 'slim']) for (const arch of ['amd64', 'arm64']) for (const registry of ['dockerhub', 'ghcr']) {
      writeFileSync(join(root, 'promotion', 'manifests', `graph-${variant}-${arch}-${registry}.json`), JSON.stringify(manifest));
    }
    const run = () => spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-'], { cwd: root, input: validator, encoding: 'utf8' });
    assert.equal(run().status, 0);
    const changedPath = join(root, 'promotion', 'manifests', 'graph-full-arm64-ghcr.json');
    for (const changed of [
      { ...manifest, config: { digest: 'sha256:other' } },
      { ...manifest, layers: [...manifest.layers].reverse() },
    ]) {
      writeFileSync(changedPath, JSON.stringify(changed));
      const result = run();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /published config or ordered layer digests differ/);
    }
  } finally {
    assert.ok(root.startsWith(join(tmpdir(), 'holyclaude-published-graphs-')));
    rmSync(root, { recursive: true, force: true });
  }
});

test('CloudCLI retained artifact gate blocks any extension of its builder or overlay inputs', () => {
  assert.match(candidate, /Require retained CloudCLI artifact and overlay inputs to remain unchanged/);
  assert.match(candidate, /git diff --quiet "\$\{baseline\}" --[\s\S]+vendor\/artifacts\/cloudcli-ai-cloudcli-1\.37\.3-holyclaude-account-management\.tgz/);
  assert.match(candidate, /expected exactly one reviewed \{name\} delta/);
  assert.match(candidate, /cmp "\$\{RUNNER_TEMP\}\/cloudcli-section\.baseline" "\$\{RUNNER_TEMP\}\/cloudcli-section\.current"/);
  assert.match(candidate, /artifact_sha256=.*sha256sum vendor\/artifacts\/cloudcli-ai-cloudcli/);
  assert.doesNotMatch(candidate, /Verify CloudCLI artifact reproducibility/);
});

test('CloudCLI retained section allows only the three exact reviewed release deltas', () => {
  const baselineDockerfile = spawnSync(
    'git',
    ['show', '20e9e10681aec9b091bb54da8755f8a1c59f69bb:Dockerfile'],
    { encoding: 'utf8' },
  );
  assert.equal(baselineDockerfile.status, 0, baselineDockerfile.stderr);
  const baseline = cloudcliSection(baselineDockerfile.stdout);
  const current = cloudcliSection(readFileSync('Dockerfile', 'utf8'));
  const accepted = runCloudcliGuardNormalization(baseline, current);
  assert.equal(accepted.result.status, 0, accepted.result.stderr);
  assert.equal(accepted.normalized, current.replaceAll('\r\n', '\n'));

  for (const [label, changed] of [
    ['stale CloudCLI Playwright version', current.replace("version !== '1.64.1'", "version !== '1.64.0'")],
    ['wrong CloudCLI Playwright version', current.replace("version !== '1.64.1'", "version !== '1.64.2'")],
    [
      'wrong CloudCLI Playwright resolution path',
      current.replace(
        "packagePath !== '/usr/local/lib/node_modules/playwright/package.json'",
        "packagePath !== '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/playwright/package.json'",
      ),
    ],
  ]) {
    assert.notEqual(changed, current, `${label} mutation must change the fixture`);
    const rejectedReviewedDelta = runCloudcliGuardNormalization(baseline, changed);
    assert.notEqual(rejectedReviewedDelta.result.status, 0, `${label} must fail normalization`);
  }

  const changed = current.replace(
    'ARG CLOUDCLI_VERSION=1.37.3',
    'ARG CLOUDCLI_VERSION=1.37.4',
  );
  const rejected = runCloudcliGuardNormalization(baseline, changed);
  assert.equal(rejected.result.status, 0, rejected.result.stderr);
  assert.notEqual(
    rejected.normalized,
    changed.replaceAll('\r\n', '\n'),
    'the workflow cmp must reject every other section change',
  );
});

test('candidate runtime contract probes versions, architecture, variants, browser, plugins, and entrypoints', () => {
  assert.match(candidate, /contracts\/product-facts\.json,target=\/tmp\/product-facts\.json,readonly/);
  assert.match(candidate, /amd64\) expected_uname=x86_64/);
  assert.match(candidate, /arm64\) expected_uname=aarch64/);
  assert.match(candidate, /require_eq "container architecture" "\$\(uname -m\)" "\$expected_uname"/);
  for (const command of ['cloudcli', 'claude', 'gemini', 'codex', 'cursor', 'task-master', 'junie', 'opencode', 'pi']) {
    assert.match(candidate, new RegExp(`probe_version ${command.replace('-', '\\-')}`));
  }
  for (const command of ['junie', 'opencode', 'pi']) {
    assert.match(candidate, new RegExp(`! command -v ${command}`));
  }
  assert.match(candidate, /chromium.*product-facts\.json/s);
  assert.match(candidate, /project-stats web-terminal/);
  assert.match(candidate, /test -x \/usr\/local\/bin\/entrypoint\.sh/);
  assert.match(candidate, /output\.match\(\/\^Junie version: build /);
  assert.match(candidate, /junie[\s\S]+--version 2>"\$version_stderr"/);
  assert.match(candidate, /cat "\$version_stderr" >&2/);
  assert.match(candidate, /output\.matchAll\(patterns\[command\]/);
  assert.match(candidate, /require_eq "\$command version" "\$reported" "\$expected"/);
  assert.doesNotMatch(candidate, /grep -F "\$expected"/);
});

test('version normalization rejects substring, boundary, and ambiguous-version false positives', () => {
  for (const [command, output, expected] of [
    ['cloudcli', 'CloudCLI 1.37.2', '1.37.2'],
    ['claude', '2.1.258 (Claude Code)', '2.1.258'],
    ['codex', 'codex-cli 0.152.1', '0.152.1'],
    ['cursor', '2026.08.31-4057e58', '2026.08.31-4057e58'],
    ['junie', 'Junie version: build 3888.1 nightly', '3888.1'],
  ]) {
    const result = runWorkflowVersionParser(command, output);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, expected);
  }

  assert.notEqual(runWorkflowVersionParser('cloudcli', 'CloudCLI 11.37.20').stdout, '1.37.2');
  for (const output of [
    'CloudCLI x1.37.2y',
    'CloudCLI 1.37.2; updater 11.37.20',
  ]) assert.notEqual(runWorkflowVersionParser('cloudcli', output).status, 0);
});

test('Junie normalization fails closed on malformed, extra, ambiguous, and wrong-build output', () => {
  for (const output of [
    'Junie version: 26.10.12 (3888.1)',
    'Junie version: build 3888.1 nightly extra',
    'Junie version: build 3888.1 nightly\nJunie version: build 3888.1 nightly',
    'Junie version: build 3888.1 3888.0 nightly',
    'Junie version: build 13888.10 nightly extra 3888.1',
    'Junie version: build 3888.1 stable',
    'Junie version: 26.9.14 3196.5',
    'Junie version: 26.9.14 (3196.5) extra',
    'Junie version: 26.10.12 (3888.1)\nJunie 26.10.12 (3888.1) (pid=1): log file: /tmp/log',
    'Junie version: 26.10.12 (3888.1) (3659.4)',
    'Junie version: 26.10.11 (3888.1)',
    'Junie 3888.1',
  ]) assert.notEqual(runWorkflowVersionParser('junie', output).status, 0);

  const wrongBuild = runWorkflowVersionParser('junie', 'Junie version: build 3888.0 nightly');
  assert.equal(wrongBuild.status, 0, wrongBuild.stderr);
  assert.notEqual(wrongBuild.stdout, '3888.1');
  assert.equal(wrongBuild.stdout, '3888.0');
});

test('candidate attempt validation treats promotion workflow attempts as independent', () => {
  assert.doesNotThrow(() => validateCandidateAttempts({
    records: attemptFixture(2),
    candidateRunAttempt: 2,
    promotionRunAttempt: 1,
  }));
  assert.doesNotThrow(() => validateCandidateAttempts({
    records: attemptFixture(1),
    candidateRunAttempt: 1,
    promotionRunAttempt: 2,
  }));
});

test('candidate attempt validation rejects mixed rerun artifacts and mismatched refs', () => {
  const records = attemptFixture(1);

  const mixed = structuredClone(records);
  mixed[3].run_attempt = '2';
  mixed[3].dockerhub_ref = mixed[3].dockerhub_ref.replace('-1-slim-arm64', '-2-slim-arm64');
  mixed[3].ghcr_ref = mixed[3].ghcr_ref.replace('-1-slim-arm64', '-2-slim-arm64');
  assert.throws(() => validateCandidateAttempts({ records: mixed, candidateRunAttempt: 1 }), /do not share/);

  const wrongRef = structuredClone(records);
  wrongRef[0].dockerhub_ref = wrongRef[0].dockerhub_ref.replace('-1-full-amd64', '-2-full-amd64');
  assert.throws(() => validateCandidateAttempts({ records: wrongRef, candidateRunAttempt: 1 }), /ref attempt/);
});

test('candidate job validation rejects jobs from a different candidate attempt', () => {
  assert.doesNotThrow(() => validateCandidateJobs(candidateJobFixture(2), 2));
  const mixedJobs = candidateJobFixture(2);
  mixedJobs[3].run_attempt = 1;
  assert.throws(() => validateCandidateJobs(mixedJobs, 2), /do not share/);
});

test('candidate proof includes retained-input, integrity, security, and exact-run invalidation gates', () => {
  assert.match(workflow, /Require retained CloudCLI artifact and overlay inputs to remain unchanged/);
  assert.match(workflow, /Require retained FFmpeg builder and patch inputs to remain unchanged/);
  assert.match(workflow, /git diff --quiet "\$\{baseline\}" --[\s\S]+vendor\/patches\/cloudcli-account-management/);
  assert.match(workflow, /cmp "\$\{RUNNER_TEMP\}\/ffmpeg-stage\.baseline" "\$\{RUNNER_TEMP\}\/ffmpeg-stage\.current"/);
  assert.match(workflow, /node scripts\/verify-immutable-inputs\.mjs/);
  assert.match(candidate, /syft "\$\{image\}"/);
  assert.match(candidate, /grype --config/);
  assert.match(candidate, /evaluate-upstream-dependency-report\.mjs/);
  assert.doesNotMatch(candidate, /security\/openvex\.json/);
  assert.match(candidate, /SOURCE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(candidate, /RUN_ID: \$\{\{ github\.run_id \}\}/);
  assert.match(candidate, /RUN_ATTEMPT: \$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow, /candidate-\$\{GITHUB_SHA\}-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}/);
  assert.match(workflow, /candidate-jobs\.json/);
  assert.match(workflow, /expected exactly four successful native candidate jobs/);
  assert.match(workflow, /candidate jobs must match the candidate run API attempt/);
  assert.match(workflow, /candidate records must share exactly one attempt matching candidate-run\.json/);
});
