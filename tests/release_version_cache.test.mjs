import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8').replaceAll('\r\n', '\n');

test('release version metadata cannot invalidate filesystem build instructions', () => {
  const version = dockerfile.indexOf('ARG HOLYCLAUDE_VERSION=');
  const entrypoint = dockerfile.indexOf('ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]');
  assert.ok(version > entrypoint, 'release version ARG must follow the final entrypoint');
  assert.doesNotMatch(dockerfile.slice(version), /^RUN\b/m);
  assert.equal((dockerfile.match(/HOLYCLAUDE_VERSION/g) ?? []).length, 2, 'release version may only define the ARG and OCI version label');
});

test('release metadata preserves the version default and OCI source identity', () => {
  assert.equal((dockerfile.match(/^ARG HOLYCLAUDE_VERSION=1\.6\.9$/gm) ?? []).length, 1);
  assert.equal((dockerfile.match(/^LABEL org\.opencontainers\.image\.source=https:\/\/github\.com\/CoderLuii\/HolyClaude$/gm) ?? []).length, 1);
  assert.equal((dockerfile.match(/^LABEL org\.opencontainers\.image\.version=\$\{HOLYCLAUDE_VERSION\}$/gm) ?? []).length, 1);
  const metadata = dockerfile.slice(dockerfile.indexOf('ARG HOLYCLAUDE_VERSION='));
  assert.match(metadata, /^ARG HOLYCLAUDE_VERSION=1\.6\.9\nLABEL org\.opencontainers\.image\.source=https:\/\/github\.com\/CoderLuii\/HolyClaude\nLABEL org\.opencontainers\.image\.version=\$\{HOLYCLAUDE_VERSION\}\n$/);
});
