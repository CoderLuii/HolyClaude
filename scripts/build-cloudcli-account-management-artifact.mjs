import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const patchDir = path.join(repoRoot, 'vendor/patches/cloudcli-account-management');
const upstreamRepo = 'https://github.com/siteboon/claudecodeui.git';
const upstreamCommit = '27eaf0146a46aa8a55178f3d394360ff7465420f';
const packageVersion = '1.36.3';
const artifactFile = `cloudcli-ai-cloudcli-${packageVersion}-holyclaude-account-management.tgz`;
const expectedBuildImage = 'node:26.5.1-bookworm-slim@sha256:9e6f9357d371591e32ab6f2d8a26d63bdd0d17c29eee3f4f3e7e454d9634bf73';
const expectedNode = 'v26.5.1';
const expectedNpm = '11.19.0';
const reviewedLockDependencies = {
  'node_modules/better-sqlite3': '12.11.1',
  'node_modules/dompurify': '3.4.12',
  'node_modules/express': '4.22.2',
  'node_modules/fast-uri': '3.1.4',
  'node_modules/hono': '4.12.32',
  'node_modules/jws': '3.2.3',
  'node_modules/minimatch': '9.0.9',
  'node_modules/multer': '2.2.0',
  'node_modules/path-to-regexp': '0.1.13',
  'node_modules/picomatch': '2.3.2',
  'node_modules/postcss': '8.5.25',
  'node_modules/tar-fs': '2.1.5',
  'node_modules/ws': '8.21.1',
  'node_modules/yaml': '2.9.0',
};
const expectedRuntimeDependencies = Object.fromEntries(
  Object.entries(reviewedLockDependencies)
    .filter(([packagePath]) => packagePath !== 'node_modules/minimatch'),
);
const forbiddenRuntimeDependencies = [
  'node_modules/screenshot-desktop',
];
const expectedBuildPackages = {
  'build-essential': '12.9',
  'ca-certificates': '20230311+deb12u1',
  git: '1:2.39.5-0+deb12u3',
  'pkg-config': '1.8.1-1',
  python3: '3.11.2-1+b1',
};

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const sourceArg = args.get('--source');
const outputArg = args.get('--output-dir');
const keepWorkdir = args.get('--keep-workdir') === 'true';
if (!outputArg) {
  throw new Error('Use scripts/build-cloudcli-account-management-artifact-container.mjs to run two clean builds');
}
const outputDir = path.resolve(outputArg);

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

function runCaptureAllowFailure(command, argsList, options = {}) {
  try {
    return runCapture(command, argsList, options);
  } catch (error) {
    const stdout = error?.stdout?.toString().trim();
    if (!stdout) throw error;
    return stdout;
  }
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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function collectInstalledDependencyVersions(nodeModulesRoot, prefix = 'node_modules') {
  const versions = [];
  const rootEntry = lstatSync(nodeModulesRoot, { throwIfNoEntry: false });
  if (!rootEntry) return versions;

  const collectPackage = (packageRoot, packagePath) => {
    const packageJson = readJson(path.join(packageRoot, 'package.json'));
    versions.push([packagePath, packageJson.name, packageJson.version]);
    versions.push(...collectInstalledDependencyVersions(
      path.join(packageRoot, 'node_modules'),
      `${packagePath}/node_modules`,
    ));
  };

  for (const entry of readdirSync(nodeModulesRoot, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const entryRoot = path.join(nodeModulesRoot, entry.name);
    if (entry.name.startsWith('@')) {
      for (const scopedEntry of readdirSync(entryRoot, { withFileTypes: true })) {
        if (!scopedEntry.isDirectory() && !scopedEntry.isSymbolicLink()) continue;
        collectPackage(
          path.join(entryRoot, scopedEntry.name),
          `${prefix}/${entry.name}/${scopedEntry.name}`,
        );
      }
      continue;
    }
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    collectPackage(entryRoot, `${prefix}/${entry.name}`);
  }

  return versions.sort(([left], [right]) => left.localeCompare(right));
}

function verifyResolvedDependencies(lock, label) {
  for (const [packagePath, version] of Object.entries(reviewedLockDependencies)) {
    if (lock.packages?.[packagePath]?.version !== version) {
      throw new Error(`${label} must resolve ${packagePath} ${version}`);
    }
  }
  for (const packagePath of forbiddenRuntimeDependencies) {
    if (lock.packages?.[packagePath]) {
      throw new Error(`${label} must not include unused runtime dependency ${packagePath}`);
    }
  }
}

function verifyInstalledDependencies(root) {
  for (const [packagePath, version] of Object.entries(expectedRuntimeDependencies)) {
    const packageJson = readJson(path.join(root, packagePath, 'package.json'));
    if (packageJson.version !== version) {
      throw new Error(`Installed CloudCLI runtime must resolve ${packagePath} ${version}`);
    }
  }
  for (const packagePath of forbiddenRuntimeDependencies) {
    const entry = lstatSync(path.join(root, packagePath), { throwIfNoEntry: false });
    if (entry) {
      throw new Error(`Installed CloudCLI runtime must not include ${packagePath}`);
    }
  }
}

function verifyVersionInputs(workdir) {
  const packageJson = readJson(path.join(workdir, 'package.json'));
  const packageLock = readJson(path.join(workdir, 'package-lock.json'));
  if (packageJson.version !== packageVersion
    || packageLock.version !== packageVersion
    || packageLock.packages?.['']?.version !== packageVersion) {
    throw new Error(`CloudCLI package.json and package-lock.json must both be ${packageVersion}`);
  }
  const expectedRanges = {
    dompurify: '^3.4.12',
    express: '^4.22.2',
    multer: '^2.2.0',
    ws: '^8.21.1',
  };
  for (const [name, version] of Object.entries(expectedRanges)) {
    if (packageJson.dependencies?.[name] !== version) {
      throw new Error(`CloudCLI package.json must declare ${name} ${version}`);
    }
  }
  if (packageJson.optionalDependencies?.['screenshot-desktop']) {
    throw new Error('CloudCLI package.json must not declare unused optional dependency screenshot-desktop');
  }
  if (packageJson.scripts?.prepare) {
    throw new Error('CloudCLI package.json must not run a development-only prepare script during production install');
  }
  verifyResolvedDependencies(packageLock, 'CloudCLI package-lock.json');
}

function normalizeShrinkwrapRegistry(workdir) {
  const shrinkwrapPath = path.join(workdir, 'npm-shrinkwrap.json');
  const normalized = readFileSync(shrinkwrapPath, 'utf8')
    .replaceAll('https://registry.npmmirror.com/', 'https://registry.npmjs.org/');
  writeFileSync(shrinkwrapPath, normalized);
}

function verifyShrinkwrap(workdir) {
  const shrinkwrapPath = path.join(workdir, 'npm-shrinkwrap.json');
  const packageJson = readJson(path.join(workdir, 'package.json'));
  const shrinkwrapSource = readFileSync(shrinkwrapPath, 'utf8');
  const shrinkwrap = JSON.parse(shrinkwrapSource);
  if (packageJson.version !== packageVersion
    || shrinkwrap.version !== packageVersion
    || shrinkwrap.packages?.['']?.version !== packageVersion) {
    throw new Error(`CloudCLI package.json and npm-shrinkwrap.json must both be ${packageVersion}`);
  }
  if (shrinkwrapSource.includes('registry.npmmirror.com')) {
    throw new Error('CloudCLI npm-shrinkwrap.json must use registry.npmjs.org URLs');
  }
  verifyResolvedDependencies(shrinkwrap, 'CloudCLI npm-shrinkwrap.json');
}

function verifyProductionAudit(workdir) {
  const source = runCaptureAllowFailure('npm', ['audit', '--omit=dev', '--json'], { cwd: workdir });
  const report = JSON.parse(source);
  const vulnerabilities = report.metadata?.vulnerabilities;
  if (!vulnerabilities || vulnerabilities.critical !== 0 || vulnerabilities.high !== 0) {
    throw new Error(
      `CloudCLI production audit must have 0 Critical and 0 High findings, got ${JSON.stringify(vulnerabilities)}`,
    );
  }
  return vulnerabilities;
}

async function prepareSource(workdir) {
  run('git', ['clone', '--no-checkout', sourceArg ? path.resolve(sourceArg) : upstreamRepo, workdir]);
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
  const actualBuildPackages = Object.fromEntries(
    Object.keys(expectedBuildPackages).map((name) => [
      name,
      runCapture('dpkg-query', ['-W', '-f=${Version}', name]),
    ]),
  );
  if (JSON.stringify(actualBuildPackages) !== JSON.stringify(expectedBuildPackages)) {
    throw new Error(
      `CloudCLI build package drift: expected ${JSON.stringify(expectedBuildPackages)}, got ${JSON.stringify(actualBuildPackages)}`,
    );
  }
  const buildEnvironmentHash = sha256Text(JSON.stringify({
    image: buildImage,
    node: actualNode,
    npm: actualNpm,
    packages: actualBuildPackages,
  }));

  await prepareSource(workdir);
  const actualCommit = runCapture('git', ['rev-parse', 'HEAD'], { cwd: workdir });
  if (actualCommit !== upstreamCommit) {
    throw new Error(`Expected CloudCLI source commit ${upstreamCommit}, got ${actualCommit}`);
  }
  const patches = readdirSync(patchDir)
    .filter((name) => name.endsWith('.patch'))
    .sort();
  if (patches.length !== 2
    || patches[0] !== '0001-local-account-management.patch'
    || patches[1] !== '0002-security-dependency-refresh.patch') {
    throw new Error(`Expected account and security patches, got ${patches.join(', ')}`);
  }

  for (const patch of patches) {
    const patchPath = path.join(patchDir, patch);
    run('git', ['apply', '--check', '--index', patchPath], { cwd: workdir });
    run('git', ['apply', '--index', patchPath], { cwd: workdir });
  }
  verifyVersionInputs(workdir);

  const trackedFiles = runCapture('git', ['ls-files', '-z'], { cwd: workdir })
    .split('\0')
    .filter(Boolean);
  const sourceTreeHash = hashFiles(workdir, trackedFiles);

  run('npm', ['ci'], { cwd: workdir });
  run('node', [
    '--input-type=module',
    '-e',
    "import Database from 'better-sqlite3'; const db = new Database(':memory:'); db.exec('CREATE TABLE smoke (id INTEGER)'); db.close();",
  ], { cwd: workdir });
  run('npm', ['run', 'typecheck'], { cwd: workdir });
  run('npm', ['run', 'build'], { cwd: workdir });
  run('npm', ['run', 'lint'], { cwd: workdir });
  run('npm', ['shrinkwrap', '--omit=dev'], { cwd: workdir });
  normalizeShrinkwrapRegistry(workdir);
  verifyShrinkwrap(workdir);
  const productionAudit = verifyProductionAudit(workdir);

  const packDir = path.join(workdir, 'pack');
  await mkdir(packDir);
  const packOutput = runCapture('npm', ['pack', '--pack-destination', packDir], { cwd: workdir });
  const packedPath = path.join(packDir, packOutput.split('\n').at(-1));

  await mkdir(outputDir, { recursive: true });
  const artifactPath = path.join(outputDir, artifactFile);
  await rm(artifactPath, { force: true });
  await cp(packedPath, artifactPath);
  run('node', [path.join(repoRoot, 'scripts/verify-cloudcli-account-management-support.mjs'), artifactPath], { cwd: workdir });

  const installCache = path.join(workdir, 'install-cache');
  const unpackDir = path.join(workdir, 'pack-check');
  await mkdir(unpackDir);
  run('tar', ['-xzf', artifactPath, '-C', unpackDir]);
  const unpackedPackage = path.join(unpackDir, 'package');
  const packageFileListHash = createHash('sha256')
    .update(collectFiles(unpackedPackage).sort().join('\n'))
    .digest('hex');
  const installRoot = path.join(workdir, 'install', 'lib', 'node_modules', '@cloudcli-ai', 'cloudcli');
  await mkdir(path.dirname(installRoot), { recursive: true });
  await cp(unpackedPackage, installRoot, { recursive: true });
  run('npm', ['ci', '--omit=dev'], {
    cwd: installRoot,
    env: { ...process.env, npm_config_cache: installCache },
  });
  verifyInstalledDependencies(installRoot);
  run('node', [
    '--input-type=module',
    '-e',
    "import { createRequire } from 'node:module'; const require = createRequire(`${process.cwd()}/package.json`); const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.exec('CREATE TABLE smoke (id INTEGER)'); db.close();",
  ], { cwd: installRoot });
  verifyProductionAudit(installRoot);
  const installedDependencyVersions = collectInstalledDependencyVersions(path.join(installRoot, 'node_modules'));
  const productionDependencyTreeHash = sha256Text(JSON.stringify(installedDependencyVersions));

  const shrinkwrapHash = sha256(path.join(workdir, 'npm-shrinkwrap.json'));
  const artifactHash = sha256(artifactPath);

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
      packages: actualBuildPackages,
      environmentSha256: buildEnvironmentHash,
      commands: [
        'git apply --check --index',
        'git apply --index',
        'npm ci',
        'native better-sqlite3 smoke',
        'npm run typecheck',
        'npm run build',
        'npm run lint',
        'npm shrinkwrap --omit=dev',
        'npm audit --omit=dev --json',
        'npm pack',
        'npm ci --omit=dev',
        'installed runtime dependency verification',
        'installed native better-sqlite3 smoke',
      ],
      generatedAt: '2026-07-21T00:00:00Z',
      sourceDateNote: 'Timestamp is fixed in this manifest so reproducibility checks compare stable fields.',
      sourceTreeSha256: sourceTreeHash,
    },
    artifact: {
      file: artifactFile,
      sha256: artifactHash,
      size: statSync(artifactPath).size,
      packageFileListSha256: packageFileListHash,
      shrinkwrapSha256: shrinkwrapHash,
      productionDependencyTreeSha256: productionDependencyTreeHash,
    },
    patches: patches.map((patch) => ({ file: patch, sha256: sha256(path.join(patchDir, patch)) })),
    verification: {
      detector: 'scripts/verify-cloudcli-account-management-support.mjs',
      expectedState: 'holyclaude-bridge-complete',
      reviewedLockDependencies,
      requiredRuntimeDependencies: expectedRuntimeDependencies,
      forbiddenRuntimeDependencies,
      productionAudit,
      existingHolyClaudeRuntimePatchesRunAfterInstall: true,
    },
    upstreamRefs: [
      'https://github.com/siteboon/claudecodeui/issues/797',
      'https://github.com/siteboon/claudecodeui/pull/978',
      'https://github.com/siteboon/claudecodeui/pull/1070',
      'https://github.com/siteboon/claudecodeui/pull/928',
      'https://github.com/siteboon/claudecodeui/pull/526',
    ],
    removal: 'Remove only when an upstream npm package verifies as upstream-complete without HolyClaude bridge markers and its production dependency tree satisfies verification.requiredRuntimeDependencies.',
  };
  const hashes = {
    artifactSha256: artifactHash,
    buildEnvironmentSha256: buildEnvironmentHash,
    sourceTreeSha256: sourceTreeHash,
    packageFileListSha256: packageFileListHash,
    shrinkwrapSha256: shrinkwrapHash,
    productionDependencyTreeSha256: productionDependencyTreeHash,
  };

  writeFileSync(
    path.join(outputDir, 'cloudcli-account-management.build.json'),
    `${JSON.stringify({ manifest, hashes }, null, 2)}\n`,
  );
  console.log(`[cloudcli-account] wrote independent build output to ${outputDir}`);
} finally {
  if (!keepWorkdir) {
    await rm(workdir, { recursive: true, force: true });
  } else {
    console.log(`[cloudcli-account] kept ${workdir}`);
  }
}
