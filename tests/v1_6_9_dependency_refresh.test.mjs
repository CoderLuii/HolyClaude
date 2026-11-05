import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');

test('the paired official Playwright update binds both bundled driver architectures', () => {
  assert.match(dockerfile, /playwright@1\.64\.1/);
  assert.match(dockerfile, /playwright==1\.64\.1/);
  assert.match(immutableInputs, /driver-node-version: 24\.22\.1/);
  assert.match(immutableInputs, /amd64-driver-node-sha256: e32e2d16081cf644f88392934288086e7662529d0d43277c34f7aad2207cfafb/);
  assert.match(immutableInputs, /arm64-driver-node-sha256: c8c5721679d8d1a09e9987e345d5f9a64899bb85f7a384783ba8a93e6e62348a/);
  assert.doesNotMatch(dockerfile, /PLAYWRIGHT_NODEJS_PATH|playwright\/driver\/node/);
});

test('the official LTS runtime update leaves the retained custom builders pinned', () => {
  assert.match(dockerfile, /FROM node:26\.13\.0-bookworm-slim@sha256:bc0a2afd3b74ce12222fc8bab99271e66257f021078f5f4a5d687a77d280c1d9/);
  assert.match(dockerfile, /FROM golang:1\.27\.1-bookworm@sha256:69a7b9788769bec032d238959b61854e9ae87f57be9029ec04e9885fabf99195 AS esbuild-builder/);
  assert.match(dockerfile, /FROM node:26\.9\.0-bookworm-slim@sha256:c8fedd782bcd1b68d8a7d1ed2577b5f820eba820871323f605292651ff11e3c6 AS ffmpeg-security-builder/);
  assert.match(dockerfile, /ARG CLOUDCLI_ACCOUNT_MANAGEMENT_ARTIFACT_SHA256=545b926cd4b48afe9aa20a544782f6160e8631fe77f51f12d3dd0c92e187ccb2/);
});

test('stable APIs and retained overlay owners are preserved', () => {
  for (const pin of [
    'json-server@0.17.4',
    'prisma@7.10.1',
    'vercel@63.1.2',
    'netlify-cli@27.16.2',
    '@earendil-works/pi-coding-agent@0.85.1',
    'ARG CLOUDCLI_VERSION=1.37.3',
  ]) assert.ok(dockerfile.includes(pin), `missing retained input ${pin}`);
});
