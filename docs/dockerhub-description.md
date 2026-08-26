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
      - SYS_ADMIN   # Current browser profile for this release; hardening is separate
      - SYS_PTRACE  # Debugging-related capability
    security_opt:
      - seccomp=unconfined  # Current browser profile for this release; hardening is separate
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

🖥️ **Headless Browser** — Debian Chromium 151.0.7922.173 + Xvfb + Playwright 1.62.0, pinned at build time for screenshots, testing, and automation

📊 **Lighthouse** — Full image only

🛠️ **50+ Dev Tools** — Node.js 26, Python 3, TypeScript, git, GitHub CLI, database clients (PostgreSQL, SQLite, Redis), deployment CLIs (Vercel, Wrangler, Netlify, Azure), and more. Netlify deployment remains available; its optional local Go/Rust functions proxy is omitted because the current upstream binary uses an outdated Go runtime.

🔐 **Optional SSH/Mosh** — Key-only `sshd` and Mosh are installed in both variants, disabled by default, and meant for localhost/VPN/Tailscale access only

🔎 **Desloppify included** — The `desloppify` CLI ships in both images. It is passive by default and only scans when you run it.

⚙️ **s6-overlay 3.2.3.2** — Proper PID 1 process supervision with graceful shutdown and automatic service restarts

🔒 **Security** — Docker UID/GID remapping via PUID/PGID, rootless Podman keep-id profile, and no HolyClaude credential relay; bundled tools contact configured providers directly

## Image Variants

| Tag | Description | Docker Hub compressed size |
|-----|-------------|----------------------------|
| `latest` | Full image — everything pre-installed, zero wait | ~4.1 GB |
| `slim` | Core tools only — smaller download, extras install on demand | ~2.4 GB |
| `X.Y.Z` | Full image, pinned version | Same as `latest` for that release |
| `X.Y.Z-slim` | Slim image, pinned version | Same as `slim` for that release |

Docker Hub reports compressed transfer size. Docker, Synology Container Manager, and NAS filesystems can report a larger unpacked size after layers are extracted. Use `slim` when disk space or bandwidth matters more than first-boot convenience.

## Authentication

Works with your existing Anthropic account. HolyClaude operates no credential relay:

- **Claude Max/Pro plan** — OAuth sign-in through the web UI
- **Anthropic API key** — Paste it in the web UI

The default Compose files store Claude Code session data in the bind-mounted `./data/claude` directory. v1.5.5 also keeps global Git configuration and GitHub CLI authentication there, so they survive container replacement. Treat this directory as credential-bearing storage: do not commit it, share it broadly, or place it in an unencrypted backup. Other bundled tools may read credentials from their own container files, bind mounts, or environment variables and contact configured providers directly.

Before upgrading from a version earlier than v1.5.5, preserve any `git config --global` or `gh auth` state that exists only in the old container. Follow the [recovery steps](https://github.com/CoderLuii/HolyClaude/blob/master/docs/troubleshooting.md#git-identity-or-gh-auth-disappears-after-recreate) before running `docker compose up -d`; removing the old container first can discard that state.

## Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TZ` | Timezone | `UTC` |
| `PUID` | Docker-style container user UID | `1000` |
| `PGID` | Docker-style container user GID | `1000` |
| `CHOKIDAR_USEPOLLING` | Enable polling for NAS/SMB mounts | unset |
| `NOTIFY_DISCORD` | Discord webhook URL for notifications | unset |
| `NOTIFY_TELEGRAM` | Telegram bot URL (`tgram://bot_token/chat_id`) | unset |
| `NOTIFY_PUSHOVER` | Pushover URL for notifications | unset |
| `NOTIFY_SLACK` | Slack webhook URL for notifications | unset |
| `NOTIFY_URLS` | Catch-all Apprise notification URLs | unset |
| `HOLYCLAUDE_BASE_PATH` | Optional web UI subpath such as `/holyclaude` | unset |
| `HOLYCLAUDE_SSH_ENABLE` | Optional key-only SSH service | `false` |
| `HOLYCLAUDE_MOSH_ENABLE` | Optional Mosh UDP session support | `false` |

For rootless Podman on SELinux hosts, prepare every bind-mounted directory and use the rootless Compose file:

```bash
mkdir -p data/claude data/cloudcli workspace
podman compose -f docker-compose.podman-rootless.yaml up -d
```

The profile uses `userns_mode: "keep-id:uid=1000,gid=1000"` and `:Z` labels so host and container edits to `/workspace` stay under the same user. Do not add `:U` to `/workspace` unless you want Podman to rewrite host ownership for the container namespace.

## Reverse Proxy Subpaths

If Tailscale Serve or another proxy mounts HolyClaude below a path, pass the same path to the container:

```yaml
environment:
  - HOLYCLAUDE_BASE_PATH=/holyclaude
```

```bash
sudo tailscale serve --bg --https=443 --set-path=/holyclaude http://127.0.0.1:3001
```

Leave it unset for root-hostname serving.

## Volumes

| Path | Purpose |
|------|---------|
| `/home/claude/.claude` | Claude settings, file-based credentials stored there, Claude memory, and the saved Claude Code session — **persist this** |
| `/home/claude/.cloudcli` | Optional CloudCLI account database — use a local named volume |
| `/workspace` | Your code and projects |

HolyClaude prepares `.cloudcli` before the service starts. Fresh Docker volumes inherit the correct owner, and root-starting Docker repairs existing local-volume ownership to `PUID`/`PGID`. An unusable or read-only mount now stops startup with a direct remedy instead of repeating `unable to open database file`.

Keep this SQLite volume on local storage. Rootless Podman users should use the provided keep-id Compose file with `:Z`; `:U` rewrites host ownership and is not the default.

## Architecture

- `linux/amd64`
- `linux/arm64`

---

📖 **Full docs & troubleshooting:** [github.com/CoderLuii/HolyClaude](https://github.com/CoderLuii/HolyClaude)

🐛 **Issues & requests:** [github.com/CoderLuii/HolyClaude/issues](https://github.com/CoderLuii/HolyClaude/issues)

🌐 **Website:** [holyclaude.coderluii.dev](https://holyclaude.coderluii.dev)

Built by [CoderLuii](https://github.com/coderluii) 🧡
