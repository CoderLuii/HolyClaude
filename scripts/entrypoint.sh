#!/bin/bash
set -e

# ==============================================================================
# HolyClaude - Container Entrypoint
# Handles: UID/GID remapping, first-boot bootstrap, s6-overlay handoff
# ==============================================================================

CLAUDE_USER="claude"
CLAUDE_HOME="/home/claude"
WORKSPACE_DIR="/workspace"
export HOME="$CLAUDE_HOME"

RUNNING_AS_ROOT=0
if [ "$(id -u)" = "0" ]; then
    RUNNING_AS_ROOT=1
fi

run_as_claude() {
    if [ "$RUNNING_AS_ROOT" = "1" ]; then
        runuser -u "$CLAUDE_USER" -- "$@"
    else
        "$@"
    fi
}

run_as_claude_env() {
    if [ "$RUNNING_AS_ROOT" = "1" ]; then
        runuser -u "$CLAUDE_USER" -- env HOME="$CLAUDE_HOME" "$@"
    else
        env HOME="$CLAUDE_HOME" "$@"
    fi
}

chown_if_root() {
    if [ "$RUNNING_AS_ROOT" = "1" ]; then
        chown "$@"
    fi
}

is_truthy() {
    case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
        true|1|yes|on) return 0 ;;
        *) return 1 ;;
    esac
}

is_unsafe_ssh_state_path() {
    case "$1" in
        "$CLAUDE_HOME"|"$CLAUDE_HOME"/*|"$WORKSPACE_DIR"|"$WORKSPACE_DIR"/*) return 0 ;;
        *) return 1 ;;
    esac
}

is_valid_port() {
    case "$1" in
        ''|*[!0-9]*) return 1 ;;
    esac
    [ "$1" -ge 1 ] && [ "$1" -le 65535 ]
}

is_read_only_mount_path() {
    command -v findmnt >/dev/null 2>&1 || return 1
    findmnt -no OPTIONS -T "$1" 2>/dev/null | tr ',' '\n' | grep -Fxq ro
}

disable_sshd_service() {
    rm -f /etc/s6-overlay/user-bundles.d/user/contents.d/sshd 2>/dev/null || true
}

configure_remote_shell() {
    SSHD_MARKER="/etc/s6-overlay/user-bundles.d/user/contents.d/sshd"
    MOSH_ENV="/run/holyclaude-ssh/mosh.env"
    SSH_AUTH_KEYS_DIR="/etc/ssh/authorized_keys"
    SSH_AUTH_KEYS_TARGET="$SSH_AUTH_KEYS_DIR/claude"
    SSHD_CONFIG="/etc/ssh/sshd_config_holyclaude"

    disable_sshd_service
    rm -f "$MOSH_ENV" 2>/dev/null || true

    if ! is_truthy "${HOLYCLAUDE_SSH_ENABLE:-false}"; then
        return 0
    fi

    if [ "$RUNNING_AS_ROOT" != "1" ]; then
        echo "[entrypoint] WARNING: HOLYCLAUDE_SSH_ENABLE requires root startup; SSH stays disabled"
        return 0
    fi

    SSH_AUTH_KEYS_SOURCE="${HOLYCLAUDE_SSH_AUTHORIZED_KEYS:-/run/holyclaude-ssh/authorized_keys}"
    case "$SSH_AUTH_KEYS_SOURCE" in
        /*) ;;
        *)
            echo "[entrypoint] WARNING: HOLYCLAUDE_SSH_AUTHORIZED_KEYS must be an absolute path; SSH stays disabled"
            return 0
            ;;
    esac

    if is_unsafe_ssh_state_path "$SSH_AUTH_KEYS_SOURCE"; then
        echo "[entrypoint] WARNING: refusing SSH authorized_keys from $SSH_AUTH_KEYS_SOURCE; use a separate read-only mount"
        return 0
    fi

    if [ ! -s "$SSH_AUTH_KEYS_SOURCE" ]; then
        echo "[entrypoint] WARNING: SSH enabled but $SSH_AUTH_KEYS_SOURCE is missing or empty; SSH stays disabled"
        return 0
    fi

    if ! is_read_only_mount_path "$SSH_AUTH_KEYS_SOURCE"; then
        echo "[entrypoint] WARNING: SSH authorized_keys source must be mounted read-only; SSH stays disabled"
        return 0
    fi

    if run_as_claude test -w "$SSH_AUTH_KEYS_SOURCE"; then
        echo "[entrypoint] WARNING: SSH authorized_keys source is writable by claude; mount it read-only outside .claude and /workspace"
        return 0
    fi

    SSH_KEYS_TMP="$(mktemp)"
    grep -Ev '^[[:space:]]*(#|$)' "$SSH_AUTH_KEYS_SOURCE" > "$SSH_KEYS_TMP" || true

    if [ ! -s "$SSH_KEYS_TMP" ]; then
        echo "[entrypoint] WARNING: SSH authorized_keys has no public keys; SSH stays disabled"
        rm -f "$SSH_KEYS_TMP"
        return 0
    fi

    if grep -q 'PRIVATE KEY' "$SSH_KEYS_TMP"; then
        echo "[entrypoint] WARNING: SSH authorized_keys appears to contain private key material; SSH stays disabled"
        rm -f "$SSH_KEYS_TMP"
        return 0
    fi

    if grep -Evq '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp(256|384|521)|sk-ssh-ed25519@openssh.com|sk-ecdsa-sha2-nistp256@openssh.com|ssh-ed25519-cert-v01@openssh.com|ssh-rsa-cert-v01@openssh.com|ecdsa-sha2-nistp(256|384|521)-cert-v01@openssh.com|sk-ssh-ed25519-cert-v01@openssh.com|sk-ecdsa-sha2-nistp256-cert-v01@openssh.com)[[:space:]]' "$SSH_KEYS_TMP"; then
        echo "[entrypoint] WARNING: SSH authorized_keys contains unsupported key lines; SSH stays disabled"
        rm -f "$SSH_KEYS_TMP"
        return 0
    fi

    SSH_HOST_KEYS_DIR="${HOLYCLAUDE_SSH_HOST_KEYS_DIR:-/var/lib/holyclaude-ssh/host_keys}"
    case "$SSH_HOST_KEYS_DIR" in
        /*) ;;
        *)
            echo "[entrypoint] WARNING: HOLYCLAUDE_SSH_HOST_KEYS_DIR must be an absolute path; SSH stays disabled"
            rm -f "$SSH_KEYS_TMP"
            return 0
            ;;
    esac

    if is_unsafe_ssh_state_path "$SSH_HOST_KEYS_DIR"; then
        echo "[entrypoint] WARNING: refusing SSH host keys under $SSH_HOST_KEYS_DIR; use a separate root-owned SSH state path"
        rm -f "$SSH_KEYS_TMP"
        return 0
    fi

    install -d -m 0755 -o root -g root "$SSH_AUTH_KEYS_DIR"
    install -m 0644 -o root -g root "$SSH_KEYS_TMP" "$SSH_AUTH_KEYS_TARGET"
    rm -f "$SSH_KEYS_TMP"

    install -d -m 0700 -o root -g root "$SSH_HOST_KEYS_DIR"
    if [ ! -s "$SSH_HOST_KEYS_DIR/ssh_host_ed25519_key" ]; then
        ssh-keygen -q -t ed25519 -N '' -f "$SSH_HOST_KEYS_DIR/ssh_host_ed25519_key"
    fi
    if [ ! -s "$SSH_HOST_KEYS_DIR/ssh_host_rsa_key" ]; then
        ssh-keygen -q -t rsa -b 3072 -N '' -f "$SSH_HOST_KEYS_DIR/ssh_host_rsa_key"
    fi
    chown root:root "$SSH_HOST_KEYS_DIR"/ssh_host_*_key "$SSH_HOST_KEYS_DIR"/ssh_host_*_key.pub 2>/dev/null || true
    chmod 0600 "$SSH_HOST_KEYS_DIR"/ssh_host_*_key 2>/dev/null || true
    chmod 0644 "$SSH_HOST_KEYS_DIR"/ssh_host_*_key.pub 2>/dev/null || true

    install -d -m 0755 -o root -g root /run/sshd /run/holyclaude-ssh

    cat > "$SSHD_CONFIG" <<EOF
Port 22
ListenAddress 0.0.0.0
Protocol 2
HostKey $SSH_HOST_KEYS_DIR/ssh_host_ed25519_key
HostKey $SSH_HOST_KEYS_DIR/ssh_host_rsa_key
PidFile /run/sshd.pid
AuthorizedKeysFile /etc/ssh/authorized_keys/%u
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
AllowUsers claude
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitTunnel no
GatewayPorts no
UsePAM yes
PrintMotd no
Subsystem sftp internal-sftp
EOF
    chmod 0644 "$SSHD_CONFIG"

    if is_truthy "${HOLYCLAUDE_MOSH_ENABLE:-false}"; then
        MOSH_START="${HOLYCLAUDE_MOSH_UDP_START:-60000}"
        MOSH_END="${HOLYCLAUDE_MOSH_UDP_END:-60010}"
        if ! is_valid_port "$MOSH_START" || ! is_valid_port "$MOSH_END" || [ "$MOSH_START" -gt "$MOSH_END" ]; then
            echo "[entrypoint] WARNING: invalid Mosh UDP range; Mosh stays disabled"
        else
            cat > "$MOSH_ENV" <<EOF
HOLYCLAUDE_MOSH_ENABLE=true
HOLYCLAUDE_MOSH_UDP_START=$MOSH_START
HOLYCLAUDE_MOSH_UDP_END=$MOSH_END
EOF
            chmod 0644 "$MOSH_ENV"
        fi
    fi

    touch "$SSHD_MARKER"
    echo "[entrypoint] SSH enabled: key-only login as claude on container port 22"
}

# ---------- UID/GID remapping ----------
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

if ! [[ "$PUID" =~ ^[0-9]+$ ]]; then
    echo "[entrypoint] WARNING: invalid PUID '$PUID' - using 1000"
    PUID=1000
fi

if ! [[ "$PGID" =~ ^[0-9]+$ ]]; then
    echo "[entrypoint] WARNING: invalid PGID '$PGID' - using 1000"
    PGID=1000
fi

CURRENT_UID=$(id -u "$CLAUDE_USER")
CURRENT_GID=$(id -g "$CLAUDE_USER")

if [ "$RUNNING_AS_ROOT" = "1" ]; then
    if [ "$PGID" != "$CURRENT_GID" ]; then
        echo "[entrypoint] Changing claude GID from $CURRENT_GID to $PGID"
        groupmod -o -g "$PGID" "$CLAUDE_USER"
    fi

    if [ "$PUID" != "$CURRENT_UID" ]; then
        echo "[entrypoint] Changing claude UID from $CURRENT_UID to $PUID"
        usermod -o -u "$PUID" "$CLAUDE_USER"
    fi
else
    echo "[entrypoint] Non-root startup detected; skipping UID/GID remap and root-only ownership repair"
    if [ "$(id -u)" != "$CURRENT_UID" ] || [ "$(id -g)" != "$CURRENT_GID" ]; then
        echo "[entrypoint] WARNING: running as $(id -u):$(id -g), but $CLAUDE_USER is $CURRENT_UID:$CURRENT_GID"
    fi
fi

# ---------- Fix home directory ownership ----------
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME"
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME/.claude" 2>/dev/null || true

# ---------- Ensure /workspace is writable ----------
# Docker creates missing bind-mount directories as root on the host.
# Fix the top-level workspace ownership here so the mapped claude user can write.
if ! mkdir -p "$WORKSPACE_DIR" 2>/dev/null; then
    echo "[entrypoint] WARNING: could not create $WORKSPACE_DIR; check your bind mount"
fi

if ! run_as_claude test -w "$WORKSPACE_DIR"; then
    echo "[entrypoint] /workspace is not writable for $CLAUDE_USER - attempting ownership fix"
    chown_if_root "$PUID:$PGID" "$WORKSPACE_DIR" 2>/dev/null || true
fi

if ! run_as_claude test -w "$WORKSPACE_DIR"; then
    echo "[entrypoint] WARNING: /workspace is still not writable; fix host ownership, PUID/PGID, or rootless Podman userns settings"
fi

# ---------- Repair bubblewrap setuid permissions ----------
BWRAP_BIN="/usr/bin/bwrap"
if [ -x "$BWRAP_BIN" ]; then
    bwrap_mode="$(stat -c "%a %u %g" "$BWRAP_BIN" 2>/dev/null || true)"
    if [ "$RUNNING_AS_ROOT" = "1" ] && [ "$bwrap_mode" != "4755 0 0" ]; then
        echo "[entrypoint] Repairing bubblewrap setuid permissions"
        chown root:root "$BWRAP_BIN" 2>/dev/null || true
        chmod 4755 "$BWRAP_BIN" 2>/dev/null || true
        bwrap_mode="$(stat -c "%a %u %g" "$BWRAP_BIN" 2>/dev/null || true)"
    elif [ "$RUNNING_AS_ROOT" != "1" ] && [ "$bwrap_mode" != "4755 0 0" ]; then
        echo "[entrypoint] Non-root startup cannot repair /usr/bin/bwrap setuid permissions"
    fi

    if [ "$bwrap_mode" != "4755 0 0" ]; then
        final_mode="${bwrap_mode:-missing}"
        echo "[entrypoint] WARNING: /usr/bin/bwrap mode is ${final_mode:-missing}, expected 4755 0 0; Codex sandbox may fail on restricted kernels"
    fi
else
    echo "[entrypoint] WARNING: /usr/bin/bwrap is missing or not executable; Codex sandbox may fail"
fi

# ---------- Codex CLI config symlink (every boot) ----------
mkdir -p "$CLAUDE_HOME/.claude/.codex"
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME/.claude/.codex"
[ -L "$CLAUDE_HOME/.codex" ] && [ ! -e "$CLAUDE_HOME/.codex" ] && rm -f "$CLAUDE_HOME/.codex"
if [ ! -e "$CLAUDE_HOME/.codex" ]; then
    ln -s "$CLAUDE_HOME/.claude/.codex" "$CLAUDE_HOME/.codex"
    chown_if_root -h "$PUID:$PGID" "$CLAUDE_HOME/.codex"
fi

# ---------- Gemini CLI config symlink (every boot) ----------
mkdir -p "$CLAUDE_HOME/.claude/.gemini"
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME/.claude/.gemini"
[ -L "$CLAUDE_HOME/.gemini" ] && [ ! -e "$CLAUDE_HOME/.gemini" ] && rm -f "$CLAUDE_HOME/.gemini"
if [ ! -e "$CLAUDE_HOME/.gemini" ]; then
    ln -s "$CLAUDE_HOME/.claude/.gemini" "$CLAUDE_HOME/.gemini"
    chown_if_root -h "$PUID:$PGID" "$CLAUDE_HOME/.gemini"
fi

# ---------- Cursor CLI config symlink (every boot) ----------
mkdir -p "$CLAUDE_HOME/.claude/.cursor"
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME/.claude/.cursor"
[ -L "$CLAUDE_HOME/.cursor" ] && [ ! -e "$CLAUDE_HOME/.cursor" ] && rm -f "$CLAUDE_HOME/.cursor"
if [ ! -e "$CLAUDE_HOME/.cursor" ]; then
    ln -s "$CLAUDE_HOME/.claude/.cursor" "$CLAUDE_HOME/.cursor"
    chown_if_root -h "$PUID:$PGID" "$CLAUDE_HOME/.cursor"
fi

# ---------- Persist ~/.claude.json (every boot) ----------
# Claude Code rewrites ~/.claude.json directly, so keep the durable copy inside
# the bind-mounted ~/.claude directory and restore it before bootstrap starts.
node /usr/local/bin/persist-claude-json.mjs

# ---------- Ensure DISPLAY is set ----------
export DISPLAY=:99

# ---------- First-boot bootstrap ----------
SENTINEL="$CLAUDE_HOME/.claude/.holyclaude-bootstrapped"
if [ ! -f "$SENTINEL" ]; then
    echo "[entrypoint] First boot detected - running bootstrap.sh"
    if ! /usr/local/bin/bootstrap.sh; then
        echo "[entrypoint] WARNING: bootstrap.sh failed - continuing anyway"
    fi
fi

# ---------- Optional Desloppify global skill setup ----------
desloppify_add_target() {
    case " $DESLOPPIFY_TARGETS " in
        *" $1 "*) ;;
        *) DESLOPPIFY_TARGETS="${DESLOPPIFY_TARGETS} $1" ;;
    esac
}

DESLOPPIFY_SETUP="${HOLYCLAUDE_DESLOPPIFY_SETUP:-off}"
DESLOPPIFY_SETUP="$(printf '%s' "$DESLOPPIFY_SETUP" | tr '[:upper:]' '[:lower:]')"

if [ -n "$DESLOPPIFY_SETUP" ] && [ "$DESLOPPIFY_SETUP" != "off" ]; then
    DESLOPPIFY_TARGETS=""
    DESLOPPIFY_HAS_CLAUDE=0
    DESLOPPIFY_HAS_OPENCODE=0

    IFS=',' read -ra DESLOPPIFY_REQUESTED_TARGETS <<< "$DESLOPPIFY_SETUP"
    for raw_target in "${DESLOPPIFY_REQUESTED_TARGETS[@]}"; do
        target="$(printf '%s' "$raw_target" | tr -d '[:space:]')"
        case "$target" in
            "")
                ;;
            all)
                desloppify_add_target claude
                desloppify_add_target codex
                desloppify_add_target gemini
                DESLOPPIFY_HAS_CLAUDE=1
                ;;
            claude|codex|gemini)
                desloppify_add_target "$target"
                [ "$target" = "claude" ] && DESLOPPIFY_HAS_CLAUDE=1
                ;;
            opencode)
                DESLOPPIFY_HAS_OPENCODE=1
                ;;
            *)
                echo "[entrypoint] WARNING: invalid HOLYCLAUDE_DESLOPPIFY_SETUP target '$target' - skipping"
                ;;
        esac
    done

    if [ "$DESLOPPIFY_HAS_OPENCODE" = "1" ]; then
        VARIANT="full"
        [ -f /etc/holyclaude-variant ] && VARIANT="$(cat /etc/holyclaude-variant)"
        if [ "$VARIANT" != "full" ]; then
            echo "[entrypoint] WARNING: Desloppify OpenCode setup is full-image only - skipping opencode"
        elif [ "$DESLOPPIFY_HAS_CLAUDE" = "1" ]; then
            echo "[entrypoint] WARNING: Desloppify opencode setup conflicts with claude setup - skipping opencode"
        elif [ -n "${OPENCODE_CONFIG_DIR:-}" ]; then
            echo "[entrypoint] WARNING: OPENCODE_CONFIG_DIR is set; Desloppify opencode setup uses ~/.config/opencode - skipping opencode"
        elif ! command -v opencode >/dev/null 2>&1; then
            echo "[entrypoint] WARNING: opencode command is unavailable - skipping Desloppify opencode setup"
        else
            mkdir -p "$CLAUDE_HOME/.config/opencode"
            chown_if_root -R "$PUID:$PGID" "$CLAUDE_HOME/.config"
            desloppify_add_target opencode
        fi
    fi

    for target in $DESLOPPIFY_TARGETS; do
        if ! run_as_claude_env desloppify setup --interface "$target"; then
            echo "[entrypoint] WARNING: Desloppify setup failed for '$target' - continuing"
        fi
    done
fi

# ---------- Optional SSH/Mosh remote shell ----------
configure_remote_shell

# ---------- Hand off to s6-overlay ----------
echo "[entrypoint] Starting s6-overlay..."
exec /init "$@"
