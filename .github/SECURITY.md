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

Codex support uses configurable near-parity modes, not identical security. The current CloudCLI browser client sends `permissionMode` explicitly. `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE` is only a fallback for requests that omit it, and an explicit request value wins. `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE` only seeds a new raw `codex` CLI `~/.codex/config.toml` on first boot; its default is `default`. Valid values are `default`, `acceptEdits`, and `bypassPermissions`.

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

HolyClaude v1.5.5 vendors CloudCLI `1.36.3` with a refreshed compatible runtime dependency tree, including patched `ws`, `multer`, DOMPurify, Express, `path-to-regexp`, Hono, PostCSS, `fast-uri`, `jws`, `minimatch`, `picomatch`, `tar-fs`, and YAML resolutions. The release workflow also stores digest-bound CycloneDX, SPDX, and Grype reports for each full/slim and `amd64`/`arm64` candidate. Scanner output is release evidence, not a claim that the image has zero vulnerabilities.

CloudCLI is a single-user service. Its account controls one shared workspace and credential context. Putting CloudCLI behind a tunnel or sharing its URL does not create separate users, tenants, workspaces, or credential boundaries.

## Release Evidence

The release gate keeps the original Grype report and then evaluates every raw Critical and High match against [`security/advisory-reviews.json`](../security/advisory-reviews.json). Reviews must identify the exact vulnerability, package, version, type, and installed path. They also need a supported authority and an unexpired review date. Missing, duplicate, broad, or expired matches stop the release.

Grype suppresses indirect kernel findings for Debian's `linux-libc-dev` headers by default. HolyClaude audits that built-in behavior instead of accepting ignored findings generally: the package, upstream `linux` relationship, indirect-match metadata, rule name, and disabled descriptor must all match exactly. Any changed or additional ignored match stops the release, and the accepted records are preserved as `ignored-findings.json` in the evidence bundle.

The full image keeps EAS CLI 20.5.1 and Vercel CLI 54.21.1 on their tested compatibility lines. Both upstream packages bundled `tar` 7.5.7 when `CVE-2026-59873` / `GHSA-23hp-3jrh-7fpw` was published. The Docker build replaces only those two installed copies with checksum-verified `tar` 7.5.22, updates their exact dependency metadata, and fails if the parent package versions or dependency specs drift.

[`security/openvex.json`](../security/openvex.json) is limited to findings where the affected code is absent or outside HolyClaude's shipped service paths. Vendor severity corrections stay in the review ledger instead of being presented as VEX. Effective Critical findings cannot be accepted. A temporary effective High exception requires `CoderLuii` approval, names the exact component, and expires within 30 days.

The workflow publishes the raw Syft SBOMs and scanner report beside the reviewed Critical report, mapped High report, OpenVEX document, policy result, and image digest metadata. The policy records the exact candidate image digest and normalized CycloneDX SHA-256. Target OpenVEX statements are narrowed to the matching component PURL, architecture, variant, and image hash. CycloneDX's embedded SPDX enum currently predates `Artistic-dist`, so the workflow also preserves a hashed normalization record and validates a copy that represents that identifier through CycloneDX's `license.name` field. Other schema errors still stop the release. This keeps the evidence inspectable without changing the two-platform Docker manifest.

## Credential Storage

The default `./data/claude` mount persists Claude Code sessions and, from v1.5.5, Git global configuration and GitHub CLI authentication. Treat it as credential-bearing storage. Do not commit it, share it broadly, or store it in an unencrypted backup.

- Claude Code session data is stored in `./data/claude/` on the host by the default Compose files. Other bundled tools may read credentials from their own container files, bind mounts, or environment variables.
- HolyClaude operates no credential relay and does not proxy or intercept provider credentials
- Bundled tools read credentials from container-local files, bind mounts, or environment variables and send authenticated requests directly to the providers you configure
- Provider requests necessarily carry the authentication material required by that provider; do not treat the container as a boundary that keeps credentials off the network

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

Both options avoid forwarding HolyClaude's application port through your router. Tailscale provides encrypted mesh transport and identity controls. Cloudflare Tunnel provides encrypted transport to Cloudflare's edge; Cloudflare Access is a separate configuration step when you need identity controls and Access audit logs. See the [Remote Access & Exposure](../README.md#shield-remote-access--exposure) section of the README for full details.

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
