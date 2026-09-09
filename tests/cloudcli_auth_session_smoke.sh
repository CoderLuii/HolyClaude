#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  echo "usage: bash tests/cloudcli_auth_session_smoke.sh --image IMAGE --variant full|slim --expected-arch amd64|arm64" >&2
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
  *) usage; exit 64 ;;
esac

case "$EXPECTED_ARCH" in
  amd64|arm64) ;;
  *) usage; exit 64 ;;
esac

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HARNESS="$SCRIPT_DIR/cloudcli_auth_session_runtime.mjs"
if [ ! -f "$HARNESS" ]; then
  echo "missing harness: $HARNESS" >&2
  exit 1
fi

CONTAINER="holyclaude-auth-session-${VARIANT}-$$-${RANDOM}"
CONTAINER_ID=""

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
  if [ -n "$CONTAINER_ID" ]; then
    docker_cmd rm -f "$CONTAINER_ID" >/dev/null 2>&1 || true
  fi
}

dump_debug() {
  if [ -n "$CONTAINER_ID" ] && docker_cmd inspect "$CONTAINER_ID" >/dev/null 2>&1; then
    echo "::group::holyclaude auth-session runtime logs"
    docker_cmd logs "$CONTAINER_ID" || true
    echo "::endgroup::"
  fi
}

trap dump_debug ERR
trap cleanup EXIT

echo "auth-session-smoke: image=$IMAGE variant=$VARIANT expected_arch=$EXPECTED_ARCH"
if docker_cmd pull "$IMAGE" >/dev/null 2>&1; then
  echo "auth-session-smoke: image_source=pulled"
elif docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "auth-session-smoke: image_source=local"
else
  echo "image ref is neither pullable nor present locally: $IMAGE" >&2
  exit 1
fi

ACTUAL_ARCH="$(docker_cmd image inspect --format '{{.Architecture}}' "$IMAGE")"
if [ "$ACTUAL_ARCH" != "$EXPECTED_ARCH" ]; then
  echo "expected image architecture $EXPECTED_ARCH, got $ACTUAL_ARCH" >&2
  exit 1
fi

CONTAINER_ID="$(docker_cmd run -d \
  --name "$CONTAINER" \
  --cpus 2 \
  --memory 2g \
  --memory-swap 2g \
  --shm-size=1g \
  "$IMAGE")"
test -n "$CONTAINER_ID"

ACTUAL_VARIANT="$(docker_literal_cmd exec "$CONTAINER_ID" cat /etc/holyclaude-variant)"
if [ "$ACTUAL_VARIANT" != "$VARIANT" ]; then
  echo "expected image variant $VARIANT, got $ACTUAL_VARIANT" >&2
  exit 1
fi

deadline=$((SECONDS + 180))
until docker_literal_cmd exec "$CONTAINER_ID" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
  if [ "$SECONDS" -ge "$deadline" ]; then
    docker_literal_cmd exec "$CONTAINER_ID" curl -fsS http://127.0.0.1:3001/health >/dev/null
    exit 1
  fi
  sleep 2
done
echo "auth-session-smoke: cloudcli_health=ready"

if docker_cmd network inspect bridge >/dev/null 2>&1; then
  docker_cmd network disconnect bridge "$CONTAINER_ID" >/dev/null
  echo "auth-session-smoke: external_network=disconnected_after_start"
fi

HARNESS_HOST_PATH="$HARNESS"
if command -v cygpath >/dev/null 2>&1; then
  HARNESS_HOST_PATH="$(cygpath -w "$HARNESS")"
fi
docker_literal_cmd cp "$HARNESS_HOST_PATH" "$CONTAINER_ID:/tmp/cloudcli_auth_session_runtime.mjs"
docker_literal_cmd exec \
  --user 0:0 \
  "$CONTAINER_ID" \
  timeout 180s node /tmp/cloudcli_auth_session_runtime.mjs

echo "auth-session-smoke: success image=$IMAGE variant=$ACTUAL_VARIANT arch=$ACTUAL_ARCH"
