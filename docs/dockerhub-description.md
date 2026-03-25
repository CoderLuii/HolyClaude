# HolyClaude ⚡

**One command. Full AI development workstation.**

Claude Code, CloudCLI web UI, headless browser, 5 AI CLIs, 50+ dev tools — containerized and ready. You were going to spend 2 hours setting this up manually. Or you could just `docker compose up`.

[![Docker Pulls](https://img.shields.io/docker/pulls/coderluii/holyclaude?style=flat-square&logo=docker)](https://hub.docker.com/r/coderluii/holyclaude)
[![GitHub Stars](https://img.shields.io/github/stars/coderluii/holyclaude?style=flat-square&logo=github)](https://github.com/CoderLuii/HolyClaude)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://github.com/CoderLuii/HolyClaude/blob/main/LICENSE)

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
      - "3001:3001"
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

🤖 **5 AI CLIs** — Claude Code, Gemini CLI, OpenAI Codex, Cursor, TaskMaster AI

🌐 **CloudCLI Web UI** — Access your AI coding agents from any browser on port 3001

🖥️ **Headless Browser** — Chromium + Xvfb + Playwright, pre-configured for screenshots, testing, and automation

🛠️ **50+ Dev Tools** — Node.js 22, Python 3, TypeScript, git, GitHub CLI, database clients (PostgreSQL, SQLite, Redis), deployment CLIs (Vercel, Wrangler, Netlify), and more

⚙️ **s6-overlay v3** — Proper PID 1 process supervision with graceful shutdown and automatic service restarts

🔒 **Security** — UID/GID remapping via PUID/PGID, no credential proxying, everything stays local

## Image Variants

| Tag | Description | Size |
|-----|-------------|------|
| `latest` | Full image — everything pre-installed, zero wait | ~3 GB |
| `slim` | Core tools only — smaller download, extras install on demand | ~1.5 GB |
| `X.Y.Z` | Full image, pinned version | ~3 GB |
| `X.Y.Z-slim` | Slim image, pinned version | ~1.5 GB |

## Authentication

Works with your existing Anthropic account — no proxy, no middleman:

- **Claude Max/Pro plan** — OAuth sign-in through the web UI
- **Anthropic API key** — Paste it in the web UI

Credentials stored locally in your bind-mounted `./data/claude` directory. We don't touch them.

## Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TZ` | Timezone | `UTC` |
| `PUID` | Container user UID | `1000` |
| `PGID` | Container user GID | `1000` |
| `CHOKIDAR_USEPOLLING` | Enable polling for NAS/SMB mounts | unset |
| `NOTIFY_DISCORD` | Discord webhook URL for notifications | unset |
| `NOTIFY_TELEGRAM` | Telegram bot URL for notifications | unset |
| `NOTIFY_PUSHOVER` | Pushover URL for notifications | unset |
| `NOTIFY_SLACK` | Slack webhook URL for notifications | unset |
| `NOTIFY_URLS` | Catch-all Apprise notification URLs | unset |

## Volumes

| Path | Purpose |
|------|---------|
| `/home/claude/.claude` | Credentials, settings, Claude memory — **persist this** |
| `/workspace` | Your code and projects |

## Architecture

- `linux/amd64`
- `linux/arm64`

---

📖 **Full docs & troubleshooting:** [github.com/CoderLuii/HolyClaude](https://github.com/CoderLuii/HolyClaude)

🐛 **Issues & requests:** [github.com/CoderLuii/HolyClaude/issues](https://github.com/CoderLuii/HolyClaude/issues)

🌐 **Website:** [coderluii.dev](https://coderluii.dev)

Built by [CoderLuii](https://github.com/coderluii) 🧡
