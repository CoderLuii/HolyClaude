import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = 'scripts/patch-global-node-security-dependencies.mjs';
// Verbatim package.json from the official speech-rule-engine 4.1.5 archive.
const currentMarpOwner = readFileSync(new URL('./fixtures/speech-rule-engine-4.1.5.package.json', import.meta.url), 'utf8');

test('does not patch dependency trees already fixed by their upstream owners', () => {
  const source = readFileSync(script, 'utf8');
  assert.doesNotMatch(source, /eas-cli|netlify-cli|usr\/local\/lib\/node_modules\/(?:vercel|pm2)/);
});

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
  [
    'usr/local/lib/node_modules/@marp-team/marp-cli/node_modules/@xmldom/xmldom/package.json',
    '@xmldom/xmldom',
    '0.9.10',
    '0.9.12',
  ],
  ['usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/ws/package.json', 'ws', '8.18.0', '8.21.3'],
];

const dependencies = [
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

function setMarpTuple(root, ownerVersion, xmlVersion, dependencyVersion = xmlVersion) {
  const [xmlPath, xmlName] = packages.find(([path]) => path.endsWith('/marp-cli/node_modules/@xmldom/xmldom/package.json'));
  const [ownerPath, ownerName] = dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json'));
  writeJson(join(root, xmlPath), { name: xmlName, version: xmlVersion });
  writeJson(join(root, ownerPath), { name: ownerName, version: ownerVersion, dependencies: { '@xmldom/xmldom': dependencyVersion } });
  return join(root, ownerPath);
}

test('accepts only the exact historical and current official Marp baseline pairs', () => {
  for (const [ownerVersion, xmlVersion] of [['4.1.4', '0.9.10'], ['4.1.5', '0.9.12']]) {
    const root = fixture();
    const ownerPath = setMarpTuple(root, ownerVersion, xmlVersion);
    if (ownerVersion === '4.1.5') writeFileSync(ownerPath, currentMarpOwner);
    const baseline = run(root, true);
    assert.equal(baseline.status, 0, baseline.stderr);
    installReplacements(root);
    const patched = run(root);
    assert.equal(patched.status, 0, patched.stderr);
    const owner = JSON.parse(readFileSync(ownerPath));
    assert.equal(owner.version, ownerVersion);
    assert.equal(owner.dependencies['@xmldom/xmldom'], '0.9.12');
    if (ownerVersion === '4.1.5') {
      const expected = JSON.parse(currentMarpOwner);
      expected.dependencies['@xmldom/xmldom'] = '0.9.12';
      assert.deepEqual(owner, expected, 'preserve every other official owner field');
    }
    assert.equal(run(root).status, 0);
  }
});

test('rejects mixed and unreviewed Marp baseline pairs', () => {
  for (const tuple of [
    ['4.1.4', '0.9.12'],
    ['4.1.5', '0.9.10'],
    ['4.1.6', '0.9.12'],
    ['4.1.5', '0.9.13'],
    ['4.1.4', '0.9.10', '0.9.12'],
    ['4.1.5', '0.9.12', '0.9.10'],
    ['4.1.5', '0.9.12', '0.9.12'],
    ['4.1.5', '0.9.12', '^0.9.13'],
    ['4.1.5', '0.9.12', '>=0.9.12'],
  ]) {
    const root = fixture();
    setMarpTuple(root, ...tuple);
    assert.notEqual(run(root, true).status, 0, JSON.stringify(tuple));
  }
  const root = fixture();
  setMarpTuple(root, '4.1.5', '0.9.12', '0.9.10');
  installReplacements(root);
  assert.notEqual(run(root).status, 0, 'the current owner cannot carry the old dependency after replacement');
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
    packages.find(([path]) => path.endsWith('/marp-cli/node_modules/@xmldom/xmldom/package.json')),
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
    dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json')),
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
    dependencies.find(([path]) => path.endsWith('/marp-cli/node_modules/speech-rule-engine/package.json')),
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
