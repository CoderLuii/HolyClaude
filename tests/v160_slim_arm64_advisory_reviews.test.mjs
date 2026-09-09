import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reviews = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8')).reviews;
const statements = JSON.parse(readFileSync('security/openvex.json', 'utf8')).statements;

const amd64Ids = [
  'v160-slim-amd64-gh-fixed-cve-2024-52308',
  'v160-slim-amd64-gh-fixed-cve-2026-48501',
  'v160-slim-amd64-aom-debian-minor-cve-2023-6879',
  'v160-slim-amd64-aom-debian-minor-cve-2023-39616',
  'v160-slim-amd64-bind-clients-cve-2025-40777-not-affected',
  'v160-slim-amd64-dnsutils-cve-2025-40777-not-affected',
  'v160-slim-amd64-zlib-cve-2026-85091-not-affected',
  'v160-slim-amd64-util-linux-cve-2026-76642-not-affected',
  'v160-slim-amd64-bsdutils-cve-2026-76642-not-affected',
  'v160-slim-amd64-util-linux-cve-2026-78408-not-affected',
  'v160-slim-amd64-bsdutils-cve-2026-78408-not-affected',
  'v160-slim-amd64-util-linux-cve-2026-78409-not-affected',
  'v160-slim-amd64-bsdutils-cve-2026-78409-not-affected',
];

function expectedArm64Review(amd64Review) {
  const expected = structuredClone(amd64Review);
  expected.id = expected.id.replace('slim-amd64', 'slim-arm64');
  expected.architectures = ['arm64'];
  expected.component.locationPatterns = expected.component.locationPatterns.map((pattern) =>
    pattern.replace(':amd64\\.md5sums', ':arm64\\.md5sums'));
  if (expected.vexStatement) {
    expected.vexStatement = expected.vexStatement.replace('slim-amd64', 'slim-arm64');
  }
  expected.rationale = expected.rationale.replaceAll('slim amd64', 'slim arm64');
  return expected;
}

test('maps every reviewed slim arm64 tuple without widening the amd64 precedent', () => {
  assert.equal(amd64Ids.length, 13);
  for (const amd64Id of amd64Ids) {
    const amd64Review = reviews.find((review) => review.id === amd64Id);
    assert.ok(amd64Review, `${amd64Id} precedent must exist`);
    const expected = expectedArm64Review(amd64Review);
    const actual = reviews.find((review) => review.id === expected.id);
    assert.deepEqual(actual, expected, `${expected.id} must remain an exact architecture counterpart`);
  }
});

test('keeps reviewed dates and target selectors exact for the slim arm64 mappings', () => {
  const arm64Reviews = amd64Ids.map((id) => reviews.find((review) => review.id === id.replace('slim-amd64', 'slim-arm64')));
  assert.ok(arm64Reviews.every(Boolean));
  assert.ok(arm64Reviews.every((review) => review.reviewedAt === '2026-09-08'));
  assert.ok(arm64Reviews.every((review) => review.expiresAt === '2026-10-08'));
  assert.ok(arm64Reviews.every((review) => JSON.stringify(review.variants) === '["slim"]'));
  assert.ok(arm64Reviews.every((review) => JSON.stringify(review.architectures) === '["arm64"]'));
});

test('binds the nine not-affected reviews to exact slim arm64 OpenVEX products', () => {
  const notAffectedReviews = amd64Ids
    .map((id) => reviews.find((review) => review.id === id))
    .filter((review) => review.disposition === 'not_affected');
  assert.equal(notAffectedReviews.length, 9);

  for (const review of notAffectedReviews) {
    const amd64Statement = statements.find((statement) => statement['@id'] === review.vexStatement);
    assert.ok(amd64Statement, `${review.vexStatement} precedent must exist`);
    const expected = JSON.parse(JSON.stringify(amd64Statement)
      .replaceAll('slim-amd64', 'slim-arm64')
      .replaceAll('slim amd64', 'slim arm64')
      .replaceAll('arch=amd64', 'arch=arm64'));
    const actual = statements.find((statement) => statement['@id'] === expected['@id']);
    assert.deepEqual(actual, expected, `${expected['@id']} must bind only the arm64 product tuples`);
  }
});
