# Configuration Guide

Complete reference for all HolyClaude configuration options.

---

## Docker Compose Files

HolyClaude ships with two compose files:

| File | Purpose | Usage |
|------|---------|-------|
| `docker-compose.yaml` | Quick start — minimal config, just works | `docker compose up -d` |
| `docker-compose.full.yaml` | All options — ports, API keys, polling, notifications | `docker compose -f docker-compose.full.yaml up -d` |

---

## Environment Variables

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `UTC` | Container timezone ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `PUID` | `1000` | User ID — match your host user's UID (`id -u`) |
| `PGID` | `1000` | Group ID — match your host user's GID (`id -g`) |

### Performance

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js heap memory limit in MB |

### Git Identity

Set during first-boot bootstrap. To change after first boot, run `git config --global` inside the container.

| Variable | Default | Description |
|----------|---------|-------------|
| `GIT_USER_NAME` | `HolyClaude User` | Git commit author name |
| `GIT_USER_EMAIL` | `noreply@holyclaude.local` | Git commit author email |

### SMB/CIFS Network Mounts

Only needed if your volumes are on a network share (Samba, NAS, etc.):

| Variable | Default | Description |
|----------|---------|-------------|
| `CHOKIDAR_USEPOLLING` | (unset) | Set to `1` — enables polling for file watchers |
| `WATCHFILES_FORCE_POLLING` | (unset) | Set to `true` — enables polling for Python watchers |

### Notifications (Apprise)

HolyClaude uses [Apprise](https://github.com/caronc/apprise) for notifications, supporting 100+ services including Discord, Telegram, Slack, Email, Pushover, Gotify, and more.

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_DISCORD` | *(unset)* | Discord webhook — `discord://webhook_id/webhook_token` |
| `NOTIFY_TELEGRAM` | *(unset)* | Telegram bot — `tg://bot_token/chat_id` |
| `NOTIFY_PUSHOVER` | *(unset)* | Pushover — `pover://user_key@app_token` |
| `NOTIFY_SLACK` | *(unset)* | Slack webhook — `slack://token_a/token_b/token_c` |
| `NOTIFY_EMAIL` | *(unset)* | Email (SMTP) — `mailto://user:pass@gmail.com?to=you@gmail.com` |
| `NOTIFY_GOTIFY` | *(unset)* | Gotify — `gotify://hostname/token` |
| `NOTIFY_URLS` | *(unset)* | Catch-all — comma-separated [Apprise URLs](https://github.com/caronc/apprise/wiki) |

Notifications also require the flag file `~/.claude/notify-on` to exist inside the container. Create it with `touch ~/.claude/notify-on`.

**Migrating from Pushover (v1.0.0):** Replace `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` with a single variable: `NOTIFY_PUSHOVER=pover://user_key@app_token`

### AI Provider API Keys

These can also be set through the CloudCLI web UI.

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (unset) | Google Gemini API key |
| `OPENAI_API_KEY` | (unset) | OpenAI API key |
| `CURSOR_API_KEY` | (unset) | Cursor API key |

---

## Volumes

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./data/claude` | `/home/claude/.claude` | Settings, credentials, memory, API tokens |
| `./workspace` | `/workspace` | Your code and projects |

### What's inside `./data/claude`:

| File/Dir | Purpose |
|----------|---------|
| `settings.json` | Claude Code settings (permissions, hooks, model) |
| `CLAUDE.md` | Claude's global memory — customize with your preferences |
| `.credentials.json` | Anthropic API authentication (auto-created) |
| `.holyclaude-bootstrapped` | Sentinel file — delete to re-run first-boot setup |

---

## Ports

| Port | Service | Default State |
|------|---------|--------------|
| `3001` | CloudCLI web UI | Exposed |
| `3000` | Dev server (Next.js, Express) | Commented out |
| `4321` | Astro dev server | Commented out |
| `5173` | Vite dev server | Commented out |
| `8787` | Wrangler dev server | Commented out |
| `9229` | Node.js debugger | Commented out |

Uncomment additional ports in `docker-compose.full.yaml` as needed.

---

## Docker Capabilities

HolyClaude requires these Docker capabilities for Chromium to work:

```yaml
cap_add:
  - SYS_ADMIN      # Chromium sandboxing (namespaces)
  - SYS_PTRACE      # Debugging (strace, lsof)
security_opt:
  - seccomp=unconfined  # Chromium syscall requirements
```

These are standard for any Chromium-in-Docker setup. Without them, Chromium crashes on startup.

---

## Shared Memory

```yaml
shm_size: 2g
```

Chromium uses `/dev/shm` for shared memory. Docker defaults to 64MB, which causes tab crashes. 2GB is recommended for general use. Increase if running many concurrent browser tabs.

---

## Claude Code Settings

The default `settings.json` at `~/.claude/settings.json`:

```json
{
  "permissions": {
    "defaultMode": "allowEdits"
  },
  "env": {
    "DISABLE_AUTOUPDATER": "1"
  },
  "model": "sonnet"
}
```

### Permission Modes

| Mode | File edits | Shell commands | Use case |
|------|-----------|----------------|----------|
| `askUser` | Asks | Asks | Maximum safety |
| `allowEdits` | Allowed | Asks | **Default** — good balance |
| `bypassPermissions` | Allowed | Allowed | Power users only |

### Changing the Model

Edit `settings.json` and change `"model"`:
- `"sonnet"` — Claude Sonnet (default, fast)
- `"opus"` — Claude Opus (most capable)
- `"haiku"` — Claude Haiku (fastest, cheapest)

---

## Customizing Claude's Memory

Edit `~/.claude/CLAUDE.md` (or `./data/claude/CLAUDE.md` on the host) to customize Claude's behavior:

```markdown
# My Preferences
- Use TypeScript for all new files
- Default to pnpm, not npm
- Direct communication, no fluff
- Always run tests after changes
```

This file is read by Claude at the start of every conversation.

---

## Re-triggering First-Boot Setup

If you need to re-run the bootstrap (e.g., after updating the image):

```bash
# Delete the sentinel file — NOT the entire directory
rm ./data/claude/.holyclaude-bootstrapped

# Restart the container
docker compose restart holyclaude
```

**Warning:** Do NOT delete `./data/claude/` entirely — this wipes your credentials and you'll need to re-authenticate.
