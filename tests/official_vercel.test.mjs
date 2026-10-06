import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');

test('Vercel uses the selected official release without dependency replacements', () => {
  assert.match(dockerfile, /vercel@62\.4\.0\b/);
  for (const path of [
    'scripts/patch-global-node-tar.mjs',
    'scripts/patch-global-node-security-dependencies.mjs',
  ]) {
    assert.doesNotMatch(readFileSync(path, 'utf8'), /node_modules\/vercel/);
  }
  for (const replacement of dockerfile.matchAll(/(?:replace_(?:nested_|scoped_)?node_module|for target in)[\s\S]*?;\s*\\/g)) {
    assert.doesNotMatch(replacement[0], /node_modules\/vercel|\$VERCEL_ROOT/);
  }
});

test('official Vercel package provenance stays in the immutable inventory', () => {
  const inputs = readFileSync('security/immutable-inputs.yml', 'utf8');
  assert.match(inputs, /name: Vercel CLI[\s\S]*?version: 62\.4\.0[\s\S]*?npm-integrity: "sha512-5GCsUgVxZRS8o3REvA5hwn6hnw4PaSxGeKo1okEBM1X4Xw60ZcDZt22IxHGFx9mAfoa3jg\+a3Gtp8ZZFJNYyaA=="/);
  assert.doesNotMatch(inputs, /name: Vercel smol-toml nested package/);
});
