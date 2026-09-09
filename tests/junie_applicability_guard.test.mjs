import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateSecurityPolicy } from '../scripts/evaluate-security-report.mjs';

const guardPath = 'tests/junie_applicability_guard.py';
const harness = readFileSync('tests/full_additional_linux_advisory_runtime_checks.sh', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));

test('runs the exact Junie guard at every native full-image advisory gate', () => {
  const guard = readFileSync(guardPath, 'utf8');
  assert.match(harness, /python3 \/tests\/junie_applicability_guard\.py/);
  assert.equal((workflow.match(/full_additional_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
  assert.equal((workflow.match(/--init --network none --entrypoint bash[\s\S]*?full_additional_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
  assert.match(guard, /3220\.1/);
  assert.match(guard, /86c6899a7478c5a5884c1ddaf50f7c8e794b51d92a41c597512989e162886ec1/);
  assert.match(guard, /io\/netty\/handler\/ssl\/SniHandler/);
  assert.match(guard, /io\/netty\/handler\/ssl\/AbstractSniHandler/);
  assert.match(guard, /io\/netty\/handler\/ssl\/SslClientHelloHandler/);
  assert.match(guard, /EngineConnectorConfigJvmKt\.class/);
  assert.match(guard, /EnvironmentUtilsJvmKt\.class/);
  assert.match(guard, /handshake_header_spans_records/);
  assert.match(guard, /listeners_after_stop/);
  assert.match(guard, /pid_alive_after_stop/);
  assert.match(guard, /supervisor_terminated_before_stop/);
  assert.match(guard, /stop_gateway\(start, launcher, environment, pid\)/);
  assert.doesNotMatch(guard, /status_process_pid_reuse/);
  assert.match(workflow, /python3 -m unittest tests\/test_notify\.py tests\/junie_applicability_guard_unit\.py/);
});

test('fails closed on malformed JAR input and changed bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'junie-guard-'));
  const malformed = join(root, 'malformed.jar');
  writeFileSync(malformed, 'not a jar');
  const run = (expectedHash) => spawnSync('python', ['-c', `
import importlib.util
spec = importlib.util.spec_from_file_location('guard', r'${guardPath}')
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)
guard.inspect_jar(r'${malformed.replaceAll('\\', '\\\\')}', '${expectedHash}')
`], { encoding: 'utf8' });
  try {
    const malformedResult = run(createHash('sha256').update('not a jar').digest('hex'));
    assert.notEqual(malformedResult.status, 0);
    assert.match(malformedResult.stderr, /BadZipFile/);

    const changedResult = run('0'.repeat(64));
    assert.notEqual(changedResult.status, 0);
    assert.match(changedResult.stderr, /Junie JAR SHA-256 mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('binds one exact review per native architecture to the Junie Maven component', () => {
  for (const architecture of ['amd64', 'arm64']) {
    const id = `v160-full-${architecture}-junie-netty-handler-ghsa-c4c3-7fpv-j4q5-not-affected`;
    const matches = ledger.reviews.filter((review) => review.id === id);
    assert.equal(matches.length, 1, `${id} must exist exactly once`);
    const review = matches[0];
    assert.deepEqual(review.vulnerabilities, ['GHSA-c4c3-7fpv-j4q5']);
    assert.deepEqual(review.component, {
      names: ['netty-handler'],
      versions: ['4.2.9.Final'],
      types: ['java-archive'],
      locationPatterns: ['^/home/claude/\\.local/share/junie/versions/3220\\.1/lib/app/junie-nightly-3220\\.1\\.jar$'],
    });
    assert.deepEqual(review.variants, ['full']);
    assert.deepEqual(review.architectures, [architecture]);
    assert.equal(review.disposition, 'not_affected');
    assert.equal(review.effectiveSeverity, 'None');
    assert.equal('approvedBy' in review, false);
    assert.match(review.rationale, /86c6899a7478c5a5884c1ddaf50f7c8e794b51d92a41c597512989e162886ec1/);

    const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
    assert.ok(statement);
    assert.equal(statement.vulnerability.name, 'GHSA-c4c3-7fpv-j4q5');
    assert.equal(statement.status, 'not_affected');
    assert.equal(statement.justification, 'vulnerable_code_not_in_execute_path');
    for (const product of statement.products) {
      assert.deepEqual(product.subcomponents, [{
        identifiers: { purl: 'pkg:maven/io.netty/netty-handler@4.2.9.Final' },
      }]);
    }
  }
});

test('keeps Java OpenVEX support limited to the reviewed Netty component tuple', () => {
  const authorityEvidence = JSON.parse(readFileSync(
    'security/critical-exception-authority-evidence-full-amd64.json',
    'utf8',
  ));
  const validate = (mutate) => {
    const candidateLedger = structuredClone(ledger);
    const review = candidateLedger.reviews.find((item) =>
      item.id === 'v160-full-amd64-junie-netty-handler-ghsa-c4c3-7fpv-j4q5-not-affected');
    mutate(review.component);
    validateSecurityPolicy({
      ledger: candidateLedger,
      authorityEvidence,
      vex,
      asOfText: '2026-09-11',
      variant: 'full',
      arch: 'amd64',
    });
  };

  assert.throws(() => validate((component) => { component.names = ['other-java-component']; }), /unsupported OpenVEX Java component/);
  assert.throws(() => validate((component) => { component.names.push('netty-common'); }), /unsupported OpenVEX Java component/);
  assert.throws(() => validate((component) => { component.versions = ['4.2.10.Final']; }), /unsupported OpenVEX Java component/);
  assert.throws(() => validate((component) => { component.versions = ['4.2.17.Final']; }), /unsupported OpenVEX Java component/);
});
