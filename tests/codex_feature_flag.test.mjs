import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const bootstrap = readFileSync('scripts/bootstrap.sh', 'utf8');
const entrypoint = readFileSync('scripts/entrypoint.sh', 'utf8');
const migrationFunction = entrypoint.match(/migrate_codex_hooks_feature\(\) \{[\s\S]*?^\}/m)?.[0];

function migrate(config) {
  assert.ok(migrationFunction, 'entrypoint migration function should exist');
  const directory = mkdtempSync(join(tmpdir(), 'holyclaude-codex-feature-'));
  const configPath = join(directory, 'config.toml');
  const harnessPath = join(directory, 'migrate.sh');
  writeFileSync(configPath, config);
  writeFileSync(harnessPath, `#!/bin/bash\nset -e\nchown_if_root() { :; }\n${migrationFunction}\nmigrate_codex_hooks_feature "$1"\n`);

  const toBashPath = (path) => path.replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replaceAll('\\', '/');
  const result = spawnSync('bash', [toBashPath(harnessPath), toBashPath(configPath)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return readFileSync(configPath, 'utf8');
}

test('bootstrap writes the current Codex hooks feature flag', () => {
  assert.match(bootstrap, /\[features\]\nhooks = true/);
  assert.doesNotMatch(bootstrap, /codex_hooks\s*=/);
});

test('legacy-only Codex configuration is migrated without changing its value', () => {
  const before = 'model = "gpt-5"\n\n[features]\n  codex_hooks = false # user choice\nother = true\n';
  const after = migrate(before);
  assert.equal(after, 'model = "gpt-5"\n\n[features]\n  hooks = false # user choice\nother = true\n');
});

test('an existing hooks value wins and the legacy key is removed', () => {
  const before = '[features]\ncodex_hooks = true\nhooks = false\n\n[other]\nvalue = 1\n';
  const after = migrate(before);
  assert.equal(after, '[features]\nhooks = false\n\n[other]\nvalue = 1\n');
});

test('a commented features header is migrated without removing the comment', () => {
  const before = '[features] # user settings\ncodex_hooks = true\n';
  assert.equal(migrate(before), '[features] # user settings\nhooks = true\n');
});

test('current Codex configuration remains byte-identical', () => {
  const before = '# keep this comment\n[features]\nhooks = false\n\n[other]\nvalue = "unchanged"\n';
  assert.equal(migrate(before), before);
});
