#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_cloudcli_volume_smoke.sh <image> [label]}"
LABEL="${2:-local}"
PREFIX="holyclaude-cloudcli-${LABEL}-$$"
CONTAINER="${PREFIX}-container"
VOLUMES=()

docker_cmd() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"
}

cleanup_container() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
}

cleanup() {
  cleanup_container
  if [ "${#VOLUMES[@]}" -gt 0 ]; then
    docker_cmd volume rm -f "${VOLUMES[@]}" >/dev/null 2>&1 || true
  fi
}

dump_debug() {
  if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
    echo "::group::CloudCLI volume smoke logs"
    docker_cmd logs "$CONTAINER" || true
    echo "::endgroup::"
  fi
}

trap dump_debug ERR
trap cleanup EXIT

new_volume() {
  local name="${PREFIX}-$1"
  docker_cmd volume create "$name" >/dev/null
  VOLUMES+=("$name")
  NEW_VOLUME="$name"
}

wait_for_health() {
  local deadline=$((SECONDS + 180))
  until docker_cmd exec "$CONTAINER" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
    if ! docker_cmd ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
      docker_cmd logs "$CONTAINER" >&2
      return 1
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
      docker_cmd logs "$CONTAINER" >&2
      return 1
    fi
    sleep 2
  done
}

start_container() {
  local volume="$1"
  shift
  cleanup_container
  docker_cmd run -d \
    --name "$CONTAINER" \
    "$@" \
    --mount "type=volume,source=$volume,target=/home/claude/.cloudcli" \
    "$IMAGE" >/dev/null
  wait_for_health
}

assert_cloudcli_state() {
  local expected_owner="$1"
  docker_cmd exec "$CONTAINER" sh -lc "
    set -eu
    test \"\$(stat -c %u:%g /home/claude/.cloudcli)\" = '$expected_owner'
    test -w /home/claude/.cloudcli
    test ! -L /home/claude/.cloudcli
    if [ -f /home/claude/.cloudcli/auth.db ]; then
      test \"\$(sqlite3 -cmd \".timeout 10000\" /home/claude/.cloudcli/auth.db 'PRAGMA quick_check;')\" = ok
    fi
  "
}

assert_persisted_database() {
  docker_cmd exec "$CONTAINER" sh -lc '
    set -eu
    test -f /home/claude/.cloudcli/auth.db
    test "$(sqlite3 -cmd ".timeout 10000" /home/claude/.cloudcli/auth.db "PRAGMA quick_check;")" = ok
    test "$(sqlite3 -cmd ".timeout 10000" /home/claude/.cloudcli/auth.db "SELECT value FROM holyclaude_volume_probe WHERE key = '\''persistence'\'';")" = verified
    for sidecar in auth.db-wal auth.db-shm auth.db-journal; do
      if [ -e "/home/claude/.cloudcli/$sidecar" ]; then
        test "$(stat -c %u:%g "/home/claude/.cloudcli/$sidecar")" = 1000:1000
        test -w "/home/claude/.cloudcli/$sidecar"
      fi
    done
  '
}

if docker_cmd pull "$IMAGE" >/dev/null 2>&1; then
  echo "cloudcli-volume-smoke: image_source=pulled"
elif docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "cloudcli-volume-smoke: image_source=local"
else
  echo "image ref is neither pullable nor present locally: $IMAGE" >&2
  exit 1
fi

# Fresh volumes use Docker copy-up from the directory baked into the image.
new_volume fresh
fresh_volume="$NEW_VOLUME"
start_container "$fresh_volume"
assert_cloudcli_state 1000:1000
docker_cmd exec "$CONTAINER" sh -lc '
  sqlite3 -cmd ".timeout 10000" /home/claude/.cloudcli/auth.db "
    CREATE TABLE IF NOT EXISTS holyclaude_volume_probe (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT OR REPLACE INTO holyclaude_volume_probe VALUES ('\''persistence'\'', '\''verified'\'');
  "
  printf persisted > /home/claude/.cloudcli/.holyclaude-persisted
'
assert_persisted_database
cleanup_container
start_container "$fresh_volume"
docker_cmd exec "$CONTAINER" sh -lc 'test "$(cat /home/claude/.cloudcli/.holyclaude-persisted)" = persisted'
assert_cloudcli_state 1000:1000
assert_persisted_database

# Existing database state and sidecars with the wrong owner are repaired without
# changing the persistent database contents.
cleanup_container
docker_cmd run --rm \
  --entrypoint sh \
  --mount "type=volume,source=$fresh_volume,target=/home/claude/.cloudcli" \
  "$IMAGE" \
  -lc '
    : > /home/claude/.cloudcli/auth.db-wal
    : > /home/claude/.cloudcli/auth.db-shm
    : > /home/claude/.cloudcli/auth.db-journal
    chown -R 0:0 /home/claude/.cloudcli
  '
start_container "$fresh_volume"
assert_cloudcli_state 1000:1000
docker_cmd exec "$CONTAINER" sh -lc 'test "$(cat /home/claude/.cloudcli/.holyclaude-persisted)" = persisted'
assert_persisted_database

# volume-nocopy starts empty and root-owned, so root startup must repair it.
new_volume nocopy
nocopy_volume="$NEW_VOLUME"
cleanup_container
docker_cmd run -d \
  --name "$CONTAINER" \
  --mount "type=volume,source=$nocopy_volume,target=/home/claude/.cloudcli,volume-nocopy" \
  "$IMAGE" >/dev/null
wait_for_health
assert_cloudcli_state 1000:1000

# Custom Docker UID/GID remapping owns the mounted state consistently.
new_volume custom
custom_volume="$NEW_VOLUME"
cleanup_container
docker_cmd run -d \
  --name "$CONTAINER" \
  -e PUID=1234 \
  -e PGID=1234 \
  --mount "type=volume,source=$custom_volume,target=/home/claude/.cloudcli,volume-nocopy" \
  "$IMAGE" >/dev/null
wait_for_health
assert_cloudcli_state 1234:1234

# Prepared non-root startup works without attempting privileged repair.
new_volume prepared
prepared_volume="$NEW_VOLUME"
docker_cmd run --rm \
  --entrypoint sh \
  --mount "type=volume,source=$prepared_volume,target=/home/claude/.cloudcli" \
  "$IMAGE" \
  -lc 'chown -R 1000:1000 /home/claude/.cloudcli'
start_container "$prepared_volume" --user 1000:1000 -e HOME=/home/claude
assert_cloudcli_state 1000:1000
if docker_cmd logs "$CONTAINER" 2>&1 | grep -Eq 'groupmod:|usermod:|Operation not permitted'; then
  echo "root-only startup operation ran in non-root mode" >&2
  exit 1
fi

# An unprepared non-root volume and a read-only volume must fail before s6 starts.
for failure_case in nonroot readonly; do
  new_volume "$failure_case"
  failure_volume="$NEW_VOLUME"
  cleanup_container
  run_args=()
  mount_suffix=",volume-nocopy"
  if [ "$failure_case" = nonroot ]; then
    run_args+=(--user 1000:1000 -e HOME=/home/claude)
  else
    mount_suffix=",readonly,volume-nocopy"
  fi
  docker_cmd run \
    --name "$CONTAINER" \
    "${run_args[@]}" \
    --mount "type=volume,source=$failure_volume,target=/home/claude/.cloudcli${mount_suffix}" \
    "$IMAGE" >/dev/null 2>&1 || true
  logs="$(docker_cmd logs "$CONTAINER" 2>&1)"
  if ! grep -Fq 'CloudCLI state' <<<"$logs"; then
    printf '%s\n' "$logs" >&2
    echo "expected an early CloudCLI state failure for $failure_case" >&2
    exit 1
  fi
  if grep -Fq 'Starting s6-overlay' <<<"$logs"; then
    printf '%s\n' "$logs" >&2
    echo "s6 started after CloudCLI state validation failed for $failure_case" >&2
    exit 1
  fi
done

echo "cloudcli-volume-smoke: success image=$IMAGE"
