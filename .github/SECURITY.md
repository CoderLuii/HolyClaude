# Security Policy

## Overview

HolyClaude runs AI coding agents inside a Docker container with elevated capabilities. This document explains the security model, what the container can access, and how to report vulnerabilities.

## Container Capabilities

HolyClaude keeps the following browser-container defaults in the compose files:

| Capability | Why it is present | Notes |
|-----------|-------------------|------|
| `SYS_ADMIN` | Current browser profile for this release | Chromium does not universally require it; hardening is a separate pass |
| `SYS_PTRACE` | Debugging tools (strace, lsof) | Debugging-related, not a Chromium requirement |
| `seccomp=unconfined` | Current browser profile for this release | Keep the release's browser launch path as shipped; hardening is separate |

These are the current compose defaults for HolyClaude's browser profile. `SYS_ADMIN` and `seccomp=unconfined` broaden process privileges and reduce isolation, and `SYS_PTRACE` is debugging-related. Use them only for trusted workloads, and treat any hardening pass as a separate change.

`/dev/shm` exhaustion and an immediate SIGTRAP or exit 133 are separate failure modes. Treat them separately when you troubleshoot browser launches.

## Permission Modes

| Mode | Default? | What it means |
|------|----------|--------------|
| `acceptEdits` | **Yes** | Claude Code can edit files freely, with shell commands still following Claude Code's current prompt behavior |
| `bypassPermissions` | No | The agent runs commands without confirmation |

The default `acceptEdits` mode is right for most users. `bypassPermissions` is documented for power users who understand the implications.

Codex support uses configurable near-parity modes, not identical security. `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` controls CloudCLI Codex chat at runtime, while `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE` only seeds a new raw `codex` CLI `~/.codex/config.toml` on first boot. Valid values are `default`, `acceptEdits`, and `bypassPermissions`; `acceptEdits` is recommended.

Pi Coding Agent runs with the same container user permissions as the `pi` process that launches it. HolyClaude does not add a separate Pi permission gate, so use it in trusted workspaces and keep the container boundary in mind.

Do not expose CloudCLI directly to the public internet, especially with any bypass mode enabled. Docker limits access to the container and mounted volumes, but CloudCLI still exposes an interactive coding environment with credentials and mounted workspace files.

## Optional SSH and Mosh

HolyClaude includes `sshd` and Mosh in both image variants, but the server path is disabled by default. `sshd` is only added to the s6 service bundle when `HOLYCLAUDE_SSH_ENABLE=true` and startup finds a safe public-key file mounted outside `/home/claude/.claude`, `/home/claude`, and `/workspace`.

SSH is key-only:

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `KbdInteractiveAuthentication no`
- `AllowUsers claude`
- no X11, TCP forwarding, agent forwarding, or tunnel forwarding by default

The public-key source should be a separate read-only mount such as `/run/holyclaude-ssh/authorized_keys`. Do not store `authorized_keys` in `.claude`; that directory also stores credentials and agent runtime state.

Mosh is not a daemon. The `mosh-server` wrapper only runs when `HOLYCLAUDE_MOSH_ENABLE=true`, and it uses the configured UDP range. Keep SSH and Mosh ports behind localhost, VPN, Tailscale, or firewall allowlists.

## CloudCLI Runtime

HolyClaude vendors `@cloudcli-ai/cloudcli` and applies Docker-build patches to the source and compiled runtime files. Do not replace CloudCLI from inside a running container with `cloudcli update` or `npm install -g @cloudcli-ai/cloudcli@latest`; update HolyClaude with `docker compose pull && docker compose up -d` instead.

The vendored CloudCLI version must stay at or above the fixes for:

| Advisory | What it covered | Fixed upstream |
|----------|-----------------|----------------|
| `CVE-2026-31862` / `GHSA-f2fc-vc88-6w7q` | Authenticated command injection in Git-related endpoints | `1.24.0` |
| `CVE-2026-31975` / `GHSA-gv8f-wpm2-m5wr` | WebSocket auth/JWT weakness with shell injection risk | `1.25.0` |

HolyClaude v1.5.0 vendors CloudCLI `1.36.2`. The release workflow also stores digest-bound CycloneDX, SPDX, and Grype reports for each full/slim and `amd64`/`arm64` candidate. Scanner output is release evidence, not a claim that the image has zero vulnerabilities.

## Release Evidence

The release gate keeps the original Grype report and then evaluates every raw Critical match against [`security/advisory-reviews.json`](../security/advisory-reviews.json). Reviews must identify the exact vulnerability, package, version, type, and installed path. They also need a supported authority and an unexpired review date. Missing, duplicate, broad, or expired matches stop the release.

[`security/openvex.json`](../security/openvex.json) is limited to findings where the affected code is absent or outside HolyClaude's shipped service paths. Vendor severity corrections stay in the review ledger instead of being presented as VEX. Effective Critical findings cannot be accepted. A temporary effective High exception requires `CoderLuii` approval, names the exact component, and expires within 30 days.

The workflow publishes the raw SBOMs and scanner report beside the reviewed Critical report, mapped High report, OpenVEX document, policy result, and image digest metadata. This means the evidence remains inspectable without changing the two-platform Docker manifest.

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
