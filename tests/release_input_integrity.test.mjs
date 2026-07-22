import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const cloudcliManifest = JSON.parse(readFileSync('vendor/artifacts/cloudcli-account-management.manifest.json', 'utf8'));
const advisoryReviews = readFileSync('security/advisory-reviews.json', 'utf8');
const webTerminalLock = JSON.parse(
  readFileSync('vendor/locks/cloudcli-web-terminal-8aa41f614c216d961e7c0d9c3e67982c6b2d9da3.package-lock.json', 'utf8'),
);

test('release base and archive inputs are versioned and checksum-verified', () => {
  assert.match(dockerfile, /^FROM golang:1\.26\.5-bookworm@sha256:[0-9a-f]{64} AS esbuild-builder$/m);
  assert.match(dockerfile, /^FROM node:26\.5\.0-bookworm-slim@sha256:[0-9a-f]{64}$/m);
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
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=150\.0\.7871\.124-1~deb12u1/);
  assert.match(dockerfile, /chromium="\$\{CHROMIUM_DEBIAN_VERSION\}"/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.doesNotMatch(dockerfile, /playwright install/);
});

test('native installers and their outputs are pinned without unsupported flags', () => {
  assert.match(dockerfile, /ARG CLAUDE_CODE_VERSION=2\.1\.216/);
  assert.match(dockerfile, /CLAUDE_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
  assert.match(dockerfile, /\/home\/claude\/\.local\/bin\/claude --version/);

  assert.match(dockerfile, /ARG JUNIE_VERSION=2285\.5/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /unzip -Z1 "\/tmp\/\$\{JUNIE_ARCHIVE\}"/);
  assert.match(dockerfile, /test "\$JUNIE_TOP_LEVEL" = "junie junie-app shim "/);
  assert.match(dockerfile, /unzip -q "\/tmp\/\$\{JUNIE_ARCHIVE\}" 'junie-app\/\*' -d "\$JUNIE_STAGING"/);
  assert.match(dockerfile, /test -x "\$JUNIE_STAGING\/junie-app\/bin\/junie"/);
  assert.doesNotMatch(dockerfile, /junie\.jetbrains\.com\/install\.sh/);

  assert.match(dockerfile, /ARG CURSOR_BUILD_ID=2026\.07\.17-3e2a980/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_AMD64=1bd8b23cf557bca96358f864ce744cd07195dc4bebda534e1bfaa2eec48ff7c3/);
  assert.match(dockerfile, /CURSOR_ARCHIVE_SHA256_ARM64=827997785f0d8ce93a5af7c3b2d4e8b064ba8543facfceef981c6ead4d278d8c/);
  assert.match(dockerfile, /downloads\.cursor\.com\/lab\/\$\{CURSOR_BUILD_ID\}\/linux\/\$\{CURSOR_ASSET_ARCH\}\/agent-cli-package\.tar\.gz/);
  assert.match(dockerfile, /tar --strip-components=1 -xzf \/tmp\/cursor-agent\.tar\.gz -C "\$CURSOR_DIR"/);
  assert.doesNotMatch(dockerfile, /cursor\.com\/install/);
  assert.match(dockerfile, /CURSOR_LAUNCHER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /CURSOR_NODE_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /! grep -aFq -- '--permission'/);
  assert.match(dockerfile, /! grep -aFq -- '--allow-fs-read'/);
  assert.match(dockerfile, /! grep -aFq -- '--allow-fs-write'/);
  assert.doesNotMatch(dockerfile, /CURSOR_VERSION=/);
  assert.match(dockerfile, /test "\$\(cursor-agent --version\)" = "\$CURSOR_BUILD_ID"/);

  assert.match(dockerfile, /ARG AZURE_CLI_VERSION=2\.88\.0-1~bookworm/);
  assert.match(dockerfile, /AZURE_CLI_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /ARG GITHUB_CLI_VERSION=2\.96\.0/);
  assert.match(dockerfile, /GITHUB_CLI_KEYRING_SHA256=[0-9a-f]{64}/);
});

test('immutable input inventory binds the release-critical inputs', () => {
  assert.match(immutableInputs, /^release: v1\.5\.2$/m);
  assert.match(immutableInputs, /^expires-at: 2026-08-20$/m);
  for (const value of [
    'sha256:1ecb7edf62a0408027bd5729dfd6b1b8766e578e8df93995b225dfd0944eb651',
    'sha256:2d49d876e96237d76de412761cf05dbfe5aee325cc4406a4d41d5824c5bb8beb',
    '4895cd3fd33362471e739b786493aba048487bcc',
    '8aa41f614c216d961e7c0d9c3e67982c6b2d9da3',
    '2382f1b186959c031d834805f7676f8dd8d203d2ead5f6c1365ee346e5b48c0f',
    '1bd8b23cf557bca96358f864ce744cd07195dc4bebda534e1bfaa2eec48ff7c3',
    '827997785f0d8ce93a5af7c3b2d4e8b064ba8543facfceef981c6ead4d278d8c',
    cloudcliManifest.artifact.sha256,
  ]) {
    assert.ok(immutableInputs.includes(value), `immutable input inventory should contain ${value}`);
  }
});

test('compatible package updates and plugin locks are exact', () => {
  for (const expected of [
    'npm@11.18.0',
    'pnpm@11.15.1',
    'vite@8.1.5',
    'prettier@3.9.6',
    'wrangler@4.112.0',
    'vercel@54.21.1',
    'prisma@7.9.0',
    'lighthouse@13.4.1',
    '@marp-team/marp-cli@4.5.0',
    '@google/gemini-cli@0.51.0',
    '@openai/codex@0.144.6',
    'opencode-ai@1.18.4',
    '@earendil-works/pi-coding-agent@0.81.0',
    'tqdm==4.69.0',
    'matplotlib==3.11.1',
    'fastapi==0.139.2',
    'tree-sitter-language-pack==1.6.2',
    'CLOUDCLI_VERSION=1.36.3',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should contain ${expected}`);
  }

  assert.match(dockerfile, /cloudcli-plugin-starter[\s\S]+npm ci && npm run build/);
  assert.match(dockerfile, /cloudcli-plugin-terminal[\s\S]+web-terminal-package-lock\.json package-lock\.json[\s\S]+npm ci && npm run build/);
  assert.equal(webTerminalLock.lockfileVersion, 3);
  assert.equal(webTerminalLock.packages[''].name, 'cloudcli-plugin-terminal');
  assert.match(dockerfile, /ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=[0-9a-f]{64}/);
  assert.match(
    dockerfile,
    /echo "\$CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256  \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz" \| sha256sum -c -[\s\S]+npm i -g \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz/,
  );
  assert.match(dockerfile, /NETLIFY_PROXY_ROOT=.*local-functions-proxy-linux-\$\{NETLIFY_PROXY_ARCH\}/);
  assert.match(dockerfile, /test -x "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /rm -f "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /test ! -e "\$NETLIFY_PROXY_ROOT\/bin\/local-functions-proxy"/);
  assert.match(dockerfile, /ARG NODE_TAR_VERSION=7\.5\.20/);
  assert.match(dockerfile, /ARG NODE_TAR_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /registry\.npmjs\.org\/tar\/-\/tar-\$\{NODE_TAR_VERSION\}\.tgz/);
  assert.match(dockerfile, /echo "\$NODE_TAR_SHA256  \/tmp\/node-tar\.tgz" \| sha256sum -c -/);
  assert.match(dockerfile, /patch-global-node-tar\.mjs --root \/ --check-baseline/);
  assert.match(dockerfile, /node \/tmp\/patch-global-node-tar\.mjs --root \//);
  assert.match(dockerfile, /typeof require\(path\)\.list !== 'function'/);
});

test('release workflow keeps manifests clean and emits digest-bound security evidence', () => {
  assert.match(workflow, /default: "1\.5\.2"/);
  assert.match(workflow, /SYFT_VERSION: 1\.49\.0/);
  assert.match(workflow, /GRYPE_VERSION: 0\.116\.0/);
  assert.match(workflow, /SBOM_UTILITY_VERSION: 0\.19\.2/);
  assert.match(workflow, /git diff --check HEAD\^ HEAD/);
  assert.match(workflow, /rhysd\/actionlint@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9/);
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
  assert.match(workflow, /security\/advisory-reviews\.json/);
  assert.match(workflow, /security\/openvex\.json/);
  assert.match(workflow, /name: security-evidence-\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}/);
  assert.match(workflow, /name: Revalidate candidate security evidence/);
  assert.match(workflow, /sha256sum -c SHA256SUMS/);
  assert.match(workflow, /metadata\["dockerhubDigest"\] != record\["dockerhub_digest"\]/);
  assert.match(workflow, /metadata\["ghcrDigest"\] != record\["ghcr_digest"\]/);
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
  assert.match(workflow, /name: Upload rollback evidence[\s\S]*?name: rollback-evidence[\s\S]*?promotion\/rollback\.tsv[\s\S]*?promotion\/rollback-required/);
  assert.match(workflow, /name: Download rollback evidence[\s\S]*?name: rollback-evidence[\s\S]*?path: \./);
  assert.ok(
    workflow.indexOf('name: Upload rollback evidence') < workflow.indexOf('name: Move mutable aliases'),
    'rollback evidence must be durable before mutable aliases move',
  );
  assert.match(workflow, /needs\.promote\.result == 'cancelled'/);
  assert.match(workflow, /needs\.post-publish-smoke\.result == 'cancelled'/);
  assert.equal((workflow.match(/uses: actions\/upload-artifact@/g) ?? []).length, 4);
  assert.equal((workflow.match(/overwrite: true/g) ?? []).length, 4);

  for (const match of workflow.matchAll(/^\s*uses:\s*[^@\s]+@([^\s#]+)/gm)) {
    assert.match(match[1], /^[0-9a-f]{40}$/, `Action ref should be a full SHA: ${match[0].trim()}`);
  }
});

test('runtime smoke rotates CloudCLI credentials and rejects the old token', () => {
  const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
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
    locationPatterns: ['^/(usr/share/doc|var/lib/dpkg)/'],
  });
  assert.equal(review.disposition, 'vendor_severity');
  assert.equal(review.effectiveSeverity, 'Low');
  assert.equal(review.authority.url, 'https://security-tracker.debian.org/tracker/CVE-2026-7598');
  assert.equal(review.expiresAt, '2026-08-14');
});

test('removed Netlify proxy findings cannot be carried as risk exceptions', () => {
  const reviews = JSON.parse(advisoryReviews).reviews;
  assert.equal(
    reviews.some((item) => item.component.locationPatterns.some((pattern) => pattern.includes('local-functions-proxy'))),
    false,
  );
});
