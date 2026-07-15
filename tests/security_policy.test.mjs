import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const evaluator = resolve('scripts/evaluate-security-report.mjs');

function fixture() {
  return {
    report: {
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
      statements: [],
    },
  };
}

function runFixture(mutate = () => {}) {
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
        'full',
        '--arch',
        'amd64',
        '--as-of',
        '2026-07-15',
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
  ['expired review', ({ ledger }) => (ledger.reviews[0].expiresAt = '2026-07-14'), 'review expired'],
  ['version mismatch', ({ ledger }) => (ledger.reviews[0].component.versions = ['2.0.0']), 'matched 0 reviews'],
  ['path mismatch', ({ ledger }) => (ledger.reviews[0].component.locationPatterns = ['^/opt/']), 'matched 0 reviews'],
  [
    'unsupported authority',
    ({ ledger }) => (ledger.reviews[0].authority.url = 'https://example.com/CVE-2099-0001'),
    'unsupported authority URL',
  ],
  ['effective Critical', ({ ledger }) => (ledger.reviews[0].effectiveSeverity = 'Critical'), 'cannot be dispositioned'],
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
