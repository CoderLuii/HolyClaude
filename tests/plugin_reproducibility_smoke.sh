#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: plugin_reproducibility_smoke.sh <image>}"

docker_cmd() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"
}

if docker_cmd pull "$IMAGE" >/dev/null 2>&1; then
  echo "plugin-reproducibility: image_source=pulled"
elif docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "plugin-reproducibility: image_source=local"
else
  echo "image ref is neither pullable nor present locally: $IMAGE" >&2
  exit 1
fi

docker_cmd run --rm -i --entrypoint sh --user claude "$IMAGE" -s <<'CONTAINER'
set -eu

install_and_hash() {
  plugin="$1"
  run="$2"
  source="/home/claude/.claude-code-ui/plugins/$plugin"
  target="/tmp/plugin-proof-$plugin-$run"

  cp -a "$source" "$target"
  rm -rf "$target/.git" "$target/dist" "$target/node_modules"
  cd "$target"
  npm ci >/dev/null
  npm run build >/dev/null
  npm ls --all --omit=dev --json | sha256sum | awk '{print $1}'
}

for plugin in project-stats web-terminal; do
  first="$(install_and_hash "$plugin" first)"
  second="$(install_and_hash "$plugin" second)"
  if [ "$first" != "$second" ]; then
    echo "$plugin production dependency trees differ: $first != $second" >&2
    exit 1
  fi
  printf 'plugin-reproducibility: %s production-tree=%s\n' "$plugin" "$first"
done

node <<'NODE'
const pty = require('/tmp/plugin-proof-web-terminal-second/node_modules/node-pty');
const terminal = pty.spawn('/bin/sh', ['-lc', 'printf web-terminal-native-ok'], {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: '/workspace',
  env: process.env,
});
let output = '';
terminal.onData((chunk) => {
  output += chunk;
});
terminal.onExit(({ exitCode }) => {
  if (exitCode !== 0 || !output.includes('web-terminal-native-ok')) {
    console.error({ exitCode, output });
    process.exit(1);
  }
  console.log('plugin-reproducibility: web-terminal-native=ok');
});
NODE
CONTAINER
