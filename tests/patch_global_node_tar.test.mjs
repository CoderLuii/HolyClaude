import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    version: '24.7.0',
    dependencies: { tar: '7.5.19' },
  });
  writeJson(join(lib, 'eas-cli', 'node_modules', 'tar', 'package.json'), {
    name: 'tar',
    version: '7.5.19',
  });
  writeJson(join(lib, 'vercel', 'package.json'), {
    name: 'vercel',
    version: '62.4.0',
    dependencies: { 'smol-toml': '1.5.2' },
  });
  writeJson(join(lib, 'vercel', 'node_modules', '@vercel', 'container', 'package.json'), {
    name: '@vercel/container',
    version: '16.0.0',
    dependencies: { tar: '7.5.11', 'smol-toml': '1.5.2' },
  });
  return root;
}

function installReplacement(root) {
  writeJson(
    join(root, 'usr', 'local', 'lib', 'node_modules', 'eas-cli', 'node_modules', 'tar', 'package.json'),
    { name: 'tar', version: '7.5.22' },
  );
}

function run(root, checkBaseline = false, variant = 'full') {
  const args = [script, '--root', root, '--variant', variant];
  if (checkBaseline) args.push('--check-baseline');
  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('patches only the verified EAS tar dependency spec', () => {
  const root = fixture();
  const vercelManifest = join(root, 'usr', 'local', 'lib', 'node_modules', 'vercel', 'package.json');
  const vercelContainerManifest = join(
    root,
    'usr',
    'local',
    'lib',
    'node_modules',
    'vercel',
    'node_modules',
    '@vercel',
    'container',
    'package.json',
  );
  const vercelBefore = readFileSync(vercelManifest, 'utf8');
  const vercelContainerBefore = readFileSync(vercelContainerManifest, 'utf8');

  try {
    const baseline = run(root, true);
    assert.equal(baseline.status, 0, baseline.stderr);
    installReplacement(root);
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);

    const eas = JSON.parse(
      readFileSync(join(root, 'usr', 'local', 'lib', 'node_modules', 'eas-cli', 'package.json')),
    );
    assert.equal(eas.dependencies.tar, '7.5.22');
    assert.equal(readFileSync(vercelManifest, 'utf8'), vercelBefore);
    assert.equal(readFileSync(vercelContainerManifest, 'utf8'), vercelContainerBefore);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('does nothing in the slim variant', () => {
  const root = fixture();
  const easManifest = join(root, 'usr', 'local', 'lib', 'node_modules', 'eas-cli', 'package.json');
  const before = readFileSync(easManifest, 'utf8');

  try {
    assert.equal(run(root, true, 'slim').status, 0);
    assert.equal(run(root, false, 'slim').status, 0);
    assert.equal(readFileSync(easManifest, 'utf8'), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts an already patched verified EAS tree', () => {
  const root = fixture();
  try {
    installReplacement(root);
    assert.equal(run(root).status, 0);
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed when the EAS dependency spec drifts', () => {
  const root = fixture();
  const manifest = join(root, 'usr', 'local', 'lib', 'node_modules', 'eas-cli', 'package.json');
  const value = JSON.parse(readFileSync(manifest));
  value.dependencies.tar = '^7.5.19';
  writeJson(manifest, value);

  try {
    const result = run(root, true);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unexpected baseline tar dependency/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed when the EAS package version drifts', () => {
  const root = fixture();
  const manifest = join(root, 'usr', 'local', 'lib', 'node_modules', 'eas-cli', 'package.json');
  const value = JSON.parse(readFileSync(manifest));
  value.version = '24.7.1';
  writeJson(manifest, value);

  try {
    const result = run(root, true);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected eas-cli@24\.7\.0/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed unless the installed baseline EAS tar is exact', () => {
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
  writeJson(tarManifest, { name: 'tar', version: '7.5.18' });

  try {
    const result = run(root, true);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected tar@7\.5\.19/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails closed unless the replacement EAS tar is exact', () => {
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
  writeJson(tarManifest, { name: 'tar', version: '7.5.21' });

  try {
    const result = run(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected tar 7\.5\.22/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
