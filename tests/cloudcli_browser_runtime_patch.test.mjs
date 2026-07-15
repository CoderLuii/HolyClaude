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
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-browser-runtime.mjs');
const cloudcliTarball = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.36.2-holyclaude-account-management.tgz');
const marker = '// HolyClaude canonical browser runtime';
const executablePathField = 'executablePath: process.env.CHROME_PATH,';
const readinessField = 'const executablePath = process.env.CHROME_PATH || playwright.chromium.executablePath();';
const targets = [
  'server/modules/browser-use/browser-use.service.ts',
  'dist-server/server/modules/browser-use/browser-use.service.js'
];

async function unpackCloudCli() {
  const unpackRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-browser-runtime-'));
  await execFileAsync('tar', ['-xzf', cloudcliTarball, '-C', unpackRoot]);
  return path.join(unpackRoot, 'package');
}

async function runPatch(cloudcliRoot) {
  return execFileAsync(process.execPath, [patchScript, cloudcliRoot], {
    cwd: repoRoot
  });
}

test('CloudCLI browser runtime patch covers source and runtime and is idempotent', async () => {
  const cloudcliRoot = await unpackCloudCli();
  await runPatch(cloudcliRoot);

  const firstRunSources = new Map();
  for (const target of targets) {
    const source = await readFile(path.join(cloudcliRoot, target), 'utf8');
    firstRunSources.set(target, source);
    assert.equal(source.split(marker).length - 1, 1, `${target} should contain one patch marker`);
    assert.equal(source.split(executablePathField).length - 1, 1, `${target} should contain one executable path field`);
    assert.equal(source.split(readinessField).length - 1, 1, `${target} should contain one readiness path field`);
    assert.ok(source.includes('headless: true,'), `${target} should preserve headless mode`);
    assert.ok(source.includes("args: ['--disable-dev-shm-usage'],"), `${target} should preserve upstream launch args`);
  }

  await runPatch(cloudcliRoot);
  for (const target of targets) {
    assert.equal(
      await readFile(path.join(cloudcliRoot, target), 'utf8'),
      firstRunSources.get(target),
      `${target} should not change when patched twice`
    );
  }
});

test('CloudCLI browser runtime patch fails closed when a launch anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();
  const targetPath = path.join(cloudcliRoot, targets[1]);
  const source = await readFile(targetPath, 'utf8');
  await writeFile(targetPath, source.replace('headless: true,', 'headless: false,'));

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI browser runtime anchors not found/
  );
});

test('Dockerfile applies and verifies the CloudCLI browser runtime patch', async () => {
  const dockerfile = await readFile(path.join(repoRoot, 'Dockerfile'), 'utf8');
  const copyAnchor = 'COPY scripts/patch-cloudcli-browser-runtime.mjs /tmp/patch-cloudcli-browser-runtime.mjs';
  const runAnchor = 'RUN node /tmp/patch-cloudcli-browser-runtime.mjs && rm -f /tmp/patch-cloudcli-browser-runtime.mjs';
  const installAnchor = 'RUN npm i -g /tmp/vendor/cloudcli-ai-cloudcli.tgz && rm -f /tmp/vendor/cloudcli-ai-cloudcli.tgz';

  assert.ok(dockerfile.includes(copyAnchor));
  assert.ok(dockerfile.includes(runAnchor));
  assert.ok(dockerfile.indexOf(runAnchor) > dockerfile.indexOf(installAnchor));
  assert.ok(dockerfile.includes(`grep -Fq "${marker}" "$CLOUDCLI_BROWSER_USE"`));
  assert.ok(dockerfile.includes(`grep -Fq "${executablePathField}" "$CLOUDCLI_BROWSER_USE"`));
  assert.ok(dockerfile.includes(`grep -Fq "${readinessField}" "$CLOUDCLI_BROWSER_USE"`));
});
