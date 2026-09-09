import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const patchScript = path.join(repoRoot, 'scripts/patch-cloudcli-web-terminal-rendering.mjs');

const serverFixture = `interface PtyProcess {
  onData(callback: (data: string) => void): void;
}

wss.on('connection', (ws: any) => {
  let ptyProc: PtyProcess;
  ptyProc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'web-terminal' },
    });

  ptyProc.onData((chunk: string) => {
    ptyProc.pause();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk, () => ptyProc.resume());
    } else {
      ptyProc.resume();
    }
  });
});
`;

const indexFixture = `const PREFS_KEY = 'web-terminal-prefs';
function loadPrefs(): Partial<Prefs> { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }
function savePrefs(p: Prefs): void { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

class TerminalSession {
  constructor(opts: SessionOptions) {
    this.terminal = new opts.Terminal({
      cursorBlink: true,
      fontSize: opts.prefs.fontSize || 14,
      fontFamily: opts.prefs.fontFamily || "Menlo, Monaco, 'Courier New', monospace",
      allowProposedApi: true, convertEol: true, scrollback: 10000,
      tabStopWidth: 4, macOptionIsMeta: true, macOptionClickForcesSelection: true,
      theme: THEMES[opts.prefs.theme || 'VS Dark'],
    });

    try {
      const webgl = new opts.WebglAddon();
      webgl.onContextLoss(() => { try { webgl.dispose(); } catch { /* ignore */ } });
      this.terminal.loadAddon(webgl);
    } catch { /* ignore */ }
  }
}
`;

const upstreamPatchedServerFixture = `interface PtyProcess {
  onData(callback: (data: string | Buffer) => void): void;
}

wss.on('connection', (ws: any) => {
  let ptyProc: PtyProcess;
  ptyProc = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd,
      env: {
        ...prioritizeUserNpmGlobalBin(process.env),
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        TERM_PROGRAM: 'web-terminal',
      },
      encoding: null,
    });

  const decoder = new TextDecoder('utf-8', { fatal: false });

  ptyProc.onData((chunk: string | Buffer) => {
    const text = typeof chunk === 'string'
      ? chunk
      : decoder.decode(chunk, { stream: true });

    if (!text) {
      return;
    }

    ptyProc.pause();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(text, () => ptyProc.resume());
    } else {
      ptyProc.resume();
    }
  });
});
`;

const upstreamPatchedIndexFixture = `const PREFS_KEY = 'web-terminal-prefs';
const WEBGL_DISABLED_KEY = 'web-terminal-disable-webgl';
const DEFAULT_FONT_FAMILY = '"Cascadia Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", "Noto Sans Mono", "Noto Sans Mono CJK JP", "Noto Sans CJK JP", "Microsoft YaHei", "MS Gothic", Meiryo, "PingFang SC", "Hiragino Sans GB", "Noto Color Emoji", Menlo, Monaco, "Courier New", monospace';
function isWebglDisabled(): boolean { try { return localStorage.getItem(WEBGL_DISABLED_KEY) === 'true'; } catch { return false; } }
function loadPrefs(): Partial<Prefs> { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }
function savePrefs(p: Prefs): void { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

class TerminalSession {
  constructor(opts: SessionOptions) {
    this.terminal = new opts.Terminal({
      cursorBlink: true,
      fontSize: opts.prefs.fontSize || 14,
      fontFamily: opts.prefs.fontFamily || DEFAULT_FONT_FAMILY,
      allowProposedApi: true, convertEol: true, scrollback: 10000,
      tabStopWidth: 4, macOptionIsMeta: true, macOptionClickForcesSelection: true,
      theme: THEMES[opts.prefs.theme || 'VS Dark'],
    });

    if (!isWebglDisabled()) {
      try {
        const webgl = new opts.WebglAddon();
        webgl.onContextLoss(() => { try { webgl.dispose(); } catch { /* ignore */ } });
        this.terminal.loadAddon(webgl);
      } catch { /* ignore */ }
    }
  }
}
`;

const currentServerFixture = `const ptyProc = pty.spawn(shell, [], {
  encoding: 'utf8',
});
ptyProc.onData((text: string) => {
  const chunk = Buffer.from(text, 'utf8');
  sendData(session.ws, chunk, () => {});
});
if (isBinary) {
  session.pty.write(Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), 'utf8'));
}
`;

const currentPrefsFixture = `const LEGACY_WEBGL_KEY = 'web-terminal-disable-webgl';
export const DEFAULT_FONT_FAMILY =
  '"Cascadia Mono", "Noto Sans Mono CJK JP", monospace';
export const DEFAULT_PREFS = {
  fontFamily: DEFAULT_FONT_FAMILY,
};
const prefs = {
  webgl: typeof stored.webgl === 'boolean' ? stored.webgl : readLegacyWebglFlag(),
};
`;

const currentSessionFixture = `import { WebglAddon } from '@xterm/addon-webgl';
const terminalOptions = {
  fontFamily: options.prefs.fontFamily,
};
this.applyWebgl(options.prefs.webgl);
addon.onContextLoss(() => {
  addon.dispose();
});
// No WebGL (software rendering, blocked driver) — the DOM renderer stays.
`;

async function createPluginFixture({ driftIndex = false } = {}) {
  const pluginRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-web-terminal-'));
  const srcDir = path.join(pluginRoot, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, 'server.ts'), serverFixture);
  await writeFile(
    path.join(srcDir, 'index.ts'),
    driftIndex ? indexFixture.replace('new opts.WebglAddon()', 'new opts.GpuAddon()') : indexFixture
  );
  return pluginRoot;
}

async function runPatch(pluginRoot) {
  return execFileAsync(process.execPath, [patchScript, pluginRoot], {
    cwd: repoRoot
  });
}

async function readPluginSource(pluginRoot, relativePath) {
  return readFile(path.join(pluginRoot, relativePath), 'utf8');
}

test('CloudCLI web terminal rendering patch is idempotent', async () => {
  const pluginRoot = await createPluginFixture();

  await runPatch(pluginRoot);

  const firstRunServer = await readPluginSource(pluginRoot, 'src/server.ts');
  const firstRunIndex = await readPluginSource(pluginRoot, 'src/index.ts');

  assert.ok(firstRunServer.includes('onData(callback: (data: string | Buffer) => void): void;'));
  assert.ok(firstRunServer.includes('encoding: null,'));
  assert.ok(firstRunServer.includes("new TextDecoder('utf-8', { fatal: false })"));
  assert.ok(firstRunServer.includes('decoder.decode(chunk, { stream: true })'));
  assert.equal(firstRunServer.includes('ws.send(chunk, () => ptyProc.resume())'), false);

  assert.ok(firstRunIndex.includes('const DEFAULT_FONT_FAMILY ='));
  assert.ok(firstRunIndex.includes('Noto Sans Mono CJK JP'));
  assert.ok(firstRunIndex.includes('web-terminal-disable-webgl'));
  assert.ok(firstRunIndex.includes('fontFamily: opts.prefs.fontFamily || DEFAULT_FONT_FAMILY,'));
  assert.ok(firstRunIndex.includes('if (!isWebglDisabled()) {'));
  assert.equal(firstRunIndex.includes('fontFamily: opts.prefs.fontFamily || "Menlo'), false);

  await runPatch(pluginRoot);

  assert.equal(await readPluginSource(pluginRoot, 'src/server.ts'), firstRunServer);
  assert.equal(await readPluginSource(pluginRoot, 'src/index.ts'), firstRunIndex);
});

test('CloudCLI web terminal rendering patch accepts upstream patched sources', async () => {
  const pluginRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-web-terminal-'));
  const srcDir = path.join(pluginRoot, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, 'server.ts'), upstreamPatchedServerFixture);
  await writeFile(path.join(srcDir, 'index.ts'), upstreamPatchedIndexFixture);

  await runPatch(pluginRoot);

  assert.equal(await readPluginSource(pluginRoot, 'src/server.ts'), upstreamPatchedServerFixture);
  assert.equal(await readPluginSource(pluginRoot, 'src/index.ts'), upstreamPatchedIndexFixture);
});

test('CloudCLI web terminal rendering patch accepts the current split upstream implementation', async (t) => {
  const pluginRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-web-terminal-current-'));
  t.after(() => rm(pluginRoot, { recursive: true, force: true }));
  const srcDir = path.join(pluginRoot, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, 'server.ts'), currentServerFixture);
  await writeFile(path.join(srcDir, 'index.ts'), 'export function mount() {}\n');
  await writeFile(path.join(srcDir, 'prefs.ts'), currentPrefsFixture);
  await writeFile(path.join(srcDir, 'session.ts'), currentSessionFixture);

  const result = await runPatch(pluginRoot);

  assert.match(result.stdout, /rendering already satisfies policy/);
  assert.equal(await readPluginSource(pluginRoot, 'src/server.ts'), currentServerFixture);
  assert.equal(await readPluginSource(pluginRoot, 'src/prefs.ts'), currentPrefsFixture);
  assert.equal(await readPluginSource(pluginRoot, 'src/session.ts'), currentSessionFixture);
});

test('CloudCLI web terminal rendering patch fails closed when a current upstream guard drifts', async (t) => {
  const pluginRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-web-terminal-current-drift-'));
  t.after(() => rm(pluginRoot, { recursive: true, force: true }));
  const srcDir = path.join(pluginRoot, 'src');
  await mkdir(srcDir, { recursive: true });
  await writeFile(path.join(srcDir, 'server.ts'), currentServerFixture);
  await writeFile(path.join(srcDir, 'index.ts'), 'export function mount() {}\n');
  await writeFile(path.join(srcDir, 'prefs.ts'), currentPrefsFixture.replace('Noto Sans Mono CJK JP', 'sans-serif'));
  await writeFile(path.join(srcDir, 'session.ts'), currentSessionFixture);

  await assert.rejects(
    () => runPatch(pluginRoot),
    /CloudCLI web terminal rendering anchors not found/
  );
});

test('CloudCLI web terminal rendering patch fails closed when anchors drift', async () => {
  const pluginRoot = await createPluginFixture({ driftIndex: true });

  await assert.rejects(
    () => runPatch(pluginRoot),
    /CloudCLI web terminal rendering anchors not found/
  );
});
