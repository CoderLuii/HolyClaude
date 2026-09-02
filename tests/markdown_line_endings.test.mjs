import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function trackedMarkdownFiles() {
  const result = spawnSync('git', ['ls-files', '-z', '--', '*.md'], {
    cwd: process.cwd(),
    encoding: 'buffer',
  });

  assert.equal(result.status, 0, result.stderr.toString('utf8'));
  return result.stdout
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

test('.gitattributes enforces LF for Markdown files', () => {
  const attributes = readFileSync('.gitattributes', 'utf8');
  assert.match(attributes, /^\*\.md text eol=lf$/m);

  const result = spawnSync('git', ['check-attr', 'text', 'eol', '--', 'docs/troubleshooting.md'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /docs\/troubleshooting\.md: text: set/);
  assert.match(result.stdout, /docs\/troubleshooting\.md: eol: lf/);
});

test('tracked Markdown files contain no carriage-return bytes', () => {
  const filesWithCarriageReturns = trackedMarkdownFiles().filter((file) =>
    readFileSync(file).includes(0x0d));

  assert.deepEqual(filesWithCarriageReturns, []);
});
