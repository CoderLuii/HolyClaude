import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-base-path.mjs');
const disableSelfUpdateScript = path.join(repoRoot, 'scripts/patch-cloudcli-disable-self-update.mjs');
const cloudCliArtifact = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.36.2-holyclaude-account-management.tgz');

async function createPackageFixture() {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-base-path-'));
  await execFileAsync('tar', ['-xzf', cloudCliArtifact, '-C', fixtureRoot]);
  return path.join(fixtureRoot, 'package');
}

async function runPatch(packageRoot) {
  return execFileAsync(process.execPath, [patchScript, packageRoot], {
    cwd: repoRoot
  });
}

async function runDisableSelfUpdatePatch(packageRoot) {
  return execFileAsync(process.execPath, [disableSelfUpdateScript, packageRoot], {
    cwd: repoRoot
  });
}

async function readPackageSource(packageRoot, relativePath) {
  return readFile(path.join(packageRoot, relativePath), 'utf8');
}

function getEmbeddedNormalizer(source) {
  const match = source.match(/function normalizeHolyClaudeBasePath\(value\) \{[\s\S]*?\n\}\nfunction hasHolyClaudeBasePath/);
  assert.ok(match, 'expected embedded base-path normalizer');
  const normalizerSource = match[0].replace('\nfunction hasHolyClaudeBasePath', '');
  return new Function(`${normalizerSource}; return normalizeHolyClaudeBasePath;`)();
}

test('CloudCLI base path patch is idempotent and covers runtime surfaces', async () => {
  const packageRoot = await createPackageFixture();

  await runPatch(packageRoot);

  const firstServer = await readPackageSource(packageRoot, 'dist-server/server/index.js');
  const firstWebSocket = await readPackageSource(packageRoot, 'dist-server/server/modules/websocket/services/websocket-server.service.js');

  assert.ok(firstServer.includes('HolyClaude base path support (issue #64)'));
  assert.ok(firstServer.includes('normalizeHolyClaudeBasePath(process.env.HOLYCLAUDE_BASE_PATH)'));
  assert.ok(firstServer.includes('stripHolyClaudeBasePathFromUrl(req.url)'));
  assert.ok(firstServer.includes("app.get('/manifest.json'"));
  assert.ok(firstServer.includes("app.get('/sw.js'"));
  assert.ok(firstServer.includes("app.get(/^\\/assets\\/.*\\.css$/"));
  assert.ok(firstServer.includes('path.basename(req.path)'));
  assert.ok(firstServer.includes('index: false,'));
  assert.ok(firstServer.includes('sendHolyClaudeIndexHtml(req, res, indexPath)'));
  assert.ok(firstServer.includes('window.__HOLYCLAUDE_BASE_PATH__ = basePath'));
  assert.ok(firstServer.includes('window.__ROUTER_BASENAME__ = basePath'));
  assert.ok(firstServer.includes('window.XMLHttpRequest.prototype.open'));
  assert.ok(firstServer.includes('window.EventSource = function HolyClaudeEventSource'));
  assert.ok(firstServer.includes('window.WebSocket = function HolyClaudeWebSocket'));
  assert.ok(firstServer.includes('navigator.serviceWorker.register ='));
  assert.ok(firstServer.includes('manifest.start_url = HOLYCLAUDE_BASE_PATH'));
  assert.ok(firstServer.includes('sendHolyClaudeServiceWorker'));
  assert.ok(firstServer.includes('sendHolyClaudeCss'));

  assert.ok(firstWebSocket.includes('HolyClaude base path support (issue #64)'));
  assert.ok(firstWebSocket.includes('stripHolyClaudeBasePathFromPathname(websocketUrl.pathname)'));
  assert.ok(firstWebSocket.includes('incomingRequest.url = websocketUrl.pathname + websocketUrl.search'));

  await runPatch(packageRoot);

  assert.equal(await readPackageSource(packageRoot, 'dist-server/server/index.js'), firstServer);
  assert.equal(await readPackageSource(packageRoot, 'dist-server/server/modules/websocket/services/websocket-server.service.js'), firstWebSocket);
});

test('CloudCLI base path patch applies after the Docker self-update patch order', async () => {
  const packageRoot = await createPackageFixture();

  await runDisableSelfUpdatePatch(packageRoot);
  await runPatch(packageRoot);

  const runtimeServer = await readPackageSource(packageRoot, 'dist-server/server/index.js');
  const sourceServer = await readPackageSource(packageRoot, 'server/index.js');

  assert.ok(runtimeServer.includes('HOLYCLAUDE_UPDATE_DISABLED_RESPONSE'));
  assert.ok(runtimeServer.includes('HolyClaude base path support (issue #64)'));
  assert.ok(runtimeServer.includes('sendHolyClaudeIndexHtml(req, res, indexPath)'));
  assert.ok(sourceServer.includes('HOLYCLAUDE_UPDATE_DISABLED_RESPONSE'));
});

test('CloudCLI base path normalizer accepts only safe absolute path prefixes', async () => {
  const packageRoot = await createPackageFixture();
  await runPatch(packageRoot);

  const server = await readPackageSource(packageRoot, 'dist-server/server/index.js');
  const normalize = getEmbeddedNormalizer(server);

  assert.equal(normalize(undefined), '');
  assert.equal(normalize(''), '');
  assert.equal(normalize('/'), '');
  assert.equal(normalize('/holyclaude'), '/holyclaude');

  for (const value of ['holyclaude', '/holyclaude/', '//holyclaude', '/..', '/holy/../claude', '/holy?x=1', '/holy#x', '/holy\\claude', '/bad%zz']) {
    assert.throws(() => normalize(value), /HOLYCLAUDE_BASE_PATH/);
  }
});

test('CloudCLI base path patch fails closed when server anchors drift', async () => {
  const packageRoot = await createPackageFixture();
  const serverIndexPath = path.join(packageRoot, 'dist-server/server/index.js');
  const server = await readFile(serverIndexPath, 'utf8');
  await writeFile(serverIndexPath, server.replace('app.use(express.static(path.join(APP_ROOT, \'dist\'), {', 'app.use(express.static(path.join(APP_ROOT, \'dist\'), { /* drift */'));

  await assert.rejects(
    () => runPatch(packageRoot),
    /CloudCLI base path anchors not found/
  );
});

test('CloudCLI base path patch fails closed when the router basename anchor drifts', async () => {
  const packageRoot = await createPackageFixture();
  const assetsPath = path.join(packageRoot, 'dist/assets');
  let changed = false;

  for (const file of await readdir(assetsPath)) {
    if (!file.endsWith('.js')) {
      continue;
    }

    const filePath = path.join(assetsPath, file);
    const source = await readFile(filePath, 'utf8');
    const nextSource = source.replaceAll('__ROUTER_BASENAME__', '__ROUTER_BASE_MISSING__');
    if (nextSource !== source) {
      changed = true;
      await writeFile(filePath, nextSource);
    }
  }

  assert.equal(changed, true, 'fixture should contain the router basename anchor');
  await assert.rejects(
    () => runPatch(packageRoot),
    /CloudCLI base path anchors not found/
  );
});
