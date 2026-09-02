import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const smoke = readFileSync('tests/docker_ssh_mosh_smoke.sh', 'utf8');
const cleanup = `${smoke.slice(smoke.indexOf('cleanup() {'), smoke.indexOf('\n}\n\ndump_debug'))}\n}`;

function runCleanup({ originalStatus, active, rmStatuses, normalizeStatus = 0, fallbackStatus = 0 }) {
  const script = `
set +e
${cleanup}
CONTAINER=test-container
TMP_DIR=/tmp/holyclaude-cleanup-fixture
IMAGE=test-image
ACTIVE=${active ? 1 : 0}
NORMALIZE_STATUS=${normalizeStatus}
FALLBACK_STATUS=${fallbackStatus}
RM_STATUSES='${rmStatuses.join(' ')}'
RM_CALL=0
LOG_FILE="$(mktemp)"
docker_bind_source() { printf '%s' "$1"; }
docker_cmd() {
  printf 'docker:%s\\n' "$1" >> "$LOG_FILE"
  case "$1" in
    ps) [ "$ACTIVE" -eq 1 ] && printf '%s\\n' "$CONTAINER"; return 0 ;;
    exec) return "$NORMALIZE_STATUS" ;;
    rm) return 0 ;;
    run) return "$FALLBACK_STATUS" ;;
  esac
}
rm() {
  RM_CALL=$((RM_CALL + 1))
  printf 'rm:%s\\n' "$RM_CALL" >> "$LOG_FILE"
  set -- $RM_STATUSES
  eval "status=\\\${$RM_CALL:-0}"
  return "$status"
}
(exit ${originalStatus})
cleanup
cleanup_result=$?
cat "$LOG_FILE"
exit "$cleanup_result"
`;
  const result = spawnSync('bash', [], { encoding: 'utf8', input: script });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test('SSH smoke normalizes root-owned bind state before removing its container', () => {
  const normalize = cleanup.indexOf('docker_cmd exec --user 0:0');
  const removeContainer = cleanup.indexOf('docker_cmd rm -f "$CONTAINER"');

  assert.ok(normalize >= 0, 'cleanup must normalize the active bind mount as root');
  assert.ok(removeContainer > normalize, 'permission normalization must precede container removal');
  assert.match(cleanup, /chmod -R a\+rwX \/var\/lib\/holyclaude-ssh/);
});

test('SSH smoke has a root cleanup fallback for stopped-container error paths', () => {
  assert.match(cleanup, /if ! rm -rf "\$TMP_DIR" 2>\/dev\/null; then/);
  assert.match(cleanup, /docker_cmd run --rm[\s\S]*--user 0:0[\s\S]*target=\/cleanup/);
  assert.match(cleanup, /chmod -R a\+rwX \/cleanup/);
  assert.match(cleanup, /rm -rf "\$TMP_DIR" \|\| cleanup_status=\$\?/);
});

test('product failure remains authoritative when cleanup succeeds', () => {
  const result = runCleanup({ originalStatus: 7, active: true, rmStatuses: [0] });
  assert.equal(result.status, 7, result.stderr);
  assert.equal(result.stderr, '');
});

test('product failure remains authoritative when fallback cleanup also fails', () => {
  const result = runCleanup({ originalStatus: 7, active: false, rmStatuses: [1], fallbackStatus: 9 });
  assert.equal(result.status, 7, result.stderr);
  assert.match(result.stderr, /cleanup failed with status 9/);
});

test('cleanup failure fails a product-successful smoke', () => {
  const result = runCleanup({ originalStatus: 0, active: false, rmStatuses: [1], fallbackStatus: 9 });
  assert.equal(result.status, 9, result.stderr);
  assert.match(result.stderr, /cleanup failed with status 9/);
});

test('stopped-container cleanup retries host removal only after fallback normalization', () => {
  const result = runCleanup({ originalStatus: 0, active: false, rmStatuses: [1, 0] });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /rm:1[\s\S]*docker:run[\s\S]*rm:2/);
  assert.equal(result.stderr, '');
});
