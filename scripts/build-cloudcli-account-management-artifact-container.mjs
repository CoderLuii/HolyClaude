import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const artifactDir = path.join(repoRoot, 'vendor/artifacts');
const buildImage = 'node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73';
const artifactFile = 'cloudcli-ai-cloudcli-1.36.3-holyclaude-account-management.tgz';
const buildPackages = {
  'build-essential': '12.9',
  'ca-certificates': '20230311+deb12u1',
  git: '1:2.39.5-0+deb12u3',
  'pkg-config': '1.8.1-1',
  python3: '3.11.2-1+b1',
};
const hashKeys = [
  'artifactSha256',
  'buildEnvironmentSha256',
  'sourceTreeSha256',
  'packageFileListSha256',
  'shrinkwrapSha256',
  'productionDependencyTreeSha256',
];

function runBuild(outputDir) {
  const pinnedPackages = Object.entries(buildPackages)
    .map(([name, version]) => `${name}=${version}`)
    .join(' ');
  const buildCommand = [
    'apt-get update >/dev/null',
    `apt-get install -y --no-install-recommends ${pinnedPackages} >/dev/null`,
    'npm install -g npm@11.19.0 >/dev/null',
    'node scripts/build-cloudcli-account-management-artifact.mjs --output-dir /output',
  ].join(' && ');

  execFileSync(
    'docker',
    [
      'run',
      '--rm',
      '--platform',
      'linux/amd64',
      '--mount',
      `type=bind,src=${repoRoot},dst=/repo,readonly`,
      '--mount',
      `type=bind,src=${outputDir},dst=/output`,
      '--workdir',
      '/repo',
      '--env',
      'HOLYCLAUDE_CLOUDCLI_BUILD_IMAGE=' + buildImage,
      buildImage,
      'sh',
      '-lc',
      buildCommand,
    ],
    { stdio: 'inherit' },
  );
}

const stagingRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-repro-'));
try {
  const builds = [];
  for (const buildName of ['build-a', 'build-b']) {
    const outputDir = path.join(stagingRoot, buildName);
    await mkdir(outputDir);
    runBuild(outputDir);
    const result = JSON.parse(readFileSync(path.join(outputDir, 'cloudcli-account-management.build.json'), 'utf8'));
    builds.push({ name: buildName, outputDir, ...result });
  }

  for (const key of hashKeys) {
    if (builds[0].hashes[key] !== builds[1].hashes[key]) {
      throw new Error(`Independent CloudCLI builds disagree on ${key}: ${builds[0].hashes[key]} != ${builds[1].hashes[key]}`);
    }
  }

  const manifest = {
    ...builds[0].manifest,
    artifact: {
      ...builds[0].manifest.artifact,
      duplicatePackSha256: builds[1].hashes.artifactSha256,
    },
    reproducibility: {
      independentContainerBuilds: 2,
      builds: builds.map(({ name, hashes }) => ({ name, ...hashes })),
    },
  };

  await mkdir(artifactDir, { recursive: true });
  await cp(path.join(builds[0].outputDir, artifactFile), path.join(artifactDir, artifactFile));
  writeFileSync(
    path.join(artifactDir, 'cloudcli-account-management.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`[cloudcli-account] two independent builds matched; wrote ${path.join(artifactDir, artifactFile)}`);
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
