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
    'ARG CLAUDE_CODE_VERSION=2.1.276',
    'ARG CLAUDE_BINARY_SHA256_AMD64=8a56c8a14bd3cb246e2bdb7e60aefe0f609bff78c8bbcc5ea6b1817c111c6145',
    'ARG CLAUDE_BINARY_SHA256_ARM64=e9ac3df956083645578a382ad64ec304468666e362c33bfdefd803cd6ff596b0',
    'ARG GITHUB_CLI_VERSION=2.101.0',
    'ARG GITHUB_CLI_PACKAGE_SHA256_AMD64=f876a3b87bf67c94f773d17becca4dc7340b056dab901473a9260ee2a73e237b',
    'ARG GITHUB_CLI_PACKAGE_SHA256_ARM64=9aec87f9a011b1521556b06cb003776e7e214144c8efd2144924a28d90c23057',
    'ARG CURSOR_BUILD_ID=2026.09.15-d2fe57e',
    'ARG CURSOR_ARCHIVE_SHA256_AMD64=4b7b026dd104e935b216cc52f905a560d741fc80a4a4d62ef655735b96a15c97',
    'ARG CURSOR_ARCHIVE_SHA256_ARM64=2d741c12c3ee7a505584579efb28a0ee31ff13fefc1f347e2d3b43688c04620d',
    'ARG CURSOR_LAUNCHER_SHA256=2ccc9a8e167797641448b5e5c936f006ba137a2555f117f38c5eb76a5238a233',
    'ARG JUNIE_VERSION=3196.5',
    'ARG JUNIE_ARCHIVE_SHA256_AMD64=dfe7635595f87c6e6d2a3acfe239b2bcb54ceaef4df41f0ca1044ed0ae37aa01',
    'ARG JUNIE_ARCHIVE_SHA256_ARM64=ac43e6b9ab512b94c57b1d12d52ac35131eb8dbcfb55b42f7fb1e8cd2dd76a98',
  ]) assert.ok(dockerfile.includes(expected), `Dockerfile should bind ${expected}`);

  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'claude-code')?.version, '2.1.276');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'cursor-agent')?.version, '2026.09.15-d2fe57e');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'junie')?.version, '3196.5');
  assert.match(runtimeChecks, /require_eq "Claude Code version"[^\n]+"2\.1\.276"/);
  assert.match(runtimeChecks, /require_eq "GitHub CLI version"[^\n]+"2\.101\.0"/);
  assert.match(additionalLinuxRuntimeChecks, /require_package gh '2\.101\.0'/);
  assert.match(additionalLinuxRuntimeChecks, /gh version 2\.101\.0/);
  assert.match(runtimeChecks, /require_eq "Cursor Agent build"[^\n]+"2026\.09\.15-d2fe57e"/);
  assert.match(runtimeChecks, /require_eq "Junie build"[^\n]+"3196\.5"/);
  assert.match(cursorOwnerGuard, /versions\/2026\.09\.15-d2fe57e\/node_modules\/piscina\/package\.json/);
});

test('rebinds the Junie applicability guard to observed 3196.5 identities', () => {
  for (const expected of [
    'VERSION = "3196.5"',
    'JAR_SHA256 = "f82726298a4e12ee3798bcda516fbaf0d9d6b85da89110b7bd62801af64997f7"',
    '"com/intellij/ml/llm/matterhorn/ej/app/cli/standalone/cli/JunieCli.class": "f4e40d610438ff9f553ccc6529d943d5272eb8fa26e3c92ae51812623bfee438"',
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

test('uses the newly signed Chromium 153 Bookworm security binaries', () => {
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=153\.0\.8010\.47-2~deb12u1/);
  assert.doesNotMatch(dockerfile, /152\.0\.7977\.82-1~deb12u1/);
});
