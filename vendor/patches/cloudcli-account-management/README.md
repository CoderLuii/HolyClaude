# CloudCLI account-management bridge

HolyClaude carries this source overlay until CloudCLI publishes local-account logout and password-change support upstream.

Upstream source: https://github.com/siteboon/claudecodeui
Pinned source commit: `27eaf0146a46aa8a55178f3d394360ff7465420f`
Package version: `@cloudcli-ai/cloudcli@1.36.3`
Related upstream work:

- https://github.com/siteboon/claudecodeui/issues/797
- https://github.com/siteboon/claudecodeui/pull/928
- https://github.com/siteboon/claudecodeui/pull/526

Rules:

1. Build from the pinned source plus `0001-local-account-management.patch` with `node scripts/build-cloudcli-account-management-artifact-container.mjs`.
2. Do not hand-edit hashed `dist/assets/*.js` files.
3. Apply the patch with `git apply --check --index` followed by `git apply --index`; do not add compatibility flags such as `-C0`.
4. Require two independent builds in the pinned Node image to agree on the artifact, source tree, file list, shrinkwrap, and production dependency tree hashes.
5. Keep the manifest next to the generated tarball.
6. Remove the account bridge after a fixed upstream npm package verifies as `upstream-complete`.
