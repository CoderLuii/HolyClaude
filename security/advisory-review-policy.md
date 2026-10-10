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

## v1.6.6 upstream dependency advisory policy

`security/upstream-dependency-policy.json` records the standing maintainer decision for third-party dependency findings. It applies to all severities and does not use a vulnerability allowlist or an invented expiry date.

- Syft and Grype still scan every native Full and Slim AMD64 and ARM64 image. The raw report, ignored matches, SBOM, scanner database evidence, image digest, immutable input inventory, and policy are preserved with SHA-256 bindings.
- Each scan uses Syft's official registry source so the embedded manifest retains the requested registry digest. Each scan stores Syft JSON and CycloneDX from the same catalog. The evaluator binds the package catalogs and embedded image manifest and config to the candidate digest. Grype's decoded CycloneDX image source must match that catalog; promotion checks the image reference against the authenticated candidate record.
- Valid third-party findings use `accepted_upstream_vulnerability_not_fixed`. The record keeps the scanner severity, fix state, fix versions, advisory source, package identity, exact SBOM identity, and locations. This disposition permits release and deployment. It does not claim the vulnerability is fixed, harmless, unreachable, or resolved.
- Official third-party components must match one declared package type, purl prefix, and installed path origin. A finding with no exact declared origin, or with more than one origin, blocks the release.
- Exact retained modified third-party artifacts, including the unchanged HolyClaude FFmpeg backport, CloudCLI account-management artifact and overlays, rebuilt esbuild binaries, retained CloudCLI plugins, and Cursor runtime symlink arrangement, remain third-party for vulnerability disposition. They are labeled `retained_modified_third_party`, never official.
- Every retained modified origin names exact immutable inventory records whose canonical SHA-256 values reproduce from commit `20e9e10681aec9b091bb54da8755f8a1c59f69bb`. The single CloudCLI ip-address description rename is explicit; every version, source, digest, integrity value, and nested attribute remains byte-identical. Changing, removing, or duplicating a record invalidates the policy evaluation. New or extended patches, custom builds, and vendored modifications require their own source review and cannot inherit the retained classification.
- HolyClaude-owned source, integration code, service definitions, helper binaries, npm packages, scoped npm packages, and normalized PyPI names stay blocking. The evaluator checks that boundary before any retained or official third-party rule. Unknown and unbound components also block.
- Checksums, action pins, image digests, SBOM identity and provenance, scanner database evidence, and immutable input verification remain release gates. Grype 0.120.1 evidence must use the exact `v6.1.10` schema, the official `grype.anchore.io/databases/` source, and a source query checksum equal to the recorded checksum. The advisory decision does not weaken those controls.
- Pull requests and `master` run source validation. Scheduled and manual monitoring rescans the published v1.6.6 images without publishing or promoting image tags.

The older advisory ledger remains useful for release-specific historical decisions. It is not used to relabel v1.6.6 findings as fixed or not affected.

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
