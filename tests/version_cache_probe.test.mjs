import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const helper = await import('../scripts/verify-version-cache-probe.mjs').catch(() => ({}));
test('all RUN vertices require explicit CACHED results', () => {
  assert.equal(typeof helper.verifyVersionCacheProbe, 'function');
  assert.deepEqual(helper.verifyVersionCacheProbe('#8 [builder 2/3] RUN apt-get update\n#8 CACHED\n#9 [stage-1 5/6] RUN echo hello && \\\n#9     echo wrapped\n#9 CACHED\n'), { runVertices: 2, cachedRunVertices: 2, allCached: true });
});
test('concurrent stage output and repeated vertex headers do not inflate counts', () => {
  assert.deepEqual(helper.verifyVersionCacheProbe('#3 [one 2/3] RUN first\n#4 [two 4/5] RUN second\n#4 CACHED\n#3 [one 2/3] RUN first\n#3 CACHED\n'), { runVertices: 2, cachedRunVertices: 2, allCached: true });
});
for (const [label, log] of [
  ['uncached RUN', '#1 [stage 1/2] RUN first\n#1 CACHED\n#2 [stage 2/2] RUN second\n#2 DONE 1.0s\n'],
  ['missing RUN result', '#1 [stage 1/1] RUN first\n'],
  ['conflicting cached and executed statuses', '#1 [stage 1/1] RUN first\n#1 CACHED\n#1 DONE 0.2s\n'],
  ['empty output', ''],
  ['unrelated cached output', '#1 [internal] load metadata\n#1 CACHED\n'],
  ['malformed vertex', '#a [stage] RUN first\n#a CACHED\n'],
]) test(`rejects ${label}`, () => assert.throws(() => helper.verifyVersionCacheProbe(log)));

test('CLI emits JSON proof and fails on uncached execution', () => {
  const root = mkdtempSync(join(tmpdir(), 'version-cache-probe-'));
  try {
    const path = join(root, 'probe.log');
    writeFileSync(path, '#7 [stage 1/1] RUN echo verified\n#7 CACHED\n');
    const cli = resolve('scripts/verify-version-cache-probe.mjs');
    let result = spawnSync(process.execPath, [cli, path], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).cachedRunVertices, 1);
    writeFileSync(path, readFileSync(path, 'utf8').replace('CACHED', 'DONE 1.0s'));
    result = spawnSync(process.execPath, [cli, path], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('hosted version probe is isolated, benchmark-only and cannot publish', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  const start = workflow.indexOf('      - name: Probe version-only cache reuse');
  const probe = workflow.slice(start, workflow.indexOf('      - name: Upload version-only cache proof', start));
  assert.ok(start > 0);
  assert.match(probe, /inputs\.mode == 'benchmark'/);
  assert.match(probe, /docker buildx create --name "\$probe_builder" --driver docker-container/);
  assert.match(probe, /--build-arg HOLYCLAUDE_VERSION=0\.0\.0/);
  assert.match(probe, /--cache-from.*holyclaude-buildcache/);
  assert.match(probe, /--output type=cacheonly/);
  assert.match(probe, /node scripts\/verify-version-cache-probe\.mjs/);
  assert.doesNotMatch(probe, /--push\b|--load\b|--cache-to\b|--use\b/);
});
