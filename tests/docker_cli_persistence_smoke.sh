#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_cli_persistence_smoke.sh <image> [label]}"
LABEL="${2:-local}"
LABEL="${LABEL//[^a-zA-Z0-9_.-]/-}"
TIMEOUT="${HOLYCLAUDE_CLI_PERSIST_SMOKE_TIMEOUT:-180}"
BASE="holyclaude-cli-persist-${LABEL}-$$"
FIRST_CONTAINER="${BASE}-first"
SECOND_CONTAINER="${BASE}-second"
ROOTLESS_CONTAINER="${BASE}-rootless"
FRESH_ROOTLESS_CONTAINER="${BASE}-fresh-rootless"
CUSTOM_ID_CONTAINER="${BASE}-custom-id"
BIND_FIRST_CONTAINER="${BASE}-bind-first"
BIND_SECOND_CONTAINER="${BASE}-bind-second"
CLAUDE_VOLUME="${BASE}-claude"
WORKSPACE_VOLUME="${BASE}-workspace"
FRESH_ROOTLESS_CLAUDE_VOLUME="${BASE}-fresh-rootless-claude"
FRESH_ROOTLESS_WORKSPACE_VOLUME="${BASE}-fresh-rootless-workspace"
CUSTOM_ID_CLAUDE_VOLUME="${BASE}-custom-id-claude"
CUSTOM_ID_WORKSPACE_VOLUME="${BASE}-custom-id-workspace"
TMP_DIR="$(mktemp -d)"
SYNTHETIC_TOKEN="synthetic-cli-persistence-token"
touch "$TMP_DIR/bind-first.log" "$TMP_DIR/bind-second.log"

docker_cmd() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"
}

dump_debug() {
  local container
  for container in \
    "$FIRST_CONTAINER" \
    "$SECOND_CONTAINER" \
    "$ROOTLESS_CONTAINER" \
    "$FRESH_ROOTLESS_CONTAINER" \
    "$CUSTOM_ID_CONTAINER" \
    "$BIND_FIRST_CONTAINER" \
    "$BIND_SECOND_CONTAINER"; do
    if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$container"; then
      echo "::group::CLI persistence logs: $container"
      docker_cmd logs "$container" 2>&1 |
        sed "s/${SYNTHETIC_TOKEN}/[redacted]/g" || true
      echo "::endgroup::"
    fi
  done
}

cleanup() {
  docker_cmd rm -f \
    "$FIRST_CONTAINER" \
    "$SECOND_CONTAINER" \
    "$ROOTLESS_CONTAINER" \
    "$FRESH_ROOTLESS_CONTAINER" \
    "$CUSTOM_ID_CONTAINER" \
    "$BIND_FIRST_CONTAINER" \
    "$BIND_SECOND_CONTAINER" >/dev/null 2>&1 || true
  docker_cmd volume rm -f \
    "$CLAUDE_VOLUME" \
    "$WORKSPACE_VOLUME" \
    "$FRESH_ROOTLESS_CLAUDE_VOLUME" \
    "$FRESH_ROOTLESS_WORKSPACE_VOLUME" \
    "$CUSTOM_ID_CLAUDE_VOLUME" \
    "$CUSTOM_ID_WORKSPACE_VOLUME" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}

trap dump_debug ERR
trap cleanup EXIT

wait_for_health() {
  local container="$1"
  local deadline=$((SECONDS + TIMEOUT))

  until docker_cmd exec "$container" curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      docker_cmd exec "$container" curl -fsS http://127.0.0.1:3001/health >/dev/null
      return 1
    fi
    sleep 2
  done
}

start_container() {
  local container="$1"
  local git_name="$2"
  local git_email="$3"
  shift 3

  docker_cmd run -d \
    --name "$container" \
    "$@" \
    -e HOME=/home/claude \
    -e PUID=1000 \
    -e PGID=1000 \
    -e GIT_USER_NAME="$git_name" \
    -e GIT_USER_EMAIL="$git_email" \
    --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude" \
    --mount "type=volume,source=$WORKSPACE_VOLUME,target=/workspace" \
    "$IMAGE" >/dev/null
  wait_for_health "$container"
}

assert_persistent_state() {
  local container="$1"
  docker_cmd exec --user 1000:1000 "$container" sh -lc '
    set -eu
    test "$(readlink /home/claude/.gitconfig)" = /home/claude/.claude/.gitconfig
    test "$(readlink /home/claude/.config/git)" = /home/claude/.claude/.config/git
    test "$(readlink /home/claude/.config/gh)" = /home/claude/.claude/.config/gh
    test "$(git config --global user.name)" = "Manual User"
    test "$(git config --global user.email)" = "first@example.invalid"
    test "$(git config --global alias.audit)" = status
    test "$(git config alias.xdg-audit)" = status
    test "$(git config --global --get-all safe.directory | grep -Fxc /workspace)" = 1
    test -z "$(git config --global --get-all include.path 2>/dev/null || true)"
    test "$(git config alias.xdg-audit)" = status
    test "$(gh auth token --hostname github.com)" = synthetic-cli-persistence-token
    test "$(stat -c %a /home/claude/.claude/.gitconfig)" = 600
    test "$(stat -c %a /home/claude/.claude/.config/git)" = 700
    test "$(stat -c %a /home/claude/.claude/.config/git/config)" = 600
    test "$(stat -c %a /home/claude/.claude/.config/gh)" = 700
    test "$(stat -c %a /home/claude/.claude/.config/gh/hosts.yml)" = 600
    test ! -e /home/claude/not-durable
  '
}

if docker_cmd pull "$IMAGE" >/dev/null 2>&1; then
  echo "cli-persistence-smoke: image_source=pulled"
elif docker_cmd image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "cli-persistence-smoke: image_source=local"
else
  echo "image ref is neither pullable nor present locally: $IMAGE" >&2
  exit 1
fi

docker_cmd volume create "$CLAUDE_VOLUME" >/dev/null
docker_cmd volume create "$WORKSPACE_VOLUME" >/dev/null

docker_cmd run --rm \
  --entrypoint bash \
  "$IMAGE" \
  -s > "$TMP_DIR/path-matrix.log" 2>&1 <<'CONTAINER_TESTS'
set -Eeuo pipefail

prepare() {
  CLAUDE_HOME="$1" PUID=1000 PGID=1000 /usr/local/bin/prepare-cli-persistence.sh
}

legacy=/tmp/cli-persistence-legacy
mkdir -p "$legacy/.config/git" "$legacy/.config/gh"
printf '[user]\n\tname = Legacy User\n' > "$legacy/.gitconfig"
printf '#!/bin/sh\nexit 0\n' > "$legacy/.config/git/credential-helper"
chmod 0755 "$legacy/.config/git/credential-helper"
printf 'github.com:\n    user: legacy-user\n' > "$legacy/.config/gh/hosts.yml"
prepare "$legacy"
test "$(readlink "$legacy/.gitconfig")" = "$legacy/.claude/.gitconfig"
test "$(readlink "$legacy/.config/git")" = "$legacy/.claude/.config/git"
test "$(readlink "$legacy/.config/gh")" = "$legacy/.claude/.config/gh"
test "$(git config --file "$legacy/.claude/.gitconfig" user.name)" = "Legacy User"
test "$(stat -c %a "$legacy/.claude/.config/git/credential-helper")" = 755

conflict=/tmp/cli-persistence-conflict
mkdir -p "$conflict/.config/gh" "$conflict/.claude/.config/gh"
printf 'live-git\n' > "$conflict/.gitconfig"
printf 'live-gh\n' > "$conflict/.config/gh/hosts.yml"
printf 'durable-gh\n' > "$conflict/.claude/.config/gh/hosts.yml"
if prepare "$conflict"; then
  echo "conflicting live and durable state was accepted" >&2
  exit 1
fi
test -f "$conflict/.gitconfig"
test ! -e "$conflict/.claude/.gitconfig"
grep -Fxq live-git "$conflict/.gitconfig"
grep -Fxq live-gh "$conflict/.config/gh/hosts.yml"
grep -Fxq durable-gh "$conflict/.claude/.config/gh/hosts.yml"

wrong_type=/tmp/cli-persistence-wrong-type
mkdir -p "$wrong_type/.gitconfig"
if prepare "$wrong_type"; then
  echo "directory at the Git global configuration path was accepted" >&2
  exit 1
fi
test -d "$wrong_type/.gitconfig"
test ! -e "$wrong_type/.claude/.gitconfig"

broken=/tmp/cli-persistence-broken
mkdir -p "$broken/.claude"
ln -s "$broken/.claude/.gitconfig" "$broken/.gitconfig"
prepare "$broken"
test -f "$broken/.claude/.gitconfig"
test "$(readlink "$broken/.gitconfig")" = "$broken/.claude/.gitconfig"

user_managed=/tmp/cli-persistence-user-managed
mkdir -p "$user_managed/external"
printf '[user]\n\tname = User Managed\n' > "$user_managed/external/gitconfig"
ln -s "$user_managed/external/gitconfig" "$user_managed/.gitconfig"
prepare "$user_managed"
test "$(readlink "$user_managed/.gitconfig")" = "$user_managed/external/gitconfig"
test "$(git config --file "$user_managed/external/gitconfig" user.name)" = "User Managed"
test ! -e "$user_managed/.claude/.gitconfig"

unexpected=/tmp/cli-persistence-unexpected
mkdir -p "$unexpected"
ln -s "$unexpected/missing" "$unexpected/.gitconfig"
if prepare "$unexpected"; then
  echo "unexpected dangling link was accepted" >&2
  exit 1
fi
test "$(readlink "$unexpected/.gitconfig")" = "$unexpected/missing"

durable_link=/tmp/cli-persistence-durable-link
mkdir -p "$durable_link/.claude"
printf 'external\n' > "$durable_link/external"
ln -s "$durable_link/external" "$durable_link/.claude/.gitconfig"
if prepare "$durable_link"; then
  echo "symbolic durable target was accepted" >&2
  exit 1
fi
test "$(readlink "$durable_link/.claude/.gitconfig")" = "$durable_link/external"
grep -Fxq external "$durable_link/external"

git_override=/tmp/cli-persistence-git-override
mkdir -p "$git_override/.config/git"
printf 'caller-managed\n' > "$git_override/.gitconfig"
printf 'caller-xdg\n' > "$git_override/.config/git/config"
GIT_CONFIG_GLOBAL="$git_override/custom-global" prepare "$git_override"
test -f "$git_override/.gitconfig"
test -f "$git_override/.config/git/config"
test ! -e "$git_override/.claude/.gitconfig"
test ! -e "$git_override/.claude/.config/git"
grep -Fxq caller-managed "$git_override/.gitconfig"
grep -Fxq caller-xdg "$git_override/.config/git/config"

xdg_override=/tmp/cli-persistence-xdg-override
mkdir -p "$xdg_override/.config/git" "$xdg_override/.config/gh"
printf 'caller-git\n' > "$xdg_override/.config/git/config"
printf 'caller-gh\n' > "$xdg_override/.config/gh/hosts.yml"
XDG_CONFIG_HOME="$xdg_override/custom-xdg" prepare "$xdg_override"
test -f "$xdg_override/.config/git/config"
test -f "$xdg_override/.config/gh/hosts.yml"
test ! -e "$xdg_override/.claude/.config"

gh_override=/tmp/cli-persistence-gh-override
mkdir -p "$gh_override/.config/gh"
printf 'caller-gh\n' > "$gh_override/.config/gh/hosts.yml"
GH_CONFIG_DIR="$gh_override/custom-gh" prepare "$gh_override"
test -f "$gh_override/.config/gh/hosts.yml"
test ! -e "$gh_override/.claude/.config/gh"
CONTAINER_TESTS

start_container "$FIRST_CONTAINER" "First User" "first@example.invalid"
docker_cmd exec "$FIRST_CONTAINER" sh -lc '
  set -eu
  test "$(readlink /home/claude/.gitconfig)" = /home/claude/.claude/.gitconfig
  test "$(readlink /home/claude/.config/git)" = /home/claude/.claude/.config/git
  test "$(readlink /home/claude/.config/gh)" = /home/claude/.claude/.config/gh
  test "$(git config --global user.name)" = "First User"
  test "$(git config --global user.email)" = "first@example.invalid"
  test "$(git config --global --get-all safe.directory | grep -Fxc /workspace)" = 1
'
docker_cmd exec --user 1000:1000 "$FIRST_CONTAINER" sh -lc '
  set -eu
  git config --global user.name "Manual User"
  git config --global alias.audit status
  printf "[alias]\n\txdg-audit = status\n[credential]\n\thelper = test-helper\n" \
    > /home/claude/.config/git/config
  printf "github.com:\n    user: test-user\n    oauth_token: synthetic-cli-persistence-token\n" \
    > /home/claude/.config/gh/hosts.yml
  touch /home/claude/not-durable
'
docker_cmd logs "$FIRST_CONTAINER" > "$TMP_DIR/first.log" 2>&1
docker_cmd rm -f "$FIRST_CONTAINER" >/dev/null

start_container "$SECOND_CONTAINER" "Changed Environment" "changed@example.invalid"
assert_persistent_state "$SECOND_CONTAINER"
docker_cmd logs "$SECOND_CONTAINER" > "$TMP_DIR/second.log" 2>&1
docker_cmd rm -f "$SECOND_CONTAINER" >/dev/null

start_container \
  "$ROOTLESS_CONTAINER" \
  "Ignored Rootless Name" \
  "ignored-rootless@example.invalid" \
  --user 1000:1000
assert_persistent_state "$ROOTLESS_CONTAINER"
docker_cmd logs "$ROOTLESS_CONTAINER" > "$TMP_DIR/rootless.log" 2>&1
docker_cmd rm -f "$ROOTLESS_CONTAINER" >/dev/null

docker_cmd volume create "$FRESH_ROOTLESS_CLAUDE_VOLUME" >/dev/null
docker_cmd volume create "$FRESH_ROOTLESS_WORKSPACE_VOLUME" >/dev/null
docker_cmd run --rm \
  --entrypoint bash \
  --mount "type=volume,source=$FRESH_ROOTLESS_CLAUDE_VOLUME,target=/home/claude/.claude" \
  --mount "type=volume,source=$FRESH_ROOTLESS_WORKSPACE_VOLUME,target=/workspace" \
  "$IMAGE" \
  -lc '
    chown -R 1000:1000 /home/claude/.claude /workspace
    install -o 1000 -g 1000 /dev/null /home/claude/.claude/.holyclaude-volume-ready
    install -o 1000 -g 1000 /dev/null /workspace/.holyclaude-volume-ready
  '
docker_cmd run -d \
  --name "$FRESH_ROOTLESS_CONTAINER" \
  --user 1000:1000 \
  -e HOME=/home/claude \
  -e PUID=1000 \
  -e PGID=1000 \
  -e GIT_USER_NAME="Fresh Rootless" \
  -e GIT_USER_EMAIL="fresh-rootless@example.invalid" \
  --mount "type=volume,source=$FRESH_ROOTLESS_CLAUDE_VOLUME,target=/home/claude/.claude" \
  --mount "type=volume,source=$FRESH_ROOTLESS_WORKSPACE_VOLUME,target=/workspace" \
  "$IMAGE" >/dev/null
wait_for_health "$FRESH_ROOTLESS_CONTAINER"
docker_cmd exec "$FRESH_ROOTLESS_CONTAINER" sh -lc '
  set -eu
  test "$(id -u)" = 1000
  test "$(git config --global user.name)" = "Fresh Rootless"
  test "$(readlink /home/claude/.config/gh)" = /home/claude/.claude/.config/gh
  touch /workspace/rootless-created
  test "$(stat -c %u:%g /workspace/rootless-created)" = 1000:1000
'
docker_cmd logs "$FRESH_ROOTLESS_CONTAINER" > "$TMP_DIR/fresh-rootless.log" 2>&1
docker_cmd rm -f "$FRESH_ROOTLESS_CONTAINER" >/dev/null

docker_cmd volume create "$CUSTOM_ID_CLAUDE_VOLUME" >/dev/null
docker_cmd volume create "$CUSTOM_ID_WORKSPACE_VOLUME" >/dev/null
docker_cmd run -d \
  --name "$CUSTOM_ID_CONTAINER" \
  -e HOME=/home/claude \
  -e PUID=1200 \
  -e PGID=1300 \
  -e GIT_USER_NAME="Custom Identity" \
  -e GIT_USER_EMAIL="custom-id@example.invalid" \
  --mount "type=volume,source=$CUSTOM_ID_CLAUDE_VOLUME,target=/home/claude/.claude" \
  --mount "type=volume,source=$CUSTOM_ID_WORKSPACE_VOLUME,target=/workspace" \
  "$IMAGE" >/dev/null
wait_for_health "$CUSTOM_ID_CONTAINER"
docker_cmd exec "$CUSTOM_ID_CONTAINER" sh -lc '
  set -eu
  test "$(id -u claude)" = 1200
  test "$(id -g claude)" = 1300
  test "$(stat -c %u:%g /home/claude/.claude/.gitconfig)" = 1200:1300
  test "$(stat -c %u:%g /home/claude/.claude/.config/gh)" = 1200:1300
  test "$(git config --global user.name)" = "Custom Identity"
'
docker_cmd logs "$CUSTOM_ID_CONTAINER" > "$TMP_DIR/custom-id.log" 2>&1
docker_cmd rm -f "$CUSTOM_ID_CONTAINER" >/dev/null

if [ "$(uname -s)" = Linux ] && [ "$(id -u)" -ne 0 ]; then
  bind_claude="$TMP_DIR/bind-claude"
  bind_workspace="$TMP_DIR/bind-workspace"
  mkdir -p "$bind_claude" "$bind_workspace"
  chmod 0700 "$bind_claude" "$bind_workspace"
  host_uid="$(id -u)"
  host_gid="$(id -g)"

  for container in "$BIND_FIRST_CONTAINER" "$BIND_SECOND_CONTAINER"; do
    docker_cmd run -d \
      --name "$container" \
      -e HOME=/home/claude \
      -e PUID="$host_uid" \
      -e PGID="$host_gid" \
      -e GIT_USER_NAME="Bind User" \
      -e GIT_USER_EMAIL="bind@example.invalid" \
      --mount "type=bind,source=$bind_claude,target=/home/claude/.claude" \
      --mount "type=bind,source=$bind_workspace,target=/workspace" \
      "$IMAGE" >/dev/null
    wait_for_health "$container"
    if [ "$container" = "$BIND_FIRST_CONTAINER" ]; then
      docker_cmd exec --user "$host_uid:$host_gid" "$container" sh -lc '
        set -eu
        git config --global user.name "Manual Bind User"
        printf "github.com:\n    user: bind-user\n    oauth_token: synthetic-cli-persistence-token\n" \
          > /home/claude/.config/gh/hosts.yml
      '
    else
      docker_cmd exec --user "$host_uid:$host_gid" "$container" sh -lc '
        set -eu
        test "$(git config --global user.name)" = "Manual Bind User"
        test "$(gh auth token --hostname github.com)" = synthetic-cli-persistence-token
        test "$(stat -c %u:%g /home/claude/.claude/.gitconfig)" = "$(id -u):$(id -g)"
      '
    fi
    if [ "$container" = "$BIND_FIRST_CONTAINER" ]; then
      docker_cmd logs "$container" > "$TMP_DIR/bind-first.log" 2>&1
    else
      docker_cmd logs "$container" > "$TMP_DIR/bind-second.log" 2>&1
    fi
    docker_cmd rm -f "$container" >/dev/null
  done
fi

if grep -Fq "$SYNTHETIC_TOKEN" \
  "$TMP_DIR/first.log" \
  "$TMP_DIR/second.log" \
  "$TMP_DIR/rootless.log" \
  "$TMP_DIR/fresh-rootless.log" \
  "$TMP_DIR/custom-id.log" \
  "$TMP_DIR/bind-first.log" \
  "$TMP_DIR/bind-second.log" \
  "$TMP_DIR/path-matrix.log"; then
  echo "synthetic GitHub CLI authentication state leaked to container logs" >&2
  exit 1
fi

if docker_cmd run --rm \
  --entrypoint bash \
  -e HOME=/home/claude \
  -e PUID=1000 \
  -e PGID=1000 \
  --mount "type=volume,source=$CLAUDE_VOLUME,target=/home/claude/.claude,readonly" \
  "$IMAGE" \
  -lc '/usr/local/bin/prepare-cli-persistence.sh' \
  > "$TMP_DIR/read-only.log" 2>&1; then
  echo "CLI persistence unexpectedly accepted read-only durable storage" >&2
  exit 1
fi

echo "cli-persistence-smoke: success image=$IMAGE"
