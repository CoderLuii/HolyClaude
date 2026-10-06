# Official dependency updates

New tool upgrades use official upstream releases. Dependency vulnerability scans
still run. Accepted upstream vulnerabilities retain their installed version,
advisory, severity and available fix versions; acceptance does not mean fixed.
HolyClaude source checks, artifact integrity and runtime tests still block delivery.

## Deferred replacements

CloudCLI stays at the existing 1.37.3 artifact. The official 1.37.3 release does
not provide HolyClaude's password-change controls, authenticated-session
revocation, reverse-proxy prefix support and notification integration. Replacing
it now would remove those features. Preserving them outside CloudCLI needs a
separate authenticated account interface and REST/WebSocket session integration;
a simple proxy does not cover its absolute browser paths.

The existing Project Stats and Web Terminal artifacts, Cursor integration and
FFmpeg build stay unchanged while their official replacements are evaluated.
This maintenance does not add or extend their patches. Their modification
notices remain in [THIRD-PARTY-NOTICES](../THIRD-PARTY-NOTICES).

Vercel CLI is updated to the official 62.4.0 package and keeps its official npm
dependency tree. EAS CLI 24.7.0 bundles `tar` 7.5.19. The Docker build replaces
that installed copy with checksum-verified `tar` 7.5.22.

Official Vercel 62.4.0 includes `smol-toml` 1.5.2, affected by
[CVE-2026-85730 / GHSA-7w5x-hrqm-74c2](https://github.com/advisories/GHSA-7w5x-hrqm-74c2).
Malformed TOML can hang its parser. This is an accepted upstream vulnerability,
not a fix; the upstream fix starts at 1.7.1. HolyClaude keeps the official Vercel
dependency tree and continues scanning it.
The same installed version is affected by
[GHSA-r4xh-jqrq-34v2](https://github.com/advisories/GHSA-r4xh-jqrq-34v2),
a quadratic-time parser issue fixed upstream in 1.9.0. This finding is also
accepted and unresolved.

Apprise is updated to 2.0.1. Apprise 2 renamed the email PGP public-key URL
parameter from `pgpkey` to `pgppub`, so HolyClaude translates the legacy name for
`mailto`, `mailtos`, `deltachat` and `deltachats` URLs before every `Apprise.add`
call. An explicit `pgppub` value wins when both names are present.

Pi Coding Agent stays at 0.85.1. Pi 0.87 removes the extension
`shouldStopAfterTurn` hook and changes session and extension event shapes. Pi
0.99 and 1.0 change custom-tool and extension behavior, including capability
checks that must use `"name" in tools`. Pi 1.0.3 renames the
`azure-openai-responses` provider to `azure` and requires auth, model, settings
and existing-session migration. A transparent upgrade would require rewriting
user-installed extensions and Azure configuration, so Pi 1.x needs a dedicated
compatibility path.

A deferred replacement is not a verified fix, and its vulnerability findings
remain visible.

Replace a retained artifact only after an official release preserves the required
behavior through HolyClaude's own integration code and passes the relevant
account, notification, browser, terminal and persistence checks on both supported
architectures. Do not rebuild a patched third-party release to make an upgrade fit.
