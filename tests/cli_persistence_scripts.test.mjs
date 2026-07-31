import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const scriptPath = 'scripts/prepare-cli-persistence.sh';
const secureHelperPath = 'scripts/secure-cli-persistence.py';
const entrypoint = readFileSync('scripts/entrypoint.sh', 'utf8');
const bootstrap = readFileSync('scripts/bootstrap.sh', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const troubleshooting = readFileSync('docs/troubleshooting.md', 'utf8');

function documentedRecoveryScript() {
  const marker = '```bash\n(\nset -euo pipefail';
  const fence = troubleshooting.indexOf(marker);
  assert.notEqual(fence, -1);
  const start = fence + '```bash\n'.length;
  const end = troubleshooting.indexOf('\n```', start);
  assert.notEqual(end, -1);
  return troubleshooting.slice(start, end);
}

function runDocumentedRecovery(root, { execStatus = 0 } = {}) {
  const fakeBin = join(root, 'fake-bin');
  const callLog = join(root, 'docker-calls.log');
  mkdirSync(fakeBin, { recursive: true });
  const docker = join(fakeBin, 'docker');
  writeFileSync(
    docker,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$CALL_LOG"
[ "$1" = compose ]
case "$2" in
  exec)
    exit "$FAKE_EXEC_STATUS"
    ;;
  cp)
    source="$4"
    target="$5"
    case "$source" in
      *:/home/claude/.gitconfig)
        mkdir -p "$(dirname "$target")"
        printf 'synthetic-git-state\\n' > "$target"
        ;;
      *:/home/claude/.config/git)
        mkdir -p "$target"
        printf 'synthetic-xdg-state\\n' > "$target/config"
        ;;
      *:/home/claude/.config/gh)
        mkdir -p "$target"
        printf 'synthetic-gh-state\\n' > "$target/hosts.yml"
        ;;
      *)
        exit 1
        ;;
    esac
    ;;
  pull|up)
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
`,
  );
  chmodSync(docker, 0o755);
  const result = spawnSync('bash', ['-c', documentedRecoveryScript()], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CALL_LOG: callLog,
      FAKE_EXEC_STATUS: String(execStatus),
      PATH: `${fakeBin}:${process.env.PATH}`,
    },
  });
  return {
    ...result,
    calls: existsSync(callLog) ? readFileSync(callLog, 'utf8') : '',
  };
}

function stageDirectories(root) {
  const durable = join(root, 'data', 'claude');
  if (!existsSync(durable)) return [];
  return readdirSync(durable).filter((name) => name.startsWith('.holyclaude-v1.5.5-stage.'));
}

test('image installs and runs CLI persistence before first-boot bootstrap', () => {
  assert.equal(existsSync(scriptPath), true);
  assert.equal(existsSync(secureHelperPath), true);
  assert.match(dockerfile, /COPY scripts\/prepare-cli-persistence\.sh \/usr\/local\/bin\/prepare-cli-persistence\.sh/);
  assert.match(dockerfile, /COPY scripts\/secure-cli-persistence\.py \/usr\/local\/bin\/secure-cli-persistence\.py/);
  assert.match(workflow, /python3 -m py_compile scripts\/secure-cli-persistence\.py/);

  const persistenceSetup = entrypoint.indexOf('/usr/local/bin/prepare-cli-persistence.sh');
  const bootstrapStart = entrypoint.indexOf('# ---------- First-boot bootstrap ----------');
  assert.notEqual(persistenceSetup, -1);
  assert.notEqual(bootstrapStart, -1);
  assert.ok(persistenceSetup < bootstrapStart);
});

test('Git initialization moved out of one-time bootstrap', () => {
  assert.doesNotMatch(bootstrap, /git config --global/);
});

test('CLI persistence implementation is bounded and fail closed', () => {
  assert.equal(existsSync(scriptPath), true);
  const script = readFileSync(scriptPath, 'utf8');

  assert.match(script, /DURABLE_ROOT="\$CLAUDE_HOME\/\.claude"/);
  assert.match(script, /"\$DURABLE_ROOT\/\.gitconfig"/);
  assert.match(script, /"\$DURABLE_ROOT\/\.config\/git"/);
  assert.match(script, /"\$DURABLE_ROOT\/\.config\/gh"/);
  assert.match(script, /GIT_CONFIG_GLOBAL/);
  assert.match(script, /GH_CONFIG_DIR/);
  assert.match(script, /XDG_CONFIG_HOME/);
  assert.match(script, /safe\.directory/);
  assert.match(script, /secure-cli-persistence\.py/);
  assert.doesNotMatch(script, /^\s*(?:chown|chmod)\b/gm);
  assert.doesNotMatch(script, /find .* -exec (?:chown|chmod)/);
  assert.doesNotMatch(script, /chmod 777/);

  const secureHelper = readFileSync(secureHelperPath, 'utf8');
  assert.match(secureHelper, /os\.O_NOFOLLOW/);
  assert.match(secureHelper, /dir_fd=/);
  assert.match(secureHelper, /os\.fchown/);
  assert.match(secureHelper, /os\.fchmod/);
  assert.deepEqual(secureHelper.match(/os\.chmod\([^\n]+/g), ['os.chmod(proc_path, repair_mode)']);
  assert.doesNotMatch(secureHelper, /os\.chown\([^\n]+follow_symlinks=True/);
});

test('documented pre-v1.5.5 migration is all-or-nothing and follows live links', () => {
  assert.match(troubleshooting, /docker compose cp -L/);
  assert.match(troubleshooting, /```bash\n\(\nset -euo pipefail/);
  assert.match(troubleshooting, /ensure_directory \.\/data\nensure_directory \.\/data\/claude\nensure_directory \.\/data\/claude\/\.config/);
  assert.match(troubleshooting, /if \[ -L "\$path" \]; then/);
  assert.match(troubleshooting, /if \[ -e "\$path" \] && \[ ! -d "\$path" \]; then/);
  assert.match(troubleshooting, /stage="\$\(mktemp -d \.\/data\/claude\/\.holyclaude-v1\.5\.5-stage\.XXXXXX\)"/);
  assert.match(troubleshooting, /trap 'rm -rf "\$stage"' EXIT/);
  assert.match(troubleshooting, /check_target[\s\S]+move_if_staged/);
  assert.match(troubleshooting, /mv -T -n "\$source" "\$target"/);
  assert.match(troubleshooting, /docker compose up -d\n\)\n```/);
  assert.doesNotMatch(troubleshooting, /claude-backup-/);
});

test('documented recovery rejects a symlinked durable parent before Docker calls', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-recovery-parent-'));
  try {
    const durable = join(root, 'data', 'claude');
    const redirected = join(root, 'redirected');
    mkdirSync(durable, { recursive: true });
    mkdirSync(redirected);
    symlinkSync(redirected, join(durable, '.config'), 'dir');

    const result = runDocumentedRecovery(root);
    assert.notEqual(result.status, 0);
    assert.equal(result.calls, '');
    assert.equal(existsSync(join(redirected, 'git')), false);
    assert.deepEqual(stageDirectories(root), []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('documented recovery leaves conflicts untouched and does not update', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-recovery-conflict-'));
  try {
    const durable = join(root, 'data', 'claude');
    mkdirSync(join(durable, '.config'), { recursive: true });
    writeFileSync(join(durable, '.gitconfig'), 'existing-durable-state\n');

    const result = runDocumentedRecovery(root);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.calls, /compose (?:pull|up)/);
    assert.equal(readFileSync(join(durable, '.gitconfig'), 'utf8'), 'existing-durable-state\n');
    assert.equal(existsSync(join(durable, '.config', 'git')), false);
    assert.equal(existsSync(join(durable, '.config', 'gh')), false);
    assert.deepEqual(stageDirectories(root), []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('documented recovery cleans staging immediately after a successful update', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-recovery-success-'));
  try {
    mkdirSync(join(root, 'data', 'claude', '.config'), { recursive: true });

    const result = runDocumentedRecovery(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.calls, /compose pull/);
    assert.match(result.calls, /compose up -d/);
    assert.equal(existsSync(join(root, 'data', 'claude', '.gitconfig')), true);
    assert.equal(existsSync(join(root, 'data', 'claude', '.config', 'git', 'config')), true);
    assert.equal(existsSync(join(root, 'data', 'claude', '.config', 'gh', 'hosts.yml')), true);
    assert.deepEqual(stageDirectories(root), []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('documented recovery aborts when the old container cannot be inspected', {
  skip: process.platform === 'win32',
}, () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-recovery-inspection-'));
  try {
    mkdirSync(join(root, 'data', 'claude', '.config'), { recursive: true });

    const result = runDocumentedRecovery(root, { execStatus: 42 });
    assert.equal(result.status, 42);
    assert.match(result.stderr, /Could not inspect live state/);
    assert.doesNotMatch(result.calls, /compose (?:pull|up)/);
    assert.deepEqual(stageDirectories(root), []);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test('release workflow checks CLI persistence before and after promotion', () => {
  assert.equal(existsSync('tests/docker_cli_persistence_smoke.sh'), true);
  const smoke = readFileSync('tests/docker_cli_persistence_smoke.sh', 'utf8');
  assert.match(smoke, /type=bind,source=\$bind_claude,target=\/home\/claude\/\.claude/);
  assert.match(smoke, /Manual Bind User/);
  const matches = workflow.match(/tests\/docker_cli_persistence_smoke\.sh/g) ?? [];
  assert.equal(matches.length, 2);
});
