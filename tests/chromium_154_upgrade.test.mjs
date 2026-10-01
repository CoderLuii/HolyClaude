import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const facts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));
const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');

const versions = {
  amd64: '154.0.8037.92-1~deb12u1',
  arm64: '154.0.8037.92-1~deb12u1',
};
const packageBindings = [
  ['CHROMIUM_PACKAGE_SHA256_AMD64', 'amd64-chromium-package-sha256', 'cd258a352414714e8027a623c4ff01ef1c565446d8f7206bc4ce085a4aa7bea5'],
  ['CHROMIUM_PACKAGE_SHA256_ARM64', 'arm64-chromium-package-sha256', '4ee18389861d6c2af9be00ae0a8b3ecdba20aed6c08ae41fcc310da1727dd1df'],
  ['CHROMIUM_COMMON_PACKAGE_SHA256_AMD64', 'amd64-chromium-common-package-sha256', 'c10056d7f80dcb2a9dc384997ecd5fd3aec9fa5acea472d53063ea6ba1f700d9'],
  ['CHROMIUM_COMMON_PACKAGE_SHA256_ARM64', 'arm64-chromium-common-package-sha256', '338df7ca0323ad2e6c98f3d628381cfb762dca2d0bcc12dd7e5adcb4b005260c'],
  ['CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64', 'amd64-chromium-sandbox-package-sha256', 'b48372322890bfb88c32662a94ff3ec7088fb6ce026cf5d238534378a82eb4f8'],
  ['CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64', 'arm64-chromium-sandbox-package-sha256', '18b827aee52af82fdba80e3acf00e07e529b6077d925dd4351c95b1d4829eaee'],
];
const chromiumPackageNames = new Set(['chromium', 'chromium-common', 'chromium-sandbox']);
const retiredChromiumVersions = new Set([
  '151.0.7922.173-1~deb12u1',
  '152.0.7977.82-1~deb12u1',
  '153.0.8010.52-1~deb12u1',
]);
const fixedCriticalVulnerabilities = [
  'CVE-2026-102304',
  'CVE-2026-102306',
  'CVE-2026-102308',
  'CVE-2026-102309',
  'CVE-2026-102316',
  'CVE-2026-102331',
];
const fixedHighVulnerabilities = [
  'CVE-2026-102299',
  'CVE-2026-102301',
  'CVE-2026-102302',
  'CVE-2026-102317',
  'CVE-2026-102321',
  'CVE-2026-102323',
  'CVE-2026-102324',
  'CVE-2026-102326',
  'CVE-2026-102327',
  'CVE-2026-102328',
];
const chromiumLocationPatterns = [
  '^/usr/share/doc/chromium-common/copyright$',
  '^/usr/share/doc/chromium-sandbox/copyright$',
  '^/usr/share/doc/chromium/copyright$',
  '^/var/lib/dpkg/info/chromium-common\\.list$',
  '^/var/lib/dpkg/info/chromium-common\\.md5sums$',
  '^/var/lib/dpkg/info/chromium-common\\.shlibs$',
  '^/var/lib/dpkg/info/chromium-common\\.triggers$',
  '^/var/lib/dpkg/info/chromium-sandbox\\.list$',
  '^/var/lib/dpkg/info/chromium-sandbox\\.md5sums$',
  '^/var/lib/dpkg/info/chromium\\.conffiles$',
  '^/var/lib/dpkg/info/chromium\\.list$',
  '^/var/lib/dpkg/info/chromium\\.md5sums$',
  '^/var/lib/dpkg/info/chromium\\.postinst$',
  '^/var/lib/dpkg/info/chromium\\.prerm$',
  '^/var/lib/dpkg/status$',
];

function assertImmutablePackageBindings(input) {
  for (const [, field, sha256] of packageBindings) {
    assert.match(
      input,
      new RegExp(`^    ${field}: ${sha256}$`, 'm'),
      `${field} must bind its exact signed package digest`,
    );
  }
}

test('pins the complete signed Chromium 154 package trio for both architectures', () => {
  for (const [arch, version] of Object.entries(versions)) {
    assert.match(dockerfile, new RegExp(`ARG CHROMIUM_DEBIAN_VERSION_${arch.toUpperCase()}=${version.replaceAll('.', '\\.')}`));
    assert.match(immutableInputs, new RegExp(`^    ${arch}-version: ${version.replaceAll('.', '\\.')}$`, 'm'));
  }
  for (const [name, , sha256] of packageBindings) {
    assert.match(dockerfile, new RegExp(`ARG ${name}=${sha256}`));
  }
  assertImmutablePackageBindings(immutableInputs);
  assert.match(immutableInputs, /version: 154\.0\.8037/);
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

test('publishes Chromium 154 as the product and runtime fact', () => {
  assert.equal(facts.browser.chromium.version, '154.0.8037');
  assert.deepEqual(facts.browser.chromium.versionByArch, versions);
  for (const version of Object.values(facts.browser.chromium.versionByArch)) {
    assert.ok(version.startsWith(`${facts.browser.chromium.version}.`));
  }
  for (const path of [
    'README.md',
    'docs/architecture.md',
    'docs/dockerhub-description.md',
    'config/claude-memory-full.md',
    'config/claude-memory-slim.md',
    'THIRD-PARTY-NOTICES',
  ]) {
    assert.match(readFileSync(path, 'utf8'), /154\.0\.8037/, path);
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

test('does not carry retired Chromium reviews into the Chromium 154 release', () => {
  const staleReviews = ledger.reviews.filter((review) =>
    review.component.names.some((name) => chromiumPackageNames.has(name)) &&
    review.component.versions.some((reviewVersion) => retiredChromiumVersions.has(reviewVersion)));
  assert.deepEqual(staleReviews, []);
});

test('maps only the six Grype-lagging Critical findings to the signed fixed Chromium package', () => {
  const reviews = ledger.reviews.filter((review) =>
    review.owner === 'Debian Bookworm Chromium' &&
    review.disposition === 'fixed' &&
    fixedCriticalVulnerabilities.includes(review.vulnerabilities[0]));

  assert.deepEqual(
    reviews.map((review) => review.vulnerabilities[0]).sort(),
    fixedCriticalVulnerabilities,
  );
  for (const review of reviews) {
    assert.equal(review.vulnerabilities.length, 1, review.id);
    assert.deepEqual(review.component.names, ['chromium', 'chromium-common', 'chromium-sandbox']);
    assert.deepEqual(review.component.versions, ['154.0.8037.92-1~deb12u1']);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.component.locationPatterns, chromiumLocationPatterns);
    assert.equal(review.effectiveSeverity, 'None');
    assert.deepEqual(review.variants, ['full', 'slim']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.deepEqual(review.authority, {
      name: 'Debian Security Tracker',
      url: `https://security-tracker.debian.org/tracker/${review.vulnerabilities[0]}`,
    });
    assert.match(review.rationale, /signed Debian acceptance/);
    assert.match(review.rationale, /Grype/);
  }
});

test('maps the ten new Grype High findings to the exact signed Bookworm Chromium package', () => {
  const reviews = ledger.reviews.filter((review) =>
    review.id.startsWith('v164-chromium-fixed-') &&
    review.id.endsWith('-high'));

  assert.deepEqual(
    reviews.map((review) => review.vulnerabilities[0]).sort(),
    fixedHighVulnerabilities,
  );
  for (const review of reviews) {
    assert.equal(review.vulnerabilities.length, 1, review.id);
    assert.deepEqual(review.component.names, ['chromium', 'chromium-common', 'chromium-sandbox']);
    assert.deepEqual(review.component.versions, ['154.0.8037.92-1~deb12u1']);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.component.locationPatterns, chromiumLocationPatterns);
    assert.equal(review.disposition, 'fixed');
    assert.equal(review.effectiveSeverity, 'None');
    assert.deepEqual(review.variants, ['full', 'slim']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.deepEqual(review.authority, {
      name: 'Debian Security Tracker',
      url: `https://security-tracker.debian.org/tracker/${review.vulnerabilities[0]}`,
    });
    assert.equal(review.reviewedAt, '2026-10-02');
    assert.equal(review.expiresAt, '2026-11-01');
    assert.match(review.rationale, new RegExp(review.vulnerabilities[0]));
    assert.match(review.rationale, /Debian Security Tracker marks chromium 154\.0\.8037\.92-1~deb12u1 fixed/);
    assert.match(review.rationale, /DLA-4811-1/);
    assert.match(review.rationale, /Grype's not-fixed result is stale/);
  }
});
