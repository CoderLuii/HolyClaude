# HolyClaude Environment — Slim Variant

You are running inside a **HolyClaude Docker container** (slim variant). Core tools are pre-installed. Additional packages can be installed on-demand — see the "Not Pre-installed" sections below. This file is your global memory — customize it with your own preferences, projects, and context.

---

## Environment Overview

- **OS:** Debian Bookworm (slim) inside Docker
- **User:** `claude` (Docker UID/GID configurable via PUID/PGID; rootless Podman uses keep-id)
- **Working directory:** `/workspace` (bind-mounted from host)
- **Home directory:** `/home/claude`
- **Persistent storage:** `~/.claude/` is bind-mounted — settings, file-based credentials stored there, and this file survive container rebuilds
- **Process manager:** s6-overlay v3 (PID 1) — manages all long-running services
- **Display:** Xvfb virtual display at `:99` for headless browser operations
- **Variant:** SLIM — lighter image, install extras as needed

## Running Services

| Service | What it does | Port |
|---------|-------------|------|
| **CloudCLI** | Web UI for Claude Code | `3001` |
| **Xvfb** | Virtual display for headless Chromium | `:99` (internal) |
| **sshd** | Optional key-only SSH login as `claude` | `22` when `HOLYCLAUDE_SSH_ENABLE=true` |

CloudCLI, Xvfb, Claude session sync, and optional sshd are managed by s6-overlay.

## Node.js & npm (v26)

### Pre-installed global packages:
- **Languages:** typescript, tsx
- **Package managers:** pnpm, npm (built-in)
- **Build tools:** vite, esbuild
- **Code quality:** eslint, prettier
- **Dev servers:** serve, nodemon
- **Utilities:** concurrently, dotenv-cli

### NOT pre-installed (install when needed):
```bash
# Deployment CLIs
npm i -g wrangler                    # Cloudflare
npm i -g vercel                      # Vercel
npm i -g netlify-cli                 # Netlify
npm i -g @cloudflare/next-on-pages   # Next.js on Cloudflare

# Database ORMs
npm i -g prisma                      # Prisma ORM
npm i -g drizzle-kit                 # Drizzle ORM

# Other tools
npm i -g pm2                         # Process manager
npm i -g eas-cli                     # Expo/React Native
npm i -g lighthouse @lhci/cli        # Performance testing
npm i -g sharp-cli                   # Image processing
npm i -g json-server                 # Mock REST APIs
npm i -g http-server                 # Static file server
npm i -g @marp-team/marp-cli         # Markdown presentations
```
Install these with `npm i -g <package>` — takes seconds.

## Python 3

### Pre-installed packages:
- **HTTP:** requests, httpx
- **Scraping:** beautifulsoup4, lxml
- **Images:** Pillow
- **Data:** pandas, numpy
- **Excel:** openpyxl
- **Documents:** python-docx, markdown, jinja2
- **Config:** pyyaml, python-dotenv
- **CLI:** rich, click, tqdm
- **Code quality:** Desloppify, Bandit, tree-sitter
- **Browser:** playwright

### NOT pre-installed (install when needed):
```bash
# PDF libraries (install the one you need, not all)
pip install --break-system-packages reportlab     # Generate PDFs
pip install --break-system-packages weasyprint     # HTML to PDF
pip install --break-system-packages fpdf2          # Simple PDF creation
pip install --break-system-packages PyMuPDF        # Read/manipulate PDFs
pip install --break-system-packages img2pdf        # Images to PDF

# Data visualization
pip install --break-system-packages matplotlib seaborn

# Excel (additional)
pip install --break-system-packages xlsxwriter xlrd

# Office documents
pip install --break-system-packages python-pptx    # PowerPoint

# Web framework
pip install --break-system-packages fastapi uvicorn

```
The `--break-system-packages` flag is required (no venv in container context).

## Desloppify

- `desloppify` is installed in the slim image.
- It is passive by default. HolyClaude does not run scans, create `.desloppify/`, edit `.gitignore`, or modify mounted workspaces unless the user runs Desloppify.
- Optional global skill setup is controlled by `HOLYCLAUDE_DESLOPPIFY_SETUP`. Valid values: `off`, `all`, `claude`, `codex`, `gemini`, or comma-separated subsets. `opencode` is full-image only and is skipped in slim.
- `all` expands to `claude,codex,gemini`.
- Normal project usage: `desloppify scan --path .` then `desloppify next`. After scans, add `.desloppify/` to that project's `.gitignore`.

### System packages NOT pre-installed:
The slim variant does not include these apt packages. Install if needed:
```bash
sudo apt-get update && sudo apt-get install -y pandoc    # Document conversion
sudo apt-get install -y ffmpeg                            # Video/audio processing
sudo apt-get install -y libvips-dev                       # Image processing library
```
These take longer to install (~1-2 minutes) because they require system dependencies.

## AI CLI Providers

| CLI | Command | Notes |
|-----|---------|-------|
| **Claude Code** | `claude` | Primary — you are running inside this |
| **Gemini CLI** | `gemini` | Requires `GEMINI_API_KEY` env var |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` or ChatGPT subscription (`codex login --device-auth`). Raw CLI config is seeded on first boot. |
| **Cursor** | `cursor` | Requires `CURSOR_API_KEY` env var |
| **TaskMaster AI** | `task-master` | Task planning and management |

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

### Media processing:
- **Images:** imagemagick (`convert`, `identify`, `mogrify`)
- **Video/Audio:** NOT installed — `sudo apt-get install -y ffmpeg` if needed
- **Documents:** NOT installed — `sudo apt-get install -y pandoc` if needed

### Browser:
- **Chromium** at `/usr/bin/chromium` — supported wrapper; `CHROME_PATH` and `PUPPETEER_EXECUTABLE_PATH` stay pointed here
- **Playwright 1.62.0** installed for Node and Python — baked at build time, no runtime browser download
- **Debian Chromium 151.0.7922.108** at `/usr/bin/chromium` is shared by Playwright 1.62.0 for Node, Python, and CloudCLI; pass `/usr/bin/chromium` as `executablePath` (Node) or `executable_path` (Python) when launching Playwright directly. CloudCLI applies this path automatically.
- Xvfb provides a compatibility display at `:99` for tools that use a headed display
- Flags preset: `--no-sandbox --disable-gpu --disable-dev-shm-usage`

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

## Workspace

- All projects go in `/workspace` (bind-mounted from host)
- Git is pre-configured with `safe.directory /workspace`
- Git identity is seeded from `GIT_USER_NAME` and `GIT_USER_EMAIL` only when missing
- Global Git configuration and GitHub CLI authentication persist below `~/.claude`; protect the mounted data because it can contain credentials
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

- **Every boot:** Git and GitHub CLI configuration links are prepared before bootstrap
- **First boot:** Bootstrap runs once — copies settings and memory
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
- **Slim variant:** When you need a tool that's not installed, just install it. npm/pip packages take seconds. apt packages take 1-2 minutes.

---

## Your Preferences

Add your personal preferences below. This section persists across container rebuilds.

```
# Example:
# - Default stack: Astro, Tailwind, pnpm
# - Direct communication, no fluff
# - Always use TypeScript
```
