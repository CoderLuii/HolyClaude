#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_host_cli_smoke.sh <image> [label]}"
LABEL="${2:-local}"
OUTER_CONTAINER="holyclaude-docker-cli-${LABEL}-$$"
INNER_CONTAINER="${OUTER_CONTAINER}-inner"
CLAUDE_VOLUME="${OUTER_CONTAINER}-claude"
WORKSPACE_VOLUME="${OUTER_CONTAINER}-workspace"

docker_cmd() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"
}

cleanup() {
  docker_cmd rm -f "$INNER_CONTAINER" "$OUTER_CONTAINER" >/dev/null 2>&1 || true
  docker_cmd volume rm -f "$CLAUDE_VOLUME" "$WORKSPACE_VOLUME" >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker_cmd volume create "$CLAUDE_VOLUME" >/dev/null
docker_cmd volume create "$WORKSPACE_VOLUME" >/dev/null
docker_cmd run -d \
  --name "$OUTER_CONTAINER" \
  --mount "type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock" \
  --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude" \
  --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace" \
  "$IMAGE" >/dev/null

deadline=$((SECONDS + 180))
until docker_cmd exec --user claude "$OUTER_CONTAINER" docker info >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    docker_cmd logs "$OUTER_CONTAINER" >&2 || true
    exit 1
  fi
  sleep 2
done

docker_cmd exec --user claude "$OUTER_CONTAINER" sh -lc "
  set -eu
  test \"\$(docker --version | awk '{print \$3}' | tr -d ',')\" = 29.7.2
  test \"\$(docker compose version --short | sed 's/^v//')\" = 5.5.0
  docker create --name '$INNER_CONTAINER' --entrypoint /bin/true '$IMAGE' >/dev/null
  docker start '$INNER_CONTAINER' >/dev/null
  docker wait '$INNER_CONTAINER' | grep -Fx 0
  docker rm '$INNER_CONTAINER' >/dev/null
"

echo "docker-host-cli-smoke: success image=$IMAGE"
