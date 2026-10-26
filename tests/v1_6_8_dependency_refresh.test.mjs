import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const facts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const publishWorkflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const sourceWorkflow = readFileSync('.github/workflows/source-security.yml', 'utf8');
const browserRuntimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const nodeSecurityOverlay = readFileSync('scripts/patch-global-node-security-dependencies.mjs', 'utf8');

test('v1.6.8 pins the qualified runtime, browser, scanner, and tool refresh', () => {
  for (const value of [
    'golang:1.27.1-bookworm@sha256:69a7b9788769bec032d238959b61854e9ae87f57be9029ec04e9885fabf99195',
    'node:26.12.1-bookworm-slim@sha256:28147155d47dc31abe0a46e0d12b59b2fb3d0a2dcc5dc65fce76a074180b16fe',
    'python:3.14.9-slim-bookworm@sha256:7e0522950230cad1ec100ada6e3898c22c6bc82851289b4bdf0bf77c1c829cd5',
    'ARG HOLYCLAUDE_VERSION=1.6.8',
    'ARG CHROMIUM_DEBIAN_VERSION_AMD64=156.0.8078.47-1~deb12u1',
    'ARG CHROMIUM_DEBIAN_VERSION_ARM64=156.0.8078.47-1~deb12u1',
    'ARG CLAUDE_CODE_VERSION=2.1.307',
    'ARG JUNIE_VERSION=3888.1',
    'ARG GITHUB_CLI_VERSION=2.103.0',
    'ARG ATUIN_VERSION=18.24.1',
    'npm@12.2.1',
    'pnpm@12.14.0',
    'vite@8.3.5',
    'eslint@10.13.0',
    'wrangler@4.151.3',
    'netlify-cli@27.14.1',
    'pm2@7.1.0',
    'prisma@7.10.1',
    '@google/gemini-cli@0.65.0',
    '@openai/codex@0.163.0',
    'opencode-ai@1.19.3',
    'markdown==3.11.2',
    'xlsxwriter==3.3.0',
    'SETUPTOOLS_VERSION=84.2.1',
  ]) assert.match(dockerfile, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(dockerfile, /https:\/\/files\.pythonhosted\.org\/packages\/ef\/55\/6dc6d6bb953bdfc52519a0059592c52b6e3b8ad51cf8256dffceb55b0610\/setuptools-\$\{SETUPTOOLS_VERSION\}-py3-none-any\.whl/);

  assert.doesNotMatch(dockerfile, /golang:1\.27\.3-bookworm/);

  assert.equal(facts.release.tag, 'v1.6.8');
  assert.equal(facts.release.dockerVersion, '1.6.8');
  assert.match(immutableInputs, /^release: v1\.6\.8$/m);
  assert.match(publishWorkflow, /SYFT_VERSION: 1\.55\.0/);
  assert.match(publishWorkflow, /GRYPE_VERSION: 0\.121\.0/);
  assert.match(sourceWorkflow, /SYFT_VERSION: 1\.55\.0/);
  assert.match(sourceWorkflow, /GRYPE_VERSION: 0\.121\.0/);
});

test('Prisma and PM2 use their fixed official dependency trees without overlays', () => {
  assert.doesNotMatch(dockerfile, /PRISMA_MYSQL2_VERSION|prisma-mysql2\.tgz/);
  assert.doesNotMatch(dockerfile, /FULL_JS_YAML_VERSION|full-js-yaml\.tgz/);
  assert.match(dockerfile, /prisma@7\.10\.1/);
  assert.match(dockerfile, /pm2@7\.1\.0/);
  assert.match(dockerfile, /dependencies\.mysql2.*3\.24\.4/);
  assert.match(dockerfile, /dependencies\['js-yaml'\].*4\.3\.2/);
  assert.doesNotMatch(immutableInputs, /name: Prisma mysql2 nested package/);
  assert.doesNotMatch(immutableInputs, /name: Full-image js-yaml nested package/);
});

test('the release preserves pinned Playwright, vendored CloudCLI, and existing patch boundaries', () => {
  assert.match(dockerfile, /playwright@1\.64\.0/);
  assert.match(dockerfile, /playwright==1\.64\.0/);
  assert.match(dockerfile, /ARG CLOUDCLI_VERSION=1\.37\.3/);
  assert.doesNotMatch(dockerfile, /patch-cloudcli-minimax-models/);
  assert.match(dockerfile, /FFMPEG_BACKPORT_VERSION=7:5\.1\.9-0\+deb12u1\+holyclaude2/);
});

test('the full runtime smoke follows Debian Bookworm libssh u3 and verifies the Gcrypt backend', () => {
  assert.match(
    browserRuntimeChecks,
    /require_eq "libssh-gcrypt-4 package version"[^\n]+"0\.10\.6-0\+deb12u3"/,
  );
  assert.ok(
    browserRuntimeChecks.includes(
      "    ldd \"$libssh_gcrypt_path\" | grep -q 'libgcrypt\\.so'",
    ),
  );
  assert.ok(
    browserRuntimeChecks.includes(
      "    ! ldd \"$libssh_gcrypt_path\" | grep -Eq 'libcrypto\\.so|libssl\\.so'",
    ),
  );
});

test('the full runtime smoke expects the existing Pi Undici security overlay', () => {
  assert.match(nodeSecurityOverlay, /'8\.9\.0',\s*'8\.10\.2'/);
  assert.match(browserRuntimeChecks, /require_eq "Pi undici dependency"[^\n]+"8\.10\.2"/);
  assert.match(browserRuntimeChecks, /require_eq "Pi undici package version"[^\n]+"8\.10\.2"/);
});
