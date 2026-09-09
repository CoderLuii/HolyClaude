#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_startup_symlink_smoke.sh <image> [label]}"
LABEL="${2:-local}"; LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
BASE="holyclaude-startup-links-${LABEL}-$$"
HOME_VOLUME="$BASE-home"
WORKSPACE_VOLUME="$BASE-workspace"
EXTERNAL_VOLUMES=("$BASE-codex" "$BASE-gemini" "$BASE-cursor")
containers=()
docker_cmd() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"; }
cleanup() {
  ((${#containers[@]} == 0)) || docker_cmd rm -f "${containers[@]}" >/dev/null 2>&1 || true
  docker_cmd volume rm -f "$HOME_VOLUME" "$WORKSPACE_VOLUME" "${EXTERNAL_VOLUMES[@]}" >/dev/null 2>&1 || true
}
trap cleanup EXIT
for volume in "$HOME_VOLUME" "$WORKSPACE_VOLUME" "${EXTERNAL_VOLUMES[@]}"; do docker_cmd volume create "$volume" >/dev/null; done

mounts=(--mount "type=volume,source=$HOME_VOLUME,target=/home/claude/.claude" --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace")
for index in 0 1 2; do cli=(codex gemini cursor); mounts+=(--mount "type=volume,source=${EXTERNAL_VOLUMES[$index]},target=/external/${cli[$index]}"); done

reset_home() {
  docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc 'set -eu; rm -rf /home/claude/.claude/* /home/claude/.claude/.[!.]* /home/claude/.claude/..?* 2>/dev/null || true; mkdir -p /home/claude/.claude'
}
start_tested_container() {
  local container="$1" setup="$2"
  docker_cmd run -d --name "$container" -e PUID=1026 -e PGID=100 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc "set -eu
$setup
exec /usr/local/bin/entrypoint.sh"
}
assert_container_symlink() {
  local container="$1" path="$2" target="$3"
  local listing
  listing="$(docker_cmd cp "$container:$path" - | "${STARTUP_ARCHIVE_LIST_CMD:-tar}" -tvf -)"
  test "$(printf '%s\n' "$listing" | grep -Fc "${path##*/} ->")" = 1
  printf '%s\n' "$listing" | grep -Fq "${path##*/} -> $target"
}
expect_prompt_failure() {
  local name="$1" diagnostic="$2" setup="$3"
  local container="$BASE-$name"; containers+=("$container")
  start_tested_container "$container" "$setup" >/dev/null
  local deadline=$((SECONDS + 30))
  while [ "$(docker_cmd inspect --format '{{.State.Running}}' "$container")" = true ]; do
    [ "$SECONDS" -lt "$deadline" ] || { echo "$name startup hung" >&2; docker_cmd logs "$container"; return 1; }
    sleep 1
  done
  test "$(docker_cmd inspect --format '{{.State.ExitCode}}' "$container")" = 1
  docker_cmd logs "$container" > "/tmp/$container.log" 2>&1
  grep -Fq "$diagnostic" "/tmp/$container.log"
  ! grep -Fq 'Changing claude UID' "/tmp/$container.log"
  rm -f "/tmp/$container.log"
}

# Direct durable self-link rejects before remap and preserves its external sentinel.
reset_home
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc '
  set -eu
  printf "direct-sentinel\n" > /external/codex/sentinel; chmod 0640 /external/codex/sentinel; chown 1000:1000 /external/codex/sentinel
  ln -s .codex /home/claude/.claude/.codex
'
expect_prompt_failure direct 'durable Codex CLI state must not be a symbolic link' \
  ':'
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc \
  'set -eu; test "$(readlink /home/claude/.claude/.codex)" = .codex; test "$(stat -c %a:%u:%g /external/codex/sentinel)" = 640:1000:1000; grep -Fxq direct-sentinel /external/codex/sentinel'

# Cross-link to the top-level path also rejects without mutating the link or sentinel.
reset_home
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc '
  set -eu
  printf "cross-sentinel\n" > /external/codex/sentinel; chmod 0640 /external/codex/sentinel; chown 1000:1000 /external/codex/sentinel
  ln -s /home/claude/.codex /home/claude/.claude/.codex
'
expect_prompt_failure cross 'durable Codex CLI state must not be a symbolic link' \
  'rm -rf /home/claude/.codex; ln -s /external/codex /home/claude/.codex'
assert_container_symlink "$BASE-cross" /home/claude/.codex /external/codex
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc \
  'set -eu; test "$(readlink /home/claude/.claude/.codex)" = /home/claude/.codex; test "$(stat -c %a:%u:%g /external/codex/sentinel)" = 640:1000:1000; grep -Fxq cross-sentinel /external/codex/sentinel'

# Valid external top-level directory links remain unchanged and reach healthy startup.
reset_home
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc '
  set -eu
  for cli in codex gemini cursor; do
    printf "%s-external\n" "$cli" > "/external/$cli/sentinel"; chmod 0640 "/external/$cli/sentinel"; chown 1000:1000 "/external/$cli/sentinel"
  done
'
healthy="$BASE-healthy"; containers+=("$healthy")
start_tested_container "$healthy" 'for cli in codex gemini cursor; do rm -rf "/home/claude/.$cli"; ln -s "/external/$cli" "/home/claude/.$cli"; done' >/dev/null
deadline=$((SECONDS + 180))
until docker_cmd exec "$healthy" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do [ "$SECONDS" -lt "$deadline" ] || { docker_cmd logs "$healthy"; exit 1; }; sleep 2; done
docker_cmd exec --user 0:0 "$healthy" sh -lc '
  set -eu
  for cli in codex gemini cursor; do test "$(stat -c %a:%u:%g "/external/$cli/sentinel")" = 640:1000:1000; grep -Fxq "$cli-external" "/external/$cli/sentinel"; done
'
docker_cmd exec --user 1026:100 "$healthy" sh -lc '
  set -eu
  for cli in codex gemini cursor; do test "$(readlink "/home/claude/.$cli")" = "/external/$cli"; test -d "/home/claude/.$cli"; done
'
docker_cmd stop --time 20 "$healthy" >/dev/null

# A resolving top-level link to a regular file rejects without changing the file.
reset_home
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc '
  set -eu
  rm -rf /external/codex/*; printf "file-sentinel\n" > /external/codex/state-file; chmod 0640 /external/codex/state-file; chown 1000:1000 /external/codex/state-file
'
expect_prompt_failure regular-file 'user-managed Codex CLI link must resolve to a directory' \
  'rm -rf /home/claude/.codex; ln -s /external/codex/state-file /home/claude/.codex'
assert_container_symlink "$BASE-regular-file" /home/claude/.codex /external/codex/state-file
docker_cmd run --rm --user 0:0 --entrypoint sh "${mounts[@]}" "$IMAGE" -lc \
  'set -eu; test "$(stat -c %a:%u:%g /external/codex/state-file)" = 640:1000:1000; grep -Fxq file-sentinel /external/codex/state-file'

echo 'startup-links: installed-entrypoint direct-cross-external-directory-regular-file=ok'
