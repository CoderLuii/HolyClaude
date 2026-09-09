import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const evidence = JSON.parse(readFileSync('tests/fixtures/v160-security-approval-evidence.json', 'utf8'));
const chromeEvidence = evidence.chromium;
const curlEvidence = evidence.curl;
const imagemagickEvidence = evidence.imagemagick;
const targets = ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64'];
const chromiumCritical = new Set([
  'CVE-2026-87438',
  'CVE-2026-87464',
  'CVE-2026-87488',
  'CVE-2026-87527',
  'CVE-2026-87628',
]);
const evaluator = resolve('scripts/evaluate-security-report.mjs');

function targetReviews(target) {
  const [variant, architecture] = target.split('-');
  return ledger.reviews.filter((review) =>
    review.variants?.length === 1 && review.variants[0] === variant &&
    review.architectures?.length === 1 && review.architectures[0] === architecture);
}

test('records all 86 Chromium upstream severities for every exact target', () => {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.provenance.sanitizedAt, '2026-09-11');
  assert.ok(evidence.provenance.sources.every((source) => source.startsWith('https://')));
  assert.equal(chromeEvidence.idCount, 86);
  for (const target of targets) {
    const reviews = targetReviews(target).filter((review) => review.owner === 'Debian Bookworm Chromium');
    const classified = new Map();
    for (const review of reviews) {
      for (const vulnerability of review.vulnerabilities) {
        assert.equal(classified.has(vulnerability), false, `${target} ${vulnerability} duplicated`);
        classified.set(vulnerability, review.effectiveSeverity);
      }
    }
    for (const [severity, vulnerabilities] of Object.entries(chromeEvidence.vendorSeverityGroups)) {
      for (const vulnerability of vulnerabilities) {
        assert.equal(classified.get(vulnerability), severity, `${target} ${vulnerability}`);
      }
    }
    assert.equal(classified.size, 86);
  }
});

test('maps the nine new scanner findings to the exact Google vendor severities without duplicates', () => {
  const expectedVendorSeverities = new Map([
    ['CVE-2026-87534', 'Medium'],
    ['CVE-2026-87544', 'Low'],
    ['CVE-2026-87471', 'Medium'],
    ['CVE-2026-87433', 'Medium'],
    ['CVE-2026-87431', 'Medium'],
    ['CVE-2026-87606', 'Medium'],
    ['CVE-2026-87450', 'Medium'],
    ['CVE-2026-87505', 'Medium'],
    ['CVE-2026-87499', 'High'],
  ]);
  assert.deepEqual(new Set(chromeEvidence.newFindingRawSeverityGroups.Critical),
    new Set(['CVE-2026-87534', 'CVE-2026-87544']));
  assert.deepEqual(new Set(chromeEvidence.newFindingRawSeverityGroups.High),
    new Set(['CVE-2026-87471', 'CVE-2026-87433', 'CVE-2026-87431', 'CVE-2026-87606',
      'CVE-2026-87450', 'CVE-2026-87505', 'CVE-2026-87499']));

  for (const target of targets) {
    const reviews = targetReviews(target).filter((review) => review.owner === 'Debian Bookworm Chromium');
    for (const [vulnerability, severity] of expectedVendorSeverities) {
      const matches = reviews.filter((review) => review.vulnerabilities.includes(vulnerability));
      assert.equal(matches.length, 1, `${target} ${vulnerability} review count`);
      assert.equal(matches[0].disposition, 'vendor_severity');
      assert.equal(matches[0].effectiveSeverity, severity);
      assert.deepEqual(matches[0].authority, {
        name: 'Chrome Releases',
        url: 'https://chromereleases.googleblog.com/2026/09/stable-channel-update-for-desktop_0808145027.html',
      });
      assert.equal(matches[0].expiresAt, '2026-09-17');
    }
  }
});

test('preserves the raw High finding when upstream raises CVE-2026-87628 to Critical', () => {
  for (const target of targets) {
    const targetEvidence = evidence.targets[target];
    assert.match(targetEvidence.sourceReportSha256, /^[a-f0-9]{64}$/);
    const findings = targetEvidence.chromium87628;
    assert.equal(findings.length, 3);
    assert.ok(findings.every((finding) => finding.rawSeverity === 'High'));
    assert.deepEqual(findings.map((finding) => finding.name).sort(), ['chromium', 'chromium-common', 'chromium-sandbox']);
    assert.ok(findings.every((finding) => finding.version === '152.0.7977.82-1~deb12u1' && finding.type === 'deb'));
    const review = targetReviews(target).find((candidate) => candidate.vulnerabilities.includes('CVE-2026-87628'));
    assert.equal(review.effectiveSeverity, 'Critical');
    assert.equal(review.disposition, 'critical_exception');
  }
});

test('binds the five Chromium Critical approvals to exact Debian authority records', () => {
  assert.deepEqual(new Set(chromeEvidence.vendorSeverityGroups.Critical), chromiumCritical);
  for (const target of targets) {
    const review = targetReviews(target).find((candidate) =>
      candidate.owner === 'Debian Bookworm Chromium' && candidate.disposition === 'critical_exception');
    assert.ok(review, `${target} Critical review`);
    assert.deepEqual(new Set(review.vulnerabilities), chromiumCritical);
    assert.deepEqual(review.component.names, ['chromium', 'chromium-common', 'chromium-sandbox']);
    assert.deepEqual(review.component.versions, ['152.0.7977.82-1~deb12u1']);
    assert.equal(review.sourcePackage, 'chromium');
    assert.equal(review.approvedBy, 'CoderLuii');
    assert.equal(review.reviewedAt, '2026-09-11');
    assert.equal(review.expiresAt, '2026-09-17');
    assert.equal(review.authorityEvidence.length, 15);

    const manifest = JSON.parse(readFileSync(`security/critical-exception-authority-evidence-${target}.json`, 'utf8'));
    assert.deepEqual(manifest.candidate, {
      variant: target.split('-')[0], architecture: target.split('-')[1], reportSha256: null,
    });
    assert.equal(manifest.records.length, 15);
    assert.deepEqual(new Set(manifest.records.map((record) => record.id)), new Set(review.authorityEvidence));
    for (const record of manifest.records) {
      assert.equal(record.review, review.id);
      assert.equal(record.sourcePackage, 'chromium');
      assert.equal(record.advisoryStatus, 'open');
      assert.equal(record.fixedVersion, null);
      assert.equal(record.checkedAt, '2026-09-11');
      assert.deepEqual(record.repository.urls, [
        'https://deb.debian.org/debian',
        'https://security.debian.org/debian-security',
      ]);
      assert.equal(record.authority.url, `https://security-tracker.debian.org/tracker/${record.vulnerability}`);
    }
  }
});

test('keeps the generic slim arm64 manifest coherent with its declared preflight target', () => {
  const generic = JSON.parse(readFileSync('security/critical-exception-authority-evidence.json', 'utf8'));
  const target = JSON.parse(readFileSync('security/critical-exception-authority-evidence-slim-arm64.json', 'utf8'));
  assert.deepEqual(generic, target);
});

test('records the five exact curl severities from official curl advisories per target', () => {
  for (const target of targets) {
    const reviews = targetReviews(target).filter((review) => review.owner === 'Debian Bookworm curl');
    assert.equal(reviews.length, 5);
    for (const evidence of curlEvidence) {
      const review = reviews.find((candidate) => candidate.vulnerabilities[0] === evidence.id);
      assert.ok(review, `${target} ${evidence.id}`);
      assert.deepEqual(review.vulnerabilities, [evidence.id]);
      assert.equal(review.disposition, 'vendor_severity');
      assert.equal(review.effectiveSeverity, evidence.upstreamSeverity);
      assert.deepEqual(review.authority, evidence.authority);
      assert.equal(review.reviewedAt, '2026-09-11');
      assert.equal(review.expiresAt, '2026-09-17');
    }
  }
});

test('records both exact ImageMagick Low severities from official upstream advisories per target', () => {
  for (const target of targets) {
    const expected = evidence.targets[target].imagemagick;
    const reviews = targetReviews(target).filter((review) => review.owner === 'Debian Bookworm ImageMagick');
    assert.equal(reviews.length, 2);
    for (const evidence of imagemagickEvidence) {
      const review = reviews.find((candidate) => candidate.vulnerabilities[0] === evidence.id);
      assert.ok(review, `${target} ${evidence.id}`);
      assert.deepEqual(review.vulnerabilities, [evidence.id]);
      assert.equal(review.disposition, 'vendor_severity');
      assert.equal(review.effectiveSeverity, 'Low');
      assert.deepEqual(review.authority, evidence.authority);
      assert.deepEqual([...review.component.names].sort(), expected.names);
      assert.deepEqual([...review.component.versions].sort(), expected.versions);
      assert.deepEqual([...review.component.types].sort(), expected.types);
      assert.ok(expected.locations.every((location) => review.component.locationPatterns.some((pattern) => new RegExp(pattern).test(location))));
      assert.ok(review.component.locationPatterns.every((pattern) => expected.locations.some((location) => new RegExp(pattern).test(location))));
      assert.equal(review.reviewedAt, '2026-09-11');
      assert.equal(review.expiresAt, '2026-09-17');
    }
  }
});

test('records exact temporary High approvals for bubblewrap and the new extract-zip advisory', () => {
  for (const target of targets) {
    const reviews = targetReviews(target);
    for (const [vulnerability, name, owner] of [
      ['CVE-2026-87766', 'bubblewrap', 'Debian Bookworm bubblewrap'],
      ['GHSA-7pqw-9j4j-h8q3', 'extract-zip', 'HolyClaude bundled extract-zip'],
    ]) {
      const review = reviews.find((candidate) => candidate.vulnerabilities.includes(vulnerability) && candidate.owner === owner);
      assert.ok(review, `${target} ${vulnerability}`);
      assert.deepEqual(review.vulnerabilities, [vulnerability]);
      assert.deepEqual(review.component.names, [name]);
      assert.equal(review.disposition, 'high_exception');
      assert.equal(review.effectiveSeverity, 'High');
      assert.equal(review.approvedBy, 'CoderLuii');
      assert.equal(review.reviewedAt, '2026-09-11');
      assert.equal(review.expiresAt, '2026-09-17');
    }
  }
});

if (process.env.HOLYCLAUDE_PORTABILITY_CHILD !== '1') {
  test('the evaluator maps every new raw Chromium finding exactly once', () => {
    const root = mkdtempSync(join(tmpdir(), 'holyclaude-chromium-severity-'));
    try {
      const reviews = targetReviews('full-amd64').filter((review) =>
        review.owner === 'Debian Bookworm Chromium' && review.disposition === 'vendor_severity');
      const findings = [...chromeEvidence.newFindingRawSeverityGroups.Critical.map((vulnerability) =>
        ({ vulnerability, severity: 'Critical' })),
      ...chromeEvidence.newFindingRawSeverityGroups.High.map((vulnerability) =>
        ({ vulnerability, severity: 'High' }))];
      const report = {
        source: { type: 'sbom', target: 'fixture.cdx.json' },
        distro: { name: 'debian', version: '12', idLike: ['debian'] },
        descriptor: { name: 'grype', version: '0.118.0', configuration: {} },
        ignoredMatches: [],
        matches: findings.map(({ vulnerability, severity }, index) => ({
          vulnerability: { id: vulnerability, severity, fix: { versions: [], state: 'not-fixed' } },
          artifact: {
            name: ['chromium', 'chromium-common', 'chromium-sandbox'][index % 3],
            version: '152.0.7977.82-1~deb12u1',
            type: 'deb',
            locations: [{ path: '/var/lib/dpkg/status' }],
          },
        })),
      };
      const reportText = `${JSON.stringify(report, null, 2)}\n`;
      const reportSha256 = createHash('sha256').update(reportText).digest('hex');
      const files = {
        report,
        ledger: { schemaVersion: 1, policy: 'security/advisory-review-policy.md', reviews },
        authorityEvidence: {
          schemaVersion: 1,
          candidate: { variant: 'full', architecture: 'amd64', reportSha256 },
          records: [],
        },
        vex: {
          '@context': 'https://openvex.dev/ns/v0.2.0',
          '@id': 'urn:test:chromium-vendor-severity',
          author: 'CoderLuii',
          timestamp: '2026-09-11T00:00:00Z',
          version: 1,
          statements: [],
        },
      };
      for (const [name, value] of Object.entries(files)) {
        writeFileSync(join(root, `${name}.json`), name === 'report' ? reportText : `${JSON.stringify(value, null, 2)}\n`);
      }
      const output = join(root, 'output');
      const result = spawnSync(process.execPath, [evaluator,
        '--report', join(root, 'report.json'), '--ledger', join(root, 'ledger.json'),
        '--authority-evidence', join(root, 'authorityEvidence.json'), '--vex', join(root, 'vex.json'),
        '--output-dir', output, '--variant', 'full', '--arch', 'amd64',
        '--image-digest', `sha256:${'a'.repeat(64)}`, '--sbom-sha256', 'b'.repeat(64),
        '--as-of', '2026-09-11'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const policy = JSON.parse(readFileSync(join(output, 'policy.json'), 'utf8'));
      assert.equal(policy.rawCriticalCount, 2);
      assert.equal(policy.reviewedCriticalCount, 2);
      assert.equal(policy.rawHighCount, 7);
      assert.equal(policy.mappedHighCount, 7);
      const mapped = [...JSON.parse(readFileSync(join(output, 'critical-findings.json'), 'utf8')),
        ...JSON.parse(readFileSync(join(output, 'high-findings.json'), 'utf8'))];
      assert.equal(mapped.length, 9);
      assert.ok(mapped.every((finding) => finding.policy?.disposition === 'vendor_severity'));
      assert.equal(new Set(mapped.map((finding) => finding.vulnerability)).size, 9);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('runs from tracked product inputs without private maintainer evidence', () => {
    const isolatedRoot = mkdtempSync(join(tmpdir(), 'holyclaude-security-approval-portable-'));
    try {
      mkdirSync(join(isolatedRoot, 'tests', 'fixtures'), { recursive: true });
      mkdirSync(join(isolatedRoot, 'security'), { recursive: true });
      cpSync(fileURLToPath(import.meta.url), join(isolatedRoot, 'tests', 'v160_security_approval_reviews.test.mjs'));
      cpSync('tests/fixtures/v160-security-approval-evidence.json', join(isolatedRoot, 'tests', 'fixtures', 'v160-security-approval-evidence.json'));
      cpSync('security/advisory-reviews.json', join(isolatedRoot, 'security', 'advisory-reviews.json'));
      for (const target of ['', ...targets]) {
        const suffix = target ? `-${target}` : '';
        cpSync(`security/critical-exception-authority-evidence${suffix}.json`,
          join(isolatedRoot, 'security', `critical-exception-authority-evidence${suffix}.json`));
      }
      const result = spawnSync(process.execPath, ['--test', 'tests/v160_security_approval_reviews.test.mjs'], {
        cwd: isolatedRoot,
        encoding: 'utf8',
        env: { ...process.env, HOLYCLAUDE_PORTABILITY_CHILD: '1' },
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    } finally {
      rmSync(isolatedRoot, { recursive: true, force: true });
    }
  });
}
