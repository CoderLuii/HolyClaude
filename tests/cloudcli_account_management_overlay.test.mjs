import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = path.join(repoRoot, 'vendor/artifacts/cloudcli-account-management.manifest.json');

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function unpackArtifact(artifactPath) {
  const unpackRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-account-'));
  await execFileAsync('tar', ['-xzf', artifactPath, '-C', unpackRoot]);
  return path.join(unpackRoot, 'package');
}

async function readCloudCliFile(cloudcliRoot, relativePath) {
  return readFile(path.join(cloudcliRoot, relativePath), 'utf8');
}

async function collectFiles(root, prefix = '') {
  const entries = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name).replaceAll(path.sep, '/');
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      entries.push(...await collectFiles(fullPath, relativePath));
    } else {
      entries.push(relativePath);
    }
  }
  return entries;
}

test('CloudCLI account-management manifest matches the generated artifact and patch files', async () => {
  const manifest = await readManifest();
  const artifactPath = path.join(repoRoot, 'vendor/artifacts', manifest.artifact.file);
  const artifactBuffer = await readFile(artifactPath);

  assert.equal(manifest.bridge, 'cloudcli-account-management');
  assert.equal(manifest.state, 'holyclaude-bridge-complete');
  assert.equal(manifest.upstream.version, '1.36.2');
  assert.equal(manifest.build.node, 'v26.5.0');
  assert.equal(manifest.build.npm, '11.17.0');
  assert.match(manifest.build.image, /^node:26\.5\.0-bookworm-slim@sha256:[0-9a-f]{64}$/);
  assert.match(manifest.artifact.shrinkwrapSha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.artifact.productionDependencyTreeSha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.artifact.duplicatePackSha256, manifest.artifact.sha256);
  assert.equal(sha256(artifactBuffer), manifest.artifact.sha256);

  const cloudcliRoot = await unpackArtifact(artifactPath);
  const shrinkwrap = JSON.parse(await readFile(path.join(cloudcliRoot, 'npm-shrinkwrap.json'), 'utf8'));
  assert.equal(shrinkwrap.packages['node_modules/better-sqlite3'].version, '12.11.1');
  const packageFileListSha256 = createHash('sha256')
    .update((await collectFiles(cloudcliRoot)).sort().join('\n'))
    .digest('hex');
  assert.equal(packageFileListSha256, manifest.artifact.packageFileListSha256);

  for (const patch of manifest.patches) {
    const patchBuffer = await readFile(path.join(repoRoot, 'vendor/patches/cloudcli-account-management', patch.file));
    assert.equal(sha256(patchBuffer), patch.sha256, `${patch.file} hash should match manifest`);
  }
});

test('CloudCLI account-management artifact contains patched source runtime and client assets', async () => {
  const manifest = await readManifest();
  const artifactPath = path.join(repoRoot, 'vendor/artifacts', manifest.artifact.file);
  const cloudcliRoot = await unpackArtifact(artifactPath);

  for (const target of ['server/routes/auth.js', 'dist-server/server/routes/auth.js']) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes("router.post('/change-password'"), `${target} should expose change-password route`);
    assert.ok(source.includes('auth_token_generation'), `${target} should rotate auth token generation`);
    assert.ok(source.includes('HOLYCLAUDE_ACCOUNT_MANAGEMENT_BRIDGE'), `${target} should keep bridge marker`);
  }

  for (const target of ['server/middleware/auth.js', 'dist-server/server/middleware/auth.js']) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('authTokenGeneration'), `${target} should validate token generation`);
    assert.ok(source.includes('authenticateWebSocket'), `${target} should keep WebSocket auth`);
  }

  const assetsRoot = path.join(cloudcliRoot, 'dist/assets');
  const assetFiles = (await collectFiles(assetsRoot))
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(assetsRoot, file));
  const clientBundle = (await Promise.all(
    assetFiles.map((file) => readFile(file, 'utf8'))
  )).join('\n');

  assert.ok(clientBundle.includes('/api/auth/change-password'), 'client bundle should call change-password API');
  assert.ok(clientBundle.includes('Change Password'), 'client bundle should include Change Password UI');
  assert.ok(clientBundle.includes('Logout removes the saved browser token'), 'client bundle should include Logout UI copy');
});
