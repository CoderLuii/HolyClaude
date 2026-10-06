import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = 'scripts/patch-global-node-security-dependencies.mjs';

const packages = [
  [
    'home/claude/.local/share/cursor-agent/versions/2026.09.15-d2fe57e/node_modules/piscina/package.json',
    'piscina',
    '4.9.3',
    '4.9.4',
  ],
  [
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/undici/package.json',
    'undici',
    '8.9.0',
    '8.10.2',
  ],
  ['usr/local/lib/node_modules/eas-cli/node_modules/nanoid/package.json', 'nanoid', '3.3.8', '3.3.19'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/joi/package.json', 'joi', '17.11.0', '17.13.7'],
  ['usr/local/lib/node_modules/pm2/node_modules/js-yaml/package.json', 'js-yaml', '4.3.1', '4.3.2'],
  [
    'usr/local/lib/node_modules/@marp-team/marp-cli/node_modules/@xmldom/xmldom/package.json',
    '@xmldom/xmldom',
    '0.9.10',
    '0.9.12',
  ],
  ['usr/local/lib/node_modules/netlify-cli/node_modules/sharp/package.json', 'sharp', '0.34.5', '0.35.4'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/minimatch/package.json', 'minimatch', '5.1.2', '5.1.9'],
  ['usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/ws/package.json', 'ws', '8.18.0', '8.21.3'],
];

const dependencies = [
  [
    'usr/local/lib/node_modules/netlify-cli/package.json',
    'netlify-cli',
    '27.8.0',
    '@netlify/images',
    '^2.0.1',
    '^2.0.1',
  ],
  [
    'usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/images/package.json',
    '@netlify/images',
    '2.0.3',
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
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/package.json',
    '@earendil-works/pi-coding-agent',
    '0.85.1',
    'undici',
    '8.9.0',
    '8.10.2',
  ],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.7.0', 'nanoid', '3.3.8', '3.3.19'],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.7.0', 'joi', '17.11.0', '17.13.7'],
  [
    'usr/local/lib/node_modules/eas-cli/node_modules/@expo/eas-json/package.json',
    '@expo/eas-json',
    '24.5.0',
    'joi',
    '17.11.0',
    '17.13.7',
  ],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.7.0', 'minimatch', '5.1.2', '5.1.9'],
  [
    'usr/local/lib/node_modules/netlify-cli/node_modules/ipx/package.json',
    'ipx',
    '3.1.1',
    'sharp',
    '^0.34.3',
    '0.35.4',
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
  writeJson(join(root, path), { name, version: '4.9.2' });
  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected piscina@4\.9\.3/);
});

test('fails closed when the raw Cursor piscina baseline drifts', () => {
  const root = fixture();
  const [path, name] = packages.find(([path]) => path.includes('/cursor-agent/') && path.endsWith('/piscina/package.json'));
  writeJson(join(root, path), { name, version: '4.9.2' });
  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected piscina@4\.9\.3/);
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
    packages.find(([path]) => path.endsWith('/eas-cli/node_modules/joi/package.json')),
    packages.find(([path]) => path.endsWith('/pm2/node_modules/js-yaml/package.json')),
    packages.find(([path]) => path.endsWith('/marp-cli/node_modules/@xmldom/xmldom/package.json')),
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
    dependencies.find(([path, , , dependency]) => path.endsWith('/eas-cli/package.json') && dependency === 'joi'),
    dependencies.find(([path]) => path.endsWith('/@expo/eas-json/package.json')),
    dependencies.find(([path]) => path.endsWith('/pm2/package.json')),
    dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/ipx/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/@netlify/images/package.json')),
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
    dependencies.find(([path, , , dependency]) => path.endsWith('/eas-cli/package.json') && dependency === 'joi'),
    dependencies.find(([path]) => path.endsWith('/@expo/eas-json/package.json')),
    dependencies.find(([path]) => path.endsWith('/pm2/package.json')),
    dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/ipx/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/package.json')),
    dependencies.find(([path]) => path.endsWith('/netlify-cli/node_modules/@netlify/images/package.json')),
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
