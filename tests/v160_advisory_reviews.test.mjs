import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));

const expectedReviews = [
  {
    id: 'v160-slim-amd64-gh-fixed-cve-2024-52308',
    vulnerability: 'CVE-2024-52308',
    name: 'gh',
    version: '2.100.0',
    disposition: 'fixed',
    effectiveSeverity: 'None',
    authority: 'https://github.com/cli/cli/security/advisories/GHSA-p2h2-3vg9-4p87',
    locations: [
      '^/var/lib/dpkg/info/gh\\.list$',
      '^/var/lib/dpkg/info/gh\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ],
  },
  {
    id: 'v160-slim-amd64-gh-fixed-cve-2026-48501',
    vulnerability: 'CVE-2026-48501',
    name: 'gh',
    version: '2.100.0',
    disposition: 'fixed',
    effectiveSeverity: 'None',
    authority: 'https://github.com/cli/cli/security/advisories/GHSA-8xvp-7hj6-mcj9',
    locations: [
      '^/var/lib/dpkg/info/gh\\.list$',
      '^/var/lib/dpkg/info/gh\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ],
  },
  {
    id: 'v160-slim-amd64-aom-debian-minor-cve-2023-6879',
    vulnerability: 'CVE-2023-6879',
    name: 'libaom3',
    version: '3.6.0-1+deb12u3',
    disposition: 'vendor_severity',
    effectiveSeverity: 'Low',
    authority: 'https://security-tracker.debian.org/tracker/CVE-2023-6879',
    locations: [
      '^/usr/share/doc/libaom3/copyright$',
      '^/var/lib/dpkg/info/libaom3:amd64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ],
  },
  {
    id: 'v160-slim-amd64-aom-debian-minor-cve-2023-39616',
    vulnerability: 'CVE-2023-39616',
    name: 'libaom3',
    version: '3.6.0-1+deb12u3',
    disposition: 'vendor_severity',
    effectiveSeverity: 'Low',
    authority: 'https://security-tracker.debian.org/tracker/CVE-2023-39616',
    locations: [
      '^/usr/share/doc/libaom3/copyright$',
      '^/var/lib/dpkg/info/libaom3:amd64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ],
  },
];

test('binds the four interim Linux findings to exact researched reviews', () => {
  for (const expected of expectedReviews) {
    const matches = ledger.reviews.filter((review) => review.id === expected.id);
    assert.equal(matches.length, 1, `${expected.id} must exist exactly once`);

    const review = matches[0];
    assert.deepEqual(review.vulnerabilities, [expected.vulnerability]);
    assert.deepEqual(review.component.names, [expected.name]);
    assert.deepEqual(review.component.versions, [expected.version]);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.component.locationPatterns, expected.locations);
    assert.equal(review.disposition, expected.disposition);
    assert.equal(review.effectiveSeverity, expected.effectiveSeverity);
    assert.equal(review.authority.url, expected.authority);
    assert.equal(review.reviewedAt, '2026-09-08');
    assert.equal(review.expiresAt, '2026-10-08');
    assert.deepEqual(review.variants, ['slim']);
    assert.deepEqual(review.architectures, ['amd64']);
    assert.equal('approvedBy' in review, false);
  }
});
