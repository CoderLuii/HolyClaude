#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_upgrade_rollback_smoke.sh <candidate-image> <variant> <arch> [label]}"
VARIANT="${2:?missing variant}"
ARCH="${3:?missing arch}"
LABEL="${4:-local}"; LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
case "$VARIANT-$ARCH" in
  full-amd64) OLD_TAG=1.5.9; OLD_INDEX=sha256:e21505a3f286101e0ea704bdbbec29eedee7c3b7490e224a4e781ac3e702250a; OLD_DIGEST=sha256:b797a832983c4f78e73ffdc9e673d384137f7c7e9836d71cf1672a2a10285ebd ;;
  full-arm64) OLD_TAG=1.5.9; OLD_INDEX=sha256:e21505a3f286101e0ea704bdbbec29eedee7c3b7490e224a4e781ac3e702250a; OLD_DIGEST=sha256:30e2c9af3f85fd56ea515123532ee4f941c7154f66ad41bfdd07b02e0f541356 ;;
  slim-amd64) OLD_TAG=1.5.9-slim; OLD_INDEX=sha256:424a931d1a9be32fb00669b4ea2d489c7bd3879d8cfc0b5ff77b20b8bbb056f3; OLD_DIGEST=sha256:24aa28d1a801f02d560c0fb7406cdd33092b9776eaf563e78167840cbe384fc3 ;;
  slim-arm64) OLD_TAG=1.5.9-slim; OLD_INDEX=sha256:424a931d1a9be32fb00669b4ea2d489c7bd3879d8cfc0b5ff77b20b8bbb056f3; OLD_DIGEST=sha256:c69dbd24af1d4fb88fb00b71f931fc7824ece3e019d856b55abf5a3253955d74 ;;
  *) echo "unsupported target: $VARIANT-$ARCH" >&2; exit 1 ;;
esac
OLD_REPO="coderluii/holyclaude:$OLD_TAG"
OLD_IMAGE="$OLD_REPO@$OLD_DIGEST"
BASE="holyclaude-upgrade-${LABEL}-$$"
volumes=()
containers=()
docker_cmd() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"; }
cleanup() {
  ((${#containers[@]} == 0)) || docker_cmd rm -f "${containers[@]}" >/dev/null 2>&1 || true
  ((${#volumes[@]} == 0)) || docker_cmd volume rm -f "${volumes[@]}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

free_kb="$(docker_cmd system df --format '{{.Size}}' >/dev/null 2>&1; df -Pk . | awk 'NR==2 {print $4}')"
printf 'upgrade-rollback: host-free-kib=%s\n' "$free_kb"
resolved_index="$(docker_cmd buildx imagetools inspect "$OLD_REPO" --format '{{json .Manifest}}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).digest))')"
test "$resolved_index" = "$OLD_INDEX"
docker_cmd pull "$OLD_IMAGE" >/dev/null
test "$(docker_cmd image inspect --format '{{.Architecture}}' "$OLD_IMAGE")" = "$ARCH"
printf 'upgrade-rollback: baseline=%s index=%s child=%s unpacked-bytes=%s\n' "$OLD_REPO" "$OLD_INDEX" "$OLD_DIGEST" "$(docker_cmd image inspect --format '{{.Size}}' "$OLD_IMAGE")"

seed_c="$BASE-seed-claude"; seed_w="$BASE-seed-workspace"; seed_db="$BASE-seed-cloudcli"
for volume in "$seed_c" "$seed_w" "$seed_db"; do docker_cmd volume create "$volume" >/dev/null; volumes+=("$volume"); done
docker_cmd run --rm --user 0:0 --entrypoint sh \
  --mount "type=volume,source=$seed_c,target=/state" --mount "type=volume,source=$seed_w,target=/workspace" \
  --mount "type=volume,source=$seed_db,target=/cloudcli" "$OLD_IMAGE" -lc '
    set -eu
    mkdir -p /state/.codex /state/.gemini /state/.cursor /state/.config/gh /cloudcli /workspace/project
    printf "{\"fixture\":\"claude-json\"}\n" > /state/.claude.json.persist
    printf "codex-fixture\n" > /state/.codex/runtime-marker
    printf "gemini-fixture\n" > /state/.gemini/runtime-marker
    printf "cursor-fixture\n" > /state/.cursor/runtime-marker
    printf "[user]\n name = Upgrade Fixture\n email = fixture@example.invalid\n" > /state/.gitconfig
    printf "github.com:\n  user: fixture\n" > /state/.config/gh/hosts.yml
    printf "alias fixture-alias=printf\\ fixture-alias-ok\\\\n\n" > /state/.bash_aliases
    printf "workspace-fixture\n" > /workspace/project/marker.txt
    chown -R 1000:1000 /state /workspace /cloudcli
  '

clone_volume() {
  local source="$1" target="$2"
  docker_cmd volume create "$target" >/dev/null; volumes+=("$target")
  docker_cmd run --rm --user 0:0 --entrypoint sh --mount "type=volume,source=$source,target=/from,readonly" \
    --mount "type=volume,source=$target,target=/to" "$OLD_IMAGE" -lc 'cp -a /from/. /to/'
}
assert_payloads() {
  local c="$1" expect_new_persistence="$2"
  docker_cmd exec --user 1000:1000 "$c" sh -lc '
    set -eu
    test ! -L /home/claude/.claude.json
    test ! -L /home/claude/.claude/.claude.json.persist
    test -f /home/claude/.claude.json
    test -f /home/claude/.claude/.claude.json.persist
    cmp -s /home/claude/.claude.json /home/claude/.claude/.claude.json.persist
    grep -Fq claude-json /home/claude/.claude.json
    grep -Fq claude-json /home/claude/.claude/.claude.json.persist
    grep -Fq codex-fixture /home/claude/.codex/runtime-marker
    grep -Fq gemini-fixture /home/claude/.gemini/runtime-marker
    grep -Fq cursor-fixture /home/claude/.claude/.cursor/runtime-marker
    grep -Fq "Upgrade Fixture" /home/claude/.gitconfig
    grep -Fq fixture /home/claude/.config/gh/hosts.yml
    sqlite3 /home/claude/.cloudcli/auth.db "PRAGMA integrity_check;" | grep -Fxq ok
    test "$(sqlite3 /home/claude/.cloudcli/auth.db "SELECT count(*) FROM users WHERE username = '\''upgrade-fixture'\'';")" = 1
    grep -Fq workspace-fixture /workspace/project/marker.txt
  '
  docker_cmd exec --user 0:0 "$c" bash -lc '
    set -eu
    # cursor-contract-start
    cursor_live="${CURSOR_CONTRACT_LIVE:-/home/claude/.cursor}"
    cursor_durable="${CURSOR_CONTRACT_DURABLE:-/home/claude/.claude/.cursor}"
    cursor_snapshot="${CURSOR_CONTRACT_SNAPSHOT:-/tmp/holyclaude-cursor-prestart.snapshot}"
    cursor_type_file="${CURSOR_CONTRACT_TYPE_FILE:-/tmp/holyclaude-cursor-prestart.type}"
    cursor_type="$(cat "$cursor_type_file")"
    case "$cursor_type" in
      directory)
        test ! -L "$cursor_live"
        test -d "$cursor_live"
        test -r "$cursor_live"
        test ! -L "$cursor_snapshot"
        test -d "$cursor_snapshot"
        cursor_manifest="$(mktemp)"
        trap "rm -f \"\$cursor_manifest\"" EXIT
        find "$cursor_snapshot" -xdev -print0 > "$cursor_manifest"
        test -s "$cursor_manifest"
        while IFS= read -r -d "" before; do
          relative="${before#"$cursor_snapshot"}"
          after="$cursor_live$relative"
          if [ -L "$before" ]; then
            test -L "$after"
            test "$(readlink "$after")" = "$(readlink "$before")"
          elif [ -d "$before" ]; then
            test ! -L "$after"
            test -d "$after"
          elif [ -f "$before" ]; then
            test ! -L "$after"
            test -f "$after"
            cmp -s "$before" "$after"
          else
            test "$(stat -c %F "$after")" = "$(stat -c %F "$before")"
          fi
          test "$(stat -c %a:%u:%g "$after")" = "$(stat -c %a:%u:%g "$before")"
        done < "$cursor_manifest"
        rm -f "$cursor_manifest"
        trap - EXIT
        ;;
      absent)
        test -L "$cursor_live"
        test "$(readlink "$cursor_live")" = "$cursor_durable"
        grep -Fq cursor-fixture "$cursor_live/runtime-marker"
        ;;
      symlink)
        test -L "$cursor_live"
        test "$(readlink "$cursor_live")" = "$(cat "$cursor_snapshot")"
        ;;
      *) echo "unsupported pre-start Cursor topology: $cursor_type" >&2; exit 1 ;;
    esac
    # cursor-contract-end
  '
  grep -Fq fixture-alias < <(docker_cmd run --rm --user 0:0 --entrypoint sh --mount "type=volume,source=$3,target=/state,readonly" "$OLD_IMAGE" -lc 'cat /state/.bash_aliases')
  if [ "$expect_new_persistence" = yes ]; then
    docker_cmd exec --user 1000:1000 "$c" grep -Fq fixture-alias /home/claude/.bash_aliases
  fi
}
run_stage() {
  local image="$1" stage="$2" cv="$3" wv="$4" dv="$5"
  local c="$BASE-$stage"
  containers+=("$c")
  docker_cmd run -d --name "$c" -e PUID=1000 -e PGID=1000 \
    --mount "type=volume,source=$cv,target=/home/claude/.claude" \
    --mount "type=volume,source=$wv,target=/workspace" \
    --mount "type=volume,source=$dv,target=/home/claude/.cloudcli" --entrypoint sh "$image" -lc '
      set -eu
      # cursor-snapshot-start
      cursor_live=/home/claude/.cursor
      cursor_snapshot=/tmp/holyclaude-cursor-prestart.snapshot
      if [ -L "$cursor_live" ]; then
        printf "symlink\n" > /tmp/holyclaude-cursor-prestart.type
        readlink "$cursor_live" > "$cursor_snapshot"
      elif [ -d "$cursor_live" ]; then
        printf "directory\n" > /tmp/holyclaude-cursor-prestart.type
        cp -a "$cursor_live" "$cursor_snapshot"
      elif [ -e "$cursor_live" ]; then
        printf "unsupported\n" > /tmp/holyclaude-cursor-prestart.type
      else
        printf "absent\n" > /tmp/holyclaude-cursor-prestart.type
      fi
      exec /usr/local/bin/entrypoint.sh
    ' >/dev/null
  local deadline=$((SECONDS + 180))
  until docker_cmd exec "$c" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
    [ "$SECONDS" -lt "$deadline" ] || { docker_cmd logs "$c"; return 1; }; sleep 2
  done
  if [ "$stage" = old-seed ]; then
    response="$(docker_cmd exec "$c" curl -fsS -X POST -H 'Content-Type: application/json' --data '{"username":"upgrade-fixture","password":"synthetic-password-160"}' http://127.0.0.1:3001/api/auth/register)"
    printf '%s' "$response" | grep -Fq '"success":true'
  fi
  case "$stage" in candidate) expect_new_persistence=yes ;; *) expect_new_persistence=no ;; esac
  assert_payloads "$c" "$expect_new_persistence" "$cv"
  docker_cmd stop --time 20 "$c" >/dev/null
}

run_stage "$OLD_IMAGE" old-seed "$seed_c" "$seed_w" "$seed_db"
candidate_c="$BASE-candidate-claude"; candidate_w="$BASE-candidate-workspace"; candidate_db="$BASE-candidate-cloudcli"
clone_volume "$seed_c" "$candidate_c"; clone_volume "$seed_w" "$candidate_w"; clone_volume "$seed_db" "$candidate_db"
run_stage "$IMAGE" candidate "$candidate_c" "$candidate_w" "$candidate_db"
rollback_c="$BASE-rollback-claude"; rollback_w="$BASE-rollback-workspace"; rollback_db="$BASE-rollback-cloudcli"
clone_volume "$candidate_c" "$rollback_c"; clone_volume "$candidate_w" "$rollback_w"; clone_volume "$candidate_db" "$rollback_db"
run_stage "$OLD_IMAGE" rollback "$rollback_c" "$rollback_w" "$rollback_db"
echo "upgrade-rollback: immutable-baseline cloned-seed candidate rollback=ok"
