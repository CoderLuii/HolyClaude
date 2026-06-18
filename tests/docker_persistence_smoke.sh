#!/usr/bin/env bash
set -euo pipefail

IMAGE="${1:?usage: docker_persistence_smoke.sh <image> [label]}"
LABEL="${2:-local}"
WAIT_SECONDS="${HOLYCLAUDE_PERSIST_SMOKE_WAIT:-70}"
TMP_DIR="$(mktemp -d)"
CONTAINER="holyclaude-persist-${LABEL}-$$"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

CLAUDE_DIR="$TMP_DIR/claude"
WORKSPACE_DIR="$TMP_DIR/workspace"
mkdir -p "$CLAUDE_DIR" "$WORKSPACE_DIR"

write_json() {
  local target="$1"
  local email="$2"
  node - "$target" "$email" <<'NODE'
const fs = require('node:fs');
const [target, email] = process.argv.slice(2);
fs.writeFileSync(target, JSON.stringify({
  projects: {
    '/workspace': {
      allowedTools: ['Bash']
    }
  },
  oauthAccount: {
    emailAddress: email
  }
}));
NODE
}

assert_container_state() {
  local expected_email="$1"
  docker exec "$CONTAINER" node - "$expected_email" <<'NODE'
const fs = require('node:fs');
const [expectedEmail] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync('/home/claude/.claude.json', 'utf8'));
if (data.oauthAccount?.emailAddress !== expectedEmail) {
  console.error(`expected live state for ${expectedEmail}`);
  process.exit(1);
}
NODE
}

assert_host_persisted_state() {
  local expected_email="$1"
  node - "$CLAUDE_DIR/.claude.json.persist" "$expected_email" <<'NODE'
const fs = require('node:fs');
const [persistedPath, expectedEmail] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(persistedPath, 'utf8'));
if (data.oauthAccount?.emailAddress !== expectedEmail) {
  console.error(`expected persisted state for ${expectedEmail}`);
  process.exit(1);
}
NODE
}

assert_container_default_state() {
  docker exec "$CONTAINER" node - <<'NODE'
const fs = require('node:fs');
const data = JSON.parse(fs.readFileSync('/home/claude/.claude.json', 'utf8'));
if (data.hasCompletedOnboarding !== true || data.installMethod !== 'native') {
  console.error('expected default live Claude state');
  process.exit(1);
}
NODE
}

wait_for_live_state() {
  for _ in $(seq 1 45); do
    if docker exec "$CONTAINER" test -f /home/claude/.claude.json >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  docker logs "$CONTAINER" || true
  echo "timed out waiting for /home/claude/.claude.json" >&2
  return 1
}

start_container() {
  docker run -d \
    --name "$CONTAINER" \
    -e PUID="$(id -u)" \
    -e PGID="$(id -g)" \
    -v "$CLAUDE_DIR:/home/claude/.claude" \
    -v "$WORKSPACE_DIR:/workspace" \
    "$IMAGE" >/dev/null
  wait_for_live_state
}

write_json "$CLAUDE_DIR/.claude.json.persist" "persisted-before-start@example.invalid"

start_container
assert_container_state "persisted-before-start@example.invalid"

docker exec "$CONTAINER" node - <<'NODE'
const fs = require('node:fs');
fs.writeFileSync('/home/claude/.claude.json', JSON.stringify({
  projects: {
    '/workspace/runtime': {
      allowedTools: ['Edit']
    }
  },
  oauthAccount: {
    emailAddress: 'runtime-saved@example.invalid'
  }
}));
NODE

sleep "$WAIT_SECONDS"
assert_host_persisted_state "runtime-saved@example.invalid"

docker rm -f "$CONTAINER" >/dev/null
start_container
assert_container_state "runtime-saved@example.invalid"
docker rm -f "$CONTAINER" >/dev/null

printf '{not json' > "$CLAUDE_DIR/.claude.json.persist"
start_container

if ! find "$CLAUDE_DIR" -maxdepth 1 -name '.claude.json.persist.invalid.*' | grep -q .; then
  docker logs "$CONTAINER" || true
  echo "expected invalid persisted backup" >&2
  exit 1
fi

assert_container_default_state
