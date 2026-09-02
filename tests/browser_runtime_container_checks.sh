#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/browser_snapshot_retry.sh"

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
  '@cloudcli-ai/cloudcli': '1.37.2',
  '@google/gemini-cli': '0.58.0',
  '@openai/codex': '0.152.1',
  concurrently: '10.0.5',
  'dotenv-cli': '11.0.0',
  esbuild: '0.28.2',
  eslint: '10.9.1',
  nodemon: '3.1.14',
  npm: '12.0.2',
  playwright: '1.62.1',
  pnpm: '11.25.0',
  prettier: '3.9.6',
  serve: '14.2.6',
  'task-master-ai': '0.43.1',
  tsx: '4.23.13',
  typescript: '7.0.2',
  vite: '8.2.2',
};
const full = {
  '@cloudflare/next-on-pages': '1.13.16',
  '@earendil-works/pi-coding-agent': '0.84.4',
  '@lhci/cli': '0.15.1',
  '@marp-team/marp-cli': '4.5.0',
  'drizzle-kit': '0.31.10',
  'eas-cli': '23.2.0',
  'http-server': '14.1.1',
  'json-server': '0.17.4',
  lighthouse: '13.4.1',
  'netlify-cli': '27.4.2',
  'opencode-ai': '1.18.26',
  pm2: '7.0.4',
  prisma: '7.10.0',
  'sharp-cli': '6.1.0',
  vercel: '59.11.1',
  wrangler: '4.128.0',
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
    'apprise': '1.13.1',
    'bandit': '1.9.4',
    'beautifulsoup4': '4.15.0',
    'click': '8.5.0',
    'defusedxml': '0.7.1',
    'desloppify': '1.0',
    'httpx': '0.28.1',
    'jinja2': '3.1.6',
    'lxml': '6.1.2',
    'markdown': '3.10.3',
    'numpy': '2.5.2',
    'openpyxl': '3.1.5',
    'pandas': '3.0.5',
    'pillow': '12.3.0',
    'pip': '26.2.1',
    'playwright': '1.62.0',
    'python-docx': '1.2.0',
    'python-dotenv': '1.2.3',
    'pyyaml': '6.0.3',
    'requests': '2.34.2',
    'rich': '15.0.0',
    'setuptools': '84.0.0',
    'stevedore': '5.9.1',
    'tqdm': '4.70.0',
    'tree-sitter': '0.26.0',
    'tree-sitter-language-pack': '1.16.1',
}
full = {
    'cairosvg': '2.9.0',
    'fastapi': '0.141.1',
    'fpdf2': '2.8.8',
    'img2pdf': '0.6.3',
    'matplotlib': '3.11.1',
    'pymupdf': '1.28.2',
    'python-pptx': '1.0.2',
    'reportlab': '5.0.1',
    'seaborn': '0.13.2',
    'uvicorn': '0.52.4',
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
  require_eq "Chromium Debian package version" "$(dpkg-query -W -f='${Version}' chromium)" "151.0.7922.173-1~deb12u1"
  local cloudcli_version
  local cloudcli_package_version
  cloudcli_version="$(cloudcli --version 2>/dev/null || node -p "require('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json').version")"
  cloudcli_package_version="$(node -p "require('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json').version")"
  require_eq "CloudCLI package version" "$cloudcli_package_version" "1.37.2"
  require_eq "Node version" "$(node --version)" "v26.8.1"
  require_eq "npm version" "$(npm --version)" "12.0.2"
  require_eq "npm tar package version" "$(node -p "require('/usr/local/lib/node_modules/npm/node_modules/tar/package.json').version")" "7.5.22"
  require_eq "npm tar dependency" "$(node -p "require('/usr/local/lib/node_modules/npm/package.json').dependencies.tar")" "7.5.22"
  node -e "if (typeof require('/usr/local/lib/node_modules/npm/node_modules/tar').list !== 'function') throw new Error('invalid npm tar module')"
  npm --prefix /usr/local/lib/node_modules/npm ls tar --all >/dev/null
  require_eq "pnpm version" "$(pnpm --version)" "11.25.0"
  require_eq "Vite package version" "$(node -p "require('/usr/local/lib/node_modules/vite/package.json').version")" "8.2.2"
  require_eq "Prettier package version" "$(node -p "require('/usr/local/lib/node_modules/prettier/package.json').version")" "3.9.6"
  require_eq "Codex package version" "$(node -p "require('/usr/local/lib/node_modules/@openai/codex/package.json').version")" "0.152.1"
  require_eq "Gemini package version" "$(node -p "require('/usr/local/lib/node_modules/@google/gemini-cli/package.json').version")" "0.58.0"
  require_eq "tree-sitter language pack" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("tree-sitter-language-pack"))')" "1.16.1"
  require_eq "tqdm package version" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("tqdm"))')" "4.70.0"
  require_eq "fzf version" "$(fzf --version | awk '{print $1}')" "0.74.3"
  require_eq "Claude Code version" "$(claude --version | awk '{print $1}')" "2.1.258"
  require_eq "GitHub CLI version" "$(gh --version | awk 'NR == 1 {print $3}')" "2.99.0"
  require_eq "Cursor Agent build" "$(cursor-agent --version)" "2026.08.31-4057e58"
  if [ "$VARIANT" = "full" ]; then
    local libssh_gcrypt_path
    require_eq "libssh-gcrypt-4 package version" "$(dpkg-query -W -f='${Version}' libssh-gcrypt-4)" "0.10.6-0+deb12u2"
    libssh_gcrypt_path="$(dpkg -L libssh-gcrypt-4 | grep '/libssh-gcrypt\.so\.4$')"
    test -n "$libssh_gcrypt_path"
    ldd "$libssh_gcrypt_path" | grep -q 'libgcrypt\.so'
    ! ldd "$libssh_gcrypt_path" | grep -Eq 'libcrypto\.so|libssl\.so'
    evidence "libssh_backend=gcrypt openssl=absent"
    require_eq "EAS tar package version" "$(node -p "require('/usr/local/lib/node_modules/eas-cli/node_modules/tar/package.json').version")" "7.5.22"
    require_eq "EAS tar dependency" "$(node -p "require('/usr/local/lib/node_modules/eas-cli/package.json').dependencies.tar")" "7.5.22"
    require_eq "Vercel tar package version" "$(node -p "require('/usr/local/lib/node_modules/vercel/node_modules/tar/package.json').version")" "7.5.22"
    require_eq "Vercel tar dependency" "$(node -p "require('/usr/local/lib/node_modules/vercel/node_modules/@vercel/fun/package.json').dependencies.tar")" "7.5.22"
    node -e "for (const path of ['/usr/local/lib/node_modules/eas-cli/node_modules/tar', '/usr/local/lib/node_modules/vercel/node_modules/tar']) { if (typeof require(path).list !== 'function') throw new Error('invalid tar module at ' + path); }"
    eas --version >/dev/null
    vercel --version >/dev/null
    evidence "Node tar security overlay=7.5.22 eas=ok vercel=ok"
    require_eq "Netlify CLI package version" "$(node -p "require('/usr/local/lib/node_modules/netlify-cli/package.json').version")" "27.4.2"
    netlify --version >/dev/null
    local ffmpeg_backport_version='7:5.1.9-0+deb12u1+holyclaude2'
    for package_name in ffmpeg libavcodec59 libavdevice59 libavfilter8 libavformat59 libavutil57 libpostproc56 libswresample4 libswscale6; do
      dpkg --compare-versions "$(dpkg-query -W -f='${Version}' "$package_name")" eq "$ffmpeg_backport_version"
    done
    ffmpeg -version >/dev/null
    ffprobe -version >/dev/null
    ffmpeg -hide_banner -decoders 2>/dev/null | awk '$2 == "cfhd" && substr($1, 1, 1) == "V" { found=1 } END { exit !found }'
    ffmpeg -hide_banner -decoders 2>/dev/null | awk '$2 == "dvbsub" && substr($1, 1, 1) == "S" { found=1 } END { exit !found }'
    local ffmpeg_smoke="$SENTINEL_ROOT/ffmpeg-smoke.mkv"
    timeout 20s ffmpeg -hide_banner -loglevel error \
      -f lavfi -i testsrc2=size=16x16:rate=1 \
      -f lavfi -i sine=frequency=1000:sample_rate=8000 \
      -t 1 -fflags +bitexact -flags:v +bitexact -flags:a +bitexact \
      -metadata creation_time=1970-01-01T00:00:00Z \
      -c:v ffv1 -c:a pcm_s16le "$ffmpeg_smoke"
    require_eq "FFmpeg video stream" \
      "$(timeout 20s ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height -of csv=p=0 "$ffmpeg_smoke")" \
      "ffv1,16,16"
    require_eq "FFmpeg audio stream" \
      "$(timeout 20s ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate -of csv=p=0 "$ffmpeg_smoke")" \
      "pcm_s16le,8000"
    timeout 20s ffmpeg -v error -i "$ffmpeg_smoke" -f null -
    evidence "ffmpeg_backport=$ffmpeg_backport_version media_sha256=$(sha256sum "$ffmpeg_smoke" | cut -d' ' -f1)"
    require_eq "Azure CLI embedded Python" "$(/opt/az/bin/python3 --version | awk '{print $2}')" "3.14.6"
    require_eq "Azure CLI bundled cryptography" "$(/opt/az/bin/python3 -c 'import cryptography; print(cryptography.__version__)')" "48.0.1"
    /opt/az/bin/python3 -m pip check
    local azure_config_dir="$SENTINEL_ROOT/azure"
    AZURE_CONFIG_DIR="$azure_config_dir" AZURE_CORE_COLLECT_TELEMETRY=false az version >/dev/null
    AZURE_CONFIG_DIR="$azure_config_dir" AZURE_CORE_COLLECT_TELEMETRY=false az --help >/dev/null
    AZURE_CONFIG_DIR="$azure_config_dir" AZURE_CORE_COLLECT_TELEMETRY=false az config get core.collect_telemetry >/dev/null
    test ! -e "/usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/local-functions-proxy-linux-x64/bin/local-functions-proxy"
    test ! -e "/usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/local-functions-proxy-linux-arm64/bin/local-functions-proxy"
    require_eq "Wrangler package version" "$(node -p "require('/usr/local/lib/node_modules/wrangler/package.json').version")" "4.128.0"
    require_eq "Wrangler undici development dependency" "$(node -p "require('/usr/local/lib/node_modules/wrangler/package.json').devDependencies.undici")" "7.29.0"
    require_eq "Wrangler Miniflare package version" "$(node -p "require('/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json').version")" "5.20260831.0-alpha"
    require_eq "Wrangler Miniflare undici dependency" "$(node -p "require('/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json').dependencies.undici")" "7.29.0"
    require_eq "Wrangler undici package version" "$(node -p "require('/usr/local/lib/node_modules/wrangler/node_modules/undici/package.json').version")" "7.29.0"
    npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all >/dev/null
    wrangler --version >/dev/null
    require_eq "Prisma package version" "$(node -p "require('/usr/local/lib/node_modules/prisma/package.json').version")" "7.10.0"
    require_eq "Lighthouse package version" "$(node -p "require('/usr/local/lib/node_modules/lighthouse/package.json').version")" "13.4.1"
    require_eq "Marp CLI package version" "$(node -p "require('/usr/local/lib/node_modules/@marp-team/marp-cli/package.json').version")" "4.5.0"
    require_eq "OpenCode package version" "$(node -p "require('/usr/local/lib/node_modules/opencode-ai/package.json').version")" "1.18.26"
    require_eq "OpenCode CLI version" "$(opencode --version)" "1.18.26"
    require_eq "Pi package version" "$(node -p "require('/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/package.json').version")" "0.84.4"
    require_eq "Pi undici dependency" "$(node -p "require('/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/package.json').dependencies.undici")" "8.10.1"
    require_eq "Pi undici package version" "$(node -p "require('/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/undici/package.json').version")" "8.10.1"
    npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all >/dev/null
    pi --version >/dev/null
    require_eq "EAS nanoid dependency" "$(node -p "require('/usr/local/lib/node_modules/eas-cli/package.json').dependencies.nanoid")" "3.3.17"
    require_eq "EAS nanoid package version" "$(node -p "require('/usr/local/lib/node_modules/eas-cli/node_modules/nanoid/package.json').version")" "3.3.17"
    npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all >/dev/null
    require_eq "PM2 js-yaml dependency" "$(node -p "require('/usr/local/lib/node_modules/pm2/package.json').dependencies['js-yaml']")" "4.3.1"
    require_eq "PM2 js-yaml package version" "$(node -p "require('/usr/local/lib/node_modules/pm2/node_modules/js-yaml/package.json').version")" "4.3.1"
    npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all >/dev/null
    PM2_HOME="$SENTINEL_ROOT/pm2" pm2 --version | grep -Fx "7.0.4"
    PM2_HOME="$SENTINEL_ROOT/pm2" pm2 kill >/dev/null
    require_eq "Matplotlib package version" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("matplotlib"))')" "3.11.1"
    require_eq "FastAPI package version" "$(python3 -c 'import importlib.metadata; print(importlib.metadata.version("fastapi"))')" "0.141.1"
    require_eq "Junie build" "$(basename "$(readlink /home/claude/.local/share/junie/current)")" "3126.1"
  else
    ! dpkg-query -W libssh-gcrypt-4 >/dev/null 2>&1
    test ! -e /usr/local/lib/node_modules/wrangler
    test ! -e /usr/local/lib/node_modules/prisma
    ! command -v ffmpeg >/dev/null
    ! command -v ffprobe >/dev/null
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

assert_cloudcli_security_dependencies() {
  EXPECT_FULL="$([ "$VARIANT" = "full" ] && printf 1 || printf 0)" node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import { createRequire } from 'node:module';

const cloudcliRoot = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const require = createRequire(`${cloudcliRoot}/package.json`);
const multer = require('multer');
const WebSocket = require('ws');
const { WebSocketServer } = WebSocket;

function packageVersion(name) {
  return JSON.parse(readFileSync(`${cloudcliRoot}/node_modules/${name}/package.json`, 'utf8')).version;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', onError);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

for (const [dependency, version] of Object.entries({
  'better-sqlite3': '12.11.1',
  dompurify: '3.4.14',
  express: '4.22.2',
  'fast-uri': '3.1.6',
  'ip-address': '10.7.0',
  'js-yaml': '3.15.1',
  nanoid: '3.3.18',
  hono: '4.13.5',
  jws: '3.2.3',
  multer: '2.3.0',
  'path-to-regexp': '0.1.13',
  picomatch: '2.3.2',
  postcss: '8.5.26',
  'tar-fs': '2.1.5',
  ws: '8.21.3',
  yaml: '2.9.0',
})) {
  assert.equal(packageVersion(dependency), version, `${dependency} should use the reviewed version`);
}

assert.equal(
  JSON.parse(readFileSync('/usr/local/lib/node_modules/npm/node_modules/ip-address/package.json', 'utf8')).version,
  '10.7.0',
  'npm ip-address should use the reviewed version',
);

if (process.env.EXPECT_FULL === '1') {
  for (const [path, version] of Object.entries({
    '/usr/local/lib/node_modules/wrangler/node_modules/undici/package.json': '7.29.0',
    '/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/undici/package.json': '8.10.1',
    '/usr/local/lib/node_modules/eas-cli/node_modules/nanoid/package.json': '3.3.17',
    '/usr/local/lib/node_modules/pm2/node_modules/js-yaml/package.json': '4.3.1',
    '/usr/local/lib/node_modules/vercel/node_modules/js-yaml/package.json': '4.3.1',
  })) assert.equal(JSON.parse(readFileSync(path, 'utf8')).version, version, `${path} should use the reviewed version`);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024,
    fieldNestingDepth: 0,
  },
});
let abortedUploadObserved = false;
const uploadServer = http.createServer((request, response) => {
  if (request.url === '/nested') {
    upload.none()(request, response, (error) => {
      const code = error?.code ?? 'NO_ERROR';
      response.statusCode = code === 'LIMIT_FIELD_NESTING' ? 422 : 500;
      response.end(code);
    });
    return;
  }

  request.once('aborted', () => {
    abortedUploadObserved = true;
  });
  upload.single('file')(request, response, (error) => {
    if (!response.destroyed && !response.writableEnded) {
      response.statusCode = error ? 400 : 204;
      response.end(error?.code ?? '');
    }
  });
});
const uploadPort = await listen(uploadServer);
try {
  const nestedForm = new FormData();
  nestedForm.set('nested[value]', 'blocked');
  const nestedResponse = await fetch(`http://127.0.0.1:${uploadPort}/nested`, {
    method: 'POST',
    body: nestedForm,
  });
  assert.equal(nestedResponse.status, 422);
  assert.equal(await nestedResponse.text(), 'LIMIT_FIELD_NESTING');

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: uploadPort }, () => {
      const boundary = 'holyclaude-aborted-upload';
      const partialBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="partial.txt"',
        'Content-Type: text/plain',
        '',
        'partial',
      ].join('\r\n');
      socket.write([
        'POST /aborted HTTP/1.1',
        `Host: 127.0.0.1:${uploadPort}`,
        `Content-Type: multipart/form-data; boundary=${boundary}`,
        `Content-Length: ${Buffer.byteLength(partialBody) + 4096}`,
        'Connection: close',
        '',
        partialBody,
      ].join('\r\n'));
      setTimeout(() => socket.destroy(), 20);
    });
    socket.once('error', (error) => {
      if (error.code !== 'ECONNRESET') reject(error);
    });
    socket.once('close', resolve);
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(abortedUploadObserved, true);
  assert.equal(uploadServer.listening, true);
} finally {
  await close(uploadServer);
}

const webSocketServer = new WebSocketServer({
  host: '127.0.0.1',
  port: 0,
  maxBufferedChunks: 8,
  maxFragments: 2,
});
webSocketServer.on('connection', (socket) => {
  socket.on('error', () => {});
  socket.on('message', (message) => socket.send(message));
});
await once(webSocketServer, 'listening');
const webSocketPort = webSocketServer.address().port;
try {
  const client = new WebSocket(`ws://127.0.0.1:${webSocketPort}`);
  await once(client, 'open');
  const message = once(client, 'message');
  client.send('hel', { fin: false });
  client.send('lo', { fin: true });
  assert.equal((await message)[0].toString(), 'hello');
  const clientClosed = once(client, 'close');
  client.close();
  await clientClosed;

  const limitedClient = new WebSocket(`ws://127.0.0.1:${webSocketPort}`);
  limitedClient.on('error', () => {});
  await once(limitedClient, 'open');
  const limitedClientClosed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('fragment limit did not close the connection')), 5000);
    limitedClient.once('close', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  limitedClient.send('x', { fin: false });
  limitedClient.send('', { fin: false });
  limitedClient.send('y', { fin: true });
  assert.equal(await limitedClientClosed, 1008);
} finally {
  await close(webSocketServer);
}
NODE
  evidence "cloudcli_security_dependencies=ok"
}

assert_netlify_image_size_progress_guards() {
  if [ "$VARIANT" != "full" ]; then return; fi
  test ! -e /usr/local/lib/node_modules/netlify-cli/node_modules/image-size/package.json
  evidence "netlify image-size downstream backport=not-required"
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
  require_eq "Python Playwright version" "$py_version" "1.62.0"
  evidence "python_playwright=1.62.0 launch=ok"
}

assert_node_playwright() {
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node - "$SENTINEL_URL" "$SENTINEL_TEXT" <<'NODE'
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const url = process.argv[2];
const expected = process.argv[3];
const requireFromGlobal = createRequire('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/package.json');
const version = requireFromGlobal('playwright/package.json').version;
assert.equal(version, '1.62.1');
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
  evidence "node_playwright=1.62.1 launch=ok"
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
  'file:///usr/local/lib/node_modules/@cloudcli-ai/cloudcli/dist-server/server/modules/auth/auth.middleware.js'
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

  capture_browser_snapshot "$response" "$SESSION_ID" "$SENTINEL_TEXT"
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
assert_cloudcli_security_dependencies
assert_netlify_image_size_progress_guards
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
