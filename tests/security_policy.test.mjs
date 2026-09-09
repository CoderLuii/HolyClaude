import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const evaluator = resolve('scripts/evaluate-security-report.mjs');
const authorityBinder = resolve('scripts/bind-security-authority-report.mjs');

const linuxLibcIgnoreRule = {
  namespace: '',
  package: {
    name: 'linux-libc-dev',
    language: '',
    type: 'deb',
    'upstream-name': 'linux',
  },
  'match-type': 'exact-indirect-match',
};

function addLinuxLibcIgnoredMatch(report) {
  report.descriptor.configuration = {
    'match-upstream-kernel-headers': false,
    ignore: [
      {
        vulnerability: '',
        'include-aliases': false,
        reason: '',
        namespace: '',
        'fix-state': '',
        package: {
          name: 'linux-libc-dev',
          version: '',
          language: '',
          type: 'deb',
          location: '',
          'upstream-name': 'linux',
        },
        'vex-status': '',
        'vex-justification': '',
        'match-type': 'exact-indirect-match',
      },
    ],
  };
  report.ignoredMatches.push({
    vulnerability: {
      id: 'CVE-2099-0099',
      severity: 'Critical',
      namespace: 'debian:distro:debian:12',
      dataSource: 'https://security-tracker.debian.org/tracker/CVE-2099-0099',
      fix: { versions: [], state: 'not-fixed' },
    },
    artifact: {
      name: 'linux-libc-dev',
      version: '6.1.177-1',
      type: 'deb',
      locations: [{ path: '/var/lib/dpkg/status' }],
    },
    matchDetails: [
      {
        type: 'exact-indirect-match',
        matcher: 'dpkg-matcher',
        searchedBy: {
          distro: { type: 'debian', version: '12.15' },
          package: { name: 'linux', version: '6.1.177-1' },
          namespace: 'debian:distro:debian:12',
        },
        found: { vulnerabilityID: 'CVE-2099-0099', versionConstraint: 'none (unknown)' },
      },
    ],
    appliedIgnoreRules: [structuredClone(linuxLibcIgnoreRule)],
  });
}

function fixture() {
  return {
    report: {
      source: { type: 'sbom', target: 'fixture.cdx.json' },
      distro: { name: 'debian', version: '12', idLike: ['debian'] },
      descriptor: { name: 'grype', version: '0.118.0', configuration: {} },
      ignoredMatches: [],
      matches: [
        {
          vulnerability: { id: 'CVE-2099-0001', severity: 'Critical', fix: { versions: [], state: 'not-fixed' } },
          artifact: {
            name: 'example-package',
            version: '1.0.0',
            type: 'deb',
            locations: [{ path: '/usr/bin/example-package' }],
          },
        },
      ],
    },
    ledger: {
      schemaVersion: 1,
      policy: 'security/advisory-review-policy.md',
      reviews: [
        {
          id: 'example-review',
          vulnerabilities: ['CVE-2099-0001'],
          component: {
            names: ['example-package'],
            versions: ['1.0.0'],
            types: ['deb'],
            locationPatterns: ['^/usr/bin/example-package$'],
          },
          disposition: 'vendor_severity',
          effectiveSeverity: 'Low',
          owner: 'Example tool',
          authority: {
            name: 'Debian Security Tracker',
            url: 'https://security-tracker.debian.org/tracker/CVE-2099-0001',
          },
          reviewedAt: '2026-07-15',
          expiresAt: '2026-08-14',
          rationale: 'Exact fixture review.',
        },
      ],
    },
    vex: {
      '@context': 'https://openvex.dev/ns/v0.2.0',
      '@id': 'urn:test:openvex',
      author: 'CoderLuii',
      timestamp: '2026-07-15T00:00:00Z',
      version: 1,
      statements: [],
    },
    authorityEvidence: {
      schemaVersion: 1,
      candidate: {
        variant: 'slim',
        architecture: 'arm64',
        reportSha256: '0'.repeat(64),
      },
      records: [
        {
          id: 'example-evidence',
          review: 'example-review',
          vulnerability: 'CVE-2099-0001',
          component: {
            name: 'example-package',
            version: '1.0.0',
            type: 'deb',
            locations: ['/usr/bin/example-package'],
          },
          sourcePackage: 'example-package',
          repository: {
            origin: 'official_debian_repository',
            distribution: 'Debian',
            suite: 'bookworm',
            urls: ['https://deb.debian.org/debian', 'https://security.debian.org/debian-security'],
            packageVersion: '1.0.0',
          },
          advisoryStatus: 'open',
          fixedVersion: null,
          authority: {
            name: 'Debian Security Tracker',
            url: 'https://security-tracker.debian.org/tracker/CVE-2099-0001',
          },
          checkedAt: '2026-09-01',
        },
      ],
    },
  };
}

function runFixture(
  mutate = () => {},
  {
    variant = 'full',
    arch = 'amd64',
    asOf = '2026-07-15',
    imageDigest = `sha256:${'a'.repeat(64)}`,
    sbomSha256 = 'b'.repeat(64),
    evidenceVariant = variant,
    evidenceArch = arch,
  } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-security-policy-'));
  try {
    const data = fixture();
    mutate(data);
    const criticalEvidenceIds = new Set(
      (data.ledger.reviews ?? [])
        .filter((review) => review.disposition === 'critical_exception')
        .flatMap((review) => review.authorityEvidence ?? []),
    );
    if (criticalEvidenceIds.size === 0) data.authorityEvidence.records = [];
    const reportText = `${JSON.stringify(data.report, null, 2)}\n`;
    data.authorityEvidence.candidate.variant = evidenceVariant;
    data.authorityEvidence.candidate.architecture = evidenceArch;
    if (data.authorityEvidence.candidate.reportSha256 === '0'.repeat(64)) {
      data.authorityEvidence.candidate.reportSha256 = createHash('sha256').update(reportText).digest('hex');
    }
    writeFileSync(join(root, 'report.json'), reportText);
    for (const name of ['ledger', 'vex', 'authorityEvidence']) {
      writeFileSync(join(root, `${name}.json`), `${JSON.stringify(data[name], null, 2)}\n`);
    }
    const output = join(root, 'output');
    const result = spawnSync(
      process.execPath,
      [
        evaluator,
        '--report',
        join(root, 'report.json'),
        '--ledger',
        join(root, 'ledger.json'),
        '--authority-evidence',
        join(root, 'authorityEvidence.json'),
        '--vex',
        join(root, 'vex.json'),
        '--output-dir',
        output,
        '--variant',
        variant,
        '--arch',
        arch,
        '--image-digest',
        imageDigest,
        '--sbom-sha256',
        sbomSha256,
        '--as-of',
        asOf,
      ],
      { encoding: 'utf8' },
    );
    return {
      ...result,
      policy: result.status === 0 ? JSON.parse(readFileSync(join(output, 'policy.json'), 'utf8')) : null,
      criticalFindings: result.status === 0 ? JSON.parse(readFileSync(join(output, 'critical-findings.json'), 'utf8')) : null,
      openvex: result.status === 0 ? JSON.parse(readFileSync(join(output, 'openvex.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function configureArchitectureAllReview(data, {
  reportPurl = 'pkg:deb/debian/example-package@1.0.0?arch=all&distro=debian-12.15&upstream=example-source',
  vexPurl = 'pkg:deb/debian/example-package@1.0.0?arch=all',
} = {}) {
  data.report.distro.version = '12.15';
  data.report.matches[0].artifact.purl = reportPurl;
  const review = data.ledger.reviews[0];
  review.disposition = 'not_affected';
  review.effectiveSeverity = 'None';
  review.vexStatement = 'urn:test:vex:example-architecture-all';
  review.variants = ['slim'];
  review.architectures = ['amd64'];
  review.component.packageArchitectures = ['all'];
  data.vex.statements.push({
    '@id': review.vexStatement,
    vulnerability: { name: 'CVE-2099-0001' },
    products: [
      {
        '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=slim',
        subcomponents: [{ identifiers: { purl: vexPurl } }],
      },
      {
        '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=slim',
        subcomponents: [{ identifiers: { purl: vexPurl } }],
      },
    ],
    status: 'not_affected',
    justification: 'vulnerable_code_not_in_execute_path',
    impact_statement: 'Fixture package is architecture-all.',
  });
}

function sampleLocation(pattern) {
  if (pattern === '^/(usr/share/doc|var/lib/dpkg)/') return '/usr/share/doc/test/copyright';
  const location = pattern
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\\([\\.^$|?*+()[\]{}])/g, '$1');
  assert.match(location, new RegExp(pattern));
  return location;
}

function syntheticHighMatch(review) {
  return {
    vulnerability: {
      id: review.vulnerabilities[0],
      severity: 'High',
      fix: { versions: [] },
    },
    artifact: {
      name: review.component.names[0],
      version: review.component.versions[0],
      type: review.component.types[0],
      locations: [{ path: sampleLocation(review.component.locationPatterns[0]) }],
    },
  };
}

test('accepts one exact, current, authoritative review', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawCriticalCount, 1);
  assert.equal(result.policy.effectiveCriticalCount, 0);
});

for (const [name, mutate, expected] of [
  ['missing review', ({ ledger }) => ledger.reviews.splice(0), 'matched 0 reviews'],
  ['missing exact name selector', ({ ledger }) => delete ledger.reviews[0].component.names, 'component.names'],
  [
    'wildcard name selector',
    ({ ledger }) => {
      delete ledger.reviews[0].component.names;
      ledger.reviews[0].component.namePatterns = ['^example-.*$'];
    },
    'unexpected fields',
  ],
  ['missing exact location selector', ({ ledger }) => delete ledger.reviews[0].component.locationPatterns, 'component.locationPatterns'],
  ['unanchored location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['.*']), 'broad component location pattern'],
  ['root wildcard location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/.*$']), 'broad component location pattern'],
  ['root-only location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/']), 'broad component location pattern'],
  ['nested star wildcard location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/usr/bin/.*$']), 'broad component location pattern'],
  ['nested plus wildcard location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/usr/lib/.+$']), 'broad component location pattern'],
  ['wildcard location alternative', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/(usr/bin|.*)$']), 'broad component location pattern'],
  ['location alternation bypass', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/usr/share/doc/|/']), 'broad component location pattern'],
  [
    'expired review',
    ({ ledger }) => {
      ledger.reviews[0].reviewedAt = '2026-06-15';
      ledger.reviews[0].expiresAt = '2026-07-14';
    },
    'review expired',
  ],
  ['impossible review date', ({ ledger }) => (ledger.reviews[0].reviewedAt = '2026-02-30'), 'reviewedAt is invalid'],
  ['future review date', ({ ledger }) => (ledger.reviews[0].reviewedAt = '2026-07-16'), 'reviewed after as-of'],
  ['expiration before review', ({ ledger }) => (ledger.reviews[0].expiresAt = '2026-07-14'), 'expires before it was reviewed'],
  ['version mismatch', ({ ledger }) => (ledger.reviews[0].component.versions = ['2.0.0']), 'matched 0 reviews'],
  ['path mismatch', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/opt/']), 'matched 0 reviews'],
  [
    'unsupported authority',
    ({ ledger }) => (ledger.reviews[0].authority.url = 'https://example.com/CVE-2099-0001'),
    'unsupported authority URL',
  ],
  ['effective Critical', ({ ledger }) => (ledger.reviews[0].effectiveSeverity = 'Critical'), 'cannot be dispositioned'],
  ['fixed disposition with non-None severity', ({ ledger }) => (ledger.reviews[0].disposition = 'fixed'), 'fixed requires effective severity None'],
  [
    'not-affected disposition with non-None severity',
    ({ ledger }) => {
      ledger.reviews[0].disposition = 'not_affected';
      ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    },
    'not_affected requires effective severity None',
  ],
  ['accepted Critical risk', ({ ledger }) => (ledger.reviews[0].disposition = 'accepted_risk'), 'accepted risk is prohibited'],
  [
    'unapproved High exception',
    ({ ledger }) => {
      ledger.reviews[0].disposition = 'high_exception';
      ledger.reviews[0].effectiveSeverity = 'High';
      ledger.reviews[0].approvedBy = 'SomeoneElse';
    },
    'require CoderLuii approval',
  ],
  [
    'overlong High exception',
    ({ ledger }) => {
      ledger.reviews[0].disposition = 'high_exception';
      ledger.reviews[0].effectiveSeverity = 'High';
      ledger.reviews[0].approvedBy = 'CoderLuii';
      ledger.reviews[0].expiresAt = '2026-08-15';
    },
    'exceeds 30 days',
  ],
]) {
  test(`rejects ${name}`, () => {
    const result = runFixture(mutate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(expected));
  });
}

test('rejects a High exception for a raw Critical finding', () => {
  const result = runFixture(({ ledger }) => {
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /high_exception only applies to raw High findings/);
});

function configureOfficialVendorHigh(review) {
  review.disposition = 'vendor_severity';
  review.effectiveSeverity = 'High';
  review.authority = {
    name: 'Chrome Releases',
    url: 'https://chromereleases.googleblog.com/2026/08/stable-channel-update-for-desktop_0256176589.html',
  };
  review.variants = ['slim'];
  review.architectures = ['arm64'];
}

test('maps a raw Critical finding to official vendor High with exact selectors', () => {
  const result = runFixture(
    ({ ledger }) => configureOfficialVendorHigh(ledger.reviews[0]),
    { variant: 'slim', arch: 'arm64' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.criticalFindings[0].policy.disposition, 'vendor_severity');
  assert.equal(result.criticalFindings[0].policy.effectiveSeverity, 'High');
});

test('rejects raw Critical to vendor High without an official vendor severity authority', () => {
  const result = runFixture(({ ledger }) => {
    configureOfficialVendorHigh(ledger.reviews[0]);
    ledger.reviews[0].authority = {
      name: 'Debian Security Tracker',
      url: 'https://security-tracker.debian.org/tracker/CVE-2099-0001',
    };
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /raw Critical vendor severity requires an explicit official vendor High authority/);
});

test('rejects raw Critical to vendor High with a prefix location selector', () => {
  const result = runFixture(({ ledger }) => {
    configureOfficialVendorHigh(ledger.reviews[0]);
    ledger.reviews[0].component.locationPatterns = ['^/usr/bin/'];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /raw Critical vendor severity requires fully anchored literal location selectors/);
});

function configureCriticalException(review) {
  review.disposition = 'critical_exception';
  review.effectiveSeverity = 'Critical';
  review.approvedBy = 'CoderLuii';
  review.reviewedAt = '2026-09-01';
  review.expiresAt = '2026-09-08';
  review.variants = ['slim'];
  review.architectures = ['arm64'];
  review.authorityEvidence = ['example-evidence'];
  review.sourcePackage = 'example-package';
  review.rationale = 'Temporary exception for the exact authority-evidence record.';
}

test('maps and explicitly reports one exact temporary Critical exception', () => {
  const result = runFixture(
    ({ ledger }) => configureCriticalException(ledger.reviews[0]),
    { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.effectiveCriticalCount, 0);
  assert.equal(result.policy.acceptedTemporaryCriticalCount, 1);
  assert.deepEqual(result.policy.acceptedTemporaryCriticalReviews, ['example-review']);
  assert.equal(result.criticalFindings[0].policy.disposition, 'critical_exception');
  assert.equal(result.criticalFindings[0].policy.approvedBy, 'CoderLuii');
  assert.equal(result.criticalFindings[0].policy.expiresAt, '2026-09-08');
  assert.equal(result.openvex.statements.length, 0);
});

for (const [name, mutate, expected] of [
  [
    'unapproved Critical exception',
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      ledger.reviews[0].approvedBy = 'SomeoneElse';
    },
    'Critical exceptions require CoderLuii approval',
  ],
  [
    'overlong Critical exception',
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      ledger.reviews[0].expiresAt = '2026-09-09';
    },
    'Critical exception exceeds 7 days',
  ],
  [
    'global Critical exception without exact target selectors',
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      delete ledger.reviews[0].variants;
    },
    'Critical exceptions require exact variant and architecture selectors',
  ],
  [
    'Critical exception without an exact type selector',
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      delete ledger.reviews[0].component.types;
    },
    'component.types must contain unique non-empty strings',
  ],
  [
    'Critical exception without structured authority evidence',
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.records = [];
    },
    'missing authority evidence example-evidence',
  ],
  [
    'Critical exception backed by a vendor download instead of an official Debian repository',
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.records[0].repository.origin = 'github_release';
    },
    'authority evidence requires an official Debian repository origin',
  ],
  [
    'Critical exception with mismatched authority evidence package version',
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.records[0].repository.packageVersion = '2.0.0';
    },
    'authority evidence package version does not match the exact component tuple',
  ],
  [
    'Critical exception with mismatched authority evidence source package',
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.records[0].sourcePackage = 'another-source';
    },
    'authority evidence source package does not match the exact component tuple',
  ],
  [
    'Critical exception without structured no-fixed-package evidence',
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.records[0].fixedVersion = '1.1.0';
    },
    'authority evidence must record an open advisory with no fixed package version',
  ],
  [
    'Critical exception with future authority evidence',
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.records[0].checkedAt = '2099-01-01';
    },
    'authority evidence checkedAt must equal the review date and not be after as-of',
  ],
  [
    'Critical exception with a prefix location selector',
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      ledger.reviews[0].component.locationPatterns = ['^/usr/bin/'];
    },
    'Critical exceptions require fully anchored literal location selectors',
  ],
  [
    'Critical exception linked to OpenVEX',
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    },
    'Critical exceptions cannot link OpenVEX',
  ],
]) {
  test(`rejects ${name}`, () => {
    const result = runFixture(mutate, { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(expected));
  });
}

test('binds each authority evidence record to its own exact Grype tuple locations', () => {
  const result = runFixture(
    ({ ledger, authorityEvidence }) => {
      const review = ledger.reviews[0];
      configureCriticalException(review);
      review.component.names.push('second-package');
      review.component.locationPatterns.push('^/usr/bin/second-package$');
      review.authorityEvidence.push('second-evidence');
      authorityEvidence.records[0].component.locations.push('/usr/bin/second-package');
      authorityEvidence.records.push({
        ...structuredClone(authorityEvidence.records[0]),
        id: 'second-evidence',
        component: {
          ...structuredClone(authorityEvidence.records[0].component),
          name: 'second-package',
          locations: ['/usr/bin/second-package'],
        },
      });
    },
    { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /authority evidence locations do not match the exact Grype component tuple/);
});

for (const [name, fix] of [
  ['a scanner fix version', { versions: ['1.1.0'], state: 'not-fixed' }],
  ['scanner fixed state', { versions: [], state: 'fixed' }],
]) {
  test(`rejects a Critical exception when ${name} is present`, () => {
    const result = runFixture(
      ({ report, ledger }) => {
        configureCriticalException(ledger.reviews[0]);
        report.matches[0].vulnerability.fix = fix;
      },
      { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /critical_exception is prohibited because a fix is available/);
  });
}

test('binds authority evidence to the exact candidate report hash', () => {
  const result = runFixture(
    ({ ledger, authorityEvidence }) => {
      configureCriticalException(ledger.reviews[0]);
      authorityEvidence.candidate.reportSha256 = 'f'.repeat(64);
    },
    { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /authority evidence report SHA-256 does not match the evaluated report/);
});

test('reports an applicable orphan exception as matching no effective-Critical findings', () => {
  const result = runFixture(
    ({ report, ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      report.matches = [];
    },
    { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched no effective-Critical findings/);
});

test('does not bind a slim arm64 exception manifest to another candidate target', () => {
  const result = runFixture(
    ({ report, ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      report.matches = [];
    },
    {
      variant: 'full',
      arch: 'amd64',
      evidenceVariant: 'slim',
      evidenceArch: 'arm64',
      asOf: '2026-09-01',
    },
  );
  assert.equal(result.status, 0, result.stderr);
});

test('validates only Critical exceptions for the authority evidence target', () => {
  const result = runFixture(
    ({ ledger }) => {
      configureCriticalException(ledger.reviews[0]);
      ledger.reviews.push({
        ...structuredClone(ledger.reviews[0]),
        id: 'full-amd64-exception',
        variants: ['full'],
        architectures: ['amd64'],
        authorityEvidence: ['full-amd64-evidence'],
      });
    },
    { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
  );
  assert.equal(result.status, 0, result.stderr);
});

test('selects target-specific Critical authority evidence in the candidate workflow', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.match(
    workflow,
    /node scripts\/bind-security-authority-report\.mjs[\s\S]+--authority-evidence security\/critical-exception-authority-evidence-\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}\.json[\s\S]+--report "\$\{evidence_dir\}\/grype\.json"[\s\S]+--output "\$\{evidence_dir\}\/critical-exception-authority-evidence\.json"/,
  );
  assert.equal(
    (workflow.match(/--authority-evidence "\$\{evidence_dir\}\/critical-exception-authority-evidence\.json"/g) ?? []).length,
    2,
  );
});

test('commits exact target authority records without predicting runtime report bytes', () => {
  for (const target of ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64']) {
    const [variant, architecture] = target.split('-');
    const evidence = JSON.parse(readFileSync(`security/critical-exception-authority-evidence-${target}.json`, 'utf8'));
    assert.deepEqual(evidence.candidate, { variant, architecture, reportSha256: null });
    assert.ok(evidence.records.every((record) => record.id.startsWith(`${target}-`)));
  }
});

test('binds an authority document to fresh report bytes without changing its authority records', () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-authority-binding-'));
  try {
    const reportText = `${JSON.stringify(fixture().report, null, 2)}\n`;
    const authorityEvidence = fixture().authorityEvidence;
    authorityEvidence.candidate.reportSha256 = null;
    const authorityPath = join(root, 'authority.json');
    const reportPath = join(root, 'grype.json');
    const outputPath = join(root, 'bound-authority.json');
    writeFileSync(authorityPath, `${JSON.stringify(authorityEvidence, null, 2)}\n`);
    writeFileSync(reportPath, reportText);

    const result = spawnSync(process.execPath, [
      authorityBinder,
      '--authority-evidence', authorityPath,
      '--report', reportPath,
      '--output', outputPath,
    ], { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    const bound = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(bound.records, authorityEvidence.records);
    assert.deepEqual(
      { ...bound, candidate: { ...bound.candidate, reportSha256: null } },
      authorityEvidence,
    );
    assert.equal(bound.candidate.reportSha256, createHash('sha256').update(reportText).digest('hex'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const type of ['npm', 'go-module', 'binary']) {
  test(`rejects a Critical exception for ${type} components`, () => {
    const result = runFixture(
      ({ ledger }) => {
        configureCriticalException(ledger.reviews[0]);
        ledger.reviews[0].component.types = [type];
      },
      { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Critical exceptions apply only to official repository packages/);
  });
}

test('maps a raw High finding as temporary Critical when the official authority is Critical', () => {
  const result = runFixture(
    ({ report, ledger }) => {
      report.matches[0].vulnerability.severity = 'High';
      configureCriticalException(ledger.reviews[0]);
    },
    { variant: 'slim', arch: 'arm64', asOf: '2026-09-01' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawHighCount, 1);
  assert.equal(result.policy.mappedHighCount, 1);
  assert.equal(result.policy.acceptedTemporaryCriticalCount, 1);
  assert.deepEqual(result.policy.acceptedTemporaryCriticalReviews, ['example-review']);
});

test('validates the committed advisory ledger and OpenVEX policy together', () => {
  const result = runFixture(
    (data) => {
      data.ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
      data.authorityEvidence = JSON.parse(
        readFileSync('security/critical-exception-authority-evidence-slim-amd64.json', 'utf8'),
      );
      data.authorityEvidence.candidate.reportSha256 = '0'.repeat(64);
      data.vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
      data.report.matches = data.ledger.reviews
        .filter(
          (review) =>
            review.disposition === 'high_exception' &&
            (!review.variants || review.variants.includes('slim')) &&
            (!review.architectures || review.architectures.includes('amd64')),
        )
        .map(syntheticHighMatch);
      data.report.matches.push(...data.authorityEvidence.records.map((record) => ({
        vulnerability: { id: record.vulnerability, severity: 'Critical', fix: { versions: [], state: 'not-fixed' } },
        artifact: {
          name: record.component.name,
          version: record.component.version,
          type: record.component.type,
          locations: record.component.locations.map((path) => ({ path })),
        },
      })));
    },
    {
      variant: 'slim',
      arch: 'amd64',
      evidenceVariant: 'slim',
      evidenceArch: 'amd64',
      asOf: '2026-09-11',
    },
  );
  assert.equal(result.status, 0, result.stderr);
});

test('records the full-image TIFF tool absence as exact not-affected component evidence', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  const reviews = ledger.reviews.filter(
    (review) => review.vulnerabilities.includes('CVE-2026-52490') &&
      review.component.names.some((name) => ['libtiff-dev', 'libtiffxx6'].includes(name)),
  );
  assert.equal(reviews.length, 1);

  const [review] = reviews;
  assert.equal(review.disposition, 'not_affected');
  assert.equal(review.effectiveSeverity, 'None');
  assert.deepEqual(review.component.names, ['libtiff-dev', 'libtiffxx6']);
  assert.deepEqual(review.component.versions, ['4.5.0-6+deb12u4']);
  assert.deepEqual(review.component.types, ['deb']);
  assert.deepEqual(review.variants, ['full']);
  assert.deepEqual(review.architectures, ['amd64', 'arm64']);
  assert.equal(review.authority.url, 'https://security-tracker.debian.org/tracker/CVE-2026-52490');
  assert.equal('approvedBy' in review, false);
  assert.equal('authorityEvidence' in review, false);

  const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
  assert.ok(statement);
  assert.equal(statement.vulnerability.name, 'CVE-2026-52490');
  assert.equal(statement.status, 'not_affected');
  assert.equal(statement.justification, 'vulnerable_code_not_present');
  assert.deepEqual(
    statement.products.map((product) => product['@id']).sort(),
    [
      'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full',
      'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full',
    ],
  );
  const expectedPurls = ['amd64', 'arm64'].flatMap((architecture) =>
    ['libtiff-dev', 'libtiffxx6'].map(
      (name) => `pkg:deb/debian/${name}@4.5.0-6%2Bdeb12u4?arch=${architecture}`,
    ),
  ).sort();
  for (const product of statement.products) {
    assert.deepEqual(
      product.subcomponents.map((component) => component.identifiers.purl).sort(),
      expectedPurls,
    );
  }
});

test('replaces obsolete ARM64 Critical mappings while retaining the approved Chromium authority evidence', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  const evidence = JSON.parse(readFileSync('security/critical-exception-authority-evidence.json', 'utf8'));
  const expectedVulnerabilities = [
    'CVE-2026-52490',
    'CVE-2026-63382',
    'CVE-2026-63385',
  ];
  const exceptions = ledger.reviews.filter((review) =>
    review.disposition === 'critical_exception' &&
    review.architectures?.includes('arm64') &&
    review.vulnerabilities.some((vulnerability) => expectedVulnerabilities.includes(vulnerability)),
  );
  assert.deepEqual(exceptions, []);
  assert.equal(evidence.records.length, 15);
  assert.deepEqual(
    new Set(evidence.records.map((record) => record.vulnerability)),
    new Set(['CVE-2026-87438', 'CVE-2026-87464', 'CVE-2026-87488', 'CVE-2026-87527', 'CVE-2026-87628']),
  );
  assert.deepEqual(evidence.candidate, {
    variant: 'slim',
    architecture: 'arm64',
    reportSha256: null,
  });
  assert.ok(evidence.records.every((record) => record.repository.origin === 'official_debian_repository'));
  assert.ok(evidence.records.every((record) => record.advisoryStatus === 'open' && record.fixedVersion === null));
});

test('documents the temporary Critical exception without weakening the permanent fail-closed policy', () => {
  const policy = readFileSync('security/advisory-review-policy.md', 'utf8');
  assert.match(policy, /unreviewed, fixable, or project-controlled Critical findings block the release/i);
  assert.match(policy, /Critical exceptions require `CoderLuii`/);
  assert.match(policy, /expire within 7 days/);
  assert.match(policy, /exact vulnerability, component, version, type, fully anchored literal location, variant, and architecture/i);
  assert.match(policy, /cannot apply to npm, Go, or source-built components/i);
  assert.match(policy, /OpenVEX is not used for Critical exceptions/i);
  assert.match(policy, /High exceptions require `CoderLuii`, expire within 30 days/);
  assert.match(policy, /curl\.se.*exact.*Low or Medium.*vendor-severity/i);
});

test('a stale full-only review blocks a slim policy evaluation', () => {
  const result = runFixture(
    ({ ledger }) => {
      ledger.reviews[0].variants = ['full'];
      ledger.reviews[0].reviewedAt = '2026-06-15';
      ledger.reviews[0].expiresAt = '2026-07-14';
    },
    { variant: 'slim', arch: 'amd64', asOf: '2026-07-15' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /example-review: review expired on 2026-07-14/);
});

test('drops obsolete review artifacts while retaining the currently approved Chromium tuple', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  const chromiumNames = new Set(['chromium', 'chromium-common', 'chromium-sandbox']);
  const retiredChromiumVersions = new Set([
    '151.0.7922.173-1~deb12u1',
  ]);
  const obsoleteReviews = ledger.reviews.filter((review) =>
    review.component.names.some((name) => chromiumNames.has(name)) &&
    review.component.versions.some((version) => retiredChromiumVersions.has(version)));
  assert.deepEqual(obsoleteReviews, []);

  for (const path of [
    'security/critical-exception-authority-evidence.json',
    'security/critical-exception-authority-evidence-full-amd64.json',
    'security/critical-exception-authority-evidence-full-arm64.json',
    'security/critical-exception-authority-evidence-slim-amd64.json',
    'security/critical-exception-authority-evidence-slim-arm64.json',
  ]) {
    const evidence = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(
      evidence.records.some((record) => retiredChromiumVersions.has(record.component.version)),
      false,
      `${path} must not retain superseded Chromium authority evidence`,
    );
  }

  assert.equal(ledger.reviews.some((review) => review.id === 'gh-fixed-upstream-version'), false);
  assert.equal(ledger.reviews.some((review) => review.id === 'refresh-133'), false);
  for (const id of [
    'urn:holyclaude:vex:chromium-cve-2026-15899-macos-not-affected',
    'urn:holyclaude:vex:chromium-cve-2026-15900-android-not-affected',
    'urn:holyclaude:vex:chromium-cve-2026-16424-android-not-affected',
  ]) {
    assert.equal(vex.statements.some((statement) => statement['@id'] === id), false);
  }

  const netty = ledger.reviews.filter((review) =>
    review.vulnerabilities.includes('GHSA-93wv-jw9v-4972') &&
    review.component.names.includes('netty-codec-http2') &&
    review.component.versions.includes('4.2.9.Final'));
  assert.deepEqual(netty.map((review) => [review.id, review.variants, review.architectures]), [
    ['v160-full-amd64-junie-netty-codec-http2-high-exception', ['full'], ['amd64']],
    ['v160-full-arm64-junie-netty-codec-http2-high-exception', ['full'], ['arm64']],
  ]);
  assert.ok(netty.every((review) => review.disposition === 'high_exception'));
  assert.ok(netty.every((review) => review.approvedBy === 'CoderLuii'));

  const libssh2 = ledger.reviews.filter((review) =>
    review.vulnerabilities.includes('CVE-2026-58050') &&
    review.vulnerabilities.includes('CVE-2026-58051') &&
    review.component.names.includes('libssh2-1') &&
    review.component.versions.includes('1.10.0-3+b1'));
  assert.deepEqual(libssh2, []);

  assert.equal(ledger.reviews.some((review) => review.id === 'v155-redis-high-exception'), false);

  assert.equal(
    ledger.reviews.some((review) => review.id.startsWith('v155-brace-expansion-high-exception-')),
    false,
  );
});

test('maps both downstream FFmpeg fixes across every rebuilt runtime package', () => {
  const packageNames = [
    'ffmpeg',
    'libavcodec59',
    'libavdevice59',
    'libavfilter8',
    'libavformat59',
    'libavutil57',
    'libpostproc56',
    'libswresample4',
    'libswscale6',
  ];
  const vulnerabilities = ['CVE-2026-70628', 'CVE-2026-70632'];
  const result = runFixture(
    ({ report, ledger, vex }) => {
      const committed = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
      ledger.reviews = committed.reviews.filter((review) =>
        vulnerabilities.some((vulnerability) => review.vulnerabilities.includes(vulnerability)) &&
        review.component.versions.includes('7:5.1.9-0+deb12u1+holyclaude2'));
      vex.statements = [];
      report.matches = vulnerabilities.flatMap((vulnerability) =>
        packageNames.map((name) => ({
          vulnerability: { id: vulnerability, severity: 'High', fix: { versions: [] } },
          artifact: {
            name,
            version: '7:5.1.9-0+deb12u1+holyclaude2',
            type: 'deb',
            locations: name === 'ffmpeg'
              ? [
                  { path: '/usr/share/doc/ffmpeg/copyright' },
                  { path: '/var/lib/dpkg/info/ffmpeg.list' },
                  { path: '/var/lib/dpkg/info/ffmpeg.md5sums' },
                  { path: '/var/lib/dpkg/status' },
                ]
              : [
                  { path: `/usr/share/doc/${name}/copyright` },
                  { path: `/var/lib/dpkg/info/${name}:amd64.md5sums` },
                  { path: '/var/lib/dpkg/status' },
                ],
          },
        })));
    },
    { variant: 'full', arch: 'amd64', asOf: '2026-08-12' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawHighCount, 18);
  assert.equal(result.policy.mappedHighCount, 18);
});

test('audits Grype built-in linux-libc-dev indirect kernel suppressions', () => {
  const result = runFixture(({ report }) => addLinuxLibcIgnoredMatch(report));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.ignoredMatchCount, 1);
  assert.equal(result.policy.ignoredCriticalCount, 1);
  assert.equal(result.policy.ignoredMatchesBySeverity.Critical, 1);
});

for (const [name, mutate, expected] of [
  [
    'ignored match without the built-in scanner configuration',
    ({ report }) => {
      addLinuxLibcIgnoredMatch(report);
      report.descriptor.configuration.ignore = [];
    },
    'missing its exact descriptor ignore rule',
  ],
  [
    'ignored match for another package',
    ({ report }) => {
      addLinuxLibcIgnoredMatch(report);
      report.ignoredMatches[0].artifact.name = 'linux-image-amd64';
    },
    'must target linux-libc-dev',
  ],
  [
    'ignored direct kernel match',
    ({ report }) => {
      addLinuxLibcIgnoredMatch(report);
      report.ignoredMatches[0].matchDetails[0].type = 'exact-direct-match';
    },
    'must contain only exact indirect dpkg matches',
  ],
  [
    'ignored match with a changed applied rule',
    ({ report }) => {
      addLinuxLibcIgnoredMatch(report);
      report.ignoredMatches[0].appliedIgnoreRules[0].package['upstream-name'] = 'linux-custom';
    },
    'unsupported applied ignore rule',
  ],
]) {
  test(`rejects ${name}`, () => {
    const result = runFixture(mutate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(expected));
  });
}

for (const [name, mutate, expected] of [
  ['Grype report without matches', ({ report }) => delete report.matches, 'Grype report matches must be an array'],
  ['Grype report without source', ({ report }) => delete report.source, 'Grype report source is incomplete'],
  ['Grype report without descriptor', ({ report }) => delete report.descriptor, 'Grype report descriptor is incomplete'],
  ['unexpected Grype version', ({ report }) => (report.descriptor.version = '0.116.1'), 'expected Grype 0.118.0'],
  ['Grype report without ignored matches', ({ report }) => delete report.ignoredMatches, 'ignoredMatches must be an array'],
  ['Grype report with arbitrary ignored findings', ({ report }) => report.ignoredMatches.push(structuredClone(report.matches[0])), 'Grype ignored matches require'],
  ['noncanonical Grype severity', ({ report }) => (report.matches[0].vulnerability.severity = 'critical'), 'invalid severity'],
  ['non-string Grype severity', ({ report }) => (report.matches[0].vulnerability.severity = 5), 'invalid severity'],
  ['ledger without schema version', ({ ledger }) => delete ledger.schemaVersion, 'advisory ledger schemaVersion must be 1'],
  ['ledger without reviews', ({ ledger }) => delete ledger.reviews, 'advisory ledger reviews must be an array'],
  ['OpenVEX document without id', ({ vex }) => delete vex['@id'], 'OpenVEX id is required'],
  ['OpenVEX document without statements', ({ vex }) => delete vex.statements, 'OpenVEX statements must be an array'],
]) {
  test(`rejects ${name}`, () => {
    const result = runFixture(mutate);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(expected.replace(/[.]/g, '\\$&')));
  });
}

test('requires every finding location to match the component location selector', () => {
  const result = runFixture(({ report }) => {
    report.matches[0].artifact.locations.push({ path: '/opt/unapproved-copy' });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 reviews/);
});

test('rejects findings without a location', () => {
  const result = runFixture(({ report }) => {
    report.matches[0].artifact.locations = [];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 reviews/);
});

test('rejects a not-affected review without exact OpenVEX product scope', () => {
  const result = runFixture(({ ledger, vex }) => {
    ledger.reviews[0].disposition = 'not_affected';
    ledger.reviews[0].effectiveSeverity = 'None';
    ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    ledger.reviews[0].variants = ['full'];
    vex.statements.push({
      '@id': 'urn:test:vex:example',
      vulnerability: { name: 'CVE-2099-0001' },
      products: [{
        '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.0?variant=slim',
        subcomponents: [
          { identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=amd64' } },
          { identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=arm64' } },
        ],
      }],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing exact full product/);
});

test('accepts exact curl advisory authority only for scoped Low and Medium vendor severity reviews', () => {
  for (const [vulnerability, severity] of [
    ['CVE-2026-18924', 'Low'],
    ['CVE-2026-19931', 'Medium'],
  ]) {
    const result = runFixture(
      ({ report, ledger }) => {
        report.matches[0].vulnerability.id = vulnerability;
        const review = ledger.reviews[0];
        review.id = `curl-${vulnerability.toLowerCase()}`;
        review.vulnerabilities = [vulnerability];
        review.component.names = ['curl'];
        review.component.versions = ['7.88.1-10+deb12u15'];
        review.component.locationPatterns = ['^/usr/share/doc/curl/copyright$'];
        review.disposition = 'vendor_severity';
        review.effectiveSeverity = severity;
        review.owner = 'Debian Bookworm curl';
        review.authority = {
          name: 'curl Security Advisory',
          url: `https://curl.se/docs/${vulnerability}.html`,
        };
        review.variants = ['slim'];
        review.architectures = ['amd64'];
        report.matches[0].artifact = {
          name: 'curl',
          version: '7.88.1-10+deb12u15',
          type: 'deb',
          locations: [{ path: '/usr/share/doc/curl/copyright' }],
        };
      },
      { variant: 'slim', arch: 'amd64' },
    );
    assert.equal(result.status, 0, result.stderr);
  }
});

for (const [label, mutate, message] of [
  [
    'mismatched advisory CVE',
    (review) => (review.authority.url = 'https://curl.se/docs/CVE-2026-19931.html'),
    /exact matching curl advisory URL/,
  ],
  [
    'non-advisory path',
    (review) => (review.authority.url = 'https://curl.se/security.html'),
    /exact matching curl advisory URL/,
  ],
  [
    'effective High',
    (review) => (review.effectiveSeverity = 'High'),
    /curl authority permits only Low or Medium vendor severity/,
  ],
  [
    'non-curl component',
    (review) => (review.component.names = ['openssl']),
    /curl authority permits only curl-family Debian packages/,
  ],
  [
    'multiple targets',
    (review) => (review.architectures = ['amd64', 'arm64']),
    /curl authority requires one exact variant and architecture/,
  ],
]) {
  test(`rejects curl authority with ${label}`, () => {
    const result = runFixture(({ report, ledger }) => {
      const review = ledger.reviews[0];
      review.vulnerabilities = ['CVE-2026-18924'];
      review.component.names = ['curl'];
      review.component.versions = ['7.88.1-10+deb12u15'];
      review.component.locationPatterns = ['^/usr/share/doc/curl/copyright$'];
      review.disposition = 'vendor_severity';
      review.effectiveSeverity = 'Low';
      review.authority = {
        name: 'curl Security Advisory',
        url: 'https://curl.se/docs/CVE-2026-18924.html',
      };
      review.variants = ['slim'];
      review.architectures = ['amd64'];
      report.matches[0].vulnerability.id = 'CVE-2026-18924';
      report.matches[0].artifact = {
        name: 'curl',
        version: '7.88.1-10+deb12u15',
        type: 'deb',
        locations: [{ path: '/usr/share/doc/curl/copyright' }],
      };
      mutate(review);
    }, { variant: 'slim', arch: 'amd64' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  });
}

test('rejects OpenVEX product IDs bound to a different release version', () => {
  const result = runFixture(({ ledger, vex }) => {
    ledger.reviews[0].disposition = 'not_affected';
    ledger.reviews[0].effectiveSeverity = 'None';
    ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    ledger.reviews[0].variants = ['full'];
    const subcomponents = [
      { identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=amd64' } },
      { identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=arm64' } },
    ];
    vex.statements.push({
      '@id': 'urn:test:vex:example',
      vulnerability: { name: 'CVE-2099-0001' },
      products: [
        {
          '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.9?variant=full',
          subcomponents,
        },
        {
          '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.5.9?variant=full',
          subcomponents,
        },
      ],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing exact full product/);
});

test('rejects a not-affected review without the Docker Hub product scope', () => {
  const result = runFixture(({ ledger, vex }) => {
    ledger.reviews[0].disposition = 'not_affected';
    ledger.reviews[0].effectiveSeverity = 'None';
    ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    ledger.reviews[0].variants = ['full'];
    vex.statements.push({
      '@id': 'urn:test:vex:example',
      vulnerability: { name: 'CVE-2099-0001' },
      products: [{
        '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full',
        subcomponents: [
          { identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=amd64' } },
          { identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=arm64' } },
        ],
      }],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing exact full Docker Hub product/);
});

test('maps one approved High exception to one exact High finding', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawHighCount, 1);
  assert.equal(result.policy.mappedHighCount, 1);
});

test('rejects statement-level vulnerability aliases', () => {
  const result = runFixture(({ ledger, vex }) => {
    ledger.reviews[0].disposition = 'not_affected';
    ledger.reviews[0].effectiveSeverity = 'None';
    ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    vex.statements.push({
      '@id': 'urn:test:vex:example',
      vulnerability: { name: 'CVE-2099-0001' },
      aliases: ['CVE-2099-0002'],
      products: [
        { '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full' },
        { '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full' },
      ],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected fields: aliases/);
});

test('rejects a not-affected product without exact component subcomponents', () => {
  const result = runFixture(({ ledger, vex }) => {
    ledger.reviews[0].disposition = 'not_affected';
    ledger.reviews[0].effectiveSeverity = 'None';
    ledger.reviews[0].vexStatement = 'urn:test:vex:example';
    vex.statements.push({
      '@id': 'urn:test:vex:example',
      vulnerability: { name: 'CVE-2099-0001' },
      products: [
        { '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full' },
        { '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full' },
      ],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing exact component subcomponent/);
});

test('emits digest-bound OpenVEX with the exact component subcomponent', () => {
  const imageDigest = `sha256:${'c'.repeat(64)}`;
  const sbomSha256 = 'd'.repeat(64);
  const componentPurl = 'pkg:deb/debian/example-package@1.0.0?arch=amd64';
  const result = runFixture(
    ({ ledger, vex }) => {
      ledger.reviews[0].disposition = 'not_affected';
      ledger.reviews[0].effectiveSeverity = 'None';
      ledger.reviews[0].vexStatement = 'urn:test:vex:example';
      ledger.reviews[0].variants = ['full'];
      ledger.reviews[0].architectures = ['amd64'];
      vex.statements.push({
        '@id': 'urn:test:vex:example',
        vulnerability: { name: 'CVE-2099-0001' },
        products: [
          {
            '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full',
            subcomponents: [{ identifiers: { purl: componentPurl } }],
          },
          {
            '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full',
            subcomponents: [{ identifiers: { purl: componentPurl } }],
          },
        ],
        status: 'not_affected',
        justification: 'vulnerable_code_not_present',
        impact_statement: 'Fixture impact.',
      });
    },
    { imageDigest, sbomSha256 },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.imageDigest, imageDigest);
  assert.equal(result.policy.sbomSha256, sbomSha256);
  assert.equal(result.openvex.statements.length, 1);
  for (const product of result.openvex.statements[0].products) {
    assert.equal(product.hashes['sha-256'], imageDigest.slice('sha256:'.length));
    assert.deepEqual(product.subcomponents, [{ identifiers: { purl: componentPurl } }]);
  }
});

test('correlates a Debian architecture-all report PURL with a normalized OpenVEX subcomponent', () => {
  const result = runFixture(
    (data) => configureArchitectureAllReview(data),
    { variant: 'slim', arch: 'amd64' },
  );
  assert.equal(result.status, 0, result.stderr);
  for (const product of result.openvex.statements[0].products) {
    assert.deepEqual(product.subcomponents, [{
      identifiers: { purl: 'pkg:deb/debian/example-package@1.0.0?arch=all' },
    }]);
  }
});

for (const [label, reportPurl, error] of [
  ['missing', undefined, /requires an exact Debian artifact purl/],
  ['wrong architecture', 'pkg:deb/debian/example-package@1.0.0?arch=amd64&distro=debian-12.15&upstream=example-source', /matched 0 reviews/],
  ['wrong name', 'pkg:deb/debian/other-package@1.0.0?arch=all&distro=debian-12.15&upstream=example-source', /does not match artifact name and version/],
  ['wrong version', 'pkg:deb/debian/example-package@2.0.0?arch=all&distro=debian-12.15&upstream=example-source', /does not match artifact name and version/],
  ['duplicate architecture', 'pkg:deb/debian/example-package@1.0.0?arch=all&arch=amd64&distro=debian-12.15&upstream=example-source', /exactly one arch qualifier/],
  ['wrong distro', 'pkg:deb/debian/example-package@1.0.0?arch=all&distro=debian-13&upstream=example-source', /distro qualifier/],
  ['unexpected qualifier', 'pkg:deb/debian/example-package@1.0.0?arch=all&distro=debian-12.15&upstream=example-source&repository_url=https%3A%2F%2Fexample.invalid', /unsupported Debian artifact purl qualifier/],
]) {
  test(`rejects an architecture-all review with ${label} report PURL evidence`, () => {
    const result = runFixture(
      (data) => {
        configureArchitectureAllReview(data);
        if (reportPurl === undefined) delete data.report.matches[0].artifact.purl;
        else data.report.matches[0].artifact.purl = reportPurl;
      },
      { variant: 'slim', arch: 'amd64' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, error);
  });
}

test('rejects an architecture-all review whose OpenVEX PURL uses the platform architecture', () => {
  const result = runFixture(
    (data) => configureArchitectureAllReview(data, {
      vexPurl: 'pkg:deb/debian/example-package@1.0.0?arch=amd64',
    }),
    { variant: 'slim', arch: 'amd64' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing exact component subcomponent/);
});

for (const [field, values] of [
  ['variants', ['full', 'slim']],
  ['architectures', ['amd64', 'arm64']],
]) {
  test(`requires one exact ${field} selector with packageArchitectures`, () => {
    const result = runFixture(
      (data) => {
        configureArchitectureAllReview(data);
        data.ledger.reviews[0][field] = values;
      },
      { variant: 'slim', arch: 'amd64' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /packageArchitectures requires one exact package architecture, variant, and target architecture/);
  });
}

for (const [label, mutate, error] of [
  ['an empty selector', (review) => { review.component.packageArchitectures = []; }, /must contain unique non-empty strings/],
  ['a duplicate selector', (review) => { review.component.packageArchitectures = ['all', 'all']; }, /must contain unique non-empty strings/],
  ['multiple selectors', (review) => { review.component.packageArchitectures = ['all', 'amd64']; }, /requires one exact package architecture, variant, and target architecture/],
  ['an unsupported selector', (review) => { review.component.packageArchitectures = ['x86_64']; }, /invalid packageArchitectures selector/],
  ['a non-Debian component', (review) => { review.component.types = ['npm']; }, /invalid packageArchitectures selector/],
]) {
  test(`rejects packageArchitectures with ${label}`, () => {
    const result = runFixture(
      (data) => {
        configureArchitectureAllReview(data);
        mutate(data.ledger.reviews[0]);
      },
      { variant: 'slim', arch: 'amd64' },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, error);
  });
}

for (const [variant, arch] of [['full', 'amd64'], ['slim', 'arm64']]) {
  test(`does not apply an architecture-all review to ${variant}/${arch}`, () => {
    const result = runFixture(
      (data) => configureArchitectureAllReview(data),
      { variant, arch },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /matched 0 reviews/);
  });
}

test('rejects malformed digest binding inputs', () => {
  const badImage = runFixture(() => {}, { imageDigest: 'sha256:not-a-digest' });
  assert.notEqual(badImage.status, 0);
  assert.match(badImage.stderr, /image-digest/);

  const badSbom = runFixture(() => {}, { sbomSha256: 'not-a-digest' });
  assert.notEqual(badSbom.status, 0);
  assert.match(badSbom.stderr, /sbom-sha256/);
});

test('rejects an unmapped raw High finding', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews = [];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 reviews for raw High finding/);
});

test('maps an exact vendor disposition to one raw High finding', () => {
  const result = runFixture(({ report }) => {
    report.matches[0].vulnerability.severity = 'High';
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawHighCount, 1);
  assert.equal(result.policy.mappedHighCount, 1);
});

test('rejects effective High under a vendor severity review without explicit official vendor authority', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews[0].effectiveSeverity = 'High';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /raw Critical vendor severity requires an explicit official vendor High authority/);
});

test('rejects an approved High exception that matches no High finding', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
    ledger.reviews[0].component.versions = ['2.0.0'];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched no High findings/);
});

test('rejects duplicate High exceptions for the same finding', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
    ledger.reviews.push({ ...structuredClone(ledger.reviews[0]), id: 'duplicate-high-review' });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 2 reviews for raw High finding/);
});

test('does not require a full-only High exception in a slim report', () => {
  const result = runFixture(
    ({ report, ledger }) => {
      report.matches = [];
      ledger.reviews[0].disposition = 'high_exception';
      ledger.reviews[0].effectiveSeverity = 'High';
      ledger.reviews[0].approvedBy = 'CoderLuii';
      ledger.reviews[0].variants = ['full'];
      ledger.reviews[0].architectures = ['amd64', 'arm64'];
    },
    { variant: 'slim', arch: 'amd64' },
  );
  assert.equal(result.status, 0, result.stderr);
});

test('requires an applicable full-only High exception to match at least one finding', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches = [];
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
    ledger.reviews[0].variants = ['full'];
    ledger.reviews[0].architectures = ['amd64', 'arm64'];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched no High findings/);
});

test('allows one exact High exception to cover multiple exact findings', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    report.matches.push(structuredClone(report.matches[0]));
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawHighCount, 2);
  assert.equal(result.policy.mappedHighCount, 2);
});

test('rejects duplicate review ids and duplicate selector values', () => {
  const duplicateId = runFixture(({ ledger }) => {
    ledger.reviews.push(structuredClone(ledger.reviews[0]));
  });
  assert.notEqual(duplicateId.status, 0);
  assert.match(duplicateId.stderr, /review ids must be unique/);

  const duplicateSelector = runFixture(({ ledger }) => {
    ledger.reviews[0].component.names.push('example-package');
  });
  assert.notEqual(duplicateSelector.status, 0);
  assert.match(duplicateSelector.stderr, /unique non-empty strings/);
});

test('rejects unexpected review fields and orphan OpenVEX statements', () => {
  const unexpected = runFixture(({ ledger }) => {
    ledger.reviews[0].note = 'not part of the schema';
  });
  assert.notEqual(unexpected.status, 0);
  assert.match(unexpected.stderr, /unexpected fields/);

  const orphan = runFixture(({ vex }) => {
    vex.statements.push({
      '@id': 'urn:test:orphan',
      vulnerability: { '@id': 'https://nvd.nist.gov/vuln/detail/CVE-2099-0002', name: 'CVE-2099-0002' },
      products: [
        {
          '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full',
          subcomponents: [{ identifiers: { purl: 'pkg:deb/debian/orphan@1.0.0?arch=amd64' } }],
        },
        {
          '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full',
          subcomponents: [{ identifiers: { purl: 'pkg:deb/debian/orphan@1.0.0?arch=amd64' } }],
        },
      ],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(orphan.status, 0);
  assert.match(orphan.stderr, /orphan OpenVEX statement/);
});

test('does not apply an architecture-scoped review to another architecture', () => {
  const result = runFixture(
    ({ ledger }) => {
      ledger.reviews[0].architectures = ['arm64'];
    },
    { arch: 'amd64' },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 reviews/);
});

for (const [selector, value] of [
  ['variants', ['full', 'full']],
  ['architectures', ['x86_64']],
]) {
  test(`rejects invalid ${selector} selectors`, () => {
    const result = runFixture(({ ledger }) => {
      ledger.reviews[0][selector] = value;
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`${selector} selector`));
  });
}
