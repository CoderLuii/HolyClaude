# HolyClaude ⚡

**One command. Full AI development workstation.**

Claude Code, CloudCLI web UI, headless browser, 8 AI CLIs, Desloppify, 50+ dev tools — containerized and ready. You were going to spend 2 hours setting this up manually. Or you could just `docker compose up`.

[![Docker Pulls](https://img.shields.io/docker/pulls/coderluii/holyclaude?style=flat-square&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![GitHub Stars](https://img.shields.io/github/stars/coderluii/holyclaude?style=flat-square&logo=github)](https://github.com/CoderLuii/HolyClaude)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/CoderLuii/HolyClaude/blob/master/LICENSE)

## Quick Start

```yaml
services:
  holyclaude:
    image: coderluii/holyclaude:latest
    container_name: holyclaude
    restart: unless-stopped
    shm_size: 2g
    cap_add:
      - SYS_ADMIN
      - SYS_PTRACE
    security_opt:
      - seccomp=unconfined
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - ./data/claude:/home/claude/.claude
      - ./workspace:/workspace
    environment:
      - TZ=UTC
```

```bash
docker compose up -d
# Open http://localhost:3001
```

That's it. Open your browser, sign in, start building.

## What's Inside

🤖 **8 AI CLIs** — Claude Code, Gemini CLI, OpenAI Codex, Cursor, TaskMaster AI, Junie, OpenCode (OpenRouter/multi-provider), Pi Coding Agent

🌐 **CloudCLI Web UI** — Access your AI coding agents from your Docker host at `127.0.0.1:3001`

🖥️ **Headless Browser** — Chromium + Xvfb + Playwright, pre-configured for screenshots, testing, and automation

🛠️ **50+ Dev Tools** — Node.js 26, Python 3, TypeScript, git, GitHub CLI, database clients (PostgreSQL, SQLite, Redis), deployment CLIs (Vercel, Wrangler, Netlify, Azure), and more

🔎 **Desloppify included** — The `desloppify` CLI ships in both images. It is passive by default and only scans when you run it.

⚙️ **s6-overlay 3.2.3.0** — Proper PID 1 process supervision with graceful shutdown and automatic service restarts

🔒 **Security** — UID/GID remapping via PUID/PGID, no credential proxying, everything stays local

## Image Variants

| Tag | Description | Docker Hub compressed size |
|-----|-------------|----------------------------|
| `latest` | Full image — everything pre-installed, zero wait | ~4.0 GiB |
| `slim` | Core tools only — smaller download, extras install on demand | ~2.1 GiB |
| `X.Y.Z` | Full image, pinned version | Same as `latest` for that release |
| `X.Y.Z-slim` | Slim image, pinned version | Same as `slim` for that release |

Docker Hub reports compressed transfer size. Docker, Synology Container Manager, and NAS filesystems can report a larger unpacked size after layers are extracted. Use `slim` when disk space or bandwidth matters more than first-boot convenience.

## Authentication

Works with your existing Anthropic account — no proxy, no middleman:

- **Claude Max/Pro plan** — OAuth sign-in through the web UI
- **Anthropic API key** — Paste it in the web UI

Credentials are stored locally in your bind-mounted `./data/claude` directory. HolyClaude restores the saved Claude Code session before a fresh container file can replace it.

## Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TZ` | Timezone | `UTC` |
| `PUID` | Container user UID | `1000` |
| `PGID` | Container user GID | `1000` |
| `CHOKIDAR_USEPOLLING` | Enable polling for NAS/SMB mounts | unset |
| `NOTIFY_DISCORD` | Discord webhook URL for notifications | unset |
| `NOTIFY_TELEGRAM` | Telegram bot URL (`tgram://bot_token/chat_id`) | unset |
| `NOTIFY_PUSHOVER` | Pushover URL for notifications | unset |
| `NOTIFY_SLACK` | Slack webhook URL for notifications | unset |
| `NOTIFY_URLS` | Catch-all Apprise notification URLs | unset |

## Volumes

| Path | Purpose |
|------|---------|
| `/home/claude/.claude` | Credentials, settings, Claude memory, and the saved Claude Code session — **persist this** |
| `/workspace` | Your code and projects |

## Architecture

- `linux/amd64`
- `linux/arm64`

---

📖 **Full docs & troubleshooting:** [github.com/CoderLuii/HolyClaude](https://github.com/CoderLuii/HolyClaude)

🐛 **Issues & requests:** [github.com/CoderLuii/HolyClaude/issues](https://github.com/CoderLuii/HolyClaude/issues)

🌐 **Website:** [coderluii.dev](https://coderluii.dev)

Built by [CoderLuii](https://github.com/coderluii) 🧡
