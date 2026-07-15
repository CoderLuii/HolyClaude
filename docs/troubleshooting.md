# Troubleshooting Guide

Solutions to common issues when running HolyClaude.

---

## Common Issues

### Web UI breaks under a Tailscale or reverse-proxy subpath

**Symptom:** Serving at root works, but a path mount such as `/holyclaude` loads a broken page or requests `/assets`, `/api`, `/ws`, `/shell`, `/sw.js`, or `/manifest.json` from the hostname root.

**Cause:** The proxy mounted HolyClaude under a path, but the container was not told which base path to use.

**Fix:** Set the base path and recreate the container:

```yaml
environment:
  - HOLYCLAUDE_BASE_PATH=/holyclaude
```

Then publish the same path through Tailscale Serve:

```bash
sudo tailscale serve --bg --https=443 --set-path=/holyclaude http://127.0.0.1:3001
```

Do not add a trailing slash. If you serve HolyClaude at the hostname root, leave `HOLYCLAUDE_BASE_PATH` unset.

---

### SSH does not start

**Symptom:** `HOLYCLAUDE_SSH_ENABLE=true` is set, but port `22` is not listening inside the container.

**Cause:** SSH fails closed when the public-key file is missing, empty, writable by `claude`, or mounted from an unsafe path such as `/home/claude/.claude` or `/workspace`.

**Fix:** Mount a separate read-only public-key file:
```yaml
volumes:
  - ./data/ssh/authorized_keys:/run/holyclaude-ssh/authorized_keys:ro
environment:
  - HOLYCLAUDE_SSH_ENABLE=true
```

Create it from a public key, not a private key:
```bash
mkdir -p data/ssh
cp ~/.ssh/id_ed25519.pub data/ssh/authorized_keys
```

Then recreate the container:
```bash
docker compose up -d
```

---

### Mosh connects over SSH but cannot reach the session

**Symptom:** SSH works, but Mosh hangs after authentication or reports that it cannot contact the server.

**Cause:** Mosh uses SSH to start `mosh-server`, then switches to UDP. The default HolyClaude example uses UDP `60000-60010`. If that range is not mapped and reachable, the SSH part can work while the Mosh session cannot.

**Fix:** Enable Mosh and map the UDP range:
```yaml
ports:
  - "127.0.0.1:2222:22"
  - "127.0.0.1:60000-60010:60000-60010/udp"
environment:
  - HOLYCLAUDE_SSH_ENABLE=true
  - HOLYCLAUDE_MOSH_ENABLE=true
```

Connect with the same range:
```bash
mosh --ssh="ssh -p 2222" -p 60000:60010 claude@127.0.0.1
```

Keep the UDP range behind localhost, VPN, Tailscale, or a firewall rule.

---

### SSH host key changed after container recreate

**Symptom:** Your SSH client warns that the host identification changed.

**Cause:** SSH host keys live in `/var/lib/holyclaude-ssh/host_keys`. If that path is not backed by a named volume or bind mount, recreating the container can generate new host keys.

**Fix:** Add the SSH state volume:
```yaml
volumes:
  - holyclaude-ssh:/var/lib/holyclaude-ssh

volumes:
  holyclaude-ssh:
```

If the old container was trusted and expected to be replaced, remove the old host key from your SSH client's `known_hosts` entry for that host and port.

---

### CloudCLI shows wrong default directory

**Symptom:** CloudCLI web UI opens to `/home/claude` instead of `/workspace`.

**Cause:** A custom or modified CloudCLI service script did not set `WORKSPACES_ROOT=/workspace` before launching CloudCLI.

**Fix:** Already handled in HolyClaude. The s6 run script uses `with-contenv`, exports `WORKSPACES_ROOT=/workspace`, then starts CloudCLI as the `claude` user. If you've modified the s6 service scripts, keep that export before the `cloudcli --port 3001` command.

---

### CloudCLI says "Failed to browse filesystem"

**Symptom:** The CloudCLI folder picker cannot open `~`, `/workspace`, or a broad NAS mount such as `/volume2/docker:/workspace`.

**Cause:** HolyClaude `1.3.3` could remove CloudCLI's `expandWorkspacePath` helper while disabling CloudCLI's in-container self-update path. That left the patched runtime calling a helper that was no longer defined.

**Fix:** Update to HolyClaude `1.3.4` or newer:
```bash
docker compose pull
docker compose up -d
```

Broad NAS mounts are supported, but remember that `/workspace` is the CloudCLI boundary. Anything readable under that mount is visible to authenticated CloudCLI users. Prefer a narrower project mount when you do not want the whole NAS folder tree exposed inside CloudCLI.

---

### CloudCLI Web Terminal shows black squares or missing characters

**Symptom:** The Web Terminal is unreadable. Box drawing, emoji, CJK text, or CLI banners show as black squares, missing letters, or broken characters.

**Cause:** Older HolyClaude images built the CloudCLI Web Terminal plugin with string-based PTY output handling and a narrow xterm.js font stack. Split multibyte PTY chunks could reach the browser as malformed text, and WebGL glyph rendering could still choose a weak fallback font.

**Fix:** Update to HolyClaude `1.3.5` or newer:
```bash
docker compose pull
docker compose up -d
```

HolyClaude now patches the baked Web Terminal plugin before build so PTY output is decoded from raw UTF-8 bytes and xterm.js gets explicit terminal font fallbacks.

If the updated image still shows black squares in one browser, disable the WebGL terminal renderer for that browser profile:
```js
localStorage.setItem('web-terminal-disable-webgl', 'true')
```

Then close and reopen the Web Terminal tab. This keeps the Docker image the same; it only changes the renderer preference stored by your browser for CloudCLI.

---

### SQLite "database is locked" errors

**Symptom:** Constant lock errors from CloudCLI account database or other SQLite databases.

**Cause:** SQLite uses file-level locking that CIFS/SMB doesn't support properly.

**Fix:** Don't store SQLite databases on network mounts. HolyClaude keeps `.cloudcli` in container-local storage for this reason. If you're using your own SQLite databases in `/workspace` on a network mount, move them to a local path.

> If you want the CloudCLI account to persist across rebuilds, use a **named Docker volume** for `/home/claude/.cloudcli` (see the README's Data & Persistence section). Named volumes live on the Docker engine's local filesystem, so SQLite file locking works. Never bind-mount `.cloudcli` to a NAS, SMB, or NFS path.

---

### Chromium crashes or blank pages

**Symptom:** Playwright tests fail, screenshots are blank, Lighthouse hangs.

**Cause:** Usually insufficient shared memory. Docker defaults to 64MB. If the process exits immediately with SIGTRAP or exit 133, treat that as a separate browser/runtime failure instead of a shared-memory symptom.

**Fix:** Ensure `shm_size: 2g` or higher in your docker-compose file. If running many concurrent tabs, increase to `4g`. If you still get an immediate SIGTRAP, re-check the browser build path before only raising shm.

In `v1.5.0`, direct Chromium, Node Playwright, Python Playwright, and CloudCLI Browser Use all use the pinned Debian Chromium security build baked into the image. `/usr/bin/chromium` is the supported command; a runtime `playwright install` is not part of the repair path.

---

### File watchers not detecting changes

**Symptom:** Hot reload doesn't work. Dev servers don't pick up file changes.

**Cause:** Running on SMB/CIFS mounts which don't support `inotify`.

**Fix:** Add polling environment variables:
```yaml
environment:
  - CHOKIDAR_USEPOLLING=1
  - WATCHFILES_FORCE_POLLING=true
```

Note: Polling uses more CPU than inotify. Only enable when needed.

---

### Telegram notifications do not arrive

**Symptom:** `notify-on` exists and `NOTIFY_TELEGRAM` is set, but no Telegram message arrives.

**Cause:** Telegram uses Apprise's `tgram://` URL scheme. Older HolyClaude docs showed a shorter Telegram scheme that Apprise rejects.

**Fix:** Use the current Telegram format:
```yaml
environment:
  - NOTIFY_TELEGRAM=tgram://bot_token/chat_id
```

Legacy Telegram values are normalized for compatibility, but `tgram://` is the supported format for new setups.

Check the setup without sending a message:
```bash
docker compose exec holyclaude /usr/local/bin/notify.py test --dry-run --debug
```

If the dry run passes but Telegram still does not receive the real test, run the same command without `--dry-run`, then check the bot token, chat ID, and container network access.

---

### Permission denied errors

**Symptom:** Can't write files, `git` operations fail, npm install fails.

**Cause:** Usually one of these:

- Docker-style `PUID`/`PGID` doesn't match your host user
- Docker auto-created `./workspace` as `root:root` on first start because the directory did not exist yet

**Fix for Docker:** Set `PUID` and `PGID` to match your host user:
```bash
# On your host, check your IDs
id -u  # This is your PUID
id -g  # This is your PGID
```

Then in your compose file:
```yaml
environment:
  - PUID=1000
  - PGID=1000
```

HolyClaude also auto-fixes the top-level `/workspace` ownership on boot if Docker created it as root. If you still have permission errors after startup, the remaining mismatch is in your host files, not the container's workspace mount point.

**Fix for rootless Podman on SELinux:** Use the Podman compose profile:
```bash
mkdir -p data/claude workspace
podman compose -f docker-compose.podman-rootless.yaml up -d
```

Rootless Podman maps container IDs through `/etc/subuid` and `/etc/subgid` by default, so `PUID=1000` does not guarantee host-visible UID `1000`. The Podman profile uses `userns_mode: "keep-id:uid=1000,gid=1000"` and `:Z` labels so host and container edits both work under the same user. Keep `:Z`; it handles SELinux labeling. Do not add `:U` to `/workspace`; it recursively rewrites host ownership for the container namespace and can make normal host editing fail.

On Synology, QNAP, SMB/CIFS, and some NFS mounts, `chmod` and `chown` from inside the container may be ignored by the host filesystem. Use the NAS share settings, mount options, or matching `PUID`/`PGID` values to make `./data/claude` and `./workspace` writable.

---

### `rm -rf *` doesn't delete dotfiles

**Symptom:** Bootstrap sentinel (`.holyclaude-bootstrapped`) survives deletion, so bootstrap never re-runs.

**Cause:** Bash glob `*` doesn't match dotfiles (files starting with `.`).

**Fix:** Target the sentinel directly:
```bash
rm ./data/claude/.holyclaude-bootstrapped
```

Never delete the entire `./data/claude/` directory — this wipes your credentials.

---

### Docker creates `.claude.json` as a directory

**Symptom:** Claude Code CLI crashes on startup with cryptic errors.

**Cause:** If the bind-mount target doesn't exist as a file before container start, Docker creates it as a directory.

**Fix:** Already handled in `entrypoint.sh` — it restores the saved session file first, or creates a safe default file when no saved session exists. If you're running a custom setup, ensure `~/.claude.json` is a file and keep the durable copy in `~/.claude/.claude.json.persist`.

---

### Claude Code asks to re-login after rebuild

**Symptom:** After `docker compose down && up`, Claude Code prompts for OAuth / API key again.

**Cause:** Versions before v1.3.6 could let a fresh container default file overwrite the saved `~/.claude/.claude.json.persist` copy before restore happened.

**Fix:** Upgrade to v1.3.6 or later:
```bash
docker compose pull
docker compose up -d
```

HolyClaude now restores `./data/claude/.claude.json.persist` before startup can create a fresh default file. It also refuses to replace a valid saved session with empty, invalid, or onboarding-only state.

If you still lose the session, check that `./data/claude/` is writable by the container user. On Synology, QNAP, SMB/CIFS, or other NAS-backed mounts, Unix permission changes from inside the container are best effort. Fix the host share ownership or set `PUID`/`PGID` to match the account that owns the mounted folder.

---

### Claude Code installer hangs during build

**Symptom:** `curl -fsSL https://claude.ai/install.sh | bash` hangs indefinitely during `docker build`.

**Cause:** Installer prompts or behaves differently when WORKDIR is root-owned.

**Fix:** Already handled in the Dockerfile — `WORKDIR /workspace` and `USER claude` are set before the installer runs.

---

### Bootstrap doesn't re-run after image update

**Symptom:** New settings/memory from updated image aren't applied.

**Cause:** Sentinel file `.holyclaude-bootstrapped` exists, so bootstrap is skipped.

**Fix:**
```bash
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

---

### CloudCLI self-update is blocked

**Symptom:** `cloudcli update`, the web UI update button, or a manual npm global install tries to replace the CloudCLI files inside the container.

**Cause:** HolyClaude ships a patched `@cloudcli-ai/cloudcli` runtime. Replacing it from inside the running container can remove the HolyClaude patches and leave source/runtime paths mismatched. Older images could fail with:
```text
Cannot find package '@/shared' imported from .../@cloudcli-ai/cloudcli/server/index.js
```

**Fix:** Recreate the container from the HolyClaude image and use Docker for updates:
```bash
docker compose pull
docker compose up -d
```

Do not run `cloudcli update` or `npm install -g @cloudcli-ai/cloudcli@latest` inside the container. HolyClaude disables that self-update path so the patched CloudCLI runtime stays intact.

---

### Codex chat returns to `new session`

**Symptom:** A new Codex chat creates the session and sends the first prompt, then CloudCLI returns to the `new session` view a few seconds later. Reopening the created session manually still works.

**Cause:** Older images could receive a successful Codex completion event without an explicit success exit code. That left the first-turn session finalization path different from Claude, Cursor, and Gemini.

**Fix:** Update HolyClaude with Docker:
```bash
docker compose pull
docker compose up -d
```

HolyClaude keeps a Docker-build CloudCLI patch for this path. In v1.4.4 that guard also covers CloudCLI 1.36.x provider-normalized `turn_complete` events, so successful Codex turns include explicit `exitCode: 0`, `success: true`, and `aborted: false` fields.

---

### Desloppify setup warns and skips a target

**Symptom:** Container startup logs show a Desloppify warning for `opencode`, an invalid target, or `OPENCODE_CONFIG_DIR`.

**Cause:** `HOLYCLAUDE_DESLOPPIFY_SETUP` only configures global skill files. HolyClaude skips unsafe or unavailable targets instead of blocking startup.

**Fix:** Use one of the supported values:
```yaml
environment:
  - HOLYCLAUDE_DESLOPPIFY_SETUP=all
```

`all` means `claude,codex,gemini`. OpenCode is full-image only and must be requested as `opencode`. Do not combine `claude` and `opencode`; OpenCode can already discover Claude-compatible skills from `~/.claude/skills`, so HolyClaude skips `opencode` to avoid duplicate skill discovery.

Desloppify itself remains installed. Run scans manually from a project:
```bash
desloppify scan --path .
desloppify next
```

After scanning, add `.desloppify/` to that project's `.gitignore`.

---

## SMB/CIFS Gotchas

If your volumes are on a Samba/CIFS network share (common with Hyper-V VMs, NAS devices):

### No inotify support

File watchers must use polling:
```yaml
- CHOKIDAR_USEPOLLING=1
- WATCHFILES_FORCE_POLLING=true
```

### No symlinks (without `mfsymlinks`)

npm global installs and Python `.local` can break. This is why HolyClaude keeps `.npm` and `.local` in container-local storage — don't mount them on network shares.

If you need symlinks on CIFS, add `mfsymlinks` to your mount options:
```
//server/share /mnt/share cifs mfsymlinks,... 0 0
```

### SQLite file locking fails

Any SQLite database on CIFS will get "database is locked" errors. Keep SQLite databases on local storage.

### No Unix permissions

`chmod`/`chown` can silently succeed but not actually change permissions on CIFS. Use `uid=`, `gid=`, `file_mode=`, and `dir_mode=` in mount options, or fix the NAS share owner/group directly.

---

## Getting Help

If your issue isn't covered here:

1. Check the [GitHub Issues](https://github.com/CoderLuii/HolyClaude/issues) for existing reports
2. Open a new issue with:
   - Your docker-compose file (redact API keys)
   - Output of `docker logs holyclaude`
   - What you expected vs what happened
