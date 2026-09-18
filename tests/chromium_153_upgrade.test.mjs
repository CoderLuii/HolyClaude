import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const facts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));
const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');

const version = '153.0.8010.47-2~deb12u1';
const packageBindings = [
  ['CHROMIUM_PACKAGE_SHA256_AMD64', 'amd64-chromium-package-sha256', 'ddd26b17ec5008aaccf9f0acd3031c9ac62984fe98b1dbc5782670598b6d3bd9'],
  ['CHROMIUM_PACKAGE_SHA256_ARM64', 'arm64-chromium-package-sha256', '4df7ba070ef3d4e8e1bcb020d9a2a3e111f964456ac19bb728aa28434b880f7b'],
  ['CHROMIUM_COMMON_PACKAGE_SHA256_AMD64', 'amd64-chromium-common-package-sha256', '574470643af1492e222c85a1f051a20207951f5d3c4b9ea82f8d1f3b1368eb77'],
  ['CHROMIUM_COMMON_PACKAGE_SHA256_ARM64', 'arm64-chromium-common-package-sha256', '9798dbacdab0f97050b055edfe00843f57ca2f575d14e4cc239cf00f1d445c3b'],
  ['CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64', 'amd64-chromium-sandbox-package-sha256', 'c397d185b57e000ed10d20c6ccdae7c8d6f66c3df35bcb428e8d67c299cb953b'],
  ['CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64', 'arm64-chromium-sandbox-package-sha256', '2712811e3e1ccb4bb8907745ef5b832abe29011fc937052f06535e4dfba2b083'],
];
const chromiumPackageNames = new Set(['chromium', 'chromium-common', 'chromium-sandbox']);
const retiredChromiumVersions = new Set([
  '151.0.7922.173-1~deb12u1',
  '152.0.7977.82-1~deb12u1',
]);

function assertImmutablePackageBindings(input) {
  for (const [, field, sha256] of packageBindings) {
    assert.match(
      input,
      new RegExp(`^    ${field}: ${sha256}$`, 'm'),
      `${field} must bind its exact signed package digest`,
    );
  }
}

test('pins the complete signed Chromium 153 package trio for both architectures', () => {
  assert.match(dockerfile, new RegExp(`ARG CHROMIUM_DEBIAN_VERSION=${version.replaceAll('.', '\\.')}`));
  for (const [name, , sha256] of packageBindings) {
    assert.match(dockerfile, new RegExp(`ARG ${name}=${sha256}`));
  }
  assertImmutablePackageBindings(immutableInputs);
  assert.match(immutableInputs, new RegExp(`version: ${version.replaceAll('.', '\\.')}`));
});

test('rejects immutable Chromium inputs whose architecture hashes are swapped', () => {
  const amd64Hash = packageBindings[0][2];
  const arm64Hash = packageBindings[1][2];
  const swapped = immutableInputs
    .replace(amd64Hash, '__CHROMIUM_SHA256_SWAP__')
    .replace(arm64Hash, amd64Hash)
    .replace('__CHROMIUM_SHA256_SWAP__', arm64Hash);

  assert.throws(
    () => assertImmutablePackageBindings(swapped),
    /amd64-chromium-package-sha256/,
  );
});

test('publishes Chromium 153 as the product and runtime fact', () => {
  assert.equal(facts.browser.chromium.version, '153.0.8010.47');
  for (const path of [
    'README.md',
    'docs/architecture.md',
    'docs/dockerhub-description.md',
    'config/claude-memory-full.md',
    'config/claude-memory-slim.md',
    'THIRD-PARTY-NOTICES',
  ]) {
    assert.match(readFileSync(path, 'utf8'), /153\.0\.8010\.47/, path);
  }
});

test('retires the fixed Chromium Critical exceptions and their bound evidence records', () => {
  const exceptions = ledger.reviews.filter((review) =>
    review.owner === 'Debian Bookworm Chromium' && review.disposition === 'critical_exception');
  assert.deepEqual(exceptions, []);

  for (const suffix of ['', '-full-amd64', '-full-arm64', '-slim-amd64', '-slim-arm64']) {
    const path = `security/critical-exception-authority-evidence${suffix}.json`;
    const evidence = JSON.parse(readFileSync(path, 'utf8'));
    assert.deepEqual(evidence.records, [], path);
  }
});

test('does not carry retired Chromium reviews into the Chromium 153 release', () => {
  const staleReviews = ledger.reviews.filter((review) =>
    review.component.names.some((name) => chromiumPackageNames.has(name)) &&
    review.component.versions.some((reviewVersion) => retiredChromiumVersions.has(reviewVersion)));
  assert.deepEqual(staleReviews, []);
});
