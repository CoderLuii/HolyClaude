# Security Policy

## Overview

HolyClaude runs AI coding agents inside a Docker container with elevated capabilities. This document explains the security model, what the container can access, and how to report vulnerabilities.

## Container Capabilities

HolyClaude requires the following Docker capabilities:

| Capability | Why | Risk |
|-----------|-----|------|
| `SYS_ADMIN` | Chromium sandboxing (Linux namespaces) | Standard for any Chromium-in-Docker setup |
| `SYS_PTRACE` | Debugging tools (strace, lsof) | Allows process inspection within the container |
| `seccomp=unconfined` | Chromium syscall requirements | Removes syscall filtering for the container |

These are required for Chromium to function and are standard across Playwright, Puppeteer, and CI/CD browser testing setups. They do **not** grant the container access to the host system beyond what Docker normally allows.

## Permission Modes

| Mode | Default? | What it means |
|------|----------|--------------|
| `acceptEdits` | **Yes** | Claude Code can edit files freely, with shell commands still following Claude Code's current prompt behavior |
| `bypassPermissions` | No | The agent runs commands without confirmation |

The default `acceptEdits` mode is right for most users. `bypassPermissions` is documented for power users who understand the implications.

Codex support uses configurable near-parity modes, not identical security. `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` controls CloudCLI Codex chat at runtime, while `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE` only seeds a new raw `codex` CLI `~/.codex/config.toml` on first boot. Valid values are `default`, `acceptEdits`, and `bypassPermissions`; `acceptEdits` is recommended.

Pi Coding Agent runs with the same container user permissions as the `pi` process that launches it. HolyClaude does not add a separate Pi permission gate, so use it in trusted workspaces and keep the container boundary in mind.

Do not expose CloudCLI directly to the public internet, especially with any bypass mode enabled. Docker limits access to the container and mounted volumes, but CloudCLI still exposes an interactive coding environment with credentials and mounted workspace files.

## CloudCLI Runtime

HolyClaude vendors `@cloudcli-ai/cloudcli` and applies Docker-build patches to the source and compiled runtime files. Do not replace CloudCLI from inside a running container with `cloudcli update` or `npm install -g @cloudcli-ai/cloudcli@latest`; update HolyClaude with `docker compose pull && docker compose up -d` instead.

The vendored CloudCLI version must stay at or above the fixes for:

| Advisory | What it covered | Fixed upstream |
|----------|-----------------|----------------|
| `CVE-2026-31862` / `GHSA-f2fc-vc88-6w7q` | Authenticated command injection in Git-related endpoints | `1.24.0` |
| `CVE-2026-31975` / `GHSA-gv8f-wpm2-m5wr` | WebSocket auth/JWT weakness with shell injection risk | `1.25.0` |

HolyClaude vendors CloudCLI `1.35.1`.

## Credential Storage

- API keys and authentication tokens are stored in `./data/claude/` on the host (bind-mounted to `~/.claude/` in the container)
- Credentials never leave the container — HolyClaude does not proxy, intercept, or transmit credentials to any third party
- The container communicates directly with AI provider APIs (Anthropic, Google, OpenAI) using your credentials

## Network Access

The container has unrestricted outbound network access. This is required for:
- AI provider API calls (Anthropic, Google, OpenAI)
- npm/pip package installations
- Git operations (clone, push, pull)
- Any web requests Claude Code makes during development tasks

## Exposing HolyClaude to the Internet

**Do not port-forward HolyClaude to the public internet.** CloudCLI exposes a full shell and holds your AI provider credentials. A simple password is not sufficient protection — basic auth gets brute-forced, and one compromise means an attacker has arbitrary code execution, access to your workspace, and a paid Claude Code instance running on your credentials.

If you need to reach HolyClaude from outside your local network, use:

- **[Tailscale](https://tailscale.com)** — WireGuard mesh VPN, zero open ports, identity-based auth. Recommended for personal and small-team use.
- **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** — Outbound-only tunnel to Cloudflare's edge, optional Cloudflare Access SSO in front. Recommended when you need a public hostname or shared access.

Both options are free for personal use, encrypt the connection end-to-end, and never require opening a port on your router. See the [Remote Access & Exposure](../README.md#shield-remote-access--exposure) section of the README for full details.

## Reporting a Vulnerability

If you discover a security vulnerability in HolyClaude:

1. **Do not** open a public GitHub issue
2. Use [GitHub Security Advisories](https://github.com/CoderLuii/HolyClaude/security/advisories/new) to report privately
3. Include: description, steps to reproduce, and potential impact
4. You will receive a response within 48 hours

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest | Yes |
| < 1.0.0 | No |
