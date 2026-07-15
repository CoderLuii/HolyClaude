import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readlinkSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const patchDir = path.join(repoRoot, 'vendor/patches/cloudcli-account-management');
const artifactDir = path.join(repoRoot, 'vendor/artifacts');
const upstreamRepo = 'https://github.com/siteboon/claudecodeui.git';
const upstreamCommit = '615e2ca2926a68e6e3336d49b592616654a69424';
const packageVersion = '1.36.2';
const artifactFile = `cloudcli-ai-cloudcli-${packageVersion}-holyclaude-account-management.tgz`;
const expectedBuildImage = 'node:26.5.0-bookworm-slim@sha256:2d49d876e96237d76de412761cf05dbfe5aee325cc4406a4d41d5824c5bb8beb';
const expectedNode = 'v26.5.0';
const expectedNpm = '11.17.0';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const sourceArg = args.get('--source');
const keepWorkdir = args.get('--keep-workdir') === 'true';

function run(command, argsList, options = {}) {
  execFileSync(command, argsList, {
    stdio: 'inherit',
    ...options,
  });
}

function runCapture(command, argsList, options = {}) {
  return execFileSync(command, argsList, {
    encoding: 'utf8',
    ...options,
  }).trim();
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sha256Text(value) {
  return createHash('sha256').update(value).digest('hex');
}

function collectFiles(root, prefix = '') {
  const entries = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name).replaceAll(path.sep, '/');
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      entries.push(...collectFiles(fullPath, relativePath));
    } else {
      entries.push(relativePath);
    }
  }
  return entries;
}

function hashFiles(root, files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    const fullPath = path.join(root, file);
    const entry = lstatSync(fullPath);
    hash.update(file);
    hash.update('\0');
    if (entry.isSymbolicLink()) {
      hash.update(`symlink:${readlinkSync(fullPath)}`);
    } else if (entry.isDirectory()) {
      hash.update(`gitlink:${runCapture('git', ['ls-files', '--stage', '--', file], { cwd: root })}`);
    } else {
      hash.update(readFileSync(fullPath));
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

function normalizeDependencyTree(node) {
  const dependencies = {};
  for (const name of Object.keys(node.dependencies ?? {}).sort()) {
    const dependency = node.dependencies[name];
    dependencies[name] = {
      version: dependency.version,
      dependencies: normalizeDependencyTree(dependency).dependencies,
    };
  }
  return { dependencies };
}

async function prepareSource(workdir) {
  if (sourceArg) {
    await cp(path.resolve(sourceArg), workdir, {
      recursive: true,
      filter: (sourcePath) => !sourcePath.includes(`${path.sep}.git${path.sep}`) && !sourcePath.endsWith(`${path.sep}.git`),
    });
    return;
  }

  run('git', ['clone', '--no-checkout', upstreamRepo, workdir]);
  run('git', ['checkout', upstreamCommit], { cwd: workdir });
}

const workdir = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-account-'));
try {
  const buildImage = process.env.HOLYCLAUDE_CLOUDCLI_BUILD_IMAGE;
  const actualNode = runCapture('node', ['--version']);
  const actualNpm = runCapture('npm', ['--version']);
  if (buildImage !== expectedBuildImage || actualNode !== expectedNode || actualNpm !== expectedNpm) {
    throw new Error(
      `Run scripts/build-cloudcli-account-management-artifact-container.mjs; expected ${expectedBuildImage}, ${expectedNode}, npm ${expectedNpm}, got ${buildImage ?? 'unknown image'}, ${actualNode}, npm ${actualNpm}`,
    );
  }

  await prepareSource(workdir);
  const actualCommit = sourceArg ? runCapture('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(sourceArg) }) : upstreamCommit;
  if (actualCommit !== upstreamCommit) {
    throw new Error(`Expected CloudCLI source commit ${upstreamCommit}, got ${actualCommit}`);
  }

  const patches = readdirSync(patchDir)
    .filter((name) => name.endsWith('.patch'))
    .sort();

  for (const patch of patches) {
    // The checked-in patch is whitespace-normalized so repo release checks stay clean.
    // The upstream commit is verified above; use zero context so CloudCLI's
    // whitespace-bearing blank lines do not force trailing whitespace into this repo.
    run('git', ['apply', '-C0', path.join(patchDir, patch)], { cwd: workdir });
  }

  const trackedFiles = runCapture('git', ['ls-files', '-z'], { cwd: workdir })
    .split('\0')
    .filter(Boolean);
  const sourceTreeHash = hashFiles(workdir, trackedFiles);

  run('npm', ['ci'], { cwd: workdir });
  run('npm', ['run', 'typecheck'], { cwd: workdir });
  run('npm', ['run', 'build'], { cwd: workdir });
  run('npm', ['run', 'lint'], { cwd: workdir });
  run('npm', ['shrinkwrap', '--omit=dev'], { cwd: workdir });

  const packDirs = [path.join(workdir, 'pack-a'), path.join(workdir, 'pack-b')];
  for (const packDir of packDirs) {
    await mkdir(packDir);
  }
  const packedPaths = packDirs.map((packDir) => {
    const packOutput = runCapture('npm', ['pack', '--pack-destination', packDir], { cwd: workdir });
    return path.join(packDir, packOutput.split('\n').at(-1));
  });
  if (sha256(packedPaths[0]) !== sha256(packedPaths[1])) {
    throw new Error('Two clean npm pack runs produced different CloudCLI artifacts');
  }

  const artifactPath = path.join(artifactDir, artifactFile);
  await rm(artifactPath, { force: true });
  await cp(packedPaths[0], artifactPath);

  const dependencyTreeHashes = [];
  for (const name of ['install-a', 'install-b']) {
    const prefix = path.join(workdir, name);
    const cache = path.join(workdir, `${name}-cache`);
    await mkdir(prefix);
    run('npm', ['install', '--global', '--prefix', prefix, artifactPath], {
      cwd: workdir,
      env: { ...process.env, npm_config_cache: cache },
    });
    const tree = JSON.parse(runCapture('npm', ['ls', '--global', '--all', '--json', '--prefix', prefix], {
      cwd: workdir,
      env: { ...process.env, npm_config_cache: cache },
    }));
    dependencyTreeHashes.push(sha256Text(JSON.stringify(normalizeDependencyTree(tree))));
  }
  if (dependencyTreeHashes[0] !== dependencyTreeHashes[1]) {
    throw new Error('Two clean CloudCLI installations produced different production dependency trees');
  }

  const unpackDir = path.join(workdir, 'pack-check');
  await mkdir(unpackDir);
  run('tar', ['-xzf', artifactPath, '-C', unpackDir]);
  const fileListHash = createHash('sha256')
    .update(collectFiles(path.join(unpackDir, 'package')).sort().join('\n'))
    .digest('hex');

  const manifest = {
    bridge: 'cloudcli-account-management',
    state: 'holyclaude-bridge-complete',
    upstream: {
      repository: upstreamRepo,
      commit: upstreamCommit,
      package: '@cloudcli-ai/cloudcli',
      version: packageVersion,
      license: 'AGPL-3.0-or-later',
    },
    build: {
      image: expectedBuildImage,
      node: actualNode,
      npm: actualNpm,
      commands: ['npm ci', 'npm run typecheck', 'npm run build', 'npm run lint', 'npm shrinkwrap --omit=dev', 'npm pack (twice)', 'npm install -g (twice)'],
      generatedAt: '2026-07-15T00:00:00Z',
      sourceDateNote: 'Timestamp is fixed in this manifest so reproducibility checks compare stable fields.',
      sourceTreeSha256: sourceTreeHash,
    },
    artifact: {
      file: artifactFile,
      sha256: sha256(artifactPath),
      size: statSync(artifactPath).size,
      packageFileListSha256: fileListHash,
      shrinkwrapSha256: sha256(path.join(workdir, 'npm-shrinkwrap.json')),
      productionDependencyTreeSha256: dependencyTreeHashes[0],
      duplicatePackSha256: sha256(packedPaths[1]),
    },
    patches: patches.map((patch) => ({ file: patch, sha256: sha256(path.join(patchDir, patch)) })),
    verification: {
      detector: 'scripts/verify-cloudcli-account-management-support.mjs',
      expectedState: 'holyclaude-bridge-complete',
      existingHolyClaudeRuntimePatchesRunAfterInstall: true,
    },
    upstreamRefs: [
      'https://github.com/siteboon/claudecodeui/issues/797',
      'https://github.com/siteboon/claudecodeui/pull/928',
      'https://github.com/siteboon/claudecodeui/pull/526',
    ],
    removal: 'Remove when a fixed upstream npm package verifies as upstream-complete without HolyClaude bridge markers.',
  };

  writeFileSync(
    path.join(artifactDir, 'cloudcli-account-management.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.log(`[cloudcli-account] wrote ${artifactPath}`);
} finally {
  if (!keepWorkdir) {
    await rm(workdir, { recursive: true, force: true });
  } else {
    console.log(`[cloudcli-account] kept ${workdir}`);
  }
}
