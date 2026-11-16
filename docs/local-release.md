# Release through GitHub Actions

Push `release/vX.Y.Z` to qualify the release candidate. The matching tag
promotes the same tested commit without rebuilding its images.

1. Prepare the release commit and matching version metadata on `release/vX.Y.Z`.
   Before pushing, run the source checks from the workflow's `Run release source
   checks` step: shell syntax, Python compilation and unit tests, product facts,
   Node tests, diff whitespace and actionlint. These catch source failures before
   starting native image work.
2. Push the branch. Preflight repeats the source checks, then four native
   `candidate (variant, arch)` jobs build Full/Slim × AMD64/ARM64 and record
   immutable platform digests in Docker Hub and GHCR. Four native
   `qualify (variant, arch)` jobs pull those digests and run the runtime and
   security checks. Each qualification depends only on source preflight and its
   matching target build, so a ready target does not wait for unrelated builds.
   The four explicit target jobs share one anchored build step definition and
   one anchored qualification step definition in the workflow. Use this as the
   authoritative full matrix; a second complete local matrix is not required
   by default.
3. Wait for all four builds and all four qualifications to pass. Fast-forward
   `master` to that exact commit and push the matching `vX.Y.Z` tag. The tag
   workflow selects the successful candidate run for that commit.
4. Wait for digest promotion, paired registry graph verification and all eight
   published-image smokes (Full/Slim × AMD64/ARM64 × Docker Hub/GHCR). Then publish
   the GitHub Release for that tag. Preserve the recorded previous `latest` and
   `slim` indexes: if a final smoke fails after those aliases move, the workflow
   restores them. Published version tags stay immutable.

`scripts/resolve-candidate-evidence.mjs` checks the real latest build and
qualification jobs for each target across attempts of the same run and source
SHA. It selects each job's exact attempt artifacts. A successful build can
therefore feed a retried qualification without rebuilding; evidence from a
later failed target job cannot be replaced with an earlier green result.

Run the same pinned lint image used by GitHub, including ShellCheck. A standalone
Windows actionlint run without ShellCheck is not an equivalent check:

```sh
docker run --rm -v "$PWD:/repo:ro" -w /repo rhysd/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667
```

## Prepare the next version

For `v1.7.0` after `v1.6.9`, use single-digit version segments; do not use `v1.6.10`.
Update `Dockerfile` (`HOLYCLAUDE_VERSION`), `contracts/product-facts.json`
(`release.tag` and `release.dockerVersion`), `docs/CHANGELOG.md` (dated entry),
`security/immutable-inputs.yml` and `security/upstream-dependency-policy.json`
(release identity and genuinely refreshed inputs/evidence as required).
Review `.github/workflows/docker-publish.yml`: `run-name`, dispatch version default,
and its release-parent/tag checks still name `v1.6.9` and the `v1.6.8` parent
`b9e0d11d8d4173899e210742a8f7af8cefcf94f1`. Deliberately approve the next exact
parent after integrating this workflow change with `master` (currently based on
`5ffb0d1a001db18a947e214c3704cdd5d98e3d27`); do not reuse the old parent check.
Update `.github/workflows/source-security.yml` release arguments and published scan tags.
Keep historical artifact baselines, including CloudCLI/FFmpeg `20e9e10681aec9b091bb54da8755f8a1c59f69bb`,
unless their own replacement is approved. Run the source checks above before committing;
commit subject, tag and GitHub Release title must all equal `v1.7.0`.

The tag keeps fresh release-ref, input-review and advisory checks, then verifies
the successful candidate source job and exact artifacts. It does not repeat the
full source suite already passed at that same commit. PR/master monitoring
remains independent.

## Handle a failed job

Read the failed step and raw output first. For a confirmed transient runner,
network or registry failure, rerun only the failed job once. A failed
qualification can reuse its successful build's immutable digests. Do not rerun
the whole matrix just to repeat successful targets.

An assertion, provenance, checksum, runtime or policy failure needs investigation
and correction before another attempt. A source change requires a new candidate
and qualification for the new SHA. If security evidence expires, refresh the
scans and required evidence against the same immutable images, then rerun the
policy checks. Moving a review date forward does not refresh evidence.

## Measure the workflow before a release

The manual workflow defaults to `published-smoke`, which checks an existing
published version. Select `benchmark` to run the real four native build and
qualification pipelines without preparing a product release:

```sh
gh workflow run docker-publish.yml --ref <workflow-branch> -f mode=benchmark -F exercise_retry=true
```

A benchmark pushes only run-scoped candidate images. It cannot create stable
version tags, move `latest`/`slim`, promote a release, or update Docker Hub text.
Its receipts explicitly say `purpose: benchmark`, and promotion rejects them.
The recorded input review date is used only to verify historical input integrity;
the summary does not claim current release approval. Runtime and scanner/policy
checks still execute against the exact built images with current database/date.

`exercise_retry=true` deliberately fails Slim ARM64 once after its qualification
finishes. Let the other jobs finish, preserve attempt 1, then use
`gh run rerun <run-id> --failed`. Confirm the second attempt runs only that
qualification and that all four original build job IDs and digests are retained.
This controlled failure is a benchmark test, not a product fault. Leave the
option false for ordinary benchmarks. Never use it to retry a genuine assertion
or provenance failure without diagnosis.

Source monitoring checks recorded input integrity and warns separately when the
input review expires. That warning means the release is NOT eligible. Actual
release pushes still enforce current-date input approval before building or
promoting. A source check is not a release approval.

See [the failure history](release-workflow-history.md) for causes, recovery rules
and the distinction between elapsed time, runner work and projected savings.

## Build cache

BuildKit imports and exports `ghcr.io/coderluii/holyclaude-buildcache:<variant>-<arch>`
with intermediate layers included. This cache is shared across trusted release
branches and manual benchmark runs. Candidate/runtime images remain separate;
a cache hit never replaces native tests, digest verification or security scans.
Only workflows with the existing GHCR package-write credential can update it.
The first build may report a missing cache reference and build cold. Record
cache import/export outcomes and cached build steps before calling a run warm.
GitHub Actions caches were branch-scoped and can be evicted; an empty Actions
cache inventory is not proof of the exact historical eviction cause.

## Record release timing

Save job `started_at` and `completed_at` values for every attempt, together with
the run ID, SHA, target and conclusion. For example:

```sh
gh api --paginate \
  'repos/CoderLuii/HolyClaude/actions/runs/<run-id>/jobs?filter=all&per_page=100' \
  --jq '.jobs[] | {id, name, run_attempt, started_at, completed_at, conclusion}'
```

Compare build time, qualification time and total candidate elapsed time using
the same source and inputs. Record cache state, queue delays and runner type
alongside the durations; job execution time alone does not measure time spent
waiting for a runner. Keep historical timing replay separate from a measured
hosted run of this layout. Historical replay of the v1.6.9 candidate found that
waiting for every build before qualification would add 3m36s to its successful
second attempt. Independent target dependencies remove that modeled barrier.
New runner setup, image pulls and queue delays still need hosted measurement.
The split lets qualification retry without another build; it does not establish
a hosted speedup or a fastest-possible release.

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
