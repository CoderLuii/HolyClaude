import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { validateLocalDockerIsolation } from '../scripts/verify-local-docker-isolation.mjs';
import { requiredTargetSteps, validateLocalReleaseEvidence, workflowStepDigests } from '../scripts/verify-local-release-evidence.mjs';

const source = 'a'.repeat(40);
const digest = (character) => `sha256:${character.repeat(64)}`;
const now = new Date('2026-11-05T03:00:00Z');
const hash = (value) => createHash('sha256').update(value).digest('hex');

function isolationFixture() {
  const prefix = 'hc-native-fixture';
  const proof = {
    schemaVersion: 1, executionOrigin: 'local_native', scope: 'optional_docker_client', createdAt: '2026-11-05T02:59:00Z',
    release: 'v1.6.9', sourceCommit: source, prefix, architecture: 'amd64',
    sourceRoot: '/work/source', workRoot: `/work/${prefix}`, socketDirectory: `/work/${prefix}/socket`, dockerConfigDirectory: `/work/${prefix}/client`,
    outerEndpoint: 'unix:///var/run/docker.sock', outerEngineId: 'outer-engine', outerContainerId: 'b'.repeat(64), innerEngineId: 'private-engine',
    daemonImageRef: `docker.io/library/docker@${digest('c')}`, daemonImageId: digest('d'),
    candidateRef: `127.0.0.1:5000/coderluii/holyclaude@${digest('e')}`, candidateImageId: digest('f'),
    dataVolume: `${prefix}-data`, network: `${prefix}-network`, memoryBytes: 2147483648, memorySwapBytes: 2147483648,
    cpuPeriod: 100000, cpuQuota: 200000, pidsLimit: 2048, allowedImageIds: [digest('f')],
  };
  const observed = {
    platform: 'linux', kernelArchitecture: 'x86_64',
    source: { head: source, subject: 'v1.6.9', parentCount: 1, clean: true, rawBlobsMatch: true },
    environment: { dockerHost: `unix://${proof.socketDirectory}/docker.sock`, dockerConfig: proof.dockerConfigDirectory, conflictingVariables: [] },
    pathsCanonical: true, privateSocket: true,
    outerInfo: { ID: proof.outerEngineId, Architecture: 'x86_64', OSType: 'linux' },
    innerInfo: { ID: proof.innerEngineId, Architecture: 'x86_64', OSType: 'linux' },
    outerContainer: {
      Id: proof.outerContainerId, State: { Running: true }, Image: proof.daemonImageId,
      Config: { Image: proof.daemonImageRef, Cmd: ['dockerd', '--host=unix:///var/run/docker.sock'], Labels: { 'com.coderluii.validation': 'local-optional-docker-client', 'com.coderluii.validation.prefix': prefix, 'com.coderluii.validation.source': source } },
      HostConfig: { Privileged: true, NetworkMode: proof.network, Memory: proof.memoryBytes, MemorySwap: proof.memorySwapBytes, CpuPeriod: proof.cpuPeriod, CpuQuota: proof.cpuQuota, PidsLimit: proof.pidsLimit, PortBindings: {} },
      Mounts: [
        { Type: 'bind', Source: proof.sourceRoot, Destination: proof.sourceRoot, RW: false },
        { Type: 'bind', Source: proof.socketDirectory, Destination: '/var/run', RW: true },
        { Type: 'volume', Name: proof.dataVolume, Destination: '/var/lib/docker', RW: true },
      ],
    },
    dataVolume: { Name: proof.dataVolume, Driver: 'local', Scope: 'local', Options: null, Labels: { 'com.coderluii.validation.prefix': prefix } },
    network: { Name: proof.network, Driver: 'bridge', Scope: 'local', Options: {}, Labels: { 'com.coderluii.validation.prefix': prefix }, Containers: { [proof.outerContainerId]: { Name: `${prefix}-daemon` } } },
    daemonImage: { Id: proof.daemonImageId, Architecture: 'amd64', RepoDigests: [proof.daemonImageRef] },
    candidateImage: { Id: proof.candidateImageId, Architecture: 'amd64', RepoDigests: [proof.candidateRef], Config: { Labels: { 'org.opencontainers.image.source': 'https://github.com/CoderLuii/HolyClaude', 'org.opencontainers.image.revision': source, 'org.opencontainers.image.version': 'v1.6.9' } } },
    initial: { containers: [], volumes: [], networkNames: ['none', 'bridge', 'host'], imageIds: [proof.candidateImageId] },
  };
  return { proof, observed, expected: { sourceRoot: proof.sourceRoot, image: proof.candidateRef, prefix } };
}

test('accepts a complete live-observation fixture without claiming actual Docker execution', () => {
  const { proof, observed, expected } = isolationFixture();
  const result = validateLocalDockerIsolation(proof, observed, expected, now);
  assert.equal(result.verified, true);
  assert.equal(result.executionOrigin, 'local_native');
  assert.equal(result.privateEngineId, proof.innerEngineId);
});

test('accepts native ARM64 isolation observations without emulation', () => {
  const { proof, observed, expected } = isolationFixture();
  proof.architecture = 'arm64';
  observed.kernelArchitecture = 'aarch64';
  observed.outerInfo.Architecture = 'aarch64'; observed.innerInfo.Architecture = 'aarch64';
  observed.daemonImage.Architecture = 'arm64'; observed.candidateImage.Architecture = 'arm64';
  assert.equal(validateLocalDockerIsolation(proof, observed, expected, now).architecture, 'arm64');
});

function automaticBridgeNetwork() {
  return {
    EnableIPv4: true, EnableIPv6: false, Internal: false, Attachable: false,
    Ingress: false, ConfigOnly: false,
    Options: { 'com.docker.network.enable_ipv4': 'true', 'com.docker.network.enable_ipv6': 'false' },
  };
}

for (const arch of ['amd64', 'arm64']) {
  test(`accepts Docker 29 automatic plain-bridge flags on native ${arch}`, () => {
    const { proof, observed, expected } = isolationFixture();
    Object.assign(observed.network, automaticBridgeNetwork());
    if (arch === 'arm64') {
      proof.architecture = 'arm64'; observed.kernelArchitecture = 'aarch64';
      observed.outerInfo.Architecture = 'aarch64'; observed.innerInfo.Architecture = 'aarch64';
      observed.daemonImage.Architecture = 'arm64'; observed.candidateImage.Architecture = 'arm64';
    }
    assert.equal(validateLocalDockerIsolation(proof, observed, expected, now).verified, true);
  });
}

for (const options of [undefined, null, {}]) {
  test(`accepts legacy empty bridge options ${JSON.stringify(options)}`, () => {
    const { proof, observed, expected } = isolationFixture();
    Object.assign(observed.network, automaticBridgeNetwork(), { Options: options });
    assert.equal(validateLocalDockerIsolation(proof, observed, expected, now).verified, true);
  });
}

for (const [label, mutate] of [
  ['unknown default option', (network) => { network.Options['com.docker.network.bridge.enable_icc'] = 'true'; }],
  ['custom host binding', (network) => { network.Options['com.docker.network.bridge.host_binding_ipv4'] = '0.0.0.0'; }],
  ['custom masquerading', (network) => { network.Options['com.docker.network.bridge.enable_ip_masquerade'] = 'false'; }],
  ['missing IPv4 option', (network) => { delete network.Options['com.docker.network.enable_ipv4']; }],
  ['missing IPv6 option', (network) => { delete network.Options['com.docker.network.enable_ipv6']; }],
  ['disabled IPv4 option', (network) => { network.Options['com.docker.network.enable_ipv4'] = 'false'; }],
  ['enabled IPv6 option', (network) => { network.Options['com.docker.network.enable_ipv6'] = 'true'; }],
  ['boolean IPv4 option', (network) => { network.Options['com.docker.network.enable_ipv4'] = true; }],
  ['boolean IPv6 option', (network) => { network.Options['com.docker.network.enable_ipv6'] = false; }],
  ['missing observed IPv4 flag', (network) => { delete network.EnableIPv4; }],
  ['missing observed IPv6 flag', (network) => { delete network.EnableIPv6; }],
  ['mismatched observed IPv4 flag', (network) => { network.EnableIPv4 = false; }],
  ['mismatched observed IPv6 flag', (network) => { network.EnableIPv6 = true; }],
  ['external network driver', (network) => { network.Driver = 'external-plugin'; }],
  ['host network driver', (network) => { network.Driver = 'host'; }],
  ['nonlocal bridge', (network) => { network.Scope = 'swarm'; }],
  ['internal network', (network) => { network.Internal = true; }],
  ['attachable network', (network) => { network.Attachable = true; }],
  ['ingress network', (network) => { network.Ingress = true; }],
  ['configuration-only network', (network) => { network.ConfigOnly = true; }],
]) {
  test(`rejects automatic bridge metadata with ${label}`, () => {
    const { proof, observed, expected } = isolationFixture();
    Object.assign(observed.network, automaticBridgeNetwork()); mutate(observed.network);
    assert.throws(() => validateLocalDockerIsolation(proof, observed, expected, now), /local Docker isolation:.*network/);
  });
}

for (const [label, mutate] of [
  ['array options', (network) => { network.Options = []; }],
  ['string options', (network) => { network.Options = ''; }],
  ['numeric options', (network) => { network.Options = 0; }],
  ['boolean options', (network) => { network.Options = false; }],
  ['disabled IPv4 flag', (network) => { network.EnableIPv4 = false; }],
  ['enabled IPv6 flag', (network) => { network.EnableIPv6 = true; }],
  ['mistyped IPv4 flag', (network) => { network.EnableIPv4 = 'true'; }],
  ['mistyped IPv6 flag', (network) => { network.EnableIPv6 = 'false'; }],
  ['internal network', (network) => { network.Internal = true; }],
  ['attachable network', (network) => { network.Attachable = true; }],
  ['ingress network', (network) => { network.Ingress = true; }],
  ['configuration-only network', (network) => { network.ConfigOnly = true; }],
]) {
  test(`rejects empty bridge metadata with ${label}`, () => {
    const { proof, observed, expected } = isolationFixture(); mutate(observed.network);
    assert.throws(() => validateLocalDockerIsolation(proof, observed, expected, now), /local Docker isolation:.*network/);
  });
}

for (const [label, mutate] of [
  ['boolean authorization', (data) => { data.proof.authorized = true; }],
  ['fabricated hosted metadata', (data) => { data.proof.run_id = 123; }],
  ['stale proof', (data) => { data.proof.createdAt = '2026-11-05T02:00:00Z'; }],
  ['future proof', (data) => { data.proof.createdAt = '2026-11-05T04:00:00Z'; }],
  ['wrong source', (data) => { data.observed.source.head = 'b'.repeat(40); }],
  ['wrong release subject', (data) => { data.observed.source.subject = 'unpublished draft'; }],
  ['merge release', (data) => { data.observed.source.parentCount = 2; }],
  ['crash-corrupted source hidden by clean status', (data) => { data.observed.source.rawBlobsMatch = false; }],
  ['dirty source', (data) => { data.observed.source.clean = false; }],
  ['same outer and inner engine', (data) => { data.proof.innerEngineId = data.proof.outerEngineId; }],
  ['live private engine mismatch', (data) => { data.observed.innerInfo.ID = 'another'; }],
  ['non-native image', (data) => { data.observed.candidateImage.Architecture = 'arm64'; }],
  ['emulated controller', (data) => { data.observed.kernelArchitecture = 'aarch64'; }],
  ['personal Docker context override', (data) => { data.observed.environment.conflictingVariables = ['DOCKER_CONTEXT']; }],
  ['shared socket selected', (data) => { data.observed.environment.dockerHost = data.proof.outerEndpoint; }],
  ['shared client profile selected', (data) => { data.observed.environment.dockerConfig = '/home/user/.docker'; }],
  ['missing private socket', (data) => { data.observed.privateSocket = false; }],
  ['symlinked work root', (data) => { data.observed.pathsCanonical = false; }],
  ['unowned daemon label', (data) => { data.observed.outerContainer.Config.Labels['com.coderluii.validation.prefix'] = 'another'; }],
  ['stopped daemon', (data) => { data.observed.outerContainer.State.Running = false; }],
  ['changed daemon image', (data) => { data.observed.outerContainer.Image = digest('a'); }],
  ['unverified daemon repository digest', (data) => { data.observed.daemonImage.RepoDigests = []; }],
  ['host process namespace', (data) => { data.observed.outerContainer.HostConfig.PidMode = 'host'; }],
  ['public daemon port', (data) => { data.observed.outerContainer.HostConfig.PortBindings = { '2375/tcp': [{ HostPort: '2375' }] }; }],
  ['TCP daemon listener', (data) => { data.observed.outerContainer.Config.Cmd.push('--host=tcp://0.0.0.0:2375'); }],
  ['implicit daemon listeners', (data) => { data.observed.outerContainer.Config.Cmd = ['dockerd']; }],
  ['uncapped memory', (data) => { data.observed.outerContainer.HostConfig.Memory = 0; }],
  ['different CPU limit', (data) => { data.observed.outerContainer.HostConfig.CpuQuota = 0; }],
  ['host socket mount', (data) => { data.observed.outerContainer.Mounts.push({ Type: 'bind', Source: '/var/run/docker.sock', Destination: '/host.sock', RW: true }); }],
  ['writable source', (data) => { data.observed.outerContainer.Mounts[0].RW = true; }],
  ['unowned data volume', (data) => { data.observed.dataVolume.Labels = {}; }],
  ['bind-backed named data volume', (data) => { data.observed.dataVolume.Options = { type: 'none', o: 'bind', device: '/shared/unrelated-data' }; }],
  ['external data volume driver', (data) => { data.observed.dataVolume.Driver = 'external-plugin'; }],
  ['nonlocal data volume scope', (data) => { data.observed.dataVolume.Scope = 'global'; }],
  ['host network driver', (data) => { data.observed.network.Driver = 'host'; }],
  ['nonlocal network scope', (data) => { data.observed.network.Scope = 'swarm'; }],
  ['custom network options', (data) => { data.observed.network.Options = { 'com.docker.network.bridge.name': 'unrelated-bridge' }; }],
  ['another network member', (data) => { data.observed.network.Containers.another = { Name: 'unrelated-container' }; }],
  ['another running workload', (data) => { data.observed.initial.containers = ['unrelated']; }],
  ['another volume', (data) => { data.observed.initial.volumes = ['unrelated']; }],
  ['another network', (data) => { data.observed.initial.networkNames.push('unrelated'); }],
  ['unexpected image', (data) => { data.observed.initial.imageIds.push(digest('a')); }],
  ['wrong candidate digest', (data) => { data.observed.candidateImage.RepoDigests = []; }],
  ['candidate from another commit', (data) => { data.observed.candidateImage.Config.Labels['org.opencontainers.image.revision'] = 'b'.repeat(40); }],
]) {
  test(`rejects local isolation proof with ${label}`, () => {
    const data = isolationFixture(); mutate(data);
    assert.throws(() => validateLocalDockerIsolation(data.proof, data.observed, data.expected, now), /local Docker isolation:/);
  });
}

function releaseFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-local-evidence-'));
  t.after(() => {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep + 'holyclaude-local-evidence-'));
    rmSync(root, { recursive: true, force: true });
  });
  const sourceRoot = join(root, 'source'), artifactRoot = join(root, 'artifacts');
  mkdirSync(sourceRoot); mkdirSync(artifactRoot);
  const writeSource = (path, value) => { mkdirSync(join(sourceRoot, path, '..'), { recursive: true }); writeFileSync(join(sourceRoot, path), value); };
  const sourceSteps = ['Require matching release ref and commit', 'Validate upstream dependency advisory policy', 'Run release source checks'];
  const candidateSteps = [...new Set(['Build and push candidate', ...requiredTargetSteps('full', 'amd64'), ...requiredTargetSteps('full', 'arm64'), ...requiredTargetSteps('slim', 'amd64')])];
  const workflow = ['name: fixture', 'jobs:', '  validate-release-ref:', '    steps:', ...sourceSteps.flatMap((step) => [`      - name: ${step}`, '        run: |', '          true']), '  build-candidate:', '    steps:', ...candidateSteps.flatMap((step) => [`      - name: ${step}`, '        run: |', '          true'])].join('\n') + '\n';
  writeSource('.github/workflows/docker-publish.yml', workflow);
  writeSource('scripts/normalize-sbom-license-ids.mjs', readFileSync('scripts/normalize-sbom-license-ids.mjs'));
  for (const path of ['security/upstream-dependency-policy.json', 'security/retained-modified-third-party-baseline.json', 'security/immutable-inputs.yml']) writeSource(path, '{}\n');
  const paths = new Set();
  const write = (path, value) => { mkdirSync(join(artifactRoot, path, '..'), { recursive: true }); writeFileSync(join(artifactRoot, path), typeof value === 'string' ? value : JSON.stringify(value) + '\n'); paths.add(path); return path; };
  const read = (path) => JSON.parse(readFileSync(join(artifactRoot, path), 'utf8'));
  const stepDigests = workflowStepDigests(workflow);
  const receipt = { schemaVersion: 1, executionOrigin: 'local_native', localRunId: 'hc-native-fixture', release: 'v1.6.9', sourceCommit: source, workflowSha256: hash(workflow), sourceChecks: [], targets: [], artifacts: [] };
  const command = (path, job, step, target = null) => write(path, {
    schemaVersion: 1, executionOrigin: 'local_native', localRunId: receipt.localRunId, sourceCommit: source, workflowSha256: receipt.workflowSha256,
    job, step, stepSha256: stepDigests.get(`${job}:${step}`), target: target ? `${target.variant}-${target.architecture}` : null, imageDigest: target?.image.digest ?? null,
    startedAt: '2026-11-05T02:00:00Z', finishedAt: '2026-11-05T02:01:00Z', exitCode: 0, skipped: false,
    stdout: write(path + '.stdout', 'fixture command output\n'), stderr: write(path + '.stderr', ''),
  });
  receipt.sourceChecks = sourceSteps.map((step, index) => command(`source/${index}.json`, 'validate-release-ref', step));
  for (const [variant, arch] of [['full', 'amd64'], ['full', 'arm64'], ['slim', 'amd64'], ['slim', 'arm64']]) {
    const prefix = `${variant}-${arch}`;
    const config = JSON.stringify({ os: 'linux', architecture: arch, rootfs: { type: 'layers', diff_ids: [digest('2')] }, config: { Labels: { 'org.opencontainers.image.source': 'https://github.com/CoderLuii/HolyClaude', 'org.opencontainers.image.revision': source, 'org.opencontainers.image.version': receipt.release } } });
    const manifest = JSON.stringify({ schemaVersion: 2, mediaType: 'application/vnd.oci.image.manifest.v1+json', config: { mediaType: 'application/vnd.oci.image.config.v1+json', digest: `sha256:${hash(config)}`, size: Buffer.byteLength(config) }, layers: [{ mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip', digest: digest('1'), size: 123 }] });
    const imageDigest = `sha256:${hash(manifest)}`;
    const target = { variant, architecture: arch, native: { kernel: arch === 'amd64' ? 'x86_64' : 'aarch64', engine: arch, image: arch }, image: { reference: `registry.fixture/coderluii/holyclaude@${imageDigest}`, digest: imageDigest, manifest: write(`${prefix}/manifest.json`, manifest), config: write(`${prefix}/config.json`, config), layerDigests: [digest('1')] } };
    target.build = write(`${prefix}/build.json`, { schemaVersion: 1, executionOrigin: 'local_native', localRunId: receipt.localRunId, sourceCommit: source, workflowSha256: receipt.workflowSha256, stepSha256: stepDigests.get('build-candidate:Build and push candidate'), variant, architecture: arch, platform: `linux/${arch}`, buildArgs: { VARIANT: variant }, provenance: false, sbom: false, exitCode: 0, skipped: false, imageDigest, stdout: write(`${prefix}/build.stdout`, 'fixture build output\n'), stderr: write(`${prefix}/build.stderr`, '') });
    target.checks = requiredTargetSteps(variant, arch).map((step, index) => command(`${prefix}/checks/${index}.json`, 'build-candidate', step, target));
    target.security = Object.fromEntries(['syft', 'cycloneDxRaw', 'cycloneDx', 'spdx', 'licenseNormalization', 'grype', 'database'].map((key) => [key, write(`${prefix}/security/${key}.json`, { fixture: key })]));
    const rawCycloneDx = { bomFormat: 'CycloneDX', specVersion: '1.7', components: [{ name: 'fixture', licenses: [{ license: { id: 'Artistic-dist' } }] }] };
    const normalizedCycloneDx = structuredClone(rawCycloneDx);
    normalizedCycloneDx.components[0].licenses[0].license = { name: 'Artistic-dist' };
    write(target.security.cycloneDxRaw, rawCycloneDx);
    write(target.security.cycloneDx, JSON.stringify(normalizedCycloneDx, null, 2) + '\n');
    write(target.security.spdx, { spdxVersion: 'SPDX-2.3', SPDXID: 'SPDXRef-DOCUMENT' });
    write(target.security.licenseNormalization, {
      schemaVersion: 1, input: 'cycloneDxRaw.json', output: 'cycloneDx.json',
      inputSha256: hash(readFileSync(join(artifactRoot, target.security.cycloneDxRaw))),
      outputSha256: hash(readFileSync(join(artifactRoot, target.security.cycloneDx))),
      normalizations: [{ id: 'Artistic-dist', count: 1, representation: 'CycloneDX license name', rationale: 'The CycloneDX 1.7 schema SPDX enum predates this current SPDX license identifier.' }],
    });
    const upstream = {
      release: receipt.release, variant, architecture: arch, imageDigest, status: 'accepted_upstream_vulnerability_not_fixed', blockingProjectOrProvenanceErrorCount: 0, rawMatchCount: 1,
      policySha256: hash(readFileSync(join(sourceRoot, 'security/upstream-dependency-policy.json'))), retainedBaselineSha256: hash(readFileSync(join(sourceRoot, 'security/retained-modified-third-party-baseline.json'))), immutableInputsSha256: hash(readFileSync(join(sourceRoot, 'security/immutable-inputs.yml'))),
      reportSha256: hash(readFileSync(join(artifactRoot, target.security.grype))), sbomSha256: hash(readFileSync(join(artifactRoot, target.security.cycloneDx))), syftJsonSha256: hash(readFileSync(join(artifactRoot, target.security.syft))), databaseEvidenceSha256: hash(readFileSync(join(artifactRoot, target.security.database))),
    };
    target.security.upstream = write(`${prefix}/security/upstream.json`, upstream);
    target.security.policy = write(`${prefix}/security/policy.json`, { securityStatus: upstream.status, imageDigest });
    target.quiescence = write(`${prefix}/quiescence.json`, { schemaVersion: 1, executionOrigin: 'local_native', localRunId: receipt.localRunId, sourceCommit: source, target: prefix, imageDigest, verified: true, activeOwnedContainers: [], activeOwnedProcesses: [], stdout: write(`${prefix}/cleanup.stdout`, 'fixture cleanup output\n'), stderr: write(`${prefix}/cleanup.stderr`, '') });
    receipt.targets.push(target);
  }
  const refresh = () => { receipt.artifacts = [...paths].sort().map((path) => ({ path, bytes: statSync(join(artifactRoot, path)).size, sha256: hash(readFileSync(join(artifactRoot, path))) })); };
  refresh();
  const securityCalls = [];
  const options = { artifactRoot, sourceRoot, expectedSource: source, sourceState: { head: source, subject: 'v1.6.9', parent: 'b9e0d11d8d4173899e210742a8f7af8cefcf94f1', parentCount: 1, clean: true, rawBlobsMatch: true }, now, securityVerifier: (target) => { securityCalls.push(`${target.variant}-${target.architecture}`); } };
  return { receipt, options, write, read, refresh, securityCalls, artifactRoot, sourceRoot };
}

test('accepts all four complete local-native fixtures and requires four strict security callbacks', (t) => {
  const data = releaseFixture(t);
  const result = validateLocalReleaseEvidence(data.receipt, data.options);
  assert.equal(result.verified, true);
  assert.equal(result.hostedRunClaimed, false);
  assert.equal(result.qualified.length, 4);
  assert.equal(result.qualified[0].upstreamFindings, 1);
  assert.deepEqual(data.securityCalls.sort(), ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64']);
});

for (const [label, mutate] of [
  ['fake hosted run field', (data) => { data.receipt.run_id = 123; }],
  ['missing target', (data) => { data.receipt.targets.pop(); }],
  ['duplicate target', (data) => { data.receipt.targets[3] = structuredClone(data.receipt.targets[0]); }],
  ['emulated architecture', (data) => { data.receipt.targets[1].native.kernel = 'x86_64'; }],
  ['source mismatch', (data) => { data.options.sourceState.head = 'b'.repeat(40); }],
  ['wrong release subject', (data) => { data.options.sourceState.subject = 'unpublished draft'; }],
  ['wrong release parent', (data) => { data.options.sourceState.parent = 'b'.repeat(40); }],
  ['merge release', (data) => { data.options.sourceState.parentCount = 2; }],
  ['raw-byte source corruption', (data) => { data.options.sourceState.rawBlobsMatch = false; }],
  ['dirty source', (data) => { data.options.sourceState.clean = false; }],
  ['changed workflow', (data) => { writeFileSync(join(data.sourceRoot, '.github/workflows/docker-publish.yml'), 'jobs: {}\n'); }],
  ['wrong manifest digest', (data) => { data.receipt.targets[0].image.digest = digest('a'); data.receipt.targets[0].image.reference = `registry.fixture/coderluii/holyclaude@${digest('a')}`; }],
  ['wrong ordered layers', (data) => { data.receipt.targets[0].image.layerDigests = [digest('2')]; }],
  ['unqualified test omitted', (data) => { data.receipt.targets[0].checks.pop(); }],
  ['source test omitted', (data) => { data.receipt.sourceChecks.pop(); }],
  ['no artifact inventory', (data) => { data.receipt.artifacts = []; }],
  ['unsafe artifact path', (data) => { data.receipt.artifacts[0].path = '../unowned.json'; }],
  ['duplicate artifact', (data) => { data.receipt.artifacts.push(structuredClone(data.receipt.artifacts[0])); }],
  ['changed raw file', (data) => { writeFileSync(join(data.artifactRoot, data.receipt.targets[0].security.syft), 'changed\n'); }],
  ['strict evaluator rejection', (data) => { data.options.securityVerifier = () => { throw new Error('local release evidence: rejected actual raw security evidence'); }; }],
]) {
  test(`rejects local release receipt with ${label}`, (t) => {
    const data = releaseFixture(t); mutate(data);
    assert.throws(() => validateLocalReleaseEvidence(data.receipt, data.options), /local release evidence:/);
  });
}

for (const [label, select, mutate] of [
  ['skipped native test', (data) => data.receipt.targets[0].checks[0], (record) => { record.skipped = true; }],
  ['failed native test', (data) => data.receipt.targets[0].checks[0], (record) => { record.exitCode = 1; }],
  ['changed test body', (data) => data.receipt.targets[0].checks[0], (record) => { record.stepSha256 = '0'.repeat(64); }],
  ['test bound to another image', (data) => data.receipt.targets[0].checks[0], (record) => { record.imageDigest = digest('a'); }],
  ['test without actual timing', (data) => data.receipt.targets[0].checks[0], (record) => { record.finishedAt = null; }],
  ['skipped source test', (data) => data.receipt.sourceChecks[0], (record) => { record.skipped = true; }],
  ['unapproved build argument', (data) => data.receipt.targets[0].build, (record) => { record.buildArgs.SKIP_TEST = 'true'; }],
  ['failed build', (data) => data.receipt.targets[0].build, (record) => { record.exitCode = 1; }],
  ['first-party security failure', (data) => data.receipt.targets[0].security.upstream, (record) => { record.blockingProjectOrProvenanceErrorCount = 1; }],
  ['security evidence for another image', (data) => data.receipt.targets[0].security.upstream, (record) => { record.imageDigest = digest('a'); }],
  ['security evidence from changed inputs', (data) => data.receipt.targets[0].security.upstream, (record) => { record.immutableInputsSha256 = '0'.repeat(64); }],
  ['raw CycloneDX document', (data) => data.receipt.targets[0].security.cycloneDxRaw, (record) => { record.components[0].name = 'changed'; }],
  ['normalization input hash', (data) => data.receipt.targets[0].security.licenseNormalization, (record) => { record.inputSha256 = '0'.repeat(64); }],
  ['normalization output hash', (data) => data.receipt.targets[0].security.licenseNormalization, (record) => { record.outputSha256 = '0'.repeat(64); }],
  ['normalization count', (data) => data.receipt.targets[0].security.licenseNormalization, (record) => { record.normalizations[0].count = 2; }],
  ['SPDX version', (data) => data.receipt.targets[0].security.spdx, (record) => { delete record.spdxVersion; }],
  ['SPDX document ID', (data) => data.receipt.targets[0].security.spdx, (record) => { delete record.SPDXID; }],
  ['live owned process', (data) => data.receipt.targets[0].quiescence, (record) => { record.activeOwnedProcesses = [1234]; }],
  ['unverified cleanup', (data) => data.receipt.targets[0].quiescence, (record) => { record.verified = false; }],
]) {
  test(`rejects rehashed but invalid ${label}`, (t) => {
    const data = releaseFixture(t), path = select(data), record = data.read(path);
    mutate(record); data.write(path, record); data.refresh();
    assert.throws(() => validateLocalReleaseEvidence(data.receipt, data.options), /local release evidence:/);
  });
}

test('hosted optional-client guard remains the default and the local branch invokes live isolation verification', () => {
  const source = readFileSync('tests/validate_optional_docker_client.sh', 'utf8');
  assert.match(source, /GITHUB_ACTIONS:-false/);
  assert.match(source, /RUNNER_ENVIRONMENT:-/);
  assert.match(source, /--local-isolation-proof/);
  assert.match(source, /node "\$\{repo_root\}\/scripts\/verify-local-docker-isolation\.mjs"/);
  for (const required of ['compose_client create create', 'compose_client start start', 'compose_client ps ps', 'compose_client stop stop', 'compose_client down down --remove-orphans', 'Unexpected non-root Docker socket access', 'added_layer_compressed_bytes']) assert.ok(source.includes(required));
});

for (const local of [true, false]) {
  test(`dispatches the ${local ? 'local' : 'hosted'} optional-client build with the expected builder`, (t) => {
    const root = mkdtempSync(join(tmpdir(), 'holyclaude-build-dispatch-'));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const bin = join(root, 'bin'); mkdirSync(bin);
    const writeCommand = (name, contents) => writeFileSync(join(bin, name), '#!/usr/bin/env bash\n' + contents, { mode: 0o755 });
    writeCommand('node', 'exit 0\n');
    writeCommand('jq', 'exit 0\n');
    writeCommand('uname', 'printf "x86_64\\n"\n');
    writeCommand('docker', `case "$1 $2" in
  'run --rm') printf 'full\\n' ;;
  'image inspect')
    [[ $3 != holyclaude-optional-docker-client:* ]] || exit 1
    case "$*" in *Architecture*) printf 'amd64\\n' ;; *Config.User*) printf 'root\\n' ;; esac ;;
  'info --format') printf 'x86_64\\n' ;;
  'buildx build') printf '%s\\n' "$@" > "$BUILD_DISPATCH_OUTPUT"; exit 86 ;;
  'ps -aq'|'network ls') ;;
  *) printf 'Unexpected mocked command\\n' >&2; exit 87 ;;
esac
`);
    const output = join(root, 'build-arguments.txt');
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
    const forward = (value) => value.replaceAll('\\', '/');
    const env = { ...process.env, PATH: forward(bin) + (process.platform === 'win32' ? ';' : ':') + process.env.PATH, RUN_SOCKET_COMPOSE: '1', REQUIRE_SOCKET_COMPOSE: '1', GITHUB_ACTIONS: local ? 'false' : 'true', RUNNER_ENVIRONMENT: local ? '' : 'github-hosted', BUILD_DISPATCH_OUTPUT: forward(output) };
    const args = ['tests/validate_optional_docker_client.sh', `registry.fixture/full@${digest('e')}`, 'hc-builder-fixture'];
    if (local) args.push('--local-isolation-proof', forward(join(root, 'fixture-proof.json')));
    const result = spawnSync(bash, args, { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 86, result.stderr || result.error?.message);
    const values = readFileSync(output, 'utf8').trim().split('\n');
    const selected = values.indexOf('--builder');
    if (local) {
      assert.notEqual(selected, -1, 'local builds must override saved Buildx builder selection');
      assert.equal(values[selected + 1], 'default');
    } else assert.equal(selected, -1, 'hosted builder selection must remain unchanged');
    for (const argument of ['--pull', '--load', '--metadata-file', '--build-arg', '--tag', '--file']) assert.ok(values.includes(argument));
  });
}
