import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const version = '2.1.12-stable-8+deb12u1';
const retiredVersion = '2.1.12-stable-8';
const fixedVulnerabilities = new Set([
  'CVE-2026-63379',
  'CVE-2026-63381',
  'CVE-2026-63382',
  'CVE-2026-63383',
  'CVE-2026-63384',
  'CVE-2026-63385',
  'CVE-2026-63387',
  'CVE-2026-63388',
]);

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');

test('binds the signed fixed libevent package and runtime library for both architectures', () => {
  assert.match(
    immutableInputs,
    /name: Debian libevent core security package[\s\S]+version: 2\.1\.12-stable-8\+deb12u1[\s\S]+amd64-package-sha256: 464ace3714faa77e3a6e2beada29481a0e28a48f9db032d6fc8b6f7b6073bb01[\s\S]+arm64-package-sha256: 1d5abb9b85276cd3e1221901323d3c3bc29a88843a472f3c0aafff1181526e65[\s\S]+amd64-library-sha256: 62ef2b9108270573f45b92c84b59ab897e29b71e2c22b2e3e5dcef07fb141430[\s\S]+arm64-library-sha256: 9331ae738c166e786f2bae7e28777f680e8582a42139f48921c0ae47b1f3efa0/,
  );

  for (const file of [
    'tests/full_linux_advisory_runtime_checks.sh',
    'tests/slim_linux_advisory_runtime_checks.sh',
  ]) {
    const runtime = readFileSync(file, 'utf8');
    assert.match(runtime, new RegExp(`require_package libevent-core-2\\.1-7 '${version.replaceAll('.', '\\.').replace('+', '\\+')}'`));
    assert.match(runtime, /amd64\)[\s\S]*?expected_libevent_core_sha256=62ef2b9108270573f45b92c84b59ab897e29b71e2c22b2e3e5dcef07fb141430/);
    assert.match(runtime, /arm64\)[\s\S]*?expected_libevent_core_sha256=9331ae738c166e786f2bae7e28777f680e8582a42139f48921c0ae47b1f3efa0/);
    assert.match(runtime, /test "\$\(sha256sum "\$libevent_core_path" \| cut -d' ' -f1\)" = "\$expected_libevent_core_sha256"/);
  }
});

test('retires every old-version libevent review and OpenVEX statement', () => {
  const staleReviews = ledger.reviews.filter((review) =>
    review.component.names.includes('libevent-core-2.1-7') &&
    review.component.versions.includes(retiredVersion) &&
    review.vulnerabilities.some((vulnerability) => fixedVulnerabilities.has(vulnerability)));
  assert.deepEqual(staleReviews, []);

  const staleStatements = vex.statements.filter((statement) =>
    fixedVulnerabilities.has(statement.vulnerability.name) &&
    statement.products.some((product) => product.subcomponents?.some((component) =>
      decodeURIComponent(component.identifiers.purl).includes(`libevent-core-2.1-7@${retiredVersion}`))));
  assert.deepEqual(staleStatements, []);
});

test('maps stale scanner findings to the exact signed fixed libevent package', () => {
  const scannerLagCves = [
    'CVE-2026-63382',
    'CVE-2026-63383',
    'CVE-2026-63384',
    'CVE-2026-63385',
    'CVE-2026-63387',
    'CVE-2026-63388',
  ];

  for (const vulnerability of scannerLagCves) {
    const matches = ledger.reviews.filter((review) =>
      review.vulnerabilities.length === 1 &&
      review.vulnerabilities[0] === vulnerability &&
      review.component.names.length === 1 &&
      review.component.names[0] === 'libevent-core-2.1-7' &&
      review.component.versions.length === 1 &&
      review.component.versions[0] === version);
    assert.equal(matches.length, 1, vulnerability);
    const [review] = matches;
    assert.equal(review.disposition, 'fixed');
    assert.equal(review.effectiveSeverity, 'None');
    assert.deepEqual(review.variants, ['full', 'slim']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.match(review.rationale, /signed Debian security changelog/);
  }
});
