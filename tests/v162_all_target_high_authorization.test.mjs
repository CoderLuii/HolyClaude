import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vulnerabilities = [
  'CVE-2026-86138',
  'CVE-2026-86139',
  'CVE-2026-86142',
  'CVE-2026-86143',
  'CVE-2026-86144',
  'CVE-2026-19499',
];

const libxml2Vulnerabilities = vulnerabilities.slice(0, 5);

test('keeps the newly authorized High scope exact while covering all native targets', () => {
  for (const vulnerability of vulnerabilities) {
    const review = ledger.reviews.find((item) =>
      item.vulnerabilities.length === 1 &&
      item.vulnerabilities[0] === vulnerability &&
      (vulnerability === 'CVE-2026-19499' || item.component.names.length === 1 && item.component.names[0] === 'libxml2'));
    assert.ok(review, vulnerability);
    assert.equal(review.disposition, 'high_exception');
    assert.equal(review.effectiveSeverity, 'High');
    assert.equal(review.approvedBy, 'CoderLuii');
    assert.equal(review.expiresAt, '2026-09-25');
    assert.deepEqual(review.variants, ['full', 'slim']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.ok(review.component.locationPatterns.includes('^/var/lib/dpkg/status$'));
    assert.ok(review.component.locationPatterns.some((pattern) => pattern.includes(':amd64')));
    assert.ok(review.component.locationPatterns.some((pattern) => pattern.includes(':arm64')));
  }
});

test('keeps libxml2 runtime coverage separate from Full-only development-package coverage', () => {
  for (const vulnerability of libxml2Vulnerabilities) {
    const reviews = ledger.reviews.filter((item) =>
      item.vulnerabilities.length === 1 && item.vulnerabilities[0] === vulnerability);
    assert.equal(reviews.length, 2, vulnerability);
    const runtime = reviews.find((item) => item.component.names[0] === 'libxml2');
    const development = reviews.find((item) => item.component.names[0] === 'libxml2-dev');
    assert.ok(runtime, `${vulnerability} runtime`);
    assert.ok(development, `${vulnerability} development`);
    assert.deepEqual(runtime.component.names, ['libxml2']);
    assert.deepEqual(runtime.component.versions, ['2.9.14+dfsg-1.3~deb12u6']);
    assert.deepEqual(runtime.variants, ['full', 'slim']);
    assert.deepEqual(runtime.component.locationPatterns, [
      '^/usr/share/doc/libxml2/copyright$',
      '^/var/lib/dpkg/info/libxml2:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libxml2:arm64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ]);
    assert.deepEqual(development.component.names, ['libxml2-dev']);
    assert.deepEqual(development.component.versions, ['2.9.14+dfsg-1.3~deb12u6']);
    assert.deepEqual(development.variants, ['full']);
    assert.deepEqual(development.component.locationPatterns, [
      '^/usr/share/doc/libxml2-dev/copyright$',
      '^/var/lib/dpkg/info/libxml2-dev:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libxml2-dev:arm64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ]);
  }
});
