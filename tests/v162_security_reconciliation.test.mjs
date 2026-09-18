import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
const targets = ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64'];
const bindCves = [
  'CVE-2026-19666',
  'CVE-2026-19667',
  'CVE-2026-76163',
  'CVE-2026-77692',
  'CVE-2026-80274',
  'CVE-2026-81563',
  'CVE-2026-81736',
];
const newlyAcceptedCves = [
  'CVE-2026-86138',
  'CVE-2026-86139',
  'CVE-2026-86142',
  'CVE-2026-86143',
  'CVE-2026-86144',
  'CVE-2026-19499',
];
const evaluator = resolve('scripts/evaluate-security-report.mjs');

const renewedHighOwners = new Map([
  ['Debian Bookworm base', 12],
  ['Debian Bookworm bubblewrap', 4],
  ['Debian Bookworm libde265', 12],
  ['HolyClaude bundled extract-zip', 4],
  ['Junie CLI', 22],
]);

test('renews only the previously accepted High scope through September 25', () => {
  const renewed = ledger.reviews.filter((review) =>
    review.disposition === 'high_exception' &&
    renewedHighOwners.has(review.owner) &&
    !review.id.startsWith('v162-') &&
    review.reviewedAt === '2026-09-18' &&
    review.expiresAt === '2026-09-25',
  );

  assert.equal(renewed.length, 54);
  for (const [owner, count] of renewedHighOwners) {
    assert.equal(renewed.filter((review) => review.owner === owner).length, count, owner);
  }
  for (const review of renewed) {
    assert.equal(review.reviewedAt, '2026-09-18', review.id);
    assert.equal(review.expiresAt, '2026-09-25', review.id);
    assert.equal(review.approvedBy, 'CoderLuii', review.id);
    assert.equal(review.effectiveSeverity, 'High', review.id);
    assert.equal('vexStatement' in review, false, review.id);
  }
});

test('refreshes exact vendor severities without converting them to accepted risk', () => {
  const expected = new Map([
    ['Debian Bookworm curl', 20],
    ['Debian Bookworm ImageMagick', 8],
  ]);
  const reviews = ledger.reviews.filter((review) => expected.has(review.owner));

  assert.equal(reviews.length, 28);
  for (const [owner, count] of expected) {
    assert.equal(reviews.filter((review) => review.owner === owner).length, count, owner);
  }
  for (const review of reviews) {
    assert.equal(review.disposition, 'vendor_severity', review.id);
    assert.ok(['Low', 'Medium'].includes(review.effectiveSeverity), review.id);
    assert.equal(review.reviewedAt, '2026-09-18', review.id);
    assert.equal(review.expiresAt, '2026-10-18', review.id);
    assert.equal('approvedBy' in review, false, review.id);
  }
});

test('rebinds all eight GitHub CLI fixed mappings to the scanned 2.101.0 package', () => {
  const reviews = ledger.reviews.filter((review) =>
    review.owner === 'GitHub CLI' &&
    ['CVE-2024-52308', 'CVE-2026-48501'].includes(review.vulnerabilities[0]),
  );

  assert.equal(reviews.length, 8);
  for (const review of reviews) {
    assert.deepEqual(review.component.names, ['gh']);
    assert.deepEqual(review.component.versions, ['2.101.0']);
    assert.equal(review.disposition, 'fixed');
    assert.equal(review.effectiveSeverity, 'None');
    assert.equal(review.reviewedAt, '2026-09-18');
    assert.equal(review.expiresAt, '2026-10-18');
    assert.match(review.rationale, /2\.101\.0/);
    assert.doesNotMatch(review.rationale, /2\.100\.0/);
  }
});

test('relocates Junie review and VEX bindings to exact stable 3196.5 identities', () => {
  const junie = ledger.reviews.filter((review) => review.owner === 'Junie CLI');
  const high = junie.filter((review) => review.disposition === 'high_exception');
  const notAffected = junie.filter((review) =>
    review.vulnerabilities.includes('GHSA-c4c3-7fpv-j4q5'),
  );

  assert.equal(high.length, 22);
  assert.equal(notAffected.length, 2);
  for (const review of high) {
    assert.ok(review.component.locationPatterns.every((pattern) => pattern.includes('3196\\.5')));
    assert.match(review.rationale, /official stable Junie CLI 3196\.5/);
    assert.equal(review.reviewedAt, '2026-09-18');
    assert.equal(review.expiresAt, '2026-09-25');
  }
  for (const review of notAffected) {
    assert.deepEqual(review.component.locationPatterns, [
      '^/home/claude/\\.local/share/junie/versions/3196\\.5/lib/app/junie-release-3196\\.5\\.jar$',
    ]);
    assert.equal(review.reviewedAt, '2026-09-18');
    assert.equal(review.expiresAt, '2026-10-18');
    assert.match(review.rationale, /f82726298a4e12ee3798bcda516fbaf0d9d6b85da89110b7bd62801af64997f7/);
    assert.match(review.rationale, /f4e40d610438ff9f553ccc6529d943d5272eb8fa26e3c92ae51812623bfee438/);
    const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
    assert.ok(statement, review.vexStatement);
    assert.match(statement.impact_statement, /Junie 3196\.5/);
    assert.match(statement.impact_statement, /f82726298a4e12ee3798bcda516fbaf0d9d6b85da89110b7bd62801af64997f7/);
    assert.match(statement.impact_statement, /f4e40d610438ff9f553ccc6529d943d5272eb8fa26e3c92ae51812623bfee438/);
  }
  assert.doesNotMatch(JSON.stringify({ junie, statements: vex.statements }), /3196\\?\.4|24cc3269086af0d31f475229b138bd3f965bbde8d41f879cc1ee38a4a94aff9f/);
});

test('publishes the OpenVEX document only under the v1.6.2 product identity', () => {
  const productIds = vex.statements.flatMap((statement) =>
    statement.products.map((product) => product['@id']),
  );

  assert.equal(ledger.reviews.length, 593);
  assert.equal(vex.statements.length, 113);
  assert.equal(productIds.length, 234);
  assert.equal(vex['@id'], 'urn:holyclaude:openvex:v1.6.2');
  assert.equal(vex.timestamp, '2026-09-18T00:00:00Z');
  assert.ok(productIds.every((id) => id.includes('/holyclaude@1.6.2?variant=')));
  assert.ok(productIds.every((id) => !id.includes('@1.6.1')));
});

test('maps the seven new BIND advisories to 56 exact target and package-group applicability decisions', () => {
  const reviews = ledger.reviews.filter((review) => bindCves.includes(review.vulnerabilities[0]));
  const statements = vex.statements.filter((statement) => bindCves.includes(statement.vulnerability?.name));

  assert.equal(reviews.length, 56);
  assert.equal(statements.length, 56);
  for (const cve of bindCves) {
    for (const target of targets) {
      const [variant, arch] = target.split('-');
      for (const group of ['bind-clients', 'dnsutils']) {
        const id = `v162-${target}-${group}-${cve.toLowerCase()}-not-affected`;
        const review = reviews.find((item) => item.id === id);
        assert.ok(review, id);
        const names = group === 'bind-clients'
          ? ['bind9-dnsutils', 'bind9-host', 'bind9-libs']
          : ['dnsutils'];
        assert.deepEqual(review.vulnerabilities, [cve]);
        assert.deepEqual(review.component.names, names);
        assert.deepEqual(review.component.versions, ['1:9.18.49-1~deb12u2']);
        assert.deepEqual(review.component.types, ['deb']);
        assert.deepEqual(review.variants, [variant]);
        assert.deepEqual(review.architectures, [arch]);
        assert.equal(review.disposition, 'not_affected');
        assert.equal(review.effectiveSeverity, 'None');
        assert.equal(review.authority.name, 'Debian Security Tracker');
        assert.equal(review.authority.url, `https://security-tracker.debian.org/tracker/${cve}`);
        assert.equal(review.reviewedAt, '2026-09-18');
        assert.equal(review.expiresAt, '2026-10-18');
        assert.equal('approvedBy' in review, false, id);
        assert.equal(review.disposition === 'high_exception', false, id);
        assert.match(review.rationale, /ISC rates this advisory High with CVSS 7\.5/);
        assert.match(review.rationale, /named(?: server| resolver| executable)?|resolver/);
        assert.match(review.rationale, /not installed|absent/);

        if (group === 'dnsutils') {
          assert.deepEqual(review.component.packageArchitectures, ['all']);
          assert.deepEqual(review.component.locationPatterns, [
            '^/usr/share/doc/dnsutils/copyright$',
            '^/var/lib/dpkg/info/dnsutils\\.list$',
            '^/var/lib/dpkg/info/dnsutils\\.md5sums$',
            '^/var/lib/dpkg/status$',
          ]);
        } else {
          assert.equal('packageArchitectures' in review.component, false);
          assert.deepEqual(review.component.locationPatterns, [
            '^/usr/share/doc/bind9-dnsutils/copyright$',
            '^/usr/share/doc/bind9-host/copyright$',
            '^/usr/share/doc/bind9-libs/copyright$',
            '^/var/lib/dpkg/info/bind9-dnsutils\\.list$',
            '^/var/lib/dpkg/info/bind9-dnsutils\\.md5sums$',
            '^/var/lib/dpkg/info/bind9-host\\.list$',
            '^/var/lib/dpkg/info/bind9-host\\.md5sums$',
            `^/var/lib/dpkg/info/bind9-libs:${arch}\\.md5sums$`,
            '^/var/lib/dpkg/status$',
          ]);
        }

        const statement = statements.find((item) => item['@id'] === review.vexStatement);
        assert.ok(statement, review.vexStatement);
        assert.equal(statement.vulnerability['@id'], `https://nvd.nist.gov/vuln/detail/${cve}`);
        assert.equal(statement.status, 'not_affected');
        assert.equal(statement.justification, 'vulnerable_code_not_in_execute_path');
        assert.match(statement.impact_statement, /ISC rates this advisory High with CVSS 7\.5/);
        assert.match(statement.impact_statement, /named(?: server| resolver| executable)?|resolver/);
        assert.match(statement.impact_statement, /not installed|absent/);
        assert.deepEqual(statement.products.map((product) => product['@id']).sort(), [
          `pkg:oci/docker.io/coderluii/holyclaude@1.6.2?variant=${variant}`,
          `pkg:oci/ghcr.io/coderluii/holyclaude@1.6.2?variant=${variant}`,
        ]);
        const expectedPurls = names.map((name) => {
          const packageArch = name === 'dnsutils' ? 'all' : arch;
          return `pkg:deb/debian/${name}@1%3A9.18.49-1~deb12u2?arch=${packageArch}`;
        });
        for (const product of statement.products) {
          assert.deepEqual(product.subcomponents.map((item) => item.identifiers.purl), expectedPurls);
        }
      }
    }
  }
});

test('binds newly authorized High risk only to the exact evidenced native tuples', () => {
  const accepted = ledger.reviews.filter((review) =>
    newlyAcceptedCves.includes(review.vulnerabilities[0]) && review.disposition === 'high_exception',
  );
  assert.equal(accepted.length, 11);
  for (const cve of newlyAcceptedCves) {
    const review = accepted.find((item) =>
      item.vulnerabilities[0] === cve &&
      (cve === 'CVE-2026-19499' || item.component.names[0] === 'libxml2'));
    assert.ok(review, cve);
    assert.deepEqual(review.variants, ['full', 'slim']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.equal(review.reviewedAt, '2026-09-18');
    assert.equal(review.expiresAt, '2026-09-25');
    assert.equal(review.approvedBy, 'CoderLuii');
    assert.equal(review.effectiveSeverity, 'High');
    assert.equal('vexStatement' in review, false);
    assert.equal(vex.statements.some((statement) => statement.vulnerability?.name === cve), false, cve);
  }

  for (const review of accepted.filter((item) => item.component.names[0] === 'libxml2')) {
    assert.deepEqual(review.component.names, ['libxml2']);
    assert.deepEqual(review.component.versions, ['2.9.14+dfsg-1.3~deb12u6']);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.component.locationPatterns, [
      '^/usr/share/doc/libxml2/copyright$',
      '^/var/lib/dpkg/info/libxml2:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libxml2:arm64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ]);
  }
  for (const review of accepted.filter((item) => item.component.names[0] === 'libxml2-dev')) {
    assert.deepEqual(review.component.names, ['libxml2-dev']);
    assert.deepEqual(review.component.versions, ['2.9.14+dfsg-1.3~deb12u6']);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.variants, ['full']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.deepEqual(review.component.locationPatterns, [
      '^/usr/share/doc/libxml2-dev/copyright$',
      '^/var/lib/dpkg/info/libxml2-dev:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libxml2-dev:arm64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ]);
  }
  const glibc = accepted.find((item) => item.vulnerabilities[0] === 'CVE-2026-19499');
  assert.deepEqual(glibc.component.names, ['libc-bin', 'libc-dev-bin', 'libc-l10n', 'libc6', 'libc6-dev', 'locales']);
  assert.deepEqual(glibc.component.versions, ['2.36-9+deb12u14']);
  assert.deepEqual(glibc.component.types, ['deb']);
  assert.deepEqual(glibc.component.locationPatterns, [
    '^/usr/share/doc/libc-bin/copyright$',
    '^/usr/share/doc/libc-dev-bin/copyright$',
    '^/usr/share/doc/libc-l10n/copyright$',
    '^/usr/share/doc/libc6-dev/copyright$',
    '^/usr/share/doc/libc6/copyright$',
    '^/usr/share/doc/locales/copyright$',
    '^/var/lib/dpkg/info/libc-bin\\.conffiles$',
    '^/var/lib/dpkg/info/libc-bin\\.list$',
    '^/var/lib/dpkg/info/libc-bin\\.md5sums$',
    '^/var/lib/dpkg/info/libc-bin\\.postinst$',
    '^/var/lib/dpkg/info/libc-bin\\.triggers$',
    '^/var/lib/dpkg/info/libc-dev-bin\\.list$',
    '^/var/lib/dpkg/info/libc-dev-bin\\.md5sums$',
    '^/var/lib/dpkg/info/libc-l10n\\.list$',
    '^/var/lib/dpkg/info/libc-l10n\\.md5sums$',
    '^/var/lib/dpkg/info/libc6-dev:amd64\\.md5sums$',
    '^/var/lib/dpkg/info/libc6-dev:arm64\\.md5sums$',
    '^/var/lib/dpkg/info/libc6:amd64\\.conffiles$',
    '^/var/lib/dpkg/info/libc6:amd64\\.md5sums$',
    '^/var/lib/dpkg/info/libc6:arm64\\.conffiles$',
    '^/var/lib/dpkg/info/libc6:arm64\\.md5sums$',
    '^/var/lib/dpkg/info/locales\\.conffiles$',
    '^/var/lib/dpkg/info/locales\\.config$',
    '^/var/lib/dpkg/info/locales\\.list$',
    '^/var/lib/dpkg/info/locales\\.md5sums$',
    '^/var/lib/dpkg/info/locales\\.postinst$',
    '^/var/lib/dpkg/info/locales\\.postrm$',
    '^/var/lib/dpkg/info/locales\\.prerm$',
    '^/var/lib/dpkg/info/locales\\.templates$',
    '^/var/lib/dpkg/status$',
  ]);

  const root = mkdtempSync(join(tmpdir(), 'holyclaude-v162-unmapped-high-'));
  try {
    const report = {
      source: { type: 'sbom', target: 'v162-unmapped-high.cdx.json' },
      distro: { name: 'debian', version: '12.15', idLike: ['debian'] },
      descriptor: { name: 'grype', version: '0.119.0', configuration: {} },
      ignoredMatches: [],
      matches: [
        ...newlyAcceptedCves.slice(0, 5).map((id) => ({
          vulnerability: { id, severity: 'High', fix: { versions: [], state: 'not-fixed' } },
          artifact: { name: 'libxml2', version: '2.9.14+dfsg-1.3~deb12u6', type: 'deb', locations: [{ path: '/var/lib/dpkg/status' }] },
        })),
        {
          vulnerability: { id: 'CVE-2026-19499', severity: 'High', fix: { versions: [], state: 'not-fixed' } },
          artifact: { name: 'libc6', version: '2.36-9+deb12u14', type: 'deb', locations: [{ path: '/var/lib/dpkg/status' }] },
        },
      ],
    };
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    const files = {
      report,
      ledger: { schemaVersion: ledger.schemaVersion, policy: ledger.policy, reviews: accepted },
      authority: {
        schemaVersion: 1,
        candidate: {
          variant: 'slim',
          architecture: 'amd64',
          reportSha256: createHash('sha256').update(reportText).digest('hex'),
        },
        records: [],
      },
      vex: {
        '@context': 'https://openvex.dev/ns/v0.2.0',
        '@id': 'urn:test:v162-unmapped-high',
        author: 'CoderLuii',
        timestamp: '2026-09-18T00:00:00Z',
        version: 1,
        statements: [],
      },
    };
    writeFileSync(join(root, 'report.json'), reportText);
    for (const [name, value] of Object.entries(files)) {
      if (name !== 'report') writeFileSync(join(root, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
    }
    const result = spawnSync(process.execPath, [
      evaluator,
      '--report', join(root, 'report.json'),
      '--ledger', join(root, 'ledger.json'),
      '--authority-evidence', join(root, 'authority.json'),
      '--vex', join(root, 'vex.json'),
      '--output-dir', join(root, 'output'),
      '--variant', 'slim',
      '--arch', 'amd64',
      '--image-digest', `sha256:${'a'.repeat(64)}`,
      '--sbom-sha256', 'b'.repeat(64),
      '--as-of', '2026-09-18',
    ], { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);

    report.matches[0].artifact.version = '2.9.14+dfsg-1.3~deb12u5';
    const mutatedText = `${JSON.stringify(report, null, 2)}\n`;
    writeFileSync(join(root, 'report.json'), mutatedText);
    files.authority.candidate.reportSha256 = createHash('sha256').update(mutatedText).digest('hex');
    writeFileSync(join(root, 'authority.json'), `${JSON.stringify(files.authority, null, 2)}\n`);
    const rejected = spawnSync(process.execPath, [
      evaluator,
      '--report', join(root, 'report.json'),
      '--ledger', join(root, 'ledger.json'),
      '--authority-evidence', join(root, 'authority.json'),
      '--vex', join(root, 'vex.json'),
      '--output-dir', join(root, 'mutated-output'),
      '--variant', 'slim',
      '--arch', 'amd64',
      '--image-digest', `sha256:${'a'.repeat(64)}`,
      '--sbom-sha256', 'b'.repeat(64),
      '--as-of', '2026-09-18',
    ], { encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /CVE-2026-86138 libxml2@2\.9\.14\+dfsg-1\.3~deb12u5: matched 0 reviews for raw High finding/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts libxml2-dev only in Full images and rejects the same tuple in Slim images', () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-v162-libxml2-dev-scope-'));
  try {
    const scopedReviews = ledger.reviews.filter((review) =>
      review.component.names.length === 1 && review.component.names[0] === 'libxml2-dev');
    assert.equal(scopedReviews.length, 5);

    for (const arch of ['amd64', 'arm64']) {
      const report = {
        source: { type: 'sbom', target: `v162-full-${arch}.cdx.json` },
        distro: { name: 'debian', version: '12.15', idLike: ['debian'] },
        descriptor: { name: 'grype', version: '0.119.0', configuration: {} },
        ignoredMatches: [],
        matches: newlyAcceptedCves.slice(0, 5).map((id) => ({
          vulnerability: { id, severity: 'High', fix: { versions: [], state: 'not-fixed' } },
          artifact: {
            name: 'libxml2-dev',
            version: '2.9.14+dfsg-1.3~deb12u6',
            type: 'deb',
            locations: [{ path: `/var/lib/dpkg/info/libxml2-dev:${arch}.md5sums` }],
          },
        })),
      };
      const reportText = `${JSON.stringify(report, null, 2)}\n`;
      const reportPath = join(root, `report-${arch}.json`);
      const ledgerPath = join(root, `ledger-${arch}.json`);
      const vexPath = join(root, `vex-${arch}.json`);
      writeFileSync(reportPath, reportText);
      writeFileSync(ledgerPath, `${JSON.stringify({ schemaVersion: ledger.schemaVersion, policy: ledger.policy, reviews: scopedReviews }, null, 2)}\n`);
      writeFileSync(vexPath, `${JSON.stringify({
        '@context': 'https://openvex.dev/ns/v0.2.0',
        '@id': `urn:test:v162-libxml2-dev-${arch}`,
        author: 'CoderLuii',
        timestamp: '2026-09-18T00:00:00Z',
        version: 1,
        statements: [],
      }, null, 2)}\n`);

      for (const variant of ['full', 'slim']) {
        const authorityPath = join(root, `authority-${variant}-${arch}.json`);
        writeFileSync(authorityPath, `${JSON.stringify({
          schemaVersion: 1,
          candidate: {
            variant,
            architecture: arch,
            reportSha256: createHash('sha256').update(reportText).digest('hex'),
          },
          records: [],
        }, null, 2)}\n`);
        const result = spawnSync(process.execPath, [
          evaluator,
          '--report', reportPath,
          '--ledger', ledgerPath,
          '--authority-evidence', authorityPath,
          '--vex', vexPath,
          '--output-dir', join(root, `output-${variant}-${arch}`),
          '--variant', variant,
          '--arch', arch,
          '--image-digest', `sha256:${'c'.repeat(64)}`,
          '--sbom-sha256', 'd'.repeat(64),
          '--as-of', '2026-09-18',
        ], { encoding: 'utf8' });

        if (variant === 'full') {
          assert.equal(result.status, 0, result.stderr);
        } else {
          assert.notEqual(result.status, 0);
          assert.match(result.stderr, /libxml2-dev@2\.9\.14\+dfsg-1\.3~deb12u6: matched 0 reviews for raw High finding/);
        }
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('retains exact BIND native runtime guards and candidate/final workflow coverage', () => {
  const slim = readFileSync('tests/slim_linux_advisory_runtime_checks.sh', 'utf8');
  const full = readFileSync('tests/full_additional_linux_advisory_runtime_checks.sh', 'utf8');
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');

  for (const runtime of [slim, full]) {
    assert.match(runtime, /require_package "\$package" '1:9\.18\.49-1~deb12u2' "\$architecture"/);
    assert.match(runtime, /dpkg-query -W -f='\$\{Status\}' bind9/);
    assert.match(runtime, /command -v named/);
    assert.match(runtime, /\/usr\/sbin\/named/);
  }
  assert.match(slim, /require_package dnsutils '1:9\.18\.49-1~deb12u2' all/);
  assert.match(full, /require_package dnsutils '1:9\.18\.49-1~deb12u2' all/);
  assert.equal((workflow.match(/slim_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
  assert.equal((workflow.match(/full_additional_linux_advisory_runtime_checks\.sh/g) ?? []).length, 3);
});

test('retires the four fixed Chromium Critical exceptions and authority records', () => {
  const chromium = ledger.reviews.filter((review) =>
    review.owner === 'Debian Bookworm Chromium' && review.disposition === 'critical_exception',
  );
  assert.deepEqual(chromium, []);

  const severityMappings = ledger.reviews.filter((review) =>
    review.owner === 'Debian Bookworm Chromium' && review.disposition === 'vendor_severity',
  );
  assert.deepEqual(severityMappings, []);

  for (const target of ['', ...targets]) {
    const suffix = target ? `-${target}` : '';
    const evidencePath = `security/critical-exception-authority-evidence${suffix}.json`;
    const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
    assert.deepEqual(evidence.records, [], evidencePath);
  }
});
