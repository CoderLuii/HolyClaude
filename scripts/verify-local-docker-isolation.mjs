#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readlinkSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA256 = /^sha256:[a-f0-9]{64}$/;
const SOURCE_SHA = /^[a-f0-9]{40}$/;
const PROOF_KEYS = new Set([
  'schemaVersion', 'executionOrigin', 'scope', 'createdAt', 'release', 'sourceCommit',
  'prefix', 'architecture', 'sourceRoot', 'workRoot', 'socketDirectory', 'dockerConfigDirectory',
  'outerEndpoint', 'outerEngineId', 'outerContainerId', 'innerEngineId',
  'daemonImageRef', 'daemonImageId', 'candidateRef', 'candidateImageId', 'dataVolume',
  'network', 'memoryBytes', 'memorySwapBytes', 'cpuPeriod', 'cpuQuota', 'pidsLimit', 'allowedImageIds',
]);

function requireThat(value, message) {
  if (!value) throw new Error(`local Docker isolation: ${message}`);
}

function nativeArchitecture(value) {
  if (['x86_64', 'amd64', 'x64'].includes(value)) return 'amd64';
  if (['aarch64', 'arm64'].includes(value)) return 'arm64';
  return null;
}

function canonicalImage(value) {
  return value?.replace(/^docker\.io\/library\//, '');
}

function absolutePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.includes('\0') &&
    posix.normalize(value) === value && !value.split('/').includes('..');
}

function contained(root, value) {
  return absolutePath(value) && value.startsWith(root + '/');
}

export function isPlainLocalBridge(network) {
  if (!network || typeof network !== 'object' || Array.isArray(network) || network.Driver !== 'bridge' || network.Scope !== 'local') return false;
  for (const [field, expected] of Object.entries({ EnableIPv4: true, EnableIPv6: false, Internal: false, Attachable: false, Ingress: false, ConfigOnly: false })) {
    if (network[field] !== undefined && network[field] !== expected) return false;
  }
  const options = network.Options ?? {};
  if (typeof options !== 'object' || Array.isArray(options)) return false;
  const keys = Object.keys(options);
  if (keys.length === 0) return true;
  return keys.length === 2 && keys.every((key) => ['com.docker.network.enable_ipv4', 'com.docker.network.enable_ipv6'].includes(key)) &&
    options['com.docker.network.enable_ipv4'] === 'true' && options['com.docker.network.enable_ipv6'] === 'false' &&
    network.EnableIPv4 === true && network.EnableIPv6 === false;
}

function validateProof(proof, expected, now) {
  requireThat(proof && typeof proof === 'object' && !Array.isArray(proof), 'proof must be an object');
  requireThat(JSON.stringify(Object.keys(proof).sort()) === JSON.stringify([...PROOF_KEYS].sort()), 'proof fields are invalid');
  requireThat(proof.schemaVersion === 1 && proof.executionOrigin === 'local_native' && proof.scope === 'optional_docker_client', 'proof origin or scope is invalid');
  const age = now.valueOf() - Date.parse(proof.createdAt);
  requireThat(Number.isFinite(age) && age >= 0 && age <= 300000, 'proof is future-dated or older than five minutes');
  requireThat(proof.release === 'v1.6.9' && SOURCE_SHA.test(proof.sourceCommit), 'release or source commit is invalid');
  requireThat(/^[a-z0-9][a-z0-9_.-]{5,62}$/.test(proof.prefix) && proof.prefix === expected.prefix, 'prefix does not match this test');
  requireThat(proof.candidateRef === expected.image && /^[^\s@]+@sha256:[a-f0-9]{64}$/.test(proof.candidateRef), 'candidate must match the exact requested digest');
  requireThat(absolutePath(proof.sourceRoot) && proof.sourceRoot === expected.sourceRoot, 'source root does not match this checkout');
  requireThat(absolutePath(proof.workRoot) && posix.basename(proof.workRoot) === proof.prefix && proof.workRoot !== proof.sourceRoot, 'work root is not task-owned');
  requireThat(contained(proof.workRoot, proof.socketDirectory) && contained(proof.workRoot, proof.dockerConfigDirectory), 'socket and client configuration must be inside the owned work root');
  requireThat(/^unix:\/\/\//.test(proof.outerEndpoint) && proof.outerEndpoint !== `unix://${proof.socketDirectory}/docker.sock`, 'outer and private Docker endpoints must differ');
  requireThat(typeof proof.outerEngineId === 'string' && proof.outerEngineId && typeof proof.innerEngineId === 'string' && proof.innerEngineId && proof.outerEngineId !== proof.innerEngineId, 'engine identities must be distinct');
  requireThat(/^[a-f0-9]{64}$/.test(proof.outerContainerId), 'owned daemon container ID is invalid');
  requireThat(/^docker\.io\/library\/docker@sha256:[a-f0-9]{64}$/.test(proof.daemonImageRef) && SHA256.test(proof.daemonImageId), 'daemon must use a pinned official Docker image');
  requireThat(SHA256.test(proof.candidateImageId), 'candidate image ID is invalid');
  requireThat(proof.dataVolume === `${proof.prefix}-data` && proof.network === `${proof.prefix}-network`, 'daemon data volume or network is not owned');
  requireThat(Number.isSafeInteger(proof.memoryBytes) && proof.memoryBytes >= 268435456 && Number.isSafeInteger(proof.memorySwapBytes) && proof.memorySwapBytes >= proof.memoryBytes, 'hard memory limits are invalid');
  requireThat(proof.cpuPeriod === 100000 && Number.isSafeInteger(proof.cpuQuota) && proof.cpuQuota > 0 && Number.isSafeInteger(proof.pidsLimit) && proof.pidsLimit > 0 && proof.pidsLimit <= 4096, 'hard CPU or PID limits are invalid');
  requireThat(Array.isArray(proof.allowedImageIds) && proof.allowedImageIds.length > 0 && new Set(proof.allowedImageIds).size === proof.allowedImageIds.length && proof.allowedImageIds.every((id) => SHA256.test(id)) && proof.allowedImageIds.includes(proof.candidateImageId), 'initial allowed image inventory is invalid');
}

export function validateLocalDockerIsolation(proof, observed, expected, now = new Date()) {
  validateProof(proof, expected, now);
  requireThat(observed.platform === 'linux' && nativeArchitecture(observed.kernelArchitecture) === proof.architecture && ['amd64', 'arm64'].includes(proof.architecture), 'native Linux architecture does not match');
  requireThat(observed.source.head === proof.sourceCommit && observed.source.subject === proof.release && observed.source.parentCount === 1 && observed.source.clean === true && observed.source.rawBlobsMatch === true, 'source is dirty or differs from the committed release');
  requireThat(observed.environment.dockerHost === `unix://${proof.socketDirectory}/docker.sock` && observed.environment.dockerConfig === proof.dockerConfigDirectory && observed.environment.conflictingVariables.length === 0, 'Docker client environment does not select only the private engine');
  requireThat(observed.pathsCanonical === true && observed.privateSocket === true, 'owned paths or private socket are not canonical');
  requireThat(observed.outerInfo.ID === proof.outerEngineId && observed.innerInfo.ID === proof.innerEngineId && nativeArchitecture(observed.outerInfo.Architecture) === proof.architecture && nativeArchitecture(observed.innerInfo.Architecture) === proof.architecture && observed.outerInfo.OSType === 'linux' && observed.innerInfo.OSType === 'linux', 'live engine identities or architectures differ');

  const container = observed.outerContainer;
  requireThat(container.Id === proof.outerContainerId && container.State?.Running === true && container.Image === proof.daemonImageId && canonicalImage(container.Config?.Image) === canonicalImage(proof.daemonImageRef), 'owned daemon container or image differs');
  const daemonCommand = container.Config?.Cmd;
  requireThat(Array.isArray(daemonCommand) && daemonCommand[0] === 'dockerd' && daemonCommand.filter((value) => value.startsWith('--host=')).length === 1 && daemonCommand.includes('--host=unix:///var/run/docker.sock') && !daemonCommand.some((value) => value === '--host' || value.startsWith('-H')), 'daemon must listen only on its private Unix socket');
  requireThat(container.Config?.Labels?.['com.coderluii.validation'] === 'local-optional-docker-client' && container.Config.Labels['com.coderluii.validation.prefix'] === proof.prefix && container.Config.Labels['com.coderluii.validation.source'] === proof.sourceCommit, 'owned daemon labels differ');
  const host = container.HostConfig;
  requireThat(host?.Privileged === true && host.NetworkMode === proof.network && host.PidMode !== 'host' && host.IpcMode !== 'host' && host.UTSMode !== 'host' && host.Memory === proof.memoryBytes && host.MemorySwap === proof.memorySwapBytes && host.CpuPeriod === proof.cpuPeriod && host.CpuQuota === proof.cpuQuota && host.PidsLimit === proof.pidsLimit && Object.keys(host.PortBindings ?? {}).length === 0, 'daemon isolation or hard limits differ');
  const mounts = container.Mounts ?? [];
  const expectedMounts = [
    { Type: 'bind', Source: proof.sourceRoot, Destination: proof.sourceRoot, RW: false },
    { Type: 'bind', Source: proof.socketDirectory, Destination: '/var/run', RW: true },
    { Type: 'volume', Name: proof.dataVolume, Destination: '/var/lib/docker', RW: true },
  ];
  requireThat(mounts.length === expectedMounts.length && expectedMounts.every((expectedMount) => mounts.filter((mount) => Object.entries(expectedMount).every(([key, value]) => mount[key] === value)).length === 1), 'daemon mounts include unowned data or omit required isolated paths');
  requireThat(observed.dataVolume.Name === proof.dataVolume && observed.network.Name === proof.network && observed.dataVolume.Labels?.['com.coderluii.validation.prefix'] === proof.prefix && observed.network.Labels?.['com.coderluii.validation.prefix'] === proof.prefix && Object.values(observed.network.Containers ?? {}).every((entry) => entry.Name?.startsWith(proof.prefix + '-')), 'daemon volume or network ownership differs');
  requireThat(observed.dataVolume.Driver === 'local' && observed.dataVolume.Scope === 'local' && Object.keys(observed.dataVolume.Options ?? {}).length === 0, 'daemon data volume must use plain local storage without driver options');
  requireThat(isPlainLocalBridge(observed.network), 'daemon network must use a plain local bridge without custom driver options');
  requireThat(observed.daemonImage.Id === proof.daemonImageId && nativeArchitecture(observed.daemonImage.Architecture) === proof.architecture && observed.daemonImage.RepoDigests?.some((ref) => canonicalImage(ref) === canonicalImage(proof.daemonImageRef)), 'official daemon image digest or architecture differs');
  requireThat(observed.candidateImage.Id === proof.candidateImageId && observed.candidateImage.Architecture === proof.architecture && observed.candidateImage.RepoDigests?.includes(proof.candidateRef), 'preloaded Full candidate image differs');
  requireThat(observed.candidateImage.Config?.Labels?.['org.opencontainers.image.revision'] === proof.sourceCommit && observed.candidateImage.Config.Labels['org.opencontainers.image.version'] === proof.release && observed.candidateImage.Config.Labels['org.opencontainers.image.source'] === 'https://github.com/CoderLuii/HolyClaude', 'candidate source labels differ');
  requireThat(observed.initial.containers.length === 0 && observed.initial.volumes.length === 0 && JSON.stringify([...observed.initial.networkNames].sort()) === JSON.stringify(['bridge', 'host', 'none']), 'private engine contains pre-existing runtime resources');
  requireThat(observed.initial.imageIds.length > 0 && observed.initial.imageIds.every((id) => proof.allowedImageIds.includes(id)) && proof.allowedImageIds.every((id) => observed.initial.imageIds.includes(id)), 'private engine contains unexpected images');
  return { schemaVersion: 1, executionOrigin: 'local_native', scope: proof.scope, sourceCommit: proof.sourceCommit, prefix: proof.prefix, architecture: proof.architecture, outerContainerId: proof.outerContainerId, privateEngineId: proof.innerEngineId, candidateRef: proof.candidateRef, verified: true };
}

function run(program, args, env) {
  try { return execFileSync(program, args, { env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error(`local Docker isolation: ${program} verification command failed`); }
}

export function verifyCommittedSource(sourceRoot, env = process.env) {
  const git = (...args) => run('git', ['-c', 'core.autocrlf=false', '-C', sourceRoot, ...args], env);
  const head = git('rev-parse', 'HEAD');
  const clean = git('status', '--porcelain', '--untracked-files=all') === '';
  let rawBlobsMatch = true;
  for (const entry of git('ls-tree', '-r', '-z', 'HEAD').split('\0').filter(Boolean)) {
    const match = entry.match(/^(\d+) blob ([a-f0-9]{40})\t(.+)$/s);
    if (!match || match[3].startsWith('/') || match[3].split('/').includes('..')) throw new Error('local Docker isolation: invalid committed source entry');
    const file = sourceRoot + '/' + match[3];
    const bytes = match[1] === '120000' ? Buffer.from(readlinkSync(file)) : readFileSync(file);
    const hash = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (hash !== match[2] || (match[1] !== '120000' && !lstatSync(file).isFile())) rawBlobsMatch = false;
  }
  return { head, clean, rawBlobsMatch, subject: git('log', '-1', '--format=%s'), parent: git('rev-parse', 'HEAD^'), parentCount: git('rev-list', '--parents', '-n', '1', 'HEAD').split(' ').length - 1 };
}

function main() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i], value = process.argv[i + 1];
    if (!['--proof', '--source-root', '--image', '--prefix'].includes(key) || value === undefined || key in args) throw new Error('local Docker isolation: invalid arguments');
    args[key] = value;
  }
  if (Object.keys(args).length !== 4) throw new Error('Usage: verify-local-docker-isolation.mjs --proof FILE --source-root PATH --image IMAGE@DIGEST --prefix PREFIX');
  const proof = JSON.parse(readFileSync(args['--proof'], 'utf8').replace(/^\uFEFF/, ''));
  requireThat(process.platform === 'linux', 'the actual guard must run on native Linux');
  const sourceRoot = realpathSync(args['--source-root']);
  const expected = { sourceRoot, image: args['--image'], prefix: args['--prefix'] };
  validateProof(proof, expected, new Date());
  const privateEndpoint = `unix://${proof.socketDirectory}/docker.sock`;
  const conflicts = ['DOCKER_CONTEXT', 'DOCKER_API_VERSION', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH', 'BUILDX_BUILDER', 'BUILDX_CONFIG', 'BUILDKIT_HOST'].filter((key) => process.env[key]);
  requireThat(process.env.DOCKER_HOST === privateEndpoint && process.env.DOCKER_CONFIG === proof.dockerConfigDirectory && conflicts.length === 0, 'Docker environment must select the private engine before collection');
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' };
  delete env.DOCKER_CONTEXT; delete env.DOCKER_HOST;
  const docker = (endpoint, ...values) => run('docker', ['--host', endpoint, ...values], env);
  const json = (endpoint, ...values) => JSON.parse(docker(endpoint, ...values));
  const lines = (endpoint, ...values) => docker(endpoint, ...values).split('\n').filter(Boolean);
  const observed = {
    platform: process.platform,
    kernelArchitecture: run('uname', ['-m'], env),
    source: verifyCommittedSource(sourceRoot, env),
    environment: { dockerHost: process.env.DOCKER_HOST, dockerConfig: process.env.DOCKER_CONFIG, conflictingVariables: conflicts },
    pathsCanonical: [proof.workRoot, proof.socketDirectory, proof.dockerConfigDirectory].every((path) => realpathSync(path) === path),
    privateSocket: statSync(proof.socketDirectory + '/docker.sock').isSocket(),
    outerInfo: json(proof.outerEndpoint, 'info', '--format', '{{json .}}'),
    innerInfo: json(privateEndpoint, 'info', '--format', '{{json .}}'),
    outerContainer: json(proof.outerEndpoint, 'inspect', '--type', 'container', proof.outerContainerId)[0],
    daemonImage: json(proof.outerEndpoint, 'image', 'inspect', proof.daemonImageRef)[0],
    candidateImage: json(privateEndpoint, 'image', 'inspect', proof.candidateRef)[0],
    dataVolume: json(proof.outerEndpoint, 'volume', 'inspect', proof.dataVolume)[0],
    network: json(proof.outerEndpoint, 'network', 'inspect', proof.network)[0],
    initial: {
      containers: lines(privateEndpoint, 'ps', '-aq', '--no-trunc'),
      volumes: lines(privateEndpoint, 'volume', 'ls', '-q'),
      networkNames: lines(privateEndpoint, 'network', 'ls', '--format', '{{.Name}}'),
      imageIds: [...new Set(lines(privateEndpoint, 'image', 'ls', '-q', '--no-trunc'))],
    },
  };
  console.log(JSON.stringify(validateLocalDockerIsolation(proof, observed, expected)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message.startsWith('local Docker isolation:') ? error.message : 'local Docker isolation: verification failed'); process.exitCode = 1; }
}
