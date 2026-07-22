import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';

import {
  activeYaml,
  loadJson,
  validateProductFacts,
  verifyProductSources,
} from '../scripts/verify-product-facts.mjs';

const facts = loadJson('contracts/product-facts.json');
const schema = loadJson('contracts/product-facts.v1.schema.json');

function clone(value = facts) {
  return structuredClone(value);
}

function expectInvalid(value, pattern) {
  assert.throws(() => validateProductFacts(value, schema), pattern);
}

test('accepts the committed product facts and runtime sources', () => {
  assert.doesNotThrow(() => validateProductFacts(facts, schema));
  assert.doesNotThrow(() => verifyProductSources(facts, process.cwd()));
});

test('rejects a missing required field', () => {
  const value = clone();
  delete value.release;
  expectInvalid(value, /product facts: missing required property release/);
});

test('rejects an unknown field', () => {
  const value = clone();
  value.release.channel = 'stable';
  expectInvalid(value, /product facts\.release: unknown property channel/);
});

test('rejects schema keywords the bundled validator does not implement', () => {
  const value = clone(schema);
  value.allOf = [];
  assert.throws(() => validateProductFacts(facts, value), /unsupported schema keyword allOf/);
});

test('ignores commented Compose settings when checking active configuration', () => {
  const source = 'cap_add:\n  # - SYS_ADMIN\n  - SYS_PTRACE # active\n';
  assert.doesNotMatch(activeYaml(source), /SYS_ADMIN/);
  assert.match(activeYaml(source), /- SYS_PTRACE/);
});

test('rejects malformed versions and URLs', () => {
  const badVersion = clone();
  badVersion.cloudcli.version = 'latest';
  expectInvalid(badVersion, /product facts\.cloudcli\.version: must match/);

  const badUrl = clone();
  badUrl.registries.ghcr.url = 'not a URL';
  expectInvalid(badUrl, /product facts\.registries\.ghcr\.url: must match \^https:\/\//);
});

test('rejects duplicate CLI IDs and commands', () => {
  const duplicateId = clone();
  duplicateId.aiClis[1].id = duplicateId.aiClis[0].id;
  expectInvalid(duplicateId, /duplicate CLI id/);

  const duplicateCommand = clone();
  duplicateCommand.aiClis[1].command = duplicateCommand.aiClis[0].command;
  expectInvalid(duplicateCommand, /duplicate CLI command/);
});

test('rejects duplicate variants, ports, and feature IDs', () => {
  const duplicateVariant = clone();
  duplicateVariant.variants = ['full', 'full'];
  expectInvalid(duplicateVariant, /product facts\.variants: items must be unique/);

  const duplicatePort = clone();
  duplicatePort.ports[1].id = duplicatePort.ports[0].id;
  expectInvalid(duplicatePort, /duplicate port id/);

  const duplicateFeature = clone();
  duplicateFeature.features[1].id = duplicateFeature.features[0].id;
  expectInvalid(duplicateFeature, /duplicate feature id/);
});

test('requires exactly five common CLIs and three full-only CLIs', () => {
  const value = clone();
  value.aiClis[0].variants = ['full'];
  expectInvalid(value, /expected 5 common CLIs and 3 full-only CLIs/);
});

test('rejects incorrect CLI variant membership', () => {
  const value = clone();
  value.aiClis.find((cli) => cli.id === 'opencode').variants = ['full', 'slim'];
  value.aiClis.find((cli) => cli.id === 'taskmaster-ai').variants = ['full'];
  expectInvalid(value, /incorrect identity or variant membership/);
});

test('rejects incorrect tool identities and CloudCLI membership', () => {
  const badCommand = clone();
  badCommand.aiClis.find((cli) => cli.id === 'openai-codex').command = 'codex-cli';
  expectInvalid(badCommand, /incorrect identity or variant membership/);

  const badName = clone();
  badName.aiClis.find((cli) => cli.id === 'claude-code').name = 'Claude';
  expectInvalid(badName, /incorrect identity or variant membership/);

  const badCloudcli = clone();
  badCloudcli.cloudcli.variants = ['full'];
  expectInvalid(badCloudcli, /CloudCLI has incorrect identity or variant membership/);
});

test('rejects incorrect registry and license coordinates', () => {
  const badRegistry = clone();
  badRegistry.registries.dockerHub.repository = 'example/holyclaude';
  expectInvalid(badRegistry, /registry coordinates are incorrect/);

  const badLicense = clone();
  badLicense.licenses.source = 'https://example.com/LICENSE';
  expectInvalid(badLicense, /license links are incorrect/);
});

test('rejects contract versions that drift from Dockerfile', () => {
  const value = clone();
  value.cloudcli.version = '1.36.2';
  assert.throws(() => verifyProductSources(value, process.cwd()), /CloudCLI version does not match Dockerfile/);
});

test('rejects capability and port drift from Compose', () => {
  const value = clone();
  value.capabilityProfile.shmSize = '4g';
  assert.throws(() => verifyProductSources(value, process.cwd()), /shm_size does not match Compose/);

  const badPort = clone();
  badPort.ports.find((port) => port.id === 'cloudcli').start = 3002;
  expectInvalid(badPort, /cloudcli has incorrect port settings/);

  const badProtocol = clone();
  badProtocol.ports.find((port) => port.id === 'mosh').protocol = 'tcp';
  expectInvalid(badProtocol, /mosh has incorrect port settings/);

  const badPublication = clone();
  badPublication.ports.find((port) => port.id === 'ssh').publishedByDefault = true;
  expectInvalid(badPublication, /ssh has incorrect port settings/);

  const badBinding = clone();
  badBinding.ports.find((port) => port.id === 'codex-auth-callback').defaultBinding = '0.0.0.0';
  expectInvalid(badBinding, /defaultBinding: must equal "127\.0\.0\.1"/);
});

test('release workflow gates candidates and does not run on master', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  const triggers = workflow.slice(workflow.indexOf('on:'), workflow.indexOf('\nconcurrency:'));
  const validationJob = workflow.slice(workflow.indexOf('  validate-release-ref:'), workflow.indexOf('  build-candidate:'));
  const candidateJob = workflow.slice(workflow.indexOf('  build-candidate:'), workflow.indexOf('  promote-manifest:'));
  assert.match(triggers, /branches:\s*\n\s*- "release\/\*\*"/);
  assert.match(triggers, /tags:\s*\n\s*- "v\*"/);
  assert.doesNotMatch(triggers, /\bmaster\b/);
  assert.match(validationJob, /^\s*node scripts\/verify-product-facts\.mjs\s*$/m);
  assert.match(candidateJob, /^\s*needs:\s*validate-release-ref\s*$/m);
});

test('public documentation matches the product facts contract', () => {
  const readme = readFileSync('README.md', 'utf8');
  const architecture = readFileSync('docs/architecture.md', 'utf8');
  const security = readFileSync('.github/SECURITY.md', 'utf8');
  const configuration = readFileSync('docs/configuration.md', 'utf8');
  const dockerHubDescription = readFileSync('docs/dockerhub-description.md', 'utf8');
  const memories = [
    readFileSync('config/claude-memory-full.md', 'utf8'),
    readFileSync('config/claude-memory-slim.md', 'utf8'),
  ].join('\n');

  assert.match(readme, /contracts\/product-facts\.json/);
  assert.match(architecture, /contracts\/product-facts\.json/);
  assert.match(readme, /fallback.*request omits `permissionMode`/i);
  assert.match(configuration, /browser client sends an explicit `permissionMode`/i);
  assert.match(security, /HolyClaude operates no credential relay/);
  assert.match(security, /single-user/);
  assert.doesNotMatch(dockerHubDescription, /everything stays local/i);
  assert.match(dockerHubDescription, /bundled tools contact configured providers directly/i);
  assert.match(dockerHubDescription, /file-based credentials stored there/i);
  assert.doesNotMatch(memories, /Playwright Chromium build 1228/);
  assert.match(memories, /Debian Chromium 150\.0\.7871\.124/);

  for (const file of readdirSync('docs/translations').filter((name) => /^README\..+\.md$/.test(name))) {
    const path = `docs/translations/${file}`;
    const content = readFileSync(path, 'utf8');
    assert.doesNotMatch(content, /1\.4\.1/, `${file} has a stale image tag`);
    assert.match(content, /^> \*\*.*HolyClaude.*\*\*/m, `${file} lost its free and open-source notice`);
    const persistedClaudeRow = content.split('\n').find((line) => line.includes('| `/home/claude/.claude` | `./data/claude` |'));
    assert.ok(persistedClaudeRow, `${file} is missing its persisted Claude data row`);
    assert.doesNotMatch(
      persistedClaudeRow,
      /API|credential|credencial|identifiant|Anmeldedaten|認証情報|자격 증명|учетн|凭据/i,
      `${file} overstates which credentials persist`,
    );
    const providerHeading = content.indexOf('## :robot:');
    assert.notEqual(providerHeading, -1, `${file} is missing its provider inventory`);
    const fullOnlyInventory = content.match(/^\*\*.*\*\* Junie \(`junie`\).*OpenCode \(`opencode`\).*Pi \(`pi`\).?$/m);
    assert.ok(fullOnlyInventory, `${file} is missing its full-only CLI inventory`);
    assert.ok(content.indexOf(fullOnlyInventory[0]) < providerHeading, `${file} puts its full-only inventory after the provider matrix`);
    for (const name of ['Junie', 'OpenCode', 'Pi Coding Agent']) {
      const rows = content.match(new RegExp(`^\\| \\*\\*${name}\\*\\* \\|.*$`, 'gm')) ?? [];
      assert.equal(rows.length, 1, `${file} should list ${name} only in the full-image inventory`);
      assert.ok(content.indexOf(rows[0]) > providerHeading, `${file} lists ${name} in the common inventory`);
    }
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(?:https?:|mailto:|url$)/.test(target)) continue;
      assert.ok(existsSync(resolve(dirname(path), target)), `${file} has broken link ${match[1]}`);
    }
  }
});
