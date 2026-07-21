#!/usr/bin/env bash
set -Eeuo pipefail

VARIANT="${HOLYCLAUDE_BROWSER_SMOKE_VARIANT:?HOLYCLAUDE_BROWSER_SMOKE_VARIANT is required}"
SENTINEL_TEXT="HolyClaude Browser Runtime Sentinel"
SENTINEL_DETAIL="browser-runtime-smoke-${VARIANT}"
SENTINEL_ROOT="$(mktemp -d)"
SENTINEL_PORT_FILE="$SENTINEL_ROOT/port"
SENTINEL_LOG="$SENTINEL_ROOT/sentinel.log"
SESSION_ID=""

cleanup() {
  if [ -n "${SESSION_ID:-}" ] && [ -n "${MCP_TOKEN:-}" ]; then
    api_mcp browser_close_session "{\"sessionId\":\"$SESSION_ID\"}" >/dev/null 2>&1 || true
  fi
  if [ -n "${SENTINEL_PID:-}" ]; then
    kill "$SENTINEL_PID" >/dev/null 2>&1 || true
    wait "$SENTINEL_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$SENTINEL_ROOT"
}

trap cleanup EXIT

evidence() {
  printf 'browser-smoke: %s\n' "$*"
}

require_eq() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" != "$expected" ]; then
    echo "$name expected $expected, got $actual" >&2
    exit 1
  fi
}

curl_json() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local output="$4"
  if [ -n "$body" ]; then
    curl -fsS \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      --data "$body" \
      "$url" > "$output"
  else
    curl -fsS \
      -X "$method" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$url" > "$output"
  fi
}

api_mcp() {
  local tool_name="$1"
  local body="${2:-}"
  if [ -z "$body" ]; then
    body='{}'
  fi
  curl -sS \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $MCP_TOKEN" \
    --data "$body" \
    "http://127.0.0.1:3001/api/browser-use-mcp/tools/$tool_name"
}

assert_success_json() {
  local file="$1"
  node - "$file" <<'NODE'
const fs = require('node:fs');
const file = process.argv[2];
const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
if (payload.success === false || payload.error) {
  console.error(payload.error || 'JSON response was not successful');
  process.exit(1);
}
NODE
}

snapshot_browser_tree() {
  local output="$1"
  node - "$output" <<'NODE'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const output = process.argv[2];
const targets = [
  '/home/claude/.cache/ms-playwright',
  '/root/.cache/ms-playwright',
  '/ms-playwright',
  '/usr/lib/chromium',
  '/usr/local/lib/node_modules/playwright',
  '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/playwright'
];
let report = '';
for (const target of targets) {
  if (!fs.existsSync(target)) {
    report += `${target} MISSING\n`;
    continue;
  }
  const stat = fs.statSync(target);
  const listing = execFileSync('find', [target, '-maxdepth', '3', '-printf', '%y %p %s\n'], { encoding: 'utf8' });
  report += `${target} ${stat.isDirectory() ? 'DIR' : 'FILE'}\n${listing}`;
}
fs.writeFileSync(output, report);
NODE
}

start_sentinel() {
  cat > "$SENTINEL_ROOT/index.html" <<HTML
<!doctype html>
<html>
  <head><title>HolyClaude Browser Runtime Smoke</title></head>
  <body>
    <main id="sentinel">
      <h1>$SENTINEL_TEXT</h1>
      <p>$SENTINEL_DETAIL</p>
    </main>
  </body>
</html>
HTML

  python3 - "$SENTINEL_ROOT" "$SENTINEL_PORT_FILE" >"$SENTINEL_LOG" 2>&1 <<'PY' &
import functools
import http.server
import os
import socketserver
import sys

root, port_file = sys.argv[1:3]
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=root)
with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
    with open(port_file, "w", encoding="utf-8") as handle:
        handle.write(str(httpd.server_address[1]))
    httpd.serve_forever()
PY
  SENTINEL_PID="$!"

  local deadline=$((SECONDS + 30))
  while [ ! -s "$SENTINEL_PORT_FILE" ]; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      cat "$SENTINEL_LOG" >&2 || true
      echo "sentinel did not publish a port" >&2
      exit 1
    fi
    sleep 1
  done
  SENTINEL_PORT="$(cat "$SENTINEL_PORT_FILE")"
  SENTINEL_URL="http://127.0.0.1:${SENTINEL_PORT}/"
  curl -fsS "$SENTINEL_URL" | grep -F "$SENTINEL_TEXT" >/dev/null
  evidence "sentinel_url=http://127.0.0.1:${SENTINEL_PORT}/"
}

assert_direct_package_inventories() {
  local npm_inventory="$SENTINEL_ROOT/npm-inventory.json"
  npm ls --global --depth=0 --json > "$npm_inventory"
  node - "$npm_inventory" "$VARIANT" <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const inventory = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const variant = process.argv[3];
const common = {
  '@cloudcli-ai/cloudcli': '1.36.3',
  '@google/gemini-cli': '0.51.0',
  '@openai/codex': '0.144.6',
  concurrently: '10.0.3',
  'dotenv-cli': '11.0.0',
  esbuild: '0.28.1',
  eslint: '10.7.0',
  nodemon: '3.1.14',
  npm: '11.18.0',
  playwright: '1.61.0',
  pnpm: '11.15.1',
  prettier: '3.9.6',
  serve: '14.2.6',
  'task-master-ai': '0.43.1',
  tsx: '4.23.1',
  typescript: '6.0.3',
  vite: '8.1.5',
};
const full = {
  '@cloudflare/next-on-pages': '1.13.16',
  '@earendil-works/pi-coding-agent': '0.81.0',
  '@lhci/cli': '0.15.1',
  '@marp-team/marp-cli': '4.5.0',
  'drizzle-kit': '0.31.10',
  'eas-cli': '20.5.1',
  'http-server': '14.1.1',
  'json-server': '1.0.0-beta.15',
  lighthouse: '13.4.1',
  'netlify-cli': '26.2.0',
  'opencode-ai': '1.18.4',
  pm2: '7.0.3',
  prisma: '7.9.0',
  'sharp-cli': '5.2.0',
  vercel: '54.21.1',
  wrangler: '4.112.0',
};
const expected = variant === 'full' ? { ...common, ...full } : common;
const actual = Object.fromEntries(
  Object.entries(inventory.dependencies ?? {}).map(([name, value]) => [name, value.version]),
);
assert.deepEqual(actual, expected);
NODE

  python3 - "$VARIANT" <<'PY'
import json
import re
import subprocess
import sys

variant = sys.argv[1]
common = {
    'apprise': '1.12.0',
    'bandit': '1.9.4',
    'beautifulsoup4': '4.15.0',
    'click': '8.4.2',
    'defusedxml': '0.7.1',
    'desloppify': '1.0',
    'httpx': '0.28.1',
    'jinja2': '3.1.6',
    'lxml': '6.1.1',
    'markdown': '3.10.2',
    'numpy': '2.4.6',
    'openpyxl': '3.1.5',
    'pandas': '3.0.3',
    'pillow': '12.3.0',
    'playwright': '1.61.0',
    'python-docx': '1.2.0',
    'python-dotenv': '1.2.2',
    'pyyaml': '6.0.3',
    'requests': '2.34.2',
    'rich': '15.0.0',
    'stevedore': '5.9.0',
    'tqdm': '4.69.0',
    'tree-sitter': '0.26.0',
    'tree-sitter-language-pack': '1.6.2',
}
full = {
    'cairosvg': '2.9.0',
    'fastapi': '0.139.2',
    'fpdf2': '2.8.7',
    'img2pdf': '0.6.3',
    'matplotlib': '3.11.1',
    'pdfkit': '1.0.0',
    'pymupdf': '1.28.0',
    'python-pptx': '1.0.2',
    'reportlab': '5.0.0',
    'seaborn': '0.13.2',
    'uvicorn': '0.51.0',
    'weasyprint': '69.0',
    'xlrd': '2.0.2',
    'xlsxwriter': '3.2.9',
}
expected = common | full if variant == 'full' else common
inspection = json.loads(subprocess.check_output([sys.executable, '-m', 'pip', 'inspect', '--local']))
canonicalize = lambda value: re.sub(r'[-_.]+', '-', value).lower()
actual = {
    canonicalize(item['metadata']['name']): item['metadata']['version']
    for item in inspection['installed']
    if item.get('requested')
}
if actual != expected:
    raise SystemExit(f'direct Python package inventory mismatch: {actual} != {expected}')
PY
  evidence "direct_package_inventory=exact variant=$VARIANT"
}

assert_runtime_identity() {
  require_eq "runtime user" "$(id -un)" "claude"
  require_eq "command -v chromium" "$(command -v chromium)" "/usr/bin/chromium"
  require_eq "CHROME_PATH" "${CHROME_PATH:-}" "/usr/bin/chromium"
  require_eq "PUPPETEER_EXECUTABLE_PATH" "${PUPPETEER_EXECUTABLE_PATH:-}" "/usr/bin/chromium"
  test -x /usr/bin/chromium
  test -x /usr/lib/chromium/chromium
  require_eq "Chromium Debian package version" "$(dpkg-query -W -f='${Version}' chromium)" "150.0.7871.124-1~deb12u1"
  local cloudcli_version
  local cloudcli_package_version
  cloudcli_version="$(cloudcli --version 2>/dev/null || node -p "require('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json').version")"
  cloudcli_package_version="$(node -p "require('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json').version")"
  require_eq "CloudCLI package version" "$cloudcli_package_version" "1.36.3"
  require_eq "Node version" "$(node --version)" "v26.5.0"
  require_eq "npm version" "$(npm --version)" "11.18.0"
  require_eq "pnpm version" "$(pnpm --version)" "11.15.1"
  require_eq "Vite package version" "$(node -p "require('/usr/local/lib/node_modules/vite/package.json').version")" "8.1.5"
  require_eq "Prettier package version" "$(node -p "require('/usr/local/lib/node_modules/prettier/package.json').version")" "3.9.6"
  require_eq "Codex package version" "$(node -p "require('/usr/local/lib/node_modules/@openai/codex/package.json').version")" "0.144.6"
  require_eq "Gemini package version" "$(node -p "require('/usr/local/lib/node_modules/@google/gemini-cli/package.json').version")" "0.51.0"
  require_eq "tree-sitter language pack" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("tree-sitter-language-pack"))')" "1.6.2"
  require_eq "tqdm package version" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("tqdm"))')" "4.69.0"
  require_eq "fzf version" "$(fzf --version | awk '{print $1}')" "0.74.1"
  require_eq "Claude Code version" "$(claude --version | awk '{print $1}')" "2.1.216"
  require_eq "Cursor Agent build" "$(cursor-agent --version)" "2026.07.17-3e2a980"
  if [ "$VARIANT" = "full" ]; then
    require_eq "EAS tar package version" "$(node -p "require('/usr/local/lib/node_modules/eas-cli/node_modules/tar/package.json').version")" "7.5.20"
    require_eq "EAS tar dependency" "$(node -p "require('/usr/local/lib/node_modules/eas-cli/package.json').dependencies.tar")" "7.5.20"
    require_eq "Vercel tar package version" "$(node -p "require('/usr/local/lib/node_modules/vercel/node_modules/tar/package.json').version")" "7.5.20"
    require_eq "Vercel tar dependency" "$(node -p "require('/usr/local/lib/node_modules/vercel/node_modules/@vercel/fun/package.json').dependencies.tar")" "7.5.20"
    node -e "for (const path of ['/usr/local/lib/node_modules/eas-cli/node_modules/tar', '/usr/local/lib/node_modules/vercel/node_modules/tar']) { if (typeof require(path).list !== 'function') throw new Error('invalid tar module at ' + path); }"
    eas --version >/dev/null
    vercel --version >/dev/null
    evidence "Node tar security overlay=7.5.20 eas=ok vercel=ok"
    require_eq "Netlify CLI package version" "$(node -p "require('/usr/local/lib/node_modules/netlify-cli/package.json').version")" "26.2.0"
    netlify --version >/dev/null
    test ! -e "/usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/local-functions-proxy-linux-x64/bin/local-functions-proxy"
    test ! -e "/usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/local-functions-proxy-linux-arm64/bin/local-functions-proxy"
    require_eq "Wrangler package version" "$(node -p "require('/usr/local/lib/node_modules/wrangler/package.json').version")" "4.112.0"
    require_eq "Prisma package version" "$(node -p "require('/usr/local/lib/node_modules/prisma/package.json').version")" "7.9.0"
    require_eq "Lighthouse package version" "$(node -p "require('/usr/local/lib/node_modules/lighthouse/package.json').version")" "13.4.1"
    require_eq "Marp CLI package version" "$(node -p "require('/usr/local/lib/node_modules/@marp-team/marp-cli/package.json').version")" "4.5.0"
    require_eq "OpenCode package version" "$(node -p "require('/usr/local/lib/node_modules/opencode-ai/package.json').version")" "1.18.4"
    require_eq "Pi package version" "$(node -p "require('/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/package.json').version")" "0.81.0"
    require_eq "Matplotlib package version" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("matplotlib"))')" "3.11.1"
    require_eq "FastAPI package version" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("fastapi"))')" "0.139.2"
    require_eq "Junie build" "$(basename "$(readlink /home/claude/.local/share/junie/current)")" "2285.5"
  else
    test ! -e /usr/local/lib/node_modules/wrangler
    test ! -e /usr/local/lib/node_modules/prisma
    test ! -e /usr/local/lib/node_modules/lighthouse
    test ! -e /usr/local/lib/node_modules/@marp-team/marp-cli
    test ! -e /usr/local/lib/node_modules/opencode-ai
    test ! -e /usr/local/lib/node_modules/@earendil-works/pi-coding-agent
    ! python3 -c 'import matplotlib' 2>/dev/null
    ! python3 -c 'import fastapi' 2>/dev/null
    test ! -e /home/claude/.local/share/junie/current
  fi
  evidence "variant=$VARIANT user=$(id -un)"
  evidence "chromium_path=/usr/bin/chromium chrome_path=$CHROME_PATH puppeteer_path=$PUPPETEER_EXECUTABLE_PATH"
  evidence "chromium_version=$(/usr/bin/chromium --version)"
  evidence "cloudcli_version=$cloudcli_version package=$cloudcli_package_version"
}

assert_direct_chromium() {
  local dom_file="$SENTINEL_ROOT/chromium-dom.html"
  /usr/bin/chromium \
    --headless=new \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --dump-dom \
    "$SENTINEL_URL" > "$dom_file"
  grep -F "$SENTINEL_TEXT" "$dom_file" >/dev/null
  evidence "direct_chromium_dom=ok"
}

assert_python_playwright() {
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 python3 - "$SENTINEL_URL" "$SENTINEL_TEXT" <<'PY'
import os
import shlex
import sys
from playwright.sync_api import sync_playwright

url, expected = sys.argv[1:3]
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ["CHROME_PATH"],
        headless=True,
        args=shlex.split(os.environ.get("CHROMIUM_FLAGS", "")),
    )
    page = browser.new_page()
    page.goto(url, wait_until="domcontentloaded")
    text = page.locator("body").inner_text()
    browser.close()
if expected not in text:
    raise SystemExit("Python Playwright did not render sentinel text")
PY
  local py_version
  py_version="$(python3 - <<'PY'
import importlib.metadata
print(importlib.metadata.version("playwright"))
PY
)"
  require_eq "Python Playwright version" "$py_version" "1.61.0"
  evidence "python_playwright=1.61.0 launch=ok"
}

assert_node_playwright() {
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node - "$SENTINEL_URL" "$SENTINEL_TEXT" <<'NODE'
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const url = process.argv[2];
const expected = process.argv[3];
const requireFromGlobal = createRequire('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json');
const version = requireFromGlobal('playwright/package.json').version;
assert.equal(version, '1.61.0');
(async () => {
  const { chromium } = requireFromGlobal('playwright');
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: (process.env.CHROMIUM_FLAGS || '').split(/\s+/).filter(Boolean),
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const text = await page.locator('body').innerText();
  await browser.close();
  assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
  evidence "node_playwright=1.61.0 launch=ok"
}

register_cloudcli_account() {
  local username="browser-smoke"
  local password_file="$SENTINEL_ROOT/password"
  local response_file="$SENTINEL_ROOT/register.json"
  umask 077
  node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))" > "$password_file"
  local password
  password="$(cat "$password_file")"
  curl -fsS \
    -X POST \
    -H "Content-Type: application/json" \
    --data "{\"username\":\"$username\",\"password\":\"$password\"}" \
    http://127.0.0.1:3001/api/auth/register > "$response_file"
  AUTH_TOKEN="$(node - "$response_file" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (payload.success !== true || typeof payload.token !== 'string' || payload.user?.username !== 'browser-smoke') {
  console.error('CloudCLI registration failed');
  process.exit(1);
}
process.stdout.write(payload.token);
NODE
)"
  test -n "$AUTH_TOKEN"
  evidence "cloudcli_account=registered token=redacted"
}

rotate_cloudcli_account() {
  local username="browser-smoke"
  local current_password
  local new_password
  local old_token="$AUTH_TOKEN"
  local response_file="$SENTINEL_ROOT/account-response.json"
  local status

  current_password="$(cat "$SENTINEL_ROOT/password")"
  new_password="$(node -e "process.stdout.write(require('node:crypto').randomBytes(24).toString('hex'))")"

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $old_token" \
    --data "{\"currentPassword\":\"$current_password\",\"newPassword\":\"$new_password\"}" \
    http://127.0.0.1:3001/api/auth/change-password)"
  require_eq "change-password status" "$status" "200"
  assert_success_json "$response_file"

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -H "Authorization: Bearer $old_token" \
    http://127.0.0.1:3001/api/auth/user)"
  require_eq "old REST token status" "$status" "401"

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    "http://127.0.0.1:3001/api/auth/user?token=$old_token")"
  require_eq "old query token status" "$status" "401"

  DATABASE_PATH=/home/claude/.cloudcli/auth.db node --input-type=module - "$old_token" <<'NODE'
const oldToken = process.argv[2];
const { authenticateWebSocket } = await import(
  'file:///usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/middleware/auth.js'
);
if (authenticateWebSocket(oldToken) !== null) {
  console.error('CloudCLI accepted an invalidated WebSocket token');
  process.exit(1);
}
NODE

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    --data "{\"username\":\"$username\",\"password\":\"$current_password\"}" \
    http://127.0.0.1:3001/api/auth/login)"
  require_eq "old password login status" "$status" "401"

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -X POST \
    -H 'Content-Type: application/json' \
    --data "{\"username\":\"$username\",\"password\":\"$new_password\"}" \
    http://127.0.0.1:3001/api/auth/login)"
  require_eq "new password login status" "$status" "200"
  AUTH_TOKEN="$(node - "$response_file" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (payload.success !== true || typeof payload.token !== 'string' || payload.user?.username !== 'browser-smoke') {
  console.error('CloudCLI login after password rotation failed');
  process.exit(1);
}
process.stdout.write(payload.token);
NODE
)"
  test -n "$AUTH_TOKEN"

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    http://127.0.0.1:3001/api/auth/logout)"
  require_eq "logout status" "$status" "200"
  assert_success_json "$response_file"

  status="$(curl -sS -o "$response_file" -w '%{http_code}' \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    http://127.0.0.1:3001/api/auth/user)"
  require_eq "post-logout token status" "$status" "200"
  evidence "cloudcli_account=rotated old_token_rejected=true"
}

exercise_cloudcli_browser_mcp() {
  local response="$SENTINEL_ROOT/browser-response.json"

  curl_json PUT http://127.0.0.1:3001/api/browser-use/settings '{"enabled":true}' "$response"
  assert_success_json "$response"
  node - "$response" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (payload.data?.settings?.enabled !== true) {
  console.error('Browser setting was not enabled');
  process.exit(1);
}
NODE

  curl_json GET http://127.0.0.1:3001/api/browser-use/status "" "$response"
  assert_success_json "$response"
  node - "$response" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const status = payload.data;
if (!status?.enabled || !status?.available || !status?.playwrightInstalled || !status?.chromiumInstalled) {
  console.error(`Browser status is not available: ${JSON.stringify(status)}`);
  process.exit(1);
}
NODE
  evidence "cloudcli_browser_status=available"

  MCP_TOKEN="$(sqlite3 /home/claude/.cloudcli/auth.db "SELECT value FROM app_config WHERE key = 'browser_use_mcp_token';")"
  if [ "${#MCP_TOKEN}" -lt 32 ]; then
    echo "Browser MCP token was not persisted in CloudCLI database" >&2
    exit 1
  fi
  evidence "cloudcli_mcp_token=persisted_redacted"

  api_mcp browser_create_session '{}' > "$response"
  assert_success_json "$response"
  SESSION_ID="$(node - "$response" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const session = payload.data;
if (session?.status !== 'ready' || typeof session.id !== 'string') {
  console.error(`Browser session was not ready: ${JSON.stringify(session)}`);
  process.exit(1);
}
process.stdout.write(session.id);
NODE
)"
  evidence "cloudcli_mcp_create_session=ready session=redacted"

  api_mcp browser_navigate "{\"sessionId\":\"$SESSION_ID\",\"url\":\"$SENTINEL_URL\"}" > "$response"
  assert_success_json "$response"
  node - "$response" "$SENTINEL_URL" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const expectedUrl = process.argv[3];
if (payload.data?.status !== 'ready' || payload.data?.url !== expectedUrl) {
  console.error(`Browser did not navigate to sentinel: ${JSON.stringify(payload.data)}`);
  process.exit(1);
}
NODE
  evidence "cloudcli_mcp_navigate=ok"

  api_mcp browser_snapshot "{\"sessionId\":\"$SESSION_ID\"}" > "$response"
  assert_success_json "$response"
  node - "$response" "$SENTINEL_TEXT" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const expected = process.argv[3];
if (!payload.data?.text?.includes(expected)) {
  console.error('Browser MCP snapshot did not include sentinel text');
  process.exit(1);
}
if (!payload.data?.session?.screenshotDataUrl?.startsWith('data:image/jpeg;base64,')) {
  console.error('Browser MCP snapshot did not include a screenshot data URL');
  process.exit(1);
}
NODE
  evidence "cloudcli_mcp_snapshot=ok"

  api_mcp browser_close_session "{\"sessionId\":\"$SESSION_ID\"}" > "$response"
  assert_success_json "$response"
  SESSION_ID=""
  evidence "cloudcli_mcp_close_session=ok"
}

assert_lighthouse_full_variant() {
  if [ "$VARIANT" != "full" ]; then
    evidence "lighthouse=skipped variant=$VARIANT"
    return
  fi

  local report="$SENTINEL_ROOT/lighthouse.json"
  lighthouse "$SENTINEL_URL" \
    --quiet \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage" \
    --output=json \
    --output-path="$report" >/dev/null
  node - "$report" <<'NODE'
const fs = require('node:fs');
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (report.finalUrl !== undefined && !report.finalUrl.startsWith('http://127.0.0.1:')) {
  console.error(`Unexpected Lighthouse finalUrl: ${report.finalUrl}`);
  process.exit(1);
}
if (typeof report.lighthouseVersion !== 'string' || typeof report.categories?.performance?.score !== 'number') {
  console.error('Lighthouse report is missing expected fields');
  process.exit(1);
}
NODE
  evidence "lighthouse=ok"
}

assert_runtime_identity
start_sentinel
snapshot_browser_tree "$SENTINEL_ROOT/browser-tree-before.txt"
assert_direct_package_inventories
assert_direct_chromium
assert_python_playwright
assert_node_playwright
register_cloudcli_account
rotate_cloudcli_account
exercise_cloudcli_browser_mcp
assert_lighthouse_full_variant
snapshot_browser_tree "$SENTINEL_ROOT/browser-tree-after.txt"
if ! cmp -s "$SENTINEL_ROOT/browser-tree-before.txt" "$SENTINEL_ROOT/browser-tree-after.txt"; then
  echo "browser runtime tree changed during smoke; possible download/install occurred" >&2
  diff -u "$SENTINEL_ROOT/browser-tree-before.txt" "$SENTINEL_ROOT/browser-tree-after.txt" >&2 || true
  exit 1
fi
evidence "browser_download_install=not_observed"
evidence "container_checks=success"
