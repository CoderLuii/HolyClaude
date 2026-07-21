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
      descriptor: { name: 'grype', version: '0.116.0', configuration: {} },
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
          effectiveSeverity: 'High',
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

function runFixture(mutate = () => {}, { variant = 'full', arch = 'amd64', asOf = '2026-07-15' } = {}) {
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
        '--as-of',
        asOf,
      ],
      { encoding: 'utf8' },
    );
    return {
      ...result,
      policy: result.status === 0 ? JSON.parse(readFileSync(join(output, 'policy.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('accepts one exact, current, authoritative review', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.policy.rawCriticalCount, 1);
  assert.equal(result.policy.effectiveCriticalCount, 0);
});

for (const [name, mutate, expected] of [
  ['missing review', ({ ledger }) => ledger.reviews.splice(0), 'matched 0 reviews'],
  ['missing exact name selector', ({ ledger }) => delete ledger.reviews[0].component.names, 'exact names selector'],
  [
    'wildcard name selector',
    ({ ledger }) => {
      delete ledger.reviews[0].component.names;
      ledger.reviews[0].component.namePatterns = ['^example-.*$'];
    },
    'exact names selector',
  ],
  ['missing exact location selector', ({ ledger }) => delete ledger.reviews[0].component.locationPatterns, 'locationPatterns selector'],
  ['unanchored location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['.*']), 'broad component location pattern'],
  ['root wildcard location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/.*$']), 'broad component location pattern'],
  ['nested star wildcard location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/usr/bin/.*$']), 'broad component location pattern'],
  ['nested plus wildcard location selector', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/usr/lib/.+$']), 'broad component location pattern'],
  ['wildcard location alternative', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/(usr/bin|.*)$']), 'broad component location pattern'],
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
      ledger.reviews[0].approvedBy = 'SomeoneElse';
    },
    'require CoderLuii approval',
  ],
  [
    'overlong High exception',
    ({ ledger }) => {
      ledger.reviews[0].disposition = 'high_exception';
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
      data.report.matches = [];
      data.ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
      data.vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
    },
    { variant: 'slim', arch: 'amd64', asOf: '2026-07-21' },
  );
  assert.equal(result.status, 0, result.stderr);
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
  ['unexpected Grype version', ({ report }) => (report.descriptor.version = '0.115.0'), 'expected Grype 0.116.0'],
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
    vex.statements.push({
      '@id': 'urn:test:vex:example',
      vulnerability: { name: 'CVE-2099-0001' },
      products: [{ '@id': 'pkg:oci/ghcr.io/coderluii/holyclaude@1.5.0?variant=slim' }],
      status: 'not_affected',
      justification: 'vulnerable_code_not_present',
      impact_statement: 'Fixture impact.',
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing exact full product/);
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

test('rejects an approved High exception that matches no High finding', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches[0].vulnerability.severity = 'High';
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
    ledger.reviews[0].component.versions = ['2.0.0'];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 High findings/);
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
  assert.match(result.stderr, /matched 2 High exceptions/);
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

test('requires an applicable full-only High exception to match exactly once', () => {
  const result = runFixture(({ report, ledger }) => {
    report.matches = [];
    ledger.reviews[0].disposition = 'high_exception';
    ledger.reviews[0].effectiveSeverity = 'High';
    ledger.reviews[0].approvedBy = 'CoderLuii';
    ledger.reviews[0].variants = ['full'];
    ledger.reviews[0].architectures = ['amd64', 'arm64'];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 High findings/);
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
