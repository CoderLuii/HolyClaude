import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const candidate = workflow.slice(
  workflow.indexOf('  build-candidate:'),
  workflow.indexOf('  resolve-candidate-run:'),
);

function extractNormalizedVersion(command, output) {
  const patterns = {
    cursor: /(?:^|[^0-9A-Za-z])(\d{4}\.\d{2}\.\d{2}-[0-9a-f]+)(?=$|[^0-9A-Za-z])/g,
    junie: /(?:^|[^0-9A-Za-z])(\d+\.\d+)(?=$|[^0-9A-Za-z])/g,
  };
  const pattern = patterns[command]
    ?? /(?:^|[^0-9A-Za-z])(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?=$|[^0-9A-Za-z])/g;
  const matches = [...output.trim().matchAll(pattern)].map((match) => match[1]);
  if (matches.length !== 1) throw new Error(`expected one normalized version, got ${matches.length}`);
  return matches[0];
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
    'plugin_reproducibility_smoke.sh',
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

test('CloudCLI volume smoke bounds SQLite lock waits', () => {
  const smoke = readFileSync('tests/docker_cloudcli_volume_smoke.sh', 'utf8');
  assert.match(smoke, /sqlite3 -cmd (?:\\?"\.timeout 10000\\?") \/home\/claude\/\.cloudcli\/auth\.db/g);
});

test('CloudCLI reproducibility uses the workflow token without embedding it', () => {
  const buildScript = readFileSync('scripts/build-cloudcli-account-management-artifact-container.mjs', 'utf8');
  assert.match(candidate, /Verify CloudCLI artifact reproducibility[\s\S]{0,180}GITHUB_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(buildScript, /dockerArgs\.push\('--env', 'GITHUB_TOKEN'\)/);
  assert.doesNotMatch(buildScript, /GITHUB_TOKEN=/);
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
  assert.match(candidate, /const matches = \[\.\.\.output\.matchAll\(pattern\)\]\.map/);
  assert.match(candidate, /require_eq "\$command version" "\$reported" "\$expected"/);
  assert.doesNotMatch(candidate, /grep -F "\$expected"/);
});

test('version normalization rejects substring, boundary, and ambiguous-version false positives', () => {
  assert.equal(extractNormalizedVersion('cloudcli', 'CloudCLI 1.37.2'), '1.37.2');
  assert.equal(extractNormalizedVersion('claude', '2.1.258 (Claude Code)'), '2.1.258');
  assert.equal(extractNormalizedVersion('codex', 'codex-cli 0.152.1'), '0.152.1');
  assert.equal(extractNormalizedVersion('cursor', '2026.08.31-4057e58'), '2026.08.31-4057e58');
  assert.equal(extractNormalizedVersion('junie', 'Junie 3126.1'), '3126.1');
  assert.notEqual(extractNormalizedVersion('cloudcli', 'CloudCLI 11.37.20'), '1.37.2');
  assert.throws(() => extractNormalizedVersion('cloudcli', 'CloudCLI x1.37.2y'), /expected one normalized version/);
  assert.throws(
    () => extractNormalizedVersion('cloudcli', 'CloudCLI 1.37.2; updater 11.37.20'),
    /expected one normalized version/,
  );
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

test('candidate proof includes reproducibility, integrity, security, and exact-run invalidation gates', () => {
  assert.match(workflow, /build-cloudcli-account-management-artifact-container\.mjs/);
  assert.match(workflow, /git diff --exit-code --[\s\\]+vendor\/artifacts\/cloudcli-account-management\.manifest\.json/);
  assert.match(workflow, /ffmpeg-security-builder/);
  const firstFfmpegSum = 'ffmpeg-build-a/ffmpeg-security-backport/SHA256SUMS';
  const secondFfmpegSum = 'ffmpeg-build-b/ffmpeg-security-backport/SHA256SUMS';
  assert.ok(workflow.includes(firstFfmpegSum));
  assert.ok(workflow.includes(secondFfmpegSum));
  assert.ok(workflow.indexOf('          cmp \\') < workflow.indexOf(firstFfmpegSum));
  assert.ok(workflow.indexOf(firstFfmpegSum) < workflow.indexOf(secondFfmpegSum));
  assert.match(workflow, /cryptography reproducibility is not applicable because the backport builder was removed/);
  assert.match(workflow, /node scripts\/verify-immutable-inputs\.mjs/);
  assert.match(candidate, /syft "\$\{image\}"/);
  assert.match(candidate, /grype --config/);
  assert.match(candidate, /security\/openvex\.json/);
  assert.match(candidate, /SOURCE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(candidate, /RUN_ID: \$\{\{ github\.run_id \}\}/);
  assert.match(candidate, /RUN_ATTEMPT: \$\{\{ github\.run_attempt \}\}/);
  assert.match(workflow, /candidate-\$\{GITHUB_SHA\}-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}/);
  assert.match(workflow, /record\["source_sha"\] != os\.environ\["GITHUB_SHA"\]/);
  assert.match(workflow, /candidate-jobs\.json/);
  assert.match(workflow, /expected exactly four successful native candidate jobs/);
  assert.doesNotMatch(workflow, /PROMOTION_RUN_ATTEMPT/);
  assert.match(workflow, /candidate run API response has an invalid run_attempt/);
  assert.match(workflow, /job_attempts != \{candidate_run_attempt\}/);
  assert.match(workflow, /candidate jobs must match the candidate run API attempt/);
  assert.match(workflow, /record_attempts != \{candidate_run_attempt\}/);
  assert.match(workflow, /candidate records must share exactly one attempt matching candidate-run\.json/);
  assert.doesNotMatch(workflow, /candidate run attempt does not match the current promotion workflow attempt/);
});
