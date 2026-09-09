import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));

const expectedReviews = [
  {
    id: 'v160-full-amd64-libtiff6-cve-2026-52490-not-affected',
    vulnerability: 'CVE-2026-52490',
    name: 'libtiff6',
    version: '4.5.0-6+deb12u4',
  },
  {
    id: 'v160-full-amd64-libevent-core-cve-2026-63382-not-affected',
    vulnerability: 'CVE-2026-63382',
    name: 'libevent-core-2.1-7',
    version: '2.1.12-stable-8',
  },
  {
    id: 'v160-full-amd64-libevent-core-cve-2026-63385-not-affected',
    vulnerability: 'CVE-2026-63385',
    name: 'libevent-core-2.1-7',
    version: '2.1.12-stable-8',
  },
];

test('replaces only the three proven full amd64 Critical findings with exact not-affected records', () => {
  for (const expected of expectedReviews) {
    const matches = ledger.reviews.filter((review) => review.id === expected.id);
    assert.equal(matches.length, 1, `${expected.id} must exist exactly once`);
    const review = matches[0];
    assert.deepEqual(review.vulnerabilities, [expected.vulnerability]);
    assert.deepEqual(review.component.names, [expected.name]);
    assert.deepEqual(review.component.versions, [expected.version]);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.variants, ['full']);
    assert.deepEqual(review.architectures, ['amd64']);
    assert.equal(review.disposition, 'not_affected');
    assert.equal(review.effectiveSeverity, 'None');
    assert.equal(review.reviewedAt, '2026-09-08');
    assert.equal(review.expiresAt, '2026-10-08');
    assert.equal('approvedBy' in review, false);

    const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
    assert.ok(statement, `${review.vexStatement} must exist`);
    assert.equal(statement.vulnerability.name, expected.vulnerability);
    assert.equal(statement.status, 'not_affected');
    assert.equal(statement.justification, 'vulnerable_code_not_present');
    assert.deepEqual(statement.products.map((product) => product['@id']).sort(), [
      'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full',
      'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full',
    ]);
    for (const product of statement.products) {
      assert.deepEqual(product.subcomponents, [{
        identifiers: {
          purl: `pkg:deb/debian/${encodeURIComponent(expected.name)}@${encodeURIComponent(expected.version)}?arch=amd64`,
        },
      }]);
    }
  }

  for (const removed of [
    'v158-libtiff-cve-2026-52490-critical-exception-full-amd64',
    'v158-libevent-critical-exception-full-amd64',
  ]) {
    assert.equal(ledger.reviews.some((review) => review.id === removed), false);
  }
});

test('removes replaced full amd64 authority records without leaving the ARM replacements as exceptions', () => {
  const authority = JSON.parse(
    readFileSync('security/critical-exception-authority-evidence-full-amd64.json', 'utf8'),
  );
  assert.deepEqual(authority.candidate, {
    variant: 'full',
    architecture: 'amd64',
    reportSha256: null,
  });
  const expectedIds = new Set(
    ['CVE-2026-87438', 'CVE-2026-87464', 'CVE-2026-87488', 'CVE-2026-87527', 'CVE-2026-87628']
      .flatMap((vulnerability) => ['chromium', 'chromium-common', 'chromium-sandbox']
        .map((name) => `full-amd64-chromium-${vulnerability.toLowerCase()}-${name}`)),
  );
  assert.equal(authority.records.length, 15);
  assert.deepEqual(new Set(authority.records.map((record) => record.id)), expectedIds);
  assert.ok(authority.records.every((record) =>
    record.review === 'v160-full-amd64-chromium-upstream-critical-exception' &&
    record.component.version === '152.0.7977.82-1~deb12u1'));
  assert.ok(authority.records.every((record) =>
    !['CVE-2026-52490', 'CVE-2026-63382', 'CVE-2026-63385'].includes(record.vulnerability)));

  const remaining = ledger.reviews.filter((review) =>
    review.disposition === 'critical_exception' &&
    review.vulnerabilities.some((vulnerability) =>
      ['CVE-2026-52490', 'CVE-2026-63382', 'CVE-2026-63385'].includes(vulnerability)));
  assert.deepEqual(remaining, []);

  const criticalIds = new Set(
    ledger.reviews.filter((review) => review.disposition === 'critical_exception').map((review) => review.id),
  );
  for (const file of readdirSync('security').filter((name) =>
    name.startsWith('critical-exception-authority-evidence') && name.endsWith('.json'))) {
    const document = JSON.parse(readFileSync(`security/${file}`, 'utf8'));
    for (const record of document.records) {
      assert.ok(criticalIds.has(record.review), `${file}:${record.id} must reference a current exception`);
    }
  }
});

test('binds source build separation and real full-image consumers without suppressing genuine risks', () => {
  const tiff = ledger.reviews.find((review) =>
    review.id === 'v160-full-amd64-libtiff6-cve-2026-52490-not-affected');
  assert.match(tiff.rationale, /tools\/tiffcrop\.c/);
  assert.match(tiff.rationale, /builds that file only into the tiffcrop tool installed by libtiff-tools/);
  assert.match(tiff.rationale, /gdk-pixbuf, OpenSlide, ImageMagick, Poppler, libtiffxx, and libvips/);

  for (const vulnerability of ['CVE-2026-63382', 'CVE-2026-63385']) {
    const review = ledger.reviews.find((item) => item.id ===
      `v160-full-amd64-libevent-core-${vulnerability.toLowerCase()}-not-affected`);
    assert.match(review.rationale, /http\.c/);
    assert.match(review.rationale, /EXTRAS_SRC and libevent_extra, not CORE_SRC or libevent_core/);
    assert.match(review.rationale, /tmux is the only direct full-image consumer/);
  }

  const genuineRisks = new Set(['CVE-2026-78410', 'CVE-2026-86140']);
  const prohibitedReviews = ledger.reviews.filter((review) =>
    review.disposition === 'not_affected' &&
    (review.variants === undefined || review.variants.includes('full')) &&
    (review.architectures === undefined || review.architectures.includes('amd64')) &&
    review.vulnerabilities.some((vulnerability) => genuineRisks.has(vulnerability)));
  assert.deepEqual(prohibitedReviews, []);

  const prohibitedStatements = vex.statements.filter((statement) =>
    genuineRisks.has(statement.vulnerability.name) &&
    statement.products.some((product) =>
      product['@id'] === 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full' ||
      product['@id'] === 'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full'));
  assert.deepEqual(prohibitedStatements, []);
});

test('runs full applicability checks for both architectures on candidate, final, and published images', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.match(workflow, /if \[ "\$VARIANT" = full \]; then\s+docker run --rm --entrypoint bash -v "\$PWD\/tests:\/tests:ro" "\$IMAGE" \/tests\/full_linux_advisory_runtime_checks\.sh\s+fi\s+if \[ "\$VARIANT" = full \]; then\s+docker run --rm --init --network none --entrypoint bash -v "\$PWD\/tests:\/tests:ro" "\$IMAGE" \/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Verify final full advisory evidence\s+if: matrix\.variant == 'full'/);
  const finalStep = workflow.slice(workflow.indexOf('      - name: Verify final full advisory evidence'));
  assert.match(finalStep, /steps\.image\.outputs\.ref.*steps\.image\.outputs\.digest/);
  assert.match(finalStep, /\/tests\/full_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Verify published full advisory evidence\s+if: matrix\.variant == 'full'[\s\S]+\/tests\/full_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Verify published additional full advisory evidence\s+if: matrix\.variant == 'full'[\s\S]+\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
});

test('guards every libevent binary form excluded by the exact source-package split', () => {
  const runtime = readFileSync('tests/full_linux_advisory_runtime_checks.sh', 'utf8');
  assert.match(runtime, /dpkg-query -W -f='\$\{Status\}' libevent-dev/);
  assert.match(runtime, /"\$library_dir\/libevent_extra\.a"/);
  assert.match(runtime, /"\$library_dir\/libevent\.a"/);
});
