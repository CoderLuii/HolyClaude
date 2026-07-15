# Configuration Guide

Complete reference for all HolyClaude configuration options.

---

## Docker Compose Files

HolyClaude ships with three compose files:

| File | Purpose | Usage |
|------|---------|-------|
| `docker-compose.yaml` | Quick start — minimal config, just works | `docker compose up -d` |
| `docker-compose.full.yaml` | All options — ports, API keys, polling, notifications | `docker compose -f docker-compose.full.yaml up -d` |
| `docker-compose.podman-rootless.yaml` | Rootless Podman on SELinux hosts with bidirectional workspace editing | `podman compose -f docker-compose.podman-rootless.yaml up -d` |

---

## Environment Variables

Docker Compose also supports a local `.env` file for variable interpolation. HolyClaude uses that in `docker-compose.full.yaml` for host-side port and bind-mount paths. These values are read by Compose on the host and are not passed into the container unless you also list them under `environment:`.

### Compose-Level Host Mappings

| Variable | Default | Description |
|----------|---------|-------------|
| `HOLYCLAUDE_HOST_PORT` | `3001` | Localhost port mapped to container port `3001` |
| `HOLYCLAUDE_HOST_CLAUDE_DIR` | `./data/claude` | Host path bind-mounted to `/home/claude/.claude` |
| `HOLYCLAUDE_HOST_WORKSPACE_DIR` | `./workspace` | Host path bind-mounted to `/workspace` |

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `UTC` | Container timezone ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `PUID` | `1000` | Docker-style container user ID remap. Rootless Podman users should use `docker-compose.podman-rootless.yaml`. |
| `PGID` | `1000` | Docker-style container group ID remap. Rootless Podman users should use `docker-compose.podman-rootless.yaml`. |

### Performance

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Node.js heap memory limit in MB |
| `HOLYCLAUDE_BASE_PATH` | *(unset)* | Optional web UI subpath such as `/holyclaude`. Use this only when a reverse proxy mounts HolyClaude below a path. No trailing slash. |

### Web UI Base Path

Leave `HOLYCLAUDE_BASE_PATH` unset when HolyClaude is served at the hostname root. Set it only when your proxy mounts the UI below a path.

```yaml
environment:
  - HOLYCLAUDE_BASE_PATH=/holyclaude
```

Tailscale Serve example:

```bash
sudo tailscale serve --bg --https=443 --set-path=/holyclaude http://127.0.0.1:3001
```

The value must start with `/` and must not end with `/`. HolyClaude keeps assets, API calls, WebSockets, service worker files, manifest icons, CSS assets, and deep links on that path.

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

### SSH and Mosh Remote Shell

SSH and Mosh are installed in both variants, but the server path is closed by default. Nothing listens on port `22` unless you set `HOLYCLAUDE_SSH_ENABLE=true` and mount a valid public-key file from a safe location.

Do not put SSH authorization files under `/home/claude/.claude`, `/home/claude`, or `/workspace`. Those paths are writable runtime state. Use a separate read-only mount.

| Variable | Default | Description |
|----------|---------|-------------|
| `HOLYCLAUDE_SSH_ENABLE` | `false` | Enables the optional `sshd` service |
| `HOLYCLAUDE_SSH_AUTHORIZED_KEYS` | `/run/holyclaude-ssh/authorized_keys` | Public-key file copied into a root-owned `AuthorizedKeysFile` path before `sshd` starts |
| `HOLYCLAUDE_SSH_HOST_KEYS_DIR` | `/var/lib/holyclaude-ssh/host_keys` | Root-owned host-key directory. Mount `/var/lib/holyclaude-ssh` to keep SSH fingerprints stable after recreate |
| `HOLYCLAUDE_MOSH_ENABLE` | `false` | Allows `mosh-server` for SSH sessions |
| `HOLYCLAUDE_MOSH_UDP_START` | `60000` | First UDP port Mosh may use |
| `HOLYCLAUDE_MOSH_UDP_END` | `60010` | Last UDP port Mosh may use |

Compose example:

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

Keep these ports bound to localhost, a VPN interface, Tailscale, or a firewall-restricted address. Public SSH/Mosh exposure is not a supported default.

### Rootless Podman

For Fedora or another SELinux host running rootless Podman, use:

```bash
mkdir -p data/claude workspace
podman compose -f docker-compose.podman-rootless.yaml up -d
```

That profile uses `userns_mode: "keep-id:uid=1000,gid=1000"` and `:Z` volume labels. `PUID` and `PGID` still document the intended container user, but they do not control Podman's host-visible subordinate UID mapping by themselves. Do not add `:U` to `/workspace` when you want to edit the same files from both the host and the container.

### Notifications (Apprise)

HolyClaude uses [Apprise](https://github.com/caronc/apprise) for notifications, supporting 100+ services including Discord, Telegram, Slack, Email, Pushover, Gotify, and more.

Claude Code hooks, raw CLI hooks for Codex and Gemini CLI, and CloudCLI Codex chat completion/failure events use this same Apprise setup. Permission prompts are not sent through Apprise.

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFY_DISCORD` | *(unset)* | Discord webhook — `discord://webhook_id/webhook_token` |
| `NOTIFY_TELEGRAM` | *(unset)* | Telegram bot — `tgram://bot_token/chat_id` |
| `NOTIFY_PUSHOVER` | *(unset)* | Pushover — `pover://user_key@app_token` |
| `NOTIFY_SLACK` | *(unset)* | Slack webhook — `slack://token_a/token_b/token_c` |
| `NOTIFY_EMAIL` | *(unset)* | Email (SMTP) — `mailto://user:pass@gmail.com?to=you@gmail.com` |
| `NOTIFY_GOTIFY` | *(unset)* | Gotify — `gotify://hostname/token` |
| `NOTIFY_URLS` | *(unset)* | Catch-all — comma-separated [Apprise URLs](https://github.com/caronc/apprise/wiki) |

Notifications also require the flag file `~/.claude/notify-on` to exist inside the container. Create it with `touch ~/.claude/notify-on`.

Telegram uses Apprise's `tgram://` scheme. Legacy Telegram values are normalized for compatibility, but new setups should use `tgram://`.

Validate notification setup without sending a message:
```bash
docker compose exec holyclaude /usr/local/bin/notify.py test --dry-run --debug
```

**Migrating from Pushover (v1.0.0):** Replace `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` with a single variable: `NOTIFY_PUSHOVER=pover://user_key@app_token`

### AI Provider API Keys

Claude Code can authenticate via web UI (OAuth) or `ANTHROPIC_API_KEY`. Other AI CLI keys can also be set through the web UI.

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (unset) | Anthropic API key (alternative to web UI OAuth) |
| `ANTHROPIC_AUTH_TOKEN` | (unset) | Anthropic auth token (alternative to API key). For Ollama, set this to `ollama` |
| `ANTHROPIC_BASE_URL` | (unset) | Custom Anthropic API endpoint (proxies, private deployments, or Ollama's Anthropic-compatible API) |
| `CLAUDE_CODE_USE_BEDROCK` | (unset) | Set to `1` to use Amazon Bedrock backend |
| `CLAUDE_CODE_USE_VERTEX` | (unset) | Set to `1` to use Google Vertex AI backend |
| `GEMINI_API_KEY` | (unset) | Google Gemini API key |
| `OPENAI_API_KEY` | (unset) | OpenAI API key |
| `CURSOR_API_KEY` | (unset) | Cursor API key |

OpenCode is configured from the full image with the `opencode` TUI. Use that path for [OpenRouter](https://openrouter.ai/docs/cookbook/coding-agents/opencode-integration) and other [OpenCode-supported providers](https://opencode.ai/docs/providers/). Free model availability depends on OpenRouter and provider account limits; HolyClaude does not proxy requests or guarantee zero-cost usage.

### Codex Permission Modes

HolyClaude provides configurable near-parity permission modes for Codex. These settings are intentionally split because CloudCLI Codex chat and the raw `codex` CLI read configuration through different paths.

| Variable | Default | Valid values | Applies to | Behavior |
|----------|---------|--------------|------------|----------|
| `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` | `acceptEdits` | `default`, `acceptEdits`, `bypassPermissions` | CloudCLI Codex chat | Runtime container config read by the CloudCLI Codex provider. Recreate the container after changing it. |
| `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE` | `default` | `default`, `acceptEdits`, `bypassPermissions` | Raw `codex` CLI | First-boot-only seed for new `~/.codex/config.toml`. Existing configs are not overwritten, and the generated value persists until you edit the file. |

`acceptEdits` is the recommended value for both settings. `bypassPermissions` gives Codex full access with no approval. Docker still limits access to the container and mounted volumes, but anything reachable through `/workspace`, `/home/claude`, and other mounts can be read or changed. Use bypass only for trusted local workspaces.

---

## Desloppify Setup

Desloppify is installed in both image variants as the `desloppify` command. It is passive by default. HolyClaude does not run scans, create `.desloppify/`, edit `.gitignore`, or touch mounted project files unless you run Desloppify yourself.

| Variable | Default | Valid values | Behavior |
|----------|---------|--------------|----------|
| `HOLYCLAUDE_DESLOPPIFY_SETUP` | `off` | `off`, `all`, `claude`, `codex`, `gemini`, `opencode`, comma-separated subsets | Optional global Desloppify skill setup at container start. `off` disables setup only; the CLI stays installed. |

Normal project usage stays manual:

```bash
desloppify scan --path .
desloppify next
```

After scanning a project, add `.desloppify/` to that project's `.gitignore`.

`all` expands to `claude,codex,gemini`. OpenCode is full-image only and must be requested as `opencode`. Do not combine `claude` and `opencode` in automatic setup because OpenCode can discover Claude-compatible skills from `~/.claude/skills`; HolyClaude warns and skips `opencode` in that case. If `OPENCODE_CONFIG_DIR` is set, HolyClaude also warns and skips automatic OpenCode setup because Desloppify writes to the standard `~/.config/opencode` path.

Manual upstream-supported setup targets are available through Desloppify itself: `cursor`, `copilot`, `windsurf`, `qwen`, `amp`, `rovodev`, `droid`, and `hermes`.

---

## Volumes

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./data/claude` | `/home/claude/.claude` | Settings, credentials, memory, API tokens |
| `./workspace` | `/workspace` | Your code and projects |
| `./data/ssh/authorized_keys` | `/run/holyclaude-ssh/authorized_keys` | Optional read-only SSH public keys file |
| `holyclaude-ssh` | `/var/lib/holyclaude-ssh` | Optional named volume for stable SSH host keys |

### What's inside `./data/claude`:

| File/Dir | Purpose |
|----------|---------|
| `settings.json` | Claude Code settings (permissions, hooks, model) |
| `CLAUDE.md` | Claude's global memory — customize with your preferences |
| `.credentials.json` | Anthropic API authentication (auto-created) |
| `.codex/config.toml` | Raw Codex CLI config, created on first boot if missing |
| `.holyclaude-bootstrapped` | Sentinel file — delete to re-run first-boot setup |

---

## Ports

| Port | Service | Default State |
|------|---------|--------------|
| `127.0.0.1:3001` | CloudCLI web UI | Exposed on the Docker host only |
| `127.0.0.1:2222 -> 22` | Optional SSH | Commented out |
| `127.0.0.1:60000-60010/udp` | Optional Mosh UDP range | Commented out |
| `3000` | Dev server (Next.js, Express) | Commented out |
| `4321` | Astro dev server | Commented out |
| `5173` | Vite dev server | Commented out |
| `8787` | Wrangler dev server | Commented out |
| `9229` | Node.js debugger | Commented out |
| `1455` | Codex auth callback | Commented out |

Uncomment additional ports in `docker-compose.full.yaml` as needed. Keep them bound to `127.0.0.1` unless you have a private tunnel or access proxy in front of them. If you use Codex's callback flow from your host browser, also uncomment `127.0.0.1:1455:1455`.

---

## Docker Capabilities

HolyClaude requires these Docker capabilities for Chromium to work:

```yaml
cap_add:
  - SYS_ADMIN      # Current browser profile; hardening is a separate pass
  - SYS_PTRACE      # Debugging-related capability
security_opt:
  - seccomp=unconfined  # Current browser profile; hardening is a separate pass
```

This is HolyClaude's retained browser profile for v1.5.0. `SYS_ADMIN` and `seccomp=unconfined` broaden process privileges and reduce isolation; `SYS_PTRACE` is debugging-related. They are not universal Chromium requirements. Keep the profile for trusted workloads in this release and test any hardening change separately.

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
    "defaultMode": "acceptEdits"
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
| `acceptEdits` | Allowed | Depends on Claude Code's current prompt behavior | **Default** — shipped setting |
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
