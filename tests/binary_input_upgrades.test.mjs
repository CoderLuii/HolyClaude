import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(file, 'utf8');
const dockerfile = read('Dockerfile');
const immutableInputs = read('security/immutable-inputs.yml');
const workflow = read('.github/workflows/docker-publish.yml');
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

test('pins Node 26.10.0 while preserving CloudCLI build provenance', () => {
  const buildImage = 'node:26.9.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6';
  const runtimeImage = 'node:26.10.0-bookworm-slim@sha256:662933cf47f013bc8e4beb31a6116448427a82057ba7c42c97e4c5ba766504c2';
  assert.equal(dockerfile.match(/^FROM node:[^\r\n]+/gm)?.filter((line) => line.startsWith(`FROM ${buildImage}`)).length, 1);
  assert.equal(dockerfile.match(/^FROM node:[^\r\n]+/gm)?.filter((line) => line.startsWith(`FROM ${runtimeImage}`)).length, 1);
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.10\.0"/);
  assert.match(runtimeChecks, /require_eq "Node version" "\$\(node --version\)" "v26\.10\.0"/);
  assert.match(developerToolsSmoke, /assert\.equal\(process\.version, 'v26\.10\.0'/);
  assert.doesNotMatch(architectureDocs, /Node 26\.8\.2 runtime/);
  assert.doesNotMatch(thirdPartyNotices, /Node 26\.8\.2 runtime|Version: 26\.8\.2 base image/);
  assert.equal(cloudcliManifest.build.image, buildImage);
  assert.equal(cloudcliManifest.build.node, 'v26.9.0');
  assert.match(immutableInputs, /name: FFmpeg security builder\s+reference: node:26\.9\.0-bookworm-slim\s+digest: sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6\s+status: retained/);
  assert.match(immutableInputs, /reference: node:26\.10\.0-bookworm-slim\s+digest: sha256:662933cf47f013bc8e4beb31a6116448427a82057ba7c42c97e4c5ba766504c2/);
});

test('pins the verified native binary candidates and runtime contracts', () => {
  for (const expected of [
    'ARG CLAUDE_CODE_VERSION=2.1.290',
    'ARG CLAUDE_BINARY_SHA256_AMD64=ea38ee1a1f946eea9bc6e97fb912dbe71fc379b25cc605d91b308afa1ca08be7',
    'ARG CLAUDE_BINARY_SHA256_ARM64=24c31a685e363190c165353f10b4e8434fd22647c1dd76eb6d2a05634eb60b95',
    'ARG GITHUB_CLI_VERSION=2.102.0',
    'ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=7e54a307f90afdc59796c325ec0c49fb09e6c18537727207a8ac7513584ea5b0',
    'ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=5006962696f01e1624b3fcf1f9d8e1a11547f24bf067dd2a0371b7b421945237',
    'ARG CURSOR_BUILD_ID=2026.09.15-d2fe57e',
    'ARG CURSOR_ARCHIVE_SHA256_AMD64=4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    'ARG CURSOR_ARCHIVE_SHA256_ARM64=2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ARG CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233',
    'ARG JUNIE_VERSION=3419.29',
    'ARG JUNIE_ARCHIVE_SHA256_AMD64=7ac5d675d90305c65207f9ddaf4219a1bf78c34630b8e39423833d2716ce7b5e',
    'ARG JUNIE_ARCHIVE_SHA256_ARM64=17338e32942ffb1eca2f8aab020495c10bd8ab92d3772e59b0ca67e791e242ad',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);

  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.290');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'cursor-agent')?.version, '2026.09.15-d2fe57e');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'junie')?.version, '3419.29');
  assert.match(runtimeChecks, /require_eq "Claude Code version"[^\n]+"2\.1\.290"/);
  assert.match(runtimeChecks, /require_eq "GitHub CLI version"[^\n]+"2\.102\.0"/);
  assert.match(runtimeChecks, /require_eq "Cursor Agent build"[^\n]+"2026\.09\.15-d2fe57e"/);
  assert.match(runtimeChecks, /require_eq "Junie build"[^\n]+"3419\.29"/);
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
    'SYFT_VERSION: 1.54.0',
    'GRYPE_VERSION: 0.120.0',
    'SYFT_SHA256_AMD64: 54a87372498168b2d033e876fd41fa4e8035b872699e525a57046e1f2f09c860',
    'SYFT_SHA256_ARM64: ee6d4566373a05b344bc6b5f1706f14419bf9338ba39ff686e247deefe9b8818',
    'GRYPE_SHA256_AMD64: a5a1218dce63acdac152a6b3b5bb366e7267e36f4069848cf455543b3fa5700e',
    'GRYPE_SHA256_ARM64: bc0e52b1a0de37e2ff021c4924d689dce7dcff2e7d74b39aea16c0453e69be18',
    'docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069 # v4.4.1',
    'docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc # v7.4.0',
  ]) assert.ok(workflow.includes(expected), `workflow should bind ${expected}`);
});

test('updates the optional Docker client without changing Compose', () => {
  assert.match(optionalDockerRecipe, /DOCKER_CE_CLI_VERSION=5:29\.8\.1-1~debian\.12~bookworm/);
  assert.match(optionalDockerRecipe, /DOCKER_CLI_UPSTREAM_VERSION=29\.8\.1/);
  assert.match(optionalDockerRecipe, /DOCKER_COMPOSE_PLUGIN_VERSION=5\.5\.1-1~debian\.12~bookworm/);
  assert.match(optionalDockerChecks, /docker-ce-cli\|5:29\.8\.1-1~debian\.12~bookworm/);
  assert.match(optionalDockerChecks, /docker version --format[^\n]+\)" = 29\.8\.1/);
  assert.match(
    immutableInputs,
    /name: Optional Docker CLI release package[\s\S]+version: 29\.8\.1[\s\S]+debian-version: 5:29\.8\.1-1~debian\.12~bookworm[\s\S]+amd64-package-sha256: ff812c5853c52ef120ec73132320805d179a376e42785085e2053ce7f2479860[\s\S]+arm64-package-sha256: 72a9776fd667bdd6b91855e75e16603df22ce050c3563136acd273c95b099c09/,
  );
});

test('uses the current signed Chromium 154 Bookworm security binaries', () => {
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_AMD64=154\.0\.8037\.92-1~deb12u1/);
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION_ARM64=154\.0\.8037\.92-1~deb12u1/);
  assert.doesNotMatch(dockerfile, /153\.0\.8010\.52-1~deb12u1/);
});
