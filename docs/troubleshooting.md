# Troubleshooting Guide

Solutions to common issues when running HolyClaude.

---

## Common Issues

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

**Cause:** Insufficient shared memory.

**Fix:** Ensure `shm_size: 2g` or higher in your docker-compose file. If running many concurrent tabs, increase to `4g`.

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

- `PUID`/`PGID` doesn't match your host user
- Docker auto-created `./workspace` as `root:root` on first start because the directory did not exist yet

**Fix:** Set `PUID` and `PGID` to match your host user:
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

HolyClaude v1.3.0 patches CloudCLI so successful Codex completion events include `exitCode: 0`.

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
