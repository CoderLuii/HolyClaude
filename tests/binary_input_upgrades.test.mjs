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
  const runtimeImage = 'node:26.12.1-bookworm-slim@sha256:28147155d47dc31abe0a46e0d12b59b2fb3d0a2dcc5dc65fce76a074180b16fe';
  assert.match(cloudcliArtifactBuilder, /const expectedBuildImage = 'node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6'/);
  assert.match(cloudcliArtifactContainerBuilder, /const buildImage = 'node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6'/);
  assert.equal(dockerfile.match(/^FROM node:[^\r\n]+/gm)?.filter((line) => line.startsWith(`FROM ${runtimeImage}`)).length, 1);
  assert.match(dockerfile, /^FROM node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6 AS ffmpeg-security-builder$/m);
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.12\.1"/);
  assert.match(runtimeChecks, /require_eq "Node version" "\$\(node --version\)" "v26\.12\.1"/);
  assert.match(developerToolsSmoke, /assert\.equal\(process\.version, 'v26\.12\.1'/);
  assert.doesNotMatch(architectureDocs, /Node 26\.8\.2 runtime/);
  assert.doesNotMatch(thirdPartyNotices, /Node 26\.8\.2 runtime|Version: 26\.8\.2 base image/);
  assert.match(thirdPartyNotices, /## Node\.js[\s\S]{0,100}Version: 26\.12\.1 base image/);
  assert.equal(cloudcliManifest.build.image, buildImage);
  assert.equal(cloudcliManifest.build.node, 'v26.9.0');
  assert.match(immutableInputs, /name: FFmpeg security builder\s+reference: node:26\.9\.0-bookworm-slim\s+digest: sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6\s+status: retained/);
  assert.match(immutableInputs, /name: HolyClaude runtime\s+reference: node:26\.12\.1-bookworm-slim\s+digest: sha256:28147155d47dc31abe0a46e0d12b59b2fb3d0a2dcc5dc65fce76a074180b16fe/);
});

test('pins the verified native binary candidates and runtime contracts', () => {
  for (const expected of [
    'ARG CLAUDE_CODE_VERSION=2.1.307',
    'ARG CLAUDE_BINARY_SHA256_AMD64=6021eb72d20d0682b720bdc63acd2a5cd2270895d1f10d9ca2a88cbfa7b9dd0e',
    'ARG CLAUDE_BINARY_SHA256_ARM64=1c67968ab8410c9644e2f4867167a0dab1a8c6c9de9cc83fe78449e5ae8a3633',
    'ARG GITHUB_CLI_VERSION=2.103.0',
    'ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=4a48fa23b9ce9581f3304b822f3e014812f26519b134f89b37db8bc7d74746e1',
    'ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=5e218097cf3e02c4855a07fd4f5719b1523fa799f24eeb70d6b795a9a74fffe2',
    'ARG CURSOR_BUILD_ID=2026.09.15-d2fe57e',
    'ARG CURSOR_ARCHIVE_SHA256_AMD64=4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    'ARG CURSOR_ARCHIVE_SHA256_ARM64=2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ARG CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233',
    'ARG JUNIE_VERSION=3888.1',
    'ARG JUNIE_ARCHIVE_SHA256_AMD64=742d99abb4a8a950b4a64d397b8763e25133d0708237b706ba5ab2c890745d9c',
    'ARG JUNIE_ARCHIVE_SHA256_ARM64=365b966a4de7a82b325e7b2a348eed4aea62b251b130ce2d4118a266979547a3',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);

  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.307');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'cursor-agent')?.version, '2026.09.15-d2fe57e');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'junie')?.version, '3888.1');
  assert.match(runtimeChecks, /require_eq "Claude Code version"[^\n]+"2\.1\.307"/);
  assert.match(runtimeChecks, /require_eq "GitHub CLI version"[^\n]+"2\.103\.0"/);
  assert.match(runtimeChecks, /require_eq "Cursor Agent build"[^\n]+"2026\.09\.15-d2fe57e"/);
  assert.match(runtimeChecks, /require_eq "Junie build"[^\n]+"3888\.1"/);
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
    'SYFT_VERSION: 1.55.0',
    'GRYPE_VERSION: 0.121.0',
    'SYFT_SHA256_AMD64: bb65249542db5fedeeb4d3f9b018b75e7264dbfbbb10486f044581a92f90490d',
    'SYFT_SHA256_ARM64: 929bd163db2d7cd2255d3bcb8967208079813d7b46b0c952f7b794d8e2c7d304',
    'GRYPE_SHA256_AMD64: 64e07133d3486115de647a66581461dccf5c732748a0a3119077395565f15519',
    'GRYPE_SHA256_ARM64: 86f570f75ca947ea3dd6486309232bcff6d78e44ba081ae75ab14eab72be3dae',
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
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_AMD64=156\.0\.8078\.47-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_ARM64=156\.0\.8078\.47-1~deb12u1/);
  assert.doesNotMatch(dockerfile, /153\.0\.8010\.52-1~deb12u1/);
});
