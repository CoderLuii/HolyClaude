import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const validator = resolve('scripts/verify-immutable-inputs.mjs');
const committedEvidence = readFileSync(resolve('security/immutable-inputs.yml'), 'utf8');
const release = /^release:\s*(\S+)$/m.exec(committedEvidence)?.[1];
const reviewedAt = /^reviewed-at:\s*(\S+)$/m.exec(committedEvidence)?.[1];
const expiresAt = /^expires-at:\s*(\S+)$/m.exec(committedEvidence)?.[1];
const asOf = reviewedAt;
const afterAsOf = new Date(`${asOf}T00:00:00Z`);
afterAsOf.setUTCDate(afterAsOf.getUTCDate() + 1);
const afterAsOfDate = afterAsOf.toISOString().slice(0, 10);

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
      [validator, '--file', input, '--as-of', asOf, '--release', release],
      { encoding: 'utf8' },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runSourceFixture({ mutateDockerfile = (value) => value, mutateWorkflow = (_name, value) => value }) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-immutable-source-'));
  try {
    const input = join(root, 'security/immutable-inputs.yml');
    mkdirSync(dirname(input), { recursive: true });
    writeFileSync(input, committedEvidence);
    writeFileSync(join(root, 'Dockerfile'), mutateDockerfile(readFileSync('Dockerfile', 'utf8')));

    const workflowDirectory = join(root, '.github/workflows');
    mkdirSync(workflowDirectory, { recursive: true });
    for (const name of readdirSync('.github/workflows')) {
      if (!/\.ya?ml$/i.test(name)) continue;
      const source = readFileSync(join('.github/workflows', name), 'utf8');
      writeFileSync(join(workflowDirectory, name), mutateWorkflow(name, source));
    }

    cpSync('vendor', join(root, 'vendor'), { recursive: true });

    return spawnSync(
      process.execPath,
      [validator, '--file', input, '--as-of', asOf, '--release', release],
      { cwd: root, encoding: 'utf8' },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('accepts current immutable input evidence for the requested release', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr);
});

test('records the checksum-bound Azure CLI PyJWT security wheel', () => {
  assert.match(committedEvidence, /name: Azure CLI PyJWT security wheel\r?\n    version: 2\.15\.1\r?\n    wheel-sha256: 42d59d631f7768a1028a64c7ff581a9bf7519804daf91fc5b6c56e30eec5e193/);
});

test('rejects immutable input evidence expired before the deterministic as-of date', () => {
  const result = runFixture((value) =>
    value
      .replace(`reviewed-at: ${reviewedAt}`, 'reviewed-at: 2026-06-20')
      .replace(`expires-at: ${expiresAt}`, 'expires-at: 2026-07-20'),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expired on 2026-07-20/);
});

test('rejects immutable input evidence for another release', () => {
  const result = runFixture((value) => value.replace(`release: ${release}`, 'release: v1.5.1'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`expected release ${release.replaceAll('.', '\\.')}`));
});

test('rejects an invalid review date', () => {
  const result = runFixture((value) => value.replace(`reviewed-at: ${reviewedAt}`, 'reviewed-at: 2026-02-30'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /reviewed-at is invalid/);
});

test('rejects immutable input evidence reviewed after the deterministic as-of date', () => {
  const result = runFixture((value) => value.replace(`reviewed-at: ${reviewedAt}`, `reviewed-at: ${afterAsOfDate}`));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`reviewed-at ${afterAsOfDate} is after as-of ${asOf}`));
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

test('rejects a Go builder digest that does not match the Dockerfile', () => {
  const result = runFixture((value) =>
    value.replace(
      'digest: sha256:69a7b9788769bec032d238959b61854e9ae87f57be9029ec04e9885fabf99195',
      'digest: sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images Go esbuild builder: reference and digest do not match source/);
});

test('rejects an uninventoried platform-qualified Dockerfile base image', () => {
  const result = runSourceFixture({
    mutateDockerfile: (value) => `${value}\nFROM --platform=linux/amd64 alpine:3.22@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa AS untracked\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images source uses untracked image alpine:3\.22@sha256:a{64}/);
});

test('rejects an unpinned Dockerfile base image', () => {
  const result = runSourceFixture({
    mutateDockerfile: (value) => `${value}\nFROM alpine:3.22 AS unpinned\n`,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images source has unsupported or unpinned FROM instruction/);
});

test('rejects conflicting digests for the same Dockerfile base image reference', () => {
  const result = runSourceFixture({
    mutateDockerfile: (value) =>
      value.replace(
        /^(FROM golang:1\.27\.1-bookworm@sha256:[a-f0-9]{64} AS esbuild-builder)$/m,
        'FROM golang:1.27.1-bookworm@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa AS stale-builder\n$1',
      ),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images source has conflicting digests for golang:1\.27\.1-bookworm/);
});

test('does not accept a comment-only workflow image digest', () => {
  const result = runSourceFixture({
    mutateWorkflow: (_name, value) => value.replace(
      /^(\s*)rhysd\/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667$/gm,
      '$1# rhysd/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
    ),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images Actionlint workflow validator: reference and digest do not match source/);
});

test('rejects a workflow image using an unreviewed tag', () => {
  const result = runSourceFixture({
    mutateWorkflow: (_name, value) => value.replaceAll(
      'rhysd/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
      'rhysd/actionlint:9.9.9@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
    ),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /base-images Actionlint workflow validator: reference and digest do not match source/);
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
      'vendor/artifacts/cloudcli-ai-cloudcli-1.37.3-holyclaude-account-management.tgz',
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

test('rejects a missing vendored artifact build lock', () => {
  const result = runFixture((value) =>
    value.replace(
      'vendor/locks/cloudcli-account-management-70e57859b6224ff0eb0539fcde7d13a3186c9c93.package-lock.json',
      'vendor/locks/missing-cloudcli.package-lock.json',
    ),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*lock does not exist/);
});

test('rejects a vendored artifact build lock hash mismatch', () => {
  const result = runFixture((value) =>
    value.replace(/(vendored-artifacts:[\s\S]*?\n    lock-sha256: )[a-f0-9]{64}/, '$1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /vendored-artifacts.*lock hash mismatch/);
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
      'vendor/locks/cloudcli-web-terminal-6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d.package-lock.json',
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

test('rejects a GitHub Action commit that does not match the workflows', () => {
  const result = runFixture((value) =>
    value.replace(
      'commit: cf430e030ddbb5b0abf93d22962f4752f3646cd9',
      'commit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ),
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions actions\/upload-artifact: version and commit do not match source/);
});

test('rejects a GitHub Action version that does not match the workflows', () => {
  const result = runFixture((value) => value.replace('version: v8.0.2', 'version: v8.0.0'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions actions\/download-artifact: version and commit do not match source/);
});

test('rejects an additional stale terse GitHub Action step', () => {
  const result = runSourceFixture({
    mutateWorkflow: (name, value) => name === 'source-security.yml'
      ? value.replace(
          /(^\s*uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1$)/m,
          '$1\n      - uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0',
        )
      : value,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions actions\/checkout: version and commit do not match source/);
});

for (const [description, staleStep] of [
  ['quoted GitHub Action key', '        "uses": actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0'],
  ['single-quoted GitHub Action key', "        'uses': actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0"],
  ['terse quoted GitHub Action key', '      - "uses": actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0'],
  ['flow-mapping GitHub Action step', '      - { uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0 }'],
  ['complex-mapping GitHub Action key', '      - ? uses\n        : actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0'],
  ['escaped quoted GitHub Action key', '        "u\\u0073es": actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0'],
]) {
  test(`rejects an additional stale ${description}`, () => {
    const result = runSourceFixture({
      mutateWorkflow: (name, value) => name === 'source-security.yml'
        ? value.replace(
            /(^\s*uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1$)/m,
            `$1\n${staleStep}`,
          )
        : value,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /github-actions source has unsupported|github-actions actions\/checkout: version and commit do not match source/);
  });
}

test('accepts and skips a local GitHub Action step', () => {
  const result = runSourceFixture({
    mutateWorkflow: (name, value) => name === 'source-security.yml'
      ? value.replace(
          /(^\s*uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1$)/m,
          '$1\n      - uses: ./.github/actions/local-check',
        )
      : value,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('rejects an inline flow collection containing a stale GitHub Action', () => {
  const result = runSourceFixture({
    mutateWorkflow: (name, value) => name === 'source-security.yml'
      ? value.replace(
          /(^\s*uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1$)/m,
          '$1\n        nested-steps: [{ uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0 }]',
        )
      : value,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions source has unsupported flow collection/);
});

test('rejects a tagged inline flow collection containing a stale GitHub Action', () => {
  const result = runSourceFixture({
    mutateWorkflow: (name, value) => name === 'source-security.yml'
      ? value.replace(
          /(^\s*uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1$)/m,
          '$1\n        nested-steps: !!seq [{ uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa # v7.0.0 }]',
        )
      : value,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /github-actions source has unsupported complex structure/);
});

for (const indicator of ['|', '>']) {
  test(`ignores uses-like text inside a workflow run: ${indicator} literal block`, () => {
    const result = runSourceFixture({
      mutateWorkflow: (name, value) => name === 'source-security.yml'
        ? value.replace(
            /^(\s*)run: \|$/m,
            (_line, indent) => `${indent}run: ${indicator}\n${indent}  printf '%s\\n' '"uses": ignored' '- { uses: ignored }' 'steps: [{ uses: ignored }]'`,
          )
        : value,
    });
    assert.equal(result.status, 0, result.stderr);
  });
}

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
  const result = runFixture((value) => `release: ${release}\n${value}`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate top-level key release/);
});
