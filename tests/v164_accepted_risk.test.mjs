import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = 'scripts/evaluate-release-security-deferral.mjs';
const imageDigest = `sha256:${'a'.repeat(64)}`;
const sbomSha256 = 'b'.repeat(64);

function findingRecord(overrides = {}) {
  return {
    vulnerability: 'CVE-2099-0001',
    severity: 'Critical',
    package: 'example-package',
    version: '1.0.0',
    type: 'npm',
    locations: ['/usr/local/lib/node_modules/example-package/package.json'],
    fixState: 'not-fixed',
    fixVersions: [],
    occurrenceCount: 1,
    ...overrides,
  };
}

function scannerMatch(overrides = {}) {
  const finding = findingRecord(overrides);
  return {
    vulnerability: {
      id: finding.vulnerability,
      severity: finding.severity,
      fix: { state: finding.fixState, versions: finding.fixVersions },
    },
    artifact: {
      name: finding.package,
      version: finding.version,
      type: finding.type,
      locations: finding.locations.map((path) => ({ path })),
    },
  };
}

function runFixture({ includeAcceptedRisk = true, mutate = () => {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-v164-accepted-risk-'));
  const outputDir = join(root, 'output');
  const data = {
    ledger: {
      schemaVersion: 1,
      policy: 'security/advisory-review-policy.md',
      reviews: [],
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
      timestamp: '2026-10-02T00:00:00Z',
      version: 1,
      statements: [],
    },
    report: {
      matches: [scannerMatch()],
      ignoredMatches: [],
      source: { type: 'image', target: { userInput: 'fixture' } },
      distro: { name: 'debian', version: '12.15' },
      descriptor: { name: 'grype', version: '0.120.1', configuration: {} },
    },
    deferral: {
      schemaVersion: 1,
      release: 'v1.6.4',
      approvedBy: 'CoderLuii',
      reviewedAt: '2026-10-02',
      expiresAt: '2026-10-04',
      rationale: 'No expired upstream reviews are deferred by this fixture.',
      monitoring: 'Every candidate and promotion reruns Syft and Grype.',
      deferredReviewIds: [],
    },
    acceptedRisk: {
      schemaVersion: 1,
      release: 'v1.6.4',
      approvedBy: 'CoderLuii',
      reviewedAt: '2026-10-02',
      expiresAt: '2026-10-04',
      rationale: 'Release v1.6.4 with this exact known risk while remediation is monitored.',
      monitoring: 'Every candidate and promotion reruns Syft, Grype, and exact accepted-risk reconciliation.',
      targets: [
        { variant: 'full', architecture: 'amd64', findings: [findingRecord()] },
        { variant: 'full', architecture: 'arm64', findings: [findingRecord()] },
        { variant: 'slim', architecture: 'amd64', findings: [findingRecord()] },
        { variant: 'slim', architecture: 'arm64', findings: [findingRecord()] },
      ],
    },
  };
  mutate(data);
  for (const [name, value] of Object.entries(data)) {
    writeFileSync(join(root, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  }
  const reportText = readFileSync(join(root, 'report.json'), 'utf8');
  data.authority.candidate.reportSha256 = createHash('sha256').update(reportText).digest('hex');
  writeFileSync(join(root, 'authority.json'), `${JSON.stringify(data.authority, null, 2)}\n`);
  const args = [
    validator,
    '--manifest', join(root, 'deferral.json'),
    '--release', 'v1.6.4',
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
  ];
  if (includeAcceptedRisk) args.push('--accepted-risk-manifest', join(root, 'acceptedRisk.json'));
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8' });
  const evidencePath = join(outputDir, 'release-accepted-risk.json');
  const policyPath = join(outputDir, 'policy.json');
  const evidence = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, 'utf8')) : null;
  const policy = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, 'utf8')) : null;
  rmSync(root, { recursive: true, force: true });
  return { result, evidence, policy };
}

test('keeps the normal security policy strict when no accepted-risk manifest is supplied', () => {
  const { result } = runFixture({ includeAcceptedRisk: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Critical findings remain unresolved/);
});

test('accepts an exact v1.6.4 target-specific known-risk multiset without claiming the scan is clean', () => {
  const { result, evidence, policy } = runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(evidence.status, 'known_risk_accepted');
  assert.equal(evidence.acceptedCriticalCount, 1);
  assert.equal(evidence.acceptedHighCount, 0);
  assert.equal(evidence.imageDigest, imageDigest);
  assert.equal(evidence.sbomSha256, sbomSha256);
  assert.match(evidence.reportSha256, /^[a-f0-9]{64}$/);
  assert.equal(policy.securityStatus, 'known_risk_accepted');
  assert.equal(policy.effectiveCriticalCount, 1);
  assert.equal(policy.errors.length, 0);
  assert.equal(policy.acceptedKnownRisk.acceptedCriticalCount, 1);
});

test('rejects added or changed findings', () => {
  const { result } = runFixture({
    mutate: ({ report }) => {
      report.matches[0].artifact.version = '1.0.1';
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /accepted-known-risk findings do not exactly match/);
});

test('rejects missing findings', () => {
  const { result } = runFixture({
    mutate: ({ acceptedRisk }) => {
      acceptedRisk.targets[0].findings.push(findingRecord({ vulnerability: 'CVE-2099-0002' }));
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /accepted-known-risk findings do not exactly match/);
});

test('rejects duplicate manifest records', () => {
  const { result } = runFixture({
    mutate: ({ acceptedRisk }) => {
      acceptedRisk.targets[0].findings.push(findingRecord());
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate accepted-known-risk finding/);
});

test('rejects wildcard selectors in accepted-risk records', () => {
  const { result } = runFixture({
    mutate: ({ acceptedRisk }) => {
      acceptedRisk.targets[0].findings[0].package = 'example-*';
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must not contain wildcards/);
});

for (const [label, mutate, expected] of [
  ['wrong target', ({ acceptedRisk }) => { acceptedRisk.targets[0].architecture = 'arm64'; }, /targets must be unique|missing target full\/amd64/],
  ['wrong release', ({ acceptedRisk }) => { acceptedRisk.release = 'v1.6.5'; }, /must target v1\.6\.4/],
  ['wrong approver', ({ acceptedRisk }) => { acceptedRisk.approvedBy = 'SomebodyElse'; }, /requires CoderLuii approval/],
  ['expired approval', ({ acceptedRisk }) => { acceptedRisk.expiresAt = '2026-10-01'; }, /expires before it was reviewed|expired on 2026-10-01/],
]) {
  test(`rejects ${label}`, () => {
    const { result } = runFixture({ mutate });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, expected);
  });
}

test('rejects an accepted finding when the scanner newly reports a fix', () => {
  const { result } = runFixture({
    mutate: ({ report }) => {
      report.matches[0].vulnerability.fix = { state: 'fixed', versions: ['1.0.1'] };
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /newly reports a fix/);
});
