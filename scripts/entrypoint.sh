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
# Claude Code overwrites symlinks, so we use copy-on-boot/copy-on-start.
# On restart (file exists): save current to bind mount, then use it
# On recreation (file gone): restore from bind mount
# On first boot (neither exists): create default
if [ -f "$CLAUDE_HOME/.claude.json" ]; then
    cp "$CLAUDE_HOME/.claude.json" "$CLAUDE_HOME/.claude/.claude.json.persist"
elif [ -f "$CLAUDE_HOME/.claude/.claude.json.persist" ]; then
    cp "$CLAUDE_HOME/.claude/.claude.json.persist" "$CLAUDE_HOME/.claude.json"
    chown "$PUID:$PGID" "$CLAUDE_HOME/.claude.json"
else
    echo '{"hasCompletedOnboarding":true,"installMethod":"native"}' > "$CLAUDE_HOME/.claude.json"
    chown "$PUID:$PGID" "$CLAUDE_HOME/.claude.json"
fi

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

# ---------- Claude Code auto-update (every boot, best-effort) ----------
# The image bakes in whatever Claude Code was current at build time. To pick up
# new releases without rebuilding the image, run `claude update` on each boot.
# Set CLAUDE_AUTO_UPDATE=false to skip (e.g. air-gapped or pinned environments).
if [ "${CLAUDE_AUTO_UPDATE:-true}" = "true" ]; then
    echo "[entrypoint] Checking for Claude Code updates..."
    if runuser -u "$CLAUDE_USER" -- bash -lc 'claude update' 2>&1 | sed 's/^/[claude-update] /'; then
        :
    else
        echo "[entrypoint] WARNING: claude update failed — continuing with installed version"
    fi
fi

# ---------- Background: persist ~/.claude.json every 60s ----------
(while true; do
    sleep 60
    [ -f "$CLAUDE_HOME/.claude.json" ] && cp "$CLAUDE_HOME/.claude.json" "$CLAUDE_HOME/.claude/.claude.json.persist" 2>/dev/null
done) &

# ---------- Hand off to s6-overlay ----------
echo "[entrypoint] Starting s6-overlay..."
exec /init "$@"
