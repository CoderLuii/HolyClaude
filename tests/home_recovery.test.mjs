import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const troubleshooting = readFileSync('docs/troubleshooting.md', 'utf8');
const recoveryBlock = troubleshooting.match(
  /```bash\n(# HolyClaude host-side home recovery\n[\s\S]*?)\n```/,
)?.[1];

function shellPath(path) {
  return path.replaceAll('\\', '/');
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function makeFixture({ homeMountTarget } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-home-recovery-'));
  const oldHome = join(root, 'home');
  const backup = join(root, 'home.backup');
  const newClaude = join(root, 'data', 'claude');
  const sourceHome = homeMountTarget === '/home/claude' ? oldHome : join(oldHome, 'claude');
  mkdirSync(join(sourceHome, '.claude'), { recursive: true });
  writeFileSync(join(sourceHome, '.claude', 'settings.json'), '{"theme":"dark"}\n');
  return { root, oldHome, backup, newClaude, sourceHome, homeMountTarget };
}

function runRecovery(fixture, {
  composeStatus = 0,
  containerIds = ['holyclaude-container'],
  mountSource = fixture.oldHome,
  mountDestination = fixture.homeMountTarget ?? '/home',
  mountType = 'bind',
  provideBackup = true,
  createBackupDuringStop = false,
  backupMoveRefusalStatus,
  stageMoveRefusalStatus,
  backupMoveFailureAfterSuccessStatus,
  stageMoveFailureAfterSuccessStatus,
} = {}) {
  assert.ok(recoveryBlock, 'documented host-side recovery command is missing');
  const bash = process.platform === 'win32'
    ? join(process.env.ProgramW6432 ?? process.env.ProgramFiles, 'Git', 'bin', 'bash.exe')
    : 'bash';
  const composeIdsFile = join(fixture.root, 'compose-ids.txt');
  const mountsFile = join(fixture.root, 'mounts.txt');
  const dockerLog = join(fixture.root, 'docker.log');
  const stoppedLog = join(fixture.root, 'stopped.log');
  writeFileSync(composeIdsFile, containerIds.length > 0 ? `${containerIds.join('\n')}\n` : '');
  writeFileSync(
    mountsFile,
    `${mountType}\t${shellPath(mountSource)}\t${mountDestination}\n`,
  );
  const variables = [
    `old_home=${shellQuote(shellPath(fixture.oldHome))}`,
    provideBackup && `backup=${shellQuote(shellPath(fixture.backup))}`,
    `new_claude=${shellQuote(shellPath(fixture.newClaude))}`,
    fixture.homeMountTarget && `home_mount_target=${shellQuote(fixture.homeMountTarget)}`,
    `compose_status=${composeStatus}`,
    `compose_ids_file=${shellQuote(shellPath(composeIdsFile))}`,
    `mounts_file=${shellQuote(shellPath(mountsFile))}`,
    `docker_log=${shellQuote(shellPath(dockerLog))}`,
    `stopped_log=${shellQuote(shellPath(stoppedLog))}`,
    `create_backup_during_stop=${createBackupDuringStop ? 1 : 0}`,
    backupMoveRefusalStatus !== undefined && `backup_move_refusal_status=${backupMoveRefusalStatus}`,
    stageMoveRefusalStatus !== undefined && `stage_move_refusal_status=${stageMoveRefusalStatus}`,
    backupMoveFailureAfterSuccessStatus !== undefined && `backup_move_failure_after_success_status=${backupMoveFailureAfterSuccessStatus}`,
    stageMoveFailureAfterSuccessStatus !== undefined && `stage_move_failure_after_success_status=${stageMoveFailureAfterSuccessStatus}`,
  ].filter(Boolean).join('\n');
  const fixtureCommands = `mv() {
  if [ -n "\${backup_move_refusal_status:-}" ] && [ "\${@: -2:1}" = "$old_home" ] && [ "\${@: -1}" = "$backup" ]; then
    return "$backup_move_refusal_status"
  fi
  if [ -n "\${stage_move_refusal_status:-}" ] && [ -n "\${stage:-}" ] && [ "\${@: -2:1}" = "$stage" ] && [ "\${@: -1}" = "$new_claude" ]; then
    mkdir -p -- "$new_claude"
    printf 'existing-target\\n' > "$new_claude/existing.txt"
    return "$stage_move_refusal_status"
  fi
  if [ -n "\${backup_move_failure_after_success_status:-}" ] && [ "\${@: -2:1}" = "$old_home" ] && [ "\${@: -1}" = "$backup" ]; then
    command mv "$@"
    return "$backup_move_failure_after_success_status"
  fi
  if [ -n "\${stage_move_failure_after_success_status:-}" ] && [ -n "\${stage:-}" ] && [ "\${@: -2:1}" = "$stage" ] && [ "\${@: -1}" = "$new_claude" ]; then
    command mv "$@"
    return "$stage_move_failure_after_success_status"
  fi
  command mv "$@"
}
docker() {
  printf '%s\\n' "$*" >> "$docker_log"
  if [ "$1" = compose ] && [ "$2" = ps ] && [ "$3" = -a ] && [ "$4" = -q ] && [ "$5" = holyclaude ]; then
    [ "$compose_status" -eq 0 ] || return "$compose_status"
    cat "$compose_ids_file"
    return 0
  fi
  if [ "$1" = inspect ] && [ "$2" = --format ]; then
    cat "$mounts_file"
    return 0
  fi
  if [ "$1" = stop ]; then
    printf '%s\\n' "$2" >> "$stopped_log"
    if [ "$create_backup_during_stop" -ne 0 ]; then
      mkdir -p -- "$backup"
      printf 'existing-backup\\n' > "$backup/existing.txt"
    fi
    return 0
  fi
  return 99
}
install() { mkdir -p -- "\${@: -1}"; }`;
  const result = spawnSync(bash, ['-c', `${variables}\n${fixtureCommands}\n${recoveryBlock}`], {
    encoding: 'utf8',
    env: process.env,
  });
  return {
    ...result,
    dockerCalls: existsSync(dockerLog) ? readFileSync(dockerLog, 'utf8') : '',
    stopped: existsSync(stoppedLog) ? readFileSync(stoppedLog, 'utf8') : '',
  };
}

function assertHostStateUnchanged(fixture, result) {
  assert.equal(existsSync(fixture.oldHome), true);
  assert.equal(existsSync(fixture.backup), false);
  assert.equal(existsSync(fixture.newClaude), false);
  assert.equal(result.stopped, '');
}

for (const refusalStatus of [0, 1]) {
  test(`documented recovery preserves the durable target when its install move is refused with status ${refusalStatus}`, () => {
    const fixture = makeFixture();
    const result = runRecovery(fixture, { stageMoveRefusalStatus: refusalStatus });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Durable target changed before install/);
    assert.equal(readFileSync(join(fixture.newClaude, 'existing.txt'), 'utf8'), 'existing-target\n');
    assert.match(readFileSync(join(fixture.backup, 'claude/.claude/settings.json'), 'utf8'), /dark/);
  });
}

test('documented recovery does not mask an old-home move failure after success-looking path changes', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { backupMoveFailureAfterSuccessStatus: 2 });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Moving the old home failed with status 2/);
  assert.match(readFileSync(join(fixture.backup, 'claude/.claude/settings.json'), 'utf8'), /dark/);
  assert.equal(existsSync(fixture.newClaude), false);
});

test('documented recovery does not mask a durable install failure after success-looking path changes', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { stageMoveFailureAfterSuccessStatus: 2 });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Installing the durable target failed with status 2/);
  assert.match(readFileSync(join(fixture.newClaude, 'settings.json'), 'utf8'), /dark/);
  assert.match(readFileSync(join(fixture.backup, 'claude/.claude/settings.json'), 'utf8'), /dark/);
});

test('documented recovery migrates every supported CLI path and retains the original backup', () => {
  const fixture = makeFixture();
  const home = fixture.sourceHome;

  writeFileSync(join(home, '.bash_aliases'), "alias ll='ls -la'\n");
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Recovery User\n');
  writeFileSync(join(home, '.claude.json'), '{"authenticated":true}\n');
  for (const [path, file, content] of [
    ['.config/git', 'config', '[credential]\n\thelper = test\n'],
    ['.config/gh', 'hosts.yml', 'github.com:\n  user: recovery\n'],
    ['.codex', 'config.toml', 'model = "test"\n'],
    ['.gemini', 'settings.json', '{"selectedType":"oauth-personal"}\n'],
    ['.cursor', 'cli-config.json', '{"version":1}\n'],
  ]) {
    mkdirSync(join(home, path), { recursive: true });
    writeFileSync(join(home, path, file), content);
  }

  const result = runRecovery(fixture);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stopped, 'holyclaude-container\n');
  assert.match(result.dockerCalls, /^compose ps -a -q holyclaude$/m);
  assert.match(result.dockerCalls, /^inspect --format .* holyclaude-container$/m);
  assert.equal(readFileSync(join(fixture.newClaude, '.bash_aliases'), 'utf8'), "alias ll='ls -la'\n");
  assert.match(readFileSync(join(fixture.newClaude, '.gitconfig'), 'utf8'), /Recovery User/);
  assert.match(readFileSync(join(fixture.newClaude, '.config/gh/hosts.yml'), 'utf8'), /recovery/);
  assert.match(readFileSync(join(fixture.newClaude, '.codex/config.toml'), 'utf8'), /model/);
  assert.match(readFileSync(join(fixture.newClaude, '.gemini/settings.json'), 'utf8'), /oauth-personal/);
  assert.match(readFileSync(join(fixture.newClaude, '.cursor/cli-config.json'), 'utf8'), /version/);
  assert.match(readFileSync(join(fixture.newClaude, '.claude.json.persist'), 'utf8'), /authenticated/);
  assert.match(readFileSync(join(fixture.newClaude, 'settings.json'), 'utf8'), /dark/);
  assert.match(readFileSync(join(fixture.backup, 'claude/.gitconfig'), 'utf8'), /Recovery User/);
});

test('documented recovery supports an old bind mount targeting /home/claude', () => {
  const fixture = makeFixture({ homeMountTarget: '/home/claude' });
  writeFileSync(join(fixture.sourceHome, '.gitconfig'), '[user]\n\tname = Direct Home User\n');
  mkdirSync(join(fixture.sourceHome, '.config', 'gh'), { recursive: true });
  writeFileSync(join(fixture.sourceHome, '.config', 'gh', 'hosts.yml'), 'github.com:\n  user: direct-home\n');

  const result = runRecovery(fixture);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stopped, 'holyclaude-container\n');
  assert.match(readFileSync(join(fixture.newClaude, 'settings.json'), 'utf8'), /dark/);
  assert.match(readFileSync(join(fixture.newClaude, '.gitconfig'), 'utf8'), /Direct Home User/);
  assert.match(readFileSync(join(fixture.newClaude, '.config/gh/hosts.yml'), 'utf8'), /direct-home/);
  assert.match(readFileSync(join(fixture.backup, '.gitconfig'), 'utf8'), /Direct Home User/);
  assert.equal(existsSync(join(fixture.backup, 'claude')), false);
});

test('documented recovery derives its default backup from the canonical old home', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { provideBackup: false });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stopped, 'holyclaude-container\n');
  assert.equal(existsSync(fixture.oldHome), false);
  assert.equal(
    readdirSync(fixture.root).filter((name) => name.startsWith('home.backup-')).length,
    1,
  );
});

test('documented recovery compares the bind source by canonical path', () => {
  const fixture = makeFixture();
  const aliasedMountSource = `${fixture.oldHome}/claude/..`;
  const result = runRecovery(fixture, { mountSource: aliasedMountSource });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stopped, 'holyclaude-container\n');
});

test('documented recovery rejects an unsupported mount target before mutating host state', () => {
  const fixture = makeFixture({ homeMountTarget: '/srv/claude' });

  const result = runRecovery(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected home_mount_target to be \/home or \/home\/claude/);
  assert.equal(existsSync(fixture.oldHome), true);
  assert.equal(existsSync(fixture.backup), false);
  assert.equal(existsSync(fixture.newClaude), false);
  assert.match(readFileSync(join(fixture.sourceHome, '.claude/settings.json'), 'utf8'), /dark/);
});

test('documented recovery rejects a Compose lookup from the wrong working directory', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { composeStatus: 14 });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Could not resolve the holyclaude Compose service/);
  assertHostStateUnchanged(fixture, result);
});

test('documented recovery rejects a Compose service with no retained container', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { containerIds: [] });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected exactly one holyclaude Compose container; found 0/);
  assertHostStateUnchanged(fixture, result);
});

test('documented recovery rejects multiple Compose service containers', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { containerIds: ['container-one', 'container-two'] });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected exactly one holyclaude Compose container; found 2/);
  assertHostStateUnchanged(fixture, result);
});

test('documented recovery rejects a container bound from another host directory', () => {
  const fixture = makeFixture();
  const unrelated = join(fixture.root, 'unrelated-home');
  mkdirSync(unrelated);
  const result = runRecovery(fixture, { mountSource: unrelated });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not have exactly one verified bind mount/);
  assertHostStateUnchanged(fixture, result);
  assert.equal(existsSync(unrelated), true);
});

test('documented recovery rejects a container bound to another destination', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { mountDestination: '/srv/claude' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not have exactly one verified bind mount/);
  assertHostStateUnchanged(fixture, result);
});

test('documented recovery rejects a named volume at the old home destination', () => {
  const fixture = makeFixture();
  const result = runRecovery(fixture, { mountType: 'volume' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /does not have exactly one verified bind mount/);
  assertHostStateUnchanged(fixture, result);
});

for (const refusalStatus of [0, 1]) {
  test(`documented recovery preserves both paths when the backup move is refused with status ${refusalStatus}`, () => {
    const fixture = makeFixture();
    const result = runRecovery(fixture, {
      createBackupDuringStop: true,
      backupMoveRefusalStatus: refusalStatus,
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Host paths changed while stopping the container/);
    assert.equal(result.stopped, 'holyclaude-container\n');
    assert.equal(readFileSync(join(fixture.sourceHome, '.claude/settings.json'), 'utf8'), '{"theme":"dark"}\n');
    assert.equal(readFileSync(join(fixture.backup, 'existing.txt'), 'utf8'), 'existing-backup\n');
    assert.equal(existsSync(join(fixture.backup, 'home')), false);
    assert.equal(existsSync(fixture.newClaude), false);
  });
}

test('documented recovery accepts released managed links and identical session copies', { skip: process.platform === 'win32' }, () => {
  const fixture = makeFixture();
  const home = fixture.sourceHome;
  mkdirSync(join(home, '.config'), { recursive: true });
  for (const relative of ['.codex', '.gemini', '.cursor', '.config/git', '.config/gh']) {
    mkdirSync(join(home, '.claude', relative), { recursive: true });
    writeFileSync(join(home, '.claude', relative, 'sentinel'), relative);
    symlinkSync(`/home/claude/.claude/${relative}`, join(home, relative));
  }
  for (const relative of ['.gitconfig', '.bash_aliases']) {
    writeFileSync(join(home, '.claude', relative), relative);
    symlinkSync(`/home/claude/.claude/${relative}`, join(home, relative));
  }
  const session = '{"authenticated":true}\n';
  writeFileSync(join(home, '.claude.json'), session);
  writeFileSync(join(home, '.claude', '.claude.json.persist'), session);
  const result = runRecovery(fixture);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(fixture.newClaude, '.config/gh/sentinel'), 'utf8'), '.config/gh');
  assert.equal(readFileSync(join(fixture.newClaude, '.claude.json.persist'), 'utf8'), session);
});

test('documented recovery rejects different live and durable session copies', () => {
  const fixture = makeFixture();
  const home = fixture.sourceHome;
  writeFileSync(join(home, '.claude.json'), '{"live":true}\n');
  writeFileSync(join(home, '.claude', '.claude.json.persist'), '{"durable":true}\n');
  const result = runRecovery(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to replace existing durable state/);
  assert.equal(existsSync(fixture.newClaude), false);
  assert.equal(readFileSync(join(fixture.backup, 'claude/.claude.json'), 'utf8'), '{"live":true}\n');
  assert.equal(readFileSync(join(fixture.backup, 'claude/.claude/.claude.json.persist'), 'utf8'), '{"durable":true}\n');
});

test('documented recovery rejects a durable target collision without overwriting it', () => {
  const fixture = makeFixture();
  const home = fixture.sourceHome;
  writeFileSync(join(home, '.claude', '.gitconfig'), 'durable-state\n');
  writeFileSync(join(home, '.gitconfig'), 'live-state\n');

  const result = runRecovery(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing to replace existing durable state/);
  assert.equal(existsSync(fixture.newClaude), false);
  assert.equal(readFileSync(join(fixture.backup, 'claude/.claude/.gitconfig'), 'utf8'), 'durable-state\n');
  assert.equal(readFileSync(join(fixture.backup, 'claude/.gitconfig'), 'utf8'), 'live-state\n');
});

test('documented recovery rejects an unsafe staged durable target when the live alias is absent', () => {
  const fixture = makeFixture();
  const durableConfig = join(fixture.sourceHome, '.claude', '.config');
  mkdirSync(durableConfig, { recursive: true });
  writeFileSync(join(durableConfig, 'gh'), 'not-a-directory\n');

  const result = runRecovery(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected directory durable target/);
  assert.equal(existsSync(fixture.newClaude), false);
  assert.equal(readFileSync(join(fixture.backup, 'claude/.claude/.config/gh'), 'utf8'), 'not-a-directory\n');
});

test('documented recovery rejects symlinked source state', () => {
  const fixture = makeFixture();
  const home = fixture.sourceHome;
  writeFileSync(join(fixture.root, 'external.gitconfig'), 'external-state\n');
  symlinkSync(join(fixture.root, 'external.gitconfig'), join(home, '.gitconfig'));

  const result = runRecovery(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing symbolic link source/);
  assert.equal(readFileSync(join(fixture.root, 'external.gitconfig'), 'utf8'), 'external-state\n');
});

test('documented recovery rejects source paths with the wrong type', () => {
  const fixture = makeFixture();
  mkdirSync(join(fixture.oldHome, 'claude', '.gitconfig'));

  const result = runRecovery(fixture);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected regular file source/);
});
