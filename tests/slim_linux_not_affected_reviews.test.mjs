import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));

const utilLinuxNames = [
  'libblkid1',
  'libfdisk1',
  'libmount1',
  'libsmartcols1',
  'libuuid1',
  'mount',
  'util-linux',
  'util-linux-extra',
];

const expectedReviews = [
  ...['CVE-2026-76642', 'CVE-2026-78408', 'CVE-2026-78409'].flatMap((vulnerability) => [
    {
      id: `v160-slim-amd64-util-linux-${vulnerability.toLowerCase()}-not-affected`,
      vulnerability,
      names: utilLinuxNames,
      version: '2.38.1-5+deb12u3',
    },
    {
      id: `v160-slim-amd64-bsdutils-${vulnerability.toLowerCase()}-not-affected`,
      vulnerability,
      names: ['bsdutils'],
      version: '1:2.38.1-5+deb12u3',
    },
  ]),
  {
    id: 'v160-slim-amd64-zlib-cve-2026-85091-not-affected',
    vulnerability: 'CVE-2026-85091',
    names: ['zlib1g'],
    version: '1:1.2.13.dfsg-1',
  },
  {
    id: 'v160-slim-amd64-bind-clients-cve-2025-40777-not-affected',
    vulnerability: 'CVE-2025-40777',
    names: ['bind9-dnsutils', 'bind9-host', 'bind9-libs'],
    version: '1:9.18.49-1~deb12u2',
    justification: 'vulnerable_code_not_in_execute_path',
  },
  {
    id: 'v160-slim-amd64-dnsutils-cve-2025-40777-not-affected',
    vulnerability: 'CVE-2025-40777',
    names: ['dnsutils'],
    version: '1:9.18.49-1~deb12u2',
    packageArchitectures: ['all'],
    justification: 'vulnerable_code_not_in_execute_path',
  },
  {
    id: 'v160-slim-amd64-libtiff6-cve-2026-52490-not-affected',
    vulnerability: 'CVE-2026-52490',
    names: ['libtiff6'],
    version: '4.5.0-6+deb12u4',
  },
  {
    id: 'v160-slim-amd64-libevent-core-cve-2026-63382-not-affected',
    vulnerability: 'CVE-2026-63382',
    names: ['libevent-core-2.1-7'],
    version: '2.1.12-stable-8',
  },
  {
    id: 'v160-slim-amd64-libevent-core-cve-2026-63385-not-affected',
    vulnerability: 'CVE-2026-63385',
    names: ['libevent-core-2.1-7'],
    version: '2.1.12-stable-8',
  },
];

function expectedPurls(review) {
  return review.names.flatMap((name) =>
    (review.packageArchitectures ?? ['amd64']).map(
      (architecture) => `pkg:deb/debian/${encodeURIComponent(name)}@${encodeURIComponent(review.version)}?arch=${architecture}`,
    )
  ).sort();
}

test('binds 35 slim amd64 findings to exact-version not-affected reviews and OpenVEX statements', () => {
  let tupleCount = 0;
  for (const expected of expectedReviews) {
    const matches = ledger.reviews.filter((review) => review.id === expected.id);
    assert.equal(matches.length, 1, `${expected.id} must exist exactly once`);

    const review = matches[0];
    assert.deepEqual(review.vulnerabilities, [expected.vulnerability]);
    assert.deepEqual(review.component.names, expected.names);
    assert.deepEqual(review.component.versions, [expected.version]);
    assert.deepEqual(review.component.types, ['deb']);
    if (expected.packageArchitectures) {
      assert.deepEqual(review.component.packageArchitectures, expected.packageArchitectures);
    } else {
      assert.equal('packageArchitectures' in review.component, false);
    }
    assert.ok(review.component.locationPatterns.every((pattern) => pattern.startsWith('^/') && pattern.endsWith('$')));
    assert.equal(review.disposition, 'not_affected');
    assert.equal(review.effectiveSeverity, 'None');
    assert.equal(review.reviewedAt, '2026-09-08');
    assert.equal(review.expiresAt, '2026-10-08');
    assert.deepEqual(review.variants, ['slim']);
    assert.deepEqual(review.architectures, ['amd64']);
    assert.equal('approvedBy' in review, false);

    const statements = vex.statements.filter((statement) => statement['@id'] === review.vexStatement);
    assert.equal(statements.length, 1, `${review.vexStatement} must exist exactly once`);
    const statement = statements[0];
    assert.equal(statement.vulnerability.name, expected.vulnerability);
    assert.equal(statement.status, 'not_affected');
    assert.equal(statement.justification, expected.justification ?? 'vulnerable_code_not_present');
    assert.deepEqual(
      statement.products.map((product) => product['@id']).sort(),
      [
        'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=slim',
        'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=slim',
      ],
    );
    for (const product of statement.products) {
      assert.deepEqual(
        product.subcomponents.map((component) => component.identifiers.purl).sort(),
        expectedPurls(expected),
      );
    }
    tupleCount += expected.names.length;
  }
  assert.equal(tupleCount, 35);
});

test('replaces the proven slim amd64 findings and leaves no ARM replacement as an exception', () => {
  const replacedIds = [
    'v158-libtiff-cve-2026-52490-critical-exception-slim-amd64',
    'v158-libevent-critical-exception-slim-amd64',
  ];
  assert.ok(ledger.reviews.every((review) => !replacedIds.includes(review.id)));

  const authority = JSON.parse(
    readFileSync('security/critical-exception-authority-evidence-slim-amd64.json', 'utf8'),
  );
  assert.deepEqual(authority.candidate, {
    variant: 'slim',
    architecture: 'amd64',
    reportSha256: null,
  });
  const expectedIds = new Set(
    ['CVE-2026-87438', 'CVE-2026-87464', 'CVE-2026-87488', 'CVE-2026-87527', 'CVE-2026-87628']
      .flatMap((vulnerability) => ['chromium', 'chromium-common', 'chromium-sandbox']
        .map((name) => `slim-amd64-chromium-${vulnerability.toLowerCase()}-${name}`)),
  );
  assert.equal(authority.records.length, 15);
  assert.deepEqual(new Set(authority.records.map((record) => record.id)), expectedIds);
  assert.ok(authority.records.every((record) =>
    record.review === 'v160-slim-amd64-chromium-upstream-critical-exception' &&
    record.component.version === '152.0.7977.82-1~deb12u1'));
  assert.ok(authority.records.every((record) =>
    !['CVE-2026-52490', 'CVE-2026-63382', 'CVE-2026-63385'].includes(record.vulnerability)));

  const remaining = ledger.reviews.filter((review) =>
    review.disposition === 'critical_exception' &&
    review.vulnerabilities.some((vulnerability) =>
      ['CVE-2026-52490', 'CVE-2026-63382', 'CVE-2026-63385'].includes(vulnerability),
    ),
  );
  assert.deepEqual(remaining, []);

  const criticalById = new Map(
    ledger.reviews
      .filter((review) => review.disposition === 'critical_exception')
      .map((review) => [review.id, review]),
  );
  for (const file of readdirSync('security').filter((name) =>
    name.startsWith('critical-exception-authority-evidence') && name.endsWith('.json'),
  )) {
    const document = JSON.parse(readFileSync(`security/${file}`, 'utf8'));
    for (const record of document.records) {
      const review = criticalById.get(record.review);
      assert.ok(review, `${file}:${record.id} must reference a current Critical exception`);
      assert.ok(review.authorityEvidence.includes(record.id));
    }
  }
});

test('records source build separation and real consumer paths for the three replacements', () => {
  const tiff = ledger.reviews.find(
    (review) => review.id === 'v160-slim-amd64-libtiff6-cve-2026-52490-not-affected',
  );
  assert.match(tiff.rationale, /tools\/tiffcrop\.c/);
  assert.match(tiff.rationale, /builds.*tiffcrop tool installed by libtiff-tools/);
  assert.match(tiff.rationale, /gdk-pixbuf TIFF consumer links libtiff\.so\.6/);

  for (const vulnerability of ['CVE-2026-63382', 'CVE-2026-63385']) {
    const review = ledger.reviews.find((item) => item.id ===
      `v160-slim-amd64-libevent-core-${vulnerability.toLowerCase()}-not-affected`);
    assert.match(review.rationale, /http\.c/);
    assert.match(review.rationale, /EXTRAS_SRC and libevent_extra, not CORE_SRC or libevent_core/);
    assert.match(review.rationale, /tmux consumer links only libevent_core/);
  }
});

test('preserves the upstream and Debian affected-range conflict for CVE-2026-76642', () => {
  for (const id of [
    'v160-slim-amd64-util-linux-cve-2026-76642-not-affected',
    'v160-slim-amd64-bsdutils-cve-2026-76642-not-affected',
  ]) {
    const review = ledger.reviews.find((item) => item.id === id);
    assert.match(review.rationale, /Upstream lists versions through 2\.42\.2 as affected/);
    assert.match(review.rationale, /Debian marks exact Bookworm 2\.38\.1 source vulnerable/);
    assert.match(review.rationale, /does not declare the version unaffected/);
    const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
    assert.match(statement.impact_statement, /advisory-described privileged post-helper path/);
  }
});

test('isolates the architecture-all dnsutils tuple without suppressing actual util-linux risk', () => {
  const targetReviews = expectedReviews.map(({ id }) => ledger.reviews.find((review) => review.id === id));
  assert.ok(targetReviews.every(Boolean));
  assert.ok(
    targetReviews.every(
      (review) => review.vulnerabilities[0] !== 'CVE-2026-78410',
    ),
  );

  const dnsutils = targetReviews.find((review) => review.component.names.includes('dnsutils'));
  assert.deepEqual(dnsutils.component.names, ['dnsutils']);
  assert.deepEqual(dnsutils.component.packageArchitectures, ['all']);
  const dnsutilsPurls = vex.statements
    .filter((statement) => statement['@id'] === dnsutils.vexStatement)
    .flatMap((statement) => statement.products)
    .flatMap((product) => product.subcomponents)
    .map((component) => component.identifiers.purl);
  assert.equal(dnsutilsPurls.length, 2);
  assert.ok(dnsutilsPurls.every((purl) => purl ===
    'pkg:deb/debian/dnsutils@1%3A9.18.49-1~deb12u2?arch=all'));

  const otherStatementIds = new Set(
    targetReviews.filter((review) => review !== dnsutils).map((review) => review.vexStatement),
  );
  const otherPurls = vex.statements
    .filter((statement) => otherStatementIds.has(statement['@id']))
    .flatMap((statement) => statement.products)
    .flatMap((product) => product.subcomponents)
    .map((component) => component.identifiers.purl);
  assert.ok(otherPurls.every((purl) => !purl.includes('/dnsutils@')));
  assert.ok(otherPurls.every((purl) => purl.endsWith('?arch=amd64')));
});

test('leaves no temporary Critical exception for the component-separated findings', () => {
  const vulnerabilities = new Set(['CVE-2026-52490', 'CVE-2026-63382', 'CVE-2026-63385']);
  const reviews = ledger.reviews.filter((review) =>
    review.disposition === 'critical_exception' &&
    review.vulnerabilities.some((vulnerability) => vulnerabilities.has(vulnerability)),
  );
  assert.deepEqual(reviews, []);
});

test('runs slim advisory checks for both architectures on candidate, final, and published images', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.match(workflow, /if \[ "\$VARIANT" = slim \]; then\s+docker run --rm --entrypoint bash -v "\$PWD\/tests:\/tests:ro" "\$IMAGE" \/tests\/slim_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Verify final slim advisory evidence\s+if: matrix\.variant == 'slim'/);
  const finalStep = workflow.slice(workflow.indexOf('      - name: Verify final slim advisory evidence'));
  assert.match(finalStep, /steps\.image\.outputs\.ref.*steps\.image\.outputs\.digest/);
  assert.match(finalStep, /\/tests\/slim_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Verify published slim advisory evidence\s+if: matrix\.variant == 'slim'[\s\S]+\/tests\/slim_linux_advisory_runtime_checks\.sh/);
});

test('guards every slim libevent binary form excluded by the exact source-package split', () => {
  const runtime = readFileSync('tests/slim_linux_advisory_runtime_checks.sh', 'utf8');
  assert.match(runtime, /dpkg-query -W -f='\$\{Status\}' libevent-dev/);
  assert.match(runtime, /"\$library_dir\/libevent_extra\.a"/);
  assert.match(runtime, /"\$library_dir\/libevent\.a"/);
});
