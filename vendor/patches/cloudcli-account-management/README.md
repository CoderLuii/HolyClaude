# CloudCLI account-management bridge

HolyClaude carries this source overlay until CloudCLI publishes local-account logout and password-change support upstream.

Upstream source: https://github.com/siteboon/claudecodeui
Pinned source commit: `615e2ca2926a68e6e3336d49b592616654a69424`
Package version: `@cloudcli-ai/cloudcli@1.36.2`
Related upstream work:

- https://github.com/siteboon/claudecodeui/issues/797
- https://github.com/siteboon/claudecodeui/pull/928
- https://github.com/siteboon/claudecodeui/pull/526

Rules:

1. Build from the pinned source plus these patches with `node scripts/build-cloudcli-account-management-artifact-container.mjs`.
2. Do not hand-edit hashed `dist/assets/*.js` files.
3. Keep the Node 26 `better-sqlite3` lock patch until an upstream release contains the same resolution.
4. Keep the manifest next to the generated tarball.
5. Remove the account bridge after a fixed upstream npm package verifies as `upstream-complete`.
