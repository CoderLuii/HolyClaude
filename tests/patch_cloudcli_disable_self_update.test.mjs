import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-disable-self-update.mjs');
const cloudcliTarball = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.37.2-holyclaude-account-management.tgz');

const serviceTargets = [
  'server/modules/system/system.service.ts',
  'dist-server/server/modules/system/system.service.js'
];

async function unpackCloudCli() {
  const unpackRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-'));
  await execFileAsync('tar', ['-xzf', cloudcliTarball, '-C', unpackRoot]);
  return path.join(unpackRoot, 'package');
}

async function runPatch(cloudcliRoot) {
  return execFileAsync(process.execPath, [patchScript, cloudcliRoot], {
    cwd: repoRoot
  });
}

async function readCloudCliFile(cloudcliRoot, relativePath) {
  return readFile(path.join(cloudcliRoot, relativePath), 'utf8');
}

function assertPatchedService(source, relativePath) {
  assert.ok(
    source.includes('const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;'),
    `${relativePath} should contain the self-update disabled marker`
  );
  assert.ok(source.includes('success: false,'), `${relativePath} should return a failed update result`);
  assert.ok(source.includes('docker compose pull && docker compose up -d'), `${relativePath} should direct users to image updates`);
  assert.equal(
    source.includes('npm install -g @cloudcli-ai/cloudcli@latest'),
    false,
    `${relativePath} should remove the npm global self-update command`
  );
}

test('CloudCLI self-update patch disables the modular update service', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of serviceTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('npm install -g @cloudcli-ai/cloudcli@latest'), `${target} fixture should start with update command`);
  }

  await runPatch(cloudcliRoot);

  const firstRunSources = new Map();
  for (const target of serviceTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    firstRunSources.set(target, source);
    assertPatchedService(source, target);
  }

  await runPatch(cloudcliRoot);

  for (const target of serviceTargets) {
    assert.equal(
      await readCloudCliFile(cloudcliRoot, target),
      firstRunSources.get(target),
      `${target} should not change when the patch runs twice`
    );
  }
});

test('CloudCLI self-update patch fails closed when the update anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of serviceTargets) {
    const servicePath = path.join(cloudcliRoot, target);
    const source = await readFile(servicePath, 'utf8');
    await writeFile(
      servicePath,
      source.replace('async updateSystem()', 'async updateSystemRenamed()')
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI self-update anchors not found/
  );
});
