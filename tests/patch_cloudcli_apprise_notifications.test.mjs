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
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-apprise-notifications.mjs');
const cloudcliTarball = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.36.2-holyclaude-account-management.tgz');

const notificationTargets = [
  'server/modules/notifications/services/notification-orchestrator.service.js',
  'dist-server/server/modules/notifications/services/notification-orchestrator.service.js'
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

function countAppriseCallSites(source) {
  return (source.match(/^  sendAppriseLifecycleNotification\(\{/gm) || []).length;
}

function assertPatchedNotificationOrchestrator(source, relativePath) {
  assert.ok(
    source.includes("import { spawn } from 'child_process';"),
    `${relativePath} should import spawn for the Apprise bridge`
  );
  assert.ok(
    source.includes("const APPRISE_PROVIDER_ALLOWLIST = new Set(['codex']);"),
    `${relativePath} should keep the Codex-only allowlist`
  );
  assert.ok(
    source.includes("const sanitized = String(value).replace(/\\x00/g, '').replace(/\\s+/g, ' ').trim();"),
    `${relativePath} should sanitize notification arguments`
  );
  assert.ok(
    source.includes("spawn('/usr/local/bin/notify.py', args, {"),
    `${relativePath} should call HolyClaude notify.py`
  );
  assert.ok(
    source.includes('shell: false'),
    `${relativePath} should avoid shell execution`
  );
  assert.equal(
    countAppriseCallSites(source),
    2,
    `${relativePath} should contain exactly two Apprise call sites`
  );
  assert.ok(
    source.includes(`  sendAppriseLifecycleNotification({
    provider,
    kind: 'stop',
    sessionId,
    sessionName,
    stopReason
  });`),
    `${relativePath} should send stop lifecycle events through Apprise`
  );
  assert.ok(
    source.includes(`  const errorMessage = normalizeErrorMessage(error);

  sendAppriseLifecycleNotification({
    provider,
    kind: 'error',
    sessionId,
    sessionName,
    error: errorMessage
  });`),
    `${relativePath} should send error lifecycle events through Apprise`
  );
}

test('CloudCLI Apprise patch applies to source and runtime notification orchestrators', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of notificationTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('function notifyRunStopped('), `${target} fixture should include stop notifications`);
    assert.ok(source.includes('function notifyRunFailed('), `${target} fixture should include failure notifications`);
    assert.equal(countAppriseCallSites(source), 0, `${target} fixture should start without Apprise call sites`);
  }

  await runPatch(cloudcliRoot);

  const firstRunSources = new Map();
  for (const target of notificationTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    firstRunSources.set(target, source);
    assertPatchedNotificationOrchestrator(source, target);
  }

  await runPatch(cloudcliRoot);

  for (const target of notificationTargets) {
    assert.equal(
      await readCloudCliFile(cloudcliRoot, target),
      firstRunSources.get(target),
      `${target} should not change when the patch runs twice`
    );
  }
});

test('CloudCLI Apprise patch fails closed when the stop anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of notificationTargets) {
    const targetPath = path.join(cloudcliRoot, target);
    const source = await readFile(targetPath, 'utf8');
    await writeFile(
      targetPath,
      source.replace('function notifyRunStopped(', 'function notifyRunStoppedRenamed(')
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI notification orchestrator anchors not found/
  );
});

test('CloudCLI Apprise patch fails closed when the failure anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of notificationTargets) {
    const targetPath = path.join(cloudcliRoot, target);
    const source = await readFile(targetPath, 'utf8');
    await writeFile(
      targetPath,
      source.replace('const errorMessage = normalizeErrorMessage(error);', 'const normalizedError = normalizeErrorMessage(error);')
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI notification orchestrator anchors not found/
  );
});
