import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('release guards distinguish the approved parent from the previous published tag', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8').replaceAll('\r\n', '\n');
  const start = workflow.indexOf('          baseline="');
  const end = workflow.indexOf('          if [[ "${GITHUB_REF_TYPE}" == "tag" ]]; then', start);
  assert.ok(start >= 0 && end > start);
  const guard = workflow.slice(start, end).replace(/^ {10}/gm, '');
  const approved = 'c24271654121cf9f34a24728e9aa2850a43cce55';
  const previous = 'c87a6587d7ccdadd04a7b1c1d2dd1215c1d4e908';
  assert.equal(guard.match(/^baseline="([0-9a-f]{40})"/m)?.[1], approved);
  assert.ok(guard.includes(`git rev-parse 'v1.6.9^{commit}')" = "${previous}"`));
  const subject = workflow.match(/^\s*test "\$\(git log -1 --format=%s\)" = "\$\{release\}"$/m)?.[0].trim();
  assert.ok(subject);
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-release-ref-'));
  function git(...args) {
    const result = spawnSync('git', ['-c', 'user.name=Release Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${join(root, 'no-hooks')}`, ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  try {
    git('init', '-q');
    writeFileSync(join(root, 'input'), 'previous release\n');
    git('add', 'input'); git('commit', '-qm', 'v1.6.9');
    const tag = git('rev-parse', 'HEAD'); git('tag', 'v1.6.9');
    writeFileSync(join(root, 'input'), 'workflow maintenance\n');
    git('add', 'input'); git('commit', '-qm', 'ci: release workflow');
    const parent = git('rev-parse', 'HEAD');
    writeFileSync(join(root, 'input'), 'next release\n');
    git('add', 'input'); git('commit', '-qm', 'v1.7.0');
    const script = `set -euo pipefail\nrelease=v1.7.0\n${subject}\n${guard.replaceAll(approved, parent).replaceAll(previous, tag)}`;
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
    const run = () => spawnSync(bash, ['-c', script], { cwd: root, encoding: 'utf8' });
    assert.equal(run().status, 0, 'maintenance after the previous tag must be allowed');
    git('tag', '-f', 'v1.6.9', parent);
    assert.notEqual(run().status, 0, 'a moved previous tag must be rejected');
    git('tag', '-f', 'v1.6.9', tag);
    git('commit', '--allow-empty', '-qm', 'v1.7.0');
    assert.notEqual(run().status, 0, 'a release from an unapproved immediate parent must be rejected');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
