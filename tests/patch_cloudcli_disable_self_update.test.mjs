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
const cloudcliTarball = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.35.1.tgz');

const indexTargets = [
  'server/index.js',
  'dist-server/server/index.js'
];

const cliTargets = [
  'server/cli.js',
  'dist-server/server/cli.js'
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

function countOccurrences(source, searchText) {
  return source.split(searchText).length - 1;
}

function assertPatchedIndex(source, relativePath) {
  assert.equal(
    countOccurrences(source, 'const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {'),
    1,
    `${relativePath} should contain exactly one HolyClaude update response marker`
  );
  assert.equal(
    countOccurrences(source, 'const expandWorkspacePath = (inputPath) => {'),
    1,
    `${relativePath} should preserve exactly one expandWorkspacePath helper`
  );
  assert.ok(
    source.includes("app.post('/api/system/update', authenticateToken, async (req, res) => {"),
    `${relativePath} should keep the system update route`
  );
  assert.ok(
    source.includes('res.status(409).json(HOLYCLAUDE_UPDATE_DISABLED_RESPONSE);'),
    `${relativePath} should return the disabled update response`
  );
  assert.ok(
    source.includes("app.get('/api/browse-filesystem', authenticateToken, async (req, res) => {"),
    `${relativePath} should keep the browse route`
  );
  assert.ok(
    source.includes("app.post('/api/create-folder', authenticateToken, async (req, res) => {"),
    `${relativePath} should keep the create-folder route`
  );
  assert.ok(
    source.includes('let targetPath = dirPath ? expandWorkspacePath(dirPath) : defaultRoot;'),
    `${relativePath} should keep browse route tilde expansion`
  );
  assert.ok(
    source.includes('const expandedPath = expandWorkspacePath(folderPath);'),
    `${relativePath} should keep create-folder tilde expansion`
  );
  assert.equal(
    source.includes('npm install -g @cloudcli-ai/cloudcli@latest'),
    false,
    `${relativePath} should remove the npm global self-update command`
  );

  const updateRouteIndex = source.indexOf("app.post('/api/system/update'");
  const helperIndex = source.indexOf('const expandWorkspacePath');
  const browseRouteIndex = source.indexOf("app.get('/api/browse-filesystem'");
  const createFolderRouteIndex = source.indexOf("app.post('/api/create-folder'");

  assert.ok(updateRouteIndex < helperIndex, `${relativePath} should leave the helper after the update route`);
  assert.ok(helperIndex < browseRouteIndex, `${relativePath} should define the helper before browsing uses it`);
  assert.ok(helperIndex < createFolderRouteIndex, `${relativePath} should define the helper before folder creation uses it`);
}

function assertPatchedCli(source, relativePath) {
  assert.ok(
    source.includes('const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;'),
    `${relativePath} should contain the CLI self-update disabled marker`
  );
  assert.equal(
    source.includes("execSync('npm update -g @cloudcli-ai/cloudcli', { stdio: 'inherit' });"),
    false,
    `${relativePath} should remove the CLI npm self-update command`
  );
  assert.equal(
    source.includes("Run ${c.bright('cloudcli update')} to update"),
    false,
    `${relativePath} should remove the old update prompt`
  );
}

test('CloudCLI self-update patch preserves workspace browse helpers', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of indexTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('const expandWorkspacePath = (inputPath) => {'), `${target} fixture should start with helper`);
    assert.ok(source.includes('npm install -g @cloudcli-ai/cloudcli@latest'), `${target} fixture should start with update command`);
  }

  await runPatch(cloudcliRoot);

  const firstRunSources = new Map();
  for (const target of [...indexTargets, ...cliTargets]) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    firstRunSources.set(target, source);
    if (indexTargets.includes(target)) {
      assertPatchedIndex(source, target);
    } else {
      assertPatchedCli(source, target);
    }
  }

  await runPatch(cloudcliRoot);

  for (const target of [...indexTargets, ...cliTargets]) {
    assert.equal(
      await readCloudCliFile(cloudcliRoot, target),
      firstRunSources.get(target),
      `${target} should not change when the patch runs twice`
    );
  }
});

test('CloudCLI self-update patch fails closed when the route anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of indexTargets) {
    const indexPath = path.join(cloudcliRoot, target);
    const source = await readFile(indexPath, 'utf8');
    await writeFile(
      indexPath,
      source.replace("app.post('/api/system/update'", "app.post('/api/system/update-renamed'")
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI self-update anchors not found/
  );
});
