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
  'vendor/locks/cloudcli-web-terminal-6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d.package-lock.json',
);

const upstreamPackage = {
  name: 'cloudcli-plugin-terminal',
  version: '1.1.0',
  private: true,
  type: 'module',
  description: 'Full-featured web terminal plugin for CloudCLI UI',
  scripts: {
    build: 'node scripts/build.mjs',
    typecheck: 'tsc --noEmit',
    test: 'node --test "test/**/*.test.mjs"',
    dev: 'node scripts/build.mjs --watch',
  },
  dependencies: {
    '@xterm/addon-clipboard': '^0.1.0',
    '@xterm/addon-fit': '^0.10.0',
    '@xterm/addon-search': '^0.15.0',
    '@xterm/addon-unicode11': '^0.8.0',
    '@xterm/addon-web-links': '^0.11.0',
    '@xterm/addon-webgl': '^0.18.0',
    '@xterm/xterm': '^5.5.0',
    esbuild: '^0.25.0',
    'node-pty': '^1.1.0',
    ws: '^8.18.0',
  },
  devDependencies: {
    typescript: '^5.5.0',
    '@types/node': '^22.0.0',
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
  assert.deepEqual(patched.allowScripts, { 'esbuild@0.25.12': true, 'node-pty@1.1.0': true });
  assert.deepEqual(patched.dependencies, upstreamPackage.dependencies);

  await runPatch(pluginRoot);
  const secondRun = JSON.parse(await readFile(path.join(pluginRoot, 'package.json'), 'utf8'));
  assert.deepEqual(secondRun.allowScripts, { 'esbuild@0.25.12': true, 'node-pty@1.1.0': true });
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

test('Web Terminal install policy fails closed when esbuild integrity drifts', async (t) => {
  const pluginRoot = await createFixture();
  t.after(() => rm(pluginRoot, { recursive: true, force: true }));
  const lockPath = path.join(pluginRoot, 'package-lock.json');
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));
  lock.packages['node_modules/esbuild'].integrity = 'sha512-drift';
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  await assert.rejects(() => runPatch(pluginRoot), /unexpected esbuild@0\.25\.12 lock metadata/);
});
