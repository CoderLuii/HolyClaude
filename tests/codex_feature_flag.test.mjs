import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const entrypoint = readFileSync('scripts/entrypoint.sh', 'utf8');
const bootstrap = readFileSync('scripts/bootstrap.sh', 'utf8');

const MIGRATION_HEADER = '# ---------- Codex CLI feature flag migration (every boot) ----------';

function migrationBlock() {
  const start = entrypoint.indexOf(MIGRATION_HEADER);
  assert.notEqual(start, -1, 'entrypoint should carry the Codex feature flag migration section');
  const end = entrypoint.indexOf('\n# ---------- ', start + MIGRATION_HEADER.length);
  assert.notEqual(end, -1, 'migration section should be followed by another entrypoint section');
  return entrypoint.slice(start, end);
}

function runMigration(config) {
  const root = mkdtempSync(join(tmpdir(), 'codex-features-'));
  try {
    mkdirSync(join(root, '.codex'), { recursive: true });
    const configPath = join(root, '.codex/config.toml');
    writeFileSync(configPath, config);
    const result = spawnSync('bash', ['-c', `set -e\nCLAUDE_HOME="$1"\n${migrationBlock()}`, 'bash', root], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    return { config: readFileSync(configPath, 'utf8'), stdout: result.stdout };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('bootstrap seeds the current Codex hooks feature flag', () => {
  assert.match(bootstrap, /^\[features\]\nhooks = true$/m);
  assert.match(bootstrap, /printf '\\n\[features\]\\nhooks = true\\n'/);
  assert.doesNotMatch(bootstrap, /codex_hooks/);
});

test('entrypoint renames the deprecated codex_hooks key on an existing config', () => {
  const { config, stdout } = runMigration(
    'approval_policy = "on-request"\nsandbox_mode = "workspace-write"\n\n[features]\ncodex_hooks = true\n',
  );

  assert.equal(
    config,
    'approval_policy = "on-request"\nsandbox_mode = "workspace-write"\n\n[features]\nhooks = true\n',
  );
  assert.match(stdout, /Renamed deprecated \[features\]\.codex_hooks/);
});

test('entrypoint drops codex_hooks instead of duplicating an existing hooks key', () => {
  const { config, stdout } = runMigration('[features]\nhooks = false\ncodex_hooks = true\n');

  assert.equal(config, '[features]\nhooks = false\n');
  assert.match(stdout, /Dropped deprecated \[features\]\.codex_hooks/);
});

test('entrypoint leaves an already migrated config untouched', () => {
  const original = 'approval_policy = "never"\n\n[features]\nhooks = true\n\n[hooks.state]\n';
  const { config, stdout } = runMigration(original);

  assert.equal(config, original);
  assert.equal(stdout, '');
});

test('migration runs on every boot, not only behind the first-boot sentinel', () => {
  const migration = entrypoint.indexOf(MIGRATION_HEADER);
  const bootstrapGate = entrypoint.indexOf('# ---------- First-boot bootstrap ----------');

  assert.notEqual(bootstrapGate, -1);
  assert.ok(migration < bootstrapGate);
  const statements = migrationBlock().replace(/^#.*$/gm, '');
  assert.doesNotMatch(statements, /sed -i/, 'in-place sed would reassign ownership under a root startup');
});
