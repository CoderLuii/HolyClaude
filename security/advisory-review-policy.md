# Release Security Review Policy

HolyClaude stores raw Syft and Grype output for every release candidate. Raw scanner severity is evidence, not the final disposition.

- Debian packages use the Debian Security Tracker as the primary authority.
- Node runtimes use Node.js security advisories.
- Language packages and bundled binaries use their upstream advisory or ecosystem database.
- curl-family Debian packages may use curl.se only for an exact CVE advisory URL and an exact Low or Medium vendor-severity review scoped to one variant and architecture. curl.se cannot authorize fixed, not-affected, High, or exception dispositions.
- OpenVEX is used only when a component is demonstrably not affected. Severity corrections stay in `advisory-reviews.json`.
- Every raw Critical or High match must resolve to one exact, unexpired review. Missing, duplicate, broad, or expired matches fail the release.
- Unreviewed, fixable, or project-controlled Critical findings block the release. They cannot use accepted risk.
- A temporary Critical exception is limited to an official Debian repository package when structured authority evidence records an open advisory with no fixed package version for the exact vulnerability, source package, binary package, package version, and candidate report. A scanner fix version or `fixed` state blocks the exception.
- Critical exceptions require `CoderLuii`, expire within 7 days, and use exact vulnerability, component, version, type, fully anchored literal location, variant, and architecture selectors. The committed authority-evidence manifest must cover every exact tuple and match the evaluated report SHA-256.
- Critical exceptions cannot apply to npm, Go, or source-built components. OpenVEX is not used for Critical exceptions.
- High exceptions require `CoderLuii`, expire within 30 days, and name the exact component.

Temporary Critical findings and High findings remain in the release evidence with their package, version, path, owner, authority, approval, expiry, fix availability, and rationale. A mapped finding is not a claim that it is harmless.

## v1.6.4 release deferral

`security/v1.6.4-release-security-deferral.json` and `security/v1.6.4-accepted-risk.json` are separate, short-lived release decisions. They do not edit, renew, or replace `advisory-reviews.json`.

- The deferral applies only to `v1.6.4`, expires on October 4, 2026, and requires `CoderLuii` approval.
- The Debian review deferral carries forward only its named, exact, expired Debian reviews. The accepted-risk manifest covers the remaining approved findings.
- For `v1.6.4` only, the accepted-risk manifest overrides the general restrictions above on accepting Critical, fixable, or project-controlled findings, including findings in HolyClaude's custom FFmpeg build and bundled tool dependencies. It does not change the policy for any other release or create a reusable advisory-ledger disposition.
- The acceptance covers only the exact known Critical and High findings recorded for the native Full AMD64, Full ARM64, Slim AMD64, and Slim ARM64 images. Each accepted finding stays bound to its vulnerability, raw severity, component, version, type, exact locations, variant, architecture, fix state, fix versions, occurrence count, candidate report, image digest, and SBOM.
- Raw scanner severity is not downgraded. Unresolved findings stay unresolved, and available fixes stay recorded as available. Acceptance permits this release; it does not count as remediation.
- A new vulnerability, component, version, location, variant, architecture, severity, fix state, or report tuple is outside the approved set and fails the release.
- Expired reviews that are not named in the deferral are removed from the effective evaluation set. If the scanner still reports one of those findings, the release fails as unmapped.
- Syft, Grype, SBOM validation, digest binding, raw reports, native Full/Slim AMD64/ARM64 builds, runtime smoke tests, and promotion verification remain required.
- Every accepted target writes `release-security-deferral.json` and `release-accepted-risk.json` beside the raw report. Those records bind the decisions to their manifest hashes, report hash, image digest, SBOM hash, exact findings or review IDs, approval, and expiry.
- Deferred reviews keep the status `deferred_not_fixed`; accepted findings use `known_risk_accepted`. Neither status means fixed, safe, harmless, or resolved. A later compatible package or project correction ends the acceptance only after the affected images are rebuilt and rescanned.
