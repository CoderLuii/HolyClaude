import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const dockerIgnore = readFileSync('.dockerignore', 'utf8');
const gitAttributes = readFileSync('.gitattributes', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8').replaceAll('\r\n', '\n');
const browserRuntimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const browserSnapshotRetry = readFileSync('tests/browser_snapshot_retry.sh', 'utf8');
const cloudcliManifest = JSON.parse(readFileSync('vendor/artifacts/cloudcli-account-management.manifest.json', 'utf8'));
const productFacts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));
const advisoryReviews = readFileSync('security/advisory-reviews.json', 'utf8');
const webTerminalLockSource = readFileSync(
  'vendor/locks/cloudcli-web-terminal-6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d.package-lock.json',
  'utf8',
);
const webTerminalLock = JSON.parse(webTerminalLockSource);

test('security documentation names the current release and bundled CloudCLI artifact', () => {
  const securityDocs = readFileSync('.github/SECURITY.md', 'utf8');
  assert.ok(securityDocs.includes(`HolyClaude ${productFacts.release.tag} vendors CloudCLI \`${cloudcliManifest.upstream.version}\``));
});

test('security documentation records official EAS, Netlify, and Vercel dependency trees', () => {
  const securityDocs = readFileSync('.github/SECURITY.md', 'utf8');
  assert.match(securityDocs, /EAS CLI 24\.12\.1/);
  assert.match(securityDocs, /Netlify CLI 27\.12\.0/);
  assert.match(securityDocs, /Vercel CLI 63\.1\.2/);
  assert.doesNotMatch(dockerfile, /patch-global-node-tar|NODE_TAR_VERSION|node-tar\.tgz/);
  const patcher = readFileSync('scripts/patch-global-node-security-dependencies.mjs', 'utf8');
  assert.doesNotMatch(patcher, /eas-cli|netlify-cli|node_modules\/vercel/);
});

test('runtime CloudCLI and Netlify version checks match the selected release inputs', () => {
  const cloudcliVersion = productFacts.cloudcli.version;
  assert.equal(dockerfile.match(/^ARG CLOUDCLI_VERSION=(\S+)$/m)?.[1], cloudcliVersion);
  assert.equal(browserRuntimeChecks.match(/'@cloudcli-ai\/cloudcli': '([^']+)'/)?.[1], cloudcliVersion);
  assert.equal(browserRuntimeChecks.match(/require_eq "CloudCLI package version" "\$cloudcli_package_version" "([^"]+)"/)?.[1], cloudcliVersion);
  const netlifyVersion = dockerfile.match(/netlify-cli@(\d+\.\d+\.\d+)/)?.[1];
  assert.ok(netlifyVersion);
  const netlifyInstallAssertion = dockerfile.match(
    /require\('\/usr\/local\/lib\/node_modules\/netlify-cli\/package\.json'\)\.version"\)" = "(\d+\.\d+\.\d+)"/,
  )?.[1];
  assert.ok(netlifyInstallAssertion);
  assert.equal(netlifyInstallAssertion, netlifyVersion);
  const netlifyCheck = browserRuntimeChecks.split('\n').find((line) => line.includes('require_eq "Netlify CLI package version"'));
  assert.ok(netlifyCheck);
  assert.equal(netlifyCheck.trim().match(/"([^"]+)"$/)?.[1], netlifyVersion);
});

test('verified direct dependency pins match build, runtime, product, and immutable assertions', () => {
  for (const version of ['12.10.1', '4.149.0', '4.70.1', '1.21.0', '3.11.2', '0.54.0', '0.74.4', '2.1.296']) {
    assert.ok(browserRuntimeChecks.includes(version), `runtime checks should contain ${version}`);
  }
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.296');
  for (const expected of [
    'version: 12.10.1',
    'version: 4.149.0',
    'version: 4.70.1',
    'version: 1.21.0',
    'version: 3.11.2',
    'version: 0.54.0',
    'version: 0.74.4',
    'version: 2.1.296',
  ]) assert.ok(immutableInputs.includes(expected), `immutable input inventory should contain ${expected}`);
});

test('CloudCLI ripgrep postinstall is supplied from exact immutable release assets', () => {
  for (const expected of [
    'ARG CLOUDCLI_VSCODE_RIPGREP_PACKAGE_VERSION=1.17.1',
    'ARG CLOUDCLI_RIPGREP_RELEASE_VERSION=15.0.1',
    'ARG CLOUDCLI_RIPGREP_BINARY_VERSION=15.0.0',
    'ARG CLOUDCLI_RIPGREP_BINARY_REVISION_AMD64=3a612f88b8',
    'ARG CLOUDCLI_RIPGREP_ARCHIVE_SHA256_AMD64=4499958bfd5252df3d9e7504127fd448e4a14fbf2805ef4f14baaa1bcf775188',
    'ARG CLOUDCLI_RIPGREP_ARCHIVE_SHA256_ARM64=dd3738a4b6e8df0fb3bc3edc5af352c4c39e0d97ad118a23e5176bdc5d48ba08',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);
  assert.match(
    dockerfile,
    /TMPDIR="\$CLOUDCLI_RIPGREP_CACHE_ROOT" npm ci --omit=dev[\s\S]*?require\('\.\/node_modules\/@vscode\/ripgrep\/package\.json'\)\.version[\s\S]*?node_modules\/@vscode\/ripgrep\/bin\/rg" --version[\s\S]*?rm -rf "\$CLOUDCLI_RIPGREP_CACHE_DIR"/,
  );
  assert.match(
    immutableInputs,
    /name: CloudCLI ripgrep prebuilt archive[\s\S]*version: 15\.0\.1[\s\S]*package-version: 1\.17\.1[\s\S]*binary-version: 15\.0\.0[\s\S]*amd64-binary-revision: 3a612f88b8[\s\S]*arm64-binary-revision: "none"[\s\S]*amd64-archive-sha256: 4499958bfd5252df3d9e7504127fd448e4a14fbf2805ef4f14baaa1bcf775188[\s\S]*arm64-archive-sha256: dd3738a4b6e8df0fb3bc3edc5af352c4c39e0d97ad118a23e5176bdc5d48ba08[\s\S]*verification-mode: committed-hash/,
  );
});

test('runtime applies Bookworm package updates and checks the PCRE2 security fix', () => {
  assert.match(dockerfile, /RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends/);
  assert.doesNotMatch(dockerfile, /build-essential pkg-config python3 python3-pip python3-venv/);
  assert.match(browserRuntimeChecks, /application Python[\s\S]{0,100}Python 3\.14\.8/);
  assert.match(browserRuntimeChecks, /for debian_python_package in libpython3\.11-minimal libpython3\.11-stdlib python3\.11 python3\.11-minimal python3\.11-venv; do[\s\S]*?fail "Slim retains Debian Python package: \$debian_python_package"/);
  assert.match(browserRuntimeChecks, /Full libvips development package[\s\S]{0,130}libvips-dev/);
  assert.match(browserRuntimeChecks, /dpkg --compare-versions "\$pcre2_version" ge "10\.42-1\+deb12u1"/);
});

function assertJsonServerWaitCannotMaskProbeFailure(source) {
  const start = source.indexOf('    json-server --watch /tmp/json-server-smoke.json');
  const end = source.indexOf('    fi', start);
  assert.notEqual(start, -1, 'Dockerfile is missing the json-server smoke');
  assert.notEqual(end, -1, 'Dockerfile json-server smoke has no full-image boundary');
  const smoke = source.slice(start, end);
  assert.match(smoke, /\{ \\\r?\n\s+wait "\$JSON_SERVER_PID" 2>\/dev\/null \|\| true; \\\r?\n\s+\} && \\/);
  assert.doesNotMatch(smoke, /wait "\$JSON_SERVER_PID" 2>\/dev\/null \|\| true && \\/);
}

test('Docker context excludes the test suite from image builds', () => {
  assert.match(dockerIgnore, /^tests\/$/m);
  assert.equal((dockerIgnore.match(/^!tests\//gm) ?? []).length, 0);
});

test('next-on-pages legacy esbuild binary is rebuilt with the pinned Go toolchain', () => {
  assert.match(
    dockerfile,
    /NEXT_ON_PAGES_ESBUILD_PACKAGE=\$\(case "\$TARGETARCH" in amd64\) echo "esbuild-linux-64";; arm64\) echo "esbuild-linux-arm64";;/,
  );
  assert.match(
    dockerfile,
    /NEXT_ON_PAGES_ESBUILD_ROOT="\/usr\/local\/lib\/node_modules\/@cloudflare\/next-on-pages\/node_modules\/\$\{NEXT_ON_PAGES_ESBUILD_PACKAGE\}"/,
  );
  assert.match(
    dockerfile,
    /require\('\$\{NEXT_ON_PAGES_ESBUILD_ROOT\}\/package\.json'\)\.version"\)" = "0\.15\.18"/,
  );
  assert.match(
    dockerfile,
    /install -m 0755 \/tmp\/esbuild-0\.15\.18 \\\r?\n\s+"\$\{NEXT_ON_PAGES_ESBUILD_ROOT\}\/bin\/esbuild"/,
  );
  assert.match(
    dockerfile,
    /test "\$\(sha256sum \/tmp\/esbuild-0\.15\.18 \| cut -d' ' -f1\)" = "\$\(sha256sum "\$\{NEXT_ON_PAGES_ESBUILD_ROOT\}\/bin\/esbuild" \| cut -d' ' -f1\)"/,
  );
  assert.match(
    dockerfile,
    /test "\$\("\$\{NEXT_ON_PAGES_ESBUILD_ROOT\}\/bin\/esbuild" --version\)" = "0\.15\.18"/,
  );
});

test('rollback artifact restores to the paths consumed by the rollback job', () => {
  const uploadBlock = workflow.match(
    /name: Upload rollback evidence([\s\S]*?)\n\s+- name: Move mutable aliases/,
  )?.[1];
  const downloadBlock = workflow.match(
    /name: Download rollback evidence([\s\S]*?)\n\s+- name: Check whether mutable aliases may have moved/,
  )?.[1];
  assert.ok(uploadBlock, 'rollback upload step must exist');
  assert.ok(downloadBlock, 'rollback download step must exist');

  const uploadPaths = [...uploadBlock.matchAll(/^\s+(promotion\/rollback(?:\.tsv|-required))\s*$/gm)]
    .map((match) => match[1]);
  assert.deepEqual(uploadPaths, ['promotion/rollback.tsv', 'promotion/rollback-required']);
  const downloadPath = downloadBlock.match(/^\s+path:\s*(\S+)\s*$/m)?.[1];
  assert.equal(downloadPath, 'promotion');
  const commonUploadRoot = dirname(uploadPaths[0]);
  assert.ok(uploadPaths.every((path) => dirname(path) === commonUploadRoot));

  const fixtureRoot = mkdtempSync(join(tmpdir(), 'holyclaude-rollback-artifact-'));
  const sourceRoot = join(fixtureRoot, 'source');
  const artifactRoot = join(fixtureRoot, 'artifact');
  const downloadRoot = join(fixtureRoot, 'download');
  try {
    for (const path of uploadPaths) {
      const source = join(sourceRoot, path);
      mkdirSync(dirname(source), { recursive: true });
      writeFileSync(source, `${path}\n`);
      const artifactPath = join(artifactRoot, relative(commonUploadRoot, path));
      mkdirSync(dirname(artifactPath), { recursive: true });
      cpSync(source, artifactPath);
    }
    mkdirSync(join(downloadRoot, downloadPath), { recursive: true });
    cpSync(artifactRoot, join(downloadRoot, downloadPath), { recursive: true });
    assert.ok(existsSync(join(downloadRoot, 'promotion/rollback.tsv')));
    assert.ok(existsSync(join(downloadRoot, 'promotion/rollback-required')));
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('release base and archive inputs are versioned and checksum-verified', () => {
  assert.match(dockerfile, /^FROM golang:1\.27\.1-bookworm@sha256:[0-9a-f]{64} AS esbuild-builder$/m);
  assert.match(dockerfile, /^FROM node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6 AS ffmpeg-security-builder$/m);
  assert.match(dockerfile, /^FROM python:3\.14\.8-slim-bookworm@sha256:c8137f4c460908c8763f281c8f22c431eb5c538514ba9553fc3a89c06b7cfb88 AS python-runtime$/m);
  assert.match(dockerfile, /test "\$\(python3 --version\)" = "Python 3\.14\.8"/);
  assert.match(dockerfile, /for ESBUILD_VERSION in 0\.15\.18 0\.18\.20 0\.25\.12/);
  assert.match(dockerfile, /github\.com\/evanw\/esbuild\/cmd\/esbuild@v\$\{ESBUILD_VERSION\}/);
  for (const version of ['0.15.18', '0.18.20', '0.25.12']) {
    assert.match(dockerfile, new RegExp(`/out/${version}/esbuild`));
  }
  assert.match(dockerfile, /ARG S6_OVERLAY_VERSION=3\.2\.3\.2/);
  assert.match(dockerfile, /ARG S6_NOARCH_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /ARG S6_ARCHIVE_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /s6-overlay-\$\{S6_ASSET\}\.tar\.xz\.sha256/);
  assert.match(dockerfile, /test "\$\(cut -d' ' -f1 "\/tmp\/s6-overlay-\$\{S6_ASSET\}\.tar\.xz\.sha256"\)" = "\$S6_EXPECTED_SHA256"/);
  assert.match(dockerfile, /echo "\$S6_EXPECTED_SHA256  \/tmp\/s6-overlay-\$\{S6_ASSET\}\.tar\.xz" \| sha256sum -c -/);
  assert.match(dockerfile, /\/etc\/s6-overlay\/user-bundles\.d\/user\/contents\.d\/cloudcli/);
  assert.doesNotMatch(dockerfile, /\/etc\/s6-overlay\/s6-rc\.d\/user\/contents\.d/);
  assert.match(dockerfile, /ARG FZF_VERSION=0\.74\.4/);
  assert.match(dockerfile, /ARG FZF_ARCHIVE_SHA256_AMD64=05e6813a337cc722c3ed07e54a764b75cc5d671e2e60459db0ba696ee5fa7504/);
  assert.match(dockerfile, /ARG FZF_ARCHIVE_SHA256_ARM64=5d673b849f494f0d64ec471d8640b153ca8849e3846a31da17abdcfce8df6b46/);
  assert.match(dockerfile, /fzf_\$\{FZF_VERSION\}_checksums\.txt/);
  assert.match(dockerfile, /test "\$\(grep -F "  \$\{FZF_ASSET\}" \/tmp\/fzf-checksums\.txt \| cut -d' ' -f1\)" = "\$FZF_ARCHIVE_SHA256"/);
  assert.match(dockerfile, /echo "\$FZF_ARCHIVE_SHA256  \/tmp\/\$\{FZF_ASSET\}" \| sha256sum -c -/);
  assert.doesNotMatch(dockerfile, /tmux fzf bat bubblewrap/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_AMD64=154\.0\.8037\.92-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_ARM64=154\.0\.8037\.92-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_AMD64=cd258a352414714e8027a623c4ff01ef1c565446d8f7206bc4ce085a4aa7bea5/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_ARM64=4ee18389861d6c2af9be00ae0a8b3ecdba20aed6c08ae41fcc310da1727dd1df/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_AMD64=c10056d7f80dcb2a9dc384997ecd5fd3aec9fa5acea472d53063ea6ba1f700d9/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_ARM64=338df7ca0323ad2e6c98f3d628381cfb762dca2d0bcc12dd7e5adcb4b005260c/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64=b48372322890bfb88c32662a94ff3ec7088fb6ce026cf5d238534378a82eb4f8/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64=18b827aee52af82fdba80e3acf00e07e529b6077d925dd4351c95b1d4829eaee/);
  assert.match(dockerfile, /apt-get download[\s\S]+chromium-common[\s\S]+chromium-sandbox/);
  assert.match(dockerfile, /\| sha256sum -c -/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.doesNotMatch(dockerfile, /playwright install/);
  assert.match(immutableInputs, /Debian Chromium package trio[\s\S]+version: 154\.0\.8037[\s\S]+amd64-version: 154\.0\.8037\.92-1~deb12u1[\s\S]+arm64-version: 154\.0\.8037\.92-1~deb12u1/);
  const chromiumImmutableBindings = {
    'amd64-chromium-package-sha256': 'cd258a352414714e8027a623c4ff01ef1c565446d8f7206bc4ce085a4aa7bea5',
    'arm64-chromium-package-sha256': '4ee18389861d6c2af9be00ae0a8b3ecdba20aed6c08ae41fcc310da1727dd1df',
    'amd64-chromium-common-package-sha256': 'c10056d7f80dcb2a9dc384997ecd5fd3aec9fa5acea472d53063ea6ba1f700d9',
    'arm64-chromium-common-package-sha256': '338df7ca0323ad2e6c98f3d628381cfb762dca2d0bcc12dd7e5adcb4b005260c',
    'amd64-chromium-sandbox-package-sha256': 'b48372322890bfb88c32662a94ff3ec7088fb6ce026cf5d238534378a82eb4f8',
    'arm64-chromium-sandbox-package-sha256': '18b827aee52af82fdba80e3acf00e07e529b6077d925dd4351c95b1d4829eaee',
  };
  for (const [field, sha256] of Object.entries(chromiumImmutableBindings)) {
    assert.match(immutableInputs, new RegExp(`^    ${field}: ${sha256}$`, 'm'));
  }

  const architectureSelectors = dockerfile
    .split(/\r?\n/)
    .filter((line) => line.includes('case "$TARGETARCH"') && !line.trimEnd().endsWith('in \\'));
  assert.ok(architectureSelectors.length > 0);
  for (const line of architectureSelectors) {
    assert.match(line, /amd64\)/);
    assert.match(line, /arm64\)/);
    assert.match(line, /\*\).*Unsupported TARGETARCH.*exit 1/);
  }
});

test('native installers and their outputs are pinned without unsupported flags', () => {
  assert.match(dockerfile, /ARG CLAUDE_CODE_VERSION=2\.1\.296/);
  assert.match(dockerfile, /CLAUDE_INSTALLER_SHA256=3a68d3406cf674e17bed1733a4dcf37805e2e47d87417700007d7e1aa766a944/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_AMD64=24972e3bc859fab2b46ed4c1e51f7d6130f06d3bd550811a114640de3370d0de/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_ARM64=f1f6e96e0d8342b9dbf41d7e88255397a6a52ce3d8736ad6a4c6b59c9b62fefa/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
  assert.match(dockerfile, /\/home\/claude\/\.local\/bin\/claude --version/);

  assert.match(dockerfile, /ARG JUNIE_VERSION=3579\.5/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_AMD64=c1c2f75403c333366eee029ce949128b960d24085c962f3712d1f292caf5564d/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_ARM64=c25c972db3d93fc749b97504180c8de0020f5055318b8bdb2ff4faa760ce4c90/);
  assert.match(dockerfile, /JUNIE_ARCHIVE="junie-release-\$\{JUNIE_VERSION\}-linux-\$\{JUNIE_PLATFORM\}\.zip"/);
  assert.match(dockerfile, /unzip -Z1 "\/tmp\/\$\{JUNIE_ARCHIVE\}"/);
  assert.match(dockerfile, /test "\$JUNIE_TOP_LEVEL" = "channel junie junie-app shim "/);
  assert.match(dockerfile, /unzip -q "\/tmp\/\$\{JUNIE_ARCHIVE\}" 'junie-app\/\*' -d "\$JUNIE_STAGING"/);
  assert.match(dockerfile, /test -x "\$JUNIE_STAGING\/junie-app\/bin\/junie"/);
  assert.match(dockerfile, /test -f "\$JUNIE_STAGING\/junie-app\/lib\/app\/junie-release-\$\{JUNIE_VERSION\}\.jar"/);
  assert.doesNotMatch(dockerfile, /junie-nightly|JUNIE_VERSION=3220\.1/);
  assert.doesNotMatch(dockerfile, /junie\.jetbrains\.com\/install\.sh/);

  assert.match(dockerfile, /ARG CURSOR_BUILD_ID=2026\.09\.15-d2fe57e/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_AMD64=4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_ARM64=2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d/);
  assert.match(dockerfile, /downloads\.cursor\.com\/lab\/\$\{CURSOR_BUILD_ID\}\/linux\/\$\{CURSOR_ASSET_ARCH\}\/agent-cli-package\.tar\.gz/);
  assert.match(dockerfile, /tar --strip-components=1 -xzf \/tmp\/cursor-agent\.tar\.gz -C "\$CURSOR_DIR"/);
  assert.doesNotMatch(dockerfile, /cursor\.com\/install/);
  assert.match(dockerfile, /CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233/);
  assert.match(dockerfile, /CURSOR_NODE_SHA256_AMD64=e0e46d3a1c0667117303412647cafcbcefb1be7612493015ec8fd6b7440162a4/);
  assert.match(dockerfile, /CURSOR_NODE_SHA256_ARM64=47befb5f57df96771ce343d6293349ecf4d46c91110b626423ec3a49d2fee7c1/);
  assert.match(dockerfile, /! grep -aFq -- '--permission'/);
  assert.match(dockerfile, /! grep -aFq -- '--allow-fs-read'/);
  assert.match(dockerfile, /! grep -aFq -- '--allow-fs-write'/);
  assert.doesNotMatch(dockerfile, /CURSOR_VERSION=/);
  assert.match(dockerfile, /test "\$\(cursor-agent --version\)" = "\$CURSOR_BUILD_ID"/);
  assert.match(dockerfile, /rm -f "\$CURSOR_DIR\/node"/);
  assert.match(dockerfile, /ln -s \/usr\/local\/bin\/node "\$CURSOR_DIR\/node"/);
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.11\.1"/);
  assert.match(dockerfile, /SETUPTOOLS_VERSION=84\.0\.0/);
  assert.match(dockerfile, /SETUPTOOLS_WHEEL_SHA256=51a52592b3b99e102b609654876bd65f19f999935166d1352678931132b0c670/);
  assert.match(dockerfile, /patch-global-node-security-dependencies\.mjs --root \/ --variant "\$VARIANT" --check-baseline/);
  assert.doesNotMatch(dockerfile, /replace_scoped_node_module[^\n]+\n\s+"\/usr\/local\/lib\/node_modules\/wrangler/);

  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.90\.0-1~bookworm/);
  assert.match(dockerfile, /AZURE_CLI_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /sed -i[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /grep -Fqx[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /ARG GITHUB_CLI_VERSION=2\.102\.0/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_AMD64=7e54a307f90afdc59796c325ec0c49fb09e6c18537727207a8ac7513584ea5b0/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_ARM64=5006962696f01e1624b3fcf1f9d8e1a11547f24bf067dd2a0371b7b421945237/);
  assert.match(dockerfile, /github\.com\/cli\/cli\/releases\/download\/v\$\{GITHUB_CLI_VERSION\}/);
  assert.match(browserRuntimeChecks, /require_eq "GitHub CLI version"[\s\S]{0,160}"2\.102\.0"/);
});

test('immutable input inventory binds the release-critical inputs', () => {
  assert.match(dockerfile, /^ARG HOLYCLAUDE_VERSION=1\.6\.6$/m);
  assert.match(immutableInputs, /^release: v1\.6\.6$/m);
  assert.match(immutableInputs, /^expires-at: 2026-10-24$/m);
  assert.match(
    immutableInputs,
    /^  - name: Prettier\n    version: 3\.9\.9\n    archive-sha256: c3b162d30c45126873cc6338a539383e92120a390d10de78f373f42c2045b338\n    npm-integrity: "sha512-Z\/CJHIkdujO\/OtN7nXUii0Rf3VT5SRuhjBA82Xvu2XhBUgX3nhP67T0LHceBdQLex7OOFGTox\+Q5Yg8Jk2Qivg=="\n    verification: npm registry tarball integrity and committed SHA-256\n    verification-mode: committed-hash\n    status: updated$/m,
  );
  assert.match(
    immutableInputs,
    /^  - name: pandas\n    version: 3\.0\.6\n    amd64-wheel-sha256: 62f51d7f651c8054c5e82a69265c98082e795d1442df7ca6edc3a545d61214b1\n    arm64-wheel-sha256: 654aae059295dbba6ecd2328ca12712a2cf1676214c8699f1c29213f7ccf9c34\n    verification: PyPI CPython 3\.14 manylinux x86_64 and aarch64 wheel hashes\n    verification-mode: committed-hash\n    status: updated$/m,
  );
  assert.match(
    immutableInputs,
    /^  - name: Python Playwright\n    version: 1\.63\.0\n    amd64-wheel-sha256: ad21bc07516b187965a7521c5cf0df0bd657b17482eaad74335272d35a2b07de\n    arm64-wheel-sha256: 354e15b29503565fc598b89f16fbe070459343bef9d7498a93e304864000c6a7\n    verification: PyPI manylinux x86_64 and aarch64 wheel hashes\n    verification-mode: committed-hash\n    status: updated$/m,
  );
  for (const value of [
    'sha256:69a7b9788769bec032d238959b61854e9ae87f57be9029ec04e9885fabf99195',
    'sha256:86f07bc9c5dce4578cf37e5a418b7bfc7f817cda25cde66e2b66e95ed86c4567',
    'sha256:c8137f4c460908c8763f281c8f22c431eb5c538514ba9553fc3a89c06b7cfb88',
    'sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
    'c069905b391cc4c20a5ba65ad5c10be2a7ba074f8ea6ad203e24d14e303dad47',
    'dfdf0537610113edbefe1f1fc6548bc957b2d77439636ec824fcf0e10d46d054',
    '0a9ee97ef5ae2ee953b0a80098105052e846cdbe319a57d808b519c33cd1343d',
    '29f47391dc283aa79fcc38e65224cd61f64dec0ecfd0db7074128ebf8ff23514',
    'dbcb813823bdd20940b903addbd779551569679f',
    'f87e5991a6d7451dcb8d9637bfbc97413f497069',
    '4895cd3fd33362471e739b786493aba048487bcc',
    '6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d',
    '391c7a29fd4a2136e5eb09b9f34fc9ec1e680da9e7b850a8cd1148d94c61e5b7',
    'b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6',
    '24972e3bc859fab2b46ed4c1e51f7d6130f06d3bd550811a114640de3370d0de',
    'f1f6e96e0d8342b9dbf41d7e88255397a6a52ce3d8736ad6a4c6b59c9b62fefa',
    '05e6813a337cc722c3ed07e54a764b75cc5d671e2e60459db0ba696ee5fa7504',
    '5d673b849f494f0d64ec471d8640b153ca8849e3846a31da17abdcfce8df6b46',
    '93b9cb6e68b97601268cc7afe17d89ce9364f6277f30b4193c725aa7dc3ededf',
    '992070e422dae33eac72268ffbde465e14dae81ed250149299d1fee3d842d60e',
    '08b38c62bcaad1c1722ca1b811a41daac0faffcbbe0ab5825f993da1d2920f3c',
    'c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73',
    'cefd0eca11b2a37a3aee776544d4f4ae913f02688135b5556b8788dfa474afc4',
    '9fa8932a2b11c8e879884c6d3276dd8abba9826b9f0ce4bc86d362cd447f7385',
    '9b269bc3b1a3a7849c8c2dc92805c2cabf7d15729294bc77e047b320e12fb4a6',
    '6fba2b6cd1aa5c821b0ee7612a99d584aa0c88aeb9fd5bd225964b8cf147bf72',
    'bf3fe71fbfb8ec0e310e0bc8537c3405a01f38f25f9394ed2135e6202fed542b',
    '8c8255de28f986d935a64c9ca71c0ec2d2f41d355691f5ea684725dc91413f71',
    'cec596316640f2b394b8f0daa0ea61a8eae82d017b620b9f202befb972a59ea4',
    '505bdb13f6c7eb689ca2dd5529cd0e7ba01c7a9745e04949479857759aaf7faf',
    'a2e33c58a63f655599996792684e9eed7991a52a752a35ea67fb83d351a78620',
    'c1c2f75403c333366eee029ce949128b960d24085c962f3712d1f292caf5564d',
    'c25c972db3d93fc749b97504180c8de0020f5055318b8bdb2ff4faa760ce4c90',
    '7e54a307f90afdc59796c325ec0c49fb09e6c18537727207a8ac7513584ea5b0',
    '5006962696f01e1624b3fcf1f9d8e1a11547f24bf067dd2a0371b7b421945237',
    '4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    '2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ff812c5853c52ef120ec73132320805d179a376e42785085e2053ce7f2479860',
    '72a9776fd667bdd6b91855e75e16603df22ce050c3563136acd273c95b099c09',
    '97a6edfc10645463b517f0518d46a8c72efbdc12558a9a948607f726284a0420',
    '0b4b2e33a65883e4f69c903484d8dd7770b3cb8b324f520068b6fd85d42b65ea',
    '7417711678b464eee70664126e39e88bb3c84c2928da0e71f14b56e04ff5c09f',
    'a355051d0c296ed50e42e55aceabf74f017f2f96e223fc7ee2199ea8a60cad4b',
    'sha512-NWZdi/kxyjv/8EUGFupziGU38YyleugZRM4JXgY5XFH7FUmaFA33NZS2Bmq0HPazf7S3jJQQWsZ/jAK9jsrV3Q==',
    'sha512-cjK2mdHIfEepZ1lQ1MX3aTQC+8ncIsvnacl/6vI2dIIcfP8/MrhTQ2+qRlkXFNDzJSj1d36quIszP+3/4CUJWQ==',
    'sha512-Ss7W/SrKtQFNaMtSojNoiykJgX+iDC8daM+YrcvgmJADtQPk0cd3w6Dna4CYH2CYvf9nQranj69fpcTzZ3sQIQ==',
    '4d3408d0950d70cf870efe3f86e8bd0271d8149bea0767008d42de14f0986a04',
    'e5c8997d5d0024d9686a849f20d462766d83646e74d9751dfb172715f2216133',
    '57fd6ecfea7927c79d3943766db39ef9267f38bdb32babe6b3d8dea1f21484ba',
    'd0f688e150204c24a09d41e3370062ea8a9413f579488ea76ef54362fe427cd7',
    '632bab368b56fa4560c3f3a897e566e24db664898db8dfcb6ae2fbfa86470368',
    '6231b5dfdccdc7c6a8c4ba4f82a7de8d8c95add2db8539a88ab7adde218fc461',
    '1162af800f31cbc444df14cda8c73b8c22413f5ae532e6aef251b4b74369abf3',
    '22145ee27a1c82b7d2e76ab7d34328799f6ae9633e4129f1efa0cbeb0f9a0ee3',
    '8e34fc298390875de416e6a4afcb8cabeceb25d9aa8506c1a2f9353cf702ea5f',
    '189088da0c6429ec5178dfaab1a114805f6cab0b61b165ab236efedf1d57a71b',
    'd1b40dd6e7cd3d823867ffe22b39a025bc420f7875926ae9ca974155378da14d',
    'faf91adc71e6b661b21ed4f486babbd7af9d17363d4276da4a0251f83c72498d',
    cloudcliManifest.artifact.sha256,
  ]) {
    assert.ok(immutableInputs.includes(value), `immutable input inventory should contain ${value}`);
  }
});

test('compatible package updates and plugin locks are exact', () => {
  for (const expected of [
    'npm@12.2.0',
    'pnpm@12.10.1',
    'vite@8.3.4',
    'prettier@3.9.9',
    'eslint@10.12.0',
    'concurrently@10.0.6',
    'wrangler@4.149.0',
    'vercel@63.1.2',
    'netlify-cli@27.12.0',
    'eas-cli@24.12.1',
    'prisma@7.10.0',
    'lighthouse@13.5.0',
    '@marp-team/marp-cli@4.5.1',
    '@google/gemini-cli@0.63.0',
    '@openai/codex@0.162.1',
    'opencode-ai@1.18.35',
    '@earendil-works/pi-coding-agent@0.85.1',
    'pandas==3.0.6',
    'tqdm==4.70.1',
    'matplotlib==3.11.2',
    'fastapi==0.142.2',
    'uvicorn==0.54.0',
    'lxml==6.1.3',
    'numpy==2.5.3',
    'tree-sitter-language-pack==1.21.0',
    'playwright==1.63.0',
    'weasyprint==70.0',
    'cairosvg==2.9.1',
    'CLOUDCLI_VERSION=1.37.3',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should contain ${expected}`);
  }
  assert.match(dockerfile, /markdown==3\.11/);
  assert.doesNotMatch(dockerfile, /pdfkit/);

  assert.match(dockerfile, /cloudcli-plugin-starter[\s\S]+npm ci --strict-allow-scripts && npm run build/);
  assert.match(
    dockerfile,
    /cloudcli-web-terminal-6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d\.package-lock\.json[\s\S]+cloudcli-plugin-terminal[\s\S]+git fetch --depth 1 origin 6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d[\s\S]+test "\$\(git rev-parse --short=12 HEAD\)" = "6757ed0ef067"[\s\S]+web-terminal-package-lock\.json package-lock\.json[\s\S]+patch-cloudcli-web-terminal-install-policy\.mjs[\s\S]+npm ci --strict-allow-scripts[\s\S]+node -e "require\('node-pty'\)" && npm run build/,
  );
  assert.match(gitAttributes, /^vendor\/locks\/\*\.json text eol=lf$/m);
  assert.doesNotMatch(webTerminalLockSource, /\r/, 'Web Terminal lock must use LF bytes');
  assert.equal(
    createHash('sha256').update(webTerminalLockSource).digest('hex'),
    '391c7a29fd4a2136e5eb09b9f34fc9ec1e680da9e7b850a8cd1148d94c61e5b7',
  );
  assert.equal(webTerminalLock.lockfileVersion, 3);
  assert.equal(webTerminalLock.packages[''].name, 'cloudcli-plugin-terminal');
  assert.ok(
    dockerfile.includes(`ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=${cloudcliManifest.artifact.sha256}`),
    'Dockerfile must bind the generated CloudCLI artifact checksum',
  );
  assert.match(
    dockerfile,
    /echo "\$CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256  \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz" \| sha256sum -c -[\s\S]+npm ci --omit=dev[\s\S]+chmod 0755 "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js"[\s\S]+ln -s "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js" \/usr\/local\/bin\/cloudcli/,
  );
  assert.match(dockerfile, /CLOUDCLI_SHRINKWRAP_SHA256="\$\(sha256sum npm-shrinkwrap\.json/);
  assert.match(dockerfile, /TMPDIR="\$CLOUDCLI_RIPGREP_CACHE_ROOT" npm ci --omit=dev/);
  assert.match(dockerfile, /cmp -s npm-shrinkwrap\.json package-lock\.json/);
  assert.match(dockerfile, /npm@12\.2\.0/);
  assert.match(
    dockerfile,
    /npm i -g --allow-scripts=opencode-ai opencode-ai@1\.18\.35;[\s\S]{0,100}test "\$\(opencode --version\)" = "1\.18\.35"/,
  );
  for (const expected of [
    'ARG CLOUDCLI_NANOID_VERSION=3.3.19',
    'ARG CLOUDCLI_NANOID_ARCHIVE_SHA256=4e371b71e3d5081fa0052356d5c1904e7a60e049864c26f0724cfd32dc303849',
    'ARG NESTED_IP_ADDRESS_VERSION=10.7.2',
    'ARG NESTED_IP_ADDRESS_ARCHIVE_SHA256=4301746e43e8a85a6a41e268f02178b27e6ba58e78e6913ab105d3871618083b',
    'ARG CLOUDCLI_FAST_URI_VERSION=3.1.8',
    'ARG CLOUDCLI_FAST_URI_ARCHIVE_SHA256=86be033b406a7737c0521edc8fe3e15c7ac0cb6b5e509478cc9539a2efaa086c',
    'ARG CLOUDCLI_JS_YAML_VERSION=3.15.2',
    'ARG CLOUDCLI_JS_YAML_ARCHIVE_SHA256=7f005cf0b8ee639b4557e0e321dc067c1f2aa0a442d096e03f2ab53353738794',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should bind secure nested package ${expected}`);
  }
  for (const expected of [
    'ARG UNDICI_8_VERSION=8.10.2', 'ARG UNDICI_8_ARCHIVE_SHA256=740638ae32d78d2646a6727950e365fa26b6fa87913fa096e60ed4afeb4634aa',
    'ARG FULL_JS_YAML_VERSION=4.3.2', 'ARG FULL_JS_YAML_ARCHIVE_SHA256=c7b241d2224cf9253ff53854aa4cee87da91bd889c4d0fa3a3ffd1041ecee5b1',
    'ARG FULL_XMLDOM_VERSION=0.9.12', 'ARG FULL_XMLDOM_ARCHIVE_SHA256=08245e18c248b957b4c6e07f8549ad5f55ae11b7a8abd4c1113a0fd61ddc67ee',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);
  assert.match(
    dockerfile,
    /replace_scoped_node_module "@xmldom\/xmldom" "\$FULL_XMLDOM_VERSION" "\$FULL_XMLDOM_ARCHIVE_SHA256" xmldom \\\n+        \/usr\/local\/lib\/node_modules\/@marp-team\/marp-cli\/node_modules\/@xmldom\/xmldom;/,
  );
  for (const expected of [
    'npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all',
    'npm --prefix /usr/local/lib/node_modules/eas-cli ls joi --all',
    'npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all',
    'npm --prefix /usr/local/lib/node_modules/vercel ls smol-toml --all',
    'npm --prefix /usr/local/lib/node_modules/@marp-team/marp-cli ls @xmldom/xmldom --all',
    'npm --prefix /usr/local/lib/node_modules/netlify-cli ls sharp --all',
    'wrangler --version',
    'pi --version',
    'PM2_HOME=/tmp/holyclaude-build-pm2 pm2 --version',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should exercise ${expected}`);
  for (const expected of [
    "gray-matter/package.json').dependencies['js-yaml']",
    '3.15.1|"$CLOUDCLI_JS_YAML_VERSION"',
    'cloudcli_js_yaml_merge_limit=ok',
    'eas_joi_validation=ok',
    'vercel_smol_toml=ok',
    'vercel_smol_toml_consumers=ok',
    'discoverPythonPackage',
    'shouldServe',
    'netlify_sharp_build=ok',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should enforce security refresh contract ${expected}`);
  for (const historicalName of ['EAS CLI Joi security package', 'Netlify sharp nested package', 'node-tar npm package', 'Full-image nanoid nested package']) {
    assert.match(immutableInputs, new RegExp(`name: ${historicalName}`));
  }
  assert.doesNotMatch(dockerfile, /replace_(?:scoped_)?node_module[^\n]*(?:eas-cli|netlify-cli|\/vercel\/)/);
  assert.doesNotMatch(dockerfile, /rm -f[^\n]*local-functions-proxy/);
});

test('CloudCLI Docker build probe fails when js-yaml accepts the advisory input', () => {
  const encodedProbe = dockerfile.match(
    /timeout 5s node -e "(const yaml = require\('\/usr\/local\/lib\/node_modules\/@cloudcli-ai\/cloudcli\/node_modules\/js-yaml'\);[^"\r\n]+cloudcli_js_yaml_merge_limit=ok[^"\r\n]+)"/,
  )?.[1];
  assert.ok(encodedProbe, 'CloudCLI js-yaml Docker build probe must exist');
  const probe = encodedProbe
    .replace("require('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/js-yaml')", 'globalThis.__yaml')
    .replaceAll('\\\\', '\\');
  const result = spawnSync(
    process.execPath,
    ['-e', `globalThis.__yaml = { DEFAULT_FULL_SCHEMA: {}, load() {} }; ${probe}`],
    { encoding: 'utf8', timeout: 5_000 },
  );
  assert.notEqual(result.status, 0, 'a no-throw yaml.load must not satisfy the Docker build probe');
  assert.match(result.stderr, /advisory input was accepted/);
});

test('CloudCLI js-yaml overlay guard accepts only the reviewed baseline or pinned target', () => {
  const encodedGuard = dockerfile.match(
    /CLOUDCLI_JS_YAML_INSTALLED_VERSION="\$\(node -p "require\('\/usr\/local\/lib\/node_modules\/@cloudcli-ai\/cloudcli\/node_modules\/js-yaml\/package\.json'\)\.version"\)"; \\\r?\n[\s\S]*?esac;/,
  )?.[0];
  assert.ok(encodedGuard, 'CloudCLI js-yaml old-or-target guard must exist');
  const guard = encodedGuard.replaceAll(/\\\r?\n\s*/g, '\n');
  const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

  for (const [installedVersion, expectedStatus] of [['3.15.1', 0], ['3.15.2', 0], ['3.15.3', 1]]) {
    const result = spawnSync(
      bash,
      ['-eu', '-c', `node() { printf '%s' "$INSTALLED_VERSION"; }\n${guard}`],
      {
        encoding: 'utf8',
        env: { ...process.env, INSTALLED_VERSION: installedVersion, CLOUDCLI_JS_YAML_VERSION: '3.15.2' },
        timeout: 10_000,
      },
    );
    assert.equal(result.status, expectedStatus, `${installedVersion}: ${result.stderr}`);
  }
});

test('release workflow keeps v1.6.6 source, native evidence, and promotion gates fail closed', () => {
  assert.match(workflow, /^run-name: v1\.6\.6$/m);
  assert.match(workflow, /default: "1\.6\.6"/);
  assert.match(workflow, /baseline="e10b9ff220716f934f826bc2e58f12b08f65a4ad"/);
  assert.match(workflow, /git rev-parse 'v1\.6\.5\^\{commit\}'\)" = "e10b9ff220716f934f826bc2e58f12b08f65a4ad"/);
  assert.match(workflow, /SYFT_VERSION: 1\.54\.1/);
  assert.match(workflow, /GRYPE_VERSION: 0\.120\.1/);
  assert.match(workflow, /node scripts\/evaluate-upstream-dependency-report\.mjs/);
  assert.match(workflow, /security\/upstream-dependency-policy\.json/);
  assert.match(workflow, /security\/retained-modified-third-party-baseline\.json/);
  assert.doesNotMatch(workflow, /evaluate-release-security-deferral\.mjs/);
  assert.doesNotMatch(workflow, /security\/openvex\.json/);
  assert.match(workflow, /name: Upload security evidence[\s\S]+if: always\(\)[\s\S]+if-no-files-found: error/);
  assert.match(workflow, /name: Revalidate candidate security evidence/);
  assert.match(workflow, /-o "syft-json=\$\{evidence_dir\}\/sbom\.syft\.json"/);
  assert.match(workflow, /--syft-json "\$\{evidence_dir\}\/sbom\.syft\.json"/);
  assert.match(workflow, /syft "\$\{image\}" --from registry --parallelism 1/);
  assert.match(workflow, /\.dockerhub_ref \+ "@" \+ \.dockerhub_digest/);
  assert.match(workflow, /test "\$\(jq -r \.image "\$\{metadata\}"\)" = "\$\{image_ref\}"/);
  assert.match(workflow, /if jq -e '\.scanner\.source\.type == "sbom-file"'/);
  assert.match(workflow, /source_args=\(--expected-source-target "\$\{source_target\}"\)/);
  assert.match(workflow, /sha256sum -c SHA256SUMS/);
  assert.match(workflow, /expected_targets = \{\("full", "amd64"\), \("full", "arm64"\), \("slim", "amd64"\), \("slim", "arm64"\)\}/);
  assert.match(workflow, /name: Publish and verify immutable version tags/);
  assert.match(workflow, /name: Roll back mutable aliases after failed final smoke/);
  assert.match(workflow, /rhysd\/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667/);
  assert.equal((workflow.match(/uses: actions\/checkout@/g) ?? []).length, (workflow.match(/persist-credentials: false/g) ?? []).length);
  for (const match of workflow.matchAll(/^\s*uses:\s*[^@\s]+@([^\s#]+)/gm)) {
    assert.match(match[1], /^[0-9a-f]{40}$/, `Action ref should be a full SHA: ${match[0].trim()}`);
  }
});

test('release workflow separates the v1.6.5 parent from retained v1.6.4 inputs', () => {
  const expectedBaseline = 'baseline="20e9e10681aec9b091bb54da8755f8a1c59f69bb"';
  const baselineAssignments = workflow.match(/^\s*baseline="[0-9a-f]{40}"\r?$/gm) ?? [];
  assert.equal(baselineAssignments.length, 3, 'workflow must bind source, CloudCLI, and FFmpeg guards to the release baseline');
  assert.equal(baselineAssignments[0].trim(), 'baseline="e10b9ff220716f934f826bc2e58f12b08f65a4ad"');
  assert.ok(baselineAssignments.slice(1).every((entry) => entry.trim() === expectedBaseline));
  assert.match(workflow, /Require retained CloudCLI artifact and overlay inputs to remain unchanged/);
  assert.match(workflow, /Require retained FFmpeg builder and patch inputs to remain unchanged/);
  assert.doesNotMatch(workflow, /Verify FFmpeg artifacts from two empty-cache builds when inputs changed/);
});

test('runtime smoke rotates CloudCLI credentials and rejects the old token', () => {
  const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
  assert.match(runtimeChecks, /assert_cloudcli_security_dependencies\(\)/);
  assert.match(runtimeChecks, /LIMIT_FIELD_NESTING/);
  assert.match(runtimeChecks, /maxFragments: 2/);
  assert.match(runtimeChecks, /cloudcli_security_dependencies=ok/);
  assert.match(runtimeChecks, /rotate_cloudcli_account\(\)/);
  assert.match(runtimeChecks, /api\/auth\/change-password/);
  assert.match(runtimeChecks, /api\/auth\/user\?token=/);
  assert.match(runtimeChecks, /authenticateWebSocket/);
  assert.match(runtimeChecks, /api\/auth\/login/);
  assert.match(runtimeChecks, /api\/auth\/logout/);
  assert.match(runtimeChecks, /cloudcli_account=rotated old_token_rejected=true/);
  assert.match(runtimeChecks, /npm ls --global --depth=0 --json/);
  assert.match(runtimeChecks, /pip', 'inspect', '--local'/);
  assert.match(runtimeChecks, /direct_package_inventory=exact/);
  assert.match(runtimeChecks, /eas-cli\/node_modules\/tar\/package\.json/);
  assert.match(runtimeChecks, /npm\/node_modules\/tar\/package\.json/);
  assert.match(runtimeChecks, /npm tar dependency/);
  assert.match(runtimeChecks, /npm tar package version[\s\S]{0,180}"7\.5\.22"/);
  assert.match(runtimeChecks, /npm tar dependency declaration[\s\S]{0,180}"\^7\.5\.22"/);
  assert.match(runtimeChecks, /npm --prefix \/usr\/local\/lib\/node_modules\/npm ls tar --all/);
  assert.match(runtimeChecks, /EAS tar package version/);
  assert.match(runtimeChecks, /EAS tar package version[\s\S]{0,180}"7\.5\.19"/);
  assert.match(runtimeChecks, /EAS tar dependency[\s\S]{0,180}"7\.5\.19"/);
  assert.match(runtimeChecks, /invalid EAS tar module/);
  assert.match(runtimeChecks, /Vercel vc-native package version[\s\S]{0,320}"63\.1\.2"/);
  assert.match(runtimeChecks, /@vercel\/vc-native-linux-\$\{vercel_native_arch\}/);
  assert.match(runtimeChecks, /vercel_native_root}\/package\.json/);
  for (const expected of [
    'npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all',
    'npm --prefix /usr/local/lib/node_modules/prisma ls mysql2 --all',
    'npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all',
    'npm --prefix /usr/local/lib/node_modules/vercel ls smol-toml --all',
    'npm --prefix /usr/local/lib/node_modules/@marp-team/marp-cli ls @xmldom/xmldom --all',
    'npm --prefix /usr/local/lib/node_modules/wrangler ls sharp --all',
    'npm --prefix /usr/local/lib/node_modules/netlify-cli ls sharp --all',
    'npm --prefix /usr/local/lib/node_modules/netlify-cli ls toml cron-parser raw-body --all',
    'wrangler --version',
    'pi --version',
    'PM2_HOME="$SENTINEL_ROOT/pm2" pm2 --version',
  ]) assert.ok(runtimeChecks.includes(expected), `runtime smoke should exercise ${expected}`);
  for (const expected of [
    'npm --prefix /usr/local/lib/node_modules/@cloudcli-ai/cloudcli ls js-yaml --all',
    'cloudcli_js_yaml_merge_limit=ok',
    "require.resolve('smol-toml', { paths: [owner] })",
    'vercel_smol_toml=ok',
    'vercel_smol_toml_consumers=ok',
    'representative TOML parsing failed',
    'netlify_sharp_png_transform=ok',
    'netlify_sharp_avif_decode=ok',
  ]) assert.ok(runtimeChecks.includes(expected), `runtime smoke should enforce security refresh contract ${expected}`);
  assert.match(runtimeChecks, /wrangler\/package\.json'\)\.devDependencies\.undici"\)" "7\.29\.1"/);
  assert.match(runtimeChecks, /Prisma mysql2 dependency[\s\S]{0,180}"3\.24\.4"/);
  assert.match(runtimeChecks, /Prisma mysql2 package version[\s\S]{0,180}"3\.24\.4"/);
  assert.match(runtimeChecks, /PM2 js-yaml dependency[\s\S]{0,180}"4\.3\.2"/);
  assert.match(runtimeChecks, /PM2 js-yaml package version[\s\S]{0,180}"4\.3\.2"/);
  assert.match(runtimeChecks, /Marp speech-rule-engine xmldom dependency[\s\S]{0,240}"0\.9\.12"/);
  assert.match(runtimeChecks, /Marp xmldom package version[\s\S]{0,240}"0\.9\.12"/);
  assert.match(runtimeChecks, /xmldom_require_well_formed=ok/);
  assert.match(runtimeChecks, /Wrangler Miniflare sharp dependency[\s\S]{0,180}"0\.35\.5"/);
  assert.match(runtimeChecks, /Wrangler sharp package version[\s\S]{0,180}"0\.35\.5"/);
  assert.match(runtimeChecks, /Wrangler sharp libvips version[\s\S]{0,180}"8\.18\.7"/);
  assert.match(runtimeChecks, /Wrangler sharp libheif version[\s\S]{0,180}"1\.23\.5"/);
  assert.match(dockerfile, /wrangler_sharp_vips expected=%s actual=%s/);
  assert.match(dockerfile, /WRANGLER_SHARP_VIPS_EXPECTED=8\.18\.7/);
  assert.match(dockerfile, /wrangler_sharp_heif expected=%s actual=%s/);
  assert.match(dockerfile, /WRANGLER_SHARP_HEIF_EXPECTED=1\.23\.5/);
  assert.match(runtimeChecks, /sharp_transform=ok/);
  assert.match(runtimeChecks, /toml: '\^4\.0\.0'/);
  assert.match(runtimeChecks, /'cron-parser': '\^5\.0\.0'/);
  assert.match(runtimeChecks, /'raw-body': '\^4\.0\.0'/);
  assert.match(runtimeChecks, /semver\.satisfies\(installedVersion, declaredRange\)/);
  assert.match(runtimeChecks, /acceptedCronVersions = \['5\.10\.1', '5\.10\.2'\]/);
  assert.match(runtimeChecks, /rejectedCronVersions = \['6\.0\.0', 'not-a-version'\]/);
  assert.match(runtimeChecks, /netlify_dependency_range_guard=ok/);
  assert.match(runtimeChecks, /netlify_dependency name=\$\{name\} range=\$\{declaredRange\} version=\$\{installedVersion\} satisfies=ok/);
  assert.doesNotMatch(runtimeChecks, /Netlify CLI cron-parser package version/);
  assert.match(runtimeChecks, /netlify_toml_prototype_pollution=blocked/);
  assert.match(runtimeChecks, /netlify_toml_depth_limit=ok/);
  assert.match(runtimeChecks, /netlify_rust_runtime=ok/);
  assert.match(runtimeChecks, /libssh-gcrypt-4 package version/);
  assert.match(runtimeChecks, /! dpkg-query -W libssh-gcrypt-4/);
});

test('plugin reproducibility compares dependency trees and built files', () => {
  const pluginSmoke = readFileSync('tests/plugin_reproducibility_smoke.sh', 'utf8');
  assert.match(pluginSmoke, /npm ls --all --omit=dev --json/);
  assert.match(pluginSmoke, /find \. -type f -print0 \| sort -z \| xargs -0 sha256sum/);
  assert.match(pluginSmoke, /build-output=/);
});

test('Web Terminal rebuild fails closed before a blocked node-pty lifecycle can reach native load', () => {
  const pluginSmoke = readFileSync('tests/plugin_reproducibility_smoke.sh', 'utf8');
  assert.deepEqual(webTerminalLock.packages['node_modules/node-pty'], {
    version: '1.1.0',
    resolved: 'https://registry.npmjs.org/node-pty/-/node-pty-1.1.0.tgz',
    integrity: 'sha512-20JqtutY6JPXTUnL0ij1uad7Qe1baT46lyolh2sSENDd4sTzKZ4nmAFkeAARDKwmlLjPx6XKRlwRUxwjOy+lUg==',
    hasInstallScript: true,
    license: 'MIT',
    dependencies: {
      'node-addon-api': '^7.1.0',
    },
  });
  assert.deepEqual(
    {
      version: webTerminalLock.packages['node_modules/esbuild'].version,
      integrity: webTerminalLock.packages['node_modules/esbuild'].integrity,
      hasInstallScript: webTerminalLock.packages['node_modules/esbuild'].hasInstallScript,
    },
    {
      version: '0.25.12',
      integrity: 'sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==',
      hasInstallScript: true,
    },
  );
  assert.match(dockerfile, /patch-cloudcli-web-terminal-install-policy\.mjs/);
  assert.match(dockerfile, /npm ci --strict-allow-scripts[\s\S]+node -e "require\('node-pty'\)" && npm run build/);
  assert.match(pluginSmoke, /npm ci --strict-allow-scripts/);
  assert.match(pluginSmoke, /require\('\/tmp\/plugin-proof-web-terminal-second\/node_modules\/node-pty'\)/);
  assert.match(pluginSmoke, /pty\.spawn\('\/bin\/sh'/);
  assert.match(pluginSmoke, /web-terminal-native=ok/);
});

test('current Debian Critical matches have exact vendor-severity evidence', () => {
  const reviews = JSON.parse(advisoryReviews).reviews;
  const review = reviews.find((item) => item.id === 'libssh2-bookworm-minor');
  assert.deepEqual(review.vulnerabilities, ['CVE-2026-7598']);
  assert.deepEqual(review.component, {
    names: ['libssh2-1'],
    versions: ['1.10.0-3+b1'],
    types: ['deb'],
    locationPatterns: ['^/usr/share/doc/', '^/var/lib/dpkg/'],
  });
  assert.equal(review.disposition, 'vendor_severity');
  assert.equal(review.effectiveSeverity, 'Low');
  assert.equal(review.authority.url, 'https://security-tracker.debian.org/tracker/CVE-2026-7598');
  assert.equal(review.reviewedAt, '2026-09-01');
  assert.equal(review.expiresAt, '2026-10-01');
});

test('libssh findings use exact backend, version, and vendor-severity evidence', () => {
  const reviews = JSON.parse(advisoryReviews).reviews;
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  const backend = reviews.find((item) => item.id === 'v155-libssh-gcrypt-backend-not-affected');
  const version15370 = reviews.find(
    (item) => item.id === 'v155-libssh-cve-2026-15370-pre-011-not-affected',
  );
  const version59849 = reviews.find(
    (item) => item.id === 'v155-libssh-cve-2026-59849-pre-011-not-affected',
  );
  const callback = reviews.find((item) => item.id === 'v155-libssh-channel-callback-vendor-medium');

  assert.deepEqual(backend.vulnerabilities, ['CVE-2026-59847']);
  assert.deepEqual(version15370.vulnerabilities, ['CVE-2026-15370']);
  assert.deepEqual(version59849.vulnerabilities, ['CVE-2026-59849']);
  assert.deepEqual(callback.vulnerabilities, ['CVE-2026-59850']);
  for (const review of [backend, version15370, version59849, callback]) {
    assert.deepEqual(review.component, {
      names: ['libssh-gcrypt-4'],
      versions: ['0.10.6-0+deb12u2'],
      types: ['deb'],
      locationPatterns: ['^/usr/share/doc/', '^/var/lib/dpkg/'],
    });
    assert.deepEqual(review.variants, ['full']);
  }
  assert.equal(backend.disposition, 'not_affected');
  assert.equal(version15370.disposition, 'not_affected');
  assert.equal(version59849.disposition, 'not_affected');
  assert.equal(callback.disposition, 'vendor_severity');
  assert.equal(callback.effectiveSeverity, 'Medium');
  assert.ok(vex.statements.some((item) => item['@id'] === backend.vexStatement));
  assert.ok(vex.statements.some((item) => item['@id'] === version15370.vexStatement));
  assert.ok(vex.statements.some((item) => item['@id'] === version59849.vexStatement));
  assert.match(browserRuntimeChecks, /libssh_backend=gcrypt openssl=absent/);
});

test('release OpenVEX identity uses the v1.6.4 review date', () => {
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  assert.equal(vex['@id'], 'urn:holyclaude:openvex:v1.6.4');
  assert.equal(vex.timestamp, '2026-10-01T00:00:00Z');
});

test('json-server smoke tolerates only wait cleanup failure', () => {
  assertJsonServerWaitCannotMaskProbeFailure(dockerfile);
  const maskedFixture = dockerfile.replace(
    /\{ \\\r?\n\s+wait "\$JSON_SERVER_PID" 2>\/dev\/null \|\| true; \\\r?\n\s+\} && \\/,
    'wait "$JSON_SERVER_PID" 2>/dev/null || true && ' + '\\',
  );
  assert.throws(() => assertJsonServerWaitCannotMaskProbeFailure(maskedFixture));
});

test('Dockerfile omits unused package overlay arguments', () => {
  for (const prefix of ['GLOB_', 'NODE_FORGE_', 'UNDICI_7_']) {
    assert.doesNotMatch(dockerfile, new RegExp(`^ARG ${prefix}`, 'm'));
  }
});

test('removed Netlify proxy findings cannot be carried as risk exceptions', () => {
  const reviews = JSON.parse(advisoryReviews).reviews;
  assert.equal(
    reviews.some((item) => item.component.locationPatterns.some((pattern) => pattern.includes('local-functions-proxy'))),
    false,
  );
});

test('Netlify 27 no longer carries the image-size backport target', () => {
  assert.equal(existsSync('scripts/patch-netlify-image-size.mjs'), false);
  assert.doesNotMatch(dockerfile, /patch-netlify-image-size\.mjs/);
  assert.match(browserRuntimeChecks, /netlify image-size downstream backport=not-required/);
  assert.doesNotMatch(advisoryReviews, /v157-netlify-image-size-downstream-backport/);
});

test('FFmpeg security backport is isolated and runtime-probed', () => {
  assert.match(dockerfile, /AS ffmpeg-security-builder/);
  assert.match(dockerfile, /AS ffmpeg-security-builder\nENV DEBIAN_FRONTEND=noninteractive/);
  assert.match(dockerfile, /AS ffmpeg-security-builder[\s\S]*ARG VARIANT[\s\S]*if \[ "\$VARIANT" = "full" \]; then/);
  assert.match(dockerfile, /mkdir -p \/out\/ffmpeg-security-backport/);
  assert.match(dockerfile, /build-ffmpeg-security-backport\.sh/);
  assert.match(dockerfile, /COPY --from=ffmpeg-security-builder \/out\/ffmpeg-security-backport/);
  assert.match(dockerfile, /FFMPEG_BACKPORT_VERSION=7:5\.1\.9-0\+deb12u1\+holyclaude2/);
  assert.match(browserRuntimeChecks, /ffmpeg -version/);
  assert.match(browserRuntimeChecks, /ffprobe -version/);
  assert.match(browserRuntimeChecks, /\$2 == "cfhd"/);
  assert.match(browserRuntimeChecks, /\$2 == "dvbsub"/);
  assert.match(browserRuntimeChecks, /ffmpeg-smoke\.mkv/);
  assert.doesNotMatch(advisoryReviews, /"7:5\.1\.9-0\+deb12u1"/);
  assert.match(advisoryReviews, /"id": "v155-ffmpeg-high-exception"[\s\S]{0,1200}"7:5\.1\.9-0\+deb12u1\+holyclaude2"/);
});

test('Prisma nested mysql2 is replaced with the checksum-bound fixed release', () => {
  assert.match(dockerfile, /ARG PRISMA_MYSQL2_VERSION=3\.24\.4/);
  assert.match(dockerfile, /ARG PRISMA_MYSQL2_ARCHIVE_SHA256=ae44923fa285bb1a089101331603ab0d89b766e73038987a79449c79f8017a27/);
  assert.match(dockerfile, /PRISMA_ROOT=\/usr\/local\/lib\/node_modules\/prisma[\s\S]*dependencies\.mysql2[\s\S]*3\.15\.3/);
  assert.match(dockerfile, /https:\/\/registry\.npmjs\.org\/mysql2\/-\/mysql2-\$\{PRISMA_MYSQL2_VERSION\}\.tgz/);
  assert.match(dockerfile, /npm install --omit=dev --ignore-scripts --no-package-lock/);
  assert.match(dockerfile, /require\('\$MYSQL2_ROOT\/package\.json'\)\.version[\s\S]*PRISMA_MYSQL2_VERSION/);
  assert.match(dockerfile, /typeof require\('\$MYSQL2_ROOT'\)\.createConnection/);
  assert.match(immutableInputs, /name: Prisma mysql2 nested package[\s\S]*version: 3\.24\.4[\s\S]*archive-sha256: ae44923fa285bb1a089101331603ab0d89b766e73038987a79449c79f8017a27[\s\S]*npm-integrity: "sha512-A2olluVlj0mvgyIRRISMEzXc51m\+21mRtcMVjJyIpt2GG98\+XrC9m9HzsqcMsX2LcnfccJvY5NB22g8fENBnOA=="/);
  assert.match(immutableInputs, /name: Full-image undici 8 nested package[\s\S]*version: 8\.10\.2[\s\S]*archive-sha256: 740638ae32d78d2646a6727950e365fa26b6fa87913fa096e60ed4afeb4634aa[\s\S]*npm-integrity: "sha512-\/y4\/bH9YNU5hi9NIrpOuvGXFcxrj3CMrV\+\/AYpowAYTpHn8gX\/XPFjNy766FPoYY0miQhdW977JFWKGNhBdwyQ=="/);
  assert.match(immutableInputs, /name: Full-image js-yaml nested package[\s\S]*version: 4\.3\.2[\s\S]*archive-sha256: c7b241d2224cf9253ff53854aa4cee87da91bd889c4d0fa3a3ffd1041ecee5b1[\s\S]*npm-integrity: "sha512-SFNOvSJ\+Dgf\/9An904Yx\+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3\/TP3O\+wzWuiTFl4sqbltzA=="/);
  assert.match(immutableInputs, /name: CloudCLI js-yaml nested package[\s\S]*version: 3\.15\.2[\s\S]*archive-sha256: 7f005cf0b8ee639b4557e0e321dc067c1f2aa0a442d096e03f2ab53353738794[\s\S]*npm-integrity: "sha512-6EuL879VkRA\+1Cz578mKMiKvjPNEuk6\+r1JaFzoSWejZmtf7xWbIyw1e3KkxlkzTIt9Taw6JBhEppG7utc1P\+w=="/);
  assert.match(immutableInputs, /name: Full-image xmldom nested package[\s\S]*version: 0\.9\.12[\s\S]*archive-sha256: 08245e18c248b957b4c6e07f8549ad5f55ae11b7a8abd4c1113a0fd61ddc67ee[\s\S]*npm-integrity: "sha512-5AXjrcMClTryPe9LgZrygpB1lj7s0S9E0\+W\+AHaVKAVyHanafK86iPSvG5xHVSp\/jC\+VH1UXu0TAEmY279xH7A=="/);
});

test('CloudCLI runtime dependency expectations match the reproduced artifact manifest', () => {
  const block = browserRuntimeChecks.match(/for \(const \[dependency, version\] of Object\.entries\(\{([\s\S]*?)\}\)\)/);
  assert.ok(block, 'CloudCLI runtime dependency assertions must exist');
  const expected = Object.fromEntries([...block[1].matchAll(/['"]?([\w/-]+)['"]?:\s*'([^']+)'/g)].map((match) => [match[1], match[2]]));
  const overlays = { 'fast-uri': '3.1.8', nanoid: '3.3.19' };
  for (const [path, version] of Object.entries(cloudcliManifest.verification.requiredRuntimeDependencies)) {
    const dependency = path.replace(/^node_modules\//, '');
    assert.equal(expected[dependency], overlays[dependency] ?? version, path);
  }
});

test('Azure CLI uses its compatible bundled cryptography and runtime probes', () => {
  assert.doesNotMatch(dockerfile, /AS cryptography-security-builder/);
  assert.doesNotMatch(dockerfile, /cryptography_security_backport_smoke\.py/);
  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.90\.0-1~bookworm/);
  assert.match(dockerfile, /ARG AZURE_CLI_PYJWT_VERSION=2\.15\.1/);
  assert.match(dockerfile, /ARG AZURE_CLI_PYJWT_WHEEL_SHA256=42d59d631f7768a1028a64c7ff581a9bf7519804daf91fc5b6c56e30eec5e193/);
  assert.match(dockerfile, /ARG AZURE_CLI_URLLIB3_VERSION=2\.8\.0/);
  assert.match(dockerfile, /ARG AZURE_CLI_URLLIB3_WHEEL_SHA256=0cf3cae568d36aa9576b28dfb35f11328f1cb974ca7647d9475ebb86c75ac6e3/);
  assert.match(dockerfile, /pyjwt-\$\{AZURE_CLI_PYJWT_VERSION\}-py3-none-any\.whl/);
  assert.match(dockerfile, /\/opt\/az\/bin\/python3 -m pip install --no-cache-dir --no-deps/);
  assert.match(dockerfile, /test "\$\(\/opt\/az\/bin\/python3 --version\)" = "Python 3\.14\.6"/);
  assert.match(dockerfile, /import cryptography; print\(cryptography\.__version__\).*48\.0\.1/);
  assert.match(dockerfile, /import importlib\.metadata; print\(importlib\.metadata\.version\("PyJWT"\)\).*AZURE_CLI_PYJWT_VERSION/);
  assert.match(dockerfile, /\/opt\/az\/bin\/python3 -m pip check/);
  assert.match(browserRuntimeChecks, /Azure CLI bundled cryptography/);
  assert.match(browserRuntimeChecks, /Azure CLI bundled PyJWT[\s\S]{0,160}"2\.15\.1"/);
  assert.match(browserRuntimeChecks, /Azure CLI bundled urllib3[\s\S]{0,160}"2\.8\.0"/);
  assert.match(browserRuntimeChecks, /jwt\.encode\(\{"sub": "smoke"\}/);
  assert.match(browserRuntimeChecks, /requests\.get\(f"http:\/\/127\.0\.0\.1:/);
  assert.match(browserRuntimeChecks, /az config get core\.collect_telemetry/);
});
