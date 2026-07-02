# Changelog

All notable changes to HolyClaude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.8] - 07/02/2026

### Changed
- Upgraded vendored `@cloudcli-ai/cloudcli` from 1.34.0 to 1.35.1.
- Retargeted the Apprise notification patch to CloudCLI's refactored notification orchestrator service.
- Removed the Docker build-time Codex `exitCode` patch now that upstream 1.35.1 includes the fix.

## [1.3.7] - 06/18/2026

### Added
- Added the HolyCode Cloud early-access callout near the top of the README, linking readers to https://holycode.coderluii.dev/cloud.

## [1.3.6] - 06/18/2026

### Fixed
- Restored saved Claude Code session state before startup can replace it with a fresh default file, keeping OAuth/API sessions intact across container recreation.
- Added Docker smoke coverage for Claude session persistence so release candidates can be checked locally before publishing.

## [1.3.5] - 06/17/2026

### Fixed
- Patched the baked CloudCLI Web Terminal plugin so PTY output is decoded from raw UTF-8 bytes before it reaches xterm.js, preventing split multibyte characters from turning box drawing, emoji, or CJK output into replacement blocks.
- Added explicit terminal font fallbacks and a `web-terminal-disable-webgl` browser toggle for systems where WebGL glyph rendering still shows black squares.
- Added regression coverage for the Web Terminal patch so Docker builds fail when the pinned plugin source drifts.

## [1.3.4] - 06/17/2026

### Fixed
- Preserved CloudCLI's `expandWorkspacePath` helper while disabling in-container self-updates, restoring workspace browsing and `~/...` folder creation in the patched runtime.
- Added regression coverage so the CloudCLI self-update patch cannot remove the filesystem browser helpers again.

## [1.3.3] - 06/15/2026

### Fixed
- Corrected Telegram notification examples to use Apprise's `tgram://bot_token/chat_id` scheme and kept legacy `tg://` values working at runtime.
- Added a dry-run notification diagnostic so users can check `notify-on`, `NOTIFY_*` variables, and Apprise URL acceptance without sending a message.
- Kept Docker release metadata from auto-adding `latest` to slim builds, so `latest` stays tied to the full image.

## [1.3.2] - 06/15/2026

### Changed
- Clarified that full-image OpenCode is the supported OpenRouter and multi-provider path, including Claude-compatible skill discovery and upstream-dependent free model availability.

## [1.3.1] - 06/15/2026

### Added
- Added Desloppify `1.0` to both image variants as the `desloppify` CLI, with pinned supporting packages for Bandit, tree-sitter, and Stevedore.
- Added optional `HOLYCLAUDE_DESLOPPIFY_SETUP` global skill setup for Claude, Codex, Gemini, and full-image OpenCode.

### Changed
- Documented Desloppify's passive default behavior, manual scan commands, project-level `.desloppify/` state, OpenCode setup caveats, and OSNL-0.2 notice.

## [1.3.0] - 06/15/2026

### Fixed
- Patched CloudCLI Codex completion events so successful Codex chat turns include `exitCode: 0`, matching the other providers and keeping new Codex sessions on the active session after the first prompt.
- Added a fail-closed Docker build patch for the Codex completion payload so future CloudCLI changes are reviewed instead of silently dropping the fix.

## [1.2.9] - 06/14/2026

### Added
- Added Pi Coding Agent `0.79.3` to the full image as the `pi` command.

### Changed
- Updated README, Docker Hub, translations, memory template, and notices so the full image lists eight AI CLIs.

### Fixed
- Restored the documented `cursor` command when the current Cursor Agent installer only creates `agent` and `cursor-agent`.
- Enforced LF endings for Docker runtime scripts so Windows checkouts build runnable containers.

## [1.2.8] - 06/14/2026

### Changed
- Refreshed the Docker runtime to Node.js 26.3.0 with npm 11.16.0 from the base image.
- Replaced the deprecated `@siteboon/claude-code-ui` wrapper with the vendored `@cloudcli-ai/cloudcli` 1.34.0 package.
- Updated pinned npm, Python, and GitHub Actions dependencies where current audited releases were available.
- Documented Docker Hub compressed image sizes separately from the larger unpacked sizes Docker hosts and NAS tools can report.

### Fixed
- Patched CloudCLI self-update guards across both source and compiled runtime files so in-container npm updates cannot replace HolyClaude's patched runtime.
- Updated the CloudCLI service command from the moved `claude-code-ui` binary to `cloudcli`.

### Security
- Removed `httpie` from the full image because PyPI/OSV still flags `httpie` 3.2.4 with `PYSEC-2023-242` / `CVE-2023-48052`.
- Verified the vendored CloudCLI line is above the upstream fixes for `CVE-2026-31862` and `CVE-2026-31975`.
- Hardened Docker publish workflow permissions and added Dependabot coverage for GitHub Actions.

## [1.2.7] - 06/13/2026

### Fixed
- Disabled CloudCLI's unsafe npm self-update path inside HolyClaude so issue #50 no longer replaces the patched runtime with the moved upstream package.
- Documented the `@/shared` CloudCLI update failure and the Docker update path.

## [1.2.6] - 05/28/2026

### Added
- Added configurable near-parity Codex permission modes for CloudCLI Codex chat with `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE`.
- Added first-boot raw `codex` CLI permission-mode seeding through `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE`.

### Changed
- Documented Codex permission behavior, safety caveats, compose examples, and CloudCLI modification notices.

## [1.2.5] - 05/27/2026

### Fixed
- Sent Apprise notifications for Codex chat completion/failure events through HolyClaude's CloudCLI provider lifecycle, using the existing ~/.claude/notify-on flag and NOTIFY_* destinations.

## [1.2.4] - 05/27/2026

### Fixed
- Repaired bubblewrap setuid permissions at container startup so Codex `apply_patch` keeps working on Synology and other restricted-user-namespace hosts after `docker compose pull && docker compose up -d`.

## [1.2.3] - 05/27/2026

### Changed
- Refreshed dependency surfaces with Node.js 26.2.0, s6-overlay 3.2.3.0, pinned npm and Python package versions, pinned GitHub Actions, and pinned CloudCLI plugin SHAs.
- Retained CloudCLI 1.26.3 after rejecting the 2.0.0 artifact because required HolyClaude patches could not be carried forward safely.
- Recorded site dependency and copy updates as follow-up only, with no site commit included in this release.

### Fixed
- Changed required CloudCLI patch misses to fail closed during the image build instead of continuing after warnings.
- Corrected third-party notices and `acceptEdits` documentation drift across source docs and templates.

### Security
- Bound default CloudCLI compose examples to localhost only and strengthened guidance against public port exposure.
- Hardened ignore and build-context handling for local state and secret-bearing files.

## [1.2.2] - 04/10/2026

### Fixed
- `/model <name>` in Chat tab now actually switches the active model — it persists to localStorage and survives page reload

## [1.2.1] - 04/10/2026

### Fixed
- Shell tab no longer resets scroll position to the top on periodic refresh

## [1.2.0] - 04/09/2026

### Added
- Remote access security guidance recommending Tailscale or Cloudflare Tunnel instead of exposing HolyClaude directly to the public internet
- Optional CloudCLI account persistence documentation using a named Docker volume for local storage users

### Fixed
- Corrected persistence docs to reflect that Claude Code OAuth session (`~/.claude.json`) already survives container rebuilds
- Synced translated READMEs and troubleshooting docs with the current persistence behavior

## [1.1.9] - 04/04/2026

### Fixed
- Vendored a patched CloudCLI build into the HolyClaude image so the release no longer depends on waiting for upstream UI/runtime fixes to merge
- Codex session completion now stays on the active session instead of bouncing back to `new session` after the first prompt
- Claude auth failures now refresh status after login and surface clearer error messages instead of leaving stale or silent UI state
- Realtime chat messages now dedupe correctly so duplicate user/thinking rows do not render twice
- The auth shell no longer steals plain lowercase `c`; the auth URL copy shortcut now requires `Shift+C`
- The selected thinking mode now persists in the main chat flow instead of resetting after each send
- Documented Codex callback port `1455` in the full compose/config docs
- Simplified the supported Ollama path to `ANTHROPIC_AUTH_TOKEN=ollama` plus `ANTHROPIC_BASE_URL=<endpoint>` and tightened troubleshooting guidance
- Corrected remaining public docs links that still referenced `blob/main/docs/configuration.md`

## [1.1.8] - 04/04/2026

### Fixed
- Corrected public documentation links that still referenced the non-existent `main` branch, including the Docker Hub description and translated README links to `docs/configuration.md`

## [1.1.7] - 03/28/2026

### Added
- Codex CLI pre-configured with `on-request` approval policy and `workspace-write` sandbox (no more repeated approval prompts)
- Codex, Gemini, and Cursor CLI auth and config persistence across container rebuilds (symlinked into bind-mounted volume)
- Apprise notification hooks for Codex and Gemini CLIs (same `notify-on` flag file as Claude Code)
- Cursor CLI notification hook pre-configured (activates when Cursor CLI adds stop event support)
- Claude Code OAuth session persistence across container recreation (`~/.claude.json` backed up to bind mount)

## [1.1.6] - 03/28/2026

### Fixed
- Codex CLI `apply_patch` failing on Synology NAS and other hosts with restricted user namespaces (bubblewrap sandbox now works via setuid fallback)
- Corrected documentation that incorrectly stated ChatGPT Plus/Pro subscriptions do not work with Codex CLI (they do, via `codex login --device-auth`)

## [1.1.5] - 03/28/2026

### Added
- `THIRD-PARTY-NOTICES` file with license attribution for bundled third-party software
- Third-Party Software section in README

## [1.1.4] - 03/28/2026

### Added
- Azure CLI (`az`) in full variant
- Ollama setup documentation (`docs/ollama.md`) for running HolyClaude with local or cloud models without an Anthropic subscription

## [1.1.3] - 03/27/2026

### Added
- Junie CLI (JetBrains AI coding agent) in full variant
- OpenCode CLI (open source AI coding agent) in full variant
- Environment variable passthrough to CloudCLI for AI provider keys, timezone, and display (`ANTHROPIC_API_KEY`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `OLLAMA_HOST`, `TZ`, `DISPLAY`, etc.)

### Fixed
- Web Terminal plugin stuck on "Connecting..." spinner (WebSocket frame type not preserved in plugin proxy, both relay directions patched)
- `NODE_OPTIONS` from Docker Compose now correctly merged with internal flags instead of being silently overridden
- `TZ` and `DISPLAY` environment variables now properly forwarded to CloudCLI process
- Default permission mode corrected from `allowEdits` to `acceptEdits` in settings.json

Thanks to [@RobertWalther](https://github.com/RobertWalther) for the WebSocket fix and [@kewogc](https://github.com/kewogc) for reporting the settings error.

## [1.1.2] - 03/26/2026

### Added
- Docker HEALTHCHECK instruction for container health monitoring
- Bootstrap now backs up existing `settings.json` and `CLAUDE.md` before overwriting on re-bootstrap
- Expanded CONTRIBUTING.md with build commands, testing steps, file map, and PR checklist

## [1.1.1] - 03/26/2026

### Fixed
- Workspace bind mount permissions on first run when Docker creates the directory as root
- Workspace directory now tracked via `.gitkeep` to prevent root ownership on fresh clones

### Added
- Configurable host-side port and bind-mount paths via `.env` file (`HOLYCLAUDE_HOST_PORT`, `HOLYCLAUDE_HOST_CLAUDE_DIR`, `HOLYCLAUDE_HOST_WORKSPACE_DIR`)

Thanks to [@Sunwood-ai-labs](https://github.com/Sunwood-ai-labs) for this contribution.

## [1.1.0] - 03/25/2026

### Added
- Apprise notification engine with support for 100+ services (Discord, Telegram, Slack, Email, Gotify, and more)
- Individual `NOTIFY_*` environment variables for easy per-service configuration
- Catch-all `NOTIFY_URLS` for any Apprise-supported service

### Changed
- Notification backend replaced from Pushover to Apprise

### Removed
- **BREAKING:** `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` environment variables removed. Migrate to `NOTIFY_PUSHOVER=pover://user_key@app_token`. See [configuration docs](configuration.md#notifications-apprise) for details.

## [1.0.0] - 03/21/2026

Initial public release.
