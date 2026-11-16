# Why release work kept taking longer

As of November 16, 2026, the maintainer reports release work stretching across 24–36 hours. That is elapsed working time, not a measured duration for one GitHub Actions run. The records do not establish total token usage or how much of that time belongs to each cause.

Several different failures accumulated. Calling all of them GitHub bugs hides the repairs that actually matter.

## What repeated

**Successful work ran again.** In the [v1.6.9 candidate run](https://github.com/CoderLuii/HolyClaude/actions/runs/42175777960), attempt 1 failed Slim ARM64 while pushing to GHCR: a DNS lookup timed out. Three other targets passed. Attempt 2 repeated all four targets because promotion required a coherent same-attempt evidence set. The three previously successful targets consumed another **116m01s of aggregate runner execution**, including 49m58s of build/push steps. That is repeated work across parallel runners, not 116 minutes added directly to wall time. Attempt 2's candidate matrix took 62m14s elapsed.

**Source and fixtures did not always match execution.** The [v1.6.1 source run](https://github.com/CoderLuii/HolyClaude/actions/runs/34884626817) failed before image builds because an optional-client fixture directly executed a non-executable script while the real workflow invoked Bash. Windows checkout behavior had hidden the mismatch. Later local validation also exposed CRLF-versus-committed-LF evidence mismatches and verifier assumptions about job IDs. These were test transport and integration defects; rebuilding the product unchanged would not repair them.

**Dependency inputs and security evidence age differently.** An upstream package range can resolve differently while the Dockerfile stays unchanged. An exact owner/version assertion then needs compatibility investigation, not a guessed pin update. Separately, [v1.6.3 run 36037855183](https://github.com/CoderLuii/HolyClaude/actions/runs/36037855183) passed builds and runtime checks before fresh scanner findings stopped security qualification. Inherited reviews also expired before later release attempts. Passing an older release does not authorize new findings or a new review date.

**Some failures really were external transport faults.** The [v1.6.0 ripgrep download failure](https://github.com/CoderLuii/HolyClaude/actions/runs/34570629363) came from `@vscode/ripgrep` receiving HTTP 403 while discovering its official release asset. The rejection was observed; that run's exact rate-limit cause was not established. The later GHCR DNS timeout is another transport failure. Neither proves a product defect, and missing downstream security artifacts are consequences rather than independent root causes.

## Release-handling decisions added work

Starting expensive builds before cheap source and policy checks wastes runner time. Changing source during qualification invalidates its claim about the final commit and requires fresh qualification. Speculative patches, increasingly broad local controllers, repeated complete suites without a changed input, and expanding into unrelated upgrades can turn one repair into several new integration problems.

Authorization handling also matters. A later execution request was treated as planning-only despite explicit authorization to change GitHub and obtain hosted timing proof. That delayed the requested measurement. The lesson is to carry the current instruction through to its concrete result while keeping publication scope explicit.

## What changes the next attempt

Follow the [release procedure](local-release.md): run source checks before pushing, then use one authoritative native Full/Slim × AMD64/ARM64 qualification. Each target builds once and qualifies its immutable digest independently. The resolver selects exact successful job artifacts across attempts of the same run and source SHA; later failures cannot be hidden behind earlier green jobs.

For a confirmed transient failure, retry only the failed job once. Stop on a repeated transport failure, assertion, checksum, provenance or policy failure and investigate the first actionable error. Preserve failed evidence. Repair a fixture without changing product behavior; refresh security evidence without merely extending dates. After a source change, qualify the new SHA. Do not rerun completed unchanged tests solely to repair evidence transfer or report parsing.

The first split-job design had its own performance trap: every qualification waited for every build. Historical v1.6.9 replay showed a possible 3m36s healthy-path penalty. Independent target dependencies remove that modeled barrier. New runner queues, setup and image pulls still need actual hosted measurement; replay does not prove a speedup or the fastest possible release.

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
