import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const runtimeCheckUrl = new URL('./cloudcli_tsgolint_runtime_checks.sh', import.meta.url);
const runtimeCheck = existsSync(runtimeCheckUrl) ? readFileSync(runtimeCheckUrl, 'utf8') : '';
const browserSmoke = readFileSync(new URL('./browser_runtime_smoke.sh', import.meta.url), 'utf8');

function validateRuntimeReport(report) {
  const validator = runtimeCheck.match(/\/\/ BEGIN_REPORT_VALIDATOR\n([\s\S]+?)\n\/\/ END_REPORT_VALIDATOR/)?.[1] ?? '';
  assert.notEqual(validator, '', 'runtime check should expose its exact report validator for fixture coverage');
  const fixtureDirectory = mkdtempSync(join(tmpdir(), 'holyclaude-tsgolint-report-'));
  const fixturePath = join(fixtureDirectory, 'report.json');
  writeFileSync(fixturePath, JSON.stringify(report));
  const result = spawnSync(process.execPath, ['--input-type=module', '-', fixturePath], {
    encoding: 'utf8',
    input: validator,
  });
  rmSync(fixtureDirectory, { recursive: true, force: true });
  return result;
}

const successfulReport = {
  ok: true,
  version: '0.9.12',
  projects: [{
    directory: '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/server',
    complete: true,
    skippedChecks: [],
    scannedFileCount: 260,
    analyzedFileCount: 260,
    analyzedFiles: ['index.ts', 'modules/agent/agent.module.ts'],
  }],
};

test('CloudCLI production install removes only the verified tsgolint packages and launcher', () => {
  const installStart = dockerfile.indexOf('npm ci --omit=dev');
  const installEnd = dockerfile.indexOf('ln -s "$CLOUDCLI_ROOT/dist-server/server/modules/cli/cli.js"', installStart);
  const installBlock = dockerfile.slice(installStart, installEnd);
  const expectedInOrder = [
    `test "$(node -p "require('./node_modules/oxlint-tsgolint/package.json').version")" = "7.0.2001"`,
    'CLOUDCLI_TSGOLINT_ARCH="$(case "$(dpkg --print-architecture)" in amd64) echo x64;; arm64) echo arm64;; *) exit 1;; esac)"',
    `test "$(node -p "require('./node_modules/@oxlint-tsgolint/linux-\${CLOUDCLI_TSGOLINT_ARCH}/package.json').version")" = "7.0.2001"`,
    'test -x "node_modules/@oxlint-tsgolint/linux-${CLOUDCLI_TSGOLINT_ARCH}/tsgolint"',
    'test "$(readlink node_modules/.bin/tsgolint)" = "../oxlint-tsgolint/bin/tsgolint.js"',
    'rm -rf node_modules/oxlint-tsgolint "node_modules/@oxlint-tsgolint/linux-${CLOUDCLI_TSGOLINT_ARCH}"',
    'rmdir node_modules/@oxlint-tsgolint',
    'rm -f node_modules/.bin/tsgolint',
    'test ! -e node_modules/oxlint-tsgolint && test ! -L node_modules/oxlint-tsgolint',
    'test ! -e node_modules/@oxlint-tsgolint && test ! -L node_modules/@oxlint-tsgolint',
    'test ! -e node_modules/.bin/tsgolint && test ! -L node_modules/.bin/tsgolint',
  ];
  let previousIndex = -1;
  for (const expected of expectedInOrder) {
    const index = installBlock.indexOf(expected);
    assert.ok(index > previousIndex, `CloudCLI install should contain ordered contract: ${expected}`);
    previousIndex = index;
  }
  assert.match(
    dockerfile,
    /Production image intentionally omits optional, non-exposed oxlint type-aware and type-check support; the reproducible build\/development artifact remains unchanged\./,
  );
});

test('runtime check rejects every tsgolint path and exercises ordinary React Doctor lint', () => {
  for (const expected of [
    'node_modules/oxlint-tsgolint',
    'node_modules/@oxlint-tsgolint',
    'node_modules/.bin/tsgolint',
  ]) {
    assert.ok(runtimeCheck.includes(expected), `runtime check should cover ${expected}`);
  }
  assert.match(runtimeCheck, /test "\$\(cloudcli --version\)" = '1\.37\.3'/);
  assert.match(
    runtimeCheck,
    /timeout --signal=TERM --kill-after=5s 60s env REACT_DOCTOR_PARALLEL=1[\s\S]+react-doctor[\s\S]+--lint[\s\S]+--no-supply-chain[\s\S]+--blocking none[\s\S]+--json-out/,
  );
  assert.doesNotMatch(runtimeCheck, /--type-aware|--type-check/);
});

test('runtime report validator accepts one complete linted server project', () => {
  const result = validateRuntimeReport(successfulReport);
  assert.equal(result.status, 0, result.stderr);
});

test('runtime report validator rejects skipped, partial, and empty scans', async (t) => {
  const rejectedReports = {
    'skipped project': { ...successfulReport, skippedProjects: ['server'] },
    'skipped lint': {
      ...successfulReport,
      projects: [{ ...successfulReport.projects[0], skippedChecks: ['lint'] }],
    },
    'partial project': {
      ...successfulReport,
      projects: [{ ...successfulReport.projects[0], complete: false }],
    },
    'empty scan': { ...successfulReport, projects: [] },
    'zero analyzed files': {
      ...successfulReport,
      projects: [{ ...successfulReport.projects[0], analyzedFileCount: 0, analyzedFiles: [] }],
    },
    'zero scanned files': {
      ...successfulReport,
      projects: [{ ...successfulReport.projects[0], scannedFileCount: 0 }],
    },
    'missing server entrypoint': {
      ...successfulReport,
      projects: [{ ...successfulReport.projects[0], analyzedFiles: ['modules/agent/agent.module.ts'] }],
    },
  };
  for (const [name, report] of Object.entries(rejectedReports)) {
    await t.test(name, () => {
      const result = validateRuntimeReport(report);
      assert.notEqual(result.status, 0, `${name} should fail report validation`);
    });
  }
});

test('common browser smoke runs the tsgolint check for every candidate and final image', () => {
  assert.match(browserSmoke, /TSGOLINT_HELPER="\$SCRIPT_DIR\/cloudcli_tsgolint_runtime_checks\.sh"/);
  assert.match(browserSmoke, /docker_literal_cmd cp "\$TSGOLINT_HELPER_HOST_PATH" "\$CONTAINER:\/tmp\/cloudcli_tsgolint_runtime_checks\.sh"/);
  assert.match(
    browserSmoke,
    /docker_literal_cmd exec[\s\S]+-u claude[\s\S]+"\$CONTAINER"[\s\S]+\/tmp\/cloudcli_tsgolint_runtime_checks\.sh/,
  );
});
