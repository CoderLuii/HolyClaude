import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reviews = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8')).reviews;
const statements = JSON.parse(readFileSync('security/openvex.json', 'utf8')).statements;
const amd64Ids = [
  'v160-full-amd64-gh-fixed-cve-2024-52308',
  'v160-full-amd64-gh-fixed-cve-2026-48501',
  'v160-full-amd64-aom-debian-minor-cve-2023-6879',
  'v160-full-amd64-aom-debian-minor-cve-2023-39616',
];

function arm64Counterpart(review) {
  const counterpart = structuredClone(review);
  counterpart.id = counterpart.id.replace('full-amd64', 'full-arm64');
  counterpart.architectures = ['arm64'];
  counterpart.component.locationPatterns = counterpart.component.locationPatterns
    .map((pattern) => pattern.replaceAll(':amd64', ':arm64'));
  counterpart.rationale = counterpart.rationale.replaceAll('full amd64', 'full arm64');
  if (counterpart.vexStatement) counterpart.vexStatement = counterpart.vexStatement.replace('full-amd64', 'full-arm64');
  return counterpart;
}

test('maps only the four full arm64 Critical/vendor tuples supported without reachability guards', () => {
  const expected = amd64Ids.map((id) => arm64Counterpart(reviews.find((review) => review.id === id)));
  assert.equal(expected.length, 4);
  assert.equal(expected.reduce((count, review) => count + review.vulnerabilities.length * review.component.names.length, 0), 6);
  for (const review of expected) {
    assert.deepEqual(reviews.find((candidate) => candidate.id === review.id), review);
  }
  assert.equal(expected.filter((review) => review.disposition === 'fixed').length, 2);
  assert.equal(expected.filter((review) => review.disposition === 'vendor_severity').length, 2);
  assert.ok(expected.every((review) => review.reviewedAt === '2026-09-08' && review.expiresAt === '2026-10-08'));
  assert.ok(expected.every((review) => 'vexStatement' in review === false));
});

test('binds the nine emulation-guarded mappings to exact full arm64 OpenVEX products', () => {
  const guardedAmd64Ids = [
    'v160-full-amd64-bind-clients-cve-2025-40777-not-affected',
    'v160-full-amd64-dnsutils-cve-2025-40777-not-affected',
    'v160-full-amd64-zlib-cve-2026-85091-not-affected',
    'v160-full-amd64-util-linux-cve-2026-76642-not-affected',
    'v160-full-amd64-bsdutils-cve-2026-76642-not-affected',
    'v160-full-amd64-util-linux-cve-2026-78408-not-affected',
    'v160-full-amd64-bsdutils-cve-2026-78408-not-affected',
    'v160-full-amd64-util-linux-cve-2026-78409-not-affected',
    'v160-full-amd64-bsdutils-cve-2026-78409-not-affected',
  ];
  for (const id of guardedAmd64Ids) {
    const expectedReview = arm64Counterpart(reviews.find((review) => review.id === id));
    const actualReview = reviews.find((review) => review.id === expectedReview.id);
    assert.deepEqual(actualReview, expectedReview);

    const amd64Statement = statements.find((statement) => statement['@id'] === reviews.find((review) => review.id === id).vexStatement);
    const expectedStatement = JSON.parse(JSON.stringify(amd64Statement)
      .replaceAll('full-amd64', 'full-arm64')
      .replaceAll('full amd64', 'full arm64')
      .replaceAll('arch=amd64', 'arch=arm64'));
    assert.deepEqual(statements.find((statement) => statement['@id'] === expectedStatement['@id']), expectedStatement);
  }
});

test('requires the architecture-portable guard on the next native candidate and publication paths', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.doesNotMatch(workflow, /matrix\.arch == 'amd64'[^\n]*full_additional_linux_advisory_runtime_checks/);
  assert.equal((workflow.match(/full_additional_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
});
