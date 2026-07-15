🌍 **English** | [Español](docs/translations/README.es.md) | [Français](docs/translations/README.fr.md) | [Italiano](docs/translations/README.it.md) | [Português](docs/translations/README.pt.md) | [Deutsch](docs/translations/README.de.md) | [Русский](docs/translations/README.ru.md) | [हिन्दी](docs/translations/README.hi.md) | [中文](docs/translations/README.zh.md) | [日本語](docs/translations/README.ja.md) | [한국어](docs/translations/README.ko.md)

# <img src="https://github.com/CoderLuii/HolyClaude/blob/master/assets/logo.png?raw=true" alt="HolyClaude" width="39" valign="bottom"> <a name="top"></a>HolyClaude

<div align="center">
  <img src="https://github.com/CoderLuii/HolyClaude/blob/master/assets/hero.png?raw=true" alt="HolyClaude Banner" width="100%" />
</div>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Pulls](https://badgen.net/docker/pulls/coderluii/holyclaude?icon=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![Full Image](https://img.shields.io/docker/image-size/coderluii/holyclaude/latest?label=full&color=blue&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![Slim Image](https://img.shields.io/docker/image-size/coderluii/holyclaude/slim?label=slim&color=green&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
<br>
[![GitHub Stars](https://img.shields.io/github/stars/CoderLuii/HolyClaude?style=social)](https://github.com/CoderLuii/HolyClaude)
[![Twitter Follow](https://img.shields.io/twitter/follow/CoderLuii?style=social)](https://x.com/CoderLuii)
[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)
[![Website](https://img.shields.io/badge/website-holyclaude.coderluii.dev-orange?logo=astro)](https://holyclaude.coderluii.dev)
[![GitHub Release](https://img.shields.io/github/v/release/CoderLuii/HolyClaude?color=369eff&labelColor=black&logo=github&style=flat-square)](https://github.com/CoderLuii/HolyClaude/releases)
[![Issues](https://img.shields.io/github/issues/CoderLuii/HolyClaude?color=ff80eb&labelColor=black&style=flat-square)](https://github.com/CoderLuii/HolyClaude/issues)
[![Contributors](https://img.shields.io/github/contributors/CoderLuii/HolyClaude?color=c4f042&labelColor=black&style=flat-square)](https://github.com/CoderLuii/HolyClaude/graphs/contributors)

### Stop configuring. Start building.

One command. Full AI development workstation. Claude Code, web UI, headless browser, 8 AI CLIs, 50+ dev tools — containerized and ready.

**You were going to spend 2 hours setting this up manually. Or you could just `docker compose up`.**

**Works with your existing Claude Code subscription.** Max/Pro plan, API key — whatever you have, it just works.

> [!TIP]
> **The install step is disappearing.**
>
> HolyClaude gives you the self-hosted AI workstation. [HolyCode Cloud](https://holycode.coderluii.dev/cloud) gives you the same idea without the server chore.
>
> No compose file. No exposed port. No Docker updates. No tunnel setup. No babysitting the box.
>
> Open the browser. Start the session. Build from anywhere.
>
> **Early access is free.** Claim your spot while it is still wide open.

---

## What is this?

You know the drill. You want Claude Code. But you also want it in a browser. With a headless browser for screenshots and testing. With Playwright configured. With every AI CLI. With TypeScript, Python, deployment tools, database clients, GitHub CLI.

In v1.5.0, the compatible CLI and runtime set is refreshed without changing ports, volumes, variants, or Compose usage. CloudCLI moves to 1.36.2 with a reproducible Node 26 build, s6-overlay moves to 3.2.3.1, and fzf now comes from its checksum-verified upstream release. Playwright stays aligned at 1.61.0 for Node and Python, while both bindings launch the pinned Debian Chromium 150.0.7871.114 security build. There is no runtime browser download. Each release candidate also carries digest-bound SBOM and scanner evidence with an exact, expiring review for every raw Critical match.

So you start installing things. One by one. Then Chromium won't launch because Docker's shared memory is 64MB. Then Xvfb isn't configured. Then the UID inside the container doesn't match your host and everything is permission denied. Then you realize Claude Code's installer hangs when WORKDIR is root-owned. Then SQLite locks on your NAS mount. Then—

**HolyClaude is the container I built after solving every single one of those problems.**

I've been running this daily on my own server for weeks. Every bug has been hit, diagnosed, and fixed. Every edge case has been handled. Every "why doesn't this work in Docker" has been answered.

You pull it. You run it. You open your browser. You build.

### :credit_card: Use Your Existing Subscription

**This runs the real Claude Code CLI.** Not a wrapper. Not a proxy. Not a knock-off.

Your existing Anthropic account works directly:
- **Claude Max/Pro plan** — authenticate through the web UI (OAuth), same as desktop Claude Code
- **Anthropic API key** — set it through the web UI, same billing as always
- **No extra cost** — HolyClaude is free and open source. You only pay Anthropic for what you use, like you already do.

> HolyClaude doesn't touch your credentials. They're stored locally in your bind-mounted volume (`./data/claude/`), same as they would be on bare metal.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## Table of Contents

| | Section |
|---|---|
| :zap: | [Quick Start](#zap-quick-start) |
| :computer: | [Platform Support](#computer-platform-support) |
| :star2: | [Why HolyClaude](#star2-why-holyclaude) |
| :credit_card: | [Subscription & Authentication](#credit_card-subscription--authentication) |
| :package: | [Image Variants](#package-image-variants) |
| :whale: | [Docker Compose — Quick](#whale-docker-compose--quick) |
| :whale2: | [Docker Compose — Full](#whale2-docker-compose--full) |
| :wrench: | [Environment Variables](#wrench-environment-variables) |
| :rocket: | [What's Inside](#rocket-whats-inside) |
| :robot: | [AI CLI Providers](#robot-ai-cli-providers) |
| :mag: | [Desloppify](#mag-desloppify) |
| :llama: | [Using Ollama](#llama-using-ollama) |
| :building_construction: | [Architecture](#building_construction-architecture) |
| :file_folder: | [Project Structure](#file_folder-project-structure) |
| :floppy_disk: | [Data & Persistence](#floppy_disk-data--persistence) |
| :lock: | [Permissions](#lock-permissions) |
| :shield: | [Remote Access & Exposure](#shield-remote-access--exposure) |
| :bell: | [Notifications](#bell-notifications) |
| :arrows_counterclockwise: | [Upgrading](#arrows_counterclockwise-upgrading) |
| :construction: | [Troubleshooting](#construction-troubleshooting) |
| :warning: | [Known Issues](#warning-known-issues) |
| :hammer_and_wrench: | [Building Locally](#hammer_and_wrench-building-locally) |
| :bar_chart: | [Alternatives](#bar_chart-alternatives) |
| :rocket: | [Roadmap](#rocket-roadmap) |
| :trophy: | [Built with HolyClaude](#trophy-built-with-holyclaude) |
| :handshake: | [Contributing](#handshake-contributing) |
| :heart: | [Support](#heart-support) |
| :scroll: | [Third-Party Software](#scroll-third-party-software) |
| :page_facing_up: | [License](#page_facing_up-license) |

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :zap: Quick Start

**1.** Create a folder for HolyClaude:

```bash
mkdir holyclaude && cd holyclaude
```

**2.** Create a `docker-compose.yaml` file. Copy one of the templates below:
- [Quick template](#whale-docker-compose--quick) — minimal, zero config, just works
- [Full template](#whale2-docker-compose--full) — all options, fully documented

**3.** Pull and start:

```bash
docker compose up -d
```

**4.** Open the web UI:

```
http://localhost:3001
```

**5.** Create a CloudCLI account (takes 10 seconds), sign in with your Anthropic account, and you're live.

> No `.env` files. No pre-configuration. No reading 40 pages of docs before you can start. It just runs.

> **Want to reach it from outside your network?** Don't port-forward it. See [Remote Access & Exposure](#shield-remote-access--exposure) — use Tailscale or Cloudflare Tunnel instead.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :computer: Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Linux (amd64) | ✅ Fully supported | Native performance, recommended |
| Linux (arm64) | ✅ Fully supported | Raspberry Pi 4+, Oracle Cloud, AWS Graviton |
| macOS (Docker Desktop) | ✅ Fully supported | Apple Silicon & Intel via Docker Desktop |
| Windows (WSL2 + Docker Desktop) | ✅ Fully supported | Requires WSL2 backend |
| Synology / QNAP NAS | ✅ Fully supported | Use `CHOKIDAR_USEPOLLING=true` for SMB mounts |
| Kubernetes | 🔜 Coming soon | Helm chart planned |

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :star2: Why HolyClaude

I built this because I was tired of re-doing the same setup every time. Installing Claude Code, wiring up a web UI, configuring Chromium in Docker, fixing permission issues, debugging process supervision. Every time.

So I made a container that does all of it. And then I hit every possible bug so you don't have to.

| | HolyClaude | Doing it yourself |
|---|---|---|
| **Setup** | 30 seconds | 1-2 hours (if it goes well) |
| **Claude Code** | Pre-installed, pre-configured, ready | Install, configure, debug installer hanging, fix WORKDIR |
| **Web UI** | CloudCLI included with plugins | Find a web UI, install it, configure it, wire it to Claude |
| **Headless browser** | Chromium + Xvfb + Playwright, configured | Install Chromium, install Xvfb, configure display :99, fix shm, fix sandbox, fix seccomp... |
| **AI CLIs** | 8 providers, one container | Install each one separately across 3 package managers |
| **Dev tools** | 50+ tools, ready | `apt-get install` / `npm i -g` / `pip install` for the next hour |
| **Process management** | s6-overlay (auto-restart, graceful shutdown) | Write your own supervisord config or hope Docker restart works |
| **Persistence** | Bind mounts, credentials survive everything | Figure out Docker volumes, debug "why is this a directory not a file" |
| **Updates** | `docker pull && docker compose up -d` | Update 50 tools manually, pray nothing breaks |
| **Multi-arch** | AMD64 + ARM64 | Pray your Dockerfile builds on ARM |

**The last row of every manual setup is "works on my machine."** HolyClaude works on every machine.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :credit_card: Subscription & Authentication

HolyClaude runs the **official Claude Code CLI** from Anthropic. Your existing account works out of the box.

### What works:

| Authentication method | How | Cost |
|----------------------|-----|------|
| **Claude Max/Pro plan** (subscription) | Sign in through CloudCLI web UI — same OAuth flow as desktop | Your existing subscription, no extra charge |
| **Anthropic API key** | Paste your API key in the web UI | Pay-per-use, same Anthropic billing |

### What doesn't work:

| | Why |
|---|---|
| OpenAI API key for Claude | Different company, different API. OpenAI keys work with the **Codex CLI** (also pre-installed) |

> **ChatGPT Plus/Pro subscribers:** Your subscription works with the **Codex CLI**. Run `codex login --device-auth` inside the container to authenticate with your ChatGPT account. If you need Codex's browser callback flow from your host, expose port `1455` in the full compose template below.

### Other AI CLIs included:

| CLI | What you need |
|-----|--------------|
| Gemini CLI | Google AI API key (`GEMINI_API_KEY`) |
| OpenAI Codex | OpenAI API key (`OPENAI_API_KEY`) or ChatGPT Plus/Pro subscription (`codex login --device-auth`) |
| Cursor | Cursor API key (`CURSOR_API_KEY`) |
| TaskMaster AI | Uses your AI provider keys (Anthropic, OpenAI, etc.) |
| Junie | JetBrains account (JetBrains AI subscription) |
| OpenCode | Configure via `opencode` TUI (OpenRouter and other providers) |
| Pi Coding Agent | Configure through `pi` (supports multiple providers) |

> **HolyClaude is free and open source.** You only pay your AI providers for usage, same as you already do. We don't proxy, intercept, or touch your credentials. They live in your local bind mount.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :package: Image Variants

Two flavors. Same quality. Pick your weight class.

| Tag | What you get | Best for | Docker Hub compressed size |
|-----|-------------|----------|----------------------------|
| **`latest`** | Everything pre-installed — every tool, every library, every CLI | Most users. Zero wait time. Claude never has to stop and install something. | ~4.1 GB |
| **`slim`** | Core tools only — Claude installs extras on-demand | Smaller VPS, limited disk, metered bandwidth | ~2.4 GB |
| `X.Y.Z` | Full image, pinned version | Production stability — you control when to update | Same as `latest` for that release |
| `X.Y.Z-slim` | Slim image, pinned version | Production + small footprint | Same as `slim` for that release |

```bash
# Full — batteries included (recommended)
docker pull coderluii/holyclaude

# Slim — lean and mean
docker pull coderluii/holyclaude:slim
```

> **`latest` is always the full image.** Slim users: don't worry — when you ask Claude to do something that needs a missing tool, it installs it in seconds. You get the same capabilities, just with a smaller initial download.
>
> Docker Hub reports compressed transfer size. Docker, Synology Container Manager, and NAS filesystems can show a larger unpacked size after layers are extracted. That is expected; use `slim` when disk space or bandwidth matters more than having every tool ready on first boot.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :whale: Docker Compose — Quick

The "I just want it running" template. Copy this entire block into a `docker-compose.yaml` file:

```yaml
# ==============================================================================
# HolyClaude — Quick Start
# Just run: docker compose up -d
# Then open: http://localhost:3001
# ==============================================================================

services:
  holyclaude:
    image: coderluii/holyclaude:latest     # Full image (use :slim for smaller download)
    container_name: holyclaude
    hostname: holyclaude
    restart: unless-stopped
    shm_size: 2g                           # Retained browser default for this release
    network_mode: bridge
    cap_add:
      - SYS_ADMIN                          # Current browser profile for this release; hardening is separate
      - SYS_PTRACE                         # Debugging-related capability
    security_opt:
      - seccomp=unconfined                 # Current browser profile for this release; hardening is separate
    ports:
      - "127.0.0.1:3001:3001"              # CloudCLI web UI, localhost only
    volumes:
      #
      # ./data/claude — Your settings, credentials, API keys, and Claude's memory.
      #                  This is what survives container rebuilds.
      #                  NEVER delete this folder — your auth lives here.
      #
      - ./data/claude:/home/claude/.claude
      #
      # ./workspace — Your code. All projects go here.
      #               Bind-mounted so you can access files from your host.
      #
      - ./workspace:/workspace
    environment:
      - TZ=UTC                             # Your timezone (e.g., America/New_York, Europe/London)
```

Then:

```bash
docker compose up -d
```

Open `http://localhost:3001`. Create a CloudCLI account. Sign in with your Anthropic account. Build something.

**That's the whole setup. You're done.**

> **Why these browser caps?** This release keeps HolyClaude's current browser container profile in place. Chromium does not universally require `SYS_ADMIN`, `SYS_PTRACE`, or `seccomp=unconfined`, and `SYS_PTRACE` is debugging-related. Keep the web UI bound to `127.0.0.1` unless you put a real private tunnel or access layer in front of it. Treat any hardening pass as a separate change.

> **Why `shm_size: 2g`?** Docker gives containers 64MB of shared memory by default. HolyClaude keeps 2GB as the retained browser default for this release because Chromium uses `/dev/shm` heavily for tab rendering. At 64MB, tabs crash randomly. For heavy browser use (many tabs, complex pages), increase to 4GB.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :whale2: Docker Compose — Full

Same image, every knob exposed. Copy this entire block into a `docker-compose.yaml` file:

```yaml
# ==============================================================================
# HolyClaude — Full Configuration
# All options documented inline.
# Detailed docs: https://github.com/CoderLuii/HolyClaude/blob/master/docs/configuration.md
# ==============================================================================

services:
  holyclaude:
    image: coderluii/holyclaude:latest     # Full image (use :slim for smaller download)
    container_name: holyclaude
    hostname: holyclaude
    restart: unless-stopped
    shm_size: 2g                           # Chromium shared memory — increase to 4g for heavy browser use
    network_mode: bridge
    cap_add:
      - SYS_ADMIN                          # Current browser profile for this release; hardening is separate
      - SYS_PTRACE                         # Debugging-related capability (strace, lsof)
    security_opt:
      - seccomp=unconfined                 # Current browser profile for this release; hardening is separate
    ports:
      #
      # CloudCLI web UI — this is the only port you need.
      # Override the host-side port from `.env` if 3001 is already in use.
      #
      - "127.0.0.1:${HOLYCLAUDE_HOST_PORT:-3001}:3001"
      #
      # Dev server ports — uncomment as needed.
      # These let you access dev servers running inside the container from your host browser.
      #
      # - "127.0.0.1:3000:3000"            # Next.js / Express
      # - "127.0.0.1:4321:4321"            # Astro
      # - "127.0.0.1:5173:5173"            # Vite
      # - "127.0.0.1:8787:8787"            # Wrangler (Cloudflare Workers)
      # - "127.0.0.1:9229:9229"            # Node.js debugger
      # - "127.0.0.1:1455:1455"            # Codex auth callback port
      # - "127.0.0.1:2222:22"              # Optional SSH, localhost/VPN only
      # - "127.0.0.1:60000-60010:60000-60010/udp"  # Optional Mosh UDP range
    volumes:
      #
      # PERSISTENT DATA
      #
      # ./data/claude — Settings, credentials, API keys, Claude's memory file.
      #                  Survives container rebuilds. NEVER delete this folder.
      #                  Override the host path from `.env` if you want it elsewhere.
      #
      - ${HOLYCLAUDE_HOST_CLAUDE_DIR:-./data/claude}:/home/claude/.claude
      #
      # ./workspace — Your code and projects. Everything you build goes here.
      #               Accessible from your host machine.
      #               Override the host path from `.env` if you want a different root.
      #
      - ${HOLYCLAUDE_HOST_WORKSPACE_DIR:-./workspace}:/workspace
      #
      # OPTIONAL SSH/MOSH REMOTE SHELL
      # Keep authorized_keys outside .claude and /workspace. Mount it read-only.
      #
      # - ./data/ssh/authorized_keys:/run/holyclaude-ssh/authorized_keys:ro
      # - holyclaude-ssh:/var/lib/holyclaude-ssh
    environment:
      #
      # TIMEZONE
      # Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
      #
      - TZ=UTC
      #
      # PERFORMANCE
      # Node.js heap memory limit in MB. Increase if you work on large monorepos
      # and hit out-of-memory errors. 4096 (4GB) is a solid default.
      #
      - NODE_OPTIONS=--max-old-space-size=4096
      #
      # USER MAPPING
      # Docker-style UID/GID remapping. Run `id -u` and `id -g` on your host.
      # Rootless Podman users should use docker-compose.podman-rootless.yaml instead.
      #
      - PUID=1000
      - PGID=1000
      #
      # SMB/CIFS NETWORK MOUNTS
      # Only enable these if your volumes are on a NAS, Samba share, or CIFS mount.
      # They enable polling-based file watching since network mounts don't support inotify.
      # Leave commented out for local storage — polling uses more CPU.
      #
      # - CHOKIDAR_USEPOLLING=1
      # - WATCHFILES_FORCE_POLLING=true
      #
      # NOTIFICATIONS (optional)
      # Get notified when Claude finishes a task or hits an error.
      # Uses Apprise — supports 100+ services. Also requires creating a flag file
      # inside the container: touch ~/.claude/notify-on
      #
      # - NOTIFY_DISCORD=discord://webhook_id/webhook_token
      # - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
      # - NOTIFY_PUSHOVER=pover://user_key@app_token
      # - NOTIFY_SLACK=slack://token_a/token_b/token_c
      # - NOTIFY_EMAIL=mailto://user:pass@gmail.com?to=you@gmail.com
      # - NOTIFY_GOTIFY=gotify://hostname/token
      # - NOTIFY_URLS=                                   # catch-all: comma-separated Apprise URLs
      #
      # AI PROVIDER KEYS (optional)
      # Claude Code can authenticate via web UI (OAuth) or ANTHROPIC_API_KEY.
      # Set these if you want to use additional AI CLIs or API-based auth.
      #
      # - GEMINI_API_KEY=your_key
      # - OPENAI_API_KEY=your_key
      # - CURSOR_API_KEY=your_key
      #
      # WEB UI BASE PATH (optional)
      # Use only when a reverse proxy mounts HolyClaude below a path.
      # Example: Tailscale Serve --set-path=/holyclaude
      # Do not add a trailing slash.
      #
      # - HOLYCLAUDE_BASE_PATH=/holyclaude
      #
      # CODEX PERMISSION MODES (optional)
      # CloudCLI Codex chat reads HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE at runtime.
      # Raw codex CLI reads HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE only when first creating ~/.codex/config.toml.
      # Valid values: default, acceptEdits, bypassPermissions. Recommended: acceptEdits.
      # bypassPermissions gives full access with no approval. Use it only for trusted local workspaces.
      #
      # - HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE=acceptEdits
      # - HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE=acceptEdits
      #
      # SSH/MOSH REMOTE SHELL (optional, disabled by default)
      # Keep this behind localhost, VPN, Tailscale, or a firewall.
      #
      # - HOLYCLAUDE_SSH_ENABLE=false
      # - HOLYCLAUDE_SSH_AUTHORIZED_KEYS=/run/holyclaude-ssh/authorized_keys
      # - HOLYCLAUDE_SSH_HOST_KEYS_DIR=/var/lib/holyclaude-ssh/host_keys
      # - HOLYCLAUDE_MOSH_ENABLE=false
      # - HOLYCLAUDE_MOSH_UDP_START=60000
      # - HOLYCLAUDE_MOSH_UDP_END=60010

# volumes:
#   holyclaude-ssh:
```

Then:

```bash
docker compose up -d
```

If you want to change the host-side port or bind-mount paths without editing compose, copy `.env.example` to `.env` and set:

```dotenv
HOLYCLAUDE_HOST_PORT=3003
HOLYCLAUDE_HOST_CLAUDE_DIR=./data/claude
HOLYCLAUDE_HOST_WORKSPACE_DIR=./workspace
```

These values are read by Docker Compose on the host. They are not container environment variables.

### What each section controls:

| Section | What it does | When to change it |
|---------|-------------|-------------------|
| **Timezone** | Container clock | Always — set to your local TZ |
| **Performance** | Node.js memory ceiling | Only if you hit OOM errors on large projects |
| **User mapping** | File permissions between container and host | Docker users: match `id -u` and `id -g`. Rootless Podman users: use the Podman compose file below. |
| **SMB/CIFS** | File watcher polling mode | Only if your volumes live on a NAS or network share |
| **Notifications** | Push alerts via Apprise (Discord, Telegram, Slack, Email, 100+ services) | If you want to walk away and know when your AI agents are done |
| **AI providers** | API keys for Gemini, Codex, Cursor, Junie, OpenCode | If you want to use AI CLIs other than Claude |

> **Every single environment variable is optional.** The container runs perfectly with just `TZ=UTC`. Everything else has sensible defaults or is handled through the web UI.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :wrench: Environment Variables

The complete reference. Every variable, what it defaults to, what it does.

| Variable | Default | What it does |
|----------|---------|--------------|
| `TZ` | `UTC` | Container timezone |
| `PUID` | `1000` | Container user ID for Docker-style UID/GID remapping |
| `PGID` | `1000` | Container group ID for Docker-style UID/GID remapping |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js heap memory limit in MB |
| `HOLYCLAUDE_BASE_PATH` | *(unset)* | Optional web UI subpath such as `/holyclaude` for Tailscale Serve `--set-path` or reverse proxies |
| `GIT_USER_NAME` | `HolyClaude User` | Git commit author (set once on first boot) |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git commit email (set once on first boot) |
| `CHOKIDAR_USEPOLLING` | *(unset)* | Set to `1` for SMB/CIFS — enables polling file watchers |
| `WATCHFILES_FORCE_POLLING` | *(unset)* | Set to `true` for SMB/CIFS — enables Python polling |
| `NOTIFY_DISCORD` | *(unset)* | Discord webhook URL for notifications |
| `NOTIFY_TELEGRAM` | *(unset)* | Telegram bot URL for notifications |
| `NOTIFY_PUSHOVER` | *(unset)* | Pushover URL for notifications |
| `NOTIFY_SLACK` | *(unset)* | Slack webhook URL for notifications |
| `NOTIFY_EMAIL` | *(unset)* | Email (SMTP) URL for notifications |
| `NOTIFY_GOTIFY` | *(unset)* | Gotify URL for notifications |
| `NOTIFY_URLS` | *(unset)* | Catch-all — comma-separated [Apprise URLs](https://github.com/caronc/apprise/wiki) |
| `ANTHROPIC_API_KEY` | *(unset)* | Anthropic API key (alternative to web UI OAuth) |
| `ANTHROPIC_AUTH_TOKEN` | *(unset)* | Anthropic auth token (alternative to API key, or set to `ollama` for Ollama) |
| `ANTHROPIC_BASE_URL` | *(unset)* | Custom Anthropic API endpoint (proxies, private deployments, or Ollama's Anthropic-compatible API) |
| `CLAUDE_CODE_USE_BEDROCK` | *(unset)* | Set to `1` to use Amazon Bedrock backend |
| `CLAUDE_CODE_USE_VERTEX` | *(unset)* | Set to `1` to use Google Vertex AI backend |
| `GEMINI_API_KEY` | *(unset)* | Google Gemini API key |
| `OPENAI_API_KEY` | *(unset)* | OpenAI API key (for Codex CLI, or use `codex login --device-auth` for ChatGPT subscription) |
| `CURSOR_API_KEY` | *(unset)* | Cursor API key |
| `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` | `acceptEdits` | CloudCLI Codex chat runtime mode. Valid: `default`, `acceptEdits`, `bypassPermissions` |
| `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE` | `default` | Raw `codex` CLI first-boot mode for new `~/.codex/config.toml` only. Valid: `default`, `acceptEdits`, `bypassPermissions` |
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | Optional Desloppify global skill setup. Valid: `off`, `all`, `claude`, `codex`, `gemini`, `opencode`, or comma-separated subsets |
| `HOLYCLAUDE_SSH_ENABLE` | `false` | Enables the optional `sshd` service when a safe `authorized_keys` mount is present |
| `HOLYCLAUDE_SSH_AUTHORIZED_KEYS` | `/run/holyclaude-ssh/authorized_keys` | Read-only public-key file for SSH login as `claude`; must not live under `.claude` or `/workspace` |
| `HOLYCLAUDE_SSH_HOST_KEYS_DIR` | `/var/lib/holyclaude-ssh/host_keys` | Root-owned SSH host key directory; mount `/var/lib/holyclaude-ssh` to keep fingerprints stable after recreate |
| `HOLYCLAUDE_MOSH_ENABLE` | `false` | Allows `mosh-server` for SSH sessions when UDP ports are mapped |
| `HOLYCLAUDE_MOSH_UDP_START` | `60000` | First UDP port Mosh may use |
| `HOLYCLAUDE_MOSH_UDP_END` | `60010` | Last UDP port Mosh may use |

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :rocket: What's Inside

This is not a minimal container. This is an entire development workstation.

### Both variants (full + slim)

<details>
<summary><strong>Node.js 26 + npm global packages</strong></summary>

| Package | What it's for |
|---------|---------------|
| `typescript`, `tsx` | TypeScript compilation and execution |
| `pnpm` | Fast, disk-efficient package manager |
| `vite`, `esbuild` | Lightning-fast build tools |
| `eslint`, `prettier` | Code quality and formatting |
| `serve`, `nodemon` | Static file server, auto-restart dev server |
| `concurrently` | Run multiple scripts in parallel |
| `dotenv-cli` | Load env vars from `.env` files |

</details>

<details>
<summary><strong>Python 3 packages</strong></summary>

| Package | What it's for |
|---------|---------------|
| `requests`, `httpx` | HTTP clients |
| `beautifulsoup4`, `lxml` | Web scraping and HTML parsing |
| `Pillow` | Image processing (pre-compiled — no waiting) |
| `pandas`, `numpy` | Data manipulation (pre-compiled — seriously, you don't want to pip install these at runtime) |
| `openpyxl` | Read/write Excel files |
| `python-docx` | Read/write Word documents |
| `jinja2`, `markdown` | Templating and markdown rendering |
| `pyyaml`, `python-dotenv` | Config file parsing |
| `rich`, `click`, `tqdm` | Beautiful CLIs and progress bars |
| `desloppify`, `bandit`, `tree-sitter` | Code-quality scans, Python security checks, parser-backed code analysis |
| `playwright` | Browser automation (Playwright 1.61.0, baked at build time) |

</details>

<details>
<summary><strong>System tools</strong></summary>

| Tool | What it's for |
|------|---------------|
| `git`, `gh` | Version control + GitHub CLI (PRs, issues, releases from the terminal) |
| `ripgrep` (`rg`), `fd`, `fzf` | Blazing-fast search — Claude uses these constantly |
| `bat`, `tree`, `jq` | Better cat (syntax highlighting), directory trees, JSON processing |
| `curl`, `wget` | HTTP downloads |
| `tmux` | Terminal multiplexer — run things in the background |
| `htop`, `lsof`, `strace` | Process monitoring and debugging |
| `imagemagick` | Image conversion (`convert`, `identify`, `mogrify`) |
| `chromium` | Headless browser — screenshots and Playwright; `/usr/bin/chromium` stays the supported wrapper |
| `psql`, `redis-cli`, `sqlite3` | Talk to databases directly |
| `openssh-client`, `openssh-server`, `mosh` | SSH out, and optional key-only SSH/Mosh access into the container |

</details>

<details>
<summary><strong>AI CLIs — core providers in both variants</strong></summary>

| CLI | Command | What it's for |
|-----|---------|---------------|
| **Claude Code** | `claude` | The main event — you're running inside this |
| **Gemini CLI** | `gemini` | Google's AI coding agent |
| **OpenAI Codex** | `codex` | OpenAI's coding agent |
| **Cursor** | `cursor` | Cursor's AI agent |
| **TaskMaster AI** | `task-master` | Task planning and orchestration |

Five AI CLIs ship in both full and slim. The full image adds Junie, OpenCode, and Pi below, for eight AI CLIs total.

</details>

### Full image only (additional packages)

The full image includes everything above, plus:

<details>
<summary><strong>Additional AI CLIs</strong></summary>

| CLI | Command | What it's for |
|-----|---------|---------------|
| **Junie** | `junie` | JetBrains' AI coding agent |
| **OpenCode** | `opencode` | Open source AI agent (OpenRouter and other providers) |
| **Pi Coding Agent** | `pi` | Minimal agent harness (multiple providers) |

</details>

<details>
<summary><strong>Additional npm packages — deployment, ORMs, performance</strong></summary>

| Package | What it's for |
|---------|---------------|
| `wrangler`, `@cloudflare/next-on-pages` | Cloudflare Workers deployment |
| `vercel` | Vercel deployment |
| `netlify-cli` | Netlify deployment |
| `az` | Azure CLI for cloud deployment and management |
| `prisma`, `drizzle-kit` | The two most popular Node.js ORMs |
| `pm2` | Production process manager |
| `eas-cli` | Expo / React Native builds |
| `lighthouse`, `@lhci/cli` | Performance auditing (full image only; Chromium is already there) |
| `sharp-cli` | Image processing CLI |
| `json-server`, `http-server` | Mock REST APIs, static file serving |
| `@marp-team/marp-cli` | Markdown to presentation slides |

</details>

<details>
<summary><strong>Additional Python packages — PDFs, data viz, web frameworks</strong></summary>

| Package | What it's for |
|---------|---------------|
| `reportlab`, `weasyprint`, `cairosvg`, `fpdf2`, `PyMuPDF`, `pdfkit`, `img2pdf` | Every major PDF library. Generate them, read them, convert them, merge them. |
| `xlsxwriter`, `xlrd` | Excel formats beyond what openpyxl covers |
| `matplotlib`, `seaborn` | Data visualization and charts |
| `python-pptx` | PowerPoint generation |
| `fastapi`, `uvicorn` | Python web framework |

</details>

<details>
<summary><strong>Additional system packages — media, documents</strong></summary>

| Package | What it's for |
|---------|---------------|
| `pandoc` | Convert between any document format (markdown, HTML, PDF, docx, epub...) |
| `ffmpeg` | Video and audio processing (extract, convert, transcode) |
| `libvips-dev` | High-performance image processing library |

</details>

> **Slim users:** Missing a package? Ask Claude. It installs npm/pip packages in seconds. System packages (pandoc, ffmpeg) take 1-2 minutes. You get the same capabilities — the full image just has zero wait time.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :robot: AI CLI Providers

The full image ships eight AI CLIs. The slim image ships the five core CLIs.

| Provider | Command | How to authenticate | Subscription works? |
|----------|---------|--------------------|--------------------|
| **Claude Code** | `claude` | CloudCLI web UI (OAuth) | **Yes** — Max/Pro plan or API key |
| **Gemini CLI** | `gemini` | `GEMINI_API_KEY` env var | API key (pay-per-use) |
| **OpenAI Codex** | `codex` | `OPENAI_API_KEY` or `codex login --device-auth` | **Yes** — ChatGPT Plus/Pro/Team/Enterprise or API key |
| **Cursor** | `cursor` | `CURSOR_API_KEY` env var | API key |
| **TaskMaster AI** | `task-master` | Uses existing AI provider keys | Works with configured keys |
| **Junie** | `junie` | JetBrains AI subscription | JetBrains account required, full image only |
| **OpenCode** | `opencode` | Configure via TUI | OpenRouter and other providers, full image only |
| **Pi Coding Agent** | `pi` | Configure through Pi | Supports multiple providers, full image only |

> Claude Code is the primary CLI. The others are there because sometimes you want a second opinion, or a specific model's strengths, or you're comparing outputs. Having all of them one `Tab` away is the whole point.

OpenCode is the full-image path for [OpenRouter](https://openrouter.ai/docs/cookbook/coding-agents/opencode-integration) and multi-provider model routing. Configure it inside `opencode`; free model availability depends on OpenRouter and provider account limits, not HolyClaude.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :mag: Desloppify

Desloppify ships in both images as the `desloppify` command. It is passive by default. HolyClaude does not run scans, create `.desloppify/`, edit `.gitignore`, or change your mounted workspace unless you run Desloppify yourself.

Use it inside a project:

```bash
desloppify scan --path .
desloppify next
```

After you use scans in a project, add `.desloppify/` to that project's `.gitignore`.

Optional global skill setup is controlled by `HOLYCLAUDE_DESLOPPIFY_SETUP`.

| Value | Behavior |
|-------|----------|
| `off` | Default. No global skill setup. The CLI is still installed. |
| `claude` | Runs `desloppify setup --interface claude` at container start. |
| `codex` | Runs `desloppify setup --interface codex` at container start. |
| `gemini` | Runs `desloppify setup --interface gemini` at container start. |
| `all` | Expands to `claude,codex,gemini`. |
| `claude,codex` | Any comma-separated subset of `claude`, `codex`, and `gemini`. |
| `opencode` | Full image only. Sets up the OpenCode-native global skill path. |

OpenCode can also discover Claude-compatible skills from `~/.claude/skills`, so `all` does not include `opencode`. Do not combine `claude` and `opencode` in automatic setup; HolyClaude warns and skips `opencode` to avoid duplicate skill discovery. If `OPENCODE_CONFIG_DIR` is set, HolyClaude also skips automatic OpenCode setup because Desloppify writes to the standard `~/.config/opencode` path.

Desloppify also supports these manual upstream targets if you want to configure them yourself: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, and `hermes`.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :llama: Using Ollama

HolyClaude works with [Ollama](https://ollama.com) as an alternative to an Anthropic subscription. The supported setup path is `ANTHROPIC_AUTH_TOKEN=ollama` plus `ANTHROPIC_BASE_URL=<your Ollama endpoint>`.

See the full setup guide: **[docs/ollama.md](docs/ollama.md)**

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :building_construction: Architecture

```mermaid
graph TB
    subgraph Docker Container
        EP["entrypoint.sh"] --> BS["bootstrap.sh\n(first boot only)"]
        EP --> S6["s6-overlay\n(PID 1)"]
        S6 --> CC["CloudCLI\n(:3001)"]
        S6 --> XV["Xvfb\n(:99)"]
        S6 -. optional .-> SSH["sshd\n(:22)"]
        CC --> CLAUDE["Claude Code CLI"]
        CLAUDE --> TOOLS["Dev Tools\n(Node, Python, Git...)"]
        CLAUDE --> CHROME["Chromium\n(headless)"]
        XV -.-> CHROME
    end

    subgraph Host
        DATA["./data/claude"] -.->|bind mount| HOME["~/.claude"]
        WS["./workspace"] -.->|bind mount| WORK["/workspace"]
    end

    USER["Browser"] -->|":3001"| CC

    style S6 fill:#2d3748,color:#fff
    style CC fill:#6366f1,color:#fff
    style CLAUDE fill:#f59e0b,color:#000
```

### How the pieces fit together

1. **Container starts** — `entrypoint.sh` runs as root for Docker and remaps UID/GID there. In rootless Podman keep-id mode, it skips root-only repairs because the container is already running as the target user. In both paths it restores the saved Claude Code session before bootstrap can touch it, and checks if this is a first boot.

2. **First boot only** — `bootstrap.sh` runs once. Copies default settings, memory template, configures git identity. Creates a sentinel file (`.holyclaude-bootstrapped`) so it never runs again. Your customizations are safe from that point on.

3. **s6-overlay takes over as PID 1** — This isn't supervisord. It's [s6-overlay](https://github.com/just-containers/s6-overlay), purpose-built for Docker. Supervises CloudCLI, Xvfb, Claude session sync, and optional `sshd` when you explicitly enable it. Auto-restarts on crash. Forwards signals. Reaps zombies. Shuts down gracefully.

4. **CloudCLI serves the web UI** — Port 3001. Browser-based interface to Claude Code with project management, multiple sessions, and plugins (project stats + web terminal included).

5. **Xvfb provides a compatibility display** — Xvfb stays available at `:99` for tools that use a headed display. Modern headless Chromium, Playwright, and Lighthouse do not universally require Xvfb.

See [docs/architecture.md](docs/architecture.md) for the full technical deep-dive — including why we chose s6 over supervisord, why plugins are baked into the image, and why `runuser` instead of `su`.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :file_folder: Project Structure

```
holyclaude/
├── .github/                 # CI/CD workflows, issue & PR templates
│   ├── FUNDING.yml          # Sponsor/donation links
│   ├── ISSUE_TEMPLATE/      # Bug report, feature request, package request
│   ├── pull_request_template.md
│   ├── SECURITY.md          # Security policy
│   └── workflows/           # Docker build & push automation
├── assets/                  # Logo and banner images
├── config/                  # Claude Code configuration
│   ├── claude-memory-full.md
│   ├── claude-memory-slim.md
│   └── settings.json
├── docs/                    # Extended documentation
│   ├── architecture.md
│   ├── CHANGELOG.md
│   ├── configuration.md
│   ├── dockerhub-description.md
│   ├── ollama.md
│   └── troubleshooting.md
├── scripts/                 # Container lifecycle scripts
│   ├── bootstrap.sh         # First-run setup
│   ├── entrypoint.sh        # Container entrypoint
│   └── notify.py            # Notification helper (Apprise)
├── s6-overlay/              # Process supervision (s6-rc services)
├── Dockerfile               # Single-stage build
├── docker-compose.yaml      # Quick start (minimal config)
├── docker-compose.full.yaml # Full config (all options)
├── docker-compose.podman-rootless.yaml # Rootless Podman keep-id profile
├── LICENSE
└── README.md
```

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :floppy_disk: Data & Persistence

| What | Where (container) | Where (host) | Survives rebuild? |
|------|-------------------|-------------|-------------------|
| Settings, credentials, API keys | `/home/claude/.claude` | `./data/claude` | **Yes** |
| Claude Code session (OAuth, onboarding) | `/home/claude/.claude.json` | `./data/claude/.claude.json.persist` | **Yes** |
| Your code and projects | `/workspace` | `./workspace` | **Yes** |
| CloudCLI account | `/home/claude/.cloudcli` | *(container only by default — see below)* | No (opt-in available) |

HolyClaude restores the saved Claude Code session before startup can create a fresh default file. That keeps container rebuilds and recreates from replacing a real OAuth/API session with onboarding state.

### What survives `docker compose down && docker compose up`:
- Your Anthropic authentication and API keys
- Claude Code settings, memory (`CLAUDE.md`), and OAuth session (no re-login)
- All your code in `./workspace`
- Git configuration
- Codex, Gemini, and Cursor CLI auth (since v1.1.7)

### What you'll redo (10 seconds):
- CloudCLI web account — quick signup, that's it (unless you opt into persistence below)

### Re-triggering first-boot setup:
```bash
# Delete the sentinel file — NOT the whole folder
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

> **Never delete `./data/claude/` entirely.** That's where your credentials live. Delete the sentinel file if you want a fresh bootstrap. Delete specific config files if you want to reset settings. But never nuke the whole folder.

### Persisting the CloudCLI account (optional, local storage only)

By default, the CloudCLI account database (`~/.cloudcli`) is container-local and gets wiped on rebuild. Re-creating the account takes 10 seconds, so most people leave it as-is.

If you want it to survive rebuilds, add a **named Docker volume** to your compose file:

```yaml
services:
  holyclaude:
    volumes:
      - ./data/claude:/home/claude/.claude
      - ./workspace:/workspace
      - cloudcli-data:/home/claude/.cloudcli   # add this line

volumes:
  cloudcli-data:                                # and this block
```

> **Do NOT bind-mount `./data/cloudcli` on a network share (NAS, SMB/CIFS, NFS).** CloudCLI stores its account in SQLite, and SQLite's file locking breaks on network mounts. You'll hit `database is locked` errors constantly. Named volumes live on the Docker engine's local filesystem, which is why this works — bind mounts pointing at a NAS will not.

A bind mount to a local SSD path is fine too, just keep it off any network share.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :lock: Permissions

Claude Code runs in **`acceptEdits`** mode by default. This is the shipped setting:

| Action | Allowed? |
|--------|----------|
| Read files | Yes |
| Edit / create files | Yes |
| Run shell commands | Depends on Claude Code's current permission prompt |
| Install packages | Depends on Claude Code's current permission prompt |

### Want full bypass? (power users)

This is how I personally run it. Edit `./data/claude/settings.json` on your host:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

> **Bypass mode means Claude executes commands without confirmation.** It is powerful, but it can also run destructive commands quickly. Keep the shipped `acceptEdits` default unless you trust the workspace and every prompt you run.

### Codex Permission Modes

HolyClaude also ships configurable near-parity permission modes for Codex, with separate controls for CloudCLI Codex chat and the raw `codex` CLI.

| Setting | Applies to | Default | When it is read |
|---------|------------|---------|-----------------|
| `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` | CloudCLI Codex chat in the browser | `acceptEdits` | Runtime container config, read by the CloudCLI Codex provider |
| `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE` | Raw `codex` CLI config at `~/.codex/config.toml` | `default` | First boot only, when the file does not already exist |

Valid values for both are `default`, `acceptEdits`, and `bypassPermissions`. `acceptEdits` is recommended. For CloudCLI Codex chat, the value is runtime container configuration, so changing it and recreating the container changes future chat runs. For the raw `codex` CLI, the value only seeds a new `~/.codex/config.toml`; existing configs are not overwritten, and the generated value persists until you edit that file yourself.

`bypassPermissions` maps Codex to full access with no approval. Inside Docker, that still runs within the container and mounted volumes, but it can read and change anything reachable through those mounts, especially `/workspace` and persisted config under `/home/claude`. Use it only for trusted local workspaces, and don't expose CloudCLI directly to the public internet.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :shield: Remote Access & Exposure

HolyClaude binds CloudCLI to `127.0.0.1:3001` by default. That keeps the web UI on the Docker host only, which is right for a laptop or a home server you reach over SSH.

**The moment you want to reach it from outside your network, read this section.**

### Don't port-forward it to the public internet

I'll say it flat out: do not punch a hole in your router and expose `3001` to the open internet. Not even with a password. Here's why:

- CloudCLI exposes a full shell through the web terminal plugin
- It can run arbitrary code, install packages, and read/write your mounted `/workspace`
- It holds your Anthropic OAuth tokens and API keys
- Basic auth / app-level passwords get brute-forced, credential-stuffed, and scraped out of logs
- One leaked password = someone else has a paid Claude Code instance running on your box with your money

A password is a speed bump, not a door. Treat HolyClaude like you'd treat an SSH session: never on the open internet without a proper tunnel in front of it.

### Use a proper tunnel instead

These are the two options I actually recommend:

| Option | Who it's for | Why |
|--------|-------------|-----|
| **[Tailscale](https://tailscale.com)** | Personal use, small teams | WireGuard mesh VPN. Install Tailscale on your server + your laptop/phone, and you reach `http://holyclaude:3001` from anywhere as if you were on the LAN. No ports opened, no DNS, no certs. Free for personal use. |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | Sharing with others, public hostname | Cloudflare proxies the connection, so port `3001` stays closed. You get a real domain with HTTPS, and you can put Cloudflare Access (Google/GitHub SSO) in front of it. Free tier covers most personal use. |

Both give you:
- Zero open ports on your router
- Encrypted transport end to end
- Real identity-based auth (not a shared password)
- Audit logs

### Tailscale subpath mounts

If you mount HolyClaude below a path, set the same path inside the container:

```yaml
environment:
  - HOLYCLAUDE_BASE_PATH=/holyclaude
```

Then publish that path with Tailscale Serve:

```bash
sudo tailscale serve --bg --https=443 --set-path=/holyclaude http://127.0.0.1:3001
```

Use no trailing slash in `HOLYCLAUDE_BASE_PATH`. If you serve HolyClaude at the hostname root, leave this unset.

### Optional SSH and Mosh

HolyClaude also ships `sshd` and Mosh for people who want a direct terminal from a phone, laptop, NAS, or VPN connection. It is off by default. Nothing listens on port `22` unless you enable it.

This is a remote shell into the same container that holds your `/workspace` and Claude state. Treat it like SSH to your dev box:

- key-only login as `claude`
- no password auth
- no root login
- no `authorized_keys` under `.claude` or `/workspace`
- no public internet port forwarding

Safe setup shape:

```yaml
services:
  holyclaude:
    ports:
      - "127.0.0.1:2222:22"
      - "127.0.0.1:60000-60010:60000-60010/udp"
    volumes:
      - ./data/ssh/authorized_keys:/run/holyclaude-ssh/authorized_keys:ro
      - holyclaude-ssh:/var/lib/holyclaude-ssh
    environment:
      - HOLYCLAUDE_SSH_ENABLE=true
      - HOLYCLAUDE_MOSH_ENABLE=true

volumes:
  holyclaude-ssh:
```

Prepare the public key file on the host:

```bash
mkdir -p data/ssh
cp ~/.ssh/id_ed25519.pub data/ssh/authorized_keys
```

Connect over SSH:

```bash
ssh -p 2222 claude@127.0.0.1
```

Connect over Mosh when UDP is reachable:

```bash
mosh --ssh="ssh -p 2222" -p 60000:60010 claude@127.0.0.1
```

Bind those ports to localhost, a VPN interface, or a firewall-restricted address. If you change `127.0.0.1` to `0.0.0.0`, you are taking responsibility for that exposure.

### If you insist on exposing it directly (please don't)

If you absolutely have to skip the tunnel (self-hosting tutorial, isolated lab network, whatever), at the very minimum:

1. **Put a reverse proxy in front of it** (Caddy, nginx, Traefik) with real TLS
2. **Add IP allowlisting** at the firewall or proxy level — only your known IPs
3. **Keep the shipped `acceptEdits` default** unless you have a clear reason to use `bypassPermissions`
4. **Rotate your Anthropic credentials** if anything looks off
5. **Run behind Cloudflare Access or similar SSO**, not basic auth

Even with all that, the risk surface is huge. Use Tailscale or Cloudflare Tunnel. They're free, they take five minutes to set up, and they're what I personally use.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :bell: Notifications

Walk away from your computer and know when a task is done. Claude Code hooks, raw CLI hooks for Codex and Gemini CLI, and CloudCLI Codex chat completion/failure events use the same [Apprise](https://github.com/caronc/apprise) setup. Apprise supports 100+ services including Discord, Telegram, Slack, Email, Pushover, Gotify, and more.

**To enable:**

1. Add one or more `NOTIFY_*` variables to your compose `environment`:
   ```yaml
   - NOTIFY_DISCORD=discord://webhook_id/webhook_token
   - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
   ```
2. Inside the container: `touch ~/.claude/notify-on`

Telegram uses Apprise's `tgram://` scheme. Legacy Telegram values are still accepted, but new setups should use `tgram://`.

Test the setup without sending a message:
```bash
docker compose exec holyclaude /usr/local/bin/notify.py test --dry-run --debug
```

See [configuration docs](docs/configuration.md#notifications-apprise) for all supported variables and URL formats.

**To disable:** `rm ~/.claude/notify-on`

**Events that trigger notifications:**
| Event | What happened |
|-------|--------------|
| `stop` | Claude Code hooks, raw CLI hooks for Codex and Gemini CLI, or a CloudCLI Codex chat run finished |
| `error` | A Claude Code hook, raw CLI hook, or CloudCLI Codex chat run failed |

> Completely silent when not configured. No `NOTIFY_*` vars set? No flag file? Zero network calls. Zero log spam. Zero overhead.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :arrows_counterclockwise: Upgrading

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d
```

Your data persists in `./data/claude` and `./workspace` — upgrading only replaces the container, not your files.

Do not update CloudCLI inside the container with `cloudcli update` or `npm install -g @cloudcli-ai/cloudcli@latest`. HolyClaude ships a patched CloudCLI runtime, so the supported update path is the Docker image:

```bash
docker compose pull && docker compose up -d
```

To pin a specific version instead of `latest`:

```yaml
image: coderluii/holyclaude:1.5.0   # instead of :latest
```

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :construction: Troubleshooting

<details>
<summary><strong>CloudCLI shows wrong default directory</strong></summary>

CloudCLI opens to `/home/claude` instead of `/workspace`.

**Cause:** A custom or modified CloudCLI service script did not set `WORKSPACES_ROOT=/workspace` before launching CloudCLI.

**Fix:** Already handled in HolyClaude. The s6 run script uses `with-contenv`, exports `WORKSPACES_ROOT=/workspace`, then starts CloudCLI as the `claude` user.
</details>

<details>
<summary><strong>CloudCLI says "Failed to browse filesystem"</strong></summary>

CloudCLI cannot open `~`, `/workspace`, or a broad NAS mount such as `/volume2/docker:/workspace`.

**Cause:** HolyClaude `1.3.3` could remove CloudCLI's `expandWorkspacePath` helper while disabling CloudCLI's in-container self-update path.

**Fix:** Update to HolyClaude `1.3.4` or newer:

```bash
docker compose pull && docker compose up -d
```

Broad NAS mounts work, but `/workspace` is the CloudCLI boundary. Anything readable under that mount is visible to authenticated CloudCLI users. Use a narrower project mount when you do not want the whole NAS folder tree exposed inside CloudCLI.
</details>

<details>
<summary><strong>CloudCLI Web Terminal shows black squares or missing characters</strong></summary>

The Web Terminal output is hard to read. Box drawing, emoji, CJK text, or CLI banners may show as black squares or broken characters.

**Cause:** Older images built the CloudCLI Web Terminal plugin with string-based PTY output handling and a narrow xterm.js font stack. If a multibyte character was split between PTY chunks, or if WebGL picked a weak fallback font, terminal output could render as replacement blocks.

**Fix:** Update to HolyClaude `1.3.5` or newer:

```bash
docker compose pull && docker compose up -d
```

HolyClaude now patches the baked Web Terminal plugin before it is built. If your browser still shows black squares after updating, open browser DevTools on the CloudCLI page, run this once, then reopen the Web Terminal:

```js
localStorage.setItem('web-terminal-disable-webgl', 'true')
```
</details>

<details>
<summary><strong>SQLite "database is locked"</strong></summary>

**Cause:** SQLite databases on SMB/CIFS network mounts. CIFS doesn't support the file-level locking SQLite requires.

**Fix:** Don't store SQLite databases on network shares. HolyClaude keeps `.cloudcli` in container-local storage for exactly this reason. If you have your own SQLite databases in `/workspace` on a NAS, move them to a local path.
</details>

<details>
<summary><strong>Chromium crashes / blank pages / tab failures</strong></summary>

**Cause:** Usually insufficient shared memory. Docker defaults to 64MB. If the process exits immediately with SIGTRAP or exit 133, treat that as a separate browser/runtime failure instead of a shared-memory symptom.

**Fix:** Ensure `shm_size: 2g` in your compose file. For heavy browser use (many tabs, complex pages), increase to `4g`. If you still get an immediate SIGTRAP, re-check the browser build path before only raising shm.
</details>

<details>
<summary><strong>File watchers not detecting changes (hot reload broken)</strong></summary>

**Cause:** SMB/CIFS network mounts don't support `inotify`.

**Fix:** Enable polling in your compose environment:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```
Note: Polling uses more CPU than inotify. Only enable on network mounts.
</details>

<details>
<summary><strong>Permission denied errors</strong></summary>

**Cause:** Container UID/GID doesn't match host file ownership.

**Fix for Docker:**
```bash
# On your host machine
id -u  # → this is your PUID
id -g  # → this is your PGID
```
Set them in your compose file:
```yaml
- PUID=1000
- PGID=1000
```

**Rootless Podman on SELinux:** `PUID`/`PGID` changes the container user, but rootless Podman still maps container IDs through your subordinate UID/GID range unless you use `keep-id`. Use the Podman profile instead:

```bash
mkdir -p data/claude workspace
podman compose -f docker-compose.podman-rootless.yaml up -d
```

That file uses `userns_mode: "keep-id:uid=1000,gid=1000"` and `:Z` labels. Do not add `:U` to `/workspace`; it rewrites host ownership and can make host editing worse.
</details>

<details>
<summary><strong>Docker creates .claude.json as a directory</strong></summary>

**Cause:** If a bind-mount target file doesn't exist before container start, Docker helpfully creates it as a directory. Thanks, Docker.

**Fix:** Already handled — `entrypoint.sh` restores the saved session file first, or creates a safe default file when no saved session exists.
</details>

See [docs/troubleshooting.md](docs/troubleshooting.md) for the complete guide including all SMB/CIFS gotchas and the full history of bugs we encountered and fixed.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :warning: Known Issues

These are not HolyClaude bugs — they're upstream issues or intentional trade-offs.

| Issue | Why | Workaround |
|-------|-----|------------|
| "Continue in Shell" button broken | CloudCLI upstream bug (race condition in terminal init) | Use the **Web Terminal** plugin instead (pre-installed) |
| Cursor CLI "Command timeout" | No API key configured — cosmetic only, doesn't affect anything | Set `CURSOR_API_KEY` or ignore |
| CloudCLI account lost on rebuild | SQLite can't persist on network mounts — intentional trade-off | Re-create account (~10 seconds) |
| Web push notifications "not supported" | Browser limitation in CloudCLI, standard behavior | Use Apprise notifications instead (see [Notifications](#bell-notifications)) |

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :hammer_and_wrench: Building Locally

Want to build the image yourself instead of pulling from Docker Hub? Go for it:

```bash
git clone https://github.com/CoderLuii/HolyClaude.git
cd holyclaude

# Build full image
docker build -t holyclaude .

# Build slim image
docker build --build-arg VARIANT=slim -t holyclaude:slim .

# Build for ARM (Apple Silicon, Raspberry Pi, AWS Graviton)
docker buildx build --platform linux/arm64 -t holyclaude .
```

This source release vendors the patched CloudCLI package under `vendor/artifacts/`, so `docker build` installs that bundled `@cloudcli-ai/cloudcli` tarball instead of downloading a moved package from npm.

Then use `image: holyclaude` instead of `image: coderluii/holyclaude:latest` in your compose file.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :bar_chart: Alternatives

How does HolyClaude compare to other approaches?

| Approach | Web UI | Multi-AI | Pre-configured tools | Headless browser | One command setup | Persistence |
|----------|--------|----------|---------------------|-----------------|-------------------|-------------|
| **HolyClaude** | CloudCLI | 8 CLIs | 50+ tools | Chromium + Xvfb + Playwright | `docker compose up` | Bind mounts |
| Claude Code (bare metal) | No | No | Install yourself | Install yourself | Multi-step install | Manual |
| Claude Code + oh-my-openagent | No | Yes (multi-model) | Some | No | npm install | Manual |
| DIY Docker + Claude Code | Maybe | Maybe | Whatever you add | If you configure it | If you write the Dockerfile | If you set up volumes |
| Cursor IDE | Built-in | Cursor only | IDE-bundled | No | Download app | App data |

HolyClaude isn't competing with coding agents — it's the **infrastructure layer** that makes them all work better. It's the container you run them inside.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :rocket: Roadmap

What's coming next:

| Status | Feature |
|--------|---------|
| 🔜 | **ARM-native builds** — optimized native ARM64 images, not just emulated |
| 🔜 | **VS Code tunnel integration** — built-in VS Code Server or tunnel for connecting from VS Code desktop |
| 🔜 | **Notification routing** — different notification destinations per event type (errors to Telegram, completions to Discord) |

Have an idea? [Start a discussion](https://github.com/CoderLuii/HolyClaude/discussions) or [request a feature](https://github.com/CoderLuii/HolyClaude/issues/new?template=feature_request.yml).

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :trophy: Built with HolyClaude

Using HolyClaude to build something? We'd love to see it.

Open an issue with the `showcase` label or submit a PR to add your project here:

<!-- Add your project: [Project Name](url) — one-line description -->

*Be the first to add your project here.*

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :handshake: Contributing

Contributions welcome. This project was born from real daily usage, and it gets better when more people use it and find edge cases.

1. Fork it
2. Branch it (`git checkout -b feature/something`)
3. Commit it
4. Push it
5. PR it

Bugs, feature requests, questions: [open an issue](https://github.com/CoderLuii/HolyClaude/issues).

### Get in touch

| Channel | Use for |
|---------|---------|
| [GitHub Discussions](https://github.com/CoderLuii/HolyClaude/discussions) | Questions, show your setup, ideas |
| [Issues](https://github.com/CoderLuii/HolyClaude/issues) | Bug reports, feature & package requests |
| [Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) | Vulnerability reports (private) |

### Want a tool added?

Use the [📦 Package Request](https://github.com/CoderLuii/HolyClaude/issues/new?template=package_request.yml) issue template. Include the package name, install method, and which variant (full/slim) it should target.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :heart: Support

HolyClaude is free, open source, and maintained by one developer who uses it every day.

If it saved you time, here's how you can help:

- **Star this repo** — it's the single biggest thing you can do for visibility
- **Share it** — tell a friend, post it, tweet it
- **Open issues** — bug reports and feature requests make HolyClaude better for everyone
- **Contribute** — PRs are always welcome

[![PayPal](https://img.shields.io/badge/Donate-PayPal-blue.svg)](https://www.paypal.com/donate/?hosted_button_id=PM2UXGVSTHDNL)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?style=flat&logo=buy-me-a-coffee)](https://buymeacoffee.com/CoderLuii)

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :scroll: Third-Party Software

The HolyClaude Docker image includes third-party software, each under its own license. Notable components:

| Component | License | Source |
|-----------|---------|--------|
| CloudCLI | AGPL-3.0-or-later | [CloudCLI](https://cloudcli.ai), [npm package](https://www.npmjs.com/package/@cloudcli-ai/cloudcli) |
| Desloppify | OSNL-0.2 | [peteromallet/desloppify](https://github.com/peteromallet/desloppify) |
| s6-overlay | ISC | [just-containers/s6-overlay](https://github.com/just-containers/s6-overlay) |
| Node.js | MIT | [nodejs/node](https://github.com/nodejs/node) |

See [THIRD-PARTY-NOTICES](THIRD-PARTY-NOTICES) for full details including modification notices. HolyClaude's own source code is MIT licensed.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

## :page_facing_up: License

MIT — see [LICENSE](LICENSE). Use it however you want.

<p align="right">
  <a href="#top">↑ back to top</a>
</p>

---

<!-- Star History -->
<div align="center">
<a href="https://star-history.com/#CoderLuii/HolyClaude&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=CoderLuii/HolyClaude&type=Date" width="600" />
  </picture>
</a>
</div>

---

<div align="center">

Built by [CoderLuii](https://github.com/coderluii) · [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

This container is what I use every day. If it saves you even half the setup time it saved me, a star would be nice.

</div>
