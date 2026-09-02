#!/usr/bin/env bash
set -Eeuo pipefail

IMAGE="${1:?usage: docker_ssh_mosh_smoke.sh <image> [label]}"
LABEL="${2:-local}"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    WINDOWS_SHELL=1
    TMP_PARENT="${HOLYCLAUDE_SMOKE_TMPDIR:-$PWD/.tmp}"
    mkdir -p "$TMP_PARENT"
    TMP_DIR="$(mktemp -d "$TMP_PARENT/holyclaude-ssh.XXXXXX")"
    ;;
  *)
    WINDOWS_SHELL=0
    TMP_DIR="$(mktemp -d)"
    ;;
esac
CONTAINER="holyclaude-ssh-${LABEL}-$$"
SSH_PORT="${HOLYCLAUDE_SSH_SMOKE_PORT:-$((22000 + RANDOM % 10000))}"

docker_bind_source() {
  if [ "$WINDOWS_SHELL" = "1" ] && command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

docker_cmd() {
  MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker "$@"
}

cleanup() {
  local original_status=$?
  local cleanup_status=0
  if docker_cmd ps --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
    docker_cmd exec --user 0:0 "$CONTAINER" sh -lc \
      'chmod -R a+rwX /var/lib/holyclaude-ssh 2>/dev/null || true' >/dev/null 2>&1 || true
  fi
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if ! rm -rf "$TMP_DIR" 2>/dev/null; then
    local cleanup_mount
    cleanup_mount="$(docker_bind_source "$TMP_DIR")"
    docker_cmd run --rm \
      --user 0:0 \
      --entrypoint sh \
      --mount "type=bind,source=$cleanup_mount,target=/cleanup" \
      "$IMAGE" \
      -lc 'chmod -R a+rwX /cleanup' >/dev/null || cleanup_status=$?
    if [ "$cleanup_status" -eq 0 ]; then
      rm -rf "$TMP_DIR" || cleanup_status=$?
    fi
  fi
  if [ "$cleanup_status" -ne 0 ]; then
    echo "HolyClaude SSH/Mosh smoke cleanup failed with status $cleanup_status" >&2
  fi
  if [ "$original_status" -ne 0 ]; then
    return "$original_status"
  fi
  return "$cleanup_status"
}

dump_debug() {
  if docker_cmd ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER"; then
    echo "::group::holyclaude ssh container logs"
    docker_cmd logs "$CONTAINER" || true
    echo "::endgroup::"

    echo "::group::holyclaude ssh process state"
    docker_cmd exec "$CONTAINER" sh -lc 'id; ss -ltnup || true; ls -la /run/holyclaude-ssh /etc/ssh/authorized_keys /var/lib/holyclaude-ssh/host_keys 2>/dev/null || true' || true
    echo "::endgroup::"
  fi
}

trap dump_debug ERR
trap cleanup EXIT

CLAUDE_DIR="$TMP_DIR/claude"
WORKSPACE_DIR="$TMP_DIR/workspace"
SSH_DIR="$TMP_DIR/ssh"
SSH_STATE_DIR="$TMP_DIR/ssh-state"
mkdir -p "$CLAUDE_DIR" "$WORKSPACE_DIR" "$SSH_DIR" "$SSH_STATE_DIR"
CLAUDE_MOUNT="$(docker_bind_source "$CLAUDE_DIR")"
WORKSPACE_MOUNT="$(docker_bind_source "$WORKSPACE_DIR")"
SSH_AUTH_KEYS_MOUNT="$(docker_bind_source "$SSH_DIR/authorized_keys")"
SSH_STATE_MOUNT="$(docker_bind_source "$SSH_STATE_DIR")"

wait_for_cloudcli() {
  local deadline=$((SECONDS + 180))
  while ! docker_cmd exec "$CONTAINER" curl -sf http://localhost:3001/ >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      docker_cmd exec "$CONTAINER" curl -sf http://localhost:3001/ >/dev/null
      return 1
    fi
    sleep 2
  done
}

assert_no_sshd_listener() {
  docker_cmd exec "$CONTAINER" sh -lc "! ss -ltn | grep -Eq '(^|[[:space:]]):22[[:space:]]'"
}

assert_mosh_disabled() {
  docker_cmd exec "$CONTAINER" sh -lc "! mosh-server new 2>/tmp/mosh-disabled.err"
}

start_base_container() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker_cmd run -d \
    --name "$CONTAINER" \
    -e PUID="$(id -u)" \
    -e PGID="$(id -g)" \
    --mount "type=bind,source=$CLAUDE_MOUNT,target=/home/claude/.claude" \
    --mount "type=bind,source=$WORKSPACE_MOUNT,target=/workspace" \
    "$IMAGE" >/dev/null
}

start_ssh_container() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker_cmd run -d \
    --name "$CONTAINER" \
    -e PUID="$(id -u)" \
    -e PGID="$(id -g)" \
    -e HOLYCLAUDE_SSH_ENABLE=true \
    -e HOLYCLAUDE_MOSH_ENABLE=true \
    -p "127.0.0.1:${SSH_PORT}:22" \
    --mount "type=bind,source=$CLAUDE_MOUNT,target=/home/claude/.claude" \
    --mount "type=bind,source=$WORKSPACE_MOUNT,target=/workspace" \
    --mount "type=bind,source=$SSH_AUTH_KEYS_MOUNT,target=/run/holyclaude-ssh/authorized_keys,readonly" \
    --mount "type=bind,source=$SSH_STATE_MOUNT,target=/var/lib/holyclaude-ssh" \
    "$IMAGE" >/dev/null
}

start_ssh_container_rw_keys() {
  docker_cmd rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker_cmd run -d \
    --name "$CONTAINER" \
    -e PUID="$(id -u)" \
    -e PGID="$(id -g)" \
    -e HOLYCLAUDE_SSH_ENABLE=true \
    --mount "type=bind,source=$CLAUDE_MOUNT,target=/home/claude/.claude" \
    --mount "type=bind,source=$WORKSPACE_MOUNT,target=/workspace" \
    --mount "type=bind,source=$SSH_AUTH_KEYS_MOUNT,target=/run/holyclaude-ssh/authorized_keys" \
    "$IMAGE" >/dev/null
}

ssh_as() {
  local user="$1"
  shift
  ssh \
    -i "$SSH_DIR/id_ed25519" \
    -p "$SSH_PORT" \
    -o BatchMode=yes \
    -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile="$TMP_DIR/known_hosts" \
    "$user@127.0.0.1" "$@"
}

wait_for_ssh() {
  local deadline=$((SECONDS + 90))
  while ! ssh_as claude 'true' >/dev/null 2>&1; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      ssh_as claude 'true'
      return 1
    fi
    sleep 2
  done
}

ssh-keygen -q -t ed25519 -N '' -f "$SSH_DIR/id_ed25519"
cp "$SSH_DIR/id_ed25519.pub" "$SSH_DIR/authorized_keys"

start_base_container
wait_for_cloudcli
assert_no_sshd_listener
assert_mosh_disabled

docker_cmd rm -f "$CONTAINER" >/dev/null
docker_cmd run -d \
  --name "$CONTAINER" \
  -e HOLYCLAUDE_SSH_ENABLE=true \
  --mount "type=bind,source=$CLAUDE_MOUNT,target=/home/claude/.claude" \
  --mount "type=bind,source=$WORKSPACE_MOUNT,target=/workspace" \
  "$IMAGE" >/dev/null
wait_for_cloudcli
assert_no_sshd_listener

start_ssh_container_rw_keys
wait_for_cloudcli
assert_no_sshd_listener

start_ssh_container
wait_for_cloudcli
wait_for_ssh

if [ "$(ssh_as claude 'id -un')" != "claude" ]; then
  echo "expected SSH login as claude" >&2
  exit 1
fi

ssh_as claude 'test -w /workspace && test -x /usr/bin/mosh-server'

if ssh \
  -p "$SSH_PORT" \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  -o NumberOfPasswordPrompts=0 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile="$TMP_DIR/password_known_hosts" \
  claude@127.0.0.1 true >/dev/null 2>&1; then
  echo "password authentication unexpectedly succeeded" >&2
  exit 1
fi

if ssh_as root 'true' >/dev/null 2>&1; then
  echo "root SSH login unexpectedly succeeded" >&2
  exit 1
fi

fingerprint_before="$(docker_cmd exec "$CONTAINER" ssh-keygen -lf /var/lib/holyclaude-ssh/host_keys/ssh_host_ed25519_key.pub)"
docker_cmd rm -f "$CONTAINER" >/dev/null
start_ssh_container
wait_for_cloudcli
wait_for_ssh
fingerprint_after="$(docker_cmd exec "$CONTAINER" ssh-keygen -lf /var/lib/holyclaude-ssh/host_keys/ssh_host_ed25519_key.pub)"

if [ "$fingerprint_before" != "$fingerprint_after" ]; then
  echo "SSH host key fingerprint changed across recreate" >&2
  exit 1
fi

docker_cmd exec "$CONTAINER" sh -lc 'timeout 5 mosh-server new -s > /tmp/mosh.out 2>&1 || true; grep -Eq "MOSH CONNECT 6000[0-9]|MOSH CONNECT 60010" /tmp/mosh.out'

echo "HolyClaude SSH/Mosh smoke passed for $IMAGE"
