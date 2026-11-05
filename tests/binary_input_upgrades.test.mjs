import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(file, 'utf8');
const dockerfile = read('Dockerfile');
const immutableInputs = read('security/immutable-inputs.yml');
const workflow = read('.github/workflows/docker-publish.yml');
const cloudcliArtifactBuilder = read('scripts/build-cloudcli-account-management-artifact.mjs');
const cloudcliArtifactContainerBuilder = read('scripts/build-cloudcli-account-management-artifact-container.mjs');
const runtimeChecks = read('tests/browser_runtime_container_checks.sh');
const developerToolsSmoke = read('tests/developer_tools_smoke.sh');
const cursorOwnerGuard = read('scripts/patch-global-node-security-dependencies.mjs');
const junieGuard = read('tests/junie_applicability_guard.py');
const optionalDockerRecipe = read('examples/docker-client/Dockerfile');
const optionalDockerChecks = read('tests/validate_optional_docker_client.sh');
const additionalLinuxRuntimeChecks = read('tests/full_additional_linux_advisory_runtime_checks.sh');
const architectureDocs = read('docs/architecture.md');
const thirdPartyNotices = read('THIRD-PARTY-NOTICES');
const productFacts = JSON.parse(read('contracts/product-facts.json'));
const cloudcliManifest = JSON.parse(read('vendor/artifacts/cloudcli-account-management.manifest.json'));

test('updates runtime Node while preserving custom builder provenance', () => {
  const buildImage = 'node:26.9.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6';
  const runtimeImage = 'node:26.13.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9';
  assert.match(cloudcliArtifactBuilder, /const expectedBuildImage = 'node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6'/);
  assert.match(cloudcliArtifactContainerBuilder, /const buildImage = 'node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6'/);
  assert.equal(dockerfile.match(/^FROM node:[^\r\n]+/gm)?.filter((line) => line.startsWith(`FROM ${runtimeImage}`)).length, 1);
  assert.match(dockerfile, /^FROM node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6 AS ffmpeg-security-builder$/m);
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.13\.0"/);
  assert.match(runtimeChecks, /require_eq "Node version" "\$\(node --version\)" "v26\.13\.0"/);
  assert.match(developerToolsSmoke, /assert\.equal\(process\.version, 'v26\.13\.0'/);
  assert.doesNotMatch(architectureDocs, /Node 26\.8\.2 runtime/);
  assert.doesNotMatch(thirdPartyNotices, /Node 26\.8\.2 runtime|Version: 26\.8\.2 base image/);
  assert.match(thirdPartyNotices, /## Node\.js[\s\S]{0,100}Version: 26\.13\.0 base image/);
  assert.equal(cloudcliManifest.build.image, buildImage);
  assert.equal(cloudcliManifest.build.node, 'v26.9.0');
  assert.match(immutableInputs, /name: FFmpeg security builder\s+reference: node:26\.9\.0-bookworm-slim\s+digest: sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6\s+status: retained/);
  assert.match(immutableInputs, /name: HolyClaude runtime\s+reference: node:26\.13\.0-bookworm-slim\s+digest: sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9/);
});

test('pins the verified native binary candidates and runtime contracts', () => {
  for (const expected of [
    'ARG CLAUDE_CODE_VERSION=2.1.318',
    'ARG CLAUDE_BINARY_SHA256_AMD64=708c77b204db30086ff6f1ed34577bda03e1be74ced80557cbf7b54249ebf0bd',
    'ARG CLAUDE_BINARY_SHA256_ARM64=53a0d7e219d7b0804ecba5dbc002745e89f786cc946d2de85a6470d5b2d1fb06',
    'ARG GITHUB_CLI_VERSION=2.103.3',
    'ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=e3bafef96328d1a67de3a968bdfe1cc2ffd58cf6aba8b5e201356897ed06bb3d',
    'ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=cac3ff84b60b68e64cca69f31f303210c26320361cc3286b773655d4226b7b06',
    'ARG CURSOR_BUILD_ID=2026.09.15-d2fe57e',
    'ARG CURSOR_ARCHIVE_SHA256_AMD64=4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    'ARG CURSOR_ARCHIVE_SHA256_ARM64=2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ARG CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233',
    'ARG JUNIE_VERSION=4011.1',
    'ARG JUNIE_ARCHIVE_SHA256_AMD64=9fcc8c47cc41e4b839f15297fe3a59ec400d2bde6b59c6e79166652daed4223d',
    'ARG JUNIE_ARCHIVE_SHA256_ARM64=f8ce8f3149efcf74cbf96ed12690c1a91132235a09bf3f805066455af0e4ff15',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);

  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.318');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'cursor-agent')?.version, '2026.09.15-d2fe57e');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'junie')?.version, '4011.1');
  assert.match(runtimeChecks, /require_eq "Claude Code version"[^\n]+"2\.1\.318"/);
  assert.match(runtimeChecks, /require_eq "GitHub CLI version"[^\n]+"2\.103\.3"/);
  assert.match(runtimeChecks, /require_eq "Cursor Agent build"[^\n]+"2026\.09\.15-d2fe57e"/);
  assert.match(runtimeChecks, /require_eq "Junie build"[^\n]+"4011\.1"/);
  assert.match(cursorOwnerGuard, /versions\/2026\.09\.15-d2fe57e\/node_modules\/piscina\/package\.json/);
});

test('preserves the historical Junie 3419.26 applicability guard', () => {
  for (const expected of [
    'VERSION = "3419.26"',
    'JAR_SHA256 = "6e4994ce18e1d4744658c6fb7aec6c99fb5d9b241d27970c2371953f2a0e6295"',
    '"com/intellij/ml/llm/matterhorn/ej/app/cli/gateway/http/GatewayServerKt.class": "ea2c8101bc3ae1ba14f57b799377de73e9e458ed69fafc13b0c56a3bb734a206"',
    '"com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/cli/JunieCli.class": "3133142a6d3e21efa3a53fdf0ad5a4e8651113724665e99f7e1be5bdb72fd992"',
  ]) assert.ok(junieGuard.includes(expected), `Junie guard should bind ${expected}`);
  assert.match(junieGuard, /The --gateway option is not available in this version\. Please use the Nightly build\./);
});

test('pins the verified workflow scanner and action updates', () => {
  for (const expected of [
    'SYFT_VERSION: 1.56.0',
    'GRYPE_VERSION: 0.121.1',
    'SYFT_SHA256_AMD64: 1c2493cfcf52d3367d6cb25780d9190c111c2219c34c820574c43e8bae15c528',
    'SYFT_SHA256_ARM64: ace61b9397ae28189c674ae332d67a8074dafd71e87724dfb8b22412d8253bb5',
    'GRYPE_SHA256_AMD64: bc3ea3f9e6fd56ac781c08c6c5e614271b79f438200757f6932085c19b0a4657',
    'GRYPE_SHA256_ARM64: 33670612aad351c48cf3c37f4a85d8b043d1b64b21e6034e675bb00b956d78c1',
    'docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069 # v4.4.1',
    'docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0',
  ]) assert.ok(workflow.includes(expected), `workflow should bind ${expected}`);
});

test('updates the optional Docker CLI and Compose plugin from signed repository packages', () => {
  assert.match(optionalDockerRecipe, /DOCKER_CE_CLI_VERSION=5:29\.9\.2-1~debian\.12~bookworm/);
  assert.match(optionalDockerRecipe, /DOCKER_CLI_UPSTREAM_VERSION=29\.9\.2/);
  assert.match(optionalDockerRecipe, /DOCKER_COMPOSE_PLUGIN_VERSION=5\.6\.1-1~debian\.12~bookworm/);
  assert.match(optionalDockerChecks, /docker-ce-cli\|5:29\.9\.2-1~debian\.12~bookworm/);
  assert.match(optionalDockerChecks, /docker version --format[^\n]+\)" = 29\.9\.2/);
  assert.match(
    immutableInputs,
    /name: Optional Docker CLI release package[\s\S]+version: 29\.9\.2[\s\S]+debian-version: 5:29\.9\.2-1~debian\.12~bookworm[\s\S]+amd64-package-sha256: 06ebf3de771f5673de48d01837d55309e0732958f071ac8c93f4e35d85979bf1[\s\S]+arm64-package-sha256: 84583eb5e0888842e1af34c23cf3ee55511e878780a22d0a1c284472ac630df1/,
  );
});

test('uses the current signed Chromium 156 Bookworm security binaries', () => {
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_AMD64=156\.0\.8078\.79-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_ARM64=156\.0\.8078\.79-1~deb12u1/);
  assert.doesNotMatch(dockerfile, /153\.0\.8010\.52-1~deb12u1/);
});
