# HolyClaude Environment — Full Variant

You are running inside a **HolyClaude Docker container** (full variant). Everything is pre-installed and ready to use. This file is your global memory — customize it with your own preferences, projects, and context.

---

## Environment Overview

- **OS:** Debian Bookworm (slim) inside Docker
- **User:** `claude` (Docker UID/GID configurable via PUID/PGID; rootless Podman uses keep-id)
- **Working directory:** `/workspace` (bind-mounted from host)
- **Home directory:** `/home/claude`
- **Persistent storage:** `~/.claude/` is bind-mounted — settings, file-based credentials stored there, and this file survive container rebuilds
- **Process manager:** s6-overlay v3 (PID 1) — manages all long-running services
- **Display:** Xvfb virtual display at `:99` for headless browser operations

## Running Services

| Service | What it does | Port |
|---------|-------------|------|
| **CloudCLI** | Web UI for Claude Code | `3001` |
| **Xvfb** | Virtual display for headless Chromium | `:99` (internal) |
| **sshd** | Optional key-only SSH login as `claude` | `22` when `HOLYCLAUDE_SSH_ENABLE=true` |

CloudCLI, Xvfb, Claude session sync, and optional sshd are managed by s6-overlay.

## Node.js & npm (v26)

### Global packages available:
- **Languages:** typescript, tsx
- **Package managers:** pnpm, npm (built-in)
- **Build tools:** vite, esbuild
- **Code quality:** eslint, prettier
- **Dev servers:** serve, nodemon, http-server
- **Utilities:** concurrently, dotenv-cli
- **Deployment:** wrangler (Cloudflare), vercel, netlify-cli, @cloudflare/next-on-pages, az (Azure)
- **Databases:** prisma, drizzle-kit
- **Process management:** pm2
- **Mobile:** eas-cli (Expo)
- **Performance:** lighthouse, @lhci/cli
- **Media:** sharp-cli, @marp-team/marp-cli
- **Mock APIs:** json-server

### Installing additional packages:
```bash
npm i -g <package>        # Global install
npm i <package>           # Project-local install
```

## Python 3

### Installed packages:
- **HTTP:** requests, httpx
- **Scraping:** beautifulsoup4, lxml
- **Images:** Pillow
- **Data:** pandas, numpy, matplotlib, seaborn
- **PDF:** reportlab, weasyprint, cairosvg, fpdf2, PyMuPDF, pdfkit, img2pdf
- **Excel:** openpyxl, xlsxwriter, xlrd
- **Documents:** python-docx, python-pptx, markdown, jinja2
- **Config:** pyyaml, python-dotenv
- **CLI:** rich, click, tqdm
- **Code quality:** Desloppify, Bandit, tree-sitter
- **Browser:** playwright
- **Web framework:** fastapi, uvicorn

### Installing additional packages:
```bash
pip install --break-system-packages <package>
```
The `--break-system-packages` flag is required (no venv in container context).

## AI CLI Providers

| CLI | Command | Notes |
|-----|---------|-------|
| **Claude Code** | `claude` | Primary — you are running inside this |
| **Gemini CLI** | `gemini` | Requires `GEMINI_API_KEY` env var. Config persists across rebuilds. Notifications via Apprise. |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` or ChatGPT subscription (`codex login --device-auth`). Raw CLI config is seeded on first boot. Auth persists across rebuilds. Notifications via Apprise. |
| **Cursor** | `cursor` | Requires `CURSOR_API_KEY` env var. Config persists across rebuilds. |
| **TaskMaster AI** | `task-master` | Task planning and management |
| **Junie** | `junie` | JetBrains AI coding agent (requires JetBrains account) |
| **OpenCode** | `opencode` | Open source AI agent (OpenRouter and other providers) |
| **Pi Coding Agent** | `pi` | Minimal agent harness (supports multiple providers) |

## Desloppify

- `desloppify` is installed in the full image.
- It is passive by default. HolyClaude does not run scans, create `.desloppify/`, edit `.gitignore`, or modify mounted workspaces unless the user runs Desloppify.
- Optional global skill setup is controlled by `HOLYCLAUDE_DESLOPPIFY_SETUP`. Valid values: `off`, `all`, `claude`, `codex`, `gemini`, `opencode`, or comma-separated subsets.
- `all` expands to `claude,codex,gemini`. OpenCode is not included in `all`.
- OpenCode can discover Claude-compatible skills from `~/.claude/skills`. Do not combine `claude` and `opencode` automatic setup.
- Configure OpenRouter from the `opencode` TUI. Free model availability depends on OpenRouter and provider account limits.
- Normal project usage: `desloppify scan --path .` then `desloppify next`. After scans, add `.desloppify/` to that project's `.gitignore`.

## System Tools

### Command-line utilities:
- **Search:** ripgrep (`rg`), fd (`fdfind`), fzf, grep
- **Files:** tree, bat (`batcat` or `bat`), jq, zip/unzip
- **Network:** curl, wget, openssh-client, openssh-server, mosh
- **Process:** htop, lsof, strace, iproute2 (`ip`, `ss`)
- **Terminal:** tmux
- **Version control:** git, gh (GitHub CLI)

### Database CLIs:
- **PostgreSQL:** `psql`
- **Redis:** `redis-cli`
- **SQLite:** `sqlite3`

### Media & document processing:
- **Images:** imagemagick (`convert`, `identify`, `mogrify`)
- **Video/Audio:** ffmpeg
- **Documents:** pandoc (convert between formats)
- **Image processing:** libvips (via `vips` command or sharp)

### Browser:
- **Chromium** at `/usr/bin/chromium` — supported wrapper; `CHROME_PATH` and `PUPPETEER_EXECUTABLE_PATH` stay pointed here
- **Playwright 1.61.0** installed for Node and Python — baked at build time, no runtime browser download
- **Debian Chromium 150.0.7871.181** at `/usr/bin/chromium` is shared by Playwright 1.61.0 for Node, Python, and CloudCLI; pass `/usr/bin/chromium` as `executablePath` (Node) or `executable_path` (Python) when launching Playwright directly. CloudCLI applies this path automatically.
- Xvfb provides a compatibility display at `:99` for tools that use a headed display
- Flags preset: `--no-sandbox --disable-gpu --disable-dev-shm-usage`
- Lighthouse and `@lhci/cli` are full-image tools

## GitHub CLI (gh)

Pre-installed and ready. Authenticate with:
```bash
gh auth login
```

Common operations:
```bash
gh repo clone owner/repo
gh pr create --title "..." --body "..."
gh issue list
gh pr merge
```

## Notifications (Apprise)

Optional push notifications via [Apprise](https://github.com/caronc/apprise) — supports 100+ services (Discord, Telegram, Slack, Email, Pushover, Gotify, and more). Disabled by default.

**To enable:**
1. Set one or more `NOTIFY_*` environment variables (e.g. `NOTIFY_DISCORD`, `NOTIFY_TELEGRAM`, `NOTIFY_PUSHOVER`)
2. Create the flag file: `touch ~/.claude/notify-on`

Telegram uses `NOTIFY_TELEGRAM=tgram://bot_token/chat_id`. Check setup without sending: `/usr/local/bin/notify.py test --dry-run --debug`.

**To disable:** `rm ~/.claude/notify-on`

**Events:**
- `stop` — Claude finishes a task
- `error` — A tool use failure occurs

## Workspace

- All projects go in `/workspace` (bind-mounted from host)
- Git is pre-configured with `safe.directory /workspace`
- Git identity is set via `GIT_USER_NAME` and `GIT_USER_EMAIL` env vars
- Create repos, clone projects, build — everything persists on the host

## Permissions

Claude Code runs in `acceptEdits` mode by default:
- File edits: allowed without confirmation
- Shell commands: follow Claude Code's current permission prompt behavior
- To enable full bypass: change `acceptEdits` to `bypassPermissions` in `~/.claude/settings.json`

Codex has separate configurable near-parity controls:
- CloudCLI Codex chat: `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` is a server-side fallback only when a request omits `permissionMode`. The current browser client sends an explicit value, which takes precedence. Valid fallback values: `default`, `acceptEdits`, `bypassPermissions`.
- Raw `codex` CLI: `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE`, used only when creating a new `~/.codex/config.toml` on first boot. Existing configs are not overwritten, and the generated value persists until you edit it.
- `bypassPermissions` gives full access with no approval inside the Docker container and mounted volumes. Use it only for trusted local workspaces.

## Optional SSH/Mosh

- `HOLYCLAUDE_SSH_ENABLE=false` by default. No SSH daemon runs unless it is set to `true`.
- `HOLYCLAUDE_SSH_AUTHORIZED_KEYS` defaults to `/run/holyclaude-ssh/authorized_keys`.
- `authorized_keys` must come from a separate read-only mount, not `.claude`, `/home/claude`, or `/workspace`.
- `HOLYCLAUDE_MOSH_ENABLE=false` by default. Mosh uses SSH first, then UDP `60000-60010` unless configured otherwise.

## Container Lifecycle

- **First boot:** Bootstrap runs once — copies settings, memory, configures git
- **Subsequent boots:** Bootstrap skipped (sentinel file exists)
- **Re-trigger bootstrap:** Delete `~/.claude/.holyclaude-bootstrapped`
- **Credentials survive rebuilds:** `~/.claude/` is bind-mounted
- **CloudCLI account:** container-local by default; persist it with a local named volume at `/home/claude/.cloudcli` when needed. Do not place SQLite state on network mounts.

## Tips

- Use the **Web Terminal** plugin in CloudCLI instead of "Continue in Shell" (known CloudCLI bug)
- If Web Terminal text shows black squares after updating, run `localStorage.setItem('web-terminal-disable-webgl', 'true')` in the CloudCLI browser console and reopen the terminal
- Chromium needs `shm_size: 2g` or higher in docker-compose to avoid crashes; an immediate SIGTRAP or exit 133 is a separate browser/runtime failure
- If on SMB/CIFS mounts, enable `CHOKIDAR_USEPOLLING=1` and `WATCHFILES_FORCE_POLLING=true`
- SQLite databases should NOT be stored on network mounts (file locking fails on CIFS)

---

## Your Preferences

Add your personal preferences below. This section persists across container rebuilds.

```
# Example:
# - Default stack: Astro, Tailwind, pnpm
# - Direct communication, no fluff
# - Always use TypeScript
```
