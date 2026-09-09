#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_lifecycle_smoke.sh <image> [label]}"
LABEL="${2:-local}"
LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
CONTAINER="holyclaude-lifecycle-${LABEL}-$$"
CLAUDE_VOLUME="${CONTAINER}-claude"
WORKSPACE_VOLUME="${CONTAINER}-workspace"
TIMEOUT="${HOLYCLAUDE_LIFECYCLE_TIMEOUT:-180}"
docker_cmd() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"; }
cleanup() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker_cmd volume rm -f "$CLAUDE_VOLUME" "$WORKSPACE_VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker_cmd run -d --name "$CONTAINER" -e PUID=1026 -e PGID=100 \
  --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude" \
  --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace" "$IMAGE" >/dev/null
deadline=$((SECONDS + TIMEOUT))
until docker_cmd exec "$CONTAINER" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
  [ "$SECONDS" -lt "$deadline" ] || { docker_cmd logs "$CONTAINER"; exit 1; }
  sleep 2
done
started="$(docker_cmd inspect --format '{{.State.StartedAt}}' "$CONTAINER")"
docker_cmd stop --time 20 "$CONTAINER" >/dev/null
test "$(docker_cmd inspect --format '{{.State.Running}}' "$CONTAINER")" = false
test "$(docker_cmd inspect --format '{{.State.OOMKilled}}' "$CONTAINER")" = false
test "$(docker_cmd inspect --format '{{.State.ExitCode}}' "$CONTAINER")" = 0
finished="$(docker_cmd inspect --format '{{.State.FinishedAt}}' "$CONTAINER")"
test "$finished" != 0001-01-01T00:00:00Z
printf 'lifecycle: graceful-stop=ok started=%s finished=%s exit=0\n' "$started" "$finished"
