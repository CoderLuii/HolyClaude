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

test('security documentation matches the guarded Full-image tar parent baselines', () => {
  const securityDocs = readFileSync('.github/SECURITY.md', 'utf8');
  const tarPatcher = readFileSync('scripts/patch-global-node-tar.mjs', 'utf8');
  const easVersion = tarPatcher.match(/easManifest,[\s\S]{0,80}'eas-cli',\s*'([^']+)'/)?.[1];
  const vercelVersion = tarPatcher.match(/loadPackage\(vercelManifest, 'vercel', '([^']+)'\)/)?.[1];
  const vercelContainerVersion = tarPatcher.match(/vercelContainerManifest,[\s\S]{0,80}'@vercel\/container',\s*'([^']+)'/)?.[1];
  const vercelFunVersion = tarPatcher.match(/vercelFunManifest,[\s\S]{0,80}'@vercel\/fun',\s*'([^']+)'/)?.[1];
  const easTarVersion = tarPatcher.match(/const EAS_BASELINE_TAR_VERSION = '([^']+)'/)?.[1];
  const vercelContainerTarVersion = tarPatcher.match(/const VERCEL_CONTAINER_BASELINE_TAR_VERSION = '([^']+)'/)?.[1];
  const vercelFunTarVersion = tarPatcher.match(/const VERCEL_FUN_BASELINE_TAR_VERSION = '([^']+)'/)?.[1];
  const targetTarVersion = tarPatcher.match(/const TARGET_TAR_VERSION = '([^']+)'/)?.[1];

  assert.ok(easVersion && vercelVersion && vercelContainerVersion && vercelFunVersion && easTarVersion && vercelContainerTarVersion && vercelFunTarVersion && targetTarVersion);
  assert.ok(securityDocs.includes(
    `The full image includes EAS CLI ${easVersion} and Vercel CLI ${vercelVersion}. EAS CLI bundles \`tar\` ${easTarVersion}. Vercel's \`@vercel/container\` ${vercelContainerVersion} resolves the hoisted \`tar\` ${vercelContainerTarVersion}, while \`@vercel/fun\` ${vercelFunVersion} retains a nested \`tar\` ${vercelFunTarVersion}. The Docker build replaces only those three installed copies with checksum-verified \`tar\` ${targetTarVersion}`,
  ));
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
  for (const version of ['12.4.2', '4.134.0', '4.70.1', '1.20.0', '3.11.2', '0.53.0', '0.74.4', '2.1.276']) {
    assert.ok(browserRuntimeChecks.includes(version), `runtime checks should contain ${version}`);
  }
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.276');
  for (const expected of [
    'version: 12.4.2',
    'version: 4.134.0',
    'version: 4.70.1',
    'version: 1.20.0',
    'version: 3.11.2',
    'version: 0.53.0',
    'version: 0.74.4',
    'version: 2.1.276',
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
  assert.match(dockerfile, /^FROM python:3\.14\.7-slim-bookworm@sha256:9ab8d9c8514b44f90cf0029dd42fdd7e9e211e639c8b995304cc04568dee900f AS python-runtime$/m);
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
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=153\.0\.8010\.47-2~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_AMD64=ddd26b17ec5008aaccf9f0acd3031c9ac62984fe98b1dbc5782670598b6d3bd9/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_ARM64=4df7ba070ef3d4e8e1bcb020d9a2a3e111f964456ac19bb728aa28434b880f7b/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_AMD64=574470643af1492e222c85a1f051a20207951f5d3c4b9ea82f8d1f3b1368eb77/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_ARM64=9798dbacdab0f97050b055edfe00843f57ca2f575d14e4cc239cf00f1d445c3b/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64=c397d185b57e000ed10d20c6ccdae7c8d6f66c3df35bcb428e8d67c299cb953b/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64=2712811e3e1ccb4bb8907745ef5b832abe29011fc937052f06535e4dfba2b083/);
  assert.match(dockerfile, /apt-get download[\s\S]+chromium-common[\s\S]+chromium-sandbox/);
  assert.match(dockerfile, /\| sha256sum -c -/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.doesNotMatch(dockerfile, /playwright install/);
  assert.match(immutableInputs, /Debian Chromium package trio[\s\S]+version: 153\.0\.8010\.47-2~deb12u1/);
  const chromiumImmutableBindings = {
    'amd64-chromium-package-sha256': 'ddd26b17ec5008aaccf9f0acd3031c9ac62984fe98b1dbc5782670598b6d3bd9',
    'arm64-chromium-package-sha256': '4df7ba070ef3d4e8e1bcb020d9a2a3e111f964456ac19bb728aa28434b880f7b',
    'amd64-chromium-common-package-sha256': '574470643af1492e222c85a1f051a20207951f5d3c4b9ea82f8d1f3b1368eb77',
    'arm64-chromium-common-package-sha256': '9798dbacdab0f97050b055edfe00843f57ca2f575d14e4cc239cf00f1d445c3b',
    'amd64-chromium-sandbox-package-sha256': 'c397d185b57e000ed10d20c6ccdae7c8d6f66c3df35bcb428e8d67c299cb953b',
    'arm64-chromium-sandbox-package-sha256': '2712811e3e1ccb4bb8907745ef5b832abe29011fc937052f06535e4dfba2b083',
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
  assert.match(
    dockerfile,
    /case "\$TARGETARCH" in \\\n+\s+amd64\)[\s\S]+arm64\)[\s\S]+\*\) exit 1 ;;/,
  );
});

test('native installers and their outputs are pinned without unsupported flags', () => {
  assert.match(dockerfile, /ARG CLAUDE_CODE_VERSION=2\.1\.276/);
  assert.match(dockerfile, /CLAUDE_INSTALLER_SHA256=3a68d3406cf674e17bed1733a4dcf37805e2e47d87417700007d7e1aa766a944/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_AMD64=8a56c8a14bd3cb246e2bdb7e60aefe0f609bff78c8bbcc5ea6b1817c111c6145/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_ARM64=e9ac3df956083645578a382ad64ec304468666e362c33bfdefd803cd6ff596b0/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
  assert.match(dockerfile, /\/home\/claude\/\.local\/bin\/claude --version/);

  assert.match(dockerfile, /ARG JUNIE_VERSION=3196\.5/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_AMD64=dfe7635595f87c6e6d2a3acfe239b2bcb54ceaef4df41f0ca1044ed0ae37aa01/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_ARM64=ac43e6b9ab512b94c57b1d12d52ac35131eb8dbcfb55b42f7fb1e8cd2dd76a98/);
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
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.9\.0"/);
  assert.match(dockerfile, /SETUPTOOLS_VERSION=84\.0\.0/);
  assert.match(dockerfile, /SETUPTOOLS_WHEEL_SHA256=51a52592b3b99e102b609654876bd65f19f999935166d1352678931132b0c670/);
  assert.match(dockerfile, /patch-global-node-security-dependencies\.mjs --root \/ --variant "\$VARIANT" --check-baseline/);
  assert.match(dockerfile, /wrangler\/node_modules\/\$\{SHARP_PLATFORM_PACKAGE\}\/package\.json'\)\.version"\)" = "0\.35\.4"/);
  assert.match(dockerfile, /wrangler\/node_modules\/\$\{SHARP_LIBVIPS_PACKAGE\}\/package\.json'\)\.version"\)" = "1\.3\.3"/);

  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.90\.0-1~bookworm/);
  assert.match(dockerfile, /AZURE_CLI_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /sed -i[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /grep -Fqx[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /ARG GITHUB_CLI_VERSION=2\.101\.0/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_AMD64=f876a3b87bf67c94f773d17becca4dc7340b056dab901473a9260ee2a73e237b/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_ARM64=9aec87f9a011b1521556b06cb003776e7e214144c8efd2144924a28d90c23057/);
  assert.match(dockerfile, /github\.com\/cli\/cli\/releases\/download\/v\$\{GITHUB_CLI_VERSION\}/);
  assert.match(browserRuntimeChecks, /require_eq "GitHub CLI version"[\s\S]{0,160}"2\.101\.0"/);
});

test('immutable input inventory binds the release-critical inputs', () => {
  assert.match(dockerfile, /^ARG HOLYCLAUDE_VERSION=1\.6\.2$/m);
  assert.match(immutableInputs, /^release: v1\.6\.2$/m);
  assert.match(immutableInputs, /^expires-at: 2026-10-12$/m);
  assert.match(
    immutableInputs,
    /^  - name: Prettier\n    version: 3\.9\.8\n    archive-sha256: c33e1990a784e5a4cbc357b0755dac69868eb80a4893940db483cbab4e8aa44f\n    npm-integrity: "sha512-WRFq3Wn3WId7LLROfMLdH7xaFr2jR62wU8nLO6rQUOLOxNZUviyJQs1M0iIhLexSFy\+L\+w0ch66wtoO2jRjG0A=="\n    verification: npm registry tarball integrity and committed SHA-256\n    verification-mode: committed-hash\n    status: updated$/m,
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
    'sha256:648f440f42a0958804efb24df176f806f9d353b41f1c0627f666428e40310f6b',
    'sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6',
    'sha256:9ab8d9c8514b44f90cf0029dd42fdd7e9e211e639c8b995304cc04568dee900f',
    'sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
    'caeedb81fb0491615f1ebd1761e4145d41ee86dd2cc7bf80669f9f5ad9d6133d',
    'c46d5e4c28e12aa4c5becfaa343ef1c7f89045b6b895f2c21d471c62db09c706',
    '3fa2dc4b924621ab65404cf08d0b8438d896d80ab949c9d5a4ca283c36004c9b',
    '29f0ec7c549ddb0e2b6a0ca714851f7399438afc399b80c12808e065edc9a8f8',
    'dbcb813823bdd20940b903addbd779551569679f',
    'f87e5991a6d7451dcb8d9637bfbc97413f497069',
    '4895cd3fd33362471e739b786493aba048487bcc',
    '6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d',
    '391c7a29fd4a2136e5eb09b9f34fc9ec1e680da9e7b850a8cd1148d94c61e5b7',
    'b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6',
    '8a56c8a14bd3cb246e2bdb7e60aefe0f609bff78c8bbcc5ea6b1817c111c6145',
    'e9ac3df956083645578a382ad64ec304468666e362c33bfdefd803cd6ff596b0',
    '05e6813a337cc722c3ed07e54a764b75cc5d671e2e60459db0ba696ee5fa7504',
    '5d673b849f494f0d64ec471d8640b153ca8849e3846a31da17abdcfce8df6b46',
    '93b9cb6e68b97601268cc7afe17d89ce9364f6277f30b4193c725aa7dc3ededf',
    '3bb1683c7bff8bf8a810284d8b38af46ac22e2a732fca88de299fdc6b88af814',
    '0161f9532b530609de5bcb84643ac6e25afcf76496e53c3049afbe1bedf10acc',
    'c293e525e6fef9c20e8728fd4612df02a0aa31bb5fe91ecd93e123b1b7bffa73',
    'cefd0eca11b2a37a3aee776544d4f4ae913f02688135b5556b8788dfa474afc4',
    '355c35042989ec176dc9ded7082d3357b668429ea873ff76f2b9a6a7d753731b',
    'e53fa9e1b281c21f1d885ae6a30828c2af2b0c43f221b7bc3c381fbdec4b1409',
    '6f10672b06a48ce783c8000f465f0d271877372582407f93c05e0997800049f8',
    'bf3fe71fbfb8ec0e310e0bc8537c3405a01f38f25f9394ed2135e6202fed542b',
    '8c8255de28f986d935a64c9ca71c0ec2d2f41d355691f5ea684725dc91413f71',
    'cec596316640f2b394b8f0daa0ea61a8eae82d017b620b9f202befb972a59ea4',
    'e8dca71ec86dce5f04e333f0d56cdedf942446e6643b9cea1af0d6d3a02cb03e',
    'a9356f0cb89b3b8621529c5d5eebd69bfe154f4c3f68b4cf2de47e45fa855c2e',
    'dfe7635595f87c6e6d2a3acfe239b2bcb54ceaef4df41f0ca1044ed0ae37aa01',
    'ac43e6b9ab512b94c57b1d12d52ac35131eb8dbcfb55b42f7fb1e8cd2dd76a98',
    'f876a3b87bf67c94f773d17becca4dc7340b056dab901473a9260ee2a73e237b',
    '9aec87f9a011b1521556b06cb003776e7e214144c8efd2144924a28d90c23057',
    '4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    '2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ff812c5853c52ef120ec73132320805d179a376e42785085e2053ce7f2479860',
    '72a9776fd667bdd6b91855e75e16603df22ce050c3563136acd273c95b099c09',
    'cecb24eabf2eb23f0f49bf131cddd640e65017336b6298da9297bdf9d213cc0b',
    'be7ee5f16f4c37d3a90e4edce35079cc65b62e5d83bad40f3613a6f2b45efbac',
    '4c4c874e0dff97277f2de92cfe82e8d84ddc2d80f206779f38c831bd2e147647',
    'ef1dac449531753ccfb02ec7df20164f3cf48fff666bf1b7348c3f872a13b6e9',
    'b6baa53003cd2e096981474ba9461a33aba2e6948b2b4b08c4aa1a88e6dc1b59',
    '6d89da252a8b030d923e728396dc34465cf6095101b78222b0ee337b68140dea',
    '9f30fc9882c2782b7ce5714db5263993f6bcb310c8c590192baa7cfd9b7465d0',
    '2e764877a5587816c633f18caf8f7402b8f5d26a9cede28aa79c70e05b270e15',
    'a82d8ee92db0cf440ed9a757d7d8427b07e979b1d90bcabc3593f058cf63d86c',
    '2b7abde059773e621ce22ea06cf3310d1c4d93e3bb18752bbbe73577fd3ae944',
    'f0955d9224993e73bcec7a7fc0da5e1b58cfeaa45c5f7dc7e0112bd2f8fe3315',
    '50bf844517c5d022fefe9463f01a1a6dc37f52c765de1895245a3e19666d2e81',
    'c5f056448f973ae7d39b5401949648a78f2dc1947d6a8eb65be60d5c504b9385',
    '88a1016bc1d657375a35864e4f44b6f333df8ff97b559f51bba0adcb2169df09',
    'b3c123df1887cf27c6480a87d148c86831cd83da478e0a8ab773ca188f3f3222',
    '76d12818e3dff64ddac3b9f4ec63b305070ddcf5fc382a2a23dc0826fa9bf5a8',
    cloudcliManifest.artifact.sha256,
  ]) {
    assert.ok(immutableInputs.includes(value), `immutable input inventory should contain ${value}`);
  }
});

test('compatible package updates and plugin locks are exact', () => {
  for (const expected of [
    'ARG BRACE_EXPANSION_VERSION=5.0.12',
    'ARG BRACE_EXPANSION_ARCHIVE_SHA256=ef8448ec78f20b692f04fa6d01f39b5ab34c66404bea3429f5a39c6c9e0be8b4',
    'npm@12.0.2',
    'pnpm@12.4.2',
    'vite@8.3.0',
    'prettier@3.9.8',
    'eslint@10.10.0',
    'concurrently@10.0.5',
    'wrangler@4.134.0',
    'vercel@59.23.1',
    'netlify-cli@27.8.0',
    'eas-cli@24.7.0',
    'prisma@7.10.0',
    'lighthouse@13.4.1',
    '@marp-team/marp-cli@4.5.1',
    '@google/gemini-cli@0.60.0',
    '@openai/codex@0.155.0',
    'opencode-ai@1.18.31',
    '@earendil-works/pi-coding-agent@0.85.1',
    'pandas==3.0.6',
    'tqdm==4.70.1',
    'matplotlib==3.11.2',
    'fastapi==0.141.1',
    'uvicorn==0.53.0',
    'lxml==6.1.3',
    'numpy==2.5.3',
    'tree-sitter-language-pack==1.20.0',
    'playwright==1.63.0',
    'weasyprint==70.0',
    'cairosvg==2.9.1',
    'CLOUDCLI_VERSION=1.37.3',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should contain ${expected}`);
  }
  assert.match(dockerfile, /markdown==3\.10\.3/);
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
  assert.match(
    dockerfile,
    /ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=40e98ac4452603c3b59c082c033c8a7ea3b97dd09e2a3c93c1c15cfbf99d925d/,
  );
  assert.match(
    dockerfile,
    /echo "\$CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256  \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz" \| sha256sum -c -[\s\S]+npm ci --omit=dev[\s\S]+chmod 0755 "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js"[\s\S]+ln -s "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js" \/usr\/local\/bin\/cloudcli/,
  );
  assert.match(
    dockerfile,
    /CLOUDCLI_SHRINKWRAP_SHA256="\$\(sha256sum npm-shrinkwrap\.json \| cut -d' ' -f1\)" && \\\n+    test "\$\(node -p "require\('\.\/npm-shrinkwrap\.json'\)\.packages\['node_modules\/@vscode\/ripgrep'\]\.version"\)" = "\$CLOUDCLI_VSCODE_RIPGREP_PACKAGE_VERSION" && \\\n+    cp -- npm-shrinkwrap\.json package-lock\.json && \\\n+    echo "\$CLOUDCLI_SHRINKWRAP_SHA256  npm-shrinkwrap\.json" \| sha256sum -c - && \\\n+    echo "\$CLOUDCLI_SHRINKWRAP_SHA256  package-lock\.json" \| sha256sum -c - && \\\n+    test "\$\(npm --version\)" = "12\.0\.2" && \\\n+    TMPDIR="\$CLOUDCLI_RIPGREP_CACHE_ROOT" npm ci --omit=dev --allow-remote=all --allow-file=none --allow-git=none --allow-directory=none && \\\n+    echo "\$CLOUDCLI_SHRINKWRAP_SHA256  npm-shrinkwrap\.json" \| sha256sum -c - && \\\n+    cmp -s npm-shrinkwrap\.json package-lock\.json && \\\n+    rm -f package-lock\.json/,
  );
  assert.match(dockerfile, /npm@12\.0\.2/);
  assert.match(
    dockerfile,
    /npm i -g --allow-scripts=opencode-ai opencode-ai@1\.18\.31; \\\n+    test "\$\(opencode --version\)" = "1\.18\.31"/,
  );
  for (const expected of [
    'ARG CLOUDCLI_NANOID_VERSION=3.3.19',
    'ARG CLOUDCLI_NANOID_ARCHIVE_SHA256=4e371b71e3d5081fa0052356d5c1904e7a60e049864c26f0724cfd32dc303849',
    'ARG NESTED_IP_ADDRESS_VERSION=10.7.2',
    'ARG NESTED_IP_ADDRESS_ARCHIVE_SHA256=4301746e43e8a85a6a41e268f02178b27e6ba58e78e6913ab105d3871618083b',
    'ARG CLOUDCLI_FAST_URI_VERSION=3.1.7',
    'ARG CLOUDCLI_FAST_URI_ARCHIVE_SHA256=3fa380284be4ecbf471c1dbb8c5da6f517c95f54279f88c2037985d03fdc6d92',
    'ARG CLOUDCLI_JS_YAML_VERSION=3.15.2',
    'ARG CLOUDCLI_JS_YAML_ARCHIVE_SHA256=7f005cf0b8ee639b4557e0e321dc067c1f2aa0a442d096e03f2ab53353738794',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should bind secure nested package ${expected}`);
  }
  for (const expected of [
    'ARG UNDICI_8_VERSION=8.10.2', 'ARG UNDICI_8_ARCHIVE_SHA256=740638ae32d78d2646a6727950e365fa26b6fa87913fa096e60ed4afeb4634aa',
    'ARG FULL_NANOID_VERSION=3.3.19', 'ARG FULL_NANOID_ARCHIVE_SHA256=4e371b71e3d5081fa0052356d5c1904e7a60e049864c26f0724cfd32dc303849',
    'ARG FULL_JS_YAML_VERSION=4.3.2', 'ARG FULL_JS_YAML_ARCHIVE_SHA256=c7b241d2224cf9253ff53854aa4cee87da91bd889c4d0fa3a3ffd1041ecee5b1',
    'ARG FULL_XMLDOM_VERSION=0.9.12', 'ARG FULL_XMLDOM_ARCHIVE_SHA256=08245e18c248b957b4c6e07f8549ad5f55ae11b7a8abd4c1113a0fd61ddc67ee',
    'ARG VERCEL_SMOL_TOML_VERSION=1.8.0', 'ARG VERCEL_SMOL_TOML_ARCHIVE_SHA256=1fc995be91cdb777fc13e20c2edfebaaf60ef4e4d2d5331caef2837b04d37892',
    'ARG WRANGLER_SHARP_VERSION=0.35.4', 'ARG WRANGLER_SHARP_ARCHIVE_SHA256=6ebef10290372c7309d9e22e3ecb9e32ca6a3aa6e07f3d83aa904df8ae4f6a5a',
    'ARG WRANGLER_SHARP_LIBVIPS_VERSION=1.3.3',
    'ARG WRANGLER_SHARP_LINUX_X64_ARCHIVE_SHA256=9fe2de0bf57643eb603f16d5ed237dceb1c1229ea76f5094aacab1e99162bf3b',
    'ARG WRANGLER_SHARP_LINUX_ARM64_ARCHIVE_SHA256=556157e2f5de993f0b022d2cce22fd8248daeb95610c37d5a7cb7cca41d5d467',
    'ARG WRANGLER_SHARP_LIBVIPS_LINUX_X64_ARCHIVE_SHA256=74b6fa0abb2e41a163853a00e2f247188df5ec1e25bf62c4c5a041f2042a1f6a',
    'ARG WRANGLER_SHARP_LIBVIPS_LINUX_ARM64_ARCHIVE_SHA256=b56f6488e113c385a463fd3be8134b043a17114228f544701fc9c040227e4a59',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);
  assert.match(
    dockerfile,
    /replace_scoped_node_module "@xmldom\/xmldom" "\$FULL_XMLDOM_VERSION" "\$FULL_XMLDOM_ARCHIVE_SHA256" xmldom \\\n+        \/usr\/local\/lib\/node_modules\/@marp-team\/marp-cli\/node_modules\/@xmldom\/xmldom;/,
  );
  for (const expected of [
    'npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all',
    'npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all',
    "@vercel/container/package.json').dependencies['smol-toml']",
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
    'vercel_smol_toml=ok',
    'vercel_smol_toml_consumers=ok',
    'discoverPythonPackage',
    'shouldServe',
    'netlify_sharp_build=ok',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should enforce security refresh contract ${expected}`);
  assert.match(dockerfile, /NETLIFY_PROXY_ROOT=.*local-functions-proxy-linux-\$\{NETLIFY_PROXY_ARCH\}/);
  assert.match(dockerfile, /test -x "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /rm -f "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /test ! -e "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /ARG NODE_TAR_VERSION=7\.5\.22/);
  assert.match(dockerfile, /ARG NODE_TAR_SHA256=b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6/);
  assert.match(dockerfile, /registry\.npmjs\.org\/tar\/-\/tar-\$\{NODE_TAR_VERSION\}\.tgz/);
  assert.match(dockerfile, /echo "\$NODE_TAR_SHA256  \/tmp\/node-tar\.tgz" \| sha256sum -c -/);
  assert.match(dockerfile, /patch-global-node-tar\.mjs --root \/ --variant "\$VARIANT" --check-baseline/);
  assert.match(dockerfile, /node \/tmp\/patch-global-node-tar\.mjs --root \/ --variant "\$VARIANT"/);
  assert.match(dockerfile, /\/usr\/local\/lib\/node_modules\/npm\/node_modules\/tar/);
  assert.match(dockerfile, /\/usr\/local\/lib\/node_modules\/vercel\/node_modules\/tar/);
  assert.match(dockerfile, /\/usr\/local\/lib\/node_modules\/vercel\/node_modules\/@vercel\/fun\/node_modules\/tar/);
  assert.match(dockerfile, /npm --prefix "\$VERCEL_ROOT" ls tar --all/);
  assert.match(dockerfile, /typeof require\(path\)\.list !== 'function'/);
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

test('release workflow keeps manifests clean and emits digest-bound security evidence', () => {
  assert.match(workflow, /^run-name: v1\.6\.2$/m);
  assert.match(workflow, /default: "1\.6\.2"/);
  assert.match(workflow, /baseline="183f2a913c7618e652aa23f2ba40d1f9e3b04f92"/);
  assert.match(workflow, /grep -Eq "\^## \\\[\$\{release#v\}\\\] - \[0-9\]\{2\}\/\[0-9\]\{2\}\/\[0-9\]\{4\}\$"/);
  assert.match(workflow, /git cat-file -p HEAD \| grep -c '\^parent '/);
  assert.match(workflow, /git rev-parse 'v1\.6\.1\^\{commit\}'\)" = "183f2a913c7618e652aa23f2ba40d1f9e3b04f92"/);
  assert.match(workflow, /SYFT_VERSION: 1\.52\.0/);
  assert.match(workflow, /GRYPE_VERSION: 0\.119\.0/);
  assert.match(workflow, /SYFT_SHA256_AMD64: caeedb81fb0491615f1ebd1761e4145d41ee86dd2cc7bf80669f9f5ad9d6133d/);
  assert.match(workflow, /SYFT_SHA256_ARM64: c46d5e4c28e12aa4c5becfaa343ef1c7f89045b6b895f2c21d471c62db09c706/);
  assert.match(workflow, /GRYPE_SHA256_AMD64: 3fa2dc4b924621ab65404cf08d0b8438d896d80ab949c9d5a4ca283c36004c9b/);
  assert.match(workflow, /GRYPE_SHA256_ARM64: 29f0ec7c549ddb0e2b6a0ca714851f7399438afc399b80c12808e065edc9a8f8/);
  assert.match(workflow, /SBOM_UTILITY_VERSION: 0\.19\.2/);
  assert.match(workflow, /git diff --check HEAD\^ HEAD/);
  const policyPreflight = workflow.indexOf('name: Validate committed advisory ledger and OpenVEX');
  const sourceChecks = workflow.indexOf('name: Run release source checks');
  const candidateMatrix = workflow.indexOf('  build-candidate:');
  assert.ok(policyPreflight > -1, 'workflow must have a committed security-policy preflight');
  assert.ok(policyPreflight < sourceChecks, 'security-policy preflight must run before slower source checks');
  assert.ok(sourceChecks < candidateMatrix, 'security-policy preflight must run before matrix builds');
  assert.match(
    workflow,
    /for target in full-amd64 full-arm64 slim-amd64 slim-arm64; do[\s\S]+node scripts\/preflight-security-policy\.mjs[\s\S]+--ledger security\/advisory-reviews\.json[\s\S]+--authority-evidence "security\/critical-exception-authority-evidence-\$\{target\}\.json"[\s\S]+--vex security\/openvex\.json[\s\S]+--as-of "\$\{as_of\}"/,
  );
  assert.match(workflow, /for target in full-amd64 full-arm64 slim-amd64 slim-arm64; do/);
  assert.match(workflow, /critical-exception-authority-evidence-\$\{target\}\.json/);
  assert.match(workflow, /critical-exception-authority-evidence-\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}\.json/);
  assert.match(workflow, /rhysd\/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667/);
  assert.equal((workflow.match(/docker\/login-action@dbcb813823bdd20940b903addbd779551569679f # v4\.6\.0/g) ?? []).length, 8);
  assert.equal((workflow.match(/docker\/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069 # v4\.4\.1/g) ?? []).length, 3);
  assert.equal((workflow.match(/docker\/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7\.4\.0/g) ?? []).length, 1);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\^\)" = "\$\{baseline\}"/);
  assert.match(workflow, /test "\$\(git rev-parse origin\/master\)" = "\$\{GITHUB_SHA\}"/);
  assert.match(workflow, /sbom: false/);
  assert.match(workflow, /provenance: false/);
  assert.match(workflow, /cyclonedx-json=/);
  assert.match(workflow, /spdx-json=/);
  assert.match(workflow, /name: Provision full-image scanner swap[\s\S]+if: matrix\.variant == 'full'[\s\S]+swap_file=\/holyclaude-scanner\.swap[\s\S]+fallocate -l 16G "\$\{swap_file\}"[\s\S]+swapon "\$\{swap_file\}"/);
  assert.match(workflow, /GOGC: "10"/);
  assert.match(workflow, /GOMEMLIMIT: 8GiB/);
  assert.match(workflow, /syft "\$\{image\}" --parallelism 1 \\\r?\n+\s+-o "cyclonedx-json=\$\{evidence_dir\}\/sbom\.cyclonedx\.syft\.json" \\\r?\n+\s+-o "spdx-json=[^\n]+"/);
  assert.equal((workflow.match(/^\s*syft "\$\{image\}"/gm) ?? []).length, 1);
  assert.match(workflow, /node scripts\/normalize-sbom-license-ids\.mjs[\s\S]+sbom\.cyclonedx\.syft\.json[\s\S]+sbom-license-normalization\.json/);
  assert.match(workflow, /printf '\{\}\\n' > "\$\{RUNNER_TEMP\}\/grype-empty\.yaml"/);
  assert.match(workflow, /grype --config "\$\{RUNNER_TEMP\}\/grype-empty\.yaml" "sbom:/);
  assert.doesNotMatch(workflow, /grype --config \/dev\/null/);
  assert.match(workflow, /sbom-utility validate --input-file "\$\{evidence_dir\}\/sbom\.cyclonedx\.json" --quiet/);
  assert.match(workflow, /sbom-utility validate --input-file "\$\{evidence_dir\}\/sbom\.spdx\.json" --quiet/);
  assert.match(workflow, /grype-db-evidence\.json/);
  assert.match(workflow, /cycloneDxLicenseNormalizationCount/);
  assert.match(workflow, /SBOM license normalization inputSha256 mismatch/);
  assert.match(workflow, /raw CycloneDX license normalization count mismatch/);
  assert.match(workflow, /normalized CycloneDX license name count mismatch/);
  assert.match(workflow, /node scripts\/evaluate-security-report\.mjs/);
  assert.match(workflow, /node scripts\/bind-security-authority-report\.mjs/);
  assert.match(workflow, /--output "\$\{evidence_dir\}\/critical-exception-authority-evidence\.json"/);
  assert.match(workflow, /--authority-evidence "\$\{evidence_dir\}\/critical-exception-authority-evidence\.json"/);
  assert.match(workflow, /--image-digest "\$\{\{ steps\.digests\.outputs\.dockerhub_digest \}\}"/);
  assert.match(workflow, /--sbom-sha256 "\$\{sbom_sha256\}"/);
  assert.equal((workflow.match(/--image-digest /g) ?? []).length, 2);
  assert.equal((workflow.match(/--sbom-sha256 /g) ?? []).length, 2);
  assert.match(workflow, /policy\.get\("imageDigest"\) != os\.environ\["DOCKERHUB_DIGEST"\]/);
  assert.match(workflow, /policy\.get\("imageDigest"\) != os\.environ\["GHCR_DIGEST"\]/);
  assert.match(workflow, /policy\.get\("sbomSha256"\) != hashlib\.sha256\(normalized_path\.read_bytes\(\)\)\.hexdigest\(\)/);
  assert.match(workflow, /policy_status=\$\?/);
  assert.match(workflow, /exit "\$\{policy_status\}"/);
  assert.match(workflow, /sha256sum \.\/\*\.json > SHA256SUMS/);
  assert.match(workflow, /security\/advisory-reviews\.json/);
  assert.match(workflow, /security\/openvex\.json/);
  assert.match(workflow, /name: security-evidence-\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}/);
  const securityUpload = workflow.match(/      - name: Upload security evidence\r?\n([\s\S]*?)(?=\r?\n  [a-z][a-z-]*:)/)?.[1];
  assert.ok(securityUpload, 'native candidates must upload security evidence');
  assert.match(securityUpload, /^        if: always\(\)$/m);
  assert.match(securityUpload, /^          path: security-evidence\/\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}$/m);
  const generateSecurityIndex = workflow.indexOf('name: Generate digest-bound security evidence');
  const uploadSecurityIndex = workflow.indexOf('name: Upload security evidence');
  assert.ok(generateSecurityIndex >= 0, 'native candidates must generate security evidence');
  assert.ok(generateSecurityIndex < uploadSecurityIndex, 'security evidence must be generated before upload');
  assert.match(workflow, /name: Revalidate candidate security evidence/);
  assert.match(workflow, /sha256sum -c SHA256SUMS/);
  assert.match(workflow, /metadata\["dockerhubDigest"\] != record\["dockerhub_digest"\]/);
  assert.match(workflow, /metadata\["ghcrDigest"\] != record\["ghcr_digest"\]/);
  assert.match(workflow, /metadata_dirs\[target\] \/ "sbom\.cyclonedx\.json"/);
  assert.doesNotMatch(workflow, /\*\*\/\{target\[0\]\}-\{target\[1\]\}\/sbom\.cyclonedx\.json/);
  assert.match(workflow, /expected_targets = \{\("full", "amd64"\), \("full", "arm64"\), \("slim", "amd64"\), \("slim", "arm64"\)\}/);
  assert.match(workflow, /branches:\s*\r?\n\s*- "release\/\*\*"/);
  assert.match(workflow, /node scripts\/verify-immutable-inputs\.mjs[\s\S]+--as-of "\$\{as_of\}"/);
  assert.match(workflow, /source_sha/);
  assert.match(workflow, /actions\/workflows\/docker-publish\.yml\/runs/);
  assert.match(workflow, /version_tags/);
  assert.match(workflow, /mutable_tags/);
  assert.match(workflow, /name: Publish and verify immutable version tags/);
  assert.match(workflow, /Version tag already exists; verifying immutable content/);
  assert.match(workflow, /touch promotion\/rollback-required/);
  assert.match(workflow, /Rollback digest mismatch/);
  assert.match(workflow, /name: Move mutable aliases/);
  assert.match(workflow, /name: Roll back mutable aliases after failed final smoke/);
  assert.match(workflow, /grype db status/);
  assert.match(workflow, /retention-days: 90/);
  assert.match(workflow, /group: holyclaude-docker-release/);
  assert.match(workflow, /candidate-\$\{GITHUB_SHA\}-\$\{GITHUB_RUN_ID\}-\$\{GITHUB_RUN_ATTEMPT\}-\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}/);
  assert.match(workflow, /manifest unknown\|name unknown\|not found/i);
  assert.match(workflow, /Could not determine whether immutable tag exists/);
  assert.match(workflow, /tag_state=.*inspect_tag_state/);
  assert.match(workflow, /if \[\[ .*tag_state.* == exists \]\]; then/);
  assert.equal((workflow.match(/name: Download promotion evidence[\s\S]*?path: \./g) ?? []).length, 1);
  assert.match(
    workflow,
    /name: Upload promotion evidence[\s\S]*?security-evidence\/\*\*\/\*/,
  );
  assert.match(workflow, /name: Upload rollback evidence[\s\S]*?name: rollback-evidence[\s\S]*?promotion\/rollback\.tsv[\s\S]*?promotion\/rollback-required/);
  assert.match(workflow, /name: Download rollback evidence[\s\S]*?name: rollback-evidence[\s\S]*?path: promotion/);
  assert.doesNotMatch(workflow, /name: Download rollback evidence[\s\S]*?name: rollback-evidence[\s\S]*?path: \.\r?\n/);
  assert.match(browserRuntimeChecks, /capture_browser_snapshot "\$response" "\$SESSION_ID" "\$SENTINEL_TEXT"/);
  assert.match(browserSnapshotRetry, /for snapshot_attempt in 1 2; do/);
  assert.match(browserSnapshotRetry, /browser-snapshot-attempt-1\.json/);
  assert.match(browserSnapshotRetry, /browser-snapshot-attempt-\$\{snapshot_attempt\}\.stderr/);
  assert.match(browserSnapshotRetry, /validate_browser_snapshot_response/);
  assert.match(browserSnapshotRetry, /Browser MCP snapshot failed after 2 attempts/);
  assert.doesNotMatch(browserSnapshotRetry, /cp "\$SENTINEL_ROOT\/browser-snapshot-attempt-\$\{snapshot_attempt\}\.stderr"/);
  assert.equal((browserSnapshotRetry.match(/api_mcp browser_snapshot/g) ?? []).length, 1);
  assert.match(workflow, /name: Download rollback evidence[\s\S]*?continue-on-error: true/);
  assert.match(workflow, /Promotion succeeded but rollback evidence is missing/);
  assert.ok(
    workflow.indexOf('name: Upload rollback evidence') < workflow.indexOf('name: Move mutable aliases'),
    'rollback evidence must be durable before mutable aliases move',
  );
  assert.match(workflow, /needs\.promote\.result == 'cancelled'/);
  assert.match(workflow, /needs\.post-publish-smoke\.result == 'cancelled'/);
  assert.equal((workflow.match(/uses: actions\/upload-artifact@/g) ?? []).length, 4);
  assert.equal((workflow.match(/overwrite: true/g) ?? []).length, 4);
  assert.equal(
    (workflow.match(/uses: actions\/checkout@/g) ?? []).length,
    (workflow.match(/persist-credentials: false/g) ?? []).length,
  );
  assert.equal((workflow.match(/\$\{\{ inputs\.published_version \}\}/g) ?? []).length, 1);
  assert.match(workflow, /PUBLISHED_VERSION: \$\{\{ inputs\.published_version \}\}/);
  assert.match(workflow, /\[\[ ! "\$\{PUBLISHED_VERSION\}" =~ \^\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$ \]\]/);

  for (const match of workflow.matchAll(/^\s*uses:\s*[^@\s]+@([^\s#]+)/gm)) {
    assert.match(match[1], /^[0-9a-f]{40}$/, `Action ref should be a full SHA: ${match[0].trim()}`);
  }
});

test('release workflow binds validation and FFmpeg change detection to the exact v1.6.1 parent independently', () => {
  const expectedBaseline = 'baseline="183f2a913c7618e652aa23f2ba40d1f9e3b04f92"';
  const baselineAssignments = workflow.match(/^\s*baseline="[0-9a-f]{40}"\r?$/gm) ?? [];
  assert.equal(baselineAssignments.length, 2, 'workflow must contain exactly two release baseline assignments');

  const validationStart = workflow.indexOf('  validate-release-ref:');
  const validationEnd = workflow.indexOf('\n  build-candidate:', validationStart);
  assert.notEqual(validationStart, -1, 'validate-release-ref job must exist');
  assert.notEqual(validationEnd, -1, 'build-candidate job boundary must exist');
  assert.match(workflow.slice(validationStart, validationEnd), new RegExp(`^\\s*${expectedBaseline}\\r?$`, 'm'));

  const ffmpegStepName = '      - name: Verify FFmpeg artifacts from two empty-cache builds when inputs changed';
  const ffmpegStart = workflow.indexOf(ffmpegStepName);
  const ffmpegEnd = workflow.indexOf('\n      - name:', ffmpegStart + ffmpegStepName.length);
  assert.notEqual(ffmpegStart, -1, 'FFmpeg independent-rebuild step must exist');
  assert.notEqual(ffmpegEnd, -1, 'FFmpeg independent-rebuild step boundary must exist');
  assert.match(workflow.slice(ffmpegStart, ffmpegEnd), new RegExp(`^\\s*${expectedBaseline}\\r?$`, 'm'));
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
  assert.match(runtimeChecks, /vercel\/node_modules\/tar\/package\.json/);
  assert.match(runtimeChecks, /npm\/node_modules\/tar\/package\.json/);
  assert.match(runtimeChecks, /npm tar dependency/);
  assert.match(runtimeChecks, /npm --prefix \/usr\/local\/lib\/node_modules\/npm ls tar --all/);
  assert.match(runtimeChecks, /Node tar security overlay/);
  assert.match(runtimeChecks, /typeof require\(path\)\.list !== 'function'/);
  assert.match(runtimeChecks, /Vercel vc-native package version[\s\S]{0,320}"59\.23\.1"/);
  assert.match(runtimeChecks, /@vercel\/vc-native-linux-\$\{vercel_native_arch\}\/package\.json/);
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
    'Vercel smol-toml dependency',
    'Vercel container smol-toml dependency',
    'Vercel smol-toml package version',
    "require.resolve('smol-toml', { paths: [owner] })",
    'vercel_smol_toml=ok',
    'vercel_smol_toml_consumers=ok',
    'error instanceof TomlError',
    'netlify_sharp_png_transform=ok',
    'netlify_sharp_avif_decode=ok',
  ]) assert.ok(runtimeChecks.includes(expected), `runtime smoke should enforce security refresh contract ${expected}`);
  assert.match(runtimeChecks, /wrangler\/package\.json'\)\.devDependencies\.undici"\)" "7\.29\.0"/);
  assert.match(runtimeChecks, /Prisma mysql2 dependency[\s\S]{0,180}"3\.24\.4"/);
  assert.match(runtimeChecks, /Prisma mysql2 package version[\s\S]{0,180}"3\.24\.4"/);
  assert.match(runtimeChecks, /PM2 js-yaml dependency[\s\S]{0,180}"4\.3\.2"/);
  assert.match(runtimeChecks, /PM2 js-yaml package version[\s\S]{0,180}"4\.3\.2"/);
  assert.match(runtimeChecks, /Marp speech-rule-engine xmldom dependency[\s\S]{0,240}"0\.9\.12"/);
  assert.match(runtimeChecks, /Marp xmldom package version[\s\S]{0,240}"0\.9\.12"/);
  assert.match(runtimeChecks, /xmldom_require_well_formed=ok/);
  assert.match(runtimeChecks, /Wrangler Miniflare sharp dependency[\s\S]{0,180}"0\.35\.4"/);
  assert.match(runtimeChecks, /Wrangler sharp package version[\s\S]{0,180}"0\.35\.4"/);
  assert.match(runtimeChecks, /Wrangler sharp libvips version[\s\S]{0,180}"8\.18\.6"/);
  assert.match(runtimeChecks, /Wrangler sharp libheif version[\s\S]{0,180}"1\.23\.2"/);
  assert.match(runtimeChecks, /sharp_transform=ok/);
  assert.match(runtimeChecks, /Netlify CLI TOML dependency[\s\S]{0,180}"\^4\.0\.0"/);
  assert.match(runtimeChecks, /Netlify CLI TOML package version[\s\S]{0,180}"4\.3\.0"/);
  assert.match(runtimeChecks, /Netlify CLI cron-parser package version[\s\S]{0,180}"5\.10\.1"/);
  assert.match(runtimeChecks, /Netlify CLI raw-body package version[\s\S]{0,180}"4\.0\.0"/);
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

test('release OpenVEX identity uses the v1.6.2 review date', () => {
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  assert.equal(vex['@id'], 'urn:holyclaude:openvex:v1.6.2');
  assert.equal(vex.timestamp, '2026-09-18T00:00:00Z');
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
  assert.match(immutableInputs, /name: Full-image nanoid nested package[\s\S]*version: 3\.3\.19[\s\S]*archive-sha256: 4e371b71e3d5081fa0052356d5c1904e7a60e049864c26f0724cfd32dc303849[\s\S]*npm-integrity: "sha512-Y2tUNy4ouw6tq5oDSKeQYGOyhkUBhNOcGV\/02KC\+6kd9eDGqdZd\+\+mjMiIDilrBYvjEnCYvVtsuHCuP\+okSfug=="/);
  assert.match(immutableInputs, /name: Full-image js-yaml nested package[\s\S]*version: 4\.3\.2[\s\S]*archive-sha256: c7b241d2224cf9253ff53854aa4cee87da91bd889c4d0fa3a3ffd1041ecee5b1[\s\S]*npm-integrity: "sha512-SFNOvSJ\+Dgf\/9An904Yx\+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3\/TP3O\+wzWuiTFl4sqbltzA=="/);
  assert.match(immutableInputs, /name: CloudCLI js-yaml nested package[\s\S]*version: 3\.15\.2[\s\S]*archive-sha256: 7f005cf0b8ee639b4557e0e321dc067c1f2aa0a442d096e03f2ab53353738794[\s\S]*npm-integrity: "sha512-6EuL879VkRA\+1Cz578mKMiKvjPNEuk6\+r1JaFzoSWejZmtf7xWbIyw1e3KkxlkzTIt9Taw6JBhEppG7utc1P\+w=="/);
  assert.match(immutableInputs, /name: Vercel smol-toml nested package[\s\S]*version: 1\.8\.0[\s\S]*archive-sha256: 1fc995be91cdb777fc13e20c2edfebaaf60ef4e4d2d5331caef2837b04d37892[\s\S]*npm-integrity: "sha512-kCZr2V3ch9i00x8zXRhjUNVcjG9ijES5dDudkXvUVCT5QlJNQWElSJdZqyPemffHoLNUYwOcou0Fy\+ojN0uHSQ=="/);
  assert.match(immutableInputs, /name: Full-image xmldom nested package[\s\S]*version: 0\.9\.12[\s\S]*archive-sha256: 08245e18c248b957b4c6e07f8549ad5f55ae11b7a8abd4c1113a0fd61ddc67ee[\s\S]*npm-integrity: "sha512-5AXjrcMClTryPe9LgZrygpB1lj7s0S9E0\+W\+AHaVKAVyHanafK86iPSvG5xHVSp\/jC\+VH1UXu0TAEmY279xH7A=="/);
  assert.match(immutableInputs, /name: Wrangler sharp nested package[\s\S]*version: 0\.35\.4[\s\S]*archive-sha256: 6ebef10290372c7309d9e22e3ecb9e32ca6a3aa6e07f3d83aa904df8ae4f6a5a/);
  assert.match(immutableInputs, /name: Wrangler sharp Linux x64 payload[\s\S]*version: 0\.35\.4[\s\S]*archive-sha256: 9fe2de0bf57643eb603f16d5ed237dceb1c1229ea76f5094aacab1e99162bf3b/);
  assert.match(immutableInputs, /name: Wrangler sharp Linux arm64 payload[\s\S]*version: 0\.35\.4[\s\S]*archive-sha256: 556157e2f5de993f0b022d2cce22fd8248daeb95610c37d5a7cb7cca41d5d467/);
  assert.match(immutableInputs, /name: Wrangler sharp libvips Linux x64 payload[\s\S]*version: 1\.3\.3[\s\S]*archive-sha256: 74b6fa0abb2e41a163853a00e2f247188df5ec1e25bf62c4c5a041f2042a1f6a/);
  assert.match(immutableInputs, /name: Wrangler sharp libvips Linux arm64 payload[\s\S]*version: 1\.3\.3[\s\S]*archive-sha256: b56f6488e113c385a463fd3be8134b043a17114228f544701fc9c040227e4a59/);
  assert.match(immutableInputs, /name: Netlify sharp nested package[\s\S]*version: 0\.35\.4[\s\S]*archive-sha256: 6ebef10290372c7309d9e22e3ecb9e32ca6a3aa6e07f3d83aa904df8ae4f6a5a/);
});

test('CloudCLI runtime dependency expectations match the reproduced artifact manifest', () => {
  const block = browserRuntimeChecks.match(/for \(const \[dependency, version\] of Object\.entries\(\{([\s\S]*?)\}\)\)/);
  assert.ok(block, 'CloudCLI runtime dependency assertions must exist');
  const expected = Object.fromEntries([...block[1].matchAll(/['"]?([\w-]+)['"]?:\s*'([^']+)'/g)].map((match) => [match[1], match[2]]));
  const overlays = { 'fast-uri': '3.1.7', nanoid: '3.3.19' };
  for (const [path, version] of Object.entries(cloudcliManifest.verification.requiredRuntimeDependencies)) {
    const dependency = path.replace(/^node_modules\//, '');
    assert.equal(expected[dependency], overlays[dependency] ?? version, path);
  }
});

test('Azure CLI uses its compatible bundled cryptography and runtime probes', () => {
  assert.doesNotMatch(dockerfile, /AS cryptography-security-builder/);
  assert.doesNotMatch(dockerfile, /cryptography_security_backport_smoke\.py/);
  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.90\.0-1~bookworm/);
  assert.match(dockerfile, /test "\$\(\/opt\/az\/bin\/python3 --version\)" = "Python 3\.14\.6"/);
  assert.match(dockerfile, /import cryptography; print\(cryptography\.__version__\).*48\.0\.1/);
  assert.match(dockerfile, /\/opt\/az\/bin\/python3 -m pip check/);
  assert.match(browserRuntimeChecks, /Azure CLI bundled cryptography/);
  assert.match(browserRuntimeChecks, /az config get core\.collect_telemetry/);
});
