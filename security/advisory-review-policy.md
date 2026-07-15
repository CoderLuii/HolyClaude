# Release Security Review Policy

HolyClaude stores raw Syft and Grype output for every release candidate. Raw scanner severity is evidence, not the final disposition.

- Debian packages use the Debian Security Tracker as the primary authority.
- Node runtimes use Node.js security advisories.
- Language packages and bundled binaries use their upstream advisory or ecosystem database.
- OpenVEX is used only when a component is demonstrably not affected. Severity corrections stay in `advisory-reviews.json`.
- Every raw Critical match must resolve to one exact, unexpired review. Missing, duplicate, broad, or expired matches fail the release.
- Effective Critical findings block the release. They cannot use accepted risk.
- Effective High exceptions require `CoderLuii`, expire within 30 days, and name the exact component.

High findings remain in the release evidence with their package, version, path, owner, fix availability, and reachability state. A mapped High is not a claim that it is harmless.
