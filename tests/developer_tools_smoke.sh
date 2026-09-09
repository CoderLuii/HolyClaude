#!/usr/bin/env bash
set -Eeuo pipefail

nano --version
shellcheck --version
mysql --version
mysqldump --version
mysql --no-defaults --verbose --help >/dev/null
mysqldump --no-defaults --verbose --help >/dev/null
dig -v
atuin --version
test "$(printf 'project: holyclaude\n' | yq '.project')" = holyclaude
flake8 --version
python3 -c 'import aiomqtt, aiohttp; assert callable(aiomqtt.Client); assert callable(aiohttp.ClientSession)'

test_dir="$(mktemp -d)"
trap 'rm -rf "$test_dir"' EXIT
printf '%s\n' 'import asyncio' 'import pytest' '@pytest.mark.asyncio' 'async def test_async_runtime():' '    assert await asyncio.sleep(0, result=42) == 42' > "$test_dir/test_async_runtime.py"
python3 -m pytest -q "$test_dir/test_async_runtime.py"

vite_dir="$test_dir/vite"
mkdir "$vite_dir"
printf '%s\n' '<!doctype html><html><head><title>Vite native smoke</title></head><body><main id="app"></main><script type="module" src="/main.js"></script></body></html>' > "$vite_dir/index.html"
printf '%s\n' "document.querySelector('#app').textContent = 'vite-native-smoke';" > "$vite_dir/main.js"
(
  cd "$vite_dir"
  vite build --outDir dist
  grep -RFq 'vite-native-smoke' dist/assets
  vite preview --outDir dist --host 127.0.0.1 --port 42173 --strictPort > "$test_dir/vite-preview.log" 2>&1 &
  vite_pid=$!
  trap 'kill "$vite_pid" 2>/dev/null || true; wait "$vite_pid" 2>/dev/null || true' EXIT
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    if curl --fail --silent --show-error --max-time 2 http://127.0.0.1:42173/ -o "$test_dir/vite-response.html"; then
      break
    fi
    kill -0 "$vite_pid" 2>/dev/null || { wait "$vite_pid"; exit 1; }
    sleep 1
  done
  grep -Fq '<title>Vite native smoke</title>' "$test_dir/vite-response.html"
  grep -Eq 'src="/assets/index-[^"]+\.js"' "$test_dir/vite-response.html"
)

tslp_manifest="$test_dir/tree-sitter-parsers-1.17.0.json"
curl --fail --location --silent --show-error --retry 3 --connect-timeout 15 --max-time 60 \
  --output "$tslp_manifest" \
  'https://github.com/xberg-io/tree-sitter-language-pack/releases/download/v1.17.0/parsers.json'
echo "a78386c99e08bc1c88e2fcd3c036a48b2c4c62088628a3aab3a3aad1ed3715a9  $tslp_manifest" | sha256sum --check --status
timeout --foreground 90s env \
  TREE_SITTER_LANGUAGE_PACK_CACHE_DIR="$test_dir/tree-sitter-cache" \
  TREE_SITTER_LANGUAGE_PACK_MANIFEST_URL="file://$tslp_manifest" \
  python3 - <<'PY'
import importlib.metadata

assert importlib.metadata.version('tree-sitter') == '0.26.0'
assert importlib.metadata.version('tree-sitter-language-pack') == '1.17.0'

from tree_sitter_language_pack import downloaded_languages, get_parser

parser = get_parser('python')
tree = parser.parse(b'def add(left, right):\n    return left + right\n')
assert tree is not None
root = tree.root_node
assert root.type == 'module'
assert not root.has_error
assert any(node.type == 'function_definition' for node in root.named_children)
assert 'python' in downloaded_languages()
PY

if [ "$(cat /etc/holyclaude-variant)" = full ]; then
  node <<'NODE'
const assert = require('node:assert/strict');
const {
  EasJsonAccessor,
  EasJsonUtils,
  Platform,
} = require('/usr/local/lib/node_modules/eas-cli/node_modules/@expo/eas-json');

async function main() {
  await assert.rejects(
    EasJsonUtils.getBuildProfileAsync(
      EasJsonAccessor.fromRawString('{"build":{"smoke":{"node":"not-a-semver"}}}'),
      Platform.ANDROID,
      'smoke'
    ),
    /eas\.json is not valid/
  );

  const accessor = EasJsonAccessor.fromRawString(JSON.stringify({
    build: {
      base: {
        credentialsSource: 'local',
        distribution: 'internal',
        env: { EAS_SMOKE_BASE: 'base' },
        android: { buildType: 'apk' },
      },
      smoke: {
        extends: 'base',
        env: { EAS_SMOKE_CHILD: 'child' },
      },
    },
  }));
  const profile = await EasJsonUtils.getBuildProfileAsync(accessor, Platform.ANDROID, 'smoke');
  assert.equal(profile.credentialsSource, 'local');
  assert.equal(profile.distribution, 'internal');
  assert.equal(profile.buildType, 'apk');
  assert.deepEqual(profile.env, { EAS_SMOKE_BASE: 'base', EAS_SMOKE_CHILD: 'child' });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
NODE
fi

test "$(pnpm --version)" = 12.3.4
mkdir "$test_dir/dep" "$test_dir/project"
printf '%s\n' '{"name":"local-smoke-dep","version":"1.0.0","main":"index.js"}' > "$test_dir/dep/package.json"
printf '%s\n' 'module.exports = 42;' > "$test_dir/dep/index.js"
printf '%s\n' '{"name":"pnpm-smoke","private":true,"dependencies":{"local-smoke-dep":"file:../dep"}}' > "$test_dir/project/package.json"
(
  cd "$test_dir/project"
  pnpm install --offline --ignore-scripts --store-dir "$test_dir/store"
  node -e 'if (require("local-smoke-dep") !== 42) throw new Error("local dependency failed")'
)

if [ "$(cat /etc/holyclaude-variant)" = full ]; then
  printf '%s\n' '<html><body><p>HolyClaude PDF smoke</p></body></html>' > "$test_dir/render.html"
  weasyprint "$test_dir/render.html" "$test_dir/render.pdf"
  python3 - "$test_dir/render.pdf" <<'PY'
import io
import sys
import cairosvg
import pymupdf
from PIL import Image

with pymupdf.open(sys.argv[1]) as document:
    assert len(document) == 1
    assert 'HolyClaude PDF smoke' in document[0].get_text()

png = cairosvg.svg2png(bytestring=b'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><rect width="160" height="80" fill="red"/></svg>')
assert png.startswith(b'\x89PNG\r\n\x1a\n')
with Image.open(io.BytesIO(png)) as image:
    assert image.size == (160, 80)
    assert image.convert('RGB').getpixel((80, 40)) == (255, 0, 0)
PY
else
  ! command -v weasyprint
fi
