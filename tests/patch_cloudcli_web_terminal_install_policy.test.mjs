import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-web-terminal-install-policy.mjs');
const committedLock = path.join(
  repoRoot,
  'vendor/locks/cloudcli-web-terminal-8aa41f614c216d961e7c0d9c3e67982c6b2d9da3.package-lock.json',
);

const upstreamPackage = {
  name: 'cloudcli-plugin-terminal',
  version: '1.0.2',
  private: true,
  type: 'module',
  description: 'Full-featured web terminal plugin for CloudCLI UI',
  scripts: {
    build: 'tsc',
    dev: 'tsc --watch',
  },
  dependencies: {
    'node-pty': '^1.1.0',
    ws: '^8.14.0',
  },
  devDependencies: {
    typescript: '^5.5.0',
    '@types/node': '^20.0.0',
    '@types/ws': '^8.5.0',
  },
};

async function createFixture() {
  const pluginRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-web-terminal-policy-'));
  await writeFile(path.join(pluginRoot, 'package.json'), `${JSON.stringify(upstreamPackage, null, 2)}\n`);
  await copyFile(committedLock, path.join(pluginRoot, 'package-lock.json'));
  return pluginRoot;
}

async function runPatch(pluginRoot) {
  return execFileAsync(process.execPath, [patchScript, pluginRoot], { cwd: repoRoot });
}

test('Web Terminal install policy approves only the integrity-pinned node-pty lifecycle scripts', async (t) => {
  const pluginRoot = await createFixture();
  t.after(() => rm(pluginRoot, { recursive: true, force: true }));

  await runPatch(pluginRoot);

  const patched = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  assert.deepEqual(patched.allowScripts, { 'node-pty@1.1.0': true });
  assert.deepEqual(patched.dependencies, upstreamPackage.dependencies);

  await runPatch(pluginRoot);
  const secondRun = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  assert.deepEqual(secondRun.allowScripts, { 'node-pty@1.1.0': true });
});

test('Web Terminal install policy fails closed when node-pty integrity drifts', async (t) => {
  const pluginRoot = await createFixture();
  t.after(() => rm(pluginRoot, { recursive: true, force: true }));
  const lockPath = path.join(pluginRoot, 'package-lock.json');
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  lock.packages['node_modules/node-pty'].integrity = 'sha512-drift';
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  await assert.rejects(() => runPatch(pluginRoot), /unexpected node-pty@1\.1\.0 lock metadata/);
});
