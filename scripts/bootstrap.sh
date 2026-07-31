#!/bin/bash
set -e

# ==============================================================================
# HolyClaude - First-Boot Bootstrap
# Runs once on first container start, then creates a sentinel to skip next time.
# Delete ~/.claude/.holyclaude-bootstrapped to re-trigger.
# ==============================================================================

CLAUDE_HOME="/home/claude"
CLAUDE_USER="claude"
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
SOURCE_DIR="/usr/local/share/holyclaude"
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

chown_if_root() {
    if [ "$RUNNING_AS_ROOT" = "1" ]; then
        chown "$@"
    fi
}

echo "[bootstrap] Running first-boot initialization..."

# ---------- Create directory structure ----------
mkdir -p "$CLAUDE_HOME/.claude"

# ---------- Copy settings.json ----------
[ -f "$CLAUDE_HOME/.claude/settings.json" ] && cp "$CLAUDE_HOME/.claude/settings.json" "$CLAUDE_HOME/.claude/settings.json.bak"
cp "$SOURCE_DIR/settings.json" "$CLAUDE_HOME/.claude/settings.json"
echo "[bootstrap] Copied settings.json"

# ---------- Copy memory template (variant-aware) ----------
VARIANT="full"
if [ -f /etc/holyclaude-variant ]; then
    VARIANT=$(cat /etc/holyclaude-variant)
fi
[ -f "$CLAUDE_HOME/.claude/CLAUDE.md" ] && cp "$CLAUDE_HOME/.claude/CLAUDE.md" "$CLAUDE_HOME/.claude/CLAUDE.md.bak"
cp "$SOURCE_DIR/claude-memory-${VARIANT}.md" "$CLAUDE_HOME/.claude/CLAUDE.md"
echo "[bootstrap] Copied CLAUDE.md (${VARIANT} variant)"

# ---------- Codex CLI default configuration ----------
if [ ! -f "$CLAUDE_HOME/.codex/config.toml" ]; then
    CODEX_CLI_APPROVAL_POLICY="on-request"
    CODEX_CLI_SANDBOX_MODE="workspace-write"
    CODEX_CLI_CONFIG_LABEL="on-request approval, workspace-write sandbox"

    case "${HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE:-default}" in
        ""|default)
            ;;
        acceptEdits)
            CODEX_CLI_APPROVAL_POLICY="never"
            CODEX_CLI_CONFIG_LABEL="never approval, workspace-write sandbox"
            ;;
        bypassPermissions)
            CODEX_CLI_APPROVAL_POLICY="never"
            CODEX_CLI_SANDBOX_MODE="danger-full-access"
            CODEX_CLI_CONFIG_LABEL="never approval, danger-full-access sandbox"
            ;;
        *)
            echo "[bootstrap] Warning: invalid HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE; using default Codex CLI config"
            ;;
    esac

    cat > "$CLAUDE_HOME/.codex/config.toml" <<TOML
approval_policy = "$CODEX_CLI_APPROVAL_POLICY"
sandbox_mode = "$CODEX_CLI_SANDBOX_MODE"

[features]
codex_hooks = true
TOML
    echo "[bootstrap] Created Codex CLI config ($CODEX_CLI_CONFIG_LABEL, hooks enabled)"
elif ! grep -q '^\[features\]' "$CLAUDE_HOME/.codex/config.toml"; then
    printf '\n[features]\ncodex_hooks = true\n' >> "$CLAUDE_HOME/.codex/config.toml"
    echo "[bootstrap] Added [features] section to existing Codex config"
fi

# ---------- Codex CLI notification hook ----------
if [ ! -f "$CLAUDE_HOME/.codex/hooks.json" ]; then
    cat > "$CLAUDE_HOME/.codex/hooks.json" <<'JSON'
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/usr/local/bin/notify.py stop",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
JSON
    echo "[bootstrap] Created Codex CLI notification hook"
fi

# ---------- Gemini CLI notification hook ----------
if [ ! -f "$CLAUDE_HOME/.gemini/settings.json" ]; then
    cat > "$CLAUDE_HOME/.gemini/settings.json" <<'JSON'
{
  "hooks": {
    "SessionEnd": [
      {
        "matcher": "*",
        "hooks": [
          {
            "name": "notify",
            "type": "command",
            "command": "/usr/local/bin/notify.py stop",
            "timeout": 30000
          }
        ]
      }
    ]
  }
}
JSON
    echo "[bootstrap] Created Gemini CLI notification hook"
fi

# ---------- Cursor CLI hooks (pre-configured for future CLI support) ----------
if [ ! -f "$CLAUDE_HOME/.cursor/hooks.json" ]; then
    cat > "$CLAUDE_HOME/.cursor/hooks.json" <<'JSON'
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "type": "command",
        "command": "/usr/local/bin/notify.py stop",
        "timeout": 30
      }
    ]
  }
}
JSON
    echo "[bootstrap] Created Cursor CLI hooks (pre-configured)"
fi

# ---------- Fix ownership ----------
chown_if_root -R "$PUID:$PGID" "$CLAUDE_HOME/.claude" 2>/dev/null || true
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME/.claude.json" 2>/dev/null || true

# ---------- Create sentinel ----------
touch "$CLAUDE_HOME/.claude/.holyclaude-bootstrapped"
chown_if_root "$PUID:$PGID" "$CLAUDE_HOME/.claude/.holyclaude-bootstrapped" 2>/dev/null || true

echo "[bootstrap] First-boot initialization complete."
