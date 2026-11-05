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

test('v1.6.9 pins the qualified runtime, browser, scanner, and tool refresh', () => {
  for (const value of [
    'golang:1.27.1-bookworm@sha256:69a7b9788769bec032d238959b61854e9ae87f57be9029ec04e9885fabf99195',
    'node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9',
    'python:3.14.10-slim-bookworm@sha256:516b51cb9db2ef061e465c803e50f64361b82cefd91e525b889b967b83e83527',
    'ARG HOLYCLAUDE_VERSION=1.6.9',
    'ARG CHROMIUM_DEBIAN_VERSION_AMD64=156.0.8078.79-1~deb12u1',
    'ARG CHROMIUM_DEBIAN_VERSION_ARM64=156.0.8078.79-1~deb12u1',
    'ARG CLAUDE_CODE_VERSION=2.1.318',
    'ARG JUNIE_VERSION=4011.1',
    'ARG GITHUB_CLI_VERSION=2.103.3',
    'ARG ATUIN_VERSION=18.24.5',
    'npm@12.2.2',
    'pnpm@12.16.1',
    'vite@8.3.5',
    'eslint@10.14.0',
    'wrangler@4.157.0',
    'netlify-cli@27.16.2',
    'pm2@7.1.2',
    'prisma@7.10.1',
    '@google/gemini-cli@0.67.0',
    '@openai/codex@0.166.0',
    'opencode-ai@1.19.5',
    'markdown==3.11.2',
    'xlsxwriter==3.3.1',
    'SETUPTOOLS_VERSION=84.2.1',
  ]) assert.match(dockerfile, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(dockerfile, /https:\/\/files\.pythonhosted\.org\/packages\/ef\/55\/6dc6d6bb953bdfc52519a0059592c52b6e3b8ad51cf8256dffceb55b0610\/setuptools-\$\{SETUPTOOLS_VERSION\}-py3-none-any\.whl/);

  assert.doesNotMatch(dockerfile, /golang:1\.27\.3-bookworm/);

  assert.equal(facts.release.tag, 'v1.6.9');
  assert.equal(facts.release.dockerVersion, '1.6.9');
  assert.match(immutableInputs, /^release: v1\.6\.9$/m);
  assert.match(publishWorkflow, /SYFT_VERSION: 1\.56\.0/);
  assert.match(publishWorkflow, /GRYPE_VERSION: 0\.121\.1/);
  assert.match(sourceWorkflow, /SYFT_VERSION: 1\.56\.0/);
  assert.match(sourceWorkflow, /GRYPE_VERSION: 0\.121\.1/);
});

test('Prisma and PM2 use their fixed official dependency trees without overlays', () => {
  assert.doesNotMatch(dockerfile, /PRISMA_MYSQL2_VERSION|prisma-mysql2\.tgz/);
  assert.doesNotMatch(dockerfile, /FULL_JS_YAML_VERSION|full-js-yaml\.tgz/);
  assert.match(dockerfile, /prisma@7\.10\.1/);
  assert.match(dockerfile, /pm2@7\.1\.2/);
  assert.match(dockerfile, /dependencies\.mysql2.*3\.24\.4/);
  assert.match(dockerfile, /dependencies\['js-yaml'\].*4\.3\.2/);
  assert.doesNotMatch(immutableInputs, /name: Prisma mysql2 nested package/);
  assert.doesNotMatch(immutableInputs, /name: Full-image js-yaml nested package/);
});

test('the release preserves pinned Playwright, vendored CloudCLI, and existing patch boundaries', () => {
  assert.match(dockerfile, /playwright@1\.64\.1/);
  assert.match(dockerfile, /playwright==1\.64\.1/);
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
