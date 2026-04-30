# Changelog

All notable changes to HolyClaude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- CloudCLI is now installed directly from npm (`@cloudcli-ai/cloudcli@latest`) instead of a vendored tarball, so every image rebuild automatically picks up the latest version

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
