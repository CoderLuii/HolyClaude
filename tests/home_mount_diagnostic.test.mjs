import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const entrypoint = readFileSync('scripts/entrypoint.sh', 'utf8');
const configuration = readFileSync('docs/configuration.md', 'utf8');
const troubleshooting = readFileSync('docs/troubleshooting.md', 'utf8');

test('SSH state example separates the service mount from the named-volume declaration', () => {
  const section = troubleshooting.split('### SSH host key changed after container recreate')[1].split('\n---')[0];
  const yaml = section.match(/```yaml\n([\s\S]*?)\n```/)[1];
  assert.match(yaml, /^services:\n  holyclaude:\n    volumes:\n      - holyclaude-ssh:\/var\/lib\/holyclaude-ssh/m);
  assert.match(yaml, /^volumes:\n  holyclaude-ssh:/m);
  assert.equal([...yaml.matchAll(/^volumes:/gm)].length, 1);
  assert.match(troubleshooting, /A volume name alone does not guarantee local storage/);
});

test('entrypoint fails early when a home mount hides the image-owned Claude executable', () => {
  const diagnostic = entrypoint.indexOf('# ---------- Verify image-owned executables ----------');
  const uidRemapping = entrypoint.indexOf('# ---------- UID/GID remapping ----------');
  const persistence = entrypoint.indexOf('# ---------- Persist ~/.claude.json (every boot) ----------');

  assert.notEqual(diagnostic, -1);
  assert.notEqual(uidRemapping, -1);
  assert.ok(diagnostic < uidRemapping);
  assert.ok(diagnostic < persistence);
  assert.match(entrypoint, /CLAUDE_EXECUTABLE="\$CLAUDE_HOME\/\.local\/bin\/claude"/);
  assert.match(entrypoint, /if \[ ! -x "\$CLAUDE_EXECUTABLE" \]/);
  assert.match(entrypoint, /bind mount over \/home or \/home\/claude can hide it/);
  assert.match(entrypoint, /mount only \/home\/claude\/\.claude and \/workspace/);
  assert.match(entrypoint, /does not download or reinstall Claude Code at startup/);
  assert.match(entrypoint, /exit 1/);
});

test('documentation keeps application files image-owned and maps persistent state selectively', () => {
  for (const documentation of [configuration, troubleshooting]) {
    assert.match(documentation, /Do not mount `\/home` or `\/home\/claude`/);
    assert.match(documentation, /`\/home\/claude\/\.local`.*image-owned/);
    assert.match(documentation, /`\/home\/claude\/\.codex`.*`\.claude\/\.codex`/);
    assert.match(documentation, /`\/home\/claude\/\.gemini`.*`\.claude\/\.gemini`/);
    assert.match(documentation, /`\/home\/claude\/\.cursor`.*`\.claude\/\.cursor`/);
    assert.match(documentation, /`\/home\/claude\/\.bash_aliases`.*`\.claude\/\.bash_aliases`/);
    assert.match(documentation, /`\/home\/claude\/\.claude\.json`.*`\.\/data\/claude\/\.claude\.json\.persist`/);
    assert.match(documentation, /`\/home\/claude\/\.cloudcli`.*named volume/);
    assert.match(documentation, /`\/workspace`/);
  }
});
