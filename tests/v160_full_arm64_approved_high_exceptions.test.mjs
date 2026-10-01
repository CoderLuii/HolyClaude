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

test('removes all 14 expired full arm64 exceptions from the active ledger', () => {
  const arm64Ids = amd64Ids.map((id) => id.replace('full-amd64', 'full-arm64'));
  assert.equal(arm64Ids.length, 14);
  assert.ok(arm64Ids.every((id) => !reviews.some((review) => review.id === id)));
});

test('removes only the 14 exception records proven stale by the full arm64 report', () => {
  assert.equal(staleArm64Ids.length, 14);
  for (const id of staleArm64Ids) {
    assert.equal(reviews.some((review) => review.id === id), false, `${id} must be removed`);
  }
  assert.equal(reviews.filter((review) => amd64Ids.includes(review.id)).length, 0);
});

test('does not retain expired full arm64 effective-High approvals', () => {
  const arm64Ids = amd64Ids.map((id) => id.replace('full-amd64', 'full-arm64'));
  const arm64 = reviews.filter((review) => arm64Ids.includes(review.id));
  assert.deepEqual(arm64, []);
});

test('removes the expired bubblewrap and extract-zip full-image exceptions', () => {
  for (const architecture of ['amd64', 'arm64']) {
    for (const expected of [
      { suffix: 'bubblewrap-cve-2026-87766-high-exception', vulnerability: 'CVE-2026-87766', name: 'bubblewrap' },
      { suffix: 'extract-zip-ghsa-7pqw-9j4j-h8q3-high-exception', vulnerability: 'GHSA-7pqw-9j4j-h8q3', name: 'extract-zip' },
    ]) {
      const id = `v160-full-${architecture}-${expected.suffix}`;
      const matches = reviews.filter((review) => review.id === id);
      assert.deepEqual(matches, [], `${id} must be removed`);
    }
  }
});
