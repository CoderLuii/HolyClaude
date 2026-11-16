import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyVersionCacheProbe(log) {
  if (typeof log !== 'string') throw new Error('cache probe log must be text');
  const vertices = new Set(); const cached = new Set(); const executed = new Set();
  for (const line of log.replaceAll('\r\n', '\n').split('\n')) {
    const run = /^#(\d+) \[[^\]]+\] RUN /.exec(line);
    if (run) vertices.add(run[1]);
    const hit = /^#(\d+) CACHED\s*$/.exec(line);
    if (hit) cached.add(hit[1]);
    const execution = /^#(\d+) (?:DONE(?:\s|$)|ERROR:|[0-9]+\.[0-9]+\s)/.exec(line);
    if (execution) executed.add(execution[1]);
  }
  if (!vertices.size) throw new Error('cache probe contains no RUN vertices');
  const hits = [...vertices].filter(id => cached.has(id) && !executed.has(id));
  if (hits.length !== vertices.size) throw new Error(`cache probe has uncached or unproven RUN vertices: ${[...vertices].filter(id => !hits.includes(id)).join(', ')}`);
  return { runVertices: vertices.size, cachedRunVertices: hits.length, allCached: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('usage: node scripts/verify-version-cache-probe.mjs LOG_FILE');
    process.stdout.write(`${JSON.stringify(verifyVersionCacheProbe(readFileSync(process.argv[2], 'utf8')))}\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
