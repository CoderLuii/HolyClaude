import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = 'scripts/patch-global-node-tar.mjs';

function writeJson(path, value) {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-node-tar-'));
  const lib = join(root, 'usr', 'local', 'lib', 'node_modules');
  writeJson(join(lib, 'eas-cli', 'package.json'), {
    name: 'eas-cli',
    version: '20.5.1',
    dependencies: { tar: '7.5.7' },
  });
  writeJson(join(lib, 'eas-cli', 'node_modules', 'tar', 'package.json'), {
    name: 'tar',
    version: '7.5.7',
  });
  writeJson(join(lib, 'vercel', 'package.json'), {
    name: 'vercel',
    version: '54.21.1',
  });
  writeJson(join(lib, 'vercel', 'node_modules', '@vercel', 'fun', 'package.json'), {
    name: '@vercel/fun',
    version: '1.3.0',
    dependencies: { tar: '7.5.7' },
  });
  writeJson(join(lib, 'vercel', 'node_modules', 'tar', 'package.json'), {
    name: 'tar',
    version: '7.5.7',
  });
  return root;
}

function installReplacement(root) {
  const lib = join(root, 'usr', 'local', 'lib', 'node_modules');
  for (const path of [
    join(lib, 'eas-cli', 'node_modules', 'tar', 'package.json'),
    join(lib, 'vercel', 'node_modules', 'tar', 'package.json'),
  ]) {
    writeJson(path, { name: 'tar', version: '7.5.20' });
  }
}

function run(root, checkBaseline = false) {
  const args = [script, '--root', root];
  if (checkBaseline) args.push('--check-baseline');
  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('patches only the verified EAS and Vercel tar dependency specs', () => {
  const root = fixture();
  const baseline = run(root, true);
  assert.equal(baseline.status, 0, baseline.stderr);
  installReplacement(root);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);

  const lib = join(root, 'usr', 'local', 'lib', 'node_modules');
  const eas = JSON.parse(readFileSync(join(lib, 'eas-cli', 'package.json')));
  const vercelFun = JSON.parse(
    readFileSync(join(lib, 'vercel', 'node_modules', '@vercel', 'fun', 'package.json')),
  );
  assert.equal(eas.dependencies.tar, '7.5.20');
  assert.equal(vercelFun.dependencies.tar, '7.5.20');
});

test('accepts an already patched verified tree', () => {
  const root = fixture();
  installReplacement(root);
  assert.equal(run(root).status, 0);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
});

test('fails closed when an expected dependency spec drifts', () => {
  const root = fixture();
  const manifest = join(
    root,
    'usr',
    'local',
    'lib',
    'node_modules',
    'vercel',
    'node_modules',
    '@vercel',
    'fun',
    'package.json',
  );
  const value = JSON.parse(readFileSync(manifest));
  value.dependencies.tar = '^7.5.7';
  writeJson(manifest, value);

  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected baseline tar dependency/);
});

test('fails closed unless both installed baseline packages are exact', () => {
  const root = fixture();
  const tarManifest = join(
    root,
    'usr',
    'local',
    'lib',
    'node_modules',
    'eas-cli',
    'node_modules',
    'tar',
    'package.json',
  );
  writeJson(tarManifest, { name: 'tar', version: '7.5.8' });

  const result = run(root, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected tar@7\.5\.7/);
});

test('fails closed unless both replacement packages are exact', () => {
  const root = fixture();
  installReplacement(root);
  const tarManifest = join(
    root,
    'usr',
    'local',
    'lib',
    'node_modules',
    'eas-cli',
    'node_modules',
    'tar',
    'package.json',
  );
  writeJson(tarManifest, { name: 'tar', version: '7.5.19' });

  const result = run(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected tar 7\.5\.20/);
});
