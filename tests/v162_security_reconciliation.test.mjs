import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
const renewedHighOwners = new Map([
  ['Debian Bookworm base', 12],
  ['Debian Bookworm bubblewrap', 4],
  ['HolyClaude bundled extract-zip', 4],
  ['Junie CLI', 22],
]);

test('removes every expired September 25 High exception from the active ledger', () => {
  const renewed = ledger.reviews.filter((review) =>
    review.disposition === 'high_exception' &&
    renewedHighOwners.has(review.owner) &&
    review.expiresAt === '2026-09-25',
  );

  assert.deepEqual(renewed, []);
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

test('retains exact Junie not-affected evidence without expired High exceptions', () => {
  const junie = ledger.reviews.filter((review) => review.owner === 'Junie CLI');
  const high = junie.filter((review) => review.disposition === 'high_exception');
  const notAffected = junie.filter((review) =>
    review.vulnerabilities.includes('GHSA-c4c3-7fpv-j4q5'),
  );

  assert.deepEqual(high, []);
  assert.equal(notAffected.length, 2);
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

test('publishes the OpenVEX document only under the v1.6.4 product identity', () => {
  const productIds = vex.statements.flatMap((statement) =>
    statement.products.map((product) => product['@id']),
  );

  assert.equal(ledger.reviews.length, 540);
  assert.equal(vex.statements.length, 113);
  assert.equal(productIds.length, 234);
  assert.equal(vex['@id'], 'urn:holyclaude:openvex:v1.6.4');
  assert.equal(vex.timestamp, '2026-10-01T00:00:00Z');
  assert.ok(productIds.every((id) => id.includes('/holyclaude@1.6.4?variant=')));
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
          `pkg:oci/docker.io/coderluii/holyclaude@1.6.4?variant=${variant}`,
          `pkg:oci/ghcr.io/coderluii/holyclaude@1.6.4?variant=${variant}`,
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

test('removes the expired all-target High exceptions from the active ledger', () => {
  const accepted = ledger.reviews.filter((review) =>
    newlyAcceptedCves.includes(review.vulnerabilities[0]) && review.disposition === 'high_exception',
  );
  assert.deepEqual(accepted, []);
});

test('removes expired libxml2-dev exceptions from the active ledger', () => {
  const scopedReviews = ledger.reviews.filter((review) =>
    review.component.names.length === 1 && review.component.names[0] === 'libxml2-dev');
  assert.deepEqual(scopedReviews, []);
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
