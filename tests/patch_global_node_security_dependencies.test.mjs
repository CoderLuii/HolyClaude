import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = 'scripts/patch-global-node-security-dependencies.mjs';

const packages = [
  ['usr/local/lib/node_modules/npm/node_modules/brace-expansion/package.json', 'brace-expansion', '5.0.7', '5.0.9'],
  [
    'home/claude/.local/share/cursor-agent/versions/2026.07.23-e383d2b/node_modules/piscina/package.json',
    'piscina',
    '4.9.0',
    '4.9.3',
  ],
  [
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/brace-expansion/package.json',
    'brace-expansion',
    '5.0.7',
    '5.0.9',
  ],
  ['usr/local/lib/node_modules/sharp-cli/node_modules/glob/package.json', 'glob', '11.0.3', '11.1.0'],
  ['usr/local/lib/node_modules/vercel/node_modules/js-yaml/package.json', 'js-yaml', '4.1.1', '4.3.0'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/minimatch/package.json', 'minimatch', '5.1.2', '5.1.9'],
  ['usr/local/lib/node_modules/vercel/node_modules/minimatch/package.json', 'minimatch', '10.1.1', '10.2.6'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/node-forge/package.json', 'node-forge', '1.3.1', '1.4.0'],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/node/node_modules/path-to-regexp/package.json',
    'path-to-regexp',
    '6.1.0',
    '6.3.0',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/remix-builder/node_modules/path-to-regexp/package.json',
    'path-to-regexp',
    '6.1.0',
    '6.3.0',
  ],
  ['usr/local/lib/node_modules/vercel/node_modules/path-to-regexp/package.json', 'path-to-regexp', '8.3.0', '8.4.2'],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/fun/node_modules/path-to-regexp/package.json',
    'path-to-regexp',
    '8.2.0',
    '8.4.2',
  ],
  ['usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/ws/package.json', 'ws', '8.18.0', '8.21.1'],
];

const dependencies = [
  ['usr/local/lib/node_modules/sharp-cli/package.json', 'sharp-cli', '5.2.0', 'glob', '11.0.x', '11.1.0'],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '20.5.1', 'minimatch', '5.1.2', '5.1.9'],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '20.5.1', 'node-forge', '1.3.1', '1.4.0'],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/python-analysis/package.json',
    '@vercel/python-analysis',
    '0.11.1',
    'js-yaml',
    '4.1.1',
    '4.3.0',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/python-analysis/package.json',
    '@vercel/python-analysis',
    '0.11.1',
    'minimatch',
    '10.1.1',
    '10.2.6',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/backends/package.json',
    '@vercel/backends',
    '0.8.21',
    'path-to-regexp',
    '8.3.0',
    '8.4.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/express/package.json',
    '@vercel/express',
    '0.1.112',
    'path-to-regexp',
    '8.3.0',
    '8.4.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/hono/package.json',
    '@vercel/hono',
    '0.2.101',
    'path-to-regexp',
    '8.3.0',
    '8.4.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/fun/package.json',
    '@vercel/fun',
    '1.3.0',
    'path-to-regexp',
    '8.2.0',
    '8.4.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/node/package.json',
    '@vercel/node',
    '5.8.22',
    'path-to-regexp',
    '6.1.0',
    '6.3.0',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/remix-builder/package.json',
    '@vercel/remix-builder',
    '5.9.1',
    'path-to-regexp',
    '6.1.0',
    '6.3.0',
  ],
  [
    'usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/miniflare/package.json',
    'miniflare',
    '3.20250718.3',
    'ws',
    '8.18.0',
    '8.21.1',
  ],
];

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-node-security-'));
  for (const [path, name, baseline] of packages) {
    writeJson(join(root, path), { name, version: baseline });
  }
  for (const [path, name, version, dependency, baseline] of dependencies) {
    const manifestPath = join(root, path);
    const value = (() => {
      try {
        return JSON.parse(readFileSync(manifestPath));
      } catch {
        return { name, version, dependencies: {} };
      }
    })();
    value.dependencies[dependency] = baseline;
    writeJson(manifestPath, value);
  }
  return root;
}

function installReplacements(root) {
  for (const [path, name, , target] of packages) {
    writeJson(join(root, path), { name, version: target });
  }
}

function run(root, checkBaseline = false) {
  const args = [script, '--root', root, '--variant', 'full'];
  if (checkBaseline) args.push('--check-baseline');
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
}

test('patches only verified full-image dependency specs', () => {
  const root = fixture();
  assert.equal(run(root, true).status, 0);
  installReplacements(root);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);

  for (const [path, , , dependency, , target] of dependencies) {
    const value = JSON.parse(readFileSync(join(root, path)));
    assert.equal(value.dependencies[dependency], target);
  }
});

test('accepts an already patched verified tree', () => {
  const root = fixture();
  installReplacements(root);
  assert.equal(run(root).status, 0);
  assert.equal(run(root).status, 0);
});

test('fails closed when an installed package drifts', () => {
  const root = fixture();
  const [path, name] = packages[0];
  writeJson(join(root, path), { name, version: '5.0.8' });
  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected brace-expansion@5\.0\.7/);
});

test('fails closed when a dependency specification drifts', () => {
  const root = fixture();
  const [path] = dependencies[0];
  const value = JSON.parse(readFileSync(join(root, path)));
  value.dependencies.glob = '^11.0.0';
  writeJson(join(root, path), value);
  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected glob dependency/);
});
