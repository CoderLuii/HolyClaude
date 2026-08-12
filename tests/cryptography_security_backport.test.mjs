import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const builderPath = 'scripts/build-cryptography-security-backport.sh';
const dockerfilePath = 'Dockerfile';
const smokePath = 'tests/cryptography_security_backport_smoke.py';
const requirementsPath = 'security/cryptography-security-build-requirements.txt';
const x509PatchPath = 'security/patches/cryptography-46.0.7/GHSA-jwv3-5hgf-82ww.patch';
const pkcs7PatchPath = 'security/patches/cryptography-46.0.7/GHSA-g6cj-pr64-35w5.patch';

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('cryptography builder is executable at the Docker copy boundary', () => {
  const dockerfile = readFileSync(dockerfilePath, 'utf8');
  assert.match(
    dockerfile,
    /^COPY --chmod=0755 scripts\/build-cryptography-security-backport\.sh \/usr\/local\/bin\/build-cryptography-security-backport\.sh$/m,
  );
  assert.match(dockerfile, /RUN test -x \/usr\/local\/bin\/build-cryptography-security-backport\.sh && \\\n/);
});

test('cryptography backport inputs bind the exact source and upstream fixes', () => {
  for (const path of [builderPath, smokePath, requirementsPath, x509PatchPath, pkcs7PatchPath]) {
    assert.ok(existsSync(path), `${path} must exist`);
  }

  const builder = readFileSync(builderPath, 'utf8');
  assert.match(builder, /CRYPTOGRAPHY_VERSION='46\.0\.7'/);
  assert.match(builder, /CRYPTOGRAPHY_BACKPORT_VERSION='46\.0\.7\+holyclaude\.1'/);
  assert.match(builder, /CRYPTOGRAPHY_SOURCE_COMMIT='622d672e429a7cff836a23c5903683dbec1901f5'/);
  assert.match(builder, /CRYPTOGRAPHY_SOURCE_SHA256='e4cfd68c5f3e0bfdad0d38e023239b96a2fe84146481852dffbcca442c245aa5'/);
  assert.match(builder, /CRYPTOGRAPHY_X509_COMMIT='4a12cf49675a184e47f912b00b04f3a629283582'/);
  assert.match(builder, /CRYPTOGRAPHY_PKCS7_COMMIT='53fccd93413a8d7f07d6d8999681f27b75cffa3f'/);
  assert.match(builder, /CRYPTOGRAPHY_RUST_VERSION='1\.88\.0'/);
  assert.match(builder, /CRYPTOGRAPHY_MATURIN_VERSION='1\.9\.6'/);
  assert.match(builder, /CRYPTOGRAPHY_CFFI_VERSION='2\.0\.0'/);
  assert.match(builder, /CRYPTOGRAPHY_SETUPTOOLS_VERSION='80\.10\.2'/);
  assert.match(builder, /CRYPTOGRAPHY_PATCHELF_VERSION='0\.14\.3'/);
  assert.match(builder, /SOURCE_DATE_EPOCH='1775613009'/);

  const requirements = readFileSync(requirementsPath, 'utf8');
  assert.match(requirements, /maturin==1\.9\.6/);
  assert.match(requirements, /sha256:0246202377c49449315305209f45c8ecef6e2d6bd27a04b5b6f1ab3e4ea47238/);
  assert.match(requirements, /sha256:f5bac167700fbb6f8c8ed1a97b494522554b4432d7578e11403b894b6a91d99f/);
  assert.match(requirements, /cffi==2\.0\.0/);
  assert.match(requirements, /sha256:afb8db5439b81cf9c9d0c80404b60c3cc9c3add93e114dcae767f1477cb53775/);
  assert.match(requirements, /sha256:24b6f81f1983e6df8db3adc38562c83f7d4a0c36162885ec7f7b77c7dcbec97b/);
  assert.match(requirements, /pycparser==2\.23/);
  assert.match(requirements, /sha256:e5c6e8d3fbad53479cab09ac03729e0a9faf2bee3db8208a550daf5af81a5934/);
  assert.match(requirements, /setuptools==80\.10\.2/);
  assert.match(requirements, /sha256:95b30ddfb717250edb492926c92b5221f7ef3fbcc2b07579bcd4a27da21d0173/);
});

test('cryptography backport patches are byte-bound and contain both mitigations', () => {
  assert.equal(sha256(x509PatchPath), '92b6f545d41388c441d83f6f1e1a99ddfd76cc3eb5eed91dd167a25c0d032120');
  assert.equal(sha256(pkcs7PatchPath), 'b2cf0e72db71646297ee78eba680d690676578e97cd8281ca46aa70c5f4593c0');

  const x509Patch = readFileSync(x509PatchPath, 'utf8');
  assert.match(x509Patch, /DEFAULT_SIGNATURE_CHECK_LIMIT/);
  assert.match(x509Patch, /budget\.signature_check\(\)\?/);

  const pkcs7Patch = readFileSync(pkcs7PatchPath, 'utf8');
  assert.match(pkcs7Patch, /get_rand_bytes\(py, key_size\)/);
  assert.match(pkcs7Patch, /PyValueError/);
  assert.match(pkcs7Patch, /random_key/);
});

test('cryptography backport build fails closed and exports one inspected wheel', () => {
  const builder = readFileSync(builderPath, 'utf8');
  const upstreamRuntimeCheck = 'grep -Fxc "__version__ = \\"$CRYPTOGRAPHY_VERSION\\"" "$about_path"';
  const backportRuntimeCheck = 'grep -Fxc "__version__ = \\"$CRYPTOGRAPHY_BACKPORT_VERSION\\"" "$about_path"';
  assert.match(builder, /sha256sum -c/);
  assert.equal((builder.match(/patch --batch --fuzz=0 --forward -p1/g) ?? []).length, 2);
  assert.match(builder, /about_path='src\/cryptography\/__about__\.py'/);
  assert.equal(builder.split(upstreamRuntimeCheck).length - 1, 2);
  assert.equal(builder.split(backportRuntimeCheck).length - 1, 2);
  assert.match(
    builder,
    /sed -i "s\/\^__version__ = \\"\$CRYPTOGRAPHY_VERSION\\"\$\/__version__ = \\"\$CRYPTOGRAPHY_BACKPORT_VERSION\\"\/" "\$about_path"/,
  );
  assert.match(builder, /cargo test --locked --package cryptography-x509-verification/);
  assert.match(builder, /rustc --version/);
  assert.match(builder, /patchelf --version/);
  assert.match(builder, /maturin --version/);
  assert.match(builder, /-m maturin build --release --strip --locked/);
  assert.doesNotMatch(builder, /-m zipfile -p/);
  assert.match(builder, /zipfile\.ZipFile/);
  assert.match(builder, /Version: 46\.0\.7\+holyclaude\.1/);
  assert.match(builder, /runtime_version_path = "cryptography\/__about__\.py"/);
  assert.match(builder, /wheel\.namelist\(\)\.count\(runtime_version_path\) != 1/);
  assert.match(builder, /runtime_version_lines = \[/);
  assert.match(builder, /if runtime_version_lines != \['__version__ = "46\.0\.7\+holyclaude\.1"'\]:/);
  assert.match(builder, /wheel_name=\$\(basename "\$wheel_file"\)/);
  assert.match(builder, /sha256sum "\$wheel_name" > SHA256SUMS/);
  assert.doesNotMatch(builder, /sha256sum "\$wheel_file" > SHA256SUMS/);
});

test('cryptography checksum manifest survives Docker stage relocation', () => {
  const repoRoot = process.cwd();
  const repoRootDocker = repoRoot.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
  const fixtureRoot = mkdtempSync(join(repoRoot, '.cryptography-manifest-'));
  const builderOutput = join(fixtureRoot, 'builder-output');
  const runtimeOutput = join(fixtureRoot, 'runtime-output');
  const wheelName = 'cryptography-46.0.7+holyclaude.1-cp314-abi3-manylinux_2_34_x86_64.whl';
  try {
    const wheelBytes = Buffer.from('fixture-wheel-bytes\n');
    mkdirSync(builderOutput);
    mkdirSync(runtimeOutput);
    writeFileSync(join(builderOutput, wheelName), wheelBytes);
    const digest = createHash('sha256').update(wheelBytes).digest('hex');
    writeFileSync(join(builderOutput, 'SHA256SUMS'), `${digest}  ${wheelName}\n`);
    cpSync(join(builderOutput, wheelName), join(runtimeOutput, wheelName));
    cpSync(join(builderOutput, 'SHA256SUMS'), join(runtimeOutput, 'SHA256SUMS'));
    assert.doesNotMatch(readFileSync(join(runtimeOutput, 'SHA256SUMS'), 'utf8'), /builder-output/);
    const manifest = readFileSync(join(runtimeOutput, 'SHA256SUMS'), 'utf8').trim();
    const match = manifest.match(/^([0-9a-f]{64})  ([^/\\]+)$/);
    assert.ok(match, 'relocated checksum manifest must contain one relative filename');
    assert.equal(match[2], wheelName);
    const runtimeRelative = relative(repoRoot, runtimeOutput).replaceAll('\\', '/');
    const result = spawnSync(
      'docker',
      [
        'run', '--rm',
        '-v', `${repoRootDocker}:/repo`,
        '-w', `/repo/${runtimeRelative}`,
        'node:26.7.0-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341',
        'sha256sum', '-c', 'SHA256SUMS',
      ],
      { cwd: repoRoot, encoding: 'utf8', timeout: 120000 },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), `${wheelName}: OK`);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('cryptography backport smoke covers package constraints and both advisories', () => {
  const smoke = readFileSync(smokePath, 'utf8');
  assert.match(smoke, /46\.0\.7\+holyclaude\.1/);
  assert.match(smoke, /^import cryptography$/m);
  assert.match(smoke, /module_version = Version\(cryptography\.__version__\)/);
  assert.match(smoke, /distribution_version = Version\(version\("cryptography"\)\)/);
  assert.match(smoke, /assert module_version == EXPECTED_VERSION/);
  assert.match(smoke, /assert distribution_version == EXPECTED_VERSION/);
  assert.match(smoke, /assert module_version == distribution_version/);
  assert.match(smoke, /PolicyBuilder/);
  assert.match(smoke, /build_server_verifier/);
  assert.match(smoke, /range\(129\)/);
  assert.match(smoke, /Exceeded maximum signature check limit/);
  assert.match(smoke, /pkcs7_decrypt_der/);
  assert.match(smoke, /Invalid padding bytes\./);
  assert.match(smoke, /expect_fixed/);
  assert.match(smoke, /--regression-only/);
  assert.match(smoke, /Requirement\("cryptography<49,>=2\.5"\)/);
  assert.match(smoke, /Requirement\("cryptography<47,>=46\.0\.0"\)/);
  assert.match(smoke, /subprocess\.run\(\[sys\.executable, "-m", "pip", "check"\]/);
  assert.match(smoke, /\["az", "version"\]/);
  assert.match(smoke, /\["az", "--help"\]/);
  assert.match(smoke, /\["az", "config", "get", "core\.collect_telemetry"\]/);
});
