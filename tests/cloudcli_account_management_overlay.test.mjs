import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifestPath = path.join(repoRoot, 'vendor/artifacts/cloudcli-account-management.manifest.json');
const buildScriptPath = path.join(repoRoot, 'scripts/build-cloudcli-account-management-artifact.mjs');
const containerBuildScriptPath = path.join(repoRoot, 'scripts/build-cloudcli-account-management-artifact-container.mjs');
const accountPatchPath = path.join(
  repoRoot,
  'vendor/patches/cloudcli-account-management/0001-local-account-management.patch',
);
const securityPatchPath = path.join(
  repoRoot,
  'vendor/patches/cloudcli-account-management/0002-security-dependency-refresh.patch',
);

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function unpackArtifact(artifactPath) {
  const unpackRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-account-'));
  await execFileAsync('tar', ['-xzf', artifactPath, '-C', unpackRoot]);
  return path.join(unpackRoot, 'package');
}

async function readCloudCliFile(cloudcliRoot, relativePath) {
  return readFile(path.join(cloudcliRoot, relativePath), 'utf8');
}

async function collectFiles(root, prefix = '') {
  const entries = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name).replaceAll(path.sep, '/');
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      entries.push(...await collectFiles(fullPath, relativePath));
    } else {
      entries.push(relativePath);
    }
  }
  return entries;
}

test('CloudCLI account-management manifest matches the generated artifact and patch files', async () => {
  const manifest = await readManifest();
  const artifactPath = path.join(repoRoot, 'vendor/artifacts', manifest.artifact.file);
  const artifactBuffer = await readFile(artifactPath);

  assert.equal(manifest.bridge, 'cloudcli-account-management');
  assert.equal(manifest.state, 'holyclaude-bridge-complete');
  assert.equal(manifest.upstream.commit, '27eaf0146a46aa8a55178f3d394360ff7465420f');
  assert.equal(manifest.upstream.version, '1.36.3');
  assert.equal(manifest.build.node, 'v26.5.1');
  assert.equal(manifest.build.npm, '11.19.0');
  assert.match(manifest.build.image, /^node:26\.5\.1-bookworm-slim@sha256:[0-9a-f]{64}$/);
  assert.match(manifest.artifact.shrinkwrapSha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.artifact.productionDependencyTreeSha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.artifact.duplicatePackSha256, manifest.artifact.sha256);
  assert.equal(sha256(artifactBuffer), manifest.artifact.sha256);
  assert.deepEqual(manifest.verification.reviewedLockDependencies, {
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
  });
  assert.deepEqual(manifest.verification.requiredRuntimeDependencies, {
    'node_modules/better-sqlite3': '12.11.1',
    'node_modules/dompurify': '3.4.12',
    'node_modules/express': '4.22.2',
    'node_modules/fast-uri': '3.1.4',
    'node_modules/hono': '4.12.32',
    'node_modules/jws': '3.2.3',
    'node_modules/multer': '2.2.0',
    'node_modules/path-to-regexp': '0.1.13',
    'node_modules/picomatch': '2.3.2',
    'node_modules/postcss': '8.5.25',
    'node_modules/tar-fs': '2.1.5',
    'node_modules/ws': '8.21.1',
    'node_modules/yaml': '2.9.0',
  });
  assert.deepEqual(manifest.verification.forbiddenRuntimeDependencies, [
    'node_modules/screenshot-desktop',
  ]);
  assert.equal(manifest.verification.productionAudit.critical, 0);
  assert.equal(manifest.verification.productionAudit.high, 0);
  assert.ok(manifest.upstreamRefs.includes('https://github.com/siteboon/claudecodeui/pull/978'));
  assert.ok(manifest.upstreamRefs.includes('https://github.com/siteboon/claudecodeui/pull/1070'));
  assert.match(manifest.removal, /production dependency tree satisfies verification\.requiredRuntimeDependencies/);

  const cloudcliRoot = await unpackArtifact(artifactPath);
  const packageJson = JSON.parse(await readFile(path.join(cloudcliRoot, 'package.json'), 'utf8'));
  const shrinkwrap = JSON.parse(await readFile(path.join(cloudcliRoot, 'npm-shrinkwrap.json'), 'utf8'));
  assert.equal(packageJson.version, '1.36.3');
  assert.equal(packageJson.scripts?.prepare, undefined);
  assert.equal(packageJson.optionalDependencies?.['screenshot-desktop'], undefined);
  assert.equal(shrinkwrap.version, '1.36.3');
  assert.equal(shrinkwrap.packages[''].version, '1.36.3');
  assert.equal(shrinkwrap.packages['node_modules/better-sqlite3'].version, '12.11.1');
  assert.equal(shrinkwrap.packages['node_modules/screenshot-desktop'], undefined);
  for (const [dependency, version] of Object.entries({
    dompurify: '3.4.12',
    express: '4.22.2',
    'fast-uri': '3.1.4',
    hono: '4.12.32',
    jws: '3.2.3',
    minimatch: '9.0.9',
    multer: '2.2.0',
    'path-to-regexp': '0.1.13',
    picomatch: '2.3.2',
    postcss: '8.5.25',
    'tar-fs': '2.1.5',
    ws: '8.21.1',
    yaml: '2.9.0',
  })) {
    assert.equal(
      shrinkwrap.packages[`node_modules/${dependency}`].version,
      version,
      `${dependency} should resolve to the reviewed version`,
    );
  }
  for (const entry of Object.values(shrinkwrap.packages)) {
    if (entry?.resolved) {
      assert.doesNotMatch(entry.resolved, /npmmirror/i, 'shrinkwrap URLs should use the npm registry');
    }
  }
  const packageFileListSha256 = createHash('sha256')
    .update((await collectFiles(cloudcliRoot)).sort().join('\n'))
    .digest('hex');
  assert.equal(packageFileListSha256, manifest.artifact.packageFileListSha256);

  for (const patch of manifest.patches) {
    const patchBuffer = await readFile(path.join(repoRoot, 'vendor/patches/cloudcli-account-management', patch.file));
    assert.equal(sha256(patchBuffer), patch.sha256, `${patch.file} hash should match manifest`);
    const patchSource = patchBuffer.toString('utf8');
    assert.doesNotMatch(patchSource, /\r/, `${patch.file} should use LF line endings`);
  }
  assert.deepEqual(manifest.patches.map(({ file }) => file), [
    '0001-local-account-management.patch',
    '0002-security-dependency-refresh.patch',
  ]);
  assert.equal(manifest.reproducibility.independentContainerBuilds, 2);
  for (const key of [
    'artifactSha256',
    'sourceTreeSha256',
    'packageFileListSha256',
    'shrinkwrapSha256',
    'productionDependencyTreeSha256',
  ]) {
    assert.equal(manifest.reproducibility.builds[0][key], manifest.reproducibility.builds[1][key]);
  }
});

test('CloudCLI manifest binds exact bootstrap package versions', async () => {
  const manifest = await readManifest();
  assert.deepEqual(manifest.build.packages, {
    'build-essential': '12.9',
    'ca-certificates': '20230311+deb12u1',
    git: '1:2.39.5-0+deb12u3',
    'pkg-config': '1.8.1-1',
    python3: '3.11.2-1+b1',
  });
  assert.match(manifest.build.environmentSha256, /^[a-f0-9]{64}$/);
  for (const build of manifest.reproducibility.builds) {
    assert.equal(build.buildEnvironmentSha256, manifest.build.environmentSha256);
  }
});

test('CloudCLI artifact build applies patches exactly and compares two clean container builds', async () => {
  const buildScript = await readFile(buildScriptPath, 'utf8');
  const containerBuildScript = await readFile(containerBuildScriptPath, 'utf8');

  assert.match(buildScript, /run\('git', \['apply', '--check', '--index', patchPath\]/);
  assert.match(buildScript, /run\('git', \['apply', '--index', patchPath\]/);
  assert.doesNotMatch(buildScript, /-C0/);
  assert.match(buildScript, /runCapture\('git', \['ls-files', '-z'\]/);
  assert.match(buildScript, /run\('npm', \['ci', '--omit=dev'\]/);
  assert.doesNotMatch(buildScript, /\['install', '--global'/);
  assert.match(containerBuildScript, /\['build-a', 'build-b'\]/);
  for (const key of [
    'artifactSha256',
    'sourceTreeSha256',
    'packageFileListSha256',
    'shrinkwrapSha256',
    'productionDependencyTreeSha256',
  ]) {
    assert.ok(containerBuildScript.includes(key), `container build should compare ${key}`);
  }
});

test('CloudCLI patches keep account navigation valid and constrain upload nesting', async () => {
  const accountPatch = await readFile(accountPatchPath, 'utf8');
  const securityPatch = await readFile(securityPatchPath, 'utf8');
  const buildScript = await readFile(buildScriptPath, 'utf8');

  assert.match(accountPatch, /KNOWN_MAIN_TABS[^ \n]*.*'account'/);
  assert.match(accountPatch, /KNOWN_MAIN_TABS[^ \n]*.*'account'.*'voice'/);
  assert.match(accountPatch, /const PASSWORD_MIN_LENGTH = 6/);
  assert.equal(
    accountPatch.match(/\$\{PASSWORD_MIN_LENGTH\} characters/g)?.length,
    3,
    'server and client password messages should use the configured minimum',
  );
  assert.match(accountPatch, /role="alert"/);

  for (const expected of [
    '"dompurify": "^3.4.12"',
    '"express": "^4.22.2"',
    '"multer": "^2.2.0"',
    '"ws": "^8.21.1"',
    '-    "prepare": "husky",',
  ]) {
    assert.ok(securityPatch.includes(expected), `security patch should include ${expected}`);
  }
  assert.equal(
    securityPatch.match(/fieldNestingDepth: 0/g)?.length,
    3,
    'all three Multer configurations should reject nested field names',
  );
  assert.match(buildScript, /patches\.length !== 2/);
  assert.ok(
    buildScript.indexOf('verifyVersionInputs(workdir);')
      > buildScript.indexOf("run('git', ['apply', '--index', patchPath]"),
    'patched dependency versions should be verified after both patches apply',
  );
  for (const [dependency, version] of Object.entries({
    'better-sqlite3': '12.11.1',
    dompurify: '3.4.12',
    express: '4.22.2',
    'fast-uri': '3.1.4',
    hono: '4.12.32',
    jws: '3.2.3',
    minimatch: '9.0.9',
    multer: '2.2.0',
    'path-to-regexp': '0.1.13',
    picomatch: '2.3.2',
    postcss: '8.5.25',
    'tar-fs': '2.1.5',
    ws: '8.21.1',
    yaml: '2.9.0',
  })) {
    const escapedDependency = dependency.replaceAll('-', String.raw`\-`);
    const escapedVersion = version.replaceAll('.', String.raw`\.`);
    assert.match(
      buildScript,
      new RegExp(`node_modules/${escapedDependency}': '${escapedVersion}'`),
      `build script should require ${dependency} ${version}`,
    );
  }
  assert.match(buildScript, /npmmirror/);
  assert.match(buildScript, /npm', \['audit', '--omit=dev', '--json'\]/);
  assert.match(buildScript, /node_modules\/screenshot-desktop/);
});

test('CloudCLI account-management artifact contains patched source runtime and client assets', async () => {
  const manifest = await readManifest();
  const artifactPath = path.join(repoRoot, 'vendor/artifacts', manifest.artifact.file);
  const cloudcliRoot = await unpackArtifact(artifactPath);

  for (const target of ['server/routes/auth.js', 'dist-server/server/routes/auth.js']) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes("router.post('/change-password'"), `${target} should expose change-password route`);
    assert.ok(source.includes('auth_token_generation'), `${target} should rotate auth token generation`);
    assert.ok(source.includes('HOLYCLAUDE_ACCOUNT_MANAGEMENT_BRIDGE'), `${target} should keep bridge marker`);
  }

  for (const target of ['server/middleware/auth.js', 'dist-server/server/middleware/auth.js']) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('authTokenGeneration'), `${target} should validate token generation`);
    assert.ok(source.includes('authenticateWebSocket'), `${target} should keep WebSocket auth`);
  }

  const assetsRoot = path.join(cloudcliRoot, 'dist/assets');
  const assetFiles = (await collectFiles(assetsRoot))
    .filter((file) => file.endsWith('.js'))
    .map((file) => path.join(assetsRoot, file));
  const clientBundle = (await Promise.all(
    assetFiles.map((file) => readFile(file, 'utf8'))
  )).join('\n');

  assert.ok(clientBundle.includes('/api/auth/change-password'), 'client bundle should call change-password API');
  assert.ok(clientBundle.includes('Change Password'), 'client bundle should include Change Password UI');
  assert.ok(clientBundle.includes('Logout removes the saved browser token'), 'client bundle should include Logout UI copy');
});
