# Architecture

Technical deep-dive into how HolyClaude works.

---

## Overview

HolyClaude is a single Docker container running multiple supervised services. The architecture is designed for reliability, persistence, and zero-configuration startup.

```
┌─────────────────────────────────────────────────┐
│                Docker Container                  │
│                                                  │
│  entrypoint.sh (runs once)                       │
│    ├── UID/GID remapping                         │
│    ├── Restore Claude session state              │
│    ├── bootstrap.sh (first boot only)            │
│    │     ├── Copy settings.json                  │
│    │     ├── Copy CLAUDE.md (memory)             │
│    │     ├── Configure git                       │
│    │     └── Create sentinel file                │
│    ├── Optional SSH/Mosh setup                   │
│    └── exec /init (s6-overlay)                   │
│                                                  │
│  s6-overlay (PID 1)                              │
│    ├── cloudcli (longrun)                        │
│    │     └── cloudcli --port 3001                │
│    ├── persist-claude-json (longrun)             │
│    │     └── save ~/.claude.json on start + 60s  │
│    ├── xvfb (longrun)                            │
│    │     └── Xvfb :99 -screen 0 1920x1080x24    │
│    └── sshd (optional longrun)                   │
│          └── /usr/sbin/sshd -D -e               │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Claude   │  │ Chromium │  │ Dev Tools    │   │
│  │ Code CLI │  │ headless │  │ Node, Python │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
│                                                  │
│  Bind Mounts:                                    │
│    ~/.claude ←→ ./data/claude (host)             │
│    /workspace ←→ ./workspace (host)              │
└─────────────────────────────────────────────────┘
```

---

## Component Details

### Entrypoint (`entrypoint.sh`)

Runs every time the container starts. Responsibilities:

1. **UID/GID remapping** — When the container starts as root, adjusts the `claude` user's UID/GID to match `PUID`/`PGID` environment variables. When rootless Podman starts the container as the target user with `userns=keep-id`, this root-only remap is skipped.

2. **Workspace ownership fix** — Repairs the top-level `/workspace` bind mount if Docker auto-created it as `root:root` on first start.

3. **Claude session restore** — Restores `~/.claude/.claude.json.persist` to `~/.claude.json` before bootstrap and CloudCLI startup can create a fresh default file. Empty, invalid, symlinked, oversized, or onboarding-only files are not allowed to replace a valid saved session.

4. **Bootstrap trigger** — Checks for sentinel file `.holyclaude-bootstrapped`. If absent, runs `bootstrap.sh`.

5. **Optional Desloppify setup** — Reads `HOLYCLAUDE_DESLOPPIFY_SETUP` after bootstrap and before s6 starts. Setup runs as the `claude` user and only writes global agent skill files for the requested interface. It does not scan `/workspace` or create project-level `.desloppify/` state.

6. **Optional SSH/Mosh setup** — Reads `HOLYCLAUDE_SSH_ENABLE` and only adds the `sshd` service to the s6 user bundle when a safe read-only `authorized_keys` file is mounted outside `.claude` and `/workspace`. Mosh is package-only until an SSH session launches `mosh-server`.

7. **Handoff** — `exec /init` replaces the entrypoint process with s6-overlay, which becomes PID 1.

The Claude session bridge is HolyClaude startup behavior. It does not update CloudCLI and does not replace the Docker update path.

### Bootstrap (`bootstrap.sh`)

Runs once on first container start. Creates the sentinel file so it doesn't re-run. Responsibilities:

1. **Settings** — Copies `settings.json` from the image to `~/.claude/settings.json`
2. **Memory** — Copies the variant-appropriate memory template (`claude-memory-full.md` or `claude-memory-slim.md`) to `~/.claude/CLAUDE.md`
3. **Git** — Configures git identity from `GIT_USER_NAME`/`GIT_USER_EMAIL` env vars
4. **Onboarding** — Uses the restored or default `~/.claude.json` created by the entrypoint session bridge
5. **Permissions** — Fixes file ownership to match `PUID`/`PGID` only when startup has root privileges

### s6-overlay

[s6-overlay](https://github.com/just-containers/s6-overlay) is a process supervisor designed for Docker containers. It's used instead of supervisord or systemd because:

- **Proper PID 1 behavior** — Handles signal forwarding and zombie reaping
- **Service supervision** — Restarts crashed services automatically
- **Clean shutdown** — Graceful stop signals to all services
- **Small footprint** — Minimal overhead

#### Important: Service environment

The CloudCLI service uses `#!/command/with-contenv sh`, so Docker Compose environment variables are available to the run script. The script still sets the service-critical values itself before dropping to the `claude` user, so CloudCLI always starts with the expected `HOME`, `WORKSPACES_ROOT`, and `NODE_OPTIONS` values.

### CloudCLI Service

```sh
#!/bin/sh
cd /workspace
export HOME=/home/claude
export WORKSPACES_ROOT=/workspace
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--no-deprecation"
if [ "$(id -u)" = "0" ]; then
  exec s6-setuidgid claude cloudcli --port 3001
fi
exec cloudcli --port 3001
```

- Runs as user `claude` in Docker, or as the already-mapped keep-id user in rootless Podman
- Sets `WORKSPACES_ROOT` directly so the web UI opens at `/workspace`
- `NODE_OPTIONS=--no-deprecation` suppresses noisy deprecation warnings
- Managed as a `longrun` service — auto-restarts on crash

### Claude Session Persistence Service

```sh
#!/command/with-contenv sh
while true; do
  node /usr/local/bin/persist-claude-json.mjs --save-live --quiet
  sleep "${HOLYCLAUDE_CLAUDE_JSON_SYNC_INTERVAL:-60}"
done
```

- Runs as an s6 `longrun`, not as a detached entrypoint background job
- Saves valid live `~/.claude.json` state to `~/.claude/.claude.json.persist` on service start and then every 60 seconds by default
- Refuses to replace a valid saved session with empty, invalid, symlinked, oversized, or onboarding-only state
- Keeps this bridge in HolyClaude startup/runtime logic, separate from CloudCLI update behavior

### Xvfb Service

```sh
#!/bin/sh
exec Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp
```

- Provides a compatibility display at `:99` (1920x1080, 24-bit color)
- Supports tools that use a headed display; modern headless Chromium, Playwright, and Lighthouse do not universally require Xvfb
- `-nolisten tcp` prevents remote X connections (security)

### Browser Runtime

v1.5.0 keeps the browser stack baked at build time:

- Playwright 1.61.0 is installed for both Node and Python
- Debian Chromium 150.0.7871.114 from Bookworm security is pinned in both image variants for `amd64` and `arm64`
- `/usr/bin/chromium` remains the supported wrapper, and `CHROME_PATH` / `PUPPETEER_EXECUTABLE_PATH` still point there
- Node Playwright, Python Playwright, and CloudCLI Browser Use launch that same wrapper instead of downloading a separate browser
- There is no runtime browser download
- Lighthouse ships in the full image only

Release inputs that do not have a package-manager lock are checked during the Docker build. Claude Code and Junie use exact supported versions, Cursor is bound to its installer hash and embedded build output, and s6-overlay and fzf are checked against upstream release checksums. Azure CLI and GitHub CLI also have pinned bootstrap inputs and installed package assertions. The release inventory in `security/immutable-inputs.yml` binds those values to v1.5.0 and expires the review instead of letting it silently age.

CloudCLI 1.36.2 is built inside the exact Node 26.5.0 image with npm 11.17.0; two package runs and two clean global installs must agree before its vendored artifact is accepted. Project Stats and Web Terminal are pinned by commit and installed with reviewed locks through `npm ci`. The full image keeps each npm package's existing esbuild JavaScript API, but rebuilds the retained 0.15.18, 0.18.20, and 0.25.12 native executables with Go 1.26.5.

Each full/slim and `amd64`/`arm64` candidate produces digest-bound CycloneDX, SPDX, and Grype files. The release evaluator requires every raw Critical match to resolve to exactly one current component review. OpenVEX is reserved for demonstrably unaffected code paths; vendor severity corrections stay in the review ledger. The raw reports, reviewed findings, mapped High findings, VEX, policy result, and digest metadata are uploaded as separate evidence so the published image index still contains exactly the two runtime platforms.

Earlier 1.4.7 passed native `amd64` and `arm64` browser runs with an unpinned apt package, and v1.4.8 moved to Playwright's packaged browser. v1.5.0 returns to Debian's browser only with the exact Bookworm security version pinned and checked during the build.

### Optional SSH Service

`sshd` is present in the image, but it is not in the s6 user bundle by default. The entrypoint adds it only when `HOLYCLAUDE_SSH_ENABLE=true` and the key file checks pass.

The runtime setup:

- rejects `authorized_keys` under `/home/claude/.claude`, `/home/claude`, or `/workspace`
- copies public keys from `/run/holyclaude-ssh/authorized_keys` into a root-owned `/etc/ssh/authorized_keys/claude`
- generates or reuses host keys under `/var/lib/holyclaude-ssh/host_keys`
- writes a hardened `sshd_config` with password auth and root login disabled

Mosh is not a daemon. The `mosh-server` wrapper reads `/run/holyclaude-ssh/mosh.env`, then launches the real server only when `HOLYCLAUDE_MOSH_ENABLE=true`.

---

## Design Decisions

### Why s6-overlay instead of supervisord?

s6-overlay is purpose-built for Docker. supervisord is a full process manager designed for bare-metal servers — it's heavier, requires XML configuration, and doesn't handle PID 1 responsibilities (signal forwarding, zombie reaping) out of the box.

### Why sentinel-based bootstrap instead of always running?

Bootstrap copies default settings and memory. Running it every time would overwrite user customizations. The sentinel pattern means:
- First boot: fresh defaults installed
- Subsequent boots: user's customizations preserved
- Manual re-trigger: delete sentinel file

### Why plugins baked into the image?

CloudCLI plugins require `git clone` + `npm install` + `npm run build`. Running this at container start (in bootstrap) is unreliable because:
- Bind mounts may be on network storage with permission issues
- Network may be unavailable at boot
- Adds 30+ seconds to every first boot

Baking them into the Dockerfile ensures a clean, controlled build environment.

HolyClaude also applies small fail-closed patches to the pinned plugins before
building them. The Web Terminal patch keeps PTY output UTF-8 safe, widens the
xterm.js font fallback stack, and adds the per-browser
`web-terminal-disable-webgl` escape hatch for renderer-specific glyph issues.

### Why `runuser` instead of `su`?

`su` uses PAM authentication, which can fail with renamed users (the base image's `node` user renamed to `claude`). `runuser` skips PAM entirely, so it is the Docker/root startup path for commands that need to run as `claude`. In rootless Podman keep-id mode, the entrypoint is already running as UID 1000, so the helper runs those commands directly instead of calling `runuser`.

### Why no `.env` file by default?

Every configuration option has a sensible default. Most users authenticate through the CloudCLI web UI, not environment variables. Requiring a `.env` file adds a setup step that most users don't need. Power users can use `docker-compose.full.yaml` which has all options documented inline.

### Why bind mounts instead of named volumes?

Bind mounts let users see and manage their data on disk. Named volumes hide data in Docker's internal storage, making backup and inspection harder. For a development workstation where users want to access their code and config files directly, bind mounts are the right choice.

---

## Image Variants

The `VARIANT` build arg controls which packages are installed:

```dockerfile
ARG VARIANT=full
```

The variant is stored at build time in `/etc/holyclaude-variant`. Bootstrap reads this file to copy the correct memory template.

| Variant | npm packages | pip packages | apt packages |
|---------|-------------|-------------|-------------|
| `full` | All | All | All |
| `slim` | Core only | Core only | No pandoc/ffmpeg/libvips |

See [What's Inside](../README.md#rocket-whats-inside) for the complete package lists.

---

## Multi-Architecture Support

The Dockerfile uses Docker's `TARGETARCH` build arg to download the correct s6-overlay binary:

```dockerfile
RUN S6_ARCH=$(case "$TARGETARCH" in arm64) echo "aarch64";; *) echo "x86_64";; esac)
```

Supported architectures:
- `amd64` (x86_64) — Intel/AMD servers, most VPS providers
- `arm64` (aarch64) — Apple Silicon, AWS Graviton, Raspberry Pi 4+

Build for a specific platform:
```bash
docker buildx build --platform linux/arm64 -t holyclaude .
```
