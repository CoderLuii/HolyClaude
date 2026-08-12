import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const evaluator = resolve('scripts/evaluate-security-report.mjs');

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
      descriptor: { name: 'grype', version: '0.116.1', configuration: {} },
      ignoredMatches: [],
      matches: [
        {
          vulnerability: { id: 'CVE-2099-0001', severity: 'Critical', fix: { versions: ['1.1.0'] } },
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
  } = {},
) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-security-policy-'));
  try {
    const data = fixture();
    mutate(data);
    for (const name of ['report', 'ledger', 'vex']) {
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
      openvex: result.status === 0 ? JSON.parse(readFileSync(join(output, 'openvex.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

test('validates the committed advisory ledger and OpenVEX policy together', () => {
  const result = runFixture(
    (data) => {
      data.ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
      data.vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
      data.report.matches = data.ledger.reviews
        .filter(
          (review) =>
            review.disposition === 'high_exception' &&
            (!review.variants || review.variants.includes('slim')) &&
            (!review.architectures || review.architectures.includes('amd64')),
        )
        .map(syntheticHighMatch);
    },
    { variant: 'slim', arch: 'amd64', asOf: '2026-08-12' },
  );
  assert.equal(result.status, 0, result.stderr);
});

test('tracks the refreshed v1.5.7 scanner findings with exact current reviews', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  const chromiumIds = [
    'CVE-2026-17652',
    'CVE-2026-17768',
    'CVE-2026-17784',
    'CVE-2026-17801',
    'CVE-2026-17803',
    'CVE-2026-17804',
    'CVE-2026-17811',
    'CVE-2026-17832',
    'CVE-2026-17834',
    'CVE-2026-17837',
    'CVE-2026-17847',
    'CVE-2026-17848',
    'CVE-2026-17855',
    'CVE-2026-17856',
    'CVE-2026-17865',
    'CVE-2026-17869',
  ];

  for (const vulnerability of chromiumIds) {
    const reviews = ledger.reviews.filter((review) =>
      review.vulnerabilities.includes(vulnerability) &&
      review.component.names.includes('chromium') &&
      review.component.versions.includes('151.0.7922.108-1~deb12u1'));
    assert.equal(reviews.length, 1, `${vulnerability} must have one exact Chromium review`);
    assert.equal(reviews[0].disposition, 'fixed');
    assert.equal(reviews[0].effectiveSeverity, 'None');
    assert.equal(reviews[0].authority.name, 'Debian Security Tracker');
  }

  const netty = ledger.reviews.filter((review) =>
    review.vulnerabilities.includes('GHSA-93wv-jw9v-4972') &&
    review.component.names.includes('netty-codec-http2') &&
    review.component.versions.includes('4.2.9.Final'));
  assert.equal(netty.length, 1);
  assert.equal(netty[0].disposition, 'high_exception');
  assert.equal(netty[0].approvedBy, 'CoderLuii');

  const libssh2 = ledger.reviews.filter((review) =>
    review.vulnerabilities.includes('CVE-2026-58050') &&
    review.vulnerabilities.includes('CVE-2026-58051') &&
    review.component.names.includes('libssh2-1') &&
    review.component.versions.includes('1.10.0-3+b1'));
  assert.equal(libssh2.length, 1);
  assert.equal(libssh2[0].disposition, 'high_exception');
  assert.equal(libssh2[0].approvedBy, 'CoderLuii');

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
        review.component.versions.includes('7:5.1.9-0+deb12u1+holyclaude1'));
      vex.statements = [];
      report.matches = vulnerabilities.flatMap((vulnerability) =>
        packageNames.map((name) => ({
          vulnerability: { id: vulnerability, severity: 'High', fix: { versions: [] } },
          artifact: {
            name,
            version: '7:5.1.9-0+deb12u1+holyclaude1',
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

test('maps the rebuilt cryptography wheel across every installed metadata location', () => {
  const reviewIds = [
    'v157-azure-cryptography-x509-downstream-backport',
    'v157-azure-cryptography-pkcs7-downstream-backport',
    'v155-cryptography-high-exception-7c76579622',
  ];
  const vulnerabilities = [
    'GHSA-jwv3-5hgf-82ww',
    'GHSA-g6cj-pr64-35w5',
    'GHSA-537c-gmf6-5ccf',
  ];
  const locations = [
    '/opt/az/lib/python3.14/site-packages/cryptography-46.0.7+holyclaude.1.dist-info/METADATA',
    '/opt/az/lib/python3.14/site-packages/cryptography-46.0.7+holyclaude.1.dist-info/RECORD',
    '/opt/az/lib/python3.14/site-packages/cryptography-46.0.7+holyclaude.1.dist-info/direct_url.json',
  ];
  const result = runFixture(
    ({ report, ledger, vex }) => {
      const committed = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
      ledger.reviews = committed.reviews.filter((review) => reviewIds.includes(review.id));
      assert.deepEqual(ledger.reviews.map((review) => review.id), reviewIds);
      vex.statements = [];
      report.matches = vulnerabilities.map((vulnerability) => ({
        vulnerability: { id: vulnerability, severity: 'High', fix: { versions: [] } },
        artifact: {
          name: 'cryptography',
          version: '46.0.7+holyclaude.1',
          type: 'python',
          locations: locations.map((path) => ({ path })),
        },
      }));
    },
    { variant: 'full', arch: 'arm64', asOf: '2026-08-12' },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawHighCount, 3);
  assert.equal(result.policy.mappedHighCount, 3);
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
  ['unexpected Grype version', ({ report }) => (report.descriptor.version = '0.115.0'), 'expected Grype 0.116.1'],
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
        '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.7?variant=full',
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
        { '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.7?variant=full' },
        { '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.5.7?variant=full' },
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
        { '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.7?variant=full' },
        { '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.5.7?variant=full' },
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
            '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.7?variant=full',
            subcomponents: [{ identifiers: { purl: componentPurl } }],
          },
          {
            '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.5.7?variant=full',
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

test('rejects effective High under a vendor severity review', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews[0].effectiveSeverity = 'High';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /effective High findings require high_exception/);
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
          '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.7?variant=full',
          subcomponents: [{ identifiers: { purl: 'pkg:deb/debian/orphan@1.0.0?arch=amd64' } }],
        },
        {
          '@id': 'pkg:oci/docker.io/coderluii/holyclaude@1.5.7?variant=full',
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
