import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const detectorScript = path.join(repoRoot, 'scripts/verify-cloudcli-account-management-support.mjs');
const bridgeTarball = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.36.2-holyclaude-account-management.tgz');

async function runDetector(targetPath) {
  const { stdout } = await execFileAsync(process.execPath, [detectorScript, targetPath], { cwd: repoRoot });
  return JSON.parse(stdout);
}

async function runDetectorRejects(targetPath, expectedState = 'partial-or-drifted') {
  await assert.rejects(
    async () => execFileAsync(process.execPath, [detectorScript, targetPath], { cwd: repoRoot }),
    (error) => {
      assert.equal(error.code, 1);
      const payload = JSON.parse(error.stdout);
      assert.equal(payload.state, expectedState);
      assert.equal(payload.ok, false);
      return true;
    }
  );
}

async function unpackArtifact(artifactPath) {
  const unpackRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-account-'));
  await execFileAsync('tar', ['-xzf', artifactPath, '-C', unpackRoot]);
  return path.join(unpackRoot, 'package');
}

async function collectJavaScriptFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const filePath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await collectJavaScriptFiles(filePath));
    else if (entry.name.endsWith('.js')) files.push(filePath);
  }
  return files;
}

test('CloudCLI account-management detector accepts generated HolyClaude bridge artifact', async () => {
  const payload = await runDetector(bridgeTarball);
  assert.equal(payload.state, 'holyclaude-bridge-complete');
  assert.equal(payload.ok, true);
  assert.equal(payload.checks.clientAssets, true);
});

test('CloudCLI account-management detector accepts upstream support without HolyClaude bridge markers', async () => {
  const cloudcliRoot = await unpackArtifact(bridgeTarball);
  for (const target of ['server/routes/auth.js', 'dist-server/server/routes/auth.js']) {
    const filePath = path.join(cloudcliRoot, target);
    const source = await readFile(filePath, 'utf8');
    await writeFile(filePath, source.replaceAll('HOLYCLAUDE_ACCOUNT_MANAGEMENT_BRIDGE', 'UPSTREAM_ACCOUNT_MANAGEMENT'));
  }

  const payload = await runDetector(cloudcliRoot);
  assert.equal(payload.state, 'upstream-complete');
  assert.equal(payload.ok, true);
});

test('CloudCLI account-management detector fails closed for an unsupported known baseline', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-unsupported-'));
  await mkdir(path.join(fixtureRoot, 'server/routes'), { recursive: true });
  await mkdir(path.join(fixtureRoot, 'dist-server/server/routes'), { recursive: true });
  await writeFile(path.join(fixtureRoot, 'package.json'), JSON.stringify({ name: '@cloudcli-ai/cloudcli', version: '1.36.1' }));
  await writeFile(path.join(fixtureRoot, 'server/routes/auth.js'), "router.post('/logout', authenticateToken, () => {});");
  await writeFile(path.join(fixtureRoot, 'dist-server/server/routes/auth.js'), "router.post('/logout', authenticateToken, () => {});");

  await runDetectorRejects(fixtureRoot, 'unsupported-known');
});

test('CloudCLI account-management detector fails closed when the client bundle drifts', async () => {
  const cloudcliRoot = await unpackArtifact(bridgeTarball);
  const assetsDir = path.join(cloudcliRoot, 'dist/assets');
  let assetPath = null;
  let source = '';
  for (const candidate of await collectJavaScriptFiles(assetsDir)) {
    const candidateSource = await readFile(candidate, 'utf8');
    if (candidateSource.includes('/api/auth/change-password')) {
      assetPath = candidate;
      source = candidateSource;
      break;
    }
  }
  assert.ok(assetPath, 'fixture should contain a client bundle with account-management markers');
  await writeFile(
    assetPath,
    source
      .replaceAll('/api/auth/change-password', '/api/auth/change-password-disabled')
      .replaceAll('Logout removes the saved browser token', 'Logout unavailable')
      .replaceAll('Change Password', 'Password Settings')
  );

  await runDetectorRejects(cloudcliRoot);
});
