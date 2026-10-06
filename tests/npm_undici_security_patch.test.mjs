import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const policy = readFileSync('security/immutable-inputs.yml', 'utf8');

test('keeps npm 12.2.0 official dependencies unmodified', () => {
  assert.match(dockerfile, /npm@12\.2\.0/);
  assert.doesNotMatch(dockerfile, /NPM_UNDICI_|BRACE_EXPANSION_/);
  const replacementBlocks = dockerfile.match(/replace_(?:nested_)?node_module [\s\S]*?;/g) ?? [];
  for (const block of replacementBlocks) {
    assert.doesNotMatch(block, /\/usr\/local\/lib\/node_modules\/npm\//);
  }
  assert.doesNotMatch(policy, /name: npm bundled undici|name: npm bundled brace-expansion|name: CloudCLI and npm ip-address nested package/);
  assert.match(policy, /name: CloudCLI ip-address nested package/);
});
