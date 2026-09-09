import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFile, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
const lockVerifierPath = path.join(repoRoot, 'scripts/verify-cloudcli-account-management-lock.mjs');
const buildLockPath = path.join(
  repoRoot,
  'vendor/locks/cloudcli-account-management-70e57859b6224ff0eb0539fcde7d13a3186c9c93.package-lock.json',
);
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
  assert.equal(manifest.upstream.commit, '70e57859b6224ff0eb0539fcde7d13a3186c9c93');
  assert.equal(manifest.upstream.version, '1.37.3');
  assert.equal(manifest.build.node, 'v26.8.2');
  assert.equal(manifest.build.npm, '12.0.2');
  assert.equal(manifest.build.sourceTreeSha256, 'ea940fa4cfe9341d221216f2915e91ae9a2a94d66ae784413333395d7abbc88d');
  assert.match(manifest.build.image, /^node:26\.8\.2-bookworm-slim@sha256:[0-9a-f]{64}$/);
  assert.match(manifest.artifact.shrinkwrapSha256, /^[0-9a-f]{64}$/);
  assert.match(manifest.artifact.productionDependencyTreeSha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.artifact.duplicatePackSha256, manifest.artifact.sha256);
  assert.equal(sha256(artifactBuffer), manifest.artifact.sha256);
  assert.deepEqual(manifest.verification.reviewedLockDependencies, {
    'node_modules/better-sqlite3': '12.11.1',
    'node_modules/dompurify': '3.4.15',
    'node_modules/express': '4.22.2',
    'node_modules/fast-uri': '3.1.6',
    'node_modules/hono': '4.13.7',
    'node_modules/jws': '3.2.3',
    'node_modules/minimatch': '9.0.9',
    'node_modules/multer': '2.3.0',
    'node_modules/path-to-regexp': '0.1.13',
    'node_modules/picomatch': '2.3.2',
    'node_modules/postcss': '8.5.28',
    'node_modules/tar-fs': '2.1.5',
    'node_modules/ws': '8.21.3',
    'node_modules/yaml': '2.9.0',
  });
  assert.deepEqual(manifest.verification.requiredRuntimeDependencies, {
    'node_modules/better-sqlite3': '12.11.1',
    'node_modules/dompurify': '3.4.15',
    'node_modules/express': '4.22.2',
    'node_modules/fast-uri': '3.1.6',
    'node_modules/hono': '4.13.7',
    'node_modules/jws': '3.2.3',
    'node_modules/multer': '2.3.0',
    'node_modules/path-to-regexp': '0.1.13',
    'node_modules/picomatch': '2.3.2',
    'node_modules/postcss': '8.5.28',
    'node_modules/tar-fs': '2.1.5',
    'node_modules/ws': '8.21.3',
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
  const buildLock = await readFile(buildLockPath);
  assert.deepEqual(manifest.verification.buildLock, {
    file: path.relative(repoRoot, buildLockPath).replaceAll(path.sep, '/'),
    sha256: manifest.artifact.shrinkwrapSha256,
  });
  assert.equal(sha256(buildLock), manifest.verification.buildLock.sha256);
  assert.equal(
    buildLock.equals(await readFile(path.join(cloudcliRoot, 'npm-shrinkwrap.json'))),
    true,
    'the frozen build lock should be the reviewed artifact shrinkwrap byte for byte',
  );
  assert.equal(packageJson.version, '1.37.3');
  assert.equal(packageJson.scripts?.prepare, undefined);
  assert.equal(packageJson.optionalDependencies?.['screenshot-desktop'], undefined);
  assert.equal(shrinkwrap.version, '1.37.3');
  assert.equal(shrinkwrap.packages[''].version, '1.37.3');
  assert.equal(shrinkwrap.packages['node_modules/better-sqlite3'].version, '12.11.1');
  assert.equal(shrinkwrap.packages['node_modules/screenshot-desktop'], undefined);
  for (const [dependency, version] of Object.entries({
    dompurify: '3.4.15',
    express: '4.22.2',
    'fast-uri': '3.1.6',
    hono: '4.13.7',
    jws: '3.2.3',
    minimatch: '9.0.9',
    multer: '2.3.0',
    'path-to-regexp': '0.1.13',
    picomatch: '2.3.2',
    postcss: '8.5.28',
    'tar-fs': '2.1.5',
    ws: '8.21.3',
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
    'ca-certificates': '20250419~deb12u1',
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
  assert.doesNotMatch(buildScript, /\['install', '--package-lock-only'/);
  assert.doesNotMatch(buildScript, /\['audit', 'fix', '--package-lock-only'/);
  assert.match(buildScript, /copyFileSync\(buildLockPath, path\.join\(workdir, 'package-lock\.json'\)\)/);
  assert.match(buildScript, /verify-cloudcli-account-management-lock\.mjs/);
  assert.match(buildScript, /buildLock: \{/);
  assert.match(buildScript, /sha256: expectedBuildLockSha256/);
  assert.doesNotMatch(buildScript, /-C0/);
  assert.match(buildScript, /runCapture\('git', \['ls-files', '-z'\]/);
  assert.doesNotMatch(
    buildScript,
    /npm install-scripts approve --all --allow-scripts-pin/,
    'the manifest must not claim an install-script approval command the builder does not execute',
  );
  assert.match(buildScript, /run\('npm', \[\s*'ci',\s*'--omit=dev'/);
  assert.doesNotMatch(buildScript, /\['install', '--global'/);
  assert.match(buildScript, /db\.transaction/);
  assert.match(buildScript, /SELECT value FROM smoke/);
  assert.match(buildScript, /if \(row\?\.value !== 'verified'\)/);
  assert.match(buildScript, /db\.open/);
  assert.match(containerBuildScript, /\['build-a', 'build-b'\]/);
  assert.match(containerBuildScript, /'--cpus',\s*'2'/);
  assert.match(containerBuildScript, /'--memory',\s*'6g'/);
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

test('CloudCLI frozen build lock rejects missing, tampered, and root-drifted inputs', async () => {
  const manifest = await readManifest();
  const artifactPath = path.join(repoRoot, 'vendor/artifacts', manifest.artifact.file);
  const cloudcliRoot = await unpackArtifact(artifactPath);
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'holyclaude-cloudcli-lock-'));
  const fixtureLock = path.join(fixtureRoot, 'package-lock.json');
  const fixturePackage = path.join(fixtureRoot, 'package.json');
  const runVerifier = async (lock = fixtureLock) => execFileAsync(
    process.execPath,
    [lockVerifierPath, '--lock', lock, '--package', fixturePackage],
  );

  try {
    await copyFile(buildLockPath, fixtureLock);
    await copyFile(path.join(cloudcliRoot, 'package.json'), fixturePackage);
    await runVerifier();

    await assert.rejects(runVerifier(path.join(fixtureRoot, 'missing-lock.json')), /does not exist/);

    const tamperedLock = JSON.parse(await readFile(fixtureLock, 'utf8'));
    tamperedLock.packages['node_modules/express'].version = '4.22.3';
    await writeFile(fixtureLock, `${JSON.stringify(tamperedLock, null, 2)}\n`);
    await assert.rejects(runVerifier(), /SHA-256 mismatch/);

    await copyFile(buildLockPath, fixtureLock);
    const driftedPackage = JSON.parse(await readFile(fixturePackage, 'utf8'));
    driftedPackage.dependencies.express = '^4.23.0';
    await writeFile(fixturePackage, `${JSON.stringify(driftedPackage, null, 2)}\n`);
    await assert.rejects(runVerifier(), /root dependency declarations differ/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('CloudCLI patches keep account navigation valid and constrain upload nesting', async () => {
  const accountPatch = await readFile(accountPatchPath, 'utf8');
  const securityPatch = await readFile(securityPatchPath, 'utf8');
  const buildScript = await readFile(buildScriptPath, 'utf8');

  assert.match(accountPatch, /KNOWN_MAIN_TABS[^ \n]*.*'account'/);
  assert.match(accountPatch, /KNOWN_MAIN_TABS[^ \n]*.*'account'.*'voice'/);
  assert.match(accountPatch, /src\/modules\/auth\/context\/AuthContext\.tsx/);
  assert.match(accountPatch, /src\/modules\/settings\/tabs\/AccountSettingsTab\.tsx/);
  assert.match(accountPatch, /src\/shared\/api\.ts/);
  assert.doesNotMatch(accountPatch, /src\/components\/auth/);
  assert.doesNotMatch(accountPatch, /src\/components\/settings/);
  assert.match(accountPatch, /const PASSWORD_MIN_LENGTH = 6/);
  assert.equal(
    accountPatch.match(/\$\{PASSWORD_MIN_LENGTH\} characters/g)?.length,
    1,
    'the shared server password message should use the configured minimum',
  );
  assert.match(accountPatch, /role="alert"/);
  assert.match(accountPatch, /typeof payload\.error === 'object'/);
  assert.match(accountPatch, /payload\.error\.message/);
  assert.match(accountPatch, /X-Auth-Error', 'invalid-token'/);
  assert.match(accountPatch, /code: 'AUTH_TOKEN_INVALID'/);
  assert.match(accountPatch, /registerAuthenticatedWebSocket/);
  assert.match(accountPatch, /revokeAuthenticatedWebSockets/);
  assert.match(accountPatch, /removeAllListeners\('message'\)/);
  assert.match(accountPatch, /socket\.terminate\(\)/);
  assert.match(accountPatch, /handleAuthenticationRevokedWebSocketClose/);
  assert.match(accountPatch, /isAuthTokenRemovalStorageEvent/);
  assert.match(accountPatch, /typeof req\.body === 'object'/);

  for (const expected of [
    '"dompurify": "^3.4.12"',
    '"express": "^4.22.2"',
    '"multer": "^2.2.0"',
    '"ws": "^8.21.3"',
    '"fast-uri": "3.1.6"',
    '-    "prepare": "husky",',
  ]) {
    assert.ok(securityPatch.includes(expected), `security patch should include ${expected}`);
  }
  assert.match(buildScript, /patches\.length !== 2/);
  assert.ok(
    buildScript.indexOf('verifyVersionInputs(workdir);')
      > buildScript.indexOf("run('git', ['apply', '--index', patchPath]"),
    'patched dependency versions should be verified after both patches apply',
  );
  assert.match(
    securityPatch,
    /"overrides": \{\n\+    "fast-uri": "3\.1\.6"\n\+  \}/,
    'the patched package metadata should deterministically resolve the reviewed fast-uri version',
  );
  for (const [dependency, version] of Object.entries({
    'better-sqlite3': '12.11.1',
    dompurify: '3.4.15',
    express: '4.22.2',
    'fast-uri': '3.1.6',
    hono: '4.13.7',
    jws: '3.2.3',
    minimatch: '9.0.9',
    multer: '2.3.0',
    'path-to-regexp': '0.1.13',
    picomatch: '2.3.2',
    postcss: '8.5.28',
    'tar-fs': '2.1.5',
    ws: '8.21.3',
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
  assert.match(buildScript, /auth-session-registry\.test\.ts/);
  assert.match(buildScript, /auth\.routes\.test\.ts/);
  assert.match(buildScript, /authErrorMessage\.test\.ts/);
  assert.match(buildScript, /WebSocketContext\.test\.tsx/);
  assert.match(buildScript, /node_modules\/screenshot-desktop/);
});

test('CloudCLI account-management artifact contains patched source runtime and client assets', async () => {
  const manifest = await readManifest();
  const artifactPath = path.join(repoRoot, 'vendor/artifacts', manifest.artifact.file);
  const cloudcliRoot = await unpackArtifact(artifactPath);

  for (const target of [
    'server/modules/auth/auth.routes.ts',
    'dist-server/server/modules/auth/auth.routes.js',
  ]) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes("router.post('/change-password'"), `${target} should expose change-password route`);
  }

  for (const target of [
    'server/modules/auth/auth.middleware.ts',
    'dist-server/server/modules/auth/auth.middleware.js',
  ]) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('authTokenGeneration'), `${target} should validate token generation`);
    assert.ok(source.includes('authenticateWebSocket'), `${target} should keep WebSocket auth`);
    assert.match(
      source,
      /isTokenGenerationValid[\s\S]{0,300}X-Auth-Error[\s\S]{0,200}AUTH_TOKEN_INVALID/,
      `${target} should make rotated REST tokens trigger the standard client logout contract`,
    );
  }

  for (const target of [
    'server/modules/auth/auth-session-registry.ts',
    'dist-server/server/modules/auth/auth-session-registry.js',
  ]) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('Authentication revoked'), `${target} should close live authenticated sockets`);
    assert.ok(source.includes('4001'), `${target} should use a stable authentication-revoked close code`);
    assert.ok(source.includes("removeAllListeners('message')"), `${target} should disable inbound dispatch before close`);
    assert.ok(source.includes('terminate()'), `${target} should terminate a socket whose close handshake stalls`);
  }

  for (const target of [
    'server/modules/auth/auth.service.ts',
    'dist-server/server/modules/auth/auth.service.js',
  ]) {
    const source = await readCloudCliFile(cloudcliRoot, target);
    assert.ok(source.includes('auth_token_generation'), `${target} should rotate auth token generation`);
    assert.ok(source.includes('AUTH_PASSWORD_CHANGE_UNAVAILABLE'), `${target} should keep bridge marker`);
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
  assert.ok(clientBundle.includes('auth-session-expired'), 'client bundle should expire revoked authentication sessions');
  assert.ok(clientBundle.includes('auth-token'), 'client bundle should synchronize authentication token removal');
});
