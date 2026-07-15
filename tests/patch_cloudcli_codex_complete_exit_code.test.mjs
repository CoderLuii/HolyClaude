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
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-codex-complete-exit-code.mjs');
const cloudcliTarball = path.join(repoRoot, 'vendor/artifacts/cloudcli-ai-cloudcli-1.36.2-holyclaude-account-management.tgz');

const providerTargets = [
  'server/modules/providers/list/codex/codex-sessions.provider.ts',
  'dist-server/server/modules/providers/list/codex/codex-sessions.provider.js'
];

const openAiCodexTargets = [
  'server/openai-codex.js',
  'dist-server/server/openai-codex.js'
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

function extractTurnCompleteBlock(source) {
  const match = source.match(/if \(raw\.type === 'turn_complete'\) \{[\s\S]*?\n\s*}\n\s*if \(raw\.type === 'turn_failed'\)/);
  assert.ok(match, 'turn_complete block should be present');
  return match[0];
}

function assertProviderCompleteFields(source, relativePath) {
  const block = extractTurnCompleteBlock(source);
  assert.ok(block.includes("kind: 'complete',"), `${relativePath} should keep the complete kind`);
  assert.ok(block.includes('exitCode: 0,'), `${relativePath} should include successful exitCode`);
  assert.ok(block.includes('success: true,'), `${relativePath} should include success marker`);
  assert.ok(block.includes('aborted: false,'), `${relativePath} should include explicit non-abort marker`);
}

test('CloudCLI Codex completion patch guards provider turn_complete fields', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of openAiCodexTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('exitCode: terminalFailure ? 1 : 0'), `${target} should include upstream final success exitCode`);
    assert.ok(source.includes('exitCode: 1'), `${target} should include upstream error exitCode`);
  }

  for (const target of providerTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    const block = extractTurnCompleteBlock(source);
    assert.ok(block.includes("kind: 'complete',"), `${target} fixture should include turn_complete normalization`);
    assert.equal(block.includes('exitCode: 0,'), false, `${target} fixture should start without provider exitCode`);
  }

  await runPatch(cloudcliRoot);

  const firstRunSources = new Map();
  for (const target of providerTargets) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    firstRunSources.set(target, source);
    assertProviderCompleteFields(source, target);
  }

  await runPatch(cloudcliRoot);

  for (const target of providerTargets) {
    assert.equal(
      await readCloudCliFile(cloudcliRoot, target),
      firstRunSources.get(target),
      `${target} should not change when the patch runs twice`
    );
  }
});

test('CloudCLI Codex completion patch fails closed when provider anchor drifts', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of providerTargets) {
    const targetPath = path.join(cloudcliRoot, target);
    const source = await readFile(targetPath, 'utf8');
    await writeFile(
      targetPath,
      source.replace("raw.type === 'turn_complete'", "raw.type === 'turn_done'")
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI Codex complete exitCode anchors not found/
  );
});

test('CloudCLI Codex completion patch fails closed without upstream final exitCode', async () => {
  const cloudcliRoot = await unpackCloudCli();

  for (const target of openAiCodexTargets) {
    const targetPath = path.join(cloudcliRoot, target);
    const source = await readFile(targetPath, 'utf8');
    await writeFile(
      targetPath,
      source.replace('exitCode: terminalFailure ? 1 : 0', 'exitCode: 0')
    );
  }

  await assert.rejects(
    () => runPatch(cloudcliRoot),
    /CloudCLI Codex complete exitCode anchors not found/
  );
});
