# Why release work kept taking longer

As of November 16, 2026, the maintainer reports release work stretching across 24–36 hours. That is elapsed working time, not a measured duration for one GitHub Actions run. The records do not establish total token usage or how much of that time belongs to each cause.

Several different failures accumulated in the GitHub release process.

GitHub records show the following candidate windows. These measure the first
candidate start to the first successful job completion, not continuous work or
conversation time. Counts include all retained runs on each release branch;
cancelled runs are not counted as product failures.

| Release branch | Runs / source revisions | Failed / cancelled / successful | Hours to first green |
| --- | --- | --- | --- |
| v1.6.0 | 15 / 15 | 3 / 10 / 2 | 3.12 |
| v1.6.1 | 6 / 6 | 3 / 2 / 1 | 9.36 |
| v1.6.4 | 4 / 4 | 3 / 0 / 1 | 10.84 |

For v1.6.0, twelve runs followed the first green result. Its later successful
revision completed 54.60 hours after the first candidate. That wider window
includes later changes and does not establish 54.60 hours of active work.

## What repeated

**Successful work ran again.** In the [v1.6.9 candidate run](https://github.com/CoderLuii/HolyClaude/actions/runs/42175777960), attempt 1 failed Slim ARM64 while pushing to GHCR: a DNS lookup timed out. Three other targets passed. Attempt 2 repeated all four targets because promotion required a coherent same-attempt evidence set. The three previously successful targets consumed another **116m01s of aggregate runner execution**, including 49m58s of build/push steps. That is repeated work across parallel runners, not 116 minutes added directly to wall time. Attempt 2's candidate matrix took 62m14s elapsed.

**Source and fixtures did not always match execution.** The [v1.6.1 source run](https://github.com/CoderLuii/HolyClaude/actions/runs/34884626817) failed before image builds because an optional-client fixture directly executed a non-executable script while the real workflow invoked Bash. Windows checkout behavior had hidden the mismatch. Later local validation also exposed CRLF-versus-committed-LF evidence mismatches and verifier assumptions about job IDs. These were test transport and integration defects; rebuilding the product unchanged would not repair them.

**Dependency inputs and security evidence age differently.** An upstream package range can resolve differently while the Dockerfile stays unchanged. An exact owner/version assertion then needs compatibility investigation, not a guessed pin update. Separately, [v1.6.3 run 36037855183](https://github.com/CoderLuii/HolyClaude/actions/runs/36037855183) passed builds and runtime checks before fresh scanner findings stopped security qualification. Inherited reviews also expired before later release attempts. Passing an older release does not authorize new findings or a new review date.

**Some failures really were external transport faults.** The [v1.6.0 ripgrep download failure](https://github.com/CoderLuii/HolyClaude/actions/runs/34570629363) came from `@vscode/ripgrep` receiving HTTP 403 while discovering its official release asset. The rejection was observed; that run's exact rate-limit cause was not established. The later GHCR DNS timeout is another transport failure. Neither proves a product defect, and missing downstream security artifacts are consequences rather than independent root causes.

## Release-handling decisions added work

Starting expensive builds before cheap source and policy checks wastes runner time. Changing source during qualification invalidates its claim about the final commit and requires fresh qualification. Speculative patches, increasingly broad local controllers, repeated complete suites without a changed input, and expanding into unrelated upgrades can turn one repair into several new integration problems.

The work also drifted into planning and local release orchestration after GitHub changes had been authorized. That delayed hosted measurement. Keep GitHub as the release system, use local checks for early feedback, and keep unrelated maintenance in its own plan.

## What changes the next attempt

Follow the [release procedure](local-release.md): run source checks before pushing, then use one authoritative native Full/Slim × AMD64/ARM64 qualification. Each target builds once and qualifies its immutable digest independently. The resolver selects exact successful job artifacts across attempts of the same run and source SHA; later failures cannot be hidden behind earlier green jobs.

For a confirmed transient failure, retry only the failed job once. Stop on a repeated transport failure, assertion, checksum, provenance or policy failure and investigate the first actionable error. Preserve failed evidence. Repair a fixture without changing product behavior; refresh security evidence without merely extending dates. After a source change, qualify the new SHA. Do not rerun completed unchanged tests solely to repair evidence transfer or report parsing.

The first split-job design had its own performance trap: every qualification waited for every build. Historical v1.6.9 replay showed a possible 3m36s healthy-path penalty. Independent target dependencies remove that modeled barrier. The hosted measurements below include new runner setup and image pulls; the replay itself does not prove a speedup or the fastest possible release.

Native coverage, complete security checks, paired Docker Hub/GHCR graphs, eight final image smokes and rollback remain required. The optimization removes repeated work and unnecessary waiting, not the checks that establish a release.

## Cache reuse between releases

The November 16 cache API inventory returned zero entries. The former `gha`
backend is restricted to the current, base and default branches, so a disposable
release branch does not provide a shared cache for future release branches.
GitHub can also evict unused cache entries. Those are documented limitations;
the empty inventory does not establish which mechanism removed an old entry.

Native builds now use a per-target GHCR BuildKit cache. Benchmark reports must
record first-run and repeat-run build times and actual cache imports, separately
from runtime qualification, scanner time and runner scheduling. A smaller YAML
file alone is not evidence of a faster release.

## Local tooling must match the hosted check

The [first November 16 benchmark](https://github.com/CoderLuii/HolyClaude/actions/runs/43813371165)
passed 880 Node tests and 40 Python tests, then stopped on ShellCheck SC2016 in
a summary message. Standalone Windows actionlint had omitted ShellCheck, so the
local lint result did not cover GitHub's complete check. No native builds began.
Removing unnecessary Markdown backticks fixed the message; the same pinned
lint container now runs locally before a correction push. An environment
mismatch is a reason to align verification, not retry the unchanged workflow.

The first hosted failed-job exercise also exposed a missing API fixture.
GitHub returned retained successful jobs with new IDs and attempt numbers,
but their original execution timestamps. Treating those records as new builds
looked for artifacts that did not exist and double-counted execution time.
The resolver and timing report now match exact execution identity to the
original successful record. A later real failure still blocks promotion.
The actual API response is retained as a regression fixture. The corrected
hosted exercise passed with the original builds and new qualification receipts.

## A release label could invalidate the toolchain cache

`HOLYCLAUDE_VERSION` used to be declared before the install steps. Docker passes
an ARG implicitly to following RUN instructions, so changing that release
number could rebuild packages that had not changed. The ARG and OCI labels now
follow the filesystem instructions. A fresh-builder benchmark probe changes
only the version argument and requires explicit cache hits for every RUN vertex.
The probe has cache-only output and cannot publish a version `0.0.0` image.

This is distinct from a genuine tool or source update, which must invalidate
its affected layers and pass native qualification. Moving release metadata does
not make changed dependencies safe or renew expired input approval.

Docker documents the ARG behavior in its [Dockerfile reference](https://docs.docker.com/reference/dockerfile/#impact-on-build-caching).

## November 16 GitHub measurements

The first native [trial](https://github.com/CoderLuii/HolyClaude/actions/runs/43813763342)
at `dd7b75d2eb7515d73cde4b6be66e874ae73e85f0` started without the new registry cache.
Attempt 1 took 51m19s from the first job starting to the last completing. All
four targets passed runtime/security checks; the deliberate fault after Slim
ARM64's checks made the attempt fail. Its 70-second retry exposed the API
mapping defect above; that failed
attempt is retained, not counted as a successful release.

The [corrected trial](https://github.com/CoderLuii/HolyClaude/actions/runs/43820193636)
at `f4de8757bb8faa5477292a9b2af6be7dd25c9799` passed after a targeted retry.
Its first attempt was cancelled after Full ARM64's smoke step ran for 30
minutes, versus 9m39s in the first trial. GitHub completed cancellation after
five minutes, and the job log remained unavailable. The underlying cause is
unknown; the cancellation is not evidence of a product assertion failure.
The first attempt took 53m01s including cancellation, so it was not an overall
speedup. The two unfinished qualifications then passed in 23m20s, with **zero
new builds**. Across both attempts and the intervening gap, elapsed time was
77m37s. Downloaded, digest-verified receipts bind both retried qualifications
to their original attempt-1 image digests and retained artifact hashes.

The [warm repeat](https://github.com/CoderLuii/HolyClaude/actions/runs/43829674132)
uses the same `f4de875` commit. Its normal build logs show all 60 RUN vertices
cached on every target. Both trials also passed a separate fresh-builder probe
with a changed version argument: 60/60 RUN vertices cached on each target.
The complete warm trial passed in **27m41s**, from first job start to last job
completion, with four native builds, four complete qualifications and no retry.
This includes runner setup, image pulls, runtime and security work. It excludes
initial runner queue time and the later tag-promotion/final-smoke release path.
Do not calculate a causal whole-run speedup against the 77m37s fault exercise.

| Native target | First build/push at f4de875 | Warm build/push at the same commit |
| --- | --- | --- |
| Full AMD64 | 8m47s | 17s |
| Full ARM64 | 10m33s | 24s |
| Slim AMD64 | 7m21s | 29s |
| Slim ARM64 | 5m42s | 25s |

Across four parallel runners, build/push steps totalled 32m23s, then 1m35s:
95.1% less aggregate build/push time. That is not a 95.1% reduction in complete
release time. These steps exclude runner setup, qualification image pulls, runtime tests,
security databases and scans. Cache population and runner variation affect
the comparison; future dependency changes must rebuild affected layers.

Local final verification passed 917 Node tests and 40 Python tests on Linux,
plus syntax, product facts, recorded input integrity and four policy preflights.
Lint uses the same pinned actionlint/ShellCheck container as GitHub.

Further speculative caching is not justified by these samples. Scanner binary
installation took about three seconds in the first Full ARM64 qualification;
most of that step was a fresh database update, which remains required. Builder
deletion varied from 106 seconds to 28 seconds between trials. All normal RUN
instructions already hit cache in the warm build. Keep native runtime/security
coverage, exact receipt checks, registry verification and rollback; there is no
evidence that removing those checks would be a safe optimization. These results
do not establish the fastest possible workflow on every runner or future input.

The [timing and digest records](release-workflow-timings.json) preserve sources,
attempts, phase durations, cancelled unknown phases, receipt identities, cache
proof and all eight unchanged stable registry references. The measured native
runs qualify the stated `f4de875` source; later documentation/reporting changes
do not turn them into qualification of another SHA. No product release or site
deployment was made. Current input approval still requires a fresh review
before the next real release; these benchmarks do not renew it.
