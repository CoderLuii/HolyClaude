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
  npm ci --strict-allow-scripts >/dev/null
  npm run build >/dev/null
  tree_hash="$(npm ls --all --omit=dev --json | sha256sum | awk '{print $1}')"
  dist_hash="$(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
  printf '%s %s\n' "$tree_hash" "$dist_hash"
}

for plugin in project-stats web-terminal; do
  first="$(install_and_hash "$plugin" first)"
  second="$(install_and_hash "$plugin" second)"
  if [ "$first" != "$second" ]; then
    echo "$plugin dependency tree or build output differs: $first != $second" >&2
    exit 1
  fi
  printf 'plugin-reproducibility: %s production-tree=%s build-output=%s\n' \
    "$plugin" "${first%% *}" "${first#* }"
done

node <<'NODE'
const pty = require('/tmp/plugin-proof-web-terminal-second/node_modules/node-pty');
const terminal = pty.spawn('/bin/sh', ['-c', 'stty size; IFS= read -r line; printf "input:%s\\n" "$line"; stty size; exit 7'], {
  name: 'xterm-color',
  cols: 80,
  rows: 24,
  cwd: '/workspace',
  env: process.env,
});
let output = '';
const timeout = setTimeout(() => {
  terminal.kill('SIGKILL');
  console.error({ error: 'web terminal PTY timed out', output });
  process.exit(1);
}, 10000);
terminal.onData((chunk) => {
  output += chunk;
  if (output.includes('24 80') && !output.includes('input:')) {
    terminal.resize(132, 43);
    terminal.write('holy-pty-input\r');
  }
});
terminal.onExit(({ exitCode }) => {
  clearTimeout(timeout);
  if (exitCode !== 7 || !output.includes('input:holy-pty-input') || !output.includes('43 132')) {
    console.error({ exitCode, output });
    process.exit(1);
  }
  console.log('plugin-reproducibility: web-terminal-native=ok pty-input-resize-exit=ok');
});
NODE

fixture=/tmp/project-stats-fixture
mkdir -p "$fixture/src"
printf 'alpha\nbeta\n' > "$fixture/src/main.js"
printf '# fixture\n' > "$fixture/README.md"
git -C "$fixture" init -q
git -C "$fixture" add README.md src/main.js
GIT_AUTHOR_NAME='Project Stats Fixture' GIT_AUTHOR_EMAIL=fixture@example.invalid \
GIT_AUTHOR_DATE='2026-01-01T00:00:00Z' GIT_COMMITTER_NAME='Project Stats Fixture' \
GIT_COMMITTER_EMAIL=fixture@example.invalid GIT_COMMITTER_DATE='2026-01-01T00:00:00Z' \
  git -C "$fixture" commit -q -m fixture
test "$(git -C "$fixture" rev-list --count HEAD)" = 1
node /tmp/plugin-proof-project-stats-second/dist/server.js > /tmp/project-stats-server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for _ in $(seq 1 50); do
  port="$(sed -n 's/.*\"port\":\([0-9][0-9]*\).*/\1/p' /tmp/project-stats-server.log | head -1)"
  [ -n "$port" ] && break
  sleep 0.1
done
test -n "${port:-}"
node - "$port" <<'NODE'
const response = await fetch(`http://127.0.0.1:${process.argv[2]}/stats?path=%2Ftmp%2Fproject-stats-fixture`);
const stats = await response.json();
if (!response.ok || stats.totalFiles !== 2 || stats.totalLines !== 5 || stats.totalSize !== 21) {
  console.error(stats);
  process.exit(1);
}
const extensions = new Map(stats.byExtension);
if (extensions.get('.js') !== 1 || extensions.get('.md') !== 1) process.exit(1);
console.log('plugin-reproducibility: project-stats-real-fixture=ok');
NODE
CONTAINER
