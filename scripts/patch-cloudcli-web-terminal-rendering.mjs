import { existsSync, readFileSync, writeFileSync } from 'fs';

const DEFAULT_PLUGIN_ROOT = '/home/claude/.claude-code-ui/plugins/web-terminal';
const PLUGIN_ROOT = process.argv[2] || DEFAULT_PLUGIN_ROOT;
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI web terminal rendering anchors not found';

const SERVER_ONDATA_TYPE_OLD = 'onData(callback: (data: string) => void): void;';
const SERVER_ONDATA_TYPE_NEW = 'onData(callback: (data: string | Buffer) => void): void;';
const SERVER_SPAWN_ENV_OLD = "      env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', TERM_PROGRAM: 'web-terminal' },";
const SERVER_SPAWN_ENV_NEW = `${SERVER_SPAWN_ENV_OLD}
      encoding: null,`;
const SERVER_ONDATA_OLD = `  ptyProc.onData((chunk: string) => {
    ptyProc.pause();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(chunk, () => ptyProc.resume());
    } else {
      ptyProc.resume();
    }
  });`;
const SERVER_ONDATA_NEW = `  const decoder = new TextDecoder('utf-8', { fatal: false });

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
  });`;

const INDEX_PREFS_OLD = `const PREFS_KEY = 'web-terminal-prefs';
function loadPrefs(): Partial<Prefs> { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }`;
const INDEX_PREFS_NEW = `const PREFS_KEY = 'web-terminal-prefs';
const WEBGL_DISABLED_KEY = 'web-terminal-disable-webgl';
const DEFAULT_FONT_FAMILY = '"Cascadia Mono", Consolas, "DejaVu Sans Mono", "Liberation Mono", "Noto Sans Mono", "Noto Sans Mono CJK JP", "Noto Sans CJK JP", "Microsoft YaHei", "MS Gothic", Meiryo, "PingFang SC", "Hiragino Sans GB", "Noto Color Emoji", Menlo, Monaco, "Courier New", monospace';
function isWebglDisabled(): boolean { try { return localStorage.getItem(WEBGL_DISABLED_KEY) === 'true'; } catch { return false; } }
function loadPrefs(): Partial<Prefs> { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }`;
const INDEX_FONT_OLD = `      fontFamily: opts.prefs.fontFamily || "Menlo, Monaco, 'Courier New', monospace",`;
const INDEX_FONT_NEW = '      fontFamily: opts.prefs.fontFamily || DEFAULT_FONT_FAMILY,';
const INDEX_WEBGL_OLD = `    try {
      const webgl = new opts.WebglAddon();
      webgl.onContextLoss(() => { try { webgl.dispose(); } catch { /* ignore */ } });
      this.terminal.loadAddon(webgl);
    } catch { /* ignore */ }`;
const INDEX_WEBGL_NEW = `    if (!isWebglDisabled()) {
      try {
        const webgl = new opts.WebglAddon();
        webgl.onContextLoss(() => { try { webgl.dispose(); } catch { /* ignore */ } });
        this.terminal.loadAddon(webgl);
      } catch { /* ignore */ }
    }`;

function fail() {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

function readSource(path) {
  try {
    return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    fail();
  }
}

function writeSource(path, source) {
  try {
    writeFileSync(path, source);
  } catch {
    fail();
  }
}

function replaceRequired(source, oldText, newText) {
  if (source.includes(newText)) {
    return source;
  }

  if (!source.includes(oldText)) {
    fail();
  }

  return source.replace(oldText, newText);
}

function isServerPatched(source) {
  return source.includes(SERVER_ONDATA_TYPE_NEW)
    && source.includes('encoding: null,')
    && source.includes("new TextDecoder('utf-8', { fatal: false })")
    && source.includes('decoder.decode(chunk, { stream: true })')
    && !source.includes('ptyProc.onData((chunk: string) => {')
    && !source.includes('ws.send(chunk, () => ptyProc.resume())');
}

function assertServerPatched(source) {
  if (!isServerPatched(source)) {
    fail();
  }
}

function isIndexPatched(source) {
  return source.includes('const DEFAULT_FONT_FAMILY =')
    && source.includes('const WEBGL_DISABLED_KEY =')
    && source.includes('function isWebglDisabled(): boolean')
    && source.includes(INDEX_FONT_NEW)
    && source.includes('if (!isWebglDisabled()) {')
    && !source.includes(INDEX_FONT_OLD);
}

function assertIndexPatched(source) {
  if (!isIndexPatched(source)) {
    fail();
  }
}

function isCurrentServerPatched(source) {
  return source.includes("encoding: 'utf8',")
    && source.includes('ptyProc.onData((text: string) => {')
    && source.includes("const chunk = Buffer.from(text, 'utf8');")
    && source.includes('sendData(session.ws, chunk,')
    && source.includes("if (isBinary) {")
    && source.includes('session.pty.write(Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), \'utf8\'))');
}

function isCurrentPrefsPatched(source) {
  return source.includes("const LEGACY_WEBGL_KEY = 'web-terminal-disable-webgl';")
    && source.includes('export const DEFAULT_FONT_FAMILY =')
    && source.includes('Noto Sans Mono CJK JP')
    && source.includes('fontFamily: DEFAULT_FONT_FAMILY,')
    && source.includes('webgl: typeof stored.webgl === \'boolean\' ? stored.webgl : readLegacyWebglFlag(),');
}

function isCurrentSessionPatched(source) {
  return source.includes("import { WebglAddon } from '@xterm/addon-webgl';")
    && source.includes('fontFamily: options.prefs.fontFamily,')
    && source.includes('this.applyWebgl(options.prefs.webgl);')
    && source.includes('addon.onContextLoss(() => {')
    && source.includes('// No WebGL (software rendering, blocked driver) — the DOM renderer stays.');
}

function acceptsCurrentUpstream(serverSource, prefsSource, sessionSource) {
  return isCurrentServerPatched(serverSource)
    && isCurrentPrefsPatched(prefsSource)
    && isCurrentSessionPatched(sessionSource);
}

function patchServer(path) {
  let source = readSource(path);

  if (isServerPatched(source)) {
    return;
  }

  source = replaceRequired(source, SERVER_ONDATA_TYPE_OLD, SERVER_ONDATA_TYPE_NEW);
  source = replaceRequired(source, SERVER_SPAWN_ENV_OLD, SERVER_SPAWN_ENV_NEW);
  source = replaceRequired(source, SERVER_ONDATA_OLD, SERVER_ONDATA_NEW);

  assertServerPatched(source);
  writeSource(path, source);
}

function patchIndex(path) {
  let source = readSource(path);

  if (isIndexPatched(source)) {
    return;
  }

  source = replaceRequired(source, INDEX_PREFS_OLD, INDEX_PREFS_NEW);
  source = replaceRequired(source, INDEX_FONT_OLD, INDEX_FONT_NEW);
  source = replaceRequired(source, INDEX_WEBGL_OLD, INDEX_WEBGL_NEW);

  assertIndexPatched(source);
  writeSource(path, source);
}

const serverPath = `${PLUGIN_ROOT}/src/server.ts`;
const indexPath = `${PLUGIN_ROOT}/src/index.ts`;
const prefsPath = `${PLUGIN_ROOT}/src/prefs.ts`;
const sessionPath = `${PLUGIN_ROOT}/src/session.ts`;

if (!existsSync(serverPath) || !existsSync(indexPath)) {
  fail();
}

if (existsSync(prefsPath) || existsSync(sessionPath)) {
  if (!existsSync(prefsPath) || !existsSync(sessionPath)) {
    fail();
  }

  if (!acceptsCurrentUpstream(readSource(serverPath), readSource(prefsPath), readSource(sessionPath))) {
    fail();
  }

  console.log('[patch] CloudCLI web terminal rendering already satisfies policy');
  process.exit(0);
}

patchServer(serverPath);
patchIndex(indexPath);

console.log('[patch] CloudCLI web terminal rendering patched');
