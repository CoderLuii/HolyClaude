#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/prepare-cli-persistence.sh"
SECURE_HELPER="$REPO_ROOT/scripts/secure-cli-persistence.py"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

unset GIT_DIR GIT_WORK_TREE
cd "$TMP_DIR"

assert_link() {
  local path="$1"
  local target="$2"
  test -L "$path"
  test "$(readlink "$path")" = "$target"
}

run_prepare() {
  local home="$1"
  shift
  env \
    CLAUDE_HOME="$home" \
    CLAUDE_USER="$(id -un)" \
    PUID="$(id -u)" \
    PGID="$(id -g)" \
    GIT_USER_NAME="Initial User" \
    GIT_USER_EMAIL="initial@example.invalid" \
    "$@" \
    bash "$SCRIPT"
}

# Fresh state is linked into the durable .claude tree and initialized once.
fresh_home="$TMP_DIR/fresh"
mkdir -p "$fresh_home/.claude"
run_prepare "$fresh_home"
assert_link "$fresh_home/.gitconfig" "$fresh_home/.claude/.gitconfig"
assert_link "$fresh_home/.config/git" "$fresh_home/.claude/.config/git"
assert_link "$fresh_home/.config/gh" "$fresh_home/.claude/.config/gh"
test "$(HOME="$fresh_home" git config --global user.name)" = "Initial User"
test "$(HOME="$fresh_home" git config --global user.email)" = "initial@example.invalid"
test "$(HOME="$fresh_home" git config --global --get-all safe.directory | grep -Fxc /workspace)" = 1
test -z "$(HOME="$fresh_home" git config --global --get-all include.path 2>/dev/null || true)"

# Later boots preserve manual Git and GitHub CLI state without duplicating values.
HOME="$fresh_home" git config --global user.name "Manual User"
HOME="$fresh_home" git config --global alias.audit status
printf '[alias]\n\txdg-audit = status\n[credential]\n\thelper = test-helper\n' \
  > "$fresh_home/.config/git/config"
printf '#!/bin/sh\nexit 0\n' > "$fresh_home/.config/git/credential-helper"
chmod 0755 "$fresh_home/.config/git/credential-helper"
printf 'github.com:\n    user: test-user\n    oauth_token: synthetic-not-a-secret\n' > "$fresh_home/.config/gh/hosts.yml"
env \
  CLAUDE_HOME="$fresh_home" \
  CLAUDE_USER="$(id -un)" \
  PUID="$(id -u)" \
  PGID="$(id -g)" \
  GIT_USER_NAME="Changed Environment" \
  GIT_USER_EMAIL="changed@example.invalid" \
  bash "$SCRIPT"
test "$(HOME="$fresh_home" git config --global user.name)" = "Manual User"
test "$(HOME="$fresh_home" git config --global user.email)" = "initial@example.invalid"
test "$(HOME="$fresh_home" git config --global alias.audit)" = status
test "$(HOME="$fresh_home" git config alias.xdg-audit)" = status
test "$(HOME="$fresh_home" git config --global --get-all safe.directory | grep -Fxc /workspace)" = 1
test "$(HOME="$fresh_home" git config --get-all credential.helper | grep -Fxc test-helper)" = 1
grep -Fq 'test-helper' "$fresh_home/.config/git/config"
grep -Fq 'synthetic-not-a-secret' "$fresh_home/.config/gh/hosts.yml"
test "$(stat -c %a "$fresh_home/.config/git/credential-helper")" = 755

# Managed parent directories must never redirect writes or ownership repairs.
parent_link_home="$TMP_DIR/parent-link"
parent_link_external="$TMP_DIR/parent-link-external"
mkdir -p "$parent_link_home/.claude" "$parent_link_external"
ln -s "$parent_link_external" "$parent_link_home/.claude/.config"
if run_prepare "$parent_link_home" >"$TMP_DIR/parent-link.log" 2>&1; then
  echo "expected a symlinked durable parent to fail" >&2
  exit 1
fi
test ! -e "$parent_link_external/git"
test ! -e "$parent_link_external/gh"
grep -Fq 'managed parent must not be a symbolic link' "$TMP_DIR/parent-link.log"

# Ownership and mode repair must not mutate another inode through a hard link.
hardlink_home="$TMP_DIR/hardlink"
mkdir -p "$hardlink_home/.claude"
printf 'external-hardlink-state\n' > "$hardlink_home/external.gitconfig"
chmod 0644 "$hardlink_home/external.gitconfig"
ln "$hardlink_home/external.gitconfig" "$hardlink_home/.claude/.gitconfig"
if run_prepare "$hardlink_home" >"$TMP_DIR/hardlink.log" 2>&1; then
  echo "expected a hard-linked durable file to fail" >&2
  exit 1
fi
test "$(cat "$hardlink_home/external.gitconfig")" = "external-hardlink-state"
test "$(stat -c %a "$hardlink_home/external.gitconfig")" = 644
grep -Fq 'must not have multiple hard links' "$TMP_DIR/hardlink.log"

hardlink_nested_home="$TMP_DIR/hardlink-nested"
mkdir -p "$hardlink_nested_home/.claude/.config/gh"
printf 'external-gh-state\n' > "$hardlink_nested_home/external-hosts.yml"
chmod 0644 "$hardlink_nested_home/external-hosts.yml"
ln "$hardlink_nested_home/external-hosts.yml" "$hardlink_nested_home/.claude/.config/gh/hosts.yml"
if run_prepare "$hardlink_nested_home" >"$TMP_DIR/hardlink-nested.log" 2>&1; then
  echo "expected a hard-linked file below durable state to fail" >&2
  exit 1
fi
test "$(cat "$hardlink_nested_home/external-hosts.yml")" = "external-gh-state"
test "$(stat -c %a "$hardlink_nested_home/external-hosts.yml")" = 644
grep -Fq 'contains a hard-linked file' "$TMP_DIR/hardlink-nested.log"

# Descriptor-based mode repair must reject symlink substitution at its final path.
helper_link_home="$TMP_DIR/helper-link"
mkdir -p "$helper_link_home/.claude"
printf 'external-helper-state\n' > "$helper_link_home/external.gitconfig"
chmod 0644 "$helper_link_home/external.gitconfig"
ln -s "$helper_link_home/external.gitconfig" "$helper_link_home/.claude/.gitconfig"
if python3 "$SECURE_HELPER" \
  --home "$helper_link_home" \
  --target "$helper_link_home/.claude/.gitconfig" \
  --kind file \
  --uid "$(id -u)" \
  --gid "$(id -g)" >"$TMP_DIR/helper-link.log" 2>&1; then
  echo "expected descriptor repair to reject a symlink target" >&2
  exit 1
fi
test "$(stat -c %a "$helper_link_home/external.gitconfig")" = 644
grep -Fq 'durable target changed before repair' "$TMP_DIR/helper-link.log"

# A credential path cannot redirect mode repair through a nested symlink.
helper_credential_home="$TMP_DIR/helper-credential"
mkdir -p "$helper_credential_home/.claude/.config/gh"
printf 'external-credential-state\n' > "$helper_credential_home/external-hosts.yml"
chmod 0644 "$helper_credential_home/external-hosts.yml"
ln -s "$helper_credential_home/external-hosts.yml" \
  "$helper_credential_home/.claude/.config/gh/hosts.yml"
if python3 "$SECURE_HELPER" \
  --home "$helper_credential_home" \
  --target "$helper_credential_home/.claude/.config/gh" \
  --kind directory \
  --uid "$(id -u)" \
  --gid "$(id -g)" \
  --sensitive-file hosts.yml >"$TMP_DIR/helper-credential.log" 2>&1; then
  echo "expected descriptor repair to reject a credential symlink" >&2
  exit 1
fi
test "$(stat -c %a "$helper_credential_home/external-hosts.yml")" = 644
grep -Fq 'credential-bearing path must be a regular file' "$TMP_DIR/helper-credential.log"

# Rootless owners can repair restrictive durable files and directories safely.
mode_zero_file_home="$TMP_DIR/mode-zero-file"
mkdir -p "$mode_zero_file_home/.claude"
printf 'owner-controlled-state\n' > "$mode_zero_file_home/.claude/.gitconfig"
chmod 000 "$mode_zero_file_home/.claude/.gitconfig"
python3 "$SECURE_HELPER" \
  --home "$mode_zero_file_home" \
  --target "$mode_zero_file_home/.claude/.gitconfig" \
  --kind file \
  --uid "$(id -u)" \
  --gid "$(id -g)"
test "$(stat -c %a "$mode_zero_file_home/.claude/.gitconfig")" = 600

mode_zero_directory_home="$TMP_DIR/mode-zero-directory"
mkdir -p "$mode_zero_directory_home/.claude/.config/gh"
printf 'synthetic-auth-state\n' > "$mode_zero_directory_home/.claude/.config/gh/hosts.yml"
chmod 000 "$mode_zero_directory_home/.claude/.config/gh/hosts.yml"
chmod 000 "$mode_zero_directory_home/.claude/.config/gh"
python3 "$SECURE_HELPER" \
  --home "$mode_zero_directory_home" \
  --target "$mode_zero_directory_home/.claude/.config/gh" \
  --kind directory \
  --uid "$(id -u)" \
  --gid "$(id -g)" \
  --sensitive-file hosts.yml
test "$(stat -c %a "$mode_zero_directory_home/.claude/.config/gh")" = 700
test "$(stat -c %a "$mode_zero_directory_home/.claude/.config/gh/hosts.yml")" = 600

mode_zero_hardlink_home="$TMP_DIR/mode-zero-hardlink"
mkdir -p "$mode_zero_hardlink_home/.claude"
printf 'shared-owner-state\n' > "$mode_zero_hardlink_home/external.gitconfig"
ln "$mode_zero_hardlink_home/external.gitconfig" \
  "$mode_zero_hardlink_home/.claude/.gitconfig"
chmod 000 "$mode_zero_hardlink_home/external.gitconfig"
if python3 "$SECURE_HELPER" \
  --home "$mode_zero_hardlink_home" \
  --target "$mode_zero_hardlink_home/.claude/.gitconfig" \
  --kind file \
  --uid "$(id -u)" \
  --gid "$(id -g)" >"$TMP_DIR/mode-zero-hardlink.log" 2>&1; then
  echo "expected a restrictive hard-linked file to fail" >&2
  exit 1
fi
test "$(stat -c %a "$mode_zero_hardlink_home/external.gitconfig")" = 0
grep -Fq 'must not have multiple hard links' "$TMP_DIR/mode-zero-hardlink.log"

# Legacy live state migrates only when no durable target exists.
legacy_home="$TMP_DIR/legacy"
mkdir -p "$legacy_home/.claude" "$legacy_home/.config/gh"
printf '[user]\n\tname = Legacy User\n' > "$legacy_home/.gitconfig"
printf 'legacy-gh-state\n' > "$legacy_home/.config/gh/config.yml"
run_prepare "$legacy_home"
assert_link "$legacy_home/.gitconfig" "$legacy_home/.claude/.gitconfig"
assert_link "$legacy_home/.config/gh" "$legacy_home/.claude/.config/gh"
grep -Fq 'Legacy User' "$legacy_home/.claude/.gitconfig"
grep -Fq 'legacy-gh-state' "$legacy_home/.claude/.config/gh/config.yml"

# Conflicting live and durable state fails without modifying either side.
conflict_home="$TMP_DIR/conflict"
mkdir -p "$conflict_home/.claude"
printf 'live-state\n' > "$conflict_home/.gitconfig"
printf 'durable-state\n' > "$conflict_home/.claude/.gitconfig"
if run_prepare "$conflict_home" >"$TMP_DIR/conflict.log" 2>&1; then
  echo "expected conflicting Git state to fail" >&2
  exit 1
fi
test "$(cat "$conflict_home/.gitconfig")" = "live-state"
test "$(cat "$conflict_home/.claude/.gitconfig")" = "durable-state"
grep -Fq "$conflict_home/.gitconfig" "$TMP_DIR/conflict.log"
grep -Fq "$conflict_home/.claude/.gitconfig" "$TMP_DIR/conflict.log"

# Conflicting live and durable GitHub CLI directories also fail untouched.
gh_conflict_home="$TMP_DIR/gh-conflict"
mkdir -p \
  "$gh_conflict_home/.claude/.config/gh" \
  "$gh_conflict_home/.config/gh"
printf 'live-gh\n' > "$gh_conflict_home/.config/gh/config.yml"
printf 'durable-gh\n' > "$gh_conflict_home/.claude/.config/gh/config.yml"
if run_prepare "$gh_conflict_home" >"$TMP_DIR/gh-conflict.log" 2>&1; then
  echo "expected conflicting GitHub CLI state to fail" >&2
  exit 1
fi
test "$(cat "$gh_conflict_home/.config/gh/config.yml")" = "live-gh"
test "$(cat "$gh_conflict_home/.claude/.config/gh/config.yml")" = "durable-gh"
grep -Fq "$gh_conflict_home/.config/gh" "$TMP_DIR/gh-conflict.log"
grep -Fq "$gh_conflict_home/.claude/.config/gh" "$TMP_DIR/gh-conflict.log"
test ! -e "$gh_conflict_home/.gitconfig"
test ! -e "$gh_conflict_home/.claude/.gitconfig"
test ! -e "$gh_conflict_home/.config/git"
test ! -e "$gh_conflict_home/.claude/.config/git"

# Wrong live path types fail before any state is migrated or created.
wrong_type_home="$TMP_DIR/wrong-type"
mkdir -p "$wrong_type_home/.claude" "$wrong_type_home/.gitconfig"
printf 'must-stay-live\n' > "$wrong_type_home/.gitconfig/content"
if run_prepare "$wrong_type_home" >"$TMP_DIR/wrong-type.log" 2>&1; then
  echo "expected wrong-type live Git state to fail" >&2
  exit 1
fi
test -d "$wrong_type_home/.gitconfig"
test "$(cat "$wrong_type_home/.gitconfig/content")" = "must-stay-live"
test ! -e "$wrong_type_home/.claude/.gitconfig"
test ! -e "$wrong_type_home/.config/git"
test ! -e "$wrong_type_home/.config/gh"
grep -Fq 'must be a regular file' "$TMP_DIR/wrong-type.log"

# Explicit caller paths remain caller-managed.
override_home="$TMP_DIR/override"
mkdir -p "$override_home/.claude" "$override_home/custom-gh" "$override_home/custom-xdg"
printf '[user]\n\tname = Explicit User\n' > "$override_home/custom.gitconfig"
run_prepare "$override_home" \
  GIT_CONFIG_GLOBAL="$override_home/custom.gitconfig" \
  GH_CONFIG_DIR="$override_home/custom-gh" \
  XDG_CONFIG_HOME="$override_home/custom-xdg"
test ! -e "$override_home/.gitconfig"
test ! -e "$override_home/.config/git"
test ! -e "$override_home/.config/gh"
test "$(cat "$override_home/custom.gitconfig" | grep -c 'Explicit User')" = 1

# GIT_CONFIG_GLOBAL replaces both standard global locations.
git_global_override_home="$TMP_DIR/git-global-override"
mkdir -p "$git_global_override_home/.claude"
printf '[user]\n\tname = Explicit Global User\n' > "$git_global_override_home/custom.gitconfig"
run_prepare "$git_global_override_home" GIT_CONFIG_GLOBAL="$git_global_override_home/custom.gitconfig"
test ! -e "$git_global_override_home/.gitconfig"
test ! -e "$git_global_override_home/.config/git"
assert_link "$git_global_override_home/.config/gh" "$git_global_override_home/.claude/.config/gh"
test "$(grep -c 'Explicit Global User' "$git_global_override_home/custom.gitconfig")" = 1

# An explicit GH_CONFIG_DIR leaves only GitHub CLI state caller-managed.
gh_override_home="$TMP_DIR/gh-override"
mkdir -p "$gh_override_home/.claude" "$gh_override_home/custom-gh"
printf 'caller-managed-gh\n' > "$gh_override_home/custom-gh/config.yml"
run_prepare "$gh_override_home" GH_CONFIG_DIR="$gh_override_home/custom-gh"
assert_link "$gh_override_home/.gitconfig" "$gh_override_home/.claude/.gitconfig"
assert_link "$gh_override_home/.config/git" "$gh_override_home/.claude/.config/git"
test ! -e "$gh_override_home/.config/gh"
test "$(cat "$gh_override_home/custom-gh/config.yml")" = "caller-managed-gh"

# Equivalent default XDG paths with trailing separators remain managed.
xdg_default_home="$TMP_DIR/xdg-default"
mkdir -p "$xdg_default_home/.claude"
run_prepare "$xdg_default_home" XDG_CONFIG_HOME="$xdg_default_home/.config///"
assert_link "$xdg_default_home/.config/git" "$xdg_default_home/.claude/.config/git"
assert_link "$xdg_default_home/.config/gh" "$xdg_default_home/.claude/.config/gh"

# A valid unexpected symlink is preserved; a dangling one fails closed.
custom_home="$TMP_DIR/custom-link"
mkdir -p "$custom_home/.claude"
printf '[user]\n\tname = External User\n' > "$custom_home/external.gitconfig"
ln -s "$custom_home/external.gitconfig" "$custom_home/.gitconfig"
run_prepare "$custom_home"
test "$(readlink "$custom_home/.gitconfig")" = "$custom_home/external.gitconfig"
test "$(grep -c 'External User' "$custom_home/external.gitconfig")" = 1
test "$(grep -c 'email' "$custom_home/external.gitconfig" || true)" = 0

dangling_home="$TMP_DIR/dangling"
mkdir -p "$dangling_home/.claude"
ln -s "$dangling_home/missing.gitconfig" "$dangling_home/.gitconfig"
if run_prepare "$dangling_home" >"$TMP_DIR/dangling.log" 2>&1; then
  echo "expected unexpected dangling symlink to fail" >&2
  exit 1
fi
grep -Fq 'unexpected dangling symbolic link' "$TMP_DIR/dangling.log"

# An expected dangling link is repaired by creating its durable target.
repair_home="$TMP_DIR/repair"
mkdir -p "$repair_home/.claude"
ln -s "$repair_home/.claude/.gitconfig" "$repair_home/.gitconfig"
run_prepare "$repair_home"
test -f "$repair_home/.claude/.gitconfig"
test "$(HOME="$repair_home" git config --global user.name)" = "Initial User"

# A durable target that is itself a symlink is rejected without touching it.
durable_link_home="$TMP_DIR/durable-link"
mkdir -p "$durable_link_home/.claude"
printf 'external-durable-state\n' > "$durable_link_home/external.gitconfig"
ln -s "$durable_link_home/external.gitconfig" "$durable_link_home/.claude/.gitconfig"
if run_prepare "$durable_link_home" >"$TMP_DIR/durable-link.log" 2>&1; then
  echo "expected durable target symlink to fail" >&2
  exit 1
fi
test "$(readlink "$durable_link_home/.claude/.gitconfig")" = "$durable_link_home/external.gitconfig"
test "$(cat "$durable_link_home/external.gitconfig")" = "external-durable-state"
grep -Fq 'durable target must not be a symbolic link' "$TMP_DIR/durable-link.log"

test "$(stat -c %a "$fresh_home/.claude/.gitconfig")" = 600
test "$(stat -c %a "$fresh_home/.claude/.config/gh")" = 700
test "$(stat -c %a "$fresh_home/.claude/.config/gh/hosts.yml")" = 600

echo "cli-persistence-unit: success"
