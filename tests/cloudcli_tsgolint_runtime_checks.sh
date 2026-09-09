#!/usr/bin/env bash
set -Eeuo pipefail

cloudcli_root=/usr/local/lib/node_modules/@cloudcli-ai/cloudcli

reject_path() {
  local path="$1"
  if test -e "$path" || test -L "$path"; then
    echo "unexpected production tsgolint path: $path" >&2
    exit 1
  fi
}

reject_path "$cloudcli_root/node_modules/oxlint-tsgolint"
reject_path "$cloudcli_root/node_modules/@oxlint-tsgolint"
reject_path "$cloudcli_root/node_modules/.bin/tsgolint"
test "$(cloudcli --version)" = '1.37.3'

report_path="$(mktemp)"
trap 'rm -f "$report_path"' EXIT
timeout --signal=TERM --kill-after=5s 60s env REACT_DOCTOR_PARALLEL=1 \
  "$cloudcli_root/node_modules/.bin/react-doctor" \
  "$cloudcli_root/server" \
  --lint \
  --no-dead-code \
  --no-supply-chain \
  --no-score \
  --yes \
  --no-parallel \
  --max-duration 30 \
  --blocking none \
  --json \
  --json-compact \
  --json-out "$report_path"
node --input-type=module - "$report_path" <<'NODE'
// BEGIN_REPORT_VALIDATOR
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
if (report.ok !== true) throw new Error('React Doctor lint did not complete successfully');
if (report.version !== '0.9.12') throw new Error(`unexpected React Doctor version: ${report.version}`);
if ('skippedProjects' in report && (!Array.isArray(report.skippedProjects) || report.skippedProjects.length !== 0)) {
  throw new Error('React Doctor skipped one or more projects');
}
if (!Array.isArray(report.projects) || report.projects.length !== 1) {
  throw new Error(`expected exactly one React Doctor project, got ${report.projects?.length ?? 'invalid'}`);
}
const [project] = report.projects;
if (project.directory !== '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/server') {
  throw new Error(`unexpected React Doctor project directory: ${project.directory}`);
}
if (project.complete !== true) throw new Error('React Doctor project scan was partial');
if (!Array.isArray(project.skippedChecks) || project.skippedChecks.some((check) => typeof check !== 'string' || check.toLowerCase().includes('lint'))) {
  throw new Error('React Doctor skipped lint');
}
if (!Number.isInteger(project.scannedFileCount) || project.scannedFileCount <= 0) {
  throw new Error(`invalid React Doctor scanned file count: ${project.scannedFileCount}`);
}
if (!Number.isInteger(project.analyzedFileCount) || project.analyzedFileCount <= 0) {
  throw new Error(`invalid React Doctor analyzed file count: ${project.analyzedFileCount}`);
}
if (!Array.isArray(project.analyzedFiles) || !project.analyzedFiles.includes('index.ts')) {
  throw new Error('React Doctor did not analyze server/index.ts');
}
// END_REPORT_VALIDATOR
NODE

printf '%s\n' 'CloudCLI production tsgolint omission passed; optional type-aware and type-check modes are not packaged'
