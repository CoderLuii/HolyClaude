import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const preflight = 'scripts/preflight-security-policy.mjs';

function runPreflight({ expiresAt = '2026-09-30', asOf = '2026-09-01' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-security-preflight-'));
  try {
    const ledger = {
      schemaVersion: 1,
      policy: 'security/advisory-review-policy.md',
      reviews: [{
        id: 'full-only-review',
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
        reviewedAt: '2026-08-01',
        expiresAt,
        rationale: 'Exact fixture review.',
        variants: ['full'],
      }],
    };
    const vex = {
      '@context': 'https://openvex.dev/ns/v0.2.0',
      '@id': 'urn:test:openvex',
      author: 'CoderLuii',
      timestamp: '2026-09-01T00:00:00Z',
      version: 1,
      statements: [],
    };
    const authorityEvidence = {
      schemaVersion: 1,
      candidate: {
        variant: 'slim',
        architecture: 'arm64',
        reportSha256: null,
      },
      records: [],
    };
    const ledgerPath = join(root, 'ledger.json');
    const authorityEvidencePath = join(root, 'authority-evidence.json');
    const vexPath = join(root, 'openvex.json');
    writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    writeFileSync(authorityEvidencePath, `${JSON.stringify(authorityEvidence, null, 2)}\n`);
    writeFileSync(vexPath, `${JSON.stringify(vex, null, 2)}\n`);
    return spawnSync(process.execPath, [
      preflight,
      '--ledger', ledgerPath,
      '--authority-evidence', authorityEvidencePath,
      '--vex', vexPath,
      '--as-of', asOf,
    ], { cwd: process.cwd(), encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('validates a current advisory ledger and OpenVEX document without scanner input', () => {
  const result = runPreflight();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /security policy preflight passed for 2026-09-01/);
});

test('fails closed when any committed review is stale', () => {
  const result = runPreflight({ expiresAt: '2026-08-31' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /full-only-review: review expired on 2026-08-31/);
});
