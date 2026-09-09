import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reviews = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8')).reviews;
const amd64Ids = [
  'v160-full-amd64-junie-json-smart-high-exception',
  'v160-full-amd64-junie-netty-codec-high-exception',
  'v160-full-amd64-junie-netty-codec-compression-high-exception',
  'v160-full-amd64-junie-netty-codec-dns-high-exception',
  'v160-full-amd64-junie-netty-codec-http-high-exception',
  'v160-full-amd64-junie-netty-codec-http2-high-exception',
  'v160-full-amd64-junie-netty-handler-high-exception',
  'v160-full-amd64-junie-netty-resolver-dns-high-exception',
  'v160-full-amd64-junie-netty-transport-classes-epoll-high-exception',
  'v160-full-amd64-junie-openjdk-cve-2026-41254-high-exception',
  'v160-full-amd64-junie-openjdk-cve-2026-47063-high-exception',
  'v160-full-amd64-libxml2-cve-2026-86140-high-exception',
  'v160-full-amd64-bsdutils-cve-2026-78410-high-exception',
  'v160-full-amd64-util-linux-cve-2026-78410-high-exception',
];
const staleArm64Ids = [
  'v155-aom-high-exception',
  'v155-libssh2-high-exception',
  'v155-json-smart-high-exception-626d5c1c9a',
  'v155-netty-codec-compression-high-exception-f725d2fd3a',
  'v155-netty-codec-dns-high-exception-9617bc52dc',
  'v155-netty-codec-http-high-exception-da6befc9ae',
  'v155-netty-codec-http2-high-exception-4e24b188b6',
  'v155-netty-codec-http2-high-exception-ghsa-93wv',
  'v155-netty-codec-high-exception-d6b7a4db67',
  'v155-netty-handler-high-exception-33656196a8',
  'v155-netty-resolver-dns-high-exception-7a88f9e11d',
  'v155-netty-transport-classes-epoll-high-exception-b07473f4a2',
  'v158-full-arm64-high-exception-07b9e4ff9cbb',
  'v158-full-arm64-high-exception-574a47ae18f2',
];

function arm64Counterpart(review) {
  const counterpart = structuredClone(review);
  counterpart.id = counterpart.id.replace('full-amd64', 'full-arm64');
  counterpart.architectures = ['arm64'];
  counterpart.component.locationPatterns = counterpart.component.locationPatterns
    .map((pattern) => pattern.replaceAll('3219', '3220').replaceAll(':amd64', ':arm64'));
  counterpart.rationale = counterpart.rationale
    .replaceAll('3219.1', '3220.1')
    .replaceAll('full amd64', 'full arm64');
  return counterpart;
}

test('binds all 37 approved full arm64 findings to exact 3220.1 and Debian tuples', () => {
  const expected = amd64Ids.map((id) => arm64Counterpart(reviews.find((review) => review.id === id)));
  assert.equal(expected.length, 14);
  assert.equal(expected.reduce((count, review) => count + review.vulnerabilities.length * review.component.names.length, 0), 37);

  for (const review of expected) {
    const actual = reviews.filter((candidate) => candidate.id === review.id);
    assert.equal(actual.length, 1, `${review.id} must exist exactly once`);
    assert.deepEqual(actual[0], review);
    assert.equal(actual[0].reviewedAt, '2026-09-09');
    assert.equal(actual[0].expiresAt, '2026-09-16');
    assert.equal(actual[0].approvedBy, 'CoderLuii');
    assert.equal('vexStatement' in actual[0], false);
  }
});

test('removes only the 14 exception records proven stale by the full arm64 report', () => {
  assert.equal(staleArm64Ids.length, 14);
  for (const id of staleArm64Ids) {
    assert.equal(reviews.some((review) => review.id === id), false, `${id} must be removed`);
  }
  assert.equal(reviews.filter((review) => amd64Ids.includes(review.id)).length, 14);
});

test('keeps the approved full arm64 risk effective High through the fixed expiry', () => {
  const arm64Ids = amd64Ids.map((id) => id.replace('full-amd64', 'full-arm64'));
  const arm64 = reviews.filter((review) => arm64Ids.includes(review.id));
  assert.equal(arm64.length, 14);
  assert.ok(arm64.every((review) => review.effectiveSeverity === 'High'));
  assert.ok(arm64.every((review) => review.reviewedAt === '2026-09-09' && review.expiresAt === '2026-09-16'));
  assert.ok(arm64.every((review) => JSON.stringify(review.variants) === '["full"]'));
  assert.ok(arm64.every((review) => JSON.stringify(review.architectures) === '["arm64"]'));
});

test('records the two newly approved full-image High exceptions separately', () => {
  for (const architecture of ['amd64', 'arm64']) {
    for (const expected of [
      { suffix: 'bubblewrap-cve-2026-87766-high-exception', vulnerability: 'CVE-2026-87766', name: 'bubblewrap' },
      { suffix: 'extract-zip-ghsa-7pqw-9j4j-h8q3-high-exception', vulnerability: 'GHSA-7pqw-9j4j-h8q3', name: 'extract-zip' },
    ]) {
      const id = `v160-full-${architecture}-${expected.suffix}`;
      const matches = reviews.filter((review) => review.id === id);
      assert.equal(matches.length, 1, `${id} must exist exactly once`);
      const [review] = matches;
      assert.deepEqual(review.vulnerabilities, [expected.vulnerability]);
      assert.deepEqual(review.component.names, [expected.name]);
      assert.equal(review.disposition, 'high_exception');
      assert.equal(review.effectiveSeverity, 'High');
      assert.equal(review.approvedBy, 'CoderLuii');
      assert.equal(review.reviewedAt, '2026-09-11');
      assert.equal(review.expiresAt, '2026-09-17');
      assert.deepEqual(review.variants, ['full']);
      assert.deepEqual(review.architectures, [architecture]);
    }
  }
});
