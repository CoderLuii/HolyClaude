import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const workflow = readFileSync(new URL('../.github/workflows/docker-publish.yml', import.meta.url), 'utf8');
const atuin = readFileSync(new URL('./atuin_runtime_smoke.sh', import.meta.url), 'utf8');
const plugins = readFileSync(new URL('./plugin_reproducibility_smoke.sh', import.meta.url), 'utf8');
const recovery = readFileSync(new URL('./docker_home_recovery_smoke.sh', import.meta.url), 'utf8');
const upgrade = readFileSync(new URL('./docker_upgrade_rollback_smoke.sh', import.meta.url), 'utf8');
const developerTools = readFileSync(new URL('./developer_tools_smoke.sh', import.meta.url), 'utf8');
const startup = new URL('./docker_startup_symlink_smoke.sh', import.meta.url);

const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
const toBashPath = (path) => process.platform === 'win32'
  ? path.replaceAll('\\', '/').replace(/^\/?([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
  : path;

test('native candidate matrix runs the bounded runtime coverage harnesses', () => {
  for (const harness of [
    'atuin_runtime_smoke.sh',
    'plugin_runtime_smoke.sh',
    'docker_lifecycle_smoke.sh',
    'docker_upgrade_rollback_smoke.sh',
    'docker_home_recovery_smoke.sh',
    'docker_startup_symlink_smoke.sh',
  ]) {
    assert.match(workflow, new RegExp(`bash tests/${harness.replaceAll('.', '\\.')}`));
  }
});

test('published final matrix reruns non-baseline runtime coverage', () => {
  for (const harness of ['atuin_runtime_smoke.sh', 'plugin_runtime_smoke.sh', 'docker_lifecycle_smoke.sh']) {
    const matches = workflow.match(new RegExp(`bash tests/${harness.replaceAll('.', '\\.')}`, 'g')) ?? [];
    assert.ok(matches.length >= 2, `${harness} must run for candidates and published images`);
  }
});

test('source checks parse every Bash script separately', () => {
  assert.match(workflow, /for file in scripts\/\*\.sh tests\/\*\.sh; do bash -n "\$file"; done/);
  assert.doesNotMatch(workflow, /^\s*bash -n scripts\/\*\.sh tests\/\*\.sh$/m);
  assert.match(workflow, /for file in scripts\/holyclaude-chromium scripts\/holyclaude-mosh-server; do sh -n "\$file"; done/);
});

test('runtime fixtures exercise the reviewed live behavior rather than placeholders', () => {
  assert.match(atuin, /bash -ic/);
  assert.match(plugins, /git -C "\$fixture" init/);
  assert.match(plugins, /git -C "\$fixture" commit/);
  for (const livePath of ['.codex/marker', '.gemini/marker', '.config/gh/hosts.yml']) {
    assert.match(recovery, new RegExp(livePath.replaceAll('.', '\\.')));
  }
  assert.match(recovery, /grep -Fxq cursor \/home\/claude\/\.claude\/\.cursor\/marker/);
  assert.match(recovery, /# cursor-snapshot-start[\s\S]*exec \/usr\/local\/bin\/entrypoint\.sh/);
  assert.match(recovery, /# cursor-contract-start[\s\S]*# cursor-contract-end/);
  assert.match(recovery, /CURSOR_CONTRACT_LIVE/);
  assert.match(upgrade, /cmp -s \/home\/claude\/\.claude\.json \/home\/claude\/\.claude\/\.claude\.json\.persist/);
  assert.match(upgrade, /test ! -L \/home\/claude\/\.claude\.json/);
});

test('home-recovery cleanup repairs bind ownership and preserves failure status', () => {
  const cleanup = recovery.match(/cleanup\(\) \{[\s\S]*?\n\}\ntrap cleanup EXIT/)?.[0].replace(/\ntrap cleanup EXIT$/, '');
  assert.ok(cleanup, 'missing home-recovery cleanup function');

  const runCleanup = (mode, exitStatus) => {
    const fixture = mkdtempSync(join(tmpdir(), `holyclaude-home-cleanup-${mode}-`));
    const result = spawnSync(bash, ['-c', `set -Eeuo pipefail
ROOT="$CLEANUP_ROOT"
CLEANUP_SENTINEL="$ROOT/.holyclaude-home-recovery-root"
: > "$CLEANUP_SENTINEL"
IMAGE=fixture-image
containers=(fixture-container)
needs_owner_cleanup=yes
docker_cmd() {
  case "$1" in
    rm) return 0 ;;
    run)
      [[ " $* " == *" --mount type=bind,source=$ROOT,target=/cleanup "* ]] || return 75
      [[ "$*" == *'find /cleanup -xdev -exec chown -h'* ]] || return 76
      if [ "$CLEANUP_MODE" = success ]; then touch "$ROOT/.ownership-fixed"; return 0; fi
      return 71
      ;;
    *) return 72 ;;
  esac
}
rm() {
  if [ "$1" = -rf ] && [ "$2" = "$ROOT" ] && [ "$CLEANUP_MODE" = success ] && [ ! -f "$ROOT/.ownership-fixed" ]; then
    return 73
  fi
  command rm "$@"
}
${cleanup}
trap cleanup EXIT
exit "$CLEANUP_EXIT_STATUS"
`], {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        CLEANUP_ROOT: toBashPath(fixture),
        CLEANUP_MODE: mode,
        CLEANUP_EXIT_STATUS: String(exitStatus),
      },
    });
    rmSync(fixture, { recursive: true, force: true });
    return result;
  };

  let result = runCleanup('success', 0);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  result = runCleanup('failure', 0);
  assert.notEqual(result.status, 0, 'ownership-repair failure must fail an otherwise successful smoke');

  result = runCleanup('failure', 42);
  assert.equal(result.status, 42, 'cleanup failure must not mask the original smoke failure');
});

test('upgrade run_stage initializes its dependent container name under nounset', () => {
  const runStage = upgrade.match(/run_stage\(\) \{[\s\S]*?\n\}\n\nrun_stage/)?.[0].replace(/\n\nrun_stage$/, '');
  assert.ok(runStage, 'missing run_stage function');
  const result = spawnSync(bash, ['-c', `set -Eeuo pipefail
BASE=upgrade-contract
containers=()
docker_cmd() { return 0; }
assert_payloads() { return 0; }
${runStage}
run_stage fixture-image candidate fixture-claude fixture-workspace fixture-cloudcli
`], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('upgrade baseline requires only persistence behavior present in v1.5.9', () => {
  const payloads = upgrade.match(/assert_payloads\(\) \{[\s\S]*?\n\}\nrun_stage/)?.[0].replace(/\nrun_stage$/, '');
  assert.ok(payloads, 'missing assert_payloads function');
  assert.match(payloads, /grep -Fq cursor-fixture \/home\/claude\/\.claude\/\.cursor\/runtime-marker/);
  assert.match(payloads, /# cursor-contract-start[\s\S]*# cursor-contract-end/);
  assert.match(payloads, /if \[ "\$expect_new_persistence" = yes \]; then[\s\S]*grep -Fq fixture-alias \/home\/claude\/\.bash_aliases/);
  assert.match(upgrade, /case "\$stage" in candidate\) expect_new_persistence=yes ;; \*\) expect_new_persistence=no ;; esac/);
  assert.match(upgrade, /# cursor-snapshot-start[\s\S]*exec \/usr\/local\/bin\/entrypoint\.sh/);
});

test('Cursor topology assertions survive their outer Docker shell transport', () => {
  const assertPayloads = upgrade.match(/assert_payloads\(\) \{[\s\S]*?\n\}\nrun_stage/)?.[0].replace(/\nrun_stage$/, '');
  const recoveryExec = recovery.match(/  docker_cmd exec --user 0:0 "\$candidate" bash -lc '\n    set -eu\n    # cursor-contract-start[\s\S]*?\n  '/)?.[0];
  assert.ok(assertPayloads, 'missing full assert_payloads function');
  assert.ok(recoveryExec, 'missing home-recovery Cursor docker exec statement');

  const fixture = mkdtempSync(join(tmpdir(), 'holyclaude-cursor-transport-'));
  const home = join(fixture, 'home', 'claude');
  const durable = join(home, '.claude');
  const live = join(home, '.cursor');
  const snapshot = join(fixture, 'cursor-prestart.snapshot');
  const typeFile = join(fixture, 'cursor-prestart.type');
  const workspace = join(fixture, 'workspace');
  const transportStub = String.raw`
docker_cmd() {
  local operation="$1"
  shift
  if [ "$operation" = run ]; then
    printf "fixture-alias\n"
    return 0
  fi
  test "$operation" = exec
  local previous="" payload="" argument
  for argument in "$@"; do
    if [ "$previous" = -lc ]; then payload="$argument"; fi
    previous="$argument"
  done
  if [ -n "$payload" ]; then
    payload="${'${'}payload//\/home\/claude/$TRANSPORT_HOME}"
    payload="${'${'}payload//\/workspace/$TRANSPORT_WORKSPACE}"
    payload='sqlite3() { case "$*" in *integrity_check*) printf "ok\\n" ;; *) printf "1\\n" ;; esac; }; '"$payload"
    bash -eu -c "$payload"
    return
  fi
  local path="${'${'}!#}"
  path="${'${'}path//\/home\/claude/$TRANSPORT_HOME}"
  grep -Fq fixture-alias "$path"
}
`;

  try {
    mkdirSync(join(durable, '.codex'), { recursive: true });
    mkdirSync(join(durable, '.gemini'), { recursive: true });
    mkdirSync(join(durable, '.cursor'), { recursive: true });
    mkdirSync(join(durable, '.config', 'gh'), { recursive: true });
    mkdirSync(join(home, '.codex'), { recursive: true });
    mkdirSync(join(home, '.gemini'), { recursive: true });
    mkdirSync(join(home, '.config', 'gh'), { recursive: true });
    mkdirSync(join(home, '.cloudcli'), { recursive: true });
    mkdirSync(live, { recursive: true });
    mkdirSync(join(workspace, 'project'), { recursive: true });
    writeFileSync(join(home, '.claude.json'), '{"fixture":"claude-json"}\n');
    writeFileSync(join(durable, '.claude.json.persist'), '{"fixture":"claude-json"}\n');
    writeFileSync(join(home, '.codex', 'runtime-marker'), 'codex-fixture\n');
    writeFileSync(join(home, '.gemini', 'runtime-marker'), 'gemini-fixture\n');
    writeFileSync(join(durable, '.cursor', 'runtime-marker'), 'cursor-fixture\n');
    writeFileSync(join(home, '.gitconfig'), 'Upgrade Fixture\n');
    writeFileSync(join(home, '.config', 'gh', 'hosts.yml'), 'fixture\n');
    writeFileSync(join(home, '.bash_aliases'), 'fixture-alias\n');
    writeFileSync(join(workspace, 'project', 'marker.txt'), 'workspace-fixture\n');
    writeFileSync(join(live, 'original.json'), '{"preserve":true}\n');
    cpSync(live, snapshot, { recursive: true, verbatimSymlinks: true });
    writeFileSync(typeFile, 'directory\n');

    const env = {
      ...process.env,
      OLD_IMAGE: 'fixture-old-image',
      TRANSPORT_HOME: toBashPath(home),
      TRANSPORT_WORKSPACE: toBashPath(workspace),
      CURSOR_CONTRACT_LIVE: toBashPath(live),
      CURSOR_CONTRACT_DURABLE: toBashPath(join(durable, '.cursor')),
      CURSOR_CONTRACT_SNAPSHOT: toBashPath(snapshot),
      CURSOR_CONTRACT_TYPE_FILE: toBashPath(typeFile),
    };
    let result = spawnSync(bash, ['-eu', '-c', `${transportStub}\n${assertPayloads}\nassert_payloads fixture yes fixture-volume`], {
      encoding: 'utf8', timeout: 10_000, env,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    result = spawnSync(bash, ['-eu', '-c', `${transportStub}\ncandidate=fixture\n${recoveryExec}`], {
      encoding: 'utf8', timeout: 10_000, env,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('Cursor topology contracts preserve real state and require an exact generated alias', () => {
  for (const [label, source] of [['upgrade', upgrade], ['home-recovery', recovery]]) {
    const cursorContract = source.match(/    # cursor-contract-start\n([\s\S]*?)\n    # cursor-contract-end/)?.[1];
    assert.ok(cursorContract, `missing executable ${label} Cursor topology contract`);
    assert.match(cursorContract, /CURSOR_CONTRACT_DURABLE:-\/home\/claude\/\.claude\/\.cursor/);

    const fixture = mkdtempSync(join(tmpdir(), `holyclaude-${label}-cursor-`));
    const home = join(fixture, 'home', 'claude');
    const live = join(home, '.cursor');
    const durable = join(home, '.claude', '.cursor');
    const snapshot = join(fixture, 'cursor-prestart.snapshot');
    const typeFile = join(fixture, 'cursor-prestart.type');
    mkdirSync(durable, { recursive: true });
    writeFileSync(join(durable, 'runtime-marker'), 'cursor-fixture\n');
    writeFileSync(join(durable, 'marker'), 'cursor\n');

    const runContract = (extraEnv = {}) => spawnSync(bash, ['-eu', '-c', cursorContract], {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        CURSOR_CONTRACT_LIVE: toBashPath(live),
        CURSOR_CONTRACT_DURABLE: toBashPath(durable),
        CURSOR_CONTRACT_SNAPSHOT: toBashPath(snapshot),
        CURSOR_CONTRACT_TYPE_FILE: toBashPath(typeFile),
        ...extraEnv,
      },
    });

    try {
      mkdirSync(live, { recursive: true });
      writeFileSync(join(live, 'original.json'), '{"preserve":true}\n');
      symlinkSync('original.json', join(live, 'current.json'));
      writeFileSync(join(live, 'valid-after.json'), '{"still":true}\n');
      cpSync(live, snapshot, { recursive: true, verbatimSymlinks: true });
      writeFileSync(typeFile, 'directory\n');
      let result = runContract();
      assert.equal(result.status, 0, `${label}: ${result.stderr || result.stdout}`);

      writeFileSync(join(live, 'original.json'), '{"preserve":false}\n');
      result = runContract();
      assert.notEqual(result.status, 0, `${label}: changed original state must fail before later valid entries can mask it`);

      rmSync(snapshot, { recursive: true, force: true });
      result = runContract();
      assert.notEqual(result.status, 0, `${label}: a missing snapshot must fail`);

      writeFileSync(join(live, 'original.json'), '{"preserve":true}\n');
      cpSync(live, snapshot, { recursive: true, verbatimSymlinks: true });
      const bashEnv = join(fixture, 'fail-find.sh');
      writeFileSync(bashEnv, 'find() { return 7; }\n');
      result = runContract({ BASH_ENV: toBashPath(bashEnv) });
      assert.notEqual(result.status, 0, `${label}: snapshot enumeration failure must fail`);

      rmSync(live, { recursive: true, force: true });
      rmSync(snapshot, { recursive: true, force: true });
      symlinkSync(durable, live, 'dir');
      const linkResult = spawnSync(bash, ['-c', 'readlink "$1"', 'read-cursor', toBashPath(live)], {
        encoding: 'utf8',
        timeout: 10_000,
      });
      assert.equal(linkResult.status, 0, `${label}: ${linkResult.stderr || linkResult.stdout}`);
      writeFileSync(typeFile, 'absent\n');
      result = runContract({ CURSOR_CONTRACT_DURABLE: linkResult.stdout.trim() });
      assert.equal(result.status, 0, `${label}: ${result.stderr || result.stdout}`);

      rmSync(live, { force: true });
      mkdirSync(live);
      result = runContract();
      assert.notEqual(result.status, 0, `${label}: replacing a generated durable alias with a real directory must fail`);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }
});

test('developer tools fixture exercises upgraded Vite, EAS, and native parser behavior', () => {
  assert.ok((workflow.match(/developer_tools_smoke\.sh/g) ?? []).length >= 2,
    'developer tools smoke must run for candidate and published image matrices');
  assert.match(developerTools, /vite build/);
  assert.match(developerTools, /vite preview/);
  assert.match(developerTools, /grep -RFq 'vite-native-smoke' dist\/assets/);
  assert.match(developerTools, /curl .*127\.0\.0\.1/);
  assert.match(developerTools, /EasJsonAccessor\.fromRawString/);
  assert.match(developerTools, /EasJsonUtils\.getBuildProfileAsync/);
  assert.match(developerTools, /eas\\\.json is not valid/);
  assert.match(developerTools, /process\.exitCode = 1/);
  assert.match(developerTools, /TREE_SITTER_LANGUAGE_PACK_MANIFEST_URL/);
  assert.match(developerTools, /a78386c99e08bc1c88e2fcd3c036a48b2c4c62088628a3aab3a3aad1ed3715a9/);
  assert.match(developerTools, /get_parser\(['"]python['"]\)/);
  assert.match(developerTools, /root\.has_error/);
  assert.match(developerTools, /timeout --foreground [0-9]+s env/);
});

test('startup fixture seeds top-level aliases in the tested container and separates root sentinel checks', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'holyclaude-startup-contract-'));
  const dockerLog = join(fixture, 'docker.log');
  const dockerStub = join(fixture, 'docker');
  const archiveListStub = join(fixture, 'archive-list');
  writeFileSync(dockerStub, `#!/usr/bin/env bash
printf '%q ' "$@" >> "$DOCKER_LOG"
printf '\\n' >> "$DOCKER_LOG"
case "$1" in
  inspect)
    case "$*" in *State.Running*) printf 'false\\n' ;; *) printf '1\\n' ;; esac
    ;;
  logs)
    case "$*" in
      *-direct*) printf 'durable Codex CLI state must not be a symbolic link\\n' ;;
      *-cross*) printf 'durable Codex CLI state must not be a symbolic link\\n' ;;
      *-regular-file*) printf 'user-managed Codex CLI link must resolve to a directory\\n' ;;
    esac
    ;;
  run)
    case " $* " in *' -d '*) printf 'fixture-container\\n' ;; esac
    ;;
  cp)
    case "$*" in *-regular-file*) target=/external/codex/state-file ;; *) target=/external/codex ;; esac
    printf '.codex -> %s\\n' "$target"
    ;;
esac
`, 'utf8');
  writeFileSync(archiveListStub, '#!/usr/bin/env bash\ncat\n', 'utf8');
  chmodSync(dockerStub, 0o755);
  chmodSync(archiveListStub, 0o755);

  try {
    const result = spawnSync(bash, [toBashPath(startup.pathname), 'fixture-image', 'contract'], {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        DOCKER_LOG: toBashPath(dockerLog),
        STARTUP_ARCHIVE_LIST_CMD: toBashPath(archiveListStub),
        PATH: `${toBashPath(fixture)}:${process.env.PATH}`,
      },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const commands = readFileSync(dockerLog, 'utf8').split('\n').filter(Boolean);
    const childShellCommands = commands.filter((command) => command.includes(' sh ') && command.includes(' -lc '));
    assert.ok(childShellCommands.length > 0);
    assert.deepEqual(childShellCommands.filter((command) => !command.includes('set -eu') && !command.includes('set\\ -eu')), [],
      'every startup setup/assertion child shell must fail fast');
    const detachedRuns = commands.filter((command) => command.startsWith('run ') && command.includes(' -d '));
    for (const scenario of ['cross', 'healthy', 'regular-file']) {
      const command = detachedRuns.find((candidate) => candidate.includes(`-${scenario}`));
      assert.ok(command, `missing detached ${scenario} container`);
      assert.match(command, /exec \/usr\/local\/bin\/entrypoint\.sh/);
      assert.match(command, /ln -s/);
      assert.ok(command.includes(scenario === 'healthy' ? '/home/claude/.$cli' : '/home/claude/.codex'));
    }

    const healthyRootCheck = commands.find((command) => command.startsWith('exec ') && command.includes('--user 0:0') && command.includes('external/$cli/sentinel'));
    assert.match(healthyRootCheck ?? '', /grep -Fxq/);
    const healthyRuntimeCheck = commands.find((command) => command.startsWith('exec ') && command.includes('--user 1026:100'));
    assert.match(healthyRuntimeCheck ?? '', /readlink/);
    assert.doesNotMatch(healthyRuntimeCheck ?? '', /sentinel|grep -Fxq|stat -c/);

    assert.ok(commands.some((command) => command.startsWith('cp ') && command.includes('-regular-file:/home/claude/.codex -')),
      'regular-file alias must be inspected from the stopped tested container');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('startup child assertions fail on the first wrong sentinel or alias', () => {
  const source = readFileSync(startup, 'utf8');
  const rootBlock = source.match(/docker_cmd exec --user 0:0 "\$healthy" sh -lc '\n([\s\S]*?)\n'/)?.[1];
  const runtimeBlock = source.match(/docker_cmd exec --user 1026:100 "\$healthy" sh -lc '\n([\s\S]*?)\n'/)?.[1];
  assert.ok(rootBlock, 'missing healthy root assertion block');
  assert.ok(runtimeBlock, 'missing healthy runtime assertion block');

  const wrongSentinel = spawnSync(bash, ['-c', `stat() { printf '777:9:9\\n'; }
grep() { return 0; }
${rootBlock}`]);
  assert.notEqual(wrongSentinel.status, 0, 'wrong sentinel mode/owner must fail immediately');

  const firstAliasWrong = spawnSync(bash, ['-c', `readlink() {
  case "$1" in /home/claude/.codex) printf '/wrong-target\\n' ;; *) printf '/external/%s\\n' "\${1##*.}" ;; esac
}
test() { if [ "$1" = -d ]; then return 0; fi; builtin test "$@"; }
${runtimeBlock}`]);
  assert.notEqual(firstAliasWrong.status, 0, 'first CLI alias mismatch must not be masked by later checks');
});
