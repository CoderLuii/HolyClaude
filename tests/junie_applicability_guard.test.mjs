import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { validateSecurityPolicy } from '../scripts/evaluate-security-report.mjs';

const guardPath = 'tests/junie_applicability_guard.py';
const harness = readFileSync('tests/full_additional_linux_advisory_runtime_checks.sh', 'utf8');
const fullAdvisoryHarness = readFileSync('tests/full_linux_advisory_runtime_checks.sh', 'utf8');
const slimAdvisoryHarness = readFileSync('tests/slim_linux_advisory_runtime_checks.sh', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
const python = process.platform === 'win32' ? 'python' : 'python3';
const toBashPath = (path) => path.replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replaceAll('\\', '/');

test('binds current native Junie checks to the verified 3419.29 archive and CLI', () => {
  assert.doesNotMatch(harness, /junie_applicability_guard\.py/);
  assert.match(harness, /7efefd2f7a49a2aa55db90fd2ab2eec16c4bcf89258c9acf2f920dab59edbeb5  \/home\/claude\/\.local\/share\/junie\/current\/lib\/app\/junie-release-3419\.29\.jar' \| sha256sum -c -/);
  assert.match(harness, /timeout 30s junie --version 2>&1/);
  assert.match(harness, /Junie version: 26\.9\.22 \(3419\.29\)/);
  assert.match(harness, /timeout 30s junie --help >\/dev\/null/);
  assert.equal((workflow.match(/full_additional_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
  assert.equal((workflow.match(/--init --network none --entrypoint bash[\s\S]*?full_additional_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
  assert.match(dockerfile, /ARG JUNIE_VERSION=3419\.29/);
  assert.match(dockerfile, /ARG JUNIE_ARCHIVE_SHA256_AMD64=7ac5d675d90305c65207f9ddaf4219a1bf78c34630b8e39423833d2716ce7b5e/);
  assert.match(dockerfile, /ARG JUNIE_ARCHIVE_SHA256_ARM64=17338e32942ffb1eca2f8aab020495c10bd8ab92d3772e59b0ca67e791e242ad/);
  assert.match(dockerfile, /github\.com\/jetbrains-junie\/junie\/releases\/download\/\$\{JUNIE_VERSION\}\/\$\{JUNIE_ARCHIVE\}/);
  assert.match(dockerfile, /echo "\$JUNIE_ARCHIVE_SHA256  \/tmp\/\$\{JUNIE_ARCHIVE\}" \| sha256sum -c -/);
  assert.match(immutableInputs, /- name: Junie\r?\n\s+version: "3419\.29"\r?\n\s+amd64-archive-sha256: 7ac5d675d90305c65207f9ddaf4219a1bf78c34630b8e39423833d2716ce7b5e\r?\n\s+arm64-archive-sha256: 17338e32942ffb1eca2f8aab020495c10bd8ab92d3772e59b0ca67e791e242ad/);
});

test('current Junie shell gate accepts only 3419.29 and propagates CLI failures', () => {
  const check = harness.match(/junie_version="\$\(timeout 30s junie --version 2>&1\)"[\s\S]*?timeout 30s junie --help >\/dev\/null/)?.[0];
  assert.ok(check, 'current Junie shell gate must remain extractable');
  const root = mkdtempSync(join(tmpdir(), 'junie-current-'));
  const executable = join(root, 'junie');
  writeFileSync(executable, `#!/usr/bin/env bash
set -eu
case "\${1:-}" in
  --version)
    [ "\${JUNIE_VERSION_STATUS:-0}" = 0 ] || exit "$JUNIE_VERSION_STATUS"
    printf '%s\\n' "\${JUNIE_VERSION_OUTPUT:-Junie version: 26.9.22 (3419.29)}"
    ;;
  --help)
    [ "\${JUNIE_HELP_STATUS:-0}" = 0 ] || exit "$JUNIE_HELP_STATUS"
    printf 'Junie help\\n'
    ;;
  *) exit 64 ;;
esac
`);
  chmodSync(executable, 0o755);
  const run = (overrides = {}) => spawnSync('bash', [
    '-s', '--', toBashPath(root),
    overrides.JUNIE_VERSION_OUTPUT ?? 'Junie version: 26.9.22 (3419.29)',
    overrides.JUNIE_VERSION_STATUS ?? '0',
    overrides.JUNIE_HELP_STATUS ?? '0',
  ], {
    encoding: 'utf8',
    input: `set -Eeuo pipefail\nPATH="$1:$PATH"\nexport PATH\nexport JUNIE_VERSION_OUTPUT="$2" JUNIE_VERSION_STATUS="$3" JUNIE_HELP_STATUS="$4"\n${check}\n`,
    env: process.env,
    timeout: 10_000,
  });
  try {
    assert.equal(run().status, 0);
    for (const output of ['Junie 3419.29', 'Junie version: 26.9.21 (3419.29)', 'Junie version: 26.9.22 (3419.26)']) {
      const result = run({ JUNIE_VERSION_OUTPUT: output });
      assert.notEqual(result.status, 0, output);
      assert.match(result.stderr, /unexpected Junie version output/);
    }
    assert.notEqual(run({ JUNIE_VERSION_STATUS: '9' }).status, 0);
    assert.notEqual(run({ JUNIE_HELP_STATUS: '8' }).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('ldconfig checks consume large output, preserve first matches, and propagate producer failures', () => {
  const root = mkdtempSync(join(tmpdir(), 'ldconfig-pipeline-'));
  const executable = join(root, 'ldconfig');
  writeFileSync(executable, `#!/usr/bin/env bash
set -eu
if [ "$LDCONFIG_MODE" != missing ]; then
  printf '%s (libc6,x86-64) => /first/%s\\n' "$LDCONFIG_LIBRARY" "$LDCONFIG_LIBRARY"
fi
i=0
while [ "$i" -lt 6000 ]; do
  printf 'libfixture%s.so (libc6,x86-64) => /fixture/%s\\n' "$i" "$i"
  i=$((i + 1))
done
if [ "$LDCONFIG_MODE" = matches ]; then
  printf '%s (libc6,x86-64) => /second/%s\\n' "$LDCONFIG_LIBRARY" "$LDCONFIG_LIBRARY"
fi
[ "$LDCONFIG_MODE" != failure ] || exit 73
`);
  chmodSync(executable, 0o755);
  const run = (body, mode, library, variable = '') => spawnSync('bash', [
    '-s', '--', toBashPath(root), mode, library, variable,
  ], {
    encoding: 'utf8',
    input: `set -Eeuo pipefail\nPATH="$1:$PATH"\nexport PATH LDCONFIG_MODE="$2" LDCONFIG_LIBRARY="$3"\n${body}\n`,
    env: process.env,
    timeout: 10_000,
  });
  try {
    const lookups = [
      [harness, 'libmount_path', 'libmount.so.1'],
      [fullAdvisoryHarness, 'libevent_core_path', 'libevent_core-2.1.so.7'],
      [fullAdvisoryHarness, 'libtiff_path', 'libtiff.so.6'],
      [slimAdvisoryHarness, 'libevent_core_path', 'libevent_core-2.1.so.7'],
      [slimAdvisoryHarness, 'libtiff_path', 'libtiff.so.6'],
      [slimAdvisoryHarness, 'libmount_path', 'libmount.so.1'],
    ];
    for (const [source, variable, library] of lookups) {
      const assignment = source.split(/\r?\n/).find((line) => line.startsWith(`${variable}="$(ldconfig -p | awk `));
      assert.ok(assignment, `${variable} lookup must remain extractable`);
      const body = `${assignment}\ntest -n "$${variable}"\nprintf '%s\\n' "\${!4}"`;
      const matches = run(body, 'matches', library, variable);
      assert.equal(matches.status, 0, `${variable}: ${matches.stderr}`);
      assert.equal(matches.stdout, `/first/${library}\n`);
      assert.notEqual(run(body, 'missing', library, variable).status, 0);
      assert.equal(run(body, 'failure', library, variable).status, 73, variable);
    }

    for (const source of [fullAdvisoryHarness, slimAdvisoryHarness]) {
      const presence = source.match(/ldconfig_output="\$\(ldconfig -p\)"\r?\nif grep -Fq 'libevent_extra' <<<"\$ldconfig_output"; then[\s\S]*?^fi/m)?.[0];
      assert.ok(presence, 'libevent-extra rejection block must remain extractable');
      assert.equal(run(presence, 'missing', 'libevent_extra').status, 0);
      const present = run(presence, 'present', 'libevent_extra');
      assert.equal(present.status, 1);
      assert.match(present.stderr, /unexpected libevent_extra library/);
      assert.equal(run(presence, 'failure', 'libevent_extra').status, 73);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('preserves the exact Junie 3419.26 applicability guard as historical evidence', () => {
  const guard = readFileSync(guardPath, 'utf8');
  const historicalRisk = readFileSync('security/v1.6.4-accepted-risk.json', 'utf8');
  assert.match(guard, /3419\.26/);
  assert.match(guard, /junie-release-\{VERSION\}\.jar/);
  assert.match(guard, /6e4994ce18e1d4744658c6fb7aec6c99fb5d9b241d27970c2371953f2a0e6295/);
  assert.match(guard, /ea2c8101bc3ae1ba14f57b799377de73e9e458ed69fafc13b0c56a3bb734a206/);
  assert.doesNotMatch(guard, /3220\.1|junie-nightly|86c6899a7478c5a5884c1ddaf50f7c8e794b51d92a41c597512989e162886ec1/);
  assert.match(guard, /io\/netty\/handler\/ssl\/SniHandler/);
  assert.match(guard, /io\/netty\/handler\/ssl\/AbstractSniHandler/);
  assert.match(guard, /io\/netty\/handler\/ssl\/SslClientHelloHandler/);
  assert.match(guard, /EngineConnectorConfigJvmKt\.class/);
  assert.match(guard, /EnvironmentUtilsJvmKt\.class/);
  assert.match(guard, /The --gateway option is not available in this version\. Please use the Nightly build\./);
  assert.match(guard, /validate_gateway_rejection/);
  assert.match(guard, /validate_runtime_residue/);
  assert.match(guard, /com\.intellij\.ml\.llm\.matterhorn\.ej\.app\.cli\.standalone\.MainKt/);
  assert.match(guard, /3133142a6d3e21efa3a53fdf0ad5a4e8651113724665e99f7e1be5bdb72fd992/);
  assert.match(guard, /5a953748e13fcd3b0006b007c77616651358522fa4f38a86d7a31ec18c14cf4d/);
  assert.doesNotMatch(guard, /--help/);
  assert.doesNotMatch(guard, /--gateway-status/);
  assert.doesNotMatch(guard, /run_probes|capture_client_hello|stop_gateway/);
  assert.match(workflow, /python3 -m unittest tests\/test_notify\.py tests\/junie_applicability_guard_unit\.py/);
  assert.match(historicalRisk, /\/home\/claude\/\.local\/share\/junie\/versions\/3419\.26\/lib\/app\/junie-release-3419\.26\.jar/);
});

test('does not carry 3196.5 security dispositions into the 3419.26 artifact', () => {
  const currentPath = '/home/claude/.local/share/junie/versions/3419.26/lib/app/junie-release-3419.26.jar';
  const applicable = ledger.reviews.filter((review) =>
    review.owner === 'Junie CLI' &&
    review.component.locationPatterns?.some((pattern) => new RegExp(pattern).test(currentPath)));
  assert.deepEqual(applicable, []);
  assert.doesNotMatch(JSON.stringify(vex.statements), /Junie 3419\.26/);
});

test('fails closed on malformed JAR input and changed bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'junie-guard-'));
  const malformed = join(root, 'malformed.jar');
  writeFileSync(malformed, 'not a jar');
  const run = (expectedHash) => spawnSync(python, ['-c', `
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
      locationPatterns: ['^/home/claude/\\.local/share/junie/versions/3196\\.5/lib/app/junie-release-3196\\.5\\.jar$'],
    });
    assert.deepEqual(review.variants, ['full']);
    assert.deepEqual(review.architectures, [architecture]);
    assert.equal(review.disposition, 'not_affected');
    assert.equal(review.effectiveSeverity, 'None');
    assert.equal('approvedBy' in review, false);
    assert.match(review.rationale, /f82726298a4e12ee3798bcda516fbaf0d9d6b85da89110b7bd62801af64997f7/);
    assert.match(review.rationale, /f4e40d610438ff9f553ccc6529d943d5272eb8fa26e3c92ae51812623bfee438/);
    assert.match(review.rationale, /stable gateway mode is runtime-disabled/);
    assert.match(review.rationale, /no surviving launcher descendant or listener/);
    assert.doesNotMatch(review.rationale, /Acceptance still requires.*gateway listener/);

    const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
    assert.ok(statement);
    assert.equal(statement.vulnerability.name, 'GHSA-c4c3-7fpv-j4q5');
    assert.equal(statement.status, 'not_affected');
    assert.equal(statement.justification, 'vulnerable_code_not_in_execute_path');
    assert.match(statement.impact_statement, /Junie 3196\.5/);
    assert.match(statement.impact_statement, /f82726298a4e12ee3798bcda516fbaf0d9d6b85da89110b7bd62801af64997f7/);
    assert.match(statement.impact_statement, /f4e40d610438ff9f553ccc6529d943d5272eb8fa26e3c92ae51812623bfee438/);
    assert.match(statement.impact_statement, /stable gateway mode is runtime-disabled/);
    assert.match(statement.impact_statement, /no surviving launcher descendant or listener/);
    assert.doesNotMatch(statement.impact_statement, /Acceptance still requires.*gateway listener/);
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
    const review = structuredClone(ledger.reviews.find((item) =>
      item.id === 'v160-full-amd64-junie-netty-handler-ghsa-c4c3-7fpv-j4q5-not-affected'));
    const candidateLedger = {
      schemaVersion: ledger.schemaVersion,
      policy: ledger.policy,
      reviews: [review],
    };
    const candidateVex = structuredClone(vex);
    candidateVex.statements = candidateVex.statements.filter((statement) =>
      statement['@id'] === review.vexStatement);
    const releaseVersion = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8')).release.dockerVersion;
    for (const product of candidateVex.statements[0].products) {
      product['@id'] = product['@id'].replace(/@\d+\.\d+\.\d+\?/, `@${releaseVersion}?`);
    }
    mutate(review.component);
    validateSecurityPolicy({
      ledger: candidateLedger,
      authorityEvidence: {
        ...authorityEvidence,
        candidate: { variant: 'full', architecture: 'amd64', reportSha256: null },
        records: [],
      },
      vex: candidateVex,
      asOfText: '2026-09-18',
      variant: 'full',
      arch: 'amd64',
    });
  };

  assert.throws(() => validate((component) => { component.names = ['other-java-component']; }), /unsupported OpenVEX Java component/);
  assert.throws(() => validate((component) => { component.names.push('netty-common'); }), /unsupported OpenVEX Java component/);
  assert.throws(() => validate((component) => { component.versions = ['4.2.10.Final']; }), /unsupported OpenVEX Java component/);
  assert.throws(() => validate((component) => { component.versions = ['4.2.17.Final']; }), /unsupported OpenVEX Java component/);
});
