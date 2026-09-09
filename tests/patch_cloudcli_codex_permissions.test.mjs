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
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-codex-permissions.mjs');

const targetSource = `
function mapPermissionModeToCodexOptions(permissionMode: string): Pick<ThreadOptions, 'sandboxMode' | 'approvalPolicy'> {
  switch (permissionMode) {
    case 'acceptEdits':
      return { sandboxMode: 'workspace-write', approvalPolicy: 'never' };
    case 'bypassPermissions':
      return { sandboxMode: 'danger-full-access', approvalPolicy: 'never' };
    case 'default':
    default:
      return { sandboxMode: 'workspace-write', approvalPolicy: 'on-request' };
  }
}

async function queryCodex(
  command: string,
  options: AnyRecord = {},
  ws: ProviderRuntimeWriter,
  context: ProviderRuntimeContext,
) {
  const {
    permissionMode = 'default'
  } = options;
  const workingDirectory = cwd || projectPath || process.cwd();
  const { sandboxMode, approvalPolicy } = mapPermissionModeToCodexOptions(permissionMode);
}
`;

async function createFixture(source = targetSource) {
  const root = await mkdtemp(path.join(tmpdir(), 'holyclaude-codex-permissions-'));
  const target = path.join(root, 'codex-runtime.provider.ts');
  await writeFile(target, source);
  return target;
}

async function runPatch(target) {
  return execFileAsync(process.execPath, [patchScript, target], { cwd: repoRoot });
}

test('CloudCLI Codex permission patch supports the 1.37.3 typed runtime without retiring on-request', async () => {
  const target = await createFixture();

  await runPatch(target);
  const first = await readFile(target, 'utf8');

  assert.match(first, /HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE/);
  assert.match(first, /Object\.prototype\.hasOwnProperty\.call\(options, 'permissionMode'\)/);
  assert.match(first, /mapPermissionModeToCodexOptions\(effectivePermissionMode\)/);
  assert.match(first, /approvalPolicy: 'on-request'/);
  assert.match(
    first,
    /function resolveCodexChatPermissionMode\(permissionMode: unknown, hasExplicitPermissionMode: boolean\)/,
  );
  assert.doesNotMatch(first, /permissionMode\s*=\s*'default'/);

  await runPatch(target);
  assert.equal(await readFile(target, 'utf8'), first);
});

test('CloudCLI Codex permission patch keeps emitted JavaScript free of TypeScript annotations', async () => {
  const target = await createFixture(targetSource
    .replaceAll(': string', '')
    .replace(": Pick<ThreadOptions, 'sandboxMode' | 'approvalPolicy'>", '')
    .replace(': AnyRecord', '')
    .replace(': ProviderRuntimeWriter', '')
    .replace(': ProviderRuntimeContext', '')
  );
  const runtimeTarget = target.replace(/\.ts$/, '.js');
  await writeFile(runtimeTarget, await readFile(target, 'utf8'));

  await runPatch(runtimeTarget);
  const runtime = await readFile(runtimeTarget, 'utf8');

  assert.match(runtime, /function resolveCodexChatPermissionMode\(permissionMode, hasExplicitPermissionMode\)/);
  assert.doesNotMatch(runtime, /permissionMode: unknown|hasExplicitPermissionMode: boolean/);
});

test('CloudCLI Codex permission patch fails closed when the 1.37.3 map call drifts', async () => {
  const target = await createFixture(targetSource.replace(
    'mapPermissionModeToCodexOptions(permissionMode)',
    'mapPermissionModeToCodexOptions(resolveMode(permissionMode))',
  ));

  await assert.rejects(() => runPatch(target), /Codex permission mode anchors not found/);
});
