# Release through GitHub Actions

Push `release/vX.Y.Z` to test the release candidate. The tag pipeline promotes
the same tested commit.

1. Prepare the release commit and matching version metadata on `release/vX.Y.Z`.
   Push the branch to run the source checks and 4 native Full/Slim × AMD64/ARM64
   candidate jobs.
2. Wait for all candidate jobs, including runtime and security checks, to pass.
3. Fast-forward `master` to that exact commit and push the matching `vX.Y.Z` tag.
   The tag workflow selects the successful candidate run for that commit and
   promotes its tested manifests to Docker Hub and GHCR.
4. Wait for promotion and the published-image smoke tests to pass. Then publish
   the GitHub Release for that tag.

The manual workflow dispatch smoke-tests an already-published version. It does
not build or promote a release.

## Use local verification when hosted CI is blocked

Run the complete native matrix from the exact clean release commit. Preserve
the command records and raw evidence, then run the local receipt verifier below.
Keep the hosted failure separate from the local result; do not invent an
Actions status or run ID. Emulation, skipped checks and partial scanner output
do not qualify.

Local verification still requires registry verification and final smoke tests
before publication. Keep site deployment checks separate.

<details>
<summary>Local controller and optional Docker-client reference</summary>

## Optional Docker client on a private engine

The ordinary two-argument `tests/validate_optional_docker_client.sh` command
still requires an isolated GitHub-hosted runner. The explicit local route is:

```sh
bash tests/validate_optional_docker_client.sh \
  "$full_image_at_digest" "$prefix" --local-isolation-proof "$proof_file"
```

Keep `RUN_SOCKET_COMPOSE=1` and `REQUIRE_SOCKET_COMPOSE=1`. Set `DOCKER_HOST` to
the private Unix socket and `DOCKER_CONFIG` to its task-owned client directory
for this command only. Clear Docker context/API/TLS overrides and Buildx/BuildKit
endpoint overrides in that command's environment. Do not change your normal
Docker profile or pretend that a local process is a GitHub-hosted runner.
The local build explicitly uses Buildx's `default` builder for that socket;
saved builder selections cannot redirect it to another engine.

The native controller must first create a fresh, bounded daemon from an official
`docker.io/library/docker@sha256:…` image. Start it with
`dockerd --host=unix:///var/run/docker.sock`. Do not mount the host Docker socket
or expose a TCP listener. Create an owned network and data volume. Use exactly
these three mounts:

| Source | Destination inside the daemon | Access |
|---|---|---|
| Final clean source checkout | Same absolute path | Read-only |
| Owned socket directory | `/var/run` | Read/write |
| Owned data volume | `/var/lib/docker` | Read/write |

Use the plain `local` volume driver without options and a local `bridge`
network. Empty bridge options are accepted. Docker 29's exact automatic
`com.docker.network.enable_ipv4=true` and
`com.docker.network.enable_ipv6=false` pair is also accepted when the actual
`EnableIPv4` and `EnableIPv6` flags are `true` and `false`. Unknown options,
changed IP-family flags, internal, attachable, ingress and configuration-only
networks do not qualify. Named bind-backed storage and external drivers do not
qualify.

Export the private socket through the owned directory so the controller can
query it. The existing inner `/var/run/docker.sock` and fixture mounts then refer
to the private engine. Preload the exact Full candidate and only explicitly
recorded tool images. The private engine must initially contain no containers,
volumes or networks beyond `bridge`, `host` and `none`.

`scripts/verify-local-docker-isolation.mjs` reads the proof and independently
queries both engines. It checks the actual outer container, official image
digest, labels, mounts, Unix listener, CPU/RAM/PID limits, native architecture,
live inner engine ID, exact candidate and source labels, initial inventory and
committed source bytes. Shared sockets, personal client profiles, stale proof,
unexpected resources and fabricated hosted fields fail.

The controller proof has these exact fields; use the positive fixtures in
`tests/local_delivery_evidence.test.mjs` as the machine-readable example:

- `schemaVersion: 1`, `executionOrigin: "local_native"`,
  `scope: "optional_docker_client"`, `createdAt`, `release`, `sourceCommit`.
- `prefix`, `architecture`, `sourceRoot`, `workRoot`, `socketDirectory`,
  `dockerConfigDirectory`. The work-root basename equals the prefix; socket and
  client directories are inside it. The proof must be at most five minutes old.
- `outerEndpoint`, `outerEngineId`, `outerContainerId`, `innerEngineId`.
- `daemonImageRef`, `daemonImageId`, `candidateRef`, `candidateImageId`.
- `dataVolume: "<prefix>-data"`, `network: "<prefix>-network"`.
- `memoryBytes`, `memorySwapBytes`, `cpuPeriod: 100000`, `cpuQuota`, `pidsLimit`,
  `allowedImageIds`.

Label the daemon with `com.coderluii.validation=local-optional-docker-client`,
`com.coderluii.validation.prefix=<prefix>` and
`com.coderluii.validation.source=<commit>`. Label its network and volume with
the same prefix. A boolean authorization value is not a proof.

Every existing optional-client assertion remains: package and license checks,
default user, denied remote/socket access, protocol negotiation, actual Compose
create/start/ps/logs/stop/down, cleanup, and compressed/filesystem measurements.
The local path also reads `/etc/holyclaude-variant` from the exact candidate and
requires `full`. Run this complete route on both native architectures before
calling it qualified. Unit fixtures do not prove real Docker behavior.

## Verify the complete local candidate

Produce a receipt from the trusted native controller, then run:

```sh
node scripts/verify-local-release-evidence.mjs \
  --receipt "$receipt" --artifact-root "$evidence_root" \
  --source-root "$source_root" --source "$commit" --output "$new_result"
```

The verifier refuses an existing output file. It checks the final source before
executing its validators and checks it again afterward. The top-level receipt
contains exactly `schemaVersion`, `executionOrigin`, `localRunId`, `release`,
`sourceCommit`, `workflowSha256`, `sourceChecks`, `targets` and `artifacts`.

`artifacts` lists every referenced file with relative path, byte count and
SHA-256. Paths cannot escape the evidence root. All command records bind the
local run, source, workflow, exact job/step block hash, target, image digest,
start/end time, actual zero exit code, `skipped: false`, stdout and stderr files.
`workflowStepDigests` and `requiredTargetSteps` are exported for the controller;
regenerate these values from the final committed workflow.

Each of the four targets records native kernel/engine/image architecture,
platform manifest and configuration bytes, ordered layer digests, exact build
options, required command records, security files and verified quiescence.
Full targets include the actual optional-client test. The AMD64 Full target
also includes the retained CloudCLI and cryptography checks required by the
workflow. Build provenance and SBOM flags retain the workflow's current values;
the separate security catalog remains mandatory.

Security files include raw Syft, raw and normalized CycloneDX, SPDX, license
normalization, Grype, database evidence and both policy outputs. The verifier
checks their hashes against source inputs, reruns the existing license normalizer
from original raw bytes, compares the exact normalized output and complete
normalization evidence, and checks the SPDX document identity. The controller
must still run SBOM Utility schema validation as required by the security step.
The verifier reruns the real strict evaluator
for every target using the current UTC date. A hand-written green summary is
insufficient. Correctly attributed upstream findings remain accepted and
unfixed; own-code, provenance and malformed-evidence failures remain blocking.

The receipt validates integrity and eligibility of the controller's records. The
controller is responsible for executing the recorded commands, observing real
native hosts and preserving raw output. These tools do not manufacture hosted
provenance, prove execution from arbitrary JSON, sign a release or waive a test.

After all local requirements pass, preserve the established publication order:
verify access and previous aliases, publish only the qualified artifacts, verify
both registries and all final smokes, then confirm the matching source/tag/release
and live behavior. Never overwrite published immutable versions. Keep the site
synchronization and deployment checks separate from product image qualification.

</details>
