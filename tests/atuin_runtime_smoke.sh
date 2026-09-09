#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: atuin_runtime_smoke.sh <image> [label]}"
LABEL="${2:-local}"
LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
VOLUME="holyclaude-atuin-${LABEL}-$$"

docker_cmd() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"; }
cleanup() { docker_cmd volume rm -f "$VOLUME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker_cmd run --rm --network none --user claude --entrypoint timeout "$IMAGE" 15s bash -ic '
  set -eu
  atuin --version
  ! pgrep -f "[a]tuin daemon"
  test ! -e "$HOME/.config/atuin"
  test ! -e "$HOME/.local/share/atuin"
  test ! -e "$HOME/.local/share/atuin/key"
'

run_opt_in() {
  docker_cmd run --rm --network none --user claude --entrypoint bash \
    -e ATUIN_CONFIG_DIR=/home/claude/.claude/atuin \
    --mount "type=volume,source=$VOLUME,target=/home/claude/.claude" \
    "$IMAGE" -lc "$1"
}

run_opt_in '
  set -eu
  export ATUIN_SESSION=018f47ae-8b20-7b7a-b955-49f226930d71
  install -d -m 0700 "$ATUIN_CONFIG_DIR/data"
  cat > "$ATUIN_CONFIG_DIR/config.toml" <<EOF
data_dir = "/home/claude/.claude/atuin/data"
auto_sync = false
update_check = false
[daemon]
enabled = false
autostart = false
EOF
  id="$(atuin history start -- holy-atuin-offline-fixture)"
  atuin history end --exit 0 "$id"
  atuin search --format "{command}" holy-atuin-offline-fixture | grep -Fx holy-atuin-offline-fixture
  ! pgrep -f "[a]tuin daemon"
'
run_opt_in '
  set -eu
  export ATUIN_SESSION=018f47ae-8b20-7b7a-b955-49f226930d71
  grep -Fq "auto_sync = false" "$ATUIN_CONFIG_DIR/config.toml"
  atuin search --format "{command}" holy-atuin-offline-fixture | grep -Fx holy-atuin-offline-fixture
  ! pgrep -f "[a]tuin daemon"
'
echo "atuin-runtime: default-inert offline-opt-in-recreation=ok"
