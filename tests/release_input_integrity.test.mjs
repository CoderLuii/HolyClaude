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
  assert.match(dockerfile, /^FROM golang:1\.27\.0-bookworm@sha256:[0-9a-f]{64} AS esbuild-builder$/m);
  assert.match(dockerfile, /^FROM node:26\.8\.1-bookworm-slim@sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e AS ffmpeg-security-builder$/m);
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
  assert.match(dockerfile, /ARG FZF_VERSION=0\.74\.3/);
  assert.match(dockerfile, /ARG FZF_ARCHIVE_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /fzf_\$\{FZF_VERSION\}_checksums\.txt/);
  assert.match(dockerfile, /test "\$\(grep -F "  \$\{FZF_ASSET\}" \/tmp\/fzf-checksums\.txt \| cut -d' ' -f1\)" = "\$FZF_ARCHIVE_SHA256"/);
  assert.match(dockerfile, /echo "\$FZF_ARCHIVE_SHA256  \/tmp\/\$\{FZF_ASSET\}" \| sha256sum -c -/);
  assert.doesNotMatch(dockerfile, /tmux fzf bat bubblewrap/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=151\.0\.7922\.173-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_AMD64=3c8f1f513675d8785925e67a6858407fd5461e4b1903463d127ea6e651a649de/);
  assert.match(dockerfile, /ARG CHROMIUM_PACKAGE_SHA256_ARM64=8a7f778630287297b1217414d4cd53b9638046ce48f13c2e2994fb5afee012a2/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_AMD64=560f6d013d1c733d4a84e27209d80235968f3672745c27f6ecd2947ac6c12bd8/);
  assert.match(dockerfile, /ARG CHROMIUM_COMMON_PACKAGE_SHA256_ARM64=f0deb575d2486b1d72e4a28c4ea2c3dc0e5abed21c23aa236fdb96a1fa007b3b/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_AMD64=21d610b5b25e74796350e6d7420acf51917641b7a8f1603a16f9b212b84c3af2/);
  assert.match(dockerfile, /ARG CHROMIUM_SANDBOX_PACKAGE_SHA256_ARM64=5266f3e47219fbed422bd885e05e7c5fc1252203b5112db64d15a986e9293790/);
  assert.match(dockerfile, /apt-get download[\s\S]+chromium-common[\s\S]+chromium-sandbox/);
  assert.match(dockerfile, /\| sha256sum -c -/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.doesNotMatch(dockerfile, /playwright install/);
  assert.match(immutableInputs, /Debian Chromium package trio[\s\S]+version: 151\.0\.7922\.173-1~deb12u1/);
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
  assert.match(dockerfile, /ARG CLAUDE_CODE_VERSION=2\.1\.258/);
  assert.match(dockerfile, /CLAUDE_INSTALLER_SHA256=3a68d3406cf674e17bed1733a4dcf37805e2e47d87417700007d7e1aa766a944/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_AMD64=704f1334ac65d3e89e1c6c1d7663293ad786a6166afdb71b5075337df630f976/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_ARM64=43dc490af55262edcb3e9b1cb315de22cc09ccb08bd52a4c39bc5eabaa63100f/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
  assert.match(dockerfile, /\/home\/claude\/\.local\/bin\/claude --version/);

  assert.match(dockerfile, /ARG JUNIE_VERSION=3126\.1/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_AMD64=34d8b11dea9f529e42da1b62df673de4ca646fe4ae8d5234a4e271d395b111dd/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_ARM64=4354392ec33218a66a249cac5cfb988ac31b06f6def2722d3e1277ede95649c5/);
  assert.match(dockerfile, /unzip -Z1 "\/tmp\/\$\{JUNIE_ARCHIVE\}"/);
  assert.match(dockerfile, /test "\$JUNIE_TOP_LEVEL" = "channel junie junie-app shim "/);
  assert.match(dockerfile, /unzip -q "\/tmp\/\$\{JUNIE_ARCHIVE\}" 'junie-app\/\*' -d "\$JUNIE_STAGING"/);
  assert.match(dockerfile, /test -x "\$JUNIE_STAGING\/junie-app\/bin\/junie"/);
  assert.doesNotMatch(dockerfile, /junie\.jetbrains\.com\/install\.sh/);

  assert.match(dockerfile, /ARG CURSOR_BUILD_ID=2026\.08\.31-4057e58/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_AMD64=7e306db5750219a99c00ed517fe8b235d3c54e4ca5f77e2ff160cc97ce707798/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_ARM64=cf5db6b5047b3280d8a49471cfd41beb1d5e475774177df5df2851857ab6514a/);
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
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.8\.1"/);
  assert.match(dockerfile, /SETUPTOOLS_VERSION=84\.0\.0/);
  assert.match(dockerfile, /SETUPTOOLS_WHEEL_SHA256=51a52592b3b99e102b609654876bd65f19f999935166d1352678931132b0c670/);
  assert.match(dockerfile, /patch-global-node-security-dependencies\.mjs --root \/ --variant "\$VARIANT" --check-baseline/);

  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.90\.0-1~bookworm/);
  assert.match(dockerfile, /AZURE_CLI_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /sed -i[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /grep -Fqx[^\n]+azure-cli=\$AZURE_CLI_VERSION/);
  assert.match(dockerfile, /ARG GITHUB_CLI_VERSION=2\.99\.0/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_AMD64=471feb449cc98d527fc9a67601b9ea04296c100b666d970a784a07dc17a59a8f/);
  assert.match(dockerfile, /GITHUB_CLI_PACKAGE_SHA256_ARM64=20ccc660b06aef27e2164ae0de5085108e1a3d1e7ba4440e7be10bd9b4b5d0ab/);
  assert.match(dockerfile, /github\.com\/cli\/cli\/releases\/download\/v\$\{GITHUB_CLI_VERSION\}/);
  assert.match(browserRuntimeChecks, /require_eq "GitHub CLI version"[\s\S]{0,160}"2\.99\.0"/);
});

test('immutable input inventory binds the release-critical inputs', () => {
  assert.match(immutableInputs, /^release: v1\.5\.9$/m);
  assert.match(immutableInputs, /^expires-at: 2026-09-29$/m);
  for (const value of [
    'sha256:ded31c68586d2e49e760acc2e65a884b23d032e9bbbed0ae0c55abd3fcaf4452',
    'sha256:367679cf9792759492a486e4aa4b421764d71a9546a6dae8aab81a99eb797b3e',
    'sha256:9ab8d9c8514b44f90cf0029dd42fdd7e9e211e639c8b995304cc04568dee900f',
    'sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667',
    '8fcb33017a0dc1058298c923c436d19dfa68ae93968e0b423248542e3afb9fc3',
    'a7fd2b784e6664acd44719270574f6cd8c6864fc2b1700bf9099bd1cccda7d7f',
    '1d444c5e7360471815f7158f71935fcecc68a3c417d85c7344f770854300bba2',
    '32aceeb8ee837244775fcb522372c8b3a47914986385f3148f4ee2c930482a84',
    'dbcb813823bdd20940b903addbd779551569679f',
    '37fe631027851001ddb9b187196cc803df7f5f0e',
    '4895cd3fd33362471e739b786493aba048487bcc',
    '8aa41f614c216d961e7c0d9c3e67982c6b2d9da3',
    'b792c2d1c7fc770910522ca1ffc29eee02ee38de4fa3a01e7832eb705879c6c6',
    '704f1334ac65d3e89e1c6c1d7663293ad786a6166afdb71b5075337df630f976',
    '43dc490af55262edcb3e9b1cb315de22cc09ccb08bd52a4c39bc5eabaa63100f',
    '34d8b11dea9f529e42da1b62df673de4ca646fe4ae8d5234a4e271d395b111dd',
    '4354392ec33218a66a249cac5cfb988ac31b06f6def2722d3e1277ede95649c5',
    '471feb449cc98d527fc9a67601b9ea04296c100b666d970a784a07dc17a59a8f',
    '20ccc660b06aef27e2164ae0de5085108e1a3d1e7ba4440e7be10bd9b4b5d0ab',
    '7e306db5750219a99c00ed517fe8b235d3c54e4ca5f77e2ff160cc97ce707798',
    'cf5db6b5047b3280d8a49471cfd41beb1d5e475774177df5df2851857ab6514a',
    '8ffeb9e7edddffb054764d00749f39e8cc9804ca9b38b9093f906dd2157322ae',
    '3db7aab0e08454c908a874c561f75a93d3b304f2da21957272cd7b73ff45195b',
    '0ed4978e80117a5e203a436026c37276029a3642d633b6916ab45143d10565cd',
    '24c53aa00801f082e4f5312001d8f379705f3b29d539ae20b6a643a836224765',
    'd3eabbc23b5ef7e9383697c689b3b919f504d2cba36dcabe1ccc8de67380acb5',
    '990d8b07111517a78ba779709ff8f438e0dcf2a7fb66d36df7507c8e93358f02',
    '5e0cc6c6c48d6629c8f5d3d5c9f9670e8dac7ba14d295801bb3f6a783a8f841b',
    '313b9e2778517054a580068c5ea44ea3737e5dbf86be7991550efe770a3a1fe6',
    '4c08b90699c05af532a4c376dea8617bfe63c5246df20256ea900637651355a9',
    'b69df84be5120c6d1c209b4b5cf47fc4366ff01809b0984f7e6eff810bdd3383',
    cloudcliManifest.artifact.sha256,
  ]) {
    assert.ok(immutableInputs.includes(value), `immutable input inventory should contain ${value}`);
  }
});

test('compatible package updates and plugin locks are exact', () => {
  for (const expected of [
    'npm@12.0.2',
    'pnpm@11.25.0',
    'vite@8.2.2',
    'prettier@3.9.6',
    'eslint@10.9.1',
    'concurrently@10.0.5',
    'wrangler@4.128.0',
    'vercel@59.11.1',
    'prisma@7.10.0',
    'lighthouse@13.4.1',
    '@marp-team/marp-cli@4.5.0',
    '@google/gemini-cli@0.58.0',
    '@openai/codex@0.152.1',
    'opencode-ai@1.18.26',
    '@earendil-works/pi-coding-agent@0.84.4',
    'pandas==3.0.5',
    'tqdm==4.70.0',
    'matplotlib==3.11.1',
    'fastapi==0.141.1',
    'uvicorn==0.52.4',
    'tree-sitter-language-pack==1.16.1',
    'CLOUDCLI_VERSION=1.37.2',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should contain ${expected}`);
  }
  assert.match(dockerfile, /markdown==3\.10\.3/);
  assert.doesNotMatch(dockerfile, /pdfkit/);

  assert.match(dockerfile, /cloudcli-plugin-starter[\s\S]+npm ci --strict-allow-scripts && npm run build/);
  assert.match(
    dockerfile,
    /cloudcli-plugin-terminal[\s\S]+web-terminal-package-lock\.json package-lock\.json[\s\S]+patch-cloudcli-web-terminal-install-policy\.mjs[\s\S]+npm ci --strict-allow-scripts && node -e "require\('node-pty'\)" && npm run build/,
  );
  assert.match(gitAttributes, /^vendor\/locks\/\*\.json text eol=lf$/m);
  assert.equal(webTerminalLock.lockfileVersion, 3);
  assert.equal(webTerminalLock.packages[''].name, 'cloudcli-plugin-terminal');
  assert.match(
    dockerfile,
    /ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=be2ae9f6c64a6c1c553594cb8ec1ef9e433876401c682c0f124f2b477b110b85/,
  );
  assert.match(
    dockerfile,
    /echo "\$CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256  \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz" \| sha256sum -c -[\s\S]+npm ci --omit=dev[\s\S]+chmod 0755 "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js"[\s\S]+ln -s "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js" \/usr\/local\/bin\/cloudcli/,
  );
  assert.match(
    dockerfile,
    /CLOUDCLI_SHRINKWRAP_SHA256="\$\(sha256sum npm-shrinkwrap\.json \| cut -d' ' -f1\)" && \\\n+    cp -- npm-shrinkwrap\.json package-lock\.json && \\\n+    echo "\$CLOUDCLI_SHRINKWRAP_SHA256  npm-shrinkwrap\.json" \| sha256sum -c - && \\\n+    echo "\$CLOUDCLI_SHRINKWRAP_SHA256  package-lock\.json" \| sha256sum -c - && \\\n+    test "\$\(npm --version\)" = "12\.0\.2" && \\\n+    npm ci --omit=dev --allow-remote=all --allow-file=none --allow-git=none --allow-directory=none && \\\n+    echo "\$CLOUDCLI_SHRINKWRAP_SHA256  npm-shrinkwrap\.json" \| sha256sum -c - && \\\n+    cmp -s npm-shrinkwrap\.json package-lock\.json && \\\n+    rm -f package-lock\.json/,
  );
  assert.match(dockerfile, /npm@12\.0\.2/);
  assert.match(
    dockerfile,
    /npm i -g --allow-scripts=opencode-ai opencode-ai@1\.18\.26; \\\n+    test "\$\(opencode --version\)" = "1\.18\.26"/,
  );
  for (const expected of [
    'ARG CLOUDCLI_NANOID_VERSION=3.3.18',
    'ARG CLOUDCLI_NANOID_ARCHIVE_SHA256=b9dc81cb403ea2510314dd2d1ad8d71934f325db90c1b43805e781b87e3fb009',
    'ARG NESTED_IP_ADDRESS_VERSION=10.7.0',
    'ARG NESTED_IP_ADDRESS_ARCHIVE_SHA256=25a406ee4388fa3d47380ad57b816087fa82a681cc710cccbfe9162cffa8a57a',
    'ARG CLOUDCLI_FAST_URI_VERSION=3.1.6',
    'ARG CLOUDCLI_FAST_URI_ARCHIVE_SHA256=264af0e32c4b7b7bcb9ce5b4623c82469ee3e69ba5d171920f1762d626db1064',
    'ARG CLOUDCLI_JS_YAML_VERSION=3.15.1',
    'ARG CLOUDCLI_JS_YAML_ARCHIVE_SHA256=df86a37e0f5aa855ae32098dcc1d4c5712e43ea515d69fa3e6d51b8f5901c86e',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should bind secure nested package ${expected}`);
  }
  for (const expected of [
    'ARG UNDICI_8_VERSION=8.10.1', 'ARG UNDICI_8_ARCHIVE_SHA256=90e823f192d03af6a6ec64dc7139286519896416694550d6513f79fc51377660',
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
  assert.match(dockerfile, /patch-global-node-tar\.mjs --root \/ --variant "\$VARIANT" --check-baseline/);
  assert.match(dockerfile, /node \/tmp\/patch-global-node-tar\.mjs --root \/ --variant "\$VARIANT"/);
  assert.match(dockerfile, /\/usr\/local\/lib\/node_modules\/npm\/node_modules\/tar/);
  assert.match(dockerfile, /typeof require\(path\)\.list !== 'function'/);
});

test('release workflow keeps manifests clean and emits digest-bound security evidence', () => {
  assert.match(workflow, /^run-name: v1\.5\.9$/m);
  assert.match(workflow, /default: "1\.5\.9"/);
  assert.match(workflow, /baseline="933682705791de71afb481bfbe161697197ed792"/);
  assert.match(workflow, /grep -Eq "\^## \\\[\$\{release#v\}\\\] - \[0-9\]\{2\}\/\[0-9\]\{2\}\/\[0-9\]\{4\}\$"/);
  assert.match(workflow, /git cat-file -p HEAD \| grep -c '\^parent '/);
  assert.match(workflow, /git rev-parse 'v1\.5\.8\^\{commit\}'\)" = "933682705791de71afb481bfbe161697197ed792"/);
  assert.match(workflow, /SYFT_VERSION: 1\.51\.1/);
  assert.match(workflow, /GRYPE_VERSION: 0\.118\.0/);
  assert.match(workflow, /SYFT_SHA256_AMD64: 8fcb33017a0dc1058298c923c436d19dfa68ae93968e0b423248542e3afb9fc3/);
  assert.match(workflow, /SYFT_SHA256_ARM64: a7fd2b784e6664acd44719270574f6cd8c6864fc2b1700bf9099bd1cccda7d7f/);
  assert.match(workflow, /GRYPE_SHA256_AMD64: 1d444c5e7360471815f7158f71935fcecc68a3c417d85c7344f770854300bba2/);
  assert.match(workflow, /GRYPE_SHA256_ARM64: 32aceeb8ee837244775fcb522372c8b3a47914986385f3148f4ee2c930482a84/);
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
  assert.match(runtimeChecks, /npm\/node_modules\/tar\/package\.json/);
  assert.match(runtimeChecks, /npm tar dependency/);
  assert.match(runtimeChecks, /npm --prefix \/usr\/local\/lib\/node_modules\/npm ls tar --all/);
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
  assert.match(dockerfile, /patch-cloudcli-web-terminal-install-policy\.mjs/);
  assert.match(dockerfile, /npm ci --strict-allow-scripts && node -e "require\('node-pty'\)" && npm run build/);
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

test('release OpenVEX identity uses the v1.5.9 publication date', () => {
  const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
  assert.equal(vex['@id'], 'urn:holyclaude:openvex:v1.5.9');
  assert.equal(vex.timestamp, '2026-09-02T00:00:00Z');
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
  assert.match(dockerfile, /ARG PRISMA_MYSQL2_VERSION=3\.22\.0/);
  assert.match(dockerfile, /ARG PRISMA_MYSQL2_ARCHIVE_SHA256=3bb03632c51e4faf76e913e743b5efb4c222c222dae86780a845bf3c13dbd24e/);
  assert.match(dockerfile, /PRISMA_ROOT=\/usr\/local\/lib\/node_modules\/prisma[\s\S]*dependencies\.mysql2[\s\S]*3\.15\.3/);
  assert.match(dockerfile, /https:\/\/registry\.npmjs\.org\/mysql2\/-\/mysql2-\$\{PRISMA_MYSQL2_VERSION\}\.tgz/);
  assert.match(dockerfile, /npm install --omit=dev --ignore-scripts --no-package-lock/);
  assert.match(dockerfile, /require\('\$MYSQL2_ROOT\/package\.json'\)\.version[\s\S]*PRISMA_MYSQL2_VERSION/);
  assert.match(dockerfile, /typeof require\('\$MYSQL2_ROOT'\)\.createConnection/);
  assert.match(immutableInputs, /name: Prisma mysql2 nested package[\s\S]*version: 3\.22\.0[\s\S]*archive-sha256: 3bb03632c51e4faf76e913e743b5efb4c222c222dae86780a845bf3c13dbd24e/);
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
