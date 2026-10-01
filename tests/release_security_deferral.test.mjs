import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = 'scripts/evaluate-release-security-deferral.mjs';
const imageDigest = `sha256:${'a'.repeat(64)}`;
const sbomSha256 = 'b'.repeat(64);

function review(overrides = {}) {
  return {
    id: 'expired-debian-high-review',
    vulnerabilities: ['CVE-2099-0001'],
    component: {
      names: ['example-package'],
      versions: ['1.0.0'],
      types: ['deb'],
      locationPatterns: [
        '^/usr/share/doc/example-package/copyright$',
        '^/var/lib/dpkg/status$',
      ],
    },
    disposition: 'high_exception',
    effectiveSeverity: 'High',
    owner: 'Debian Bookworm base',
    authority: {
      name: 'Debian Security Tracker',
      url: 'https://security-tracker.debian.org/tracker/CVE-2099-0001',
    },
    reviewedAt: '2026-09-01',
    expiresAt: '2026-10-01',
    rationale: 'The exact Debian package remains affected and unfixed.',
    approvedBy: 'CoderLuii',
    variants: ['full'],
    architectures: ['amd64'],
    ...overrides,
  };
}

function match({ vulnerability = 'CVE-2099-0001', severity = 'High' } = {}) {
  return {
    vulnerability: {
      id: vulnerability,
      severity,
      fix: { versions: [], state: 'not-fixed' },
    },
    artifact: {
      name: 'example-package',
      version: '1.0.0',
      type: 'deb',
      locations: [
        { path: '/usr/share/doc/example-package/copyright' },
        { path: '/var/lib/dpkg/status' },
      ],
    },
  };
}

function runFixture(mutate = () => {}, { extraArgs = [], mutateBound = () => {}, release = 'v1.6.4' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-release-deferral-'));
  const outputDir = join(root, 'output');
  const data = {
    ledger: {
      schemaVersion: 1,
      policy: 'security/advisory-review-policy.md',
      reviews: [review()],
    },
    authority: {
      schemaVersion: 1,
      candidate: { variant: 'full', architecture: 'amd64', reportSha256: null },
      records: [],
    },
    vex: {
      '@context': 'https://openvex.dev/ns/v0.2.0',
      '@id': 'urn:test:openvex',
      author: 'CoderLuii',
      timestamp: '2026-10-01T00:00:00Z',
      version: 1,
      statements: [],
    },
    report: {
      matches: [match()],
      ignoredMatches: [],
      source: { type: 'image', target: { userInput: 'fixture' } },
      distro: { name: 'debian', version: '12.15' },
      descriptor: { name: 'grype', version: '0.119.0', configuration: {} },
    },
    manifest: {
      schemaVersion: 1,
      release: 'v1.6.4',
      approvedBy: 'CoderLuii',
      reviewedAt: '2026-10-02',
      expiresAt: '2026-10-04',
      rationale: 'Ship v1.6.4 while exact upstream Debian findings remain unavailable to fix in Bookworm.',
      monitoring: 'Every candidate and promotion reruns Syft, Grype, and this exact deferral validator.',
      deferredReviewIds: ['expired-debian-high-review'],
    },
  };
  mutate(data);
  for (const [name, value] of Object.entries(data)) {
    writeFileSync(join(root, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  }
  const reportText = readFileSync(join(root, 'report.json'), 'utf8');
  data.authority.candidate.reportSha256 = createHash('sha256').update(reportText).digest('hex');
  mutateBound(data);
  writeFileSync(join(root, 'authority.json'), `${JSON.stringify(data.authority, null, 2)}\n`);
  const result = spawnSync(process.execPath, [
    validator,
    '--manifest', join(root, 'manifest.json'),
    '--release', release,
    '--ledger', join(root, 'ledger.json'),
    '--authority-evidence', join(root, 'authority.json'),
    '--vex', join(root, 'vex.json'),
    '--report', join(root, 'report.json'),
    '--output-dir', outputDir,
    '--variant', 'full',
    '--arch', 'amd64',
    '--image-digest', imageDigest,
    '--sbom-sha256', sbomSha256,
    '--as-of', '2026-10-02',
    ...extraArgs,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  let evidence;
  try {
    evidence = JSON.parse(readFileSync(join(outputDir, 'release-security-deferral.json'), 'utf8'));
  } catch {
    evidence = null;
  }
  rmSync(root, { recursive: true, force: true });
  return { result, evidence };
}

test('accepts one exact expired upstream Debian review for v1.6.4', () => {
  const { result, evidence } = runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(evidence.release, 'v1.6.4');
  assert.equal(evidence.status, 'deferred_not_fixed');
  assert.deepEqual(evidence.usedReviewIds, ['expired-debian-high-review']);
  assert.match(evidence.reportSha256, /^[a-f0-9]{64}$/);
  assert.equal(evidence.imageDigest, imageDigest);
  assert.equal(evidence.sbomSha256, sbomSha256);
});

test('rejects a project-controlled npm review', () => {
  const { result } = runFixture(({ ledger }) => {
    ledger.reviews[0] = review({
      component: {
        names: ['example-package'],
        versions: ['1.0.0'],
        types: ['npm'],
        locationPatterns: ['^/usr/local/lib/node_modules/example-package/package\\.json$'],
      },
      owner: 'Common npm toolset',
      authority: { name: 'GitHub Advisory', url: 'https://github.com/advisories/GHSA-xxxx-yyyy-zzzz' },
    });
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only exact Debian Security Tracker reviews can be deferred/);
});

test('rejects an undeclared expired review instead of silently extending it', () => {
  const { result } = runFixture(({ manifest }) => {
    manifest.deferredReviewIds = [];
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /matched 0 reviews for raw High finding/);
});

test('rejects the deferral after its exact expiry date', () => {
  const { result } = runFixture(({ manifest }) => {
    manifest.reviewedAt = '2026-09-30';
    manifest.expiresAt = '2026-10-01';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release deferral expired on 2026-10-01/);
});

test('rejects a deferral for another release', () => {
  const { result } = runFixture(({ manifest }) => {
    manifest.release = 'v1.6.5';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must target v1.6.4/);
});

test('rejects a requested release that does not match the exact manifest release', () => {
  const { result } = runFixture(() => {}, { release: 'v1.6.5' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not match requested release v1\.6\.5/);
});

test('rejects unknown arguments', () => {
  const { result } = runFixture(() => {}, { extraArgs: ['--allow-anything', 'true'] });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown argument --allow-anything/);
});

test('requires authority evidence to be bound to the exact report', () => {
  const { result } = runFixture(() => {}, {
    mutateBound: ({ authority }) => {
      authority.candidate.reportSha256 = '0'.repeat(64);
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /authority evidence reportSha256 does not match the scanner report/);
});

test('requires authority evidence to target the exact variant and architecture', () => {
  const { result } = runFixture(() => {}, {
    mutateBound: ({ authority }) => {
      authority.candidate.architecture = 'arm64';
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /authority evidence target does not match/);
});

test('rejects deferred Critical reviews', () => {
  const { result } = runFixture(({ ledger }) => {
    ledger.reviews[0].disposition = 'critical_exception';
    ledger.reviews[0].effectiveSeverity = 'Critical';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Critical findings cannot use the release deferral/);
});

test('rejects a raw Critical finding even when Debian assigns a lower vendor severity', () => {
  const { result } = runFixture(({ ledger, report }) => {
    ledger.reviews[0].disposition = 'vendor_severity';
    ledger.reviews[0].effectiveSeverity = 'Low';
    report.matches[0].vulnerability.severity = 'Critical';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /raw Critical findings cannot use the release deferral/);
});

for (const [label, fix] of [
  ['fixed version', { versions: ['1.0.1'], state: 'fixed' }],
  ['fixed state', { versions: [], state: 'fixed' }],
]) {
  test(`rejects a deferred finding with a scanner ${label}`, () => {
    const { result } = runFixture(({ report }) => {
      report.matches[0].vulnerability.fix = fix;
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /release deferral is prohibited because the scanner reports a fix/);
  });
}

test('does not treat malformed scanner evidence as deferrable', () => {
  const { result } = runFixture(({ report }) => {
    report.descriptor.version = '0.118.0';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected Grype 0\.119\.0/);
});

test('committed deferral names only exact expired Debian tracker reviews', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  const manifest = JSON.parse(readFileSync('security/v1.6.4-release-security-deferral.json', 'utf8'));
  const reviews = new Map(ledger.reviews.map((item) => [item.id, item]));
  assert.equal(manifest.release, 'v1.6.4');
  assert.equal(manifest.expiresAt, '2026-10-04');
  assert.ok(manifest.deferredReviewIds.length > 0);
  for (const id of manifest.deferredReviewIds) {
    const item = reviews.get(id);
    assert.ok(item, id);
    assert.deepEqual(item.component.types, ['deb'], id);
    assert.equal(item.authority.name, 'Debian Security Tracker', id);
    assert.match(item.authority.url, /^https:\/\/security-tracker\.debian\.org\//, id);
    assert.match(item.owner, /^Debian/, id);
    assert.ok(item.expiresAt < manifest.reviewedAt, id);
  }
});

test('workflow evaluates and revalidates the committed deferral without disabling scanners', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.match(workflow, /grype[^\n]*sbom:/);
  assert.match(workflow, /evaluate-release-security-deferral\.mjs[\s\S]*?v1\.6\.4-release-security-deferral\.json/);
  assert.equal((workflow.match(/evaluate-release-security-deferral\.mjs/g) ?? []).length, 3);
  assert.equal((workflow.match(/evaluate-release-security-deferral\.mjs[\s\S]{0,300}?--release /g) ?? []).length, 3);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true[\s\S]{0,200}release security deferral/i);
});

test('workflow retains complete security evidence when the policy rejects a candidate', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.match(workflow, /POLICY_STATUS="\$\{policy_status\}" \\\r?\n[\s\S]{0,200}?python3 - <<'PY'/);
  assert.match(
    workflow,
    /policy_status = int\(os\.environ\["POLICY_STATUS"\]\)[\s\S]*?if policy_status == 0:[\s\S]*?release security deferral evidence is missing/,
  );
  assert.match(
    workflow,
    /with \(root \/ "metadata\.json"\)\.open[\s\S]*?PY\s*\(cd "\$\{evidence_dir\}" && sha256sum \.\/\*\.json > SHA256SUMS\)\s*exit "\$\{policy_status\}"/,
  );
});
