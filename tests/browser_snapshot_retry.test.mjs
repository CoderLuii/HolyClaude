import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const repoRootDocker = repoRoot.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);

const runFixture = (failures) => {
  const fixtureRoot = mkdtempSync(join(repoRoot, '.browser-snapshot-retry-'));
  try {
    const fixtureRelative = relative(repoRoot, fixtureRoot).replaceAll('\\', '/');
    const scriptPath = join(fixtureRoot, 'fixture.sh');
    const scriptRelative = relative(repoRoot, scriptPath).replaceAll('\\', '/');
    writeFileSync(scriptPath, `#!/usr/bin/env bash
set -eu
SENTINEL_ROOT=${JSON.stringify(fixtureRelative)}
mkdir -p "$SENTINEL_ROOT"
printf '0\\n' > "$SENTINEL_ROOT/calls"
api_mcp() {
  calls=$(($(cat "$SENTINEL_ROOT/calls") + 1))
  printf '%s\\n' "$calls" > "$SENTINEL_ROOT/calls"
  if [ "$calls" -le ${failures} ]; then
    printf '{"success":false,"error":"snapshot attempt failed"}\\n'
    printf 'attempt-%s diagnostic\\n' "$calls" >&2
  else
    printf '{"success":true,"data":{"text":"HolyClaude Browser Runtime Sentinel","session":{"screenshotDataUrl":"data:image/jpeg;base64,AA=="}}}\\n'
  fi
}
. tests/browser_snapshot_retry.sh
capture_browser_snapshot "$SENTINEL_ROOT/response.json" session-1 'HolyClaude Browser Runtime Sentinel'
`);
    const result = spawnSync(
      'docker',
      [
        'run', '--rm',
        '-v', `${repoRootDocker}:/repo`,
        '-w', '/repo',
        'node:26.7.0-bookworm-slim@sha256:cd565714d4da3e84bfd341e31448f81d47c6362198f152345297c9c1154e6341',
        'bash', scriptRelative,
      ],
      { cwd: repoRoot, encoding: 'utf8', timeout: 120000 },
    );
    const calls = Number(readFileSync(join(fixtureRoot, 'calls'), 'utf8').trim());
    const firstJson = readFileSync(join(fixtureRoot, 'browser-snapshot-attempt-1.json'), 'utf8');
    const firstStderr = readFileSync(join(fixtureRoot, 'browser-snapshot-attempt-1.stderr'), 'utf8');
    return { result, calls, firstJson, firstStderr };
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
};

test('snapshot retry preserves first semantic failure and succeeds on attempt two', () => {
  const { result, calls, firstJson, firstStderr } = runFixture(1);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls, 2);
  assert.match(firstJson, /snapshot attempt failed/);
  assert.match(firstStderr, /attempt-1 diagnostic/);
  assert.match(firstStderr, /snapshot attempt failed/);
});

test('snapshot retry stops after exactly two failed attempts', () => {
  const { result, calls, firstJson, firstStderr } = runFixture(2);
  assert.notEqual(result.status, 0);
  assert.equal(calls, 2);
  assert.match(result.stderr, /Browser MCP snapshot failed after 2 attempts/);
  assert.match(firstJson, /snapshot attempt failed/);
  assert.match(firstStderr, /attempt-1 diagnostic/);
});
