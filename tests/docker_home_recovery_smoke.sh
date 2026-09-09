#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_home_recovery_smoke.sh <image> [label]}"
LABEL="${2:-local}"; LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) echo 'home-recovery: native Linux runner required'; exit 0 ;; esac
ROOT="$(mktemp -d)"
CLEANUP_SENTINEL="$ROOT/.holyclaude-home-recovery-root"
: > "$CLEANUP_SENTINEL"
RECOVERY="$ROOT/recovery.sh"
containers=()
needs_owner_cleanup=no
docker_cmd() { docker "$@"; }
cleanup() {
  local status=$?
  local cleanup_status=0
  trap - EXIT
  if ((${#containers[@]} != 0)); then
    docker_cmd rm -f "${containers[@]}" >/dev/null 2>&1 || cleanup_status=$?
  fi
  if [ "$cleanup_status" -eq 0 ] && { [ -e "$ROOT" ] || [ -L "$ROOT" ]; }; then
    if [ -L "$ROOT" ] || [ ! -d "$ROOT" ] || [ ! -f "$CLEANUP_SENTINEL" ]; then
      cleanup_status=74
    elif [ "$needs_owner_cleanup" = yes ]; then
      docker_cmd run --rm --user 0:0 --entrypoint sh \
        -e CLEANUP_UID="$(id -u)" -e CLEANUP_GID="$(id -g)" \
        --mount "type=bind,source=$ROOT,target=/cleanup" "$IMAGE" -eu -c '
          find /cleanup -xdev -exec chown -h "$CLEANUP_UID:$CLEANUP_GID" {} +
        ' >/dev/null || cleanup_status=$?
    fi
  fi
  if [ "$cleanup_status" -eq 0 ]; then
    rm -rf "$ROOT" || cleanup_status=$?
  fi
  if [ "$cleanup_status" -ne 0 ]; then
    printf 'home-recovery: cleanup failed (status %s) for %s\n' "$cleanup_status" "$ROOT" >&2
  fi
  if [ "$status" -ne 0 ]; then exit "$status"; fi
  exit "$cleanup_status"
}
trap cleanup EXIT
awk '/^# HolyClaude host-side home recovery$/{copy=1} copy{if(/^```$/)exit; print}' docs/troubleshooting.md > "$RECOVERY"
grep -Fq '# HolyClaude host-side home recovery' "$RECOVERY"

for target in /home /home/claude; do
  suffix="${target##*/}"; [ "$target" = /home ] && suffix=home
  case_root="$ROOT/$suffix"; old="$case_root/old-home"; data="$case_root/data"; workspace="$case_root/workspace"
  mkdir -p "$old" "$data" "$workspace"
  source_home="$old"; [ "$target" = /home ] && { mkdir -p "$old/claude"; source_home="$old/claude"; }
  mkdir -p "$source_home/.claude" "$source_home/.codex" "$source_home/.gemini" "$source_home/.cursor" "$source_home/.config/gh"
  printf '{"fixture":"home-recovery"}\n' > "$source_home/.claude.json"
  printf 'claude-state\n' > "$source_home/.claude/state-marker"
  printf 'codex\n' > "$source_home/.codex/marker"
  printf 'gemini\n' > "$source_home/.gemini/marker"
  printf 'cursor\n' > "$source_home/.cursor/marker"
  printf 'github.com:\n  user: fixture\n' > "$source_home/.config/gh/hosts.yml"
  printf 'workspace-recovery\n' > "$workspace/marker.txt"
  project="hc-recovery-${LABEL}-${suffix}-$$"
  compose="$case_root/compose.yml"
  cat > "$compose" <<EOF
services:
  holyclaude:
    image: $IMAGE
    entrypoint: ["sleep"]
    command: ["infinity"]
    volumes:
      - $old:$target
EOF
  docker_cmd compose -p "$project" -f "$compose" up -d >/dev/null
  retained="$(docker_cmd compose -p "$project" -f "$compose" ps -a -q holyclaude)"; containers+=("$retained")
  backup="$case_root/original-backup"
  (cd "$case_root" && old_home="$old" new_claude="$data/claude" home_mount_target="$target" backup="$backup" \
    COMPOSE_PROJECT_NAME="$project" COMPOSE_FILE="$compose" bash "$RECOVERY")
  if [ "$target" = /home ]; then test -f "$backup/claude/.claude/state-marker"; else test -f "$backup/.claude/state-marker"; fi
  backup_hash="$(find "$backup" -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum)"
  candidate="holyclaude-recovered-${LABEL}-${suffix}-$$"; containers+=("$candidate")
  docker_cmd run -d --name "$candidate" -e PUID=1000 -e PGID=1000 \
    --mount "type=bind,source=$data/claude,target=/home/claude/.claude" \
    --mount "type=bind,source=$workspace,target=/workspace" --entrypoint sh "$IMAGE" -lc '
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
  needs_owner_cleanup=yes
  deadline=$((SECONDS + 180))
  until docker_cmd exec "$candidate" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
    [ "$SECONDS" -lt "$deadline" ] || { docker_cmd logs "$candidate"; exit 1; }; sleep 2
  done
  docker_cmd exec --user 1000:1000 "$candidate" sh -lc '
    set -eu
    claude --version
    grep -Fq home-recovery /home/claude/.claude.json
    grep -Fq claude-state /home/claude/.claude/state-marker
    test "$(readlink /home/claude/.codex)" = /home/claude/.claude/.codex
    test "$(readlink /home/claude/.gemini)" = /home/claude/.claude/.gemini
    test "$(readlink /home/claude/.config/gh)" = /home/claude/.claude/.config/gh
    grep -Fxq codex /home/claude/.codex/marker
    grep -Fxq gemini /home/claude/.gemini/marker
    grep -Fxq cursor /home/claude/.claude/.cursor/marker
    grep -Fq fixture /home/claude/.config/gh/hosts.yml
    grep -Fq workspace-recovery /workspace/marker.txt
  '
  docker_cmd exec --user 0:0 "$candidate" bash -lc '
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
        grep -Fxq cursor "$cursor_live/marker"
        ;;
      symlink)
        test -L "$cursor_live"
        test "$(readlink "$cursor_live")" = "$(cat "$cursor_snapshot")"
        ;;
      *) echo "unsupported pre-start Cursor topology: $cursor_type" >&2; exit 1 ;;
    esac
    # cursor-contract-end
  '
  docker_cmd stop --time 20 "$candidate" >/dev/null
  test "$backup_hash" = "$(find "$backup" -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum)"
done
echo 'home-recovery: documented-command broad-home-targets selective-startup=ok'
