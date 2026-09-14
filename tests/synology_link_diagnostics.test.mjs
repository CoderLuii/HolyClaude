import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const troubleshooting = readFileSync('docs/troubleshooting.md', 'utf8');
const diagnosticBlock = troubleshooting.match(
  /```bash\n(# HolyClaude stopped-container link-loop diagnostic\n[\s\S]*?)\n```/,
)?.[1];
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

function shellPath(path) {
  return process.platform === 'win32'
    ? path.replaceAll('\\', '/').replace(/^\/?([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`)
    : path;
}

function shellQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function snapshot(path) {
  if (!existsSync(path) && !lstatSafe(path)) return null;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return { type: 'link', target: readlinkSync(path) };
  if (stat.isDirectory()) {
    return {
      type: 'directory',
      entries: Object.fromEntries(readdirSync(path).sort().map((name) => [name, snapshot(join(path, name))])),
    };
  }
  return { type: 'file', contents: readFileSync(path, 'utf8') };
}

function lstatSafe(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function makeFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-link-diagnostic-'));
  const logRoot = mkdtempSync(join(tmpdir(), 'holyclaude-link-diagnostic-log-'));
  const source = join(root, 'bind-source');
  t.after(() => rmSync(logRoot, { recursive: true, force: true }));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(source, '.codex'), { recursive: true });
  writeFileSync(join(source, 'source-marker'), 'source-marker\n');
  writeFileSync(join(source, '.codex', 'codex-marker'), 'codex-marker\n');
  return { root, source, dockerLog: join(logRoot, 'docker.log') };
}

function runDiagnostic(fixture, { mountRecords, running = 'false' } = {}) {
  assert.ok(diagnosticBlock, 'documented stopped-container link-loop diagnostic is missing');
  if (process.platform === 'win32') {
    assert.ok(existsSync(bash), `Git Bash is required at ${bash}`);
  }
  const dockerLog = fixture.dockerLog;
  const mounts = mountRecords ?? [`bind\t${shellPath(fixture.source)}\t/home/claude/.claude`];
  const variables = [
    `fixture_running=${shellQuote(running)}`,
    `fixture_mounts=${shellQuote(mounts.join('\n'))}`,
    `fixture_docker_log=${shellQuote(shellPath(dockerLog))}`,
  ].join('\n');
  const dockerStub = `docker() {
  printf '%s\\n' "$*" >> "$fixture_docker_log"
  if [ "$1" = inspect ] && [ "$2" = --format ]; then
    case "$3" in
      *State.Running*) printf '%s\\n' "$fixture_running" ;;
      *Mounts*) printf '%s\\n' "$fixture_mounts" ;;
      *) return 91 ;;
    esac
    return 0
  fi
  return 92
}`;
  const before = snapshot(fixture.root);
  const result = spawnSync(bash, ['-c', `${variables}\n${dockerStub}\n${diagnosticBlock}`], {
    encoding: 'utf8',
    env: process.env,
  });
  const calls = existsSync(dockerLog) ? readFileSync(dockerLog, 'utf8').trim().split('\n').filter(Boolean) : [];
  const after = snapshot(fixture.root);
  assert.deepEqual(after, before, 'diagnostic changed fixture contents or topology');
  assert.ok(calls.every((call) => call.startsWith('inspect --format ')), calls.join('\n'));
  return { ...result, calls };
}

function replaceCodexWithLink(fixture, target) {
  const codex = join(fixture.source, '.codex');
  rmSync(codex, { recursive: true });
  try {
    symlinkSync(target, codex, 'dir');
  } catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') return false;
    throw error;
  }
  return true;
}

test('troubleshooting has a dedicated Synology link-loop diagnostic with explicit safety boundaries', () => {
  assert.match(troubleshooting, /### `Too many levels of symbolic links` on Synology/);
  assert.match(troubleshooting, /v1\.6\.0 and later[\s\S]*before UID\/GID changes/);
  assert.match(troubleshooting, /does not repair existing link loops/);
  assert.match(troubleshooting, /exact layout and origin reported in issue #97 are not yet known/);
  assert.match(troubleshooting, /image digest/);
  assert.match(troubleshooting, /sanitized startup diagnostic/);
  assert.doesNotMatch(diagnosticBlock ?? '', /docker cp/);
  assert.doesNotMatch(diagnosticBlock ?? '', /docker (?:start|restart|stop|rm|compose|pull|run|exec)|\b(?:rm|mv|ln|chown|chmod)\b/);
});

test('diagnostic accepts one stopped-container bind mount and leaves real state unchanged', (t) => {
  const fixture = makeFixture(t);
  const result = runDiagnostic(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Verified bind source:/);
  assert.match(result.stdout, /codex-marker|\.codex/);
  assert.equal(result.calls.length, 2);
});

for (const scenario of ['self-loop', 'two-node-loop']) {
  test(`diagnostic reports a ${scenario} without following or changing it`, (t) => {
    const fixture = makeFixture(t);
    if (scenario === 'self-loop') {
      if (!replaceCodexWithLink(fixture, '.codex')) {
        t.skip('directory symlink creation requires elevated Windows privileges');
        return;
      }
    } else {
      const peer = join(fixture.source, 'codex-peer');
      try {
        symlinkSync('.codex', peer, 'dir');
      } catch (error) {
        if (process.platform === 'win32' && error.code === 'EPERM') {
          t.skip('directory symlink creation requires elevated Windows privileges');
          return;
        }
        throw error;
      }
      if (!replaceCodexWithLink(fixture, 'codex-peer')) {
        t.skip('directory symlink creation requires elevated Windows privileges');
        return;
      }
    }

    const result = runDiagnostic(fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, scenario === 'self-loop' ? /\.codex$/m : /codex-peer/);
  });
}

test('diagnostic rejects a dangling bind source before child inspection', (t) => {
  const fixture = makeFixture(t);
  const missing = join(fixture.root, 'missing-source');
  const result = runDiagnostic(fixture, {
    mountRecords: [`bind\t${shellPath(missing)}\t/home/claude/.claude`],
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Bind source does not exist/);
  assert.equal(result.calls.length, 2);
});

test('diagnostic rejects a symlinked bind-source parent before traversing the source', (t) => {
  const fixture = makeFixture(t);
  const realParent = join(fixture.root, 'real-parent');
  const linkedParent = join(fixture.root, 'linked-parent');
  const source = join(realParent, 'source');
  mkdirSync(source, { recursive: true });
  writeFileSync(join(source, 'marker'), 'parent-marker\n');
  try {
    symlinkSync(realParent, linkedParent, process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') {
      t.skip('directory symlink creation requires elevated Windows privileges');
      return;
    }
    throw error;
  }

  const result = runDiagnostic(fixture, {
    mountRecords: [`bind\t${shellPath(join(linkedParent, 'source'))}\t/home/claude/.claude`],
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing symbolic link in bind source path/);
  assert.equal(result.calls.length, 2);
});

for (const [name, mountRecords, message] of [
  ['missing', [], /exactly one mount at \/home\/claude\/\.claude; found 0/],
  ['multiple', [
    'bind\t/tmp/first\t/home/claude/.claude',
    'bind\t/tmp/second\t/home/claude/.claude',
  ], /exactly one mount at \/home\/claude\/\.claude; found 2/],
  ['wrong-type', ['volume\tholyclaude-data\t/home/claude/.claude'], /Expected a bind mount/],
]) {
  test(`diagnostic rejects ${name} mount metadata without host traversal`, (t) => {
    const fixture = makeFixture(t);
    const result = runDiagnostic(fixture, { mountRecords });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
    assert.equal(result.calls.length, 2);
  });
}

test('diagnostic refuses a running container before mount or filesystem inspection', (t) => {
  const fixture = makeFixture(t);
  const result = runDiagnostic(fixture, { running: 'true' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Stop holyclaude before running this diagnostic/);
  assert.equal(result.calls.length, 1);
});
