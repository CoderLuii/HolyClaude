import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');

test('Vercel uses the selected official release without dependency replacements', () => {
  assert.match(dockerfile, /vercel@63\.1\.2\b/);
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
  assert.match(inputs, /name: Vercel CLI[\s\S]*?version: 63\.1\.2[\s\S]*?npm-integrity: "sha512-kD\/AKQVTV5Lwlg69fUNaW0OBGh6iSX42UTRrka10CtbOJDcxcqE8VoDRIuAsduGHiD3Hf90Ak9dX39nNzq8srA=="/);
  assert.doesNotMatch(inputs, /name: Vercel smol-toml nested package/);
});
