# Contributing to HolyClaude

Contributions welcome. Here's how.

## Process

1. Fork it
2. Branch it (`git checkout -b feature/something`)
3. Commit it (clear messages, no AI attribution)
4. Push it (`git push origin feature/something`)
5. PR it

## Development Setup

Build locally:

```bash
# Full variant (default)
docker build -t holyclaude .

# Slim variant
docker build --build-arg VARIANT=slim -t holyclaude:slim .
```

Then swap the image in your compose file:

```yaml
image: holyclaude          # instead of coderluii/holyclaude:latest
```

**Build times:** Full takes 15-25 minutes cold, slim takes 8-12 minutes. Cached rebuilds are much faster if you only changed files outside the layer you're modifying.

## Testing Changes

```bash
docker compose up -d
```

Verify:
- `docker ps` shows `(healthy)` after ~30 seconds
- `curl -sf http://localhost:3001/` returns 200
- `docker logs holyclaude` shows no errors

If you changed the entrypoint or bootstrap, delete the sentinel to re-trigger first-boot:

```bash
rm ./data/claude/.holyclaude-bootstrapped
docker compose restart holyclaude
```

## Variants

HolyClaude builds two variants from one Dockerfile using a `VARIANT` build arg:

- **full** (default) includes pandoc, ffmpeg, libvips, deployment CLIs (wrangler, vercel, netlify), PDF libraries, data science tools, and more
- **slim** is the core tools only, smaller download

If you're adding a new tool or package, decide which variant it belongs to. Full-only packages go inside the `if [ "$VARIANT" = "full" ]` conditional blocks in the Dockerfile.

## Key Files

| File | What it does |
|------|-------------|
| `Dockerfile` | Single-stage build with full/slim split via `VARIANT` build arg |
| `docker-compose.yaml` | Minimal quick-start compose |
| `docker-compose.full.yaml` | Full compose with all options documented |
| `docker-compose.podman-rootless.yaml` | Rootless Podman keep-id compose for SELinux hosts |
| `scripts/entrypoint.sh` | UID/GID remapping, workspace fix, rootless Podman keep-id startup, triggers bootstrap, hands off to s6-overlay |
| `scripts/bootstrap.sh` | First-boot only: copies settings and memory template, configures git |
| `scripts/notify.py` | Apprise notification helper for stop/error hooks |
| `config/settings.json` | Default Claude Code settings baked into the image |
| `config/claude-memory-full.md` | Runtime CLAUDE.md for full variant |
| `config/claude-memory-slim.md` | Runtime CLAUDE.md for slim variant |
| `s6-overlay/s6-rc.d/` | Service definitions for CloudCLI, Xvfb, and optional SSH; Mosh runs on demand through its wrapper |

## What to contribute

- Bug fixes (always welcome)
- New features (open an issue first to discuss)
- Documentation improvements
- New tools or packages (mention the size impact in your PR)

## What NOT to do

- Don't open a PR without testing locally
- Don't include credentials or API keys
- Don't change the code style (follow existing patterns)

## PR Checklist

- [ ] Built and tested locally (full variant at minimum)
- [ ] `docker ps` shows healthy after startup
- [ ] CloudCLI responds on port 3001
- [ ] README updated if adding/removing tools
- [ ] Mentioned size impact if adding new packages

## Questions?

Open an issue or start a discussion. We're friendly.
