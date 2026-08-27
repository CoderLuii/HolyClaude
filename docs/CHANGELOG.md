# Changelog

All notable changes to HolyClaude will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.5.8] - 08/26/2026

### Changed
- Updated Cursor Agent to build `2026.08.11-e8db854`, retaining checksum verification for both Linux architectures.
- Updated the vendored CloudCLI baseline from 1.36.3 to 1.37.2, which adds the gpt-5.6 model family (`gpt-5.6`, `-sol`, `-luna`, `-terra`) to the provider model picker.
- Rebased the account-management bridge onto CloudCLI's modular server refactor. Password rotation and session-token revocation now live in the `auth` module: `auth.service.ts` owns `changePassword`, `auth.routes.ts` exposes `/api/auth/change-password`, and `auth.module.ts` injects the repository, app-config, and token-generation dependencies.
- Retargeted the Docker-build CloudCLI patches at the modular layout. `openai-codex.js` became `codex-runtime.provider.js`, `server/cli.js` became the `cli` module, and the `/api/system/update` route moved into the `system` module.
- Extended Multer field-nesting hardening to CloudCLI 1.37.x's fourth multipart parser, the chat attachment upload.
- Raised CloudCLI's nested nanoid to 3.3.18, ip-address to 10.5.0, and fast-uri to 3.1.6 so the Docker overlays no longer downgrade the verified artifact.
- Updated CloudCLI's reviewed production dependency tree with compatible security fixes for `@remix-run/router`, `brace-expansion`, `glob`, `ip-address`, and React Router, keeping the artifact's production audit at 0 Critical and 0 High.
- Moved the CloudCLI entrypoint symlink to `dist-server/server/modules/cli/cli.js`, which is where 1.37.x publishes its `bin` target.

## [1.5.7] - 08/12/2026

### Changed
- Updated Node to 26.7.0, Playwright to 1.62.0, tsx to 4.23.12, pnpm to 11.21.0, Vite to 8.2.1, esbuild to 0.28.2, and ESLint to 10.8.1. Retained npm 11.19.0 because npm 12 rejects CloudCLI's verified shrinkwrap, and retained TypeScript 6.0.3 because the 7.0.2 native binary carries fixed-version Go findings.
- Updated CloudCLI's nested nanoid, ip-address, fast-uri, and js-yaml packages. Updated the compatible Undici, Nanoid, and js-yaml copies bundled by Wrangler, Pi, EAS, PM2, and Vercel.
- Pinned the retained Azure CLI package version at the installer boundary.

### Fixed
- Restored rollback evidence into the directory consumed by the release workflow.
- Retried only the CloudCLI browser snapshot once while preserving first-attempt diagnostics.
- Backported the upstream image-size fixes used by Netlify for malformed ICNS, HEIF, and JXL files.
- Backported the upstream FFmpeg fixes for CVE-2026-70628 and CVE-2026-70632 into the Bookworm package set.
- Backported the upstream cryptography fixes for GHSA-jwv3-5hgf-82ww and GHSA-g6cj-pr64-35w5 into Azure CLI's Python environment.

## [1.5.6] - 08/02/2026

### Changed
- Corrected the HolyCode Cloud README callout and preserved its `?ref=hclaude-readme` attribution link.

## [1.5.5] - 08/02/2026

### Added
- Persisted global Git configuration, XDG Git configuration, and GitHub CLI authentication through the existing `./data/claude` mount.
- Added recreation, migration, conflict, override, restrictive-mode, rootless, and token-redaction coverage for the Git and GitHub CLI persistence path.

### Changed
- Updated Node to 26.5.1, GitHub CLI to 2.97.0, npm to 11.19.0, Vite to 8.2.0, Wrangler to 4.116.0, OpenCode to 1.18.10, and Python Markdown to 3.10.3.
- Updated Debian Chromium to 151.0.7922.71 for both image architectures after the Bookworm security builds became available.
- Rebuilt CloudCLI 1.36.3 under the release Node/npm environment with a refreshed compatible production dependency tree. CloudCLI 1.37.0 remains deferred because its modular refactor does not accept HolyClaude's current account and runtime patches.
- Replaced Cursor Agent's bundled Node runtime with HolyClaude's patched Node 26.5.1 runtime and applied checksum-bound compatible updates for vulnerable transitive packages without changing the owning CLI major versions.
- Removed the unused `pdfkit` Python package.
- Updated the release workflow inputs, strict architecture selection, immutable inputs, notices, documentation, and release evidence for v1.5.5.

### Fixed
- Kept `git config --global` values and `gh auth` state after container removal and recreation.
- Seeded Git identity and `/workspace` safe-directory values only when missing, preserving manual configuration without duplicate entries.
- Added fail-closed migration handling so conflicting live and durable CLI configuration is never merged, replaced, or deleted automatically.

### Security
- Required every raw Critical and High scanner finding to match one exact, current component review. Failed scans now retain their checksum-bound evidence instead of stopping before metadata is written.
- Recorded Debian vendor severity and short-lived, component-bound High exceptions without claiming that the images contain zero vulnerabilities.

## [1.5.4] - 07/30/2026

### Changed
- Updated Claude Code to 2.1.220, Junie to 2470.4, Cursor Agent to build `2026.07.23-e383d2b`, Gemini CLI to 0.53.0, Codex to 0.146.0, OpenCode to 1.18.9, and Pi Coding Agent to 0.82.1.
- Updated pnpm to 11.18.0, ESLint to 10.8.0, concurrently to 10.0.4, Wrangler to 4.115.0, Prisma to 7.9.1, pandas to 3.0.5, tqdm to 4.70.0, FastAPI to 0.141.1, and Uvicorn to 0.52.0.
- Updated the npm `tar` security overlay to 7.5.22, Syft to 1.50.0, Grype to 0.116.1, actionlint to 1.7.12, and `docker/login-action` to 4.6.0 at an immutable commit.
- Updated the rootless Podman, Ollama, contribution, troubleshooting, configuration, architecture, translated README, Docker Hub, and security guidance to match the release inputs and compose files.

### Fixed
- Rebuilt CloudCLI 1.36.3 with reviewed `ws`, `multer`, DOMPurify, Express, and `path-to-regexp` resolutions, flat multipart-field limits, normalized registry URLs, and reproducible artifact checks.
- Refreshed the CloudCLI 1.36.3 account-management bridge while preserving password rotation, token revocation, account navigation, and accessible error handling.
- Bound release security evidence to both Docker Hub and GHCR products and retained complete digest-bound evidence from the tag workflow.
- Added exact image-level checks for CloudCLI upload limits, aborted uploads, WebSocket fragmentation, security dependency versions, and full/slim package separation.
- Bound release refs to dated changelog entries and product facts, rejected merge-based release commits, and kept rollback reporting accurate when promotion stops before mutable aliases move.

## [1.5.3] - 07/23/2026

### Changed
- Added CloudCLI named-volume persistence checks to every full and slim release candidate and every promoted Docker Hub and GHCR image.
- Updated the exact Debian Chromium package pin to 150.0.7871.181 after the previous Bookworm security build left the repository.
- Refreshed the verified Claude Code installer hash while retaining the exact 2.1.216 amd64 and arm64 binaries.
- Updated the README, translations, configuration, architecture, troubleshooting, and Docker Hub guidance for local CloudCLI account storage.
- Added `/home/claude/.cloudcli` to the rootless Podman profile so the documented profile persists CloudCLI account state.

### Fixed
- Pre-created `/home/claude/.cloudcli` with the runtime user ownership so fresh Docker volumes inherit usable permissions.
- Added bounded startup ownership repair for existing CloudCLI volumes and a fail-fast runtime-user write check before CloudCLI starts.
- Kept rootless startup unprivileged while reporting a direct ownership or read-only mount remedy when CloudCLI state is not writable.

## [1.5.2] - 07/22/2026

### Added
- Added a versioned product-facts contract, JSON Schema, verifier, and regression tests for release identity, image variants, ports, CLI inventory, browser versions, and supported capabilities.

### Changed
- Synchronized the README, translated READMEs, Docker Hub description, architecture, configuration, troubleshooting, and security guidance with the verified image behavior.
- Kept the v1.5.1 runtime and dependency set unchanged while publishing the corrected product facts as v1.5.2.
- Bound the retained Cursor Agent build to checksum-verified amd64 and arm64 archives instead of the moving bootstrap installer.

### Fixed
- Corrected full and slim CLI membership, translated image-tag examples and links, packaged Chromium wording, and Codex permission fallback documentation.
- Clarified local credential handling, optional account persistence, and CloudCLI's single-user workspace boundary.

## [1.5.1] - 07/21/2026

### Changed
- Updated s6-overlay to 3.2.3.2 and fzf to 0.74.1 using checksum-verified upstream archives for `amd64` and `arm64`.
- Updated pnpm to 11.15.1, Vite to 8.1.5, Prettier to 3.9.6, Wrangler to 4.112.0, Prisma to 7.9.0, Lighthouse to 13.4.1, and Marp CLI to 4.5.0.
- Updated Gemini CLI to 0.51.0, Codex to 0.144.6, OpenCode to 1.18.4, and Pi Coding Agent to 0.81.0.
- Updated tqdm to 4.69.0, Matplotlib to 3.11.1, and FastAPI to 0.139.2.
- Pinned Claude Code to 2.1.216, Junie to 2285.5, and the current Cursor installer and embedded build ID.
- Updated Syft to 1.49.0 and Grype to 0.116.0 for release evidence generation.
- Updated the Debian Chromium package trio to 150.0.7871.124 after the Bookworm security build became available for both image architectures. Kept tree-sitter-language-pack at 1.6.2 because 1.6.3 does not publish a compatible Python 3.11 Linux artifact.
- Updated npm to 11.18.0 and Vercel CLI to 54.21.1.

### Fixed
- Updated the vendored CloudCLI baseline to 1.36.3, removed its obsolete local `better-sqlite3` lock patch, and kept the account-management and runtime overlays behind two clean reproducibility builds.
- Installed Junie from the exact verified release archive instead of allowing its installer to fetch a second unverified payload.
- Added Dependabot coverage for GitHub Actions and Docker base images.
- Made release-branch candidates immutable and commit-keyed, then promoted the exact tested platform digests instead of rebuilding them after tagging.
- Kept Netlify CLI 26.2.0 for deployments but removed its optional local Go/Rust functions proxy, which upstream still ships as a binary built with Go 1.16.7.

### Security
- Replaced the two `tar` 7.5.7 copies bundled by EAS CLI and Vercel CLI with checksum-verified `tar` 7.5.20, which contains the fix for `CVE-2026-59873` / `GHSA-23hp-3jrh-7fpw`. The build verifies both parent package versions and dependency specs before applying the replacement.
- Tightened advisory matching to exact component name, version, type, and location selectors, with duplicate, wildcard, mismatched, and expired records rejected.
- Added deterministic immutable-input expiry checks and captured each Grype database build with the digest-bound release evidence.
- Preserved the raw Syft CycloneDX SBOM and added a recorded schema-compatibility conversion for the current SPDX `Artistic-dist` identifier before CycloneDX validation.
- Added rollback metadata for mutable `latest` and `slim` aliases while keeping published semantic-version tags immutable.
- Audited Grype's built-in `linux-libc-dev` suppression by exact package, match type, upstream package, and rule descriptor; any other ignored match now stops the release.

## [1.5.0] - 07/15/2026

### Changed
- Updated s6-overlay to 3.2.3.1 and replaced Debian's fzf package with checksum-verified fzf 0.74.0 archives for `amd64` and `arm64`.
- Updated pnpm to 11.13.0, Wrangler to 4.111.0, Codex to 0.144.4, OpenCode to 1.18.1, and Pi Coding Agent to 0.80.7. Kept tree-sitter-language-pack at 1.6.2 because the next published version is outside Desloppify 1.0's supported range.
- Pinned Claude Code to 2.1.210 and Junie to 2144.10. The build now verifies their installers and architecture-specific release payloads.
- Locked the current Cursor installer, embedded build ID, launcher, and architecture-specific Node binary instead of relying on an unsupported version argument.
- Updated the vendored CloudCLI baseline to 1.36.2 and refreshed `better-sqlite3` to 12.11.1 for the exact HolyClaude Node 26 build.
- Added a reviewed Web Terminal lock and switched both bundled CloudCLI plugins to clean `npm ci` installs.
- Added digest-bound CycloneDX, SPDX, and Grype evidence for every release candidate while keeping the final image indexes limited to `amd64` and `arm64`.
- Kept Playwright aligned at 1.61.0 for Node and Python while switching both bindings to the pinned Debian Chromium 150.0.7871.114 Bookworm security build.
- Pinned the Azure CLI installer and package result, the GitHub CLI repository key and package version, and the release-critical build inputs recorded in `security/immutable-inputs.yml`.

### Fixed
- Made the CloudCLI source artifact reproducible under the exact HolyClaude Node image and npm version, including duplicate package and clean-install dependency-tree checks.
- Verified official checksums before extracting s6-overlay, fzf, Claude Code, and Junie release inputs.
- Removed the separate Playwright browser download and made direct Chromium, both Playwright bindings, and CloudCLI Browser Use share the same verified system browser.
- Rebuilt the three esbuild native binaries retained by the full toolset from their existing package versions with Go 1.26.5, removing vulnerable old Go runtimes without changing their JavaScript APIs.
- Made full-image SBOM generation memory-bounded and provisioned dedicated scanner swap without colliding with the runner-managed `/swapfile`.
- Clarified that `better-sqlite3` 12.11.1 is verified by HolyClaude's exact Node 26 build and native database smoke even though its upstream engine metadata currently lists Node through 25.

### Security
- Added a fail-closed advisory-review gate. Every raw Critical scanner match must resolve to one exact, current review; effective Critical findings still block release.
- Added scoped OpenVEX statements only for demonstrably unaffected code paths, plus mapped High evidence with package, version, location, owner, fix availability, and follow-up fields.
- Added an exact, expiring Debian vendor-severity review for `CVE-2026-7598` against `libssh2-1 1.10.0-3+b1`. Debian classifies the Bookworm finding as a Minor issue.

## [1.4.9] - 07/13/2026

### Changed
- Updated the Docker runtime from Node.js 26.4.0 to 26.5.0.
- Updated `tsx` to 4.23.1, pnpm to 11.12.0, Vite to 8.1.4, ESLint to 10.7.0, Prettier to 3.9.5, Wrangler to 4.110.0, and Netlify CLI to 26.2.0.
- Updated Gemini CLI to 0.50.0, Codex to 0.144.1, OpenCode to 1.17.18, and Pi Coding Agent to 0.80.6.
- Updated tqdm to 4.68.4 and Uvicorn to 0.51.0.
- Pinned GitHub Actions to the verified commits for their existing release versions.
- Kept Playwright aligned at 1.61.0 for Node and Python, TypeScript at 6.0.3, Vercel at 54.21.0, CloudCLI at 1.36.1, and both bundled CloudCLI plugins at their current upstream commits.

## [1.4.8] - 07/11/2026

### Changed
- Pinned the browser runtime to Playwright 1.61.0 for Node and Python and baked Playwright Chromium build 1228 into the image at build time for both `amd64` and `arm64`.
- Kept `/usr/bin/chromium` as the supported wrapper and stopped relying on a runtime browser download.
- Kept browser tooling in both image variants while leaving Lighthouse in the full image only.

### Fixed
- Routed CloudCLI Browser Use through the supported `/usr/bin/chromium` wrapper so it launches regular Playwright Chromium instead of looking for an uninstalled headless-shell binary.
- Corrected the browser capability wording so `SYS_ADMIN`, `SYS_PTRACE`, and `seccomp=unconfined` are documented as the current compose profile, not universal Chromium requirements.
- Split `/dev/shm` exhaustion from immediate SIGTRAP or exit 133 launch failures so the troubleshooting path points at the right symptom.

## [1.4.7] - 07/09/2026

### Added
- Added `HOLYCLAUDE_BASE_PATH` for serving the web UI under a reverse-proxy subpath such as `/holyclaude`.

### Fixed
- Kept CloudCLI assets, API calls, SSE streams, WebSockets, service worker files, manifest icons, CSS font assets, and deep links on the configured subpath instead of leaking back to `/`.

## [1.4.6] - 07/09/2026

### Added
- Added a temporary CloudCLI account-management bridge with local Logout and Change Password controls for the bundled web UI.
- Added a detector and manifest for the bridge so HolyClaude can skip the overlay once CloudCLI publishes complete upstream support.

### Changed
- Updated the vendored `@cloudcli-ai/cloudcli` package baseline to 1.36.1 using a source-level account-management overlay.

### Fixed
- Kept password changes from requiring `auth.db` deletion by rotating local account credentials in place and forcing older REST, SSE, and WebSocket tokens to sign in again.

## [1.4.5] - 07/09/2026

### Fixed
- Use Podman's explicit `keep-id:uid=1000,gid=1000` mapping in the rootless compose profile so host and container workspace files stay aligned with UID/GID 1000.
- Remove the redundant rootless compose `user: "1000:1000"` override now that the user namespace mapping carries the intended UID/GID.

## [1.4.4] - 07/06/2026

### Changed
- Refreshed the Docker runtime to Node.js 26.4.0 and updated the pinned npm, Python, AI CLI, deployment CLI, and browser automation packages in the image.
- Upgraded the vendored `@cloudcli-ai/cloudcli` package to 1.36.0 and rebuilt the CloudCLI patch checks against that tarball.
- Updated the baked CloudCLI Web Terminal plugin to commit `8aa41f614c216d961e7c0d9c3e67982c6b2d9da3` and kept HolyClaude's terminal rendering guard compatible with that plugin's upstream rendering fixes.
- Updated the Docker publish workflow actions for checkout, QEMU, Buildx, registry login, metadata, and build/push.

### Removed
- Removed the Dependabot version-update config so GitHub Actions maintenance stays in intentional release prep instead of opening bot PRs.

## [1.4.3] - 07/03/2026

### Changed
- Upgraded the vendored `@cloudcli-ai/cloudcli` package to 1.35.1.

### Fixed
- Retargeted the Apprise lifecycle bridge to CloudCLI 1.35.x's notification orchestrator so Codex stop and error events still reach HolyClaude's Apprise notification path.
- Kept the Codex completion guard for CloudCLI 1.35.x provider-normalized `turn_complete` events, so successful Codex chat turns keep explicit `exitCode: 0`, `success: true`, and `aborted: false` fields.
- Added regression coverage so the Apprise and Codex completion patches fail closed when CloudCLI moves the expected source or runtime anchors.

## [1.4.2] - 07/03/2026

### Added
- Added opt-in key-only SSH and Mosh support to both image variants for localhost, LAN, VPN, and Tailscale terminal access.
- Added a supervised `sshd` service that stays out of the s6 user bundle until `HOLYCLAUDE_SSH_ENABLE=true` and a safe read-only `authorized_keys` mount is present.
- Added Docker smoke coverage for disabled-by-default SSH, fail-closed key handling, key login, password/root rejection, host-key persistence, and Mosh enablement.

### Changed
- Documented SSH/Mosh compose examples, configuration variables, troubleshooting steps, and Docker Hub notes without changing the quick-start port exposure.

### Security
- Kept SSH disabled by default, disabled password and root login, and rejected `authorized_keys` sources under `.claude`, `/home/claude`, or `/workspace`.
- Gated `mosh-server` behind `HOLYCLAUDE_MOSH_ENABLE=true` and a configured UDP range instead of leaving it directly callable after package install.

## [1.4.1] - 07/02/2026

### Added
- Added a rootless Podman compose profile for Fedora and other SELinux hosts using `userns_mode: keep-id`, `user: "1000:1000"`, and `:Z` volume labels.

### Changed
- Clarified that `PUID`/`PGID` is Docker-style UID/GID remapping and does not control rootless Podman's host-visible subordinate UID mapping by itself.

### Fixed
- Allowed startup to continue when rootless Podman already runs the container as the target user, skipping root-only UID/GID remaps, ownership repairs, and the CloudCLI `s6-setuidgid` privilege drop in that mode.

## [1.4.0] - 07/02/2026

### Changed
- Repackaged the Docker publish workflow cleanup into one versioned release commit after `v1.3.9`, keeping GHCR publishing on `GHCR_TOKEN`.
- Clarified the required `GHCR_TOKEN` secret note for Docker release publishing.

### Fixed
- Kept Docker publishing on `actions/checkout@v6.0.3` and left the unvalidated `actions/checkout@v7.0.0` bump out of the release path.

## [1.3.7] - 06/18/2026

### Added
- Added the HolyCode Cloud early-access callout near the top of the README, linking readers to https://holycode.coderluii.dev/cloud.

## [1.3.6] - 06/18/2026

### Fixed
- Restored saved Claude Code session state before startup can replace it with a fresh default file, keeping OAuth/API sessions intact across container recreation.
- Added Docker smoke coverage for Claude session persistence so release candidates can be checked locally before publishing.

## [1.3.5] - 06/17/2026

### Fixed
- Patched the baked CloudCLI Web Terminal plugin so PTY output is decoded from raw UTF-8 bytes before it reaches xterm.js, preventing split multibyte characters from turning box drawing, emoji, or CJK output into replacement blocks.
- Added explicit terminal font fallbacks and a `web-terminal-disable-webgl` browser toggle for systems where WebGL glyph rendering still shows black squares.
- Added regression coverage for the Web Terminal patch so Docker builds fail when the pinned plugin source drifts.

## [1.3.4] - 06/17/2026

### Fixed
- Preserved CloudCLI's `expandWorkspacePath` helper while disabling in-container self-updates, restoring workspace browsing and `~/...` folder creation in the patched runtime.
- Added regression coverage so the CloudCLI self-update patch cannot remove the filesystem browser helpers again.

## [1.3.3] - 06/15/2026

### Fixed
- Corrected Telegram notification examples to use Apprise's `tgram://bot_token/chat_id` scheme and kept legacy `tg://` values working at runtime.
- Added a dry-run notification diagnostic so users can check `notify-on`, `NOTIFY_*` variables, and Apprise URL acceptance without sending a message.
- Kept Docker release metadata from auto-adding `latest` to slim builds, so `latest` stays tied to the full image.

## [1.3.2] - 06/15/2026

### Changed
- Clarified that full-image OpenCode is the supported OpenRouter and multi-provider path, including Claude-compatible skill discovery and upstream-dependent free model availability.

## [1.3.1] - 06/15/2026

### Added
- Added Desloppify `1.0` to both image variants as the `desloppify` CLI, with pinned supporting packages for Bandit, tree-sitter, and Stevedore.
- Added optional `HOLYCLAUDE_DESLOPPIFY_SETUP` global skill setup for Claude, Codex, Gemini, and full-image OpenCode.

### Changed
- Documented Desloppify's passive default behavior, manual scan commands, project-level `.desloppify/` state, OpenCode setup caveats, and OSNL-0.2 notice.

## [1.3.0] - 06/15/2026

### Fixed
- Patched CloudCLI Codex completion events so successful Codex chat turns include `exitCode: 0`, matching the other providers and keeping new Codex sessions on the active session after the first prompt.
- Added a fail-closed Docker build patch for the Codex completion payload so future CloudCLI changes are reviewed instead of silently dropping the fix.

## [1.2.9] - 06/14/2026

### Added
- Added Pi Coding Agent `0.79.3` to the full image as the `pi` command.

### Changed
- Updated README, Docker Hub, translations, memory template, and notices so the full image lists eight AI CLIs.

### Fixed
- Restored the documented `cursor` command when the current Cursor Agent installer only creates `agent` and `cursor-agent`.
- Enforced LF endings for Docker runtime scripts so Windows checkouts build runnable containers.

## [1.2.8] - 06/14/2026

### Changed
- Refreshed the Docker runtime to Node.js 26.3.0 with npm 11.16.0 from the base image.
- Replaced the deprecated `@siteboon/claude-code-ui` wrapper with the vendored `@cloudcli-ai/cloudcli` 1.34.0 package.
- Updated pinned npm, Python, and GitHub Actions dependencies where current audited releases were available.
- Documented Docker Hub compressed image sizes separately from the larger unpacked sizes Docker hosts and NAS tools can report.

### Fixed
- Patched CloudCLI self-update guards across both source and compiled runtime files so in-container npm updates cannot replace HolyClaude's patched runtime.
- Updated the CloudCLI service command from the moved `claude-code-ui` binary to `cloudcli`.

### Security
- Removed `httpie` from the full image because PyPI/OSV still flags `httpie` 3.2.4 with `PYSEC-2023-242` / `CVE-2023-48052`.
- Verified the vendored CloudCLI line is above the upstream fixes for `CVE-2026-31862` and `CVE-2026-31975`.
- Hardened Docker publish workflow permissions and added Dependabot coverage for GitHub Actions.

## [1.2.7] - 06/13/2026

### Fixed
- Disabled CloudCLI's unsafe npm self-update path inside HolyClaude so issue #50 no longer replaces the patched runtime with the moved upstream package.
- Documented the `@/shared` CloudCLI update failure and the Docker update path.

## [1.2.6] - 05/28/2026

### Added
- Added configurable near-parity Codex permission modes for CloudCLI Codex chat with `HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE`.
- Added first-boot raw `codex` CLI permission-mode seeding through `HOLYCLAUDE_CODEX_CLI_PERMISSION_MODE`.

### Changed
- Documented Codex permission behavior, safety caveats, compose examples, and CloudCLI modification notices.

## [1.2.5] - 05/27/2026

### Fixed
- Sent Apprise notifications for Codex chat completion/failure events through HolyClaude's CloudCLI provider lifecycle, using the existing ~/.claude/notify-on flag and NOTIFY_* destinations.

## [1.2.4] - 05/27/2026

### Fixed
- Repaired bubblewrap setuid permissions at container startup so Codex `apply_patch` keeps working on Synology and other restricted-user-namespace hosts after `docker compose pull && docker compose up -d`.

## [1.2.3] - 05/27/2026

### Changed
- Refreshed dependency surfaces with Node.js 26.2.0, s6-overlay 3.2.3.0, pinned npm and Python package versions, pinned GitHub Actions, and pinned CloudCLI plugin SHAs.
- Retained CloudCLI 1.26.3 after rejecting the 2.0.0 artifact because required HolyClaude patches could not be carried forward safely.
- Recorded site dependency and copy updates as follow-up only, with no site commit included in this release.

### Fixed
- Changed required CloudCLI patch misses to fail closed during the image build instead of continuing after warnings.
- Corrected third-party notices and `acceptEdits` documentation drift across source docs and templates.

### Security
- Bound default CloudCLI compose examples to localhost only and strengthened guidance against public port exposure.
- Hardened ignore and build-context handling for local state and secret-bearing files.

## [1.2.2] - 04/10/2026

### Fixed
- `/model <name>` in Chat tab now actually switches the active model — it persists to localStorage and survives page reload

## [1.2.1] - 04/10/2026

### Fixed
- Shell tab no longer resets scroll position to the top on periodic refresh

## [1.2.0] - 04/09/2026

### Added
- Remote access security guidance recommending Tailscale or Cloudflare Tunnel instead of exposing HolyClaude directly to the public internet
- Optional CloudCLI account persistence documentation using a named Docker volume for local storage users

### Fixed
- Corrected persistence docs to reflect that Claude Code OAuth session (`~/.claude.json`) already survives container rebuilds
- Synced translated READMEs and troubleshooting docs with the current persistence behavior

## [1.1.9] - 04/04/2026

### Fixed
- Vendored a patched CloudCLI build into the HolyClaude image so the release no longer depends on waiting for upstream UI/runtime fixes to merge
- Codex session completion now stays on the active session instead of bouncing back to `new session` after the first prompt
- Claude auth failures now refresh status after login and surface clearer error messages instead of leaving stale or silent UI state
- Realtime chat messages now dedupe correctly so duplicate user/thinking rows do not render twice
- The auth shell no longer steals plain lowercase `c`; the auth URL copy shortcut now requires `Shift+C`
- The selected thinking mode now persists in the main chat flow instead of resetting after each send
- Documented Codex callback port `1455` in the full compose/config docs
- Simplified the supported Ollama path to `ANTHROPIC_AUTH_TOKEN=ollama` plus `ANTHROPIC_BASE_URL=<endpoint>` and tightened troubleshooting guidance
- Corrected remaining public docs links that still referenced `blob/main/docs/configuration.md`

## [1.1.8] - 04/04/2026

### Fixed
- Corrected public documentation links that still referenced the non-existent `main` branch, including the Docker Hub description and translated README links to `docs/configuration.md`

## [1.1.7] - 03/28/2026

### Added
- Codex CLI pre-configured with `on-request` approval policy and `workspace-write` sandbox (no more repeated approval prompts)
- Codex, Gemini, and Cursor CLI auth and config persistence across container rebuilds (symlinked into bind-mounted volume)
- Apprise notification hooks for Codex and Gemini CLIs (same `notify-on` flag file as Claude Code)
- Cursor CLI notification hook pre-configured (activates when Cursor CLI adds stop event support)
- Claude Code OAuth session persistence across container recreation (`~/.claude.json` backed up to bind mount)

## [1.1.6] - 03/28/2026

### Fixed
- Codex CLI `apply_patch` failing on Synology NAS and other hosts with restricted user namespaces (bubblewrap sandbox now works via setuid fallback)
- Corrected documentation that incorrectly stated ChatGPT Plus/Pro subscriptions do not work with Codex CLI (they do, via `codex login --device-auth`)

## [1.1.5] - 03/28/2026

### Added
- `THIRD-PARTY-NOTICES` file with license attribution for bundled third-party software
- Third-Party Software section in README

## [1.1.4] - 03/28/2026

### Added
- Azure CLI (`az`) in full variant
- Ollama setup documentation (`docs/ollama.md`) for running HolyClaude with local or cloud models without an Anthropic subscription

## [1.1.3] - 03/27/2026

### Added
- Junie CLI (JetBrains AI coding agent) in full variant
- OpenCode CLI (open source AI coding agent) in full variant
- Environment variable passthrough to CloudCLI for AI provider keys, timezone, and display (`ANTHROPIC_API_KEY`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `OLLAMA_HOST`, `TZ`, `DISPLAY`, etc.)

### Fixed
- Web Terminal plugin stuck on "Connecting..." spinner (WebSocket frame type not preserved in plugin proxy, both relay directions patched)
- `NODE_OPTIONS` from Docker Compose now correctly merged with internal flags instead of being silently overridden
- `TZ` and `DISPLAY` environment variables now properly forwarded to CloudCLI process
- Default permission mode corrected from `allowEdits` to `acceptEdits` in settings.json

Thanks to [@RobertWalther](https://github.com/RobertWalther) for the WebSocket fix and [@kewogc](https://github.com/kewogc) for reporting the settings error.

## [1.1.2] - 03/26/2026

### Added
- Docker HEALTHCHECK instruction for container health monitoring
- Bootstrap now backs up existing `settings.json` and `CLAUDE.md` before overwriting on re-bootstrap
- Expanded CONTRIBUTING.md with build commands, testing steps, file map, and PR checklist

## [1.1.1] - 03/26/2026

### Fixed
- Workspace bind mount permissions on first run when Docker creates the directory as root
- Workspace directory now tracked via `.gitkeep` to prevent root ownership on fresh clones

### Added
- Configurable host-side port and bind-mount paths via `.env` file (`HOLYCLAUDE_HOST_PORT`, `HOLYCLAUDE_HOST_CLAUDE_DIR`, `HOLYCLAUDE_HOST_WORKSPACE_DIR`)

Thanks to [@Sunwood-ai-labs](https://github.com/Sunwood-ai-labs) for this contribution.

## [1.1.0] - 03/25/2026

### Added
- Apprise notification engine with support for 100+ services (Discord, Telegram, Slack, Email, Gotify, and more)
- Individual `NOTIFY_*` environment variables for easy per-service configuration
- Catch-all `NOTIFY_URLS` for any Apprise-supported service

### Changed
- Notification backend replaced from Pushover to Apprise

### Removed
- **BREAKING:** `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` environment variables removed. Migrate to `NOTIFY_PUSHOVER=pover://user_key@app_token`. See [configuration docs](configuration.md#notifications-apprise) for details.

## [1.0.0] - 03/21/2026

Initial public release.
