#!/bin/bash
set -e

# ==============================================================================
# HolyClaude — Container Entrypoint
# Handles: UID/GID remapping, first-boot bootstrap, s6-overlay handoff
# ==============================================================================

CLAUDE_USER="claude"
CLAUDE_HOME="/home/claude"
WORKSPACE_DIR="/workspace"

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

if [ "$PGID" != "$CURRENT_GID" ]; then
    echo "[entrypoint] Changing claude GID from $CURRENT_GID to $PGID"
    groupmod -o -g "$PGID" claude
fi

if [ "$PUID" != "$CURRENT_UID" ]; then
    echo "[entrypoint] Changing claude UID from $CURRENT_UID to $PUID"
    usermod -o -u "$PUID" claude
fi

# ---------- Fix home directory ownership ----------
chown "$PUID:$PGID" "$CLAUDE_HOME"
chown "$PUID:$PGID" "$CLAUDE_HOME/.claude" 2>/dev/null || true

# ---------- Ensure /workspace is writable ----------
# Docker creates missing bind-mount directories as root on the host.
# Fix the top-level workspace ownership here so the mapped claude user can write.
mkdir -p "$WORKSPACE_DIR"
if ! runuser -u "$CLAUDE_USER" -- test -w "$WORKSPACE_DIR"; then
    echo "[entrypoint] /workspace is not writable for $CLAUDE_USER — attempting ownership fix"
    chown "$PUID:$PGID" "$WORKSPACE_DIR" 2>/dev/null || true
fi

if ! runuser -u "$CLAUDE_USER" -- test -w "$WORKSPACE_DIR"; then
    echo "[entrypoint] WARNING: /workspace is still not writable; fix host ownership or PUID/PGID"
fi

# ---------- Repair bubblewrap setuid permissions ----------
BWRAP_BIN="/usr/bin/bwrap"
if [ -x "$BWRAP_BIN" ]; then
    bwrap_mode="$(stat -c "%a %u %g" "$BWRAP_BIN" 2>/dev/null || true)"
    if [ "$bwrap_mode" != "4755 0 0" ]; then
        echo "[entrypoint] Repairing bubblewrap setuid permissions"
        chown root:root "$BWRAP_BIN" 2>/dev/null || true
        chmod 4755 "$BWRAP_BIN" 2>/dev/null || true
        bwrap_mode="$(stat -c "%a %u %g" "$BWRAP_BIN" 2>/dev/null || true)"
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
chown "$PUID:$PGID" "$CLAUDE_HOME/.claude/.codex"
[ -L "$CLAUDE_HOME/.codex" ] && [ ! -e "$CLAUDE_HOME/.codex" ] && rm -f "$CLAUDE_HOME/.codex"
if [ ! -e "$CLAUDE_HOME/.codex" ]; then
    ln -s "$CLAUDE_HOME/.claude/.codex" "$CLAUDE_HOME/.codex"
    chown -h "$PUID:$PGID" "$CLAUDE_HOME/.codex"
fi

# ---------- Gemini CLI config symlink (every boot) ----------
mkdir -p "$CLAUDE_HOME/.claude/.gemini"
chown "$PUID:$PGID" "$CLAUDE_HOME/.claude/.gemini"
[ -L "$CLAUDE_HOME/.gemini" ] && [ ! -e "$CLAUDE_HOME/.gemini" ] && rm -f "$CLAUDE_HOME/.gemini"
if [ ! -e "$CLAUDE_HOME/.gemini" ]; then
    ln -s "$CLAUDE_HOME/.claude/.gemini" "$CLAUDE_HOME/.gemini"
    chown -h "$PUID:$PGID" "$CLAUDE_HOME/.gemini"
fi

# ---------- Cursor CLI config symlink (every boot) ----------
mkdir -p "$CLAUDE_HOME/.claude/.cursor"
chown "$PUID:$PGID" "$CLAUDE_HOME/.claude/.cursor"
[ -L "$CLAUDE_HOME/.cursor" ] && [ ! -e "$CLAUDE_HOME/.cursor" ] && rm -f "$CLAUDE_HOME/.cursor"
if [ ! -e "$CLAUDE_HOME/.cursor" ]; then
    ln -s "$CLAUDE_HOME/.claude/.cursor" "$CLAUDE_HOME/.cursor"
    chown -h "$PUID:$PGID" "$CLAUDE_HOME/.cursor"
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
    echo "[entrypoint] First boot detected — running bootstrap.sh"
    if ! /usr/local/bin/bootstrap.sh; then
        echo "[entrypoint] WARNING: bootstrap.sh failed — continuing anyway"
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
                echo "[entrypoint] WARNING: invalid HOLYCLAUDE_DESLOPPIFY_SETUP target '$target' — skipping"
                ;;
        esac
    done

    if [ "$DESLOPPIFY_HAS_OPENCODE" = "1" ]; then
        VARIANT="full"
        [ -f /etc/holyclaude-variant ] && VARIANT="$(cat /etc/holyclaude-variant)"
        if [ "$VARIANT" != "full" ]; then
            echo "[entrypoint] WARNING: Desloppify OpenCode setup is full-image only — skipping opencode"
        elif [ "$DESLOPPIFY_HAS_CLAUDE" = "1" ]; then
            echo "[entrypoint] WARNING: Desloppify opencode setup conflicts with claude setup — skipping opencode"
        elif [ -n "${OPENCODE_CONFIG_DIR:-}" ]; then
            echo "[entrypoint] WARNING: OPENCODE_CONFIG_DIR is set; Desloppify opencode setup uses ~/.config/opencode — skipping opencode"
        elif ! command -v opencode >/dev/null 2>&1; then
            echo "[entrypoint] WARNING: opencode command is unavailable — skipping Desloppify opencode setup"
        else
            mkdir -p "$CLAUDE_HOME/.config/opencode"
            chown -R "$PUID:$PGID" "$CLAUDE_HOME/.config"
            desloppify_add_target opencode
        fi
    fi

    for target in $DESLOPPIFY_TARGETS; do
        if ! runuser -u "$CLAUDE_USER" -- env HOME="$CLAUDE_HOME" desloppify setup --interface "$target"; then
            echo "[entrypoint] WARNING: Desloppify setup failed for '$target' — continuing"
        fi
    done
fi

# ---------- Background: persist ~/.claude.json every 60s ----------
(persist_warning_shown=0
while true; do
    sleep 60
    if node /usr/local/bin/persist-claude-json.mjs --save-live --quiet; then
        persist_warning_shown=0
    elif [ "$persist_warning_shown" = "0" ]; then
        echo "[entrypoint] WARNING: could not persist Claude session state; check host mount permissions"
        persist_warning_shown=1
    fi
done) &

# ---------- Hand off to s6-overlay ----------
echo "[entrypoint] Starting s6-overlay..."
exec /init "$@"
