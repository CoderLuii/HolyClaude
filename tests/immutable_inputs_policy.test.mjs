import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = resolve('scripts/verify-immutable-inputs.mjs');
const committedEvidence = readFileSync(resolve('security/immutable-inputs.yml'), 'utf8');
const asOf = '2026-09-01';
const reviewedAt = '2026-09-01';

function runFixture(mutate = (value) => value) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-immutable-inputs-'));
  try {
    const input = join(root, 'immutable-inputs.yml');
    writeFileSync(
      input,
      mutate(committedEvidence),
    );
    return spawnSync(
      process.execPath,
      [validator, '--file', input, '--as-of', asOf, '--release', 'v1.5.9'],
      { encoding: 'utf8' },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('accepts current immutable input evidence for the requested release', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr);
});

test('rejects immutable input evidence expired before the deterministic as-of date', () => {
  const result = runFixture((value) =>
    value
      .replace(`reviewed-at: ${reviewedAt}`, 'reviewed-at: 2026-06-20')
      .replace('expires-at: 2026-09-29', 'expires-at: 2026-07-20'),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expired on 2026-07-20/);
});

test('rejects immutable input evidence for another release', () => {
  const result = runFixture((value) => value.replace('release: v1.5.9', 'release: v1.5.1'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected release v1\.5\.9/);
});

test('rejects an invalid review date', () => {
  const result = runFixture((value) => value.replace(`reviewed-at: ${reviewedAt}`, 'reviewed-at: 2026-02-30'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /reviewed-at is invalid/);
});

test('rejects immutable input evidence reviewed after the deterministic as-of date', () => {
  const result = runFixture((value) => value.replace(`reviewed-at: ${reviewedAt}`, 'reviewed-at: 2026-09-02'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /reviewed-at 2026-09-02 is after as-of 2026-09-01/);
});

for (const category of [
  'base-images',
  'release-assets',
  'installers',
  'vendored-artifacts',
  'plugins',
  'github-actions',
  'deferred-migrations',
]) {
  test(`rejects missing ${category} category`, () => {
    const result = runFixture((value) => value.replace(new RegExp(`\\n${category}:[\\s\\S]*?(?=\\n[a-z][a-z0-9-]*:|$)`), ''));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`missing ${category}`));
  });
}

test('rejects duplicate records within a category', () => {
  const duplicate = `  - name: actions/checkout\n    version: v7.0.1\n    commit: 3d3c42e5aac5ba805825da76410c181273ba90b1\n`;
  const result = runFixture((value) => value.replace(/github-actions:\r?\n/, `github-actions:\n${duplicate}`));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions has duplicate name actions\/checkout/);
});

test('rejects an invalid base image digest', () => {
  const result = runFixture((value) => value.replace(/digest: sha256:[a-f0-9]{64}/, 'digest: sha256:not-a-digest'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images.*digest must be sha256/);
});

test('rejects an incomplete architecture hash pair', () => {
  const result = runFixture((value) => value.replace(/^    arm64-archive-sha256:.*\r?\n/m, ''));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires both amd64-archive-sha256 and arm64-archive-sha256/);
});

test('rejects a committed-hash release asset without payload hashes', () => {
  const result = runFixture((value) =>
    value.replace(/^    noarch-archive-sha256:.*\r?\n/m, '').replace(/^    (amd64|arm64)-archive-sha256:.*\r?\n/gm, ''),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release-assets.*committed-hash requires payload hashes/);
});

test('rejects a missing vendored artifact', () => {
  const result = runFixture((value) =>
    value.replace(
      'vendor/artifacts/cloudcli-ai-cloudcli-1.37.2-holyclaude-account-management.tgz',
      'vendor/artifacts/missing-cloudcli.tgz',
    ),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*artifact does not exist/);
});

test('rejects a vendored artifact hash mismatch', () => {
  const result = runFixture((value) =>
    value.replace(/(vendored-artifacts:[\s\S]*?\n    sha256: )[a-f0-9]{64}/, '$1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*artifact hash mismatch/);
});

test('rejects a missing referenced manifest', () => {
  const result = runFixture((value) =>
    value.replace('vendor/artifacts/cloudcli-account-management.manifest.json', 'vendor/artifacts/missing-manifest.json'),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*manifest does not exist/);
});

test('rejects a vendored artifact without a manifest hash', () => {
  const result = runFixture((value) => value.replace(/^    manifest-sha256:.*\r?\n/m, ''));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*missing manifest-sha256/);
});

test('rejects a missing plugin lock', () => {
  const result = runFixture((value) =>
    value.replace(
      'vendor/locks/cloudcli-web-terminal-8aa41f614c216d961e7c0d9c3e67982c6b2d9da3.package-lock.json',
      'vendor/locks/missing.package-lock.json',
    ),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /plugins.*lock does not exist/);
});

test('rejects a GitHub Action without a full commit SHA', () => {
  const result = runFixture((value) => value.replace('commit: 3d3c42e5aac5ba805825da76410c181273ba90b1', 'commit: v7'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions.*commit must be a full 40-character SHA/);
});

test('rejects a plugin without a full commit SHA', () => {
  const result = runFixture((value) => value.replace('commit: 4895cd3fd33362471e739b786493aba048487bcc', 'commit: main'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /plugins.*commit must be a full 40-character SHA/);
});

test('verifies a referenced manifest hash when one is supplied', () => {
  const result = runFixture((value) =>
    value.replace(
      /manifest-sha256: [a-f0-9]{64}/,
      'manifest-sha256: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*manifest hash mismatch/);
});

test('rejects duplicate top-level keys instead of silently overriding them', () => {
  const result = runFixture((value) => `release: v1.5.9\n${value}`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate top-level key release/);
});
