import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const dockerIgnore = readFileSync('.dockerignore', 'utf8');
const gitAttributes = readFileSync('.gitattributes', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const browserRuntimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const browserSnapshotRetry = readFileSync('tests/browser_snapshot_retry.sh', 'utf8');
const cloudcliManifest = JSON.parse(readFileSync('vendor/artifacts/cloudcli-account-management.manifest.json', 'utf8'));
const advisoryReviews = readFileSync('security/advisory-reviews.json', 'utf8');
const webTerminalLock = JSON.parse(
  readFileSync('vendor/locks/cloudcli-web-terminal-8aa41f614c216d961e7c0d9c3e67982c6b2d9da3.package-lock.json', 'utf8'),
);

test('Docker context includes only the cryptography smoke required by the image build', () => {
  assert.match(dockerIgnore, /^tests\/$/m);
  assert.match(dockerIgnore, /^!tests\/cryptography_security_backport_smoke\.py$/m);
  assert.equal((dockerIgnore.match(/^!tests\//gm) ?? []).length, 1);
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
  assert.match(dockerfile, /^FROM golang:1\.26\.5-bookworm@sha256:[0-9a-f]{64} AS esbuild-builder$/m);
  assert.match(dockerfile, /^FROM node:26\.7\.0-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341$/m);
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
  assert.match(dockerfile, /ARG FZF_VERSION=0\.74\.1/);
  assert.match(dockerfile, /ARG FZF_ARCHIVE_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /fzf_\$\{FZF_VERSION\}_checksums\.txt/);
  assert.match(dockerfile, /test "\$\(grep -F "  \$\{FZF_ASSET\}" \/tmp\/fzf-checksums\.txt \| cut -d' ' -f1\)" = "\$FZF_ARCHIVE_SHA256"/);
  assert.match(dockerfile, /echo "\$FZF_ARCHIVE_SHA256  \/tmp\/\$\{FZF_ASSET\}" \| sha256sum -c -/);
  assert.doesNotMatch(dockerfile, /tmux fzf bat bubblewrap/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=151\.0\.7922\.108-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_AMD64=739f6bccad739686bdfef6554e5e47860e0db7c2feba12a872f112fc1be28bfc/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_ARM64=e53e8dd2bc749924e077a74ac81e6417bdcbbd5c4e09a5deb458104ddb34d37b/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_AMD64=fdd4bf2650ce78eec74f3926c01cbcb4b8312d24691ebf5fadfd8408e8f5675b/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_ARM64=b9e304cd2612c33bdc04c7edb33c5574b5cb06a35d2159714d42fe04b3c843c8/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64=09a74c710900e19fda7c510486dfa1b7fd52d16c095e40585aeacd3e8a0de0f1/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64=f9dd0a0f27b0a6e7da50459c212f011c09f89d5d5bab461d4aa5adb3328bcc0b/);
  assert.match(dockerfile, /apt-get download[\s\S]+chromium-common[\s\S]+chromium-sandbox/);
  assert.match(dockerfile, /\| sha256sum -c -/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.doesNotMatch(dockerfile, /playwright install/);
  assert.match(immutableInputs, /Debian Chromium package trio[\s\S]+version: 151\.0\.7922\.108-1~deb12u1/);
  for (const field of [
    'amd64-chromium-package-sha256',
    'arm64-chromium-package-sha256',
    'amd64-chromium-common-package-sha256',
    'arm64-chromium-common-package-sha256',
    'amd64-chromium-sandbox-package-sha256',
    'arm64-chromium-sandbox-package-sha256',
  ]) {
    assert.match(immutableInputs, new RegExp(`${field}: [0-9a-f]{64}`));
  }

  const architectureSelectors = dockerfile
    .split(/\r?\n/)
    .filter((line) => line.includes('case "$TARGETARCH"'));
  assert.ok(architectureSelectors.length > 0);
  for (const line of architectureSelectors) {
    assert.match(line, /amd64\)/);
    assert.match(line, /arm64\)/);
    assert.match(line, /\*\).*Unsupported TARGETARCH.*exit 1/);
  }
});

test('native installers and their outputs are pinned without unsupported flags', () => {
  assert.match(dockerfile, /ARG CLAUDE_CODE_VERSION=2\.1\.220/);
  assert.match(dockerfile, /CLAUDE_INSTALLER_SHA256=cde4f1702d3b1695f92b73d26888364e17bca476e17f0fd676484c951d36c125/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_AMD64=674f61f20ff306f3100cf9200e4c36c4b70278b5bef2884549819b942a89c863/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_ARM64=159e4a51d796f3bf14677577100f7efb845611b1ceaf0c30cbd8d4650d942185/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
  assert.match(dockerfile, /\/home\/claude\/\.local\/bin\/claude --version/);

  assert.match(dockerfile, /ARG JUNIE_VERSION=2470\.4/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_AMD64=661dba7d55e097ae0eb62ff2475b4e9fe7a59d8e25560d8c1981aad85901b60c/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_ARM64=976c6f974598bb34197f434dd041cfbb1cd663d95702ee3260bcb07815a0f630/);
  assert.match(dockerfile, /unzip -Z1 "\/tmp\/\$\{JUNIE_ARCHIVE\}"/);
  assert.match(dockerfile, /test "\$JUNIE_TOP_LEVEL" = "channel junie junie-app shim "/);
  assert.match(dockerfile, /unzip -q "\/tmp\/\$\{JUNIE_ARCHIVE\}" 'junie-app\/\*' -d "\$JUNIE_STAGING"/);
  assert.match(dockerfile, /test -x "\$JUNIE_STAGING\/junie-app\/bin\/junie"/);
  assert.doesNotMatch(dockerfile, /junie\.jetbrains\.com\/install\.sh/);

  assert.match(dockerfile, /ARG CURSOR_BUILD_ID=2026\.07\.23-e383d2b/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_AMD64=702ad595213bee5df0268be9f80a19f29fcceaa2a42fc55e39f2b5199051f0c4/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_ARM64=f40b99647cb24e0da885e97620a2048034f1fe8961910d573d827d77c4d26dcb/);
  assert.match(dockerfile, /downloads\.cursor\.com\/lab\/\$\{CURSOR_BUILD_ID\}\/linux\/\$\{CURSOR_ASSET_ARCH\}\/agent-cli-package\.tar\.gz/);
  assert.match(dockerfile, /tar --strip-components=1 -xzf \/tmp\/cursor-agent\.tar\.gz -C "\$CURSOR_DIR"/);
  assert.doesNotMatch(dockerfile, /cursor\.com\/install/);
  assert.match(dockerfile, /CURSOR_LAUNCHER_SHA256=eed61c5224668c9236334c4c68936a16aecc37374b592f59e31eb50433817831/);
  assert.match(dockerfile, /CURSOR_NODE_SHA256_AMD64=e0e46d3a1c0667117303412647cafcbcefb1be7612493015ec8fd6b7440162a4/);
  assert.match(dockerfile, /CURSOR_NODE_SHA256_ARM64=47befb5f57df96771ce343d6293349ecf4d46c91110b626423ec3a49d2fee7c1/);
  assert.match(dockerfile, /! grep -aFq -- '--permission'/);
  assert.match(dockerfile, /! grep -aFq -- '--allow-fs-read'/);
  assert.match(dockerfile, /! grep -aFq -- '--allow-fs-write'/);
  assert.doesNotMatch(dockerfile, /CURSOR_VERSION=/);
  assert.match(dockerfile, /test "\$\(cursor-agent --version\)" = "\$CURSOR_BUILD_ID"/);
  assert.match(dockerfile, /rm -f "\$CURSOR_DIR\/node"/);
  assert.match(dockerfile, /ln -s \/usr\/local\/bin\/node "\$CURSOR_DIR\/node"/);
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.7\.0"/);
  assert.match(dockerfile, /SETUPTOOLS_VERSION=83\.0\.0/);
  assert.match(dockerfile, /SETUPTOOLS_WHEEL_SHA256=29b23c360f22f414dc7336bb39178cc7bcbf6021ed2733cde173f09dba19abb3/);
  assert.match(dockerfile, /patch-global-node-security-dependencies\.mjs --root \/ --variant "\$VARIANT" --check-baseline/);

  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.88\.0-1~bookworm/);
  assert.match(dockerfile, /AZURE_CLI_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /sed -i[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /grep -Fqx[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /ARG GITHUB_CLI_VERSION=2\.97\.0/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_AMD64=[0-9a-f]{64}/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_ARM64=[0-9a-f]{64}/);
  assert.match(dockerfile, /github\.com\/cli\/cli\/releases\/download\/v\$\{GITHUB_CLI_VERSION\}/);
});

test('immutable input inventory binds the release-critical inputs', () => {
  assert.match(immutableInputs, /^release: v1\.5\.7$/m);
  assert.match(immutableInputs, /^expires-at: 2026-09-09$/m);
  for (const value of [
    'sha256:53eeac89074db483fdf0ab3be1df32bf6e47562263d2d0d6baa7f26acb4957dd',
    'sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341',
    'sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
    'bf7b29ff57f06da30918266a0e1c2885a8f99784798d1bdb1628886aa015d788',
    '887c57cbcc2d0e8c5c110a4571a3fc7150058b24d74f993ee4663516e5c8ce86',
    '0122df7b655981abe547ad3d2190d65551dac6a2bfc80b4dc2a989b5d0587458',
    'a8d7504a149629324eb5f4ce3dc25dfd211bbfe047e64ee2bf7844b466c3d84d',
    'dbcb813823bdd20940b903addbd779551569679f',
    '4895cd3fd33362471e739b786493aba048487bcc',
    '8aa41f614c216d961e7c0d9c3e67982c6b2d9da3',
    'b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6',
    '674f61f20ff306f3100cf9200e4c36c4b70278b5bef2884549819b942a89c863',
    '159e4a51d796f3bf14677577100f7efb845611b1ceaf0c30cbd8d4650d942185',
    '661dba7d55e097ae0eb62ff2475b4e9fe7a59d8e25560d8c1981aad85901b60c',
    '976c6f974598bb34197f434dd041cfbb1cd663d95702ee3260bcb07815a0f630',
    '702ad595213bee5df0268be9f80a19f29fcceaa2a42fc55e39f2b5199051f0c4',
    'f40b99647cb24e0da885e97620a2048034f1fe8961910d573d827d77c4d26dcb',
    cloudcliManifest.artifact.sha256,
  ]) {
    assert.ok(immutableInputs.includes(value), `immutable input inventory should contain ${value}`);
  }
});

test('compatible package updates and plugin locks are exact', () => {
  for (const expected of [
    'npm@11.19.0',
    'pnpm@11.21.0',
    'vite@8.2.1',
    'prettier@3.9.6',
    'eslint@10.8.1',
    'concurrently@10.0.4',
    'wrangler@4.116.0',
    'vercel@54.21.1',
    'prisma@7.9.1',
    'lighthouse@13.4.1',
    '@marp-team/marp-cli@4.5.0',
    '@google/gemini-cli@0.53.0',
    '@openai/codex@0.151.0',
    'opencode-ai@1.18.10',
    '@earendil-works/pi-coding-agent@0.82.1',
    'pandas==3.0.5',
    'tqdm==4.70.0',
    'matplotlib==3.11.1',
    'fastapi==0.141.1',
    'uvicorn==0.52.0',
    'tree-sitter-language-pack==1.6.2',
    'CLOUDCLI_VERSION=1.36.3',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should contain ${expected}`);
  }
  assert.match(dockerfile, /markdown==3\.10\.3/);
  assert.doesNotMatch(dockerfile, /pdfkit/);

  assert.match(dockerfile, /cloudcli-plugin-starter[\s\S]+npm ci && npm run build/);
  assert.match(dockerfile, /cloudcli-plugin-terminal[\s\S]+web-terminal-package-lock\.json package-lock\.json[\s\S]+npm ci && npm run build/);
  assert.match(gitAttributes, /^vendor\/locks\/\*\.json text eol=lf$/m);
  assert.equal(webTerminalLock.lockfileVersion, 3);
  assert.equal(webTerminalLock.packages[''].name, 'cloudcli-plugin-terminal');
  assert.match(dockerfile, /ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=[0-9a-f]{64}/);
  assert.match(
    dockerfile,
    /echo "\$CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256  \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz" \| sha256sum -c -[\s\S]+npm ci --omit=dev[\s\S]+chmod 0755 "\$CLOUDCLI_ROOT\/dist-server\/server\/cli\.js"[\s\S]+ln -s "\$CLOUDCLI_ROOT\/dist-server\/server\/cli\.js" \/usr\/local\/bin\/cloudcli/,
  );
  assert.doesNotMatch(dockerfile, /npm@12\./, 'npm 12 rejects the committed CloudCLI npm-shrinkwrap runtime install');
  for (const expected of [
    'nanoid 3.3.17 fd821dc3644ff456a61cd8ac67f3741f939d9ce2fb4cbb9c6b3e6c8111285ef6',
    'ip-address 10.3.1 ad1790063beea11a312c801df30d58e147de762f4f77787552376eb7424623e5',
    'fast-uri 3.1.5 82a71e7e3716dc8c392cac0762bce80614cf539ef22000415e26eaf5c453ce2f',
    'js-yaml 3.15.1 df86a37e0f5aa855ae32098dcc1d4c5712e43ea515d69fa3e6d51b8f5901c86e',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should bind secure nested package ${expected}`);
  }
  for (const expected of [
    'ARG UNDICI_7_VERSION=7.29.0', 'ARG UNDICI_7_ARCHIVE_SHA256=ec2005d822734765fc08c3ee5d50b1f720bf1c3fc6235ab028e5cc61c85a3a70',
    'ARG UNDICI_8_VERSION=8.9.0', 'ARG UNDICI_8_ARCHIVE_SHA256=f554abb3e9352e04bc325208066a25c229163d8408bb1d5161db3d793445d69c',
    'ARG FULL_NANOID_VERSION=3.3.17', 'ARG FULL_NANOID_ARCHIVE_SHA256=fd821dc3644ff456a61cd8ac67f3741f939d9ce2fb4cbb9c6b3e6c8111285ef6',
    'ARG FULL_JS_YAML_VERSION=4.3.1', 'ARG FULL_JS_YAML_ARCHIVE_SHA256=08d6282b77a3e7242061f6dd5516c019b25c53041ad267bca3b790d79ddd5f34',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);
  for (const expected of [
    'npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all',
    'npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all',
    'wrangler --version',
    'pi --version',
    'PM2_HOME=/tmp/holyclaude-build-pm2 pm2 --version',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should exercise ${expected}`);
  assert.match(dockerfile, /NETLIFY_PROXY_ROOT=.*local-functions-proxy-linux-\$\{NETLIFY_PROXY_ARCH\}/);
  assert.match(dockerfile, /test -x "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /rm -f "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /test ! -e "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /ARG NODE_TAR_VERSION=7\.5\.22/);
  assert.match(dockerfile, /ARG NODE_TAR_SHA256=b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6/);
  assert.match(dockerfile, /registry\.npmjs\.org\/tar\/-\/tar-\$\{NODE_TAR_VERSION\}\.tgz/);
  assert.match(dockerfile, /echo "\$NODE_TAR_SHA256  \/tmp\/node-tar\.tgz" \| sha256sum -c -/);
  assert.match(dockerfile, /patch-global-node-tar\.mjs --root \/ --check-baseline/);
  assert.match(dockerfile, /node \/tmp\/patch-global-node-tar\.mjs --root \//);
  assert.match(dockerfile, /typeof require\(path\)\.list !== 'function'/);
});

test('release workflow keeps manifests clean and emits digest-bound security evidence', () => {
  assert.match(workflow, /^run-name: v1\.5\.7$/m);
  assert.match(workflow, /default: "1\.5\.7"/);
  assert.match(workflow, /baseline="b2c7185ffb44bfa1a0b6c7fd9baed44e1ffe5e1c"/);
  assert.match(workflow, /grep -Eq "\^## \\\[\$\{release#v\}\\\] - \[0-9\]\{2\}\/\[0-9\]\{2\}\/\[0-9\]\{4\}\$"/);
  assert.match(workflow, /git cat-file -p HEAD \| grep -c '\^parent '/);
  assert.match(workflow, /git rev-parse 'v1\.5\.6\^\{commit\}'\)" = "b2c7185ffb44bfa1a0b6c7fd9baed44e1ffe5e1c"/);
  assert.match(workflow, /SYFT_VERSION: 1\.50\.0/);
  assert.match(workflow, /GRYPE_VERSION: 0\.116\.1/);
  assert.match(workflow, /SYFT_SHA256_AMD64: bf7b29ff57f06da30918266a0e1c2885a8f99784798d1bdb1628886aa015d788/);
  assert.match(workflow, /SYFT_SHA256_ARM64: 887c57cbcc2d0e8c5c110a4571a3fc7150058b24d74f993ee4663516e5c8ce86/);
  assert.match(workflow, /GRYPE_SHA256_AMD64: 0122df7b655981abe547ad3d2190d65551dac6a2bfc80b4dc2a989b5d0587458/);
  assert.match(workflow, /GRYPE_SHA256_ARM64: a8d7504a149629324eb5f4ce3dc25dfd211bbfe047e64ee2bf7844b466c3d84d/);
  assert.match(workflow, /SBOM_UTILITY_VERSION: 0\.19\.2/);
  assert.match(workflow, /git diff --check HEAD\^ HEAD/);
  assert.match(workflow, /rhysd\/actionlint@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667/);
  assert.equal((workflow.match(/docker\/login-action@dbcb813823bdd20940b903addbd779551569679f # v4\.6\.0/g) ?? []).length, 8);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\^\)" = "\$\{baseline\}"/);
  assert.match(workflow, /test "\$\(git rev-parse origin\/master\)" = "\$\{GITHUB_SHA\}"/);
  assert.match(workflow, /sbom: false/);
  assert.match(workflow, /provenance: false/);
  assert.match(workflow, /cyclonedx-json=/);
  assert.match(workflow, /spdx-json=/);
  assert.match(workflow, /name: Provision full-image scanner swap[\s\S]+if: matrix\.variant == 'full'[\s\S]+swap_file=\/holyclaude-scanner\.swap[\s\S]+fallocate -l 16G "\$\{swap_file\}"[\s\S]+swapon "\$\{swap_file\}"/);
  assert.match(workflow, /GOGC: "50"/);
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
  assert.match(runtimeChecks, /Node tar security overlay/);
  assert.match(runtimeChecks, /typeof require\(path\)\.list !== 'function'/);
  for (const expected of [
    'npm --prefix /usr/local/lib/node_modules/wrangler ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/@earendil-works/pi-coding-agent ls undici --all',
    'npm --prefix /usr/local/lib/node_modules/eas-cli ls nanoid --all',
    'npm --prefix /usr/local/lib/node_modules/pm2 ls js-yaml --all',
    'wrangler --version',
    'pi --version',
    'PM2_HOME="$SENTINEL_ROOT/pm2" pm2 --version',
  ]) assert.ok(runtimeChecks.includes(expected), `runtime smoke should exercise ${expected}`);
  assert.match(runtimeChecks, /wrangler\/package\.json'\)\.devDependencies\.undici"\)" "7\.29\.0"/);
  assert.match(runtimeChecks, /libssh-gcrypt-4 package version/);
  assert.match(runtimeChecks, /! dpkg-query -W libssh-gcrypt-4/);
});

test('plugin reproducibility compares dependency trees and built files', () => {
  const pluginSmoke = readFileSync('tests/plugin_reproducibility_smoke.sh', 'utf8');
  assert.match(pluginSmoke, /npm ls --all --omit=dev --json/);
  assert.match(pluginSmoke, /find \. -type f -print0 \| sort -z \| xargs -0 sha256sum/);
  assert.match(pluginSmoke, /build-output=/);
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
  assert.equal(review.expiresAt, '2026-08-14');
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

test('release OpenVEX identity uses the v1.5.7 publication date', () => {
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  assert.equal(vex['@id'], 'urn:holyclaude:openvex:v1.5.7');
  assert.equal(vex.timestamp, '2026-08-12T00:00:00Z');
});

test('removed Netlify proxy findings cannot be carried as risk exceptions', () => {
  const reviews = JSON.parse(advisoryReviews).reviews;
  assert.equal(
    reviews.some((item) => item.component.locationPatterns.some((pattern) => pattern.includes('local-functions-proxy'))),
    false,
  );
});

test('Netlify image-size receives checksum-bound progress guards', () => {
  const patcher = readFileSync('scripts/patch-netlify-image-size.mjs', 'utf8');
  const patchSha256 = createHash('sha256').update(patcher).digest('hex');
  assert.match(dockerfile, /patch-netlify-image-size\.mjs/);
  assert.match(patcher, /image-size@2\.0\.2/);
  assert.match(patcher, /imageHeader\[1\] > 0 \? imageHeader\[1\] : 8/);
  assert.match(patcher, /baselineCount === 12/);
  assert.match(patcher, /0f6a6665a166c530ba126a8ab8608a0603cb49dc/);
  assert.match(immutableInputs, new RegExp(`patch-sha256: ${patchSha256}`));
  assert.match(patcher, /ispeBox\.size > 0 \? ispeBox\.size : 8/);
  assert.match(patcher, /jxlpBox\.size > 0 \? jxlpBox\.size : 8/);
  assert.match(browserRuntimeChecks, /image-size malformed ICNS=bounded/);
  assert.match(browserRuntimeChecks, /image-size malformed HEIF=bounded/);
  assert.match(browserRuntimeChecks, /image-size malformed JXL=bounded/);
  assert.match(gitAttributes, /^scripts\/patch-netlify-image-size\.mjs text eol=lf$/m);
});

test('FFmpeg security backport is isolated and runtime-probed', () => {
  assert.match(dockerfile, /AS ffmpeg-security-builder/);
  assert.match(dockerfile, /AS ffmpeg-security-builder\nENV DEBIAN_FRONTEND=noninteractive/);
  assert.match(dockerfile, /AS ffmpeg-security-builder[\s\S]*ARG VARIANT[\s\S]*if \[ "\$VARIANT" = "full" \]; then/);
  assert.match(dockerfile, /mkdir -p \/out\/ffmpeg-security-backport/);
  assert.match(dockerfile, /build-ffmpeg-security-backport\.sh/);
  assert.match(dockerfile, /COPY --from=ffmpeg-security-builder \/out\/ffmpeg-security-backport/);
  assert.match(dockerfile, /FFMPEG_BACKPORT_VERSION=7:5\.1\.9-0\+deb12u1\+holyclaude1/);
  assert.match(browserRuntimeChecks, /ffmpeg -version/);
  assert.match(browserRuntimeChecks, /ffprobe -version/);
  assert.match(browserRuntimeChecks, /\$2 == "cfhd"/);
  assert.match(browserRuntimeChecks, /\$2 == "dvbsub"/);
  assert.match(browserRuntimeChecks, /ffmpeg-smoke\.mkv/);
  assert.doesNotMatch(advisoryReviews, /"7:5\.1\.9-0\+deb12u1"/);
  assert.match(advisoryReviews, /"id": "v155-ffmpeg-high-exception"[\s\S]{0,1200}"7:5\.1\.9-0\+deb12u1\+holyclaude1"/);
});

test('Azure cryptography backport is isolated and runtime-probed', () => {
  const builder = readFileSync('scripts/build-cryptography-security-backport.sh');
  const builderSha256 = createHash('sha256').update(builder).digest('hex');
  const buildRequirements = readFileSync('security/cryptography-security-build-requirements.txt');
  const buildRequirementsSha256 = createHash('sha256').update(buildRequirements).digest('hex');

  assert.match(dockerfile, /FROM rust:1\.88-bookworm@sha256:af306cfa71d987911a781c37b59d7d67d934f49684058f96cf72079c3626bfe0 AS cryptography-rust-toolchain/);
  assert.match(gitAttributes, /^security\/cryptography-security-build-requirements\.txt text eol=lf$/m);
  assert.match(dockerfile, /AS cryptography-security-builder/);
  assert.match(dockerfile, /COPY --from=cryptography-rust-toolchain \/usr\/local\/cargo \/usr\/local\/cargo/);
  assert.match(dockerfile, /COPY --from=cryptography-rust-toolchain \/usr\/local\/rustup \/usr\/local\/rustup/);
  assert.match(dockerfile, /AS cryptography-security-builder[\s\S]*ARG VARIANT[\s\S]*if \[ "\$VARIANT" = "full" \]; then/);
  assert.match(dockerfile, /patchelf=0\.14\.3-1\+b1/);
  assert.match(dockerfile, /--only-binary=:all: --require-hashes -r \/tmp\/cryptography-security-build-requirements\.txt/);
  assert.match(dockerfile, /rustc 1\.88\.0 \(6b00bc388 2025-06-23\)/);
  assert.match(dockerfile, /cargo 1\.88\.0 \(873a06493 2025-05-10\)/);
  assert.match(dockerfile, /cryptography-46\.0\.7\+holyclaude\.1-\*\.whl/);
  assert.match(dockerfile, /\/opt\/az\/bin\/python3 -m pip check/);
  assert.match(dockerfile, /cryptography_security_backport_smoke\.py/);
  assert.match(browserRuntimeChecks, /Azure cryptography backport/);
  assert.match(browserRuntimeChecks, /az config get core\.collect_telemetry/);
  assert.match(immutableInputs, /Rust cryptography toolchain[\s\S]{0,200}sha256:af306cfa71d987911a781c37b59d7d67d934f49684058f96cf72079c3626bfe0/);
  assert.match(immutableInputs, new RegExp(`Azure cryptography source[\\s\\S]{0,400}builder-sha256: ${builderSha256}`));
  assert.match(immutableInputs, new RegExp(`Azure cryptography build requirements[\\s\\S]{0,300}requirements-sha256: ${buildRequirementsSha256}`));
  assert.match(advisoryReviews, /"id": "v157-azure-cryptography-x509-downstream-backport"[\s\S]{0,800}"46\.0\.7\+holyclaude\.1"/);
  assert.match(advisoryReviews, /"id": "v157-azure-cryptography-pkcs7-downstream-backport"[\s\S]{0,800}"46\.0\.7\+holyclaude\.1"/);
});
