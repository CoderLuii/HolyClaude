#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_rootless_smoke.sh <image>}"
LABEL="${2:-local}"
CONTAINER="holyclaude-rootless-${LABEL}-$$"
WORKSPACE_VOLUME="${CONTAINER}-workspace"
CLAUDE_VOLUME="${CONTAINER}-claude"

docker_cmd() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"
}

cleanup() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker_cmd volume rm -f "$WORKSPACE_VOLUME" "$CLAUDE_VOLUME" >/dev/null 2>&1 || true
}

dump_debug() {
  if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
    echo "::group::holyclaude rootless logs"
    docker_cmd logs "$CONTAINER" || true
    echo "::endgroup::"
  fi
}

trap dump_debug ERR
trap cleanup EXIT

if docker_cmd pull "$IMAGE" >/dev/null 2>&1; then
  echo "rootless-smoke: image_source=pulled"
elif docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "rootless-smoke: image_source=local"
else
  echo "image ref is neither pullable nor present locally: $IMAGE" >&2
  exit 1
fi

docker_cmd volume create "$WORKSPACE_VOLUME" >/dev/null
docker_cmd volume create "$CLAUDE_VOLUME" >/dev/null
docker_cmd run --rm \
  --entrypoint sh \
  --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace" \
  --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude" \
  "$IMAGE" \
  -lc '
    chown -R 1000:1000 /workspace /home/claude/.claude
    install -o 1000 -g 1000 /dev/null /workspace/.holyclaude-volume-ready
    install -o 1000 -g 1000 /dev/null /home/claude/.claude/.holyclaude-volume-ready
  '

docker_cmd run -d \
  --name "$CONTAINER" \
  --user 1000:1000 \
  -e HOME=/home/claude \
  -e PUID=1000 \
  -e PGID=1000 \
  --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace" \
  --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude" \
  "$IMAGE" >/dev/null

deadline=$((SECONDS + 180))
until docker_cmd exec "$CONTAINER" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    docker_cmd exec "$CONTAINER" curl -fsS http://127.0.0.1:3001/health >/dev/null
    exit 1
  fi
  sleep 2
done

docker_cmd exec "$CONTAINER" sh -lc '
  set -eu
  test "$(id -u)" = 1000
  test "$(id -g)" = 1000
  test "$HOME" = /home/claude
  printf rootless-ok > /workspace/rootless-created.txt
  test "$(stat -c %u:%g /workspace/rootless-created.txt)" = 1000:1000
  test -w /home/claude/.claude
  pgrep -u 1000 -f "cloudcli --port 3001" >/dev/null
'

if docker_cmd logs "$CONTAINER" 2>&1 | grep -Eq 'groupmod:|usermod:|Operation not permitted'; then
  echo "root-only startup operation ran in non-root mode" >&2
  exit 1
fi

echo "rootless-smoke: success image=$IMAGE uid=1000 gid=1000"
