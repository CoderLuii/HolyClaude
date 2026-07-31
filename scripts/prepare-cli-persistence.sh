#!/usr/bin/env bash
set -Eeuo pipefail

CLAUDE_HOME="${CLAUDE_HOME:-/home/claude}"
CLAUDE_USER="${CLAUDE_USER:-claude}"
PUID="${PUID:-1000}"
PGID="${PGID:-1000}"
DURABLE_ROOT="$CLAUDE_HOME/.claude"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURE_HELPER="${CLI_PERSISTENCE_SECURE_HELPER:-$SCRIPT_DIR/secure-cli-persistence.py}"

RUNNING_AS_ROOT=0
if [ "$(id -u)" = "0" ]; then
    RUNNING_AS_ROOT=1
fi

run_as_claude() {
    if [ "$RUNNING_AS_ROOT" = "1" ]; then
        runuser -u "$CLAUDE_USER" -- env HOME="$CLAUDE_HOME" "$@"
    else
        env HOME="$CLAUDE_HOME" "$@"
    fi
}

fail() {
    echo "[cli-persistence] ERROR: $*" >&2
    exit 1
}

ensure_parent() {
    local path="$1"
    local parent
    parent="$(dirname "$path")"
    ensure_managed_directory "$parent"
}

validate_managed_directory_chain() {
    local directory="$1"
    local create_missing="${2:-0}"
    local relative current component

    case "$directory" in
        "$CLAUDE_HOME"|"$CLAUDE_HOME"/*) ;;
        *) fail "managed directory escapes Claude home: $directory" ;;
    esac
    if [ -L "$CLAUDE_HOME" ] || [ ! -d "$CLAUDE_HOME" ]; then
        fail "Claude home must be a real directory: $CLAUDE_HOME"
    fi

    relative="${directory#"$CLAUDE_HOME"}"
    relative="${relative#/}"
    current="$CLAUDE_HOME"
    while [ -n "$relative" ]; do
        component="${relative%%/*}"
        if [ "$component" = "." ] || [ "$component" = ".." ] || [ -z "$component" ]; then
            fail "managed directory contains an unsafe path component: $directory"
        fi
        current="$current/$component"
        if [ -L "$current" ]; then
            fail "managed parent must not be a symbolic link: $current"
        fi
        if [ -e "$current" ]; then
            [ -d "$current" ] || fail "managed parent must be a directory: $current"
        elif [ "$create_missing" = "1" ]; then
            run_as_claude mkdir "$current" || fail "could not create parent directory: $current"
            [ ! -L "$current" ] && [ -d "$current" ] ||
                fail "managed parent changed while it was created: $current"
        fi
        if [ "$relative" = "$component" ]; then
            relative=""
        else
            relative="${relative#*/}"
        fi
    done
}

validate_parent_chain() {
    validate_managed_directory_chain "$(dirname "$1")" 0
}

ensure_managed_directory() {
    local directory="$1"
    validate_managed_directory_chain "$directory" 1
    [ ! -L "$directory" ] && [ -d "$directory" ] ||
        fail "managed parent changed before ownership repair: $directory"
    if [ "$RUNNING_AS_ROOT" = "1" ] && [ "$directory" != "$CLAUDE_HOME" ]; then
        python3 "$SECURE_HELPER" \
            --home "$CLAUDE_HOME" \
            --target "$directory" \
            --kind directory \
            --uid "$PUID" \
            --gid "$PGID" \
            --chown \
            --owner-only || fail "could not set ownership on: $directory"
    fi
}

normalize_path() {
    local path="$1"
    while [ "$path" != "/" ] && [ "${path%/}" != "$path" ]; do
        path="${path%/}"
    done
    printf '%s\n' "$path"
}

validate_path_kind() {
    local path="$1"
    local kind="$2"
    local description="$3"

    if [ "$kind" = "file" ]; then
        [ -f "$path" ] || fail "$description must be a regular file: $path"
        [ "$(stat -c %h -- "$path")" = "1" ] ||
            fail "$description must not have multiple hard links: $path"
    else
        [ -d "$path" ] || fail "$description must be a directory: $path"
        local hardlinked_file
        hardlinked_file="$(find "$path" -xdev -type f -links +1 -print -quit)"
        [ -z "$hardlinked_file" ] ||
            fail "$description contains a hard-linked file: $hardlinked_file"
    fi
}

preflight_path() {
    local live="$1"
    local target="$2"
    local kind="$3"
    local label="$4"
    local link_target

    validate_parent_chain "$live"
    validate_parent_chain "$target"

    if [ -L "$target" ]; then
        fail "durable target must not be a symbolic link: $target"
    fi
    if [ -e "$target" ]; then
        validate_path_kind "$target" "$kind" "durable $label state"
    fi

    if [ -L "$live" ]; then
        link_target="$(readlink "$live")"
        if [ "$link_target" = "$target" ]; then
            return
        fi
        if [ -e "$live" ]; then
            return
        fi
        fail "unexpected dangling symbolic link for $label: $live -> $link_target"
    fi

    if [ -e "$live" ]; then
        validate_path_kind "$live" "$kind" "live $label state"
        if [ -e "$target" ] || [ -L "$target" ]; then
            fail "both live and durable $label state exist; resolve one before restarting: $live and $target"
        fi
    fi
}

ensure_target() {
    local target="$1"
    local kind="$2"

    if [ -L "$target" ]; then
        fail "durable target must not be a symbolic link: $target"
    fi

    ensure_parent "$target"
    if [ "$kind" = "file" ]; then
        if [ -e "$target" ] && [ ! -f "$target" ]; then
            fail "durable target must be a regular file: $target"
        fi
        if [ ! -e "$target" ]; then
            run_as_claude sh -c 'set -C; : > "$1"' sh "$target" 2>/dev/null ||
                fail "could not create durable file without replacing another path: $target"
        fi
    else
        if [ -e "$target" ] && [ ! -d "$target" ]; then
            fail "durable target must be a directory: $target"
        fi
        if [ ! -e "$target" ]; then
            run_as_claude mkdir "$target" || fail "could not create durable directory: $target"
        fi
    fi
}

secure_target() {
    local target="$1"
    local kind="$2"
    local sensitive_file="${3:-}"
    local arguments=(
        --home "$CLAUDE_HOME"
        --target "$target"
        --kind "$kind"
        --uid "$PUID"
        --gid "$PGID"
    )
    if [ "$RUNNING_AS_ROOT" = "1" ]; then
        arguments+=(--chown)
    fi
    if [ -n "$sensitive_file" ]; then
        arguments+=(--sensitive-file "$sensitive_file")
    fi
    python3 "$SECURE_HELPER" "${arguments[@]}" ||
        fail "could not securely repair durable state: $target"
}

PATH_MANAGED=0
prepare_path() {
    local live="$1"
    local target="$2"
    local kind="$3"
    local label="$4"
    local sensitive_file="${5:-}"
    local link_target

    PATH_MANAGED=0
    ensure_parent "$live"

    if [ -L "$live" ]; then
        link_target="$(readlink "$live")"
        if [ "$link_target" = "$target" ]; then
            ensure_target "$target" "$kind"
            secure_target "$target" "$kind" "$sensitive_file"
            PATH_MANAGED=1
            return
        fi
        if [ -e "$live" ]; then
            echo "[cli-persistence] WARNING: leaving user-managed $label link unchanged: $live -> $link_target"
            return
        fi
        fail "unexpected dangling symbolic link for $label: $live -> $link_target"
    fi

    if [ -e "$live" ]; then
        ensure_parent "$target"
        run_as_claude mv -T -n -- "$live" "$target" ||
            fail "could not migrate $label state from $live to $target"
        if [ -e "$live" ] || [ -L "$live" ]; then
            fail "durable $label target changed during migration; both paths remain: $live and $target"
        fi
    else
        ensure_target "$target" "$kind"
    fi

    run_as_claude ln -s "$target" "$live" || fail "could not link $label state: $live -> $target"
    secure_target "$target" "$kind" "$sensitive_file"
    PATH_MANAGED=1
}

verify_directory_writable() {
    local path="$1"
    if ! run_as_claude sh -c '
        set -eu
        probe="$1/.holyclaude-write-test.$$"
        trap '\''rm -f "$probe"'\'' EXIT HUP INT TERM
        : > "$probe"
        rm -f "$probe"
        trap - EXIT HUP INT TERM
    ' sh "$path"; then
        fail "durable CLI state is not writable by runtime user $CLAUDE_USER: $path"
    fi
}

MANAGE_GIT_GLOBAL=1
MANAGE_XDG_GIT=1
MANAGE_GH=1
DEFAULT_XDG="$(normalize_path "$CLAUDE_HOME/.config")"
CONFIGURED_XDG="$(normalize_path "${XDG_CONFIG_HOME:-$DEFAULT_XDG}")"

if [ -n "${GIT_CONFIG_GLOBAL:-}" ]; then
    MANAGE_GIT_GLOBAL=0
    MANAGE_XDG_GIT=0
    echo "[cli-persistence] GIT_CONFIG_GLOBAL is set; Git persistence remains caller-managed"
fi
if [ -n "${XDG_CONFIG_HOME:-}" ] && [ "$CONFIGURED_XDG" != "$DEFAULT_XDG" ]; then
    MANAGE_XDG_GIT=0
    MANAGE_GH=0
    echo "[cli-persistence] XDG_CONFIG_HOME is custom; XDG Git and GitHub CLI persistence remains caller-managed"
elif [ -n "${GH_CONFIG_DIR:-}" ]; then
    MANAGE_GH=0
    echo "[cli-persistence] GH_CONFIG_DIR is set; GitHub CLI persistence remains caller-managed"
fi

if [ "$MANAGE_GIT_GLOBAL" = "1" ]; then
    preflight_path \
        "$CLAUDE_HOME/.gitconfig" \
        "$DURABLE_ROOT/.gitconfig" \
        file \
        "Git global configuration"
fi
if [ "$MANAGE_XDG_GIT" = "1" ]; then
    preflight_path \
        "$DEFAULT_XDG/git" \
        "$DURABLE_ROOT/.config/git" \
        directory \
        "XDG Git configuration"
fi
if [ "$MANAGE_GH" = "1" ]; then
    preflight_path \
        "$DEFAULT_XDG/gh" \
        "$DURABLE_ROOT/.config/gh" \
        directory \
        "GitHub CLI configuration"
fi

ensure_managed_directory "$DURABLE_ROOT"

GIT_MANAGED=0
XDG_GIT_MANAGED=0
if [ "$MANAGE_GIT_GLOBAL" = "1" ]; then
    prepare_path \
        "$CLAUDE_HOME/.gitconfig" \
        "$DURABLE_ROOT/.gitconfig" \
        file \
        "Git global configuration"
    GIT_MANAGED="$PATH_MANAGED"
fi
if [ "$MANAGE_XDG_GIT" = "1" ]; then
    prepare_path \
        "$DEFAULT_XDG/git" \
        "$DURABLE_ROOT/.config/git" \
        directory \
        "XDG Git configuration" \
        config
    XDG_GIT_MANAGED="$PATH_MANAGED"
fi
if [ "$MANAGE_GH" = "1" ]; then
    prepare_path \
        "$DEFAULT_XDG/gh" \
        "$DURABLE_ROOT/.config/gh" \
        directory \
        "GitHub CLI configuration" \
        hosts.yml
    if [ "$PATH_MANAGED" = "1" ]; then
        verify_directory_writable "$DEFAULT_XDG/gh"
    fi
fi

if [ "$GIT_MANAGED" = "1" ]; then
    if ! run_as_claude test -w "$CLAUDE_HOME/.gitconfig"; then
        fail "durable Git configuration is not writable by runtime user $CLAUDE_USER: $CLAUDE_HOME/.gitconfig"
    fi

    if ! run_as_claude git config --global --get user.name >/dev/null 2>&1; then
        run_as_claude git config --global user.name "${GIT_USER_NAME:-HolyClaude User}"
    fi
    if ! run_as_claude git config --global --get user.email >/dev/null 2>&1; then
        run_as_claude git config --global user.email "${GIT_USER_EMAIL:-noreply@holyclaude.local}"
    fi
    if ! run_as_claude git config --global --get-all safe.directory 2>/dev/null | grep -Fxq -- /workspace; then
        run_as_claude git config --global --add safe.directory /workspace
    fi
    secure_target "$DURABLE_ROOT/.gitconfig" file
    echo "[cli-persistence] Git global configuration is durable"
fi
