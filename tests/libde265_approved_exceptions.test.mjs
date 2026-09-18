import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const evaluator = resolve('scripts/evaluate-security-report.mjs');
const vulnerabilities = ['CVE-2026-54240', 'CVE-2026-54241'];
const targets = ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64'];

function escapePattern(value) {
  return `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

function expectedNames(variant) {
  return variant === 'full' ? ['libde265-0', 'libde265-dev'] : ['libde265-0'];
}

function expectedPaths(name, architecture) {
  return [
    `/usr/share/doc/${name}/copyright`,
    `/var/lib/dpkg/info/${name}:${architecture}.md5sums`,
    '/var/lib/dpkg/status',
  ];
}

function reviewId(target, name, vulnerability) {
  if (target.startsWith('full-')) {
    return `v161-${target}-${name}-${vulnerability.toLowerCase()}-high-exception`;
  }
  return `v161-${target}-libde265-${vulnerability.toLowerCase()}-high-exception`;
}

function targetReviews(target) {
  const [variant] = target.split('-');
  const ids = new Set(expectedNames(variant).flatMap((name) =>
    vulnerabilities.map((vulnerability) => reviewId(target, name, vulnerability)),
  ));
  return ledger.reviews.filter((review) => ids.has(review.id));
}

function reportFor(target) {
  const [variant, architecture] = target.split('-');
  const matches = [];
  for (const vulnerability of vulnerabilities) {
    for (const name of expectedNames(variant)) {
      const paths = expectedPaths(name, architecture);
      matches.push({
        vulnerability: { id: vulnerability, severity: 'High', fix: { versions: [], state: 'not-fixed' } },
        artifact: {
          name,
          version: '1.0.11-1+deb12u2',
          type: 'deb',
          locations: paths.map((path) => ({ path })),
        },
      });
    }
  }
  return {
    source: { type: 'sbom', target: `libde265-${target}.cdx.json` },
    distro: { name: 'debian', version: '12.15', idLike: ['debian'] },
    descriptor: { name: 'grype', version: '0.119.0', configuration: {} },
    ignoredMatches: [],
    matches,
  };
}

function evaluate({ target = 'full-amd64', report = reportFor(target), reviews = targetReviews(target), asOf = '2026-09-25' } = {}) {
  const [variant, architecture] = target.split('-');
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-libde265-'));
  try {
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    const files = {
      report,
      ledger: { schemaVersion: ledger.schemaVersion, policy: ledger.policy, reviews },
      authority: {
        schemaVersion: 1,
        candidate: {
          variant,
          architecture,
          reportSha256: createHash('sha256').update(reportText).digest('hex'),
        },
        records: [],
      },
      vex: {
        '@context': 'https://openvex.dev/ns/v0.2.0',
        '@id': 'urn:test:libde265-approved-exceptions',
        author: 'CoderLuii',
        timestamp: '2026-09-14T00:00:00Z',
        version: 1,
        statements: [],
      },
    };
    writeFileSync(join(root, 'report.json'), reportText);
    for (const [name, value] of Object.entries(files)) {
      if (name !== 'report') writeFileSync(join(root, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
    }
    const output = join(root, 'output');
    const result = spawnSync(process.execPath, [
      evaluator,
      '--report', join(root, 'report.json'),
      '--ledger', join(root, 'ledger.json'),
      '--authority-evidence', join(root, 'authority.json'),
      '--vex', join(root, 'vex.json'),
      '--output-dir', output,
      '--variant', variant,
      '--arch', architecture,
      '--image-digest', `sha256:${'a'.repeat(64)}`,
      '--sbom-sha256', 'b'.repeat(64),
      '--as-of', asOf,
    ], { encoding: 'utf8' });
    return {
      ...result,
      policy: result.status === 0 ? JSON.parse(readFileSync(join(output, 'policy.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('records twelve exact target-package-and-CVE libde265 High exceptions', () => {
  for (const target of targets) {
    const [variant, architecture] = target.split('-');
    const reviews = targetReviews(target);
    assert.equal(reviews.length, expectedNames(variant).length * vulnerabilities.length, `${target} review count`);
    for (const name of expectedNames(variant)) {
      for (const vulnerability of vulnerabilities) {
        const review = reviews.find((candidate) => candidate.id === reviewId(target, name, vulnerability));
        assert.ok(review, `${target} ${name} ${vulnerability}`);
        assert.deepEqual(review.vulnerabilities, [vulnerability]);
        assert.deepEqual(review.component.names, [name]);
        assert.deepEqual(review.component.versions, ['1.0.11-1+deb12u2']);
        assert.deepEqual(review.component.types, ['deb']);
        assert.deepEqual(review.component.locationPatterns, expectedPaths(name, architecture).map(escapePattern));
        assert.equal(review.sourcePackage, 'libde265');
        assert.equal(review.disposition, 'high_exception');
        assert.equal(review.effectiveSeverity, 'High');
        assert.equal(review.owner, 'Debian Bookworm libde265');
        assert.deepEqual(review.authority, {
          name: 'Debian Security Tracker',
          url: `https://security-tracker.debian.org/tracker/${vulnerability}`,
        });
        assert.equal(review.approvedBy, 'CoderLuii');
        assert.equal(review.reviewedAt, '2026-09-18');
        assert.equal(review.expiresAt, '2026-09-25');
        assert.deepEqual(review.variants, [variant]);
        assert.deepEqual(review.architectures, [architecture]);
        assert.match(review.rationale, /out-of-bounds memory access, memory corruption, or a crash/);
        assert.match(review.rationale, /no product exploit has been demonstrated/);
        assert.doesNotMatch(review.rationale, /not reachable|not affected/i);
        assert.equal('vexStatement' in review, false);
      }
    }
  }
});

test('accepts all exact libde265 tuples for every target', () => {
  for (const target of targets) {
    const result = evaluate({ target });
    assert.equal(result.status, 0, `${target}: ${result.stderr}`);
    const expectedCount = target.startsWith('full-') ? 4 : 2;
    assert.equal(result.policy.rawHighCount, expectedCount);
    assert.equal(result.policy.mappedHighCount, expectedCount);
  }
});

test('rejects wrong libde265 version and location', () => {
  const wrongVersion = reportFor('full-amd64');
  wrongVersion.matches[0].artifact.version = '1.0.11-1+deb12u3';
  const versionResult = evaluate({ report: wrongVersion });
  assert.notEqual(versionResult.status, 0);
  assert.match(versionResult.stderr, /matched 0 reviews for raw High finding/);

  const wrongLocation = reportFor('full-amd64');
  wrongLocation.matches[0].artifact.locations[0].path = '/usr/lib/libde265.so.0';
  const locationResult = evaluate({ report: wrongLocation });
  assert.notEqual(locationResult.status, 0);
  assert.match(locationResult.stderr, /matched 0 reviews for raw High finding/);
});

test('rejects runtime and development packages with each other package location set', () => {
  for (const target of ['full-amd64', 'full-arm64']) {
    const [, architecture] = target.split('-');
    for (const vulnerability of vulnerabilities) {
      for (const [name, otherName] of [['libde265-0', 'libde265-dev'], ['libde265-dev', 'libde265-0']]) {
        const report = reportFor(target);
        const match = report.matches.find((candidate) =>
          candidate.vulnerability.id === vulnerability && candidate.artifact.name === name,
        );
        match.artifact.locations = [
          { path: `/usr/share/doc/${otherName}/copyright` },
          { path: `/var/lib/dpkg/info/${otherName}:${architecture}.md5sums` },
          { path: '/var/lib/dpkg/status' },
        ];
        const result = evaluate({ target, report });
        assert.notEqual(result.status, 0, `${target} ${vulnerability} ${name}`);
        assert.match(result.stderr, /matched 0 reviews for raw High finding/);
      }
    }
  }
});

test('rejects wrong variant and architecture', () => {
  const reviews = targetReviews('full-amd64');
  const wrongVariant = evaluate({ target: 'slim-amd64', reviews });
  assert.notEqual(wrongVariant.status, 0);
  assert.match(wrongVariant.stderr, /matched 0 reviews for raw High finding/);

  const wrongArchitecture = evaluate({ target: 'full-arm64', reviews });
  assert.notEqual(wrongArchitecture.status, 0);
  assert.match(wrongArchitecture.stderr, /matched 0 reviews for raw High finding/);
});

test('rejects a libde265 High exception without maintainer approval', () => {
  const reviews = structuredClone(targetReviews('full-amd64'));
  delete reviews[0].approvedBy;
  const result = evaluate({ reviews });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /High exceptions require CoderLuii approval/);
});

test('accepts September 25 and rejects September 26 after the exception expires', () => {
  const valid = evaluate({ asOf: '2026-09-25' });
  assert.equal(valid.status, 0, valid.stderr);

  const expired = evaluate({ asOf: '2026-09-26' });
  assert.notEqual(expired.status, 0);
  assert.match(expired.stderr, /expired on 2026-09-25/);
});
