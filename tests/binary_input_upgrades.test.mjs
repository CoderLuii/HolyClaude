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

test('pins the verified Node 26.9.0 runtime and CloudCLI build provenance', () => {
  const image = 'node:26.9.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6';
  assert.equal(dockerfile.match(/^FROM node:[^\r\n]+/gm)?.filter((line) => line.startsWith(`FROM ${image}`)).length, 2);
  assert.match(dockerfile, /test "\$\("\$CURSOR_DIR\/node" --version\)" = "v26\.9\.0"/);
  assert.match(runtimeChecks, /require_eq "Node version" "\$\(node --version\)" "v26\.9\.0"/);
  assert.match(developerToolsSmoke, /assert\.equal\(process\.version, 'v26\.9\.0'/);
  assert.doesNotMatch(architectureDocs, /Node 26\.8\.2 runtime/);
  assert.doesNotMatch(thirdPartyNotices, /Node 26\.8\.2 runtime|Version: 26\.8\.2 base image/);
  assert.equal(cloudcliManifest.build.image, image);
  assert.equal(cloudcliManifest.build.node, 'v26.9.0');
  assert.match(immutableInputs, /reference: node:26\.9\.0-bookworm-slim\s+digest: sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6/);
});

test('pins the verified native binary candidates and runtime contracts', () => {
  for (const expected of [
    'ARG CLAUDE_CODE_VERSION=2.1.287',
    'ARG CLAUDE_BINARY_SHA256_AMD64=3920489a5109cff5786a1a392c25277408ff22bc796d5edb9c16a60e5a1718f0',
    'ARG CLAUDE_BINARY_SHA256_ARM64=e4daf793d1e74fb0d9874dd09e98690bbfd7be515f78a87fd05b9e2b4bb33b03',
    'ARG GITHUB_CLI_VERSION=2.101.0',
    'ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=f876a3b87bf67c94f773d17becca4dc7340b056dab901473a9260ee2a73e237b',
    'ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=9aec87f9a011b1521556b06cb003776e7e214144c8efd2144924a28d90c23057',
    'ARG CURSOR_BUILD_ID=2026.09.15-d2fe57e',
    'ARG CURSOR_ARCHIVE_SHA256_AMD64=4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    'ARG CURSOR_ARCHIVE_SHA256_ARM64=2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ARG CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233',
    'ARG JUNIE_VERSION=3419.26',
    'ARG JUNIE_ARCHIVE_SHA256_AMD64=52a0c255e70df2cf030b134d8e458d3013d6d8149f8ff47ef562a7eedef13d4f',
    'ARG JUNIE_ARCHIVE_SHA256_ARM64=db0967f44ec04e70069b137136f8c53fdda3c6a4607870a568fa9454b48ba005',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);

  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.287');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'cursor-agent')?.version, '2026.09.15-d2fe57e');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'junie')?.version, '3419.26');
  assert.match(runtimeChecks, /require_eq "Claude Code version"[^\n]+"2\.1\.287"/);
  assert.match(runtimeChecks, /require_eq "GitHub CLI version"[^\n]+"2\.101\.0"/);
  assert.match(additionalLinuxRuntimeChecks, /require_package gh '2\.101\.0'/);
  assert.match(additionalLinuxRuntimeChecks, /gh version 2\.101\.0/);
  assert.match(runtimeChecks, /require_eq "Cursor Agent build"[^\n]+"2026\.09\.15-d2fe57e"/);
  assert.match(runtimeChecks, /require_eq "Junie build"[^\n]+"3419\.26"/);
  assert.match(cursorOwnerGuard, /versions\/2026\.09\.15-d2fe57e\/node_modules\/piscina\/package\.json/);
});

test('rebinds the Junie applicability guard to observed 3419.26 identities', () => {
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
    'SYFT_VERSION: 1.52.0',
    'GRYPE_VERSION: 0.119.0',
    'SYFT_SHA256_AMD64: caeedb81fb0491615f1ebd1761e4145d41ee86dd2cc7bf80669f9f5ad9d6133d',
    'SYFT_SHA256_ARM64: c46d5e4c28e12aa4c5becfaa343ef1c7f89045b6b895f2c21d471c62db09c706',
    'GRYPE_SHA256_AMD64: 3fa2dc4b924621ab65404cf08d0b8438d896d80ab949c9d5a4ca283c36004c9b',
    'GRYPE_SHA256_ARM64: 29f0ec7c549ddb0e2b6a0ca714851f7399438afc399b80c12808e065edc9a8f8',
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
