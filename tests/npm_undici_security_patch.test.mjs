import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const policy = readFileSync('security/immutable-inputs.yml', 'utf8');
const browserRuntime = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');

test('keeps npm 12.2.2 official dependencies unmodified', () => {
  assert.match(dockerfile, /npm@12\.2\.2/);
  assert.doesNotMatch(dockerfile, /NPM_UNDICI_|BRACE_EXPANSION_/);
  const replacementBlocks = dockerfile.match(/replace_(?:nested_)?node_module [\s\S]*?;/g) ?? [];
  for (const block of replacementBlocks) {
    assert.doesNotMatch(block, /\/usr\/local\/lib\/node_modules\/npm\//);
  }
  assert.doesNotMatch(policy, /name: npm bundled undici|name: npm bundled brace-expansion|name: CloudCLI and npm ip-address nested package/);
  assert.match(policy, /name: CloudCLI ip-address nested package/);
});

test('keeps npm and retained CloudCLI ip-address runtime expectations separate', () => {
  assert.match(browserRuntime, /'ip-address': '10\.7\.2'/);
  const npmIpAddress = browserRuntime.match(/\/usr\/local\/lib\/node_modules\/npm\/node_modules\/ip-address\/package\.json', 'utf8'\)\)\.version,\s*'([^']+)'/)?.[1];
  assert.equal(npmIpAddress, '10.7.5', 'npm runtime expectation must match the official npm 12.2.2 archive');
});
