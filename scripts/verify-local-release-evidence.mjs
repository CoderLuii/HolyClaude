#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, readSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { verifyCommittedSource } from './verify-local-docker-isolation.mjs';

const DIGEST = /^sha256:[a-f0-9]{64}$/;
const SHA = /^[a-f0-9]{64}$/;
const SOURCE = /^[a-f0-9]{40}$/;
const REPOSITORY = 'https://github.com/CoderLuii/HolyClaude';
const PARENT = 'b9e0d11d8d4173899e210742a8f7af8cefcf94f1';
const SOURCE_STEPS = ['Require matching release ref and commit', 'Validate upstream dependency advisory policy', 'Run release source checks'];
const SECURITY_FILES = ['syft', 'cycloneDxRaw', 'cycloneDx', 'spdx', 'licenseNormalization', 'grype', 'database', 'upstream', 'policy'];

function check(value, message) {
  if (!value) throw new Error(`local release evidence: ${message}`);
}

function exactKeys(value, expected, label) {
  check(value && typeof value === 'object' && !Array.isArray(value) && isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort()), `${label} fields are invalid`);
}

function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function hashFile(path) {
  const digest = createHash('sha256');
  const chunk = Buffer.alloc(1024 * 1024);
  const fd = openSync(path, 'r');
  try { for (let count; (count = readSync(fd, chunk)) > 0;) digest.update(chunk.subarray(0, count)); }
  finally { closeSync(fd); }
  return digest.digest('hex');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

export function workflowStepDigests(text) {
  text = text.replaceAll('\r\n', '\n');
  const start = text.indexOf('\njobs:\n');
  check(start >= 0, 'workflow jobs section is missing');
  const jobs = [...text.slice(start).matchAll(/^  ([a-z][a-z0-9-]+):$/gm)].map((match) => ({ name: match[1], index: start + match.index }));
  const result = new Map();
  for (let i = 0; i < jobs.length; i += 1) {
    const source = text.slice(jobs[i].index, jobs[i + 1]?.index ?? text.length);
    const steps = [...source.matchAll(/^      - name: (.+)$/gm)];
    for (let j = 0; j < steps.length; j += 1) {
      const key = `${jobs[i].name}:${steps[j][1]}`;
      check(!result.has(key), 'workflow step names are duplicated');
      result.set(key, hash(source.slice(steps[j].index, steps[j + 1]?.index ?? source.length)));
    }
  }
  return result;
}

export function requiredTargetSteps(variant, architecture) {
  const steps = ['Verify architecture and product facts contract', 'Run complete candidate smoke matrix', 'Generate digest-bound security evidence'];
  if (variant === 'full') steps.push('Require retained FFmpeg builder and patch inputs to remain unchanged', 'Validate optional Docker client');
  if (variant === 'full' && architecture === 'amd64') steps.push('Require retained CloudCLI artifact and overlay inputs to remain unchanged', 'Record cryptography reproducibility disposition');
  return steps;
}

function architecture(value) {
  if (['amd64', 'x86_64', 'x64'].includes(value)) return 'amd64';
  if (['arm64', 'aarch64'].includes(value)) return 'arm64';
  return null;
}

function validateSbomArtifactChain(files, sourceRoot) {
  const output = mkdtempSync(join(tmpdir(), 'holyclaude-local-sbom-'));
  try {
    const normalized = join(output, basename(files.cycloneDx));
    const evidence = join(output, 'normalization-evidence.json');
    execFileSync(process.execPath, [
      join(sourceRoot, 'scripts/normalize-sbom-license-ids.mjs'),
      '--input', files.cycloneDxRaw, '--output', normalized, '--evidence', evidence,
    ], { cwd: sourceRoot, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 });
    check(hashFile(normalized) === hashFile(files.cycloneDx), 'raw and normalized CycloneDX bytes do not match the existing normalizer');
    check(isDeepStrictEqual(readJson(evidence), readJson(files.licenseNormalization)), 'SBOM license normalization evidence differs from the existing normalizer');
    const spdx = readJson(files.spdx);
    check(typeof spdx.spdxVersion === 'string' && spdx.spdxVersion && typeof spdx.SPDXID === 'string' && spdx.SPDXID, 'SPDX document identity is missing');
  } catch (error) {
    if (error.message.startsWith('local release evidence:')) throw error;
    throw new Error('local release evidence: raw SBOM normalization revalidation failed');
  } finally {
    check(resolve(output).startsWith(resolve(tmpdir()) + sep + 'holyclaude-local-sbom-'), 'temporary SBOM output is outside the owned directory');
    rmSync(output, { recursive: true, force: true });
  }
}

function revalidateSecurity(target, files, sourceRoot, now) {
  const output = mkdtempSync(join(tmpdir(), 'holyclaude-local-policy-'));
  try {
    execFileSync(process.execPath, [
      join(sourceRoot, 'scripts/evaluate-upstream-dependency-report.mjs'),
      '--policy', join(sourceRoot, 'security/upstream-dependency-policy.json'), '--release', 'v1.6.9',
      '--report', files.grype, '--sbom', files.cycloneDx, '--syft-json', files.syft,
      '--image-ref', target.image.reference, '--db-evidence', files.database,
      '--immutable-inputs', join(sourceRoot, 'security/immutable-inputs.yml'), '--output-dir', output,
      '--variant', target.variant, '--arch', target.architecture, '--image-digest', target.image.digest,
      '--as-of', now.toISOString().slice(0, 10),
    ], { cwd: sourceRoot, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 * 1024 });
    const fresh = readJson(join(output, 'release-upstream-vulnerabilities.json'));
    const recorded = readJson(files.upstream);
    check(isDeepStrictEqual({ ...recorded, asOf: fresh.asOf }, fresh) && isDeepStrictEqual(readJson(files.policy), readJson(join(output, 'policy.json'))), 'current security evaluation differs from recorded evidence');
  } catch (error) {
    if (error.message.startsWith('local release evidence:')) throw error;
    throw new Error('local release evidence: strict upstream security revalidation failed');
  } finally {
    check(resolve(output).startsWith(resolve(tmpdir()) + sep + 'holyclaude-local-policy-'), 'temporary output is outside the owned directory');
    rmSync(output, { recursive: true, force: true });
  }
}

export function validateLocalReleaseEvidence(receipt, {
  artifactRoot, sourceRoot, expectedSource, sourceState, now = new Date(), securityVerifier = revalidateSecurity,
}) {
  exactKeys(receipt, ['schemaVersion', 'executionOrigin', 'localRunId', 'release', 'sourceCommit', 'workflowSha256', 'sourceChecks', 'targets', 'artifacts'], 'receipt');
  check(receipt.schemaVersion === 1 && receipt.executionOrigin === 'local_native' && receipt.release === 'v1.6.9', 'receipt origin or release is invalid');
  check(/^[a-z0-9][a-z0-9_.-]{5,100}$/.test(receipt.localRunId), 'local run identity is invalid');
  check(SOURCE.test(receipt.sourceCommit) && receipt.sourceCommit === expectedSource && sourceState.head === expectedSource && sourceState.subject === receipt.release && sourceState.parent === PARENT && sourceState.parentCount === 1 && sourceState.clean === true && sourceState.rawBlobsMatch === true, 'source does not match the final clean committed release');
  const workflow = readFileSync(join(sourceRoot, '.github/workflows/docker-publish.yml'));
  check(hash(workflow) === receipt.workflowSha256, 'workflow hash differs from the qualified source');
  const steps = workflowStepDigests(workflow.toString('utf8'));
  const root = realpathSync(artifactRoot);
  const artifacts = new Map();
  check(Array.isArray(receipt.artifacts) && receipt.artifacts.length > 0, 'artifact inventory is empty');
  for (const artifact of receipt.artifacts) {
    exactKeys(artifact, ['path', 'bytes', 'sha256'], 'artifact');
    check(typeof artifact.path === 'string' && artifact.path && !artifact.path.includes('\\') && !artifact.path.startsWith('/') && posix.normalize(artifact.path) === artifact.path && !artifact.path.split('/').includes('..') && !artifacts.has(artifact.path), 'artifact path is duplicated or unsafe');
    const path = realpathSync(join(root, artifact.path));
    check(path.startsWith(root + (process.platform === 'win32' ? '\\' : '/')) && statSync(path).isFile(), 'artifact escapes the owned evidence root');
    check(Number.isSafeInteger(artifact.bytes) && artifact.bytes >= 0 && statSync(path).size === artifact.bytes && SHA.test(artifact.sha256) && hashFile(path) === artifact.sha256, 'artifact bytes or checksum changed');
    artifacts.set(artifact.path, { ...artifact, absolute: path });
  }
  const artifact = (path) => { check(artifacts.has(path), 'referenced evidence is absent from the artifact inventory'); return artifacts.get(path); };
  const read = (path) => readJson(artifact(path).absolute);
  const command = (path, job, step, target = null) => {
    const record = read(path);
    exactKeys(record, ['schemaVersion', 'executionOrigin', 'localRunId', 'sourceCommit', 'workflowSha256', 'job', 'step', 'stepSha256', 'target', 'imageDigest', 'startedAt', 'finishedAt', 'exitCode', 'skipped', 'stdout', 'stderr'], 'command record');
    const begin = Date.parse(record.startedAt), finish = Date.parse(record.finishedAt);
    check(record.schemaVersion === 1 && record.executionOrigin === 'local_native' && record.localRunId === receipt.localRunId && record.sourceCommit === expectedSource && record.workflowSha256 === receipt.workflowSha256, 'command source or local execution identity differs');
    check(record.job === job && record.step === step && record.stepSha256 === steps.get(`${job}:${step}`), 'command is not bound to the exact required workflow step');
    check(record.exitCode === 0 && record.skipped === false && Number.isFinite(begin) && Number.isFinite(finish) && begin <= finish && finish <= now.valueOf(), 'command failed, was skipped or has invalid timing');
    check(record.target === (target ? `${target.variant}-${target.architecture}` : null) && record.imageDigest === (target?.image.digest ?? null), 'command target or image differs');
    artifact(record.stdout); artifact(record.stderr);
    return record;
  };
  check(Array.isArray(receipt.sourceChecks) && receipt.sourceChecks.length === SOURCE_STEPS.length, 'complete source checks are required');
  const sourceNames = receipt.sourceChecks.map((path) => read(path).step);
  check(isDeepStrictEqual([...sourceNames].sort(), [...SOURCE_STEPS].sort()), 'source check steps are missing or duplicated');
  for (const path of receipt.sourceChecks) command(path, 'validate-release-ref', read(path).step);
  check(Array.isArray(receipt.targets) && receipt.targets.length === 4, 'all four native targets are required');
  const targetNames = receipt.targets.map((target) => `${target.variant}-${target.architecture}`).sort();
  check(isDeepStrictEqual(targetNames, ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64']), 'native targets are missing, duplicated or unsupported');
  const qualified = [];
  for (const target of receipt.targets) {
    exactKeys(target, ['variant', 'architecture', 'native', 'image', 'build', 'checks', 'security', 'quiescence'], 'target');
    exactKeys(target.native, ['kernel', 'engine', 'image'], 'native evidence');
    check(Object.values(target.native).every((value) => architecture(value) === target.architecture), 'native kernel, engine and image architectures disagree');
    exactKeys(target.image, ['reference', 'digest', 'manifest', 'config', 'layerDigests'], 'image');
    check(DIGEST.test(target.image.digest) && typeof target.image.reference === 'string' && target.image.reference.endsWith('@' + target.image.digest), 'image reference is not digest-bound');
    const manifestArtifact = artifact(target.image.manifest), configArtifact = artifact(target.image.config);
    check(`sha256:${manifestArtifact.sha256}` === target.image.digest, 'image manifest bytes differ from the candidate digest');
    const manifest = read(target.image.manifest), config = read(target.image.config);
    check(manifest.schemaVersion === 2 && ['application/vnd.oci.image.manifest.v1+json', 'application/vnd.docker.distribution.manifest.v2+json'].includes(manifest.mediaType), 'candidate is not a platform image manifest');
    check(manifest.config?.digest === `sha256:${configArtifact.sha256}` && ['application/vnd.oci.image.config.v1+json', 'application/vnd.docker.container.image.v1+json'].includes(manifest.config.mediaType) && manifest.config.size === configArtifact.bytes && config.os === 'linux' && config.architecture === target.architecture, 'image configuration identity or platform differs');
    check(Array.isArray(manifest.layers) && manifest.layers.length > 0 && manifest.layers.every((layer) => typeof layer.mediaType === 'string' && layer.mediaType && DIGEST.test(layer.digest) && Number.isSafeInteger(layer.size) && layer.size >= 0) && isDeepStrictEqual(manifest.layers.map((layer) => layer.digest), target.image.layerDigests), 'ordered image layer identity differs');
    check(config.rootfs?.type === 'layers' && Array.isArray(config.rootfs.diff_ids) && config.rootfs.diff_ids.length === manifest.layers.length && config.rootfs.diff_ids.every((id) => DIGEST.test(id)), 'image filesystem identity is invalid');
    check(config.config?.Labels?.['org.opencontainers.image.source'] === REPOSITORY && config.config.Labels['org.opencontainers.image.revision'] === expectedSource && config.config.Labels['org.opencontainers.image.version'] === receipt.release, 'image source labels differ');
    const build = read(target.build);
    exactKeys(build, ['schemaVersion', 'executionOrigin', 'localRunId', 'sourceCommit', 'workflowSha256', 'stepSha256', 'variant', 'architecture', 'platform', 'buildArgs', 'provenance', 'sbom', 'exitCode', 'skipped', 'imageDigest', 'stdout', 'stderr'], 'build record');
    check(build.schemaVersion === 1 && build.executionOrigin === 'local_native' && build.localRunId === receipt.localRunId && build.sourceCommit === expectedSource && build.workflowSha256 === receipt.workflowSha256 && build.stepSha256 === steps.get('build-candidate:Build and push candidate'), 'build is not bound to the final source and workflow');
    check(build.variant === target.variant && build.architecture === target.architecture && build.platform === `linux/${target.architecture}` && isDeepStrictEqual(build.buildArgs, { VARIANT: target.variant }) && build.provenance === false && build.sbom === false && build.exitCode === 0 && build.skipped === false && build.imageDigest === target.image.digest, 'build options, result or image identity differ');
    artifact(build.stdout); artifact(build.stderr);
    const required = requiredTargetSteps(target.variant, target.architecture);
    check(Array.isArray(target.checks) && target.checks.length === required.length && isDeepStrictEqual(target.checks.map((path) => read(path).step).sort(), [...required].sort()), 'required native checks are missing or duplicated');
    for (const path of target.checks) command(path, 'build-candidate', read(path).step, target);
    exactKeys(target.security, SECURITY_FILES, 'security evidence');
    const files = Object.fromEntries(SECURITY_FILES.map((key) => [key, artifact(target.security[key]).absolute]));
    const upstream = read(target.security.upstream), policy = read(target.security.policy);
    check(upstream.release === receipt.release && upstream.variant === target.variant && upstream.architecture === target.architecture && upstream.imageDigest === target.image.digest && upstream.status === 'accepted_upstream_vulnerability_not_fixed' && upstream.blockingProjectOrProvenanceErrorCount === 0 && policy.securityStatus === upstream.status && policy.imageDigest === target.image.digest, 'complete strict security disposition is required');
    const sourceBindings = { policySha256: 'security/upstream-dependency-policy.json', retainedBaselineSha256: 'security/retained-modified-third-party-baseline.json', immutableInputsSha256: 'security/immutable-inputs.yml' };
    for (const [key, file] of Object.entries(sourceBindings)) check(upstream[key] === hashFile(join(sourceRoot, file)), 'security source input changed');
    for (const [key, file] of Object.entries({ reportSha256: 'grype', sbomSha256: 'cycloneDx', syftJsonSha256: 'syft', databaseEvidenceSha256: 'database' })) check(upstream[key] === artifact(target.security[file]).sha256, 'raw security artifact binding changed');
    validateSbomArtifactChain(files, sourceRoot);
    securityVerifier(target, files, sourceRoot, now);
    const quiescence = read(target.quiescence);
    exactKeys(quiescence, ['schemaVersion', 'executionOrigin', 'localRunId', 'sourceCommit', 'target', 'imageDigest', 'verified', 'activeOwnedContainers', 'activeOwnedProcesses', 'stdout', 'stderr'], 'quiescence');
    check(quiescence.schemaVersion === 1 && quiescence.executionOrigin === 'local_native' && quiescence.localRunId === receipt.localRunId && quiescence.sourceCommit === expectedSource && quiescence.target === `${target.variant}-${target.architecture}` && quiescence.imageDigest === target.image.digest && quiescence.verified === true && isDeepStrictEqual(quiescence.activeOwnedContainers, []) && isDeepStrictEqual(quiescence.activeOwnedProcesses, []), 'owned native workers did not reach verified quiescence');
    artifact(quiescence.stdout); artifact(quiescence.stderr);
    qualified.push({ target: `${target.variant}-${target.architecture}`, digest: target.image.digest, configDigest: manifest.config.digest, layers: target.image.layerDigests, upstreamFindings: upstream.rawMatchCount });
  }
  return { schemaVersion: 1, executionOrigin: 'local_native', localRunId: receipt.localRunId, sourceCommit: expectedSource, release: receipt.release, workflowSha256: receipt.workflowSha256, verifiedAt: now.toISOString(), qualified, verified: true, hostedRunClaimed: false };
}

function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i], value = process.argv[i + 1];
    if (!['--receipt', '--artifact-root', '--source-root', '--source', '--output'].includes(key) || value === undefined || key in args) throw new Error('local release evidence: invalid arguments');
    args[key] = value;
  }
  check(Object.keys(args).length === 5, 'usage: --receipt FILE --artifact-root PATH --source-root PATH --source SHA --output FILE');
  check(!existsSync(args['--output']), 'preserve the existing verification output');
  const sourceRoot = realpathSync(args['--source-root']);
  const now = new Date();
  const sourceState = verifyCommittedSource(sourceRoot);
  check(sourceState.head === args['--source'] && sourceState.subject === 'v1.6.9' && sourceState.parent === PARENT && sourceState.parentCount === 1 && sourceState.clean === true && sourceState.rawBlobsMatch === true, 'source must be the exact clean release before revalidation');
  execFileSync(process.execPath, [join(sourceRoot, 'scripts/verify-immutable-inputs.mjs'), '--file', join(sourceRoot, 'security/immutable-inputs.yml'), '--release', 'v1.6.9', '--as-of', now.toISOString().slice(0, 10)], { cwd: sourceRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  const result = validateLocalReleaseEvidence(readJson(args['--receipt']), { artifactRoot: args['--artifact-root'], sourceRoot, expectedSource: args['--source'], sourceState, now });
  check(isDeepStrictEqual(verifyCommittedSource(sourceRoot), sourceState), 'source changed during revalidation');
  writeFileSync(args['--output'], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ verified: true, sourceCommit: result.sourceCommit, nativeTargets: result.qualified.length, hostedRunClaimed: false }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message.startsWith('local release evidence:') ? error.message : 'local release evidence: validation command failed'); process.exitCode = 1; }
}
