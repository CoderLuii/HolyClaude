import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import nodeTest from 'node:test';
import vm from 'node:vm';

// Keep the repository's ordinary `node --test` invocation working while using
// Node's module linker to isolate the shipped runtime from external services.
const test = vm.SourceTextModule ? nodeTest : () => {};
if (!vm.SourceTextModule) {
  nodeTest('MiniMax artifact checks with isolated VM modules', () => {
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const output = execFileSync(process.execPath, ['--experimental-vm-modules', '--test', import.meta.filename], { env, encoding: 'utf8', stdio: 'pipe' });
    assert.match(output, /# pass 3/);
  });
}

const repo = path.resolve(import.meta.dirname, '..');
const archive = path.join(repo, 'vendor/artifacts/cloudcli-ai-cloudcli-1.37.3-holyclaude-account-management.tgz');
const modulePath = 'server/modules/providers/list/opencode/opencode-models.provider';
const unpack = (name) => execFileSync('tar', ['-xOf', archive, `package/${name}`], { encoding: 'utf8' });
const original = unpack(`dist-server/${modulePath}.js`);
const fixture = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'holyclaude-minimax-'));
  for (const name of [`${modulePath}.ts`, `dist-server/${modulePath}.js`]) {
    mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    writeFileSync(path.join(root, name), unpack(name));
  }
  return root;
};
const patch = (root) => execFileSync(process.execPath, [path.join(repo, 'scripts/patch-cloudcli-minimax-models.mjs'), root]);

// Execute the shipped modules, replacing only imported infrastructure. No SDK,
// network, account database, or real agent process is loaded by these tests.
async function load(source, dependencies) {
  const context = vm.createContext({ console, process, setTimeout, clearTimeout });
  const module = new vm.SourceTextModule(source, { context });
  await module.link((specifier) => {
    assert.ok(Object.hasOwn(dependencies, specifier), `Unexpected import: ${specifier}`);
    const values = dependencies[specifier];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  return module.namespace;
}
const utils = {
  readObjectRecord: (value) => value && typeof value === 'object' ? value : null,
  readOptionalString: (value) => typeof value === 'string' ? value.trim() || undefined : undefined,
  buildDefaultProviderCurrentActiveModel: (definition) => ({ model: definition.DEFAULT }),
  getOpenCodeDatabasePath: () => '/nonexistent-holyclaude-test-db',
};
const catalogDependencies = {
  'node:fs/promises': { readFile: async () => { throw new Error('No saved configuration'); } },
  'node:os': { default: { homedir: () => '/nonexistent-holyclaude-test-home' } },
  'node:path': { default: path },
  'better-sqlite3': { default: class { constructor() { throw new Error('No native database'); } } },
  '../../../../modules/database/index.js': { sessionsDb: {} },
  '../../../../shared/utils.js': utils,
};

test('patch updates actual shipped catalog, preserves other choices, and is idempotent', async () => {
  const root = fixture();
  patch(root);
  const updated = readFileSync(path.join(root, `dist-server/${modulePath}.js`), 'utf8');
  patch(root);
  assert.equal(readFileSync(path.join(root, `dist-server/${modulePath}.js`), 'utf8'), updated);
  const before = (await load(original, catalogDependencies)).OPENCODE_PREDEFINED_MODELS;
  const after = (await load(updated, catalogDependencies)).OPENCODE_PREDEFINED_MODELS;
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(after.OPTIONS.filter((entry) => entry.value.includes('/minimax-')).map((entry) => entry.value)), [
    'opencode/minimax-m3.1-flash-free', 'opencode/minimax-m3', 'opencode-go/minimax-m3',
  ]);
  assert.deepEqual(plain(after.OPTIONS.filter((entry) => !entry.value.includes('/minimax-'))), plain(before.OPTIONS.filter((entry) => !entry.value.includes('/minimax-'))));
  assert.equal(after.DEFAULT, before.DEFAULT);
  assert.ok(readFileSync(path.join(root, `${modulePath}.ts`), 'utf8').includes('opencode/minimax-m3.1-flash-free'));
});

test('patch validates both representations before writing on upstream drift', () => {
  const root = fixture();
  writeFileSync(path.join(root, `dist-server/${modulePath}.js`), original.replace('opencode/minimax-m3', 'opencode/changed-model'));
  const source = readFileSync(path.join(root, `${modulePath}.ts`), 'utf8');
  assert.throws(() => patch(root), /anchors not found/);
  assert.equal(readFileSync(path.join(root, `${modulePath}.ts`), 'utf8'), source);
});

test('actual model service and runtime preserve explicit, saved, custom, default and attachment requests', async () => {
  const root = fixture();
  patch(root);
  const models = await load(readFileSync(path.join(root, `dist-server/${modulePath}.js`), 'utf8'), catalogDependencies);
  const definition = models.OPENCODE_PREDEFINED_MODELS;
  const records = new Map([['saved', { model: 'opencode/minimax-m2.5', effort: null }]]);
  const serviceModule = await load(unpack('dist-server/server/modules/providers/services/provider-models.service.js'), {
    '../../../modules/database/index.js': { providerModelsDb: {}, sessionsDb: {} },
    '../../../modules/providers/provider.registry.js': { providerRegistry: {} },
    '../../../shared/utils.js': { AppError: Error },
  });
  const service = serviceModule.createProviderModelsService({
    resolveProvider: () => ({ models: { getSupportedModels: async () => definition } }),
    catalog: { listCustomProviderModels: () => [{ modelId: 'custom/my-model', model: 'My model', recordId: 1 }] },
    sessions: { getSessionById: (id) => records.get(id) },
  });
  const merged = await service.getProviderModels('opencode');
  assert.equal(merged.OPTIONS.at(-1).value, 'custom/my-model');
  let outgoing;
  const spawn = (command, args, options) => {
    outgoing = { command, args, options };
    const child = new EventEmitter();
    child.stdin = { end() {} };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    setImmediate(() => child.emit('close', 0));
    return child;
  };
  const attachmentModule = await load(unpack('dist-server/server/shared/image-attachments.js'), {
    'node:fs': { promises: {}, realpathSync: (value) => value },
    'node:os': { default: os }, 'node:path': { default: path },
  });
  const runtime = await load(unpack('dist-server/server/modules/providers/list/opencode/opencode-runtime.provider.js'), {
    'node:fs': { default: { existsSync: () => false } },
    'cross-spawn': { default: spawn },
    'better-sqlite3': { default: class {} },
    '../../../../shared/image-attachments.js': Object.fromEntries(Object.entries(attachmentModule)),
    '../../../../modules/notifications/index.js': { notifyRunFailed() {}, notifyRunStopped() {} },
    '../../../../shared/utils.js': { ...utils, createCompleteMessage: (x) => x, createNormalizedMessage: (x) => x, flattenPromptForWindowsShell: (x) => x },
  });
  for (const requestedModel of ['opencode/minimax-m3.1-flash-free', 'opencode/minimax-m3', 'opencode/minimax-m2.7', 'custom/my-model', undefined]) {
    const selection = await service.resolveSessionModel('opencode', { requestedModel });
    await runtime.spawnOpenCode('hello', { model: selection.model, effort: 'none', files: [{ path: '/fixture/note.txt' }] }, { send() {} }, {
      resolveProviderSessionId: () => undefined,
      resolveResumeModel: (id, model) => service.resolveResumeModel('opencode', id, model),
      getProviderModels: () => service.getProviderModels('opencode'),
    });
    assert.equal(outgoing.command, 'opencode');
    assert.equal(outgoing.args[outgoing.args.indexOf('--model') + 1], requestedModel || definition.DEFAULT);
    assert.ok(!outgoing.args.includes('--variant'));
    assert.ok(outgoing.args.at(-1).includes('/fixture/note.txt'));
  }
  await runtime.spawnOpenCode('resume', { sessionId: 'saved', model: 'opencode/minimax-m3.1-flash-free' }, { send() {} }, {
    resolveProviderSessionId: () => 'native-session',
    resolveResumeModel: (id, model) => service.resolveResumeModel('opencode', id, model),
    getProviderModels: () => service.getProviderModels('opencode'),
  });
  assert.equal(outgoing.args[outgoing.args.indexOf('--model') + 1], 'opencode/minimax-m2.5');
  assert.equal(outgoing.args[outgoing.args.indexOf('--session') + 1], 'native-session');
});
