# CloudCLI account-management bridge

HolyClaude carries this source overlay until CloudCLI publishes local-account controls and the required dependency fixes upstream.

Upstream source: https://github.com/siteboon/claudecodeui
Pinned source commit: `677b7ba43695d5624d1a981c62f87fa086187991`
Package version: `@cloudcli-ai/cloudcli@1.37.2`
Related upstream work:

- https://github.com/siteboon/claudecodeui/issues/797
- https://github.com/siteboon/claudecodeui/pull/978
- https://github.com/siteboon/claudecodeui/pull/1070
- https://github.com/siteboon/claudecodeui/pull/928
- https://github.com/siteboon/claudecodeui/pull/526

Rules:

1. Build from the pinned source plus `0001-local-account-management.patch` and `0002-security-dependency-refresh.patch` with `node scripts/build-cloudcli-account-management-artifact-container.mjs`.
2. Do not hand-edit hashed `dist/assets/*.js` files.
3. Apply the patch with `git apply --check --index` followed by `git apply --index`; do not add compatibility flags such as `-C0`.
4. Require two independent builds in the pinned Node image to agree on the artifact, source tree, file list, shrinkwrap, and production dependency tree hashes.
5. Keep the manifest next to the generated tarball.
6. Remove the account bridge only after an upstream npm package verifies as `upstream-complete` and its production dependency tree satisfies the versions enforced by the artifact builder.
7. Keep `ws`, `multer`, DOMPurify, Express, and `path-to-regexp` at the versions enforced by the artifact builder until upstream releases an equivalent dependency tree.
