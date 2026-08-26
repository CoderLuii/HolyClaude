import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DEFAULT_PACKAGE_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const PACKAGE_ROOT = process.argv[2] || DEFAULT_PACKAGE_ROOT;
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI base path anchors not found';
const PATCH_MARKER = 'HolyClaude base path support';

const SERVER_HELPER = `// HolyClaude base path support (issue #64)
const HOLYCLAUDE_BASE_PATH = normalizeHolyClaudeBasePath(process.env.HOLYCLAUDE_BASE_PATH);
if (HOLYCLAUDE_BASE_PATH) {
    console.log('[holyclaude] serving CloudCLI under base path:', HOLYCLAUDE_BASE_PATH);
}
function normalizeHolyClaudeBasePath(value) {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '/') {
        return '';
    }
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.endsWith('/')) {
        throw new Error('HOLYCLAUDE_BASE_PATH must be empty, /, or a path like /holyclaude without a trailing slash');
    }
    if (raw.includes('\\\\') || raw.includes('?') || raw.includes('#')) {
        throw new Error('HOLYCLAUDE_BASE_PATH must be a path only, not a URL or query string');
    }
    let decoded;
    try {
        decoded = decodeURIComponent(raw);
    }
    catch {
        throw new Error('HOLYCLAUDE_BASE_PATH contains malformed percent encoding');
    }
    if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) {
        throw new Error('HOLYCLAUDE_BASE_PATH cannot contain . or .. path segments');
    }
    return raw;
}
function hasHolyClaudeBasePath(pathname) {
    return !!HOLYCLAUDE_BASE_PATH && (pathname === HOLYCLAUDE_BASE_PATH || pathname.startsWith(HOLYCLAUDE_BASE_PATH + '/'));
}
function prefixHolyClaudeRootPath(rootPath) {
    if (!HOLYCLAUDE_BASE_PATH || typeof rootPath !== 'string' || !rootPath.startsWith('/') || rootPath.startsWith('//')) {
        return rootPath;
    }
    if (hasHolyClaudeBasePath(rootPath)) {
        return rootPath;
    }
    return rootPath === '/' ? HOLYCLAUDE_BASE_PATH + '/' : HOLYCLAUDE_BASE_PATH + rootPath;
}
function stripHolyClaudeBasePathFromUrl(requestUrl) {
    if (!HOLYCLAUDE_BASE_PATH) {
        return requestUrl;
    }
    const parsed = new URL(requestUrl, 'http://holyclaude.local');
    if (!hasHolyClaudeBasePath(parsed.pathname)) {
        return requestUrl;
    }
    parsed.pathname = parsed.pathname === HOLYCLAUDE_BASE_PATH
        ? '/'
        : parsed.pathname.slice(HOLYCLAUDE_BASE_PATH.length) || '/';
    return parsed.pathname + parsed.search;
}
function sendHolyClaudeIndexHtml(req, res, indexPath) {
    if (!HOLYCLAUDE_BASE_PATH) {
        return res.sendFile(indexPath);
    }
    const html = fs.readFileSync(indexPath, 'utf8');
    res.type('html').send(transformHolyClaudeIndexHtml(html));
}
function transformHolyClaudeIndexHtml(html) {
    const prefixAttribute = (source) => source.replace(/\\b(href|src)="\\/(assets\\/[^\"]+|favicon\\.[^\"]+|manifest\\.json|icons\\/[^\"]+|logo-[^\"]+)"/g, (_match, attribute, value) => attribute + '="' + HOLYCLAUDE_BASE_PATH + '/' + value + '"');
    const bootstrap = getHolyClaudeBasePathBootstrap();
    return prefixAttribute(html)
        .replace("navigator.serviceWorker.register('/sw.js')", "navigator.serviceWorker.register('" + HOLYCLAUDE_BASE_PATH + "/sw.js', { scope: '" + HOLYCLAUDE_BASE_PATH + "/' })")
        .replace('    <script type="module"', bootstrap + '\\n    <script type="module"');
}
function getHolyClaudeBasePathBootstrap() {
    const basePath = JSON.stringify(HOLYCLAUDE_BASE_PATH);
    return [
        "    <script>",
        "(() => {",
        "  const basePath = " + basePath + ";",
        "  if (!basePath) return;",
        "  window.__HOLYCLAUDE_BASE_PATH__ = basePath;",
        "  window.__ROUTER_BASENAME__ = basePath;",
        "  const hasBasePath = (pathname) => pathname === basePath || pathname.startsWith(basePath + '/');",
        "  const prefixRootPath = (value) => {",
        "    if (value instanceof URL) value = value.toString();",
        "    if (typeof value !== 'string') return value;",
        "    if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/)/i.test(value)) {",
        "      try {",
        "        const parsed = new URL(value);",
        "        const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';",
        "        const isWs = parsed.protocol === 'ws:' || parsed.protocol === 'wss:';",
        "        if ((isHttp || isWs) && parsed.host === window.location.host && parsed.pathname.startsWith('/') && !hasBasePath(parsed.pathname)) {",
        "          parsed.pathname = basePath + parsed.pathname;",
        "          return parsed.toString();",
        "        }",
        "      } catch {",
        "        // Only same-origin browser URLs are rewritten; malformed values stay untouched.",
        "      }",
        "      return value;",
        "    }",
        "    if (!value.startsWith('/') || value.startsWith('//') || hasBasePath(value)) return value;",
        "    return value === '/' ? basePath + '/' : basePath + value;",
        "  };",
        "  const NativeRequest = window.Request;",
        "  if (NativeRequest) {",
        "    window.Request = function HolyClaudeRequest(input, init) {",
        "      if (input instanceof NativeRequest) {",
        "        const prefixed = prefixRootPath(input.url);",
        "        return prefixed === input.url ? new NativeRequest(input, init) : new NativeRequest(prefixed, init || input);",
        "      }",
        "      return new NativeRequest(prefixRootPath(input), init);",
        "    };",
        "    window.Request.prototype = NativeRequest.prototype;",
        "    Object.setPrototypeOf(window.Request, NativeRequest);",
        "  }",
        "  const nativeFetch = window.fetch.bind(window);",
        "  window.fetch = (input, init) => input instanceof NativeRequest",
        "    ? nativeFetch(new window.Request(input, init), init)",
        "    : nativeFetch(prefixRootPath(input), init);",
        "  if (window.XMLHttpRequest) {",
        "    const nativeOpen = window.XMLHttpRequest.prototype.open;",
        "    window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {",
        "      return nativeOpen.call(this, method, prefixRootPath(url), ...rest);",
        "    };",
        "  }",
        "  if (window.EventSource) {",
        "    const NativeEventSource = window.EventSource;",
        "    window.EventSource = function HolyClaudeEventSource(url, options) {",
        "      return new NativeEventSource(prefixRootPath(url), options);",
        "    };",
        "    window.EventSource.prototype = NativeEventSource.prototype;",
        "    Object.setPrototypeOf(window.EventSource, NativeEventSource);",
        "  }",
        "  if (window.WebSocket) {",
        "    const NativeWebSocket = window.WebSocket;",
        "    window.WebSocket = function HolyClaudeWebSocket(url, protocols) {",
        "      return protocols === undefined",
        "        ? new NativeWebSocket(prefixRootPath(url))",
        "        : new NativeWebSocket(prefixRootPath(url), protocols);",
        "    };",
        "    window.WebSocket.prototype = NativeWebSocket.prototype;",
        "    Object.setPrototypeOf(window.WebSocket, NativeWebSocket);",
        "  }",
        "  if (navigator.serviceWorker?.register) {",
        "    const nativeRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);",
        "    navigator.serviceWorker.register = (scriptURL, options = {}) => nativeRegister(prefixRootPath(scriptURL), { scope: basePath + '/', ...options });",
        "  }",
        "})();",
        "    </script>"
    ].join('\\n');
}
function sendHolyClaudeManifest(req, res, manifestPath) {
    if (!HOLYCLAUDE_BASE_PATH) {
        res.sendFile(manifestPath);
        return;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.start_url = HOLYCLAUDE_BASE_PATH + '/';
    manifest.scope = HOLYCLAUDE_BASE_PATH + '/';
    manifest.icons = Array.isArray(manifest.icons)
        ? manifest.icons.map((icon) => ({ ...icon, src: prefixHolyClaudeRootPath(icon.src) }))
        : manifest.icons;
    res.type('application/manifest+json').send(JSON.stringify(manifest, null, 2));
}
function sendHolyClaudeServiceWorker(req, res, serviceWorkerPath) {
    if (!HOLYCLAUDE_BASE_PATH) {
        res.sendFile(serviceWorkerPath);
        return;
    }
    let source = fs.readFileSync(serviceWorkerPath, 'utf8');
    const cacheSlug = HOLYCLAUDE_BASE_PATH.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'root';
    source = source
        .replace("const CACHE_NAME = 'claude-ui-v2';", "const CACHE_NAME = 'claude-ui-v2-" + cacheSlug + "';\\nconst HOLYCLAUDE_BASE_PATH = '" + HOLYCLAUDE_BASE_PATH + "';")
        .replace("  '/manifest.json'", "  HOLYCLAUDE_BASE_PATH + '/manifest.json'")
        .replace("caches.match('/manifest.json')", "caches.match(HOLYCLAUDE_BASE_PATH + '/manifest.json')")
        .replace("icon: '/logo-256.png'", "icon: HOLYCLAUDE_BASE_PATH + '/logo-256.png'")
        .replace("badge: '/logo-128.png'", "badge: HOLYCLAUDE_BASE_PATH + '/logo-128.png'")
        .replace("const urlPath = sessionId ? \`/session/\${sessionId}\` : '/';", "const urlPath = sessionId ? HOLYCLAUDE_BASE_PATH + '/session/' + sessionId : HOLYCLAUDE_BASE_PATH + '/';");
    res.type('application/javascript').send(source);
}
function sendHolyClaudeCss(req, res, cssPath) {
    if (!HOLYCLAUDE_BASE_PATH) {
        res.sendFile(cssPath);
        return;
    }
    const source = fs.readFileSync(cssPath, 'utf8').replace(/url\\(\\/assets\\//g, 'url(' + HOLYCLAUDE_BASE_PATH + '/assets/');
    res.type('text/css').setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(source);
}
`;

const WEBSOCKET_HELPER = `// HolyClaude base path support (issue #64)
const HOLYCLAUDE_BASE_PATH = normalizeHolyClaudeBasePath(process.env.HOLYCLAUDE_BASE_PATH);
function normalizeHolyClaudeBasePath(value) {
    const raw = String(value ?? '').trim();
    if (!raw || raw === '/') {
        return '';
    }
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.endsWith('/')) {
        throw new Error('HOLYCLAUDE_BASE_PATH must be empty, /, or a path like /holyclaude without a trailing slash');
    }
    if (raw.includes('\\\\') || raw.includes('?') || raw.includes('#')) {
        throw new Error('HOLYCLAUDE_BASE_PATH must be a path only, not a URL or query string');
    }
    let decoded;
    try {
        decoded = decodeURIComponent(raw);
    }
    catch {
        throw new Error('HOLYCLAUDE_BASE_PATH contains malformed percent encoding');
    }
    if (decoded.split('/').some((segment) => segment === '.' || segment === '..')) {
        throw new Error('HOLYCLAUDE_BASE_PATH cannot contain . or .. path segments');
    }
    return raw;
}
function hasHolyClaudeBasePath(pathname) {
    return !!HOLYCLAUDE_BASE_PATH && (pathname === HOLYCLAUDE_BASE_PATH || pathname.startsWith(HOLYCLAUDE_BASE_PATH + '/'));
}
function stripHolyClaudeBasePathFromPathname(pathname) {
    if (!hasHolyClaudeBasePath(pathname)) {
        return pathname;
    }
    return pathname === HOLYCLAUDE_BASE_PATH
        ? '/'
        : pathname.slice(HOLYCLAUDE_BASE_PATH.length) || '/';
}
`;

function fail() {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

function readSource(filePath) {
  try {
    return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    fail();
  }
}

function writeSource(filePath, source) {
  try {
    writeFileSync(filePath, source);
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

function assertServerPatched(source) {
  if (!source.includes(PATCH_MARKER)
    || !source.includes('normalizeHolyClaudeBasePath(process.env.HOLYCLAUDE_BASE_PATH)')
    || !source.includes('stripHolyClaudeBasePathFromUrl(req.url)')
    || !source.includes("app.get('/manifest.json'")
    || !source.includes("app.get('/sw.js'")
    || !source.includes("app.get(/^\\/assets\\/.*\\.css$/")
    || !source.includes('sendHolyClaudeIndexHtml(req, res, indexPath)')
    || !source.includes('index: false,')) {
    fail();
  }
}

function assertWebSocketPatched(source) {
  if (!source.includes(PATCH_MARKER)
    || !source.includes('stripHolyClaudeBasePathFromPathname(websocketUrl.pathname)')
    || !source.includes('incomingRequest.url = websocketUrl.pathname + websocketUrl.search')) {
    fail();
  }
}

function patchServerIndex(filePath) {
  let source = readSource(filePath);
  if (source.includes('stripHolyClaudeBasePathFromUrl(req.url)') && source.includes('sendHolyClaudeIndexHtml(req, res, indexPath)')) {
    assertServerPatched(source);
    return;
  }

  source = replaceRequired(
    source,
    'const server = http.createServer(app);',
    `const server = http.createServer(app);\n${SERVER_HELPER}`
  );
  source = replaceRequired(
    source,
    `// Make WebSocket server available to routes\napp.locals.wss = wss;\napp.use(cors({ exposedHeaders: ['X-Refreshed-Token', 'X-Auth-Error'] }));`,
    `// Make WebSocket server available to routes\napp.locals.wss = wss;\napp.use((req, res, next) => {\n    const strippedUrl = stripHolyClaudeBasePathFromUrl(req.url);\n    if (strippedUrl !== req.url) {\n        req.url = strippedUrl;\n    }\n    next();\n});\napp.use(cors({ exposedHeaders: ['X-Refreshed-Token', 'X-Auth-Error'] }));`
  );
  source = replaceRequired(
    source,
    `// Serve public files (like api-docs.html)\napp.use(express.static(path.join(APP_ROOT, 'public')));`,
    `// Serve public files (like api-docs.html)\napp.use(express.static(path.join(APP_ROOT, 'public')));\napp.get('/manifest.json', (req, res) => sendHolyClaudeManifest(req, res, path.join(APP_ROOT, 'dist', 'manifest.json')));\napp.get('/sw.js', (req, res) => sendHolyClaudeServiceWorker(req, res, path.join(APP_ROOT, 'dist', 'sw.js')));\napp.get(/^\\/assets\\/.*\\.css$/, (req, res) => sendHolyClaudeCss(req, res, path.join(APP_ROOT, 'dist', 'assets', path.basename(req.path))));`
  );
  source = replaceRequired(
    source,
    `app.use(express.static(path.join(APP_ROOT, 'dist'), {\n    setHeaders: (res, filePath) => {`,
    `app.use(express.static(path.join(APP_ROOT, 'dist'), {\n    index: false,\n    setHeaders: (res, filePath) => {`
  );
  source = replaceRequired(
    source,
    `        res.setHeader('Expires', '0');
        res.sendFile(indexPath);`,
    `        res.setHeader('Expires', '0');
        sendHolyClaudeIndexHtml(req, res, indexPath);`
  );

  assertServerPatched(source);
  writeSource(filePath, source);
}

function patchWebSocketServer(filePath) {
  let source = readSource(filePath);
  if (source.includes('stripHolyClaudeBasePathFromPathname(websocketUrl.pathname)')) {
    assertWebSocketPatched(source);
    return;
  }

  source = replaceRequired(
    source,
    `import { handleDesktopNotificationsConnection } from '../../../modules/notifications/index.js';\n/**`,
    `import { handleDesktopNotificationsConnection } from '../../../modules/notifications/index.js';\n${WEBSOCKET_HELPER}/**`
  );
  source = replaceRequired(
    source,
    `        const incomingRequest = request;\n        const url = incomingRequest.url ?? '/';\n        const pathname = new URL(url, 'http://localhost').pathname;`,
    `        const incomingRequest = request;\n        const url = incomingRequest.url ?? '/';\n        const websocketUrl = new URL(url, 'http://localhost');\n        const pathname = stripHolyClaudeBasePathFromPathname(websocketUrl.pathname);\n        if (pathname !== websocketUrl.pathname) {\n            websocketUrl.pathname = pathname;\n            incomingRequest.url = websocketUrl.pathname + websocketUrl.search;\n        }`
  );

  assertWebSocketPatched(source);
  writeSource(filePath, source);
}

function verifyStaticFiles(packageRoot) {
  const indexPath = path.join(packageRoot, 'dist', 'index.html');
  const manifestPath = path.join(packageRoot, 'dist', 'manifest.json');
  const serviceWorkerPath = path.join(packageRoot, 'dist', 'sw.js');
  const assetsPath = path.join(packageRoot, 'dist', 'assets');

  if (!existsSync(indexPath) || !existsSync(manifestPath) || !existsSync(serviceWorkerPath) || !existsSync(assetsPath)) {
    fail();
  }

  const index = readSource(indexPath);
  const manifest = readSource(manifestPath);
  const serviceWorker = readSource(serviceWorkerPath);
  const cssFiles = readdirSync(assetsPath).filter((file) => file.endsWith('.css'));
  const jsFiles = readdirSync(assetsPath).filter((file) => file.endsWith('.js'));

  if (!index.includes('href="/manifest.json"')
    || !index.includes("navigator.serviceWorker.register('/sw.js')")
    || !manifest.includes('"start_url": "/"')
    || !manifest.includes('"scope": "/"')
    || !serviceWorker.includes("const CACHE_NAME = 'claude-ui-v2';")
    || !serviceWorker.includes("icon: '/logo-256.png'")
    || cssFiles.length === 0
    || !cssFiles.some((file) => {
      return readSource(path.join(assetsPath, file)).includes('url(/assets/');
    })
    || jsFiles.length === 0
    || !jsFiles.some((file) => {
      return readSource(path.join(assetsPath, file)).includes('__ROUTER_BASENAME__');
    })) {
    fail();
  }
}

const serverIndexPath = path.join(PACKAGE_ROOT, 'dist-server', 'server', 'index.js');
const webSocketServerPath = path.join(PACKAGE_ROOT, 'dist-server', 'server', 'modules', 'websocket', 'services', 'websocket-server.service.js');

if (!existsSync(serverIndexPath) || !existsSync(webSocketServerPath)) {
  fail();
}

verifyStaticFiles(PACKAGE_ROOT);
patchServerIndex(serverIndexPath);
patchWebSocketServer(webSocketServerPath);

console.log('[patch] CloudCLI base path support applied');
