import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
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
  assert.match(dockerfile, /ARG S6_OVERLAY_VERSION=3\.2\.3\.1/);
  assert.match(dockerfile, /s6-overlay-\$\{S6_ASSET\}\.tar\.xz\.sha256/);
  assert.match(dockerfile, /sha256sum -c "s6-overlay-\$\{S6_ASSET\}\.tar\.xz\.sha256"/);
  assert.match(dockerfile, /\/etc\/s6-overlay\/user-bundles\.d\/user\/contents\.d\/cloudcli/);
  assert.doesNotMatch(dockerfile, /\/etc\/s6-overlay\/s6-rc\.d\/user\/contents\.d/);
  assert.match(dockerfile, /ARG FZF_VERSION=0\.74\.0/);
  assert.match(dockerfile, /fzf_\$\{FZF_VERSION\}_checksums\.txt/);
  assert.doesNotMatch(dockerfile, /tmux fzf bat bubblewrap/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=150\.0\.7871\.114-1~deb12u1/);
  assert.match(dockerfile, /chromium="\$\{CHROMIUM_DEBIAN_VERSION\}"/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.doesNotMatch(dockerfile, /playwright install/);
});

test('native installers and their outputs are pinned without unsupported flags', () => {
  assert.match(dockerfile, /ARG CLAUDE_CODE_VERSION=2\.1\.210/);
  assert.match(dockerfile, /CLAUDE_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /CLAUDE_BINARY_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
  assert.match(dockerfile, /\/home\/claude\/\.local\/bin\/claude --version/);

  assert.match(dockerfile, /ARG JUNIE_VERSION=2144\.10/);
  assert.match(dockerfile, /JUNIE_INSTALLER_SHA256=[0-9a-f]{64}/);
  assert.match(dockerfile, /JUNIE_ARCHIVE_SHA256_(AMD64|ARM64)=[0-9a-f]{64}/);
  assert.match(dockerfile, /JUNIE_VERSION="\$JUNIE_VERSION" bash \/tmp\/junie-install\.sh/);

  assert.match(dockerfile, /ARG CURSOR_BUILD_ID=2026\.07\.09-a3815c0/);
  assert.match(dockerfile, /CURSOR_INSTALLER_SHA256=[0-9a-f]{64}/);
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
  assert.match(immutableInputs, /^release: v1\.5\.0$/m);
  assert.match(immutableInputs, /^expires-at: 2026-08-14$/m);
  for (const value of [
    'sha256:1ecb7edf62a0408027bd5729dfd6b1b8766e578e8df93995b225dfd0944eb651',
    'sha256:2d49d876e96237d76de412761cf05dbfe5aee325cc4406a4d41d5824c5bb8beb',
    '4895cd3fd33362471e739b786493aba048487bcc',
    '8aa41f614c216d961e7c0d9c3e67982c6b2d9da3',
    '8e5add4bd93ca1a94a824a850e6192c80f8b8fcb1c2223048c263497f658d04c',
  ]) {
    assert.ok(immutableInputs.includes(value), `immutable input inventory should contain ${value}`);
  }
});

test('compatible package updates and plugin locks are exact', () => {
  for (const expected of [
    'pnpm@11.13.0',
    'wrangler@4.111.0',
    '@openai/codex@0.144.4',
    'opencode-ai@1.18.1',
    '@earendil-works/pi-coding-agent@0.80.7',
    'tree-sitter-language-pack==1.6.2',
    'CLOUDCLI_VERSION=1.36.2',
  ]) {
    assert.ok(dockerfile.includes(expected), `Dockerfile should contain ${expected}`);
  }

  assert.match(dockerfile, /cloudcli-plugin-starter[\s\S]+npm ci && npm run build/);
  assert.match(dockerfile, /cloudcli-plugin-terminal[\s\S]+web-terminal-package-lock\.json package-lock\.json[\s\S]+npm ci && npm run build/);
  assert.equal(webTerminalLock.lockfileVersion, 3);
  assert.equal(webTerminalLock.packages[''].name, 'cloudcli-plugin-terminal');
});

test('release workflow keeps manifests clean and emits digest-bound security evidence', () => {
  assert.match(workflow, /default: "1\.5\.0"/);
  assert.match(workflow, /SYFT_VERSION: 1\.46\.0/);
  assert.match(workflow, /GRYPE_VERSION: 0\.115\.0/);
  assert.match(workflow, /sbom: false/);
  assert.match(workflow, /provenance: false/);
  assert.match(workflow, /cyclonedx-json=/);
  assert.match(workflow, /spdx-json=/);
  assert.match(workflow, /name: Provision full-image scanner swap[\s\S]+if: matrix\.variant == 'full'[\s\S]+swap_file=\/holyclaude-scanner\.swap[\s\S]+fallocate -l 16G "\$\{swap_file\}"[\s\S]+swapon "\$\{swap_file\}"/);
  assert.match(workflow, /GOGC: "50"/);
  assert.match(workflow, /GOMEMLIMIT: 8GiB/);
  assert.match(workflow, /syft "\$\{image\}" --parallelism 1 \\\r?\n+\s+-o "cyclonedx-json=[^\n]+" \\\r?\n+\s+-o "spdx-json=[^\n]+"/);
  assert.equal((workflow.match(/^\s*syft "\$\{image\}"/gm) ?? []).length, 1);
  assert.match(workflow, /grype "sbom:/);
  assert.match(workflow, /node scripts\/evaluate-security-report\.mjs/);
  assert.match(workflow, /security\/advisory-reviews\.json/);
  assert.match(workflow, /security\/openvex\.json/);
  assert.match(workflow, /name: security-evidence-\$\{\{ matrix\.variant \}\}-\$\{\{ matrix\.arch \}\}/);

  for (const match of workflow.matchAll(/^\s*uses:\s*[^@\s]+@([^\s#]+)/gm)) {
    assert.match(match[1], /^[0-9a-f]{40}$/, `Action ref should be a full SHA: ${match[0].trim()}`);
  }
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
