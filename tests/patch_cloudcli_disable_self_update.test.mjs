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

// CloudCLI 1.37.x replaced the flat server/cli.js and server/index.js with the cli and
// system modules, so the patch now spans four files per tree.
const cliServiceTargets = [
  'server/modules/cli/cli.service.ts',
  'dist-server/server/modules/cli/cli.service.js'
];

const cliModuleTargets = [
  'server/modules/cli/cli.module.ts',
  'dist-server/server/modules/cli/cli.module.js'
];

const systemRouteTargets = [
  'server/modules/system/system.routes.ts',
  'dist-server/server/modules/system/system.routes.js'
];

const systemServiceTargets = [
  'server/modules/system/system.service.ts',
  'dist-server/server/modules/system/system.service.js'
];

const fileTreeRouteTargets = [
  'server/modules/file-tree/file-tree.routes.ts',
  'dist-server/server/modules/file-tree/file-tree.routes.js'
];

const fileTreeServiceTargets = [
  'server/modules/file-tree/file-tree.service.ts',
  'dist-server/server/modules/file-tree/file-tree.service.js'
];

const allTargets = [
  ...cliServiceTargets,
  ...cliModuleTargets,
  ...systemRouteTargets,
  ...systemServiceTargets
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

function assertPatchedCliService(source, relativePath) {
  assert.equal(
    countOccurrences(source, 'const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;'),
    1,
    `${relativePath} should contain exactly one CLI self-update disabled marker`
  );
  assert.ok(
    source.includes('CloudCLI self-update is disabled in HolyClaude.'),
    `${relativePath} should explain that self-update is disabled`
  );
  assert.ok(
    source.includes("const HOLYCLAUDE_DOCKER_UPDATE_COMMAND = 'docker compose pull && docker compose up -d';"),
    `${relativePath} should point at the image update command`
  );
  assert.equal(
    source.includes('npm update -g @cloudcli-ai/cloudcli'),
    false,
    `${relativePath} should remove the CLI npm self-update command`
  );
  assert.equal(
    source.includes("Run ${terminalTextStyles.bright('cloudcli update')} to update"),
    false,
    `${relativePath} should remove the old update prompt`
  );
}

function assertPatchedCliModule(source, relativePath) {
  assert.equal(
    source.includes("execSync('npm update -g @cloudcli-ai/cloudcli', { stdio: 'inherit' });"),
    false,
    `${relativePath} should remove the injected npm self-update command`
  );
  assert.ok(
    source.includes('// HolyClaude disables CloudCLI npm self-updates; see cli.service.'),
    `${relativePath} should record why the update dependency is inert`
  );
}

function assertPatchedSystemRoutes(source, relativePath) {
  assert.equal(
    countOccurrences(source, 'const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {'),
    1,
    `${relativePath} should contain exactly one HolyClaude update response marker`
  );
  assert.ok(
    source.includes("router.post('/update', async (_request, response) => {"),
    `${relativePath} should keep the system update route`
  );
  assert.ok(
    source.includes('response.status(409).json(HOLYCLAUDE_UPDATE_DISABLED_RESPONSE);'),
    `${relativePath} should return the disabled update response`
  );

  const constantIndex = source.indexOf('const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {');
  const routeIndex = source.indexOf("router.post('/update'");
  assert.ok(constantIndex < routeIndex, `${relativePath} should declare the response before the route uses it`);
}

function assertPatchedSystemService(source, relativePath) {
  assert.equal(
    source.includes("'npm install -g @cloudcli-ai/cloudcli@latest'"),
    false,
    `${relativePath} should remove the npm global self-update command`
  );
  assert.ok(
    source.includes('const HOLYCLAUDE_DISABLED_UPDATE_COMMAND ='),
    `${relativePath} should replace the update command with a failing placeholder`
  );
}

async function assertWorkspaceBrowsingPreserved(cloudcliRoot) {
  for (const target of fileTreeRouteTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes("router.get('/browse-filesystem'"), `${target} should keep the browse route`);
    assert.ok(source.includes("router.post('/create-folder'"), `${target} should keep the create-folder route`);
  }

  for (const target of fileTreeServiceTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('function expandWorkspacePath'), `${target} should keep the workspace path helper`);
    assert.ok(
      source.includes('const expandedPath = expandWorkspacePath(dependencies.workspace.rootPath, folderPath);'),
      `${target} should keep create-folder tilde expansion`
    );
  }
}

test('CloudCLI self-update patch disables updates and preserves workspace browsing', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of systemServiceTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(
      source.includes("'npm install -g @cloudcli-ai/cloudcli@latest'"),
      `${target} fixture should start with the update command`
    );
  }
  await assertWorkspaceBrowsingPreserved(cloudcliRoot);

  await runPatch(cloudcliRoot);

  const firstRunSources = new Map();
  for (const target of allTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    firstRunSources.set(target, source);
  }

  for (const target of cliServiceTargets) {
    assertPatchedCliService(firstRunSources.get(target), target);
  }
  for (const target of cliModuleTargets) {
    assertPatchedCliModule(firstRunSources.get(target), target);
  }
  for (const target of systemRouteTargets) {
    assertPatchedSystemRoutes(firstRunSources.get(target), target);
  }
  for (const target of systemServiceTargets) {
    assertPatchedSystemService(firstRunSources.get(target), target);
  }
  await assertWorkspaceBrowsingPreserved(cloudcliRoot);

  await runPatch(cloudcliRoot);

  for (const target of allTargets) {
    assert.equal(
      await readCloudCliFile(cloudcliRoot, target),
      firstRunSources.get(target),
      `${target} should not change when the patch runs twice`
    );
  }
});

test('CloudCLI self-update patch fails closed when the system route anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of systemRouteTargets) {
    const routesPath = path.join(cloudcliRoot, target);
    const source = await readFile(routesPath, 'utf8');
    await writeFile(
      routesPath,
      source.replace("router.post('/update', async (_request, response, next) => {", "router.post('/update-renamed', async (_request, response, next) => {")
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI self-update anchors not found/
  );
});

test('CloudCLI self-update patch fails closed when the CLI update anchors drift', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of cliServiceTargets) {
    const servicePath = path.join(cloudcliRoot, target);
    const source = await readFile(servicePath, 'utf8');
    await writeFile(
      servicePath,
      source.replace('const checkForUpdates = async (silent = false)', 'const checkForUpdatesRenamed = async (silent = false)')
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI self-update anchors not found/
  );
});

test('CloudCLI self-update patch fails closed when workspace browsing drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of fileTreeServiceTargets) {
    const servicePath = path.join(cloudcliRoot, target);
    const source = await readFile(servicePath, 'utf8');
    await writeFile(
      servicePath,
      source.replaceAll('expandWorkspacePath', 'resolveWorkspacePath')
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI self-update anchors not found/
  );
});
