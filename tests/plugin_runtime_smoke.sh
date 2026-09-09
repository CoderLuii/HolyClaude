#!/usr/bin/env bash
set -Eeuo pipefail
IMAGE="${1:?usage: plugin_runtime_smoke.sh <image> [label]}"
LABEL="${2:-local}"; LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="$SCRIPT_DIR/plugin_runtime_browser.mjs"
BASE="holyclaude-plugin-runtime-${LABEL}-$$"
CLAUDE_VOLUME="$BASE-claude"; CLOUDCLI_VOLUME="$BASE-cloudcli"; WORKSPACE_VOLUME="$BASE-workspace"; PROFILE_VOLUME="$BASE-browser"
containers=()
docker_cmd() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"; }
cleanup() { ((${#containers[@]} == 0)) || docker_cmd rm -f "${containers[@]}" >/dev/null 2>&1 || true; docker_cmd volume rm -f "$CLAUDE_VOLUME" "$CLOUDCLI_VOLUME" "$WORKSPACE_VOLUME" "$PROFILE_VOLUME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for volume in "$CLAUDE_VOLUME" "$CLOUDCLI_VOLUME" "$WORKSPACE_VOLUME" "$PROFILE_VOLUME"; do docker_cmd volume create "$volume" >/dev/null; done
start() {
  local phase="$1" container="$BASE-$1" harness_host; containers+=("$container")
  docker_cmd run -d --name "$container" --shm-size=1g -e PUID=1000 -e PGID=1000 \
    -e GIT_USER_NAME='Plugin Runtime' -e GIT_USER_EMAIL=plugin-runtime@example.invalid \
    --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude" \
    --mount "type=volume,source=$CLOUDCLI_VOLUME,target=/home/claude/.cloudcli" \
    --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace" \
    --mount "type=volume,source=$PROFILE_VOLUME,target=/browser-profile" "$IMAGE" >/dev/null
  local deadline=$((SECONDS + 180))
  until docker_cmd exec "$container" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do [ "$SECONDS" -lt "$deadline" ] || { docker_cmd logs "$container"; return 1; }; sleep 2; done
  if [ "$phase" = first ]; then docker_cmd exec --user 1000:1000 "$container" sh -lc "mkdir -p /workspace/src; printf 'one\\ntwo\\n' > /workspace/src/index.js"; fi
  harness_host="$HARNESS"; command -v cygpath >/dev/null 2>&1 && harness_host="$(cygpath -w "$HARNESS")"
  docker_cmd cp "$harness_host" "$container:/tmp/plugin_runtime_browser.mjs"
  docker_cmd exec --user 0:0 "$container" timeout 120s node /tmp/plugin_runtime_browser.mjs "$phase"
  docker_cmd stop --time 20 "$container" >/dev/null
  test "$(docker_cmd inspect --format '{{.State.ExitCode}}' "$container")" = 0
}
start first
start second
echo 'plugin-runtime: authenticated-ui prefs-tabs workspace-recompute old-pty-ended new-pty=ok'
