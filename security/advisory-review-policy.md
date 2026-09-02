# Release Security Review Policy

HolyClaude stores raw Syft and Grype output for every release candidate. Raw scanner severity is evidence, not the final disposition.

- Debian packages use the Debian Security Tracker as the primary authority.
- Node runtimes use Node.js security advisories.
- Language packages and bundled binaries use their upstream advisory or ecosystem database.
- OpenVEX is used only when a component is demonstrably not affected. Severity corrections stay in `advisory-reviews.json`.
- Every raw Critical or High match must resolve to one exact, unexpired review. Missing, duplicate, broad, or expired matches fail the release.
- Unreviewed, fixable, or project-controlled Critical findings block the release. They cannot use accepted risk.
- A temporary Critical exception is limited to an official Debian repository package when structured authority evidence records an open advisory with no fixed package version for the exact vulnerability, source package, binary package, package version, and candidate report. A scanner fix version or `fixed` state blocks the exception.
- Critical exceptions require `CoderLuii`, expire within 7 days, and use exact vulnerability, component, version, type, fully anchored literal location, variant, and architecture selectors. The committed authority-evidence manifest must cover every exact tuple and match the evaluated report SHA-256.
- Critical exceptions cannot apply to npm, Go, or source-built components. OpenVEX is not used for Critical exceptions.
- High exceptions require `CoderLuii`, expire within 30 days, and name the exact component.

Temporary Critical findings and High findings remain in the release evidence with their package, version, path, owner, authority, approval, expiry, fix availability, and rationale. A mapped finding is not a claim that it is harmless.
