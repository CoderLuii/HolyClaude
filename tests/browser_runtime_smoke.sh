#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "usage: bash tests/browser_runtime_smoke.sh --image IMAGE --variant full|slim --expected-arch amd64|arm64" >&2
}

if [ "$#" -ne 6 ] || [ "${1:-}" != "--image" ] || [ "${3:-}" != "--variant" ] || [ "${5:-}" != "--expected-arch" ]; then
  usage
  exit 64
fi

IMAGE="$2"
VARIANT="$4"
EXPECTED_ARCH="$6"

case "$VARIANT" in
  full|slim) ;;
  *)
    usage
    exit 64
    ;;
esac

case "$EXPECTED_ARCH" in
  amd64|arm64) ;;
  *)
    usage
    exit 64
    ;;
esac

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HELPER="$SCRIPT_DIR/browser_runtime_container_checks.sh"
if [ ! -f "$HELPER" ]; then
  echo "missing helper: $HELPER" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
CONTAINER="holyclaude-browser-${VARIANT}-$$-${RANDOM}"
WORKSPACE_DIR="$TMP_DIR/workspace"
CLAUDE_DIR="$TMP_DIR/claude"

docker_cmd() {
  docker "$@"
}

docker_literal_cmd() {
  if [ -n "${MSYSTEM:-}" ]; then
    MSYS2_ARG_CONV_EXCL='*' docker "$@"
  else
    docker "$@"
  fi
}

cleanup() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}

dump_debug() {
  if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
    echo "::group::holyclaude browser runtime smoke logs"
    docker_cmd logs "$CONTAINER" || true
    echo "::endgroup::"

    echo "::group::holyclaude browser runtime process state"
    docker_cmd exec "$CONTAINER" sh -lc 'id claude; ps -eo user,pid,ppid,comm,args | grep -E "cloudcli|chromium|Xvfb|python|node" | grep -v grep || true; ss -ltnp || true' || true
    echo "::endgroup::"
  fi
}

trap dump_debug ERR
trap cleanup EXIT

mkdir -p "$WORKSPACE_DIR" "$CLAUDE_DIR"

echo "browser-smoke: image=$IMAGE variant=$VARIANT expected_arch=$EXPECTED_ARCH"
echo "browser-smoke: pull_or_use_exact_image_ref"
if docker_cmd pull "$IMAGE" >/dev/null 2>&1; then
  echo "browser-smoke: image_source=pulled"
elif docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "browser-smoke: image_source=local"
else
  echo "image ref is neither pullable nor present locally: $IMAGE" >&2
  exit 1
fi

ACTUAL_ARCH="$(docker_cmd image inspect --format '{{.Architecture}}' "$IMAGE")"
echo "browser-smoke: image_arch=$ACTUAL_ARCH"
if [ "$ACTUAL_ARCH" != "$EXPECTED_ARCH" ]; then
  echo "expected image architecture $EXPECTED_ARCH, got $ACTUAL_ARCH" >&2
  exit 1
fi

echo "browser-smoke: docker_flags=--shm-size=2g --mount workspace --mount claude no_cap_add no_security_opt"
docker_cmd run -d \
  --name "$CONTAINER" \
  --shm-size=2g \
  -e PUID="$(id -u)" \
  -e PGID="$(id -g)" \
  --mount "type=bind,source=$CLAUDE_DIR,target=/home/claude/.claude" \
  --mount "type=bind,source=$WORKSPACE_DIR,target=/workspace" \
  "$IMAGE" >/dev/null

deadline=$((SECONDS + 180))
until docker_cmd exec "$CONTAINER" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    docker_cmd exec "$CONTAINER" curl -fsS http://127.0.0.1:3001/health >/dev/null
    exit 1
  fi
  sleep 2
done
echo "browser-smoke: cloudcli_health=ready"

if docker_cmd network inspect bridge >/dev/null 2>&1; then
  docker_cmd network disconnect bridge "$CONTAINER" >/dev/null
  echo "browser-smoke: external_network=disconnected_after_start"
else
  echo "browser-smoke: external_network=bridge_network_unavailable"
fi

HELPER_HOST_PATH="$HELPER"
if command -v cygpath >/dev/null 2>&1; then
  HELPER_HOST_PATH="$(cygpath -w "$HELPER")"
fi
docker_literal_cmd cp "$HELPER_HOST_PATH" "$CONTAINER:/tmp/browser_runtime_container_checks.sh"
docker_literal_cmd exec "$CONTAINER" chmod 0755 /tmp/browser_runtime_container_checks.sh
docker_literal_cmd exec \
  -u claude \
  -e HOLYCLAUDE_BROWSER_SMOKE_VARIANT="$VARIANT" \
  "$CONTAINER" \
  /tmp/browser_runtime_container_checks.sh

echo "browser-smoke: success image=$IMAGE variant=$VARIANT arch=$ACTUAL_ARCH"
