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
    'home/claude/.local/share/cursor-agent/versions/2026.09.08-6caf4ff/node_modules/piscina/package.json',
    'piscina',
    '4.9.3',
    '4.9.3',
  ],
  [
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/undici/package.json',
    'undici',
    '8.9.0',
    '8.10.2',
  ],
  ['usr/local/lib/node_modules/eas-cli/node_modules/nanoid/package.json', 'nanoid', '3.3.8', '3.3.18'],
  ['usr/local/lib/node_modules/pm2/node_modules/js-yaml/package.json', 'js-yaml', '4.3.1', '4.3.2'],
  ['usr/local/lib/node_modules/vercel/node_modules/js-yaml/package.json', 'js-yaml', '4.1.1', '4.3.2'],
  ['usr/local/lib/node_modules/vercel/node_modules/smol-toml/package.json', 'smol-toml', '1.5.2', '1.7.1'],
  [
    'usr/local/lib/node_modules/@marp-team/marp-cli/node_modules/@xmldom/xmldom/package.json',
    '@xmldom/xmldom',
    '0.9.10',
    '0.9.12',
  ],
  ['usr/local/lib/node_modules/wrangler/node_modules/sharp/package.json', 'sharp', '0.35.4', '0.35.4'],
  ['usr/local/lib/node_modules/netlify-cli/node_modules/sharp/package.json', 'sharp', '0.34.5', '0.35.4'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/minimatch/package.json', 'minimatch', '5.1.2', '5.1.9'],
  ['usr/local/lib/node_modules/vercel/node_modules/minimatch/package.json', 'minimatch', '10.1.1', '10.2.6'],
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
  ['usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/ws/package.json', 'ws', '8.18.0', '8.21.3'],
];

const dependencies = [
  [
    'usr/local/lib/node_modules/netlify-cli/package.json',
    'netlify-cli',
    '27.5.2',
    '@netlify/images',
    '^2.0.1',
    '^2.0.1',
  ],
  [
    'usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/images/package.json',
    '@netlify/images',
    '2.0.1',
    'ipx',
    '^3.1.1',
    '^3.1.1',
  ],
  ['usr/local/lib/node_modules/pm2/package.json', 'pm2', '7.0.4', 'js-yaml', '4.3.1', '4.3.2'],
  [
    'usr/local/lib/node_modules/@marp-team/marp-cli/node_modules/speech-rule-engine/package.json',
    'speech-rule-engine',
    '4.1.4',
    '@xmldom/xmldom',
    '0.9.10',
    '0.9.12',
  ],
  [
    'usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json',
    'miniflare',
    '5.20260910.0-alpha',
    'sharp',
    '0.35.4',
    '0.35.4',
  ],
  [
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/package.json',
    '@earendil-works/pi-coding-agent',
    '0.85.1',
    'undici',
    '8.9.0',
    '8.10.2',
  ],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.0.0', 'nanoid', '3.3.8', '3.3.18'],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.0.0', 'minimatch', '5.1.2', '5.1.9'],
  ['usr/local/lib/node_modules/vercel/package.json', 'vercel', '59.15.1', 'smol-toml', '1.5.2', '1.7.1'],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/python-analysis/package.json',
    '@vercel/python-analysis',
    '0.14.0',
    'smol-toml',
    '1.5.2',
    '1.7.1',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/rust/package.json',
    '@vercel/rust',
    '8.0.3',
    'smol-toml',
    '1.5.2',
    '1.7.1',
  ],
  [
    'usr/local/lib/node_modules/netlify-cli/node_modules/ipx/package.json',
    'ipx',
    '3.1.1',
    'sharp',
    '^0.34.3',
    '0.35.4',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/python-analysis/package.json',
    '@vercel/python-analysis',
    '0.14.0',
    'js-yaml',
    '4.1.1',
    '4.3.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/python-analysis/package.json',
    '@vercel/python-analysis',
    '0.14.0',
    'minimatch',
    '10.1.1',
    '10.2.6',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/backends/package.json',
    '@vercel/backends',
    '7.0.4',
    'path-to-regexp',
    '8.3.0',
    '8.4.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/express/package.json',
    '@vercel/express',
    '7.0.4',
    'path-to-regexp',
    '8.3.0',
    '8.4.2',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/hono/package.json',
    '@vercel/hono',
    '7.0.3',
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
    '12.0.3',
    'path-to-regexp',
    '6.1.0',
    '6.3.0',
  ],
  [
    'usr/local/lib/node_modules/vercel/node_modules/@vercel/remix-builder/package.json',
    '@vercel/remix-builder',
    '12.0.3',
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
    '8.21.3',
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
  for (const [path, name, version, dependency, baseline, , dependencyGroup = 'dependencies'] of dependencies) {
    const manifestPath = join(root, path);
    const value = (() => {
      try {
        return JSON.parse(readFileSync(manifestPath));
      } catch {
        return { name, version };
      }
    })();
    value[dependencyGroup] ??= {};
    value[dependencyGroup][dependency] = baseline;
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

  for (const [path, , , dependency, , target, dependencyGroup = 'dependencies'] of dependencies) {
    const value = JSON.parse(readFileSync(join(root, path)));
    assert.equal(value[dependencyGroup][dependency], target);
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
  const [path] = dependencies.find(([path]) => path.endsWith('/pi-coding-agent/package.json'));
  const value = JSON.parse(readFileSync(join(root, path)));
  value.dependencies.undici = 'unexpected';
  writeJson(join(root, path), value);
  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected undici dependency/);
});

test('fails closed when a reviewed full-image package baseline drifts', () => {
  for (const [path, name, baseline] of [
    packages.find(([path]) => path.endsWith('/pi-coding-agent/node_modules/undici/package.json')),
    packages.find(([path]) => path.endsWith('/eas-cli/node_modules/nanoid/package.json')),
    packages.find(([path]) => path.endsWith('/pm2/node_modules/js-yaml/package.json')),
    packages.find(([path]) => path.endsWith('/vercel/node_modules/js-yaml/package.json')),
    packages.find(([path]) => path.endsWith('/vercel/node_modules/smol-toml/package.json')),
    packages.find(([path]) => path.endsWith('/marp-cli/node_modules/@xmldom/xmldom/package.json')),
    packages.find(([path]) => path.endsWith('/wrangler/node_modules/sharp/package.json')),
    packages.find(([path]) => path.endsWith('/netlify-cli/node_modules/sharp/package.json')),
    packages.find(([path]) => path.endsWith('/next-on-pages/node_modules/ws/package.json')),
  ]) {
    const root = fixture();
    writeJson(join(root, path), { name, version: `${baseline}-drift` });
    const result = run(root, true);
    assert.notEqual(result.status, 0, `${name} baseline drift should fail`);
    assert.match(result.stderr, new RegExp(`expected ${name.replace('-', '\\-')}@${baseline.replaceAll('.', '\\.')}\\b`));
  }
});

test('fails closed when a reviewed dependency owner version drifts', () => {
  for (const [path, name, version] of [
    dependencies.find(([path]) => path.endsWith('/pi-coding-agent/package.json')),
    dependencies.find(([path, , , dependency]) => path.endsWith('/eas-cli/package.json') && dependency === 'nanoid'),
    dependencies.find(([path]) => path.endsWith('/pm2/package.json')),
    dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json')),
    dependencies.find(([path]) => path.endsWith('/wrangler/node_modules/miniflare/package.json')),
    dependencies.find(([path]) => path.endsWith('/vercel/package.json')),
    dependencies.find(([path, , , dependency]) => path.endsWith('/@vercel/python-analysis/package.json') && dependency === 'smol-toml'),
    dependencies.find(([path]) => path.endsWith('/@vercel/rust/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/ipx/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/@netlify/images/package.json')),
    dependencies.find(([path, , , dependency]) => path.endsWith('/@vercel/python-analysis/package.json') && dependency === 'js-yaml'),
    dependencies.find(([path]) => path.endsWith('/@vercel/backends/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/express/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/hono/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/node/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/remix-builder/package.json')),
  ]) {
    const root = fixture();
    const manifestPath = join(root, path);
    const value = JSON.parse(readFileSync(manifestPath));
    value.version = `${version}-drift`;
    writeJson(manifestPath, value);
    const result = run(root, true);
    assert.notEqual(result.status, 0, `${name} owner drift should fail`);
    assert.match(result.stderr, new RegExp(`expected ${name.replaceAll('/', '\\/')}@${version.replaceAll('.', '\\.')}\\b`));
  }
});

test('fails closed when a reviewed owner dependency baseline drifts', () => {
  for (const [path, , , dependency, , , dependencyGroup = 'dependencies'] of [
    dependencies.find(([path]) => path.endsWith('/pi-coding-agent/package.json')),
    dependencies.find(([path, , , dependency]) => path.endsWith('/eas-cli/package.json') && dependency === 'nanoid'),
    dependencies.find(([path]) => path.endsWith('/pm2/package.json')),
    dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json')),
    dependencies.find(([path]) => path.endsWith('/wrangler/node_modules/miniflare/package.json')),
    dependencies.find(([path]) => path.endsWith('/vercel/package.json')),
    dependencies.find(([path, , , dependency]) => path.endsWith('/@vercel/python-analysis/package.json') && dependency === 'smol-toml'),
    dependencies.find(([path]) => path.endsWith('/@vercel/rust/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/ipx/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/@netlify/images/package.json')),
    dependencies.find(([path, , , dependency]) => path.endsWith('/@vercel/python-analysis/package.json') && dependency === 'js-yaml'),
    dependencies.find(([path]) => path.endsWith('/@vercel/backends/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/express/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/hono/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/node/package.json')),
    dependencies.find(([path]) => path.endsWith('/@vercel/remix-builder/package.json')),
  ]) {
    const root = fixture();
    const manifestPath = join(root, path);
    const value = JSON.parse(readFileSync(manifestPath));
    value[dependencyGroup][dependency] = 'unexpected';
    writeJson(manifestPath, value);
    const result = run(root, true);
    assert.notEqual(result.status, 0, `${dependency} owner declaration drift should fail`);
    assert.match(result.stderr, new RegExp(`unexpected ${dependency} dependency`));
  }
});
