#!/usr/bin/env bash

validate_browser_snapshot_response() {
  local response="$1"
  local expected="$2"
  node - "$response" "$expected" <<'NODE'
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const expected = process.argv[3];
if (payload.success === false || payload.error) {
  console.error(payload.error || 'Browser MCP snapshot was not successful');
  process.exit(1);
}
if (!payload.data?.text?.includes(expected)) {
  console.error('Browser MCP snapshot did not include sentinel text');
  process.exit(1);
}
if (!payload.data?.session?.screenshotDataUrl?.startsWith('data:image/jpeg;base64,')) {
  console.error('Browser MCP snapshot did not include a screenshot data URL');
  process.exit(1);
}
NODE
}

capture_browser_snapshot() {
  local response="$1"
  local session_id="$2"
  local expected="$3"
  local snapshot_attempt
  local attempt_stderr

  for snapshot_attempt in 1 2; do
    attempt_stderr="$SENTINEL_ROOT/browser-snapshot-attempt-${snapshot_attempt}.stderr"
    if {
      api_mcp browser_snapshot "{\"sessionId\":\"$session_id\"}" > "$response" &&
        validate_browser_snapshot_response "$response" "$expected"
    } 2> "$attempt_stderr"; then
      return 0
    fi
    if [ "$snapshot_attempt" -eq 1 ]; then
      cp "$response" "$SENTINEL_ROOT/browser-snapshot-attempt-1.json"
    fi
  done

  echo "Browser MCP snapshot failed after 2 attempts" >&2
  return 1
}
