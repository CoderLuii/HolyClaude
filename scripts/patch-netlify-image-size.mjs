import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '/usr/local/lib/node_modules/netlify-cli/node_modules/image-size');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (manifest.name !== 'image-size' || manifest.version !== '2.0.2') {
  throw new Error(`expected image-size@2.0.2 at ${root}`);
}

const replacements = [
  {
    before: 'currentOffset = ispeBox.offset + ispeBox.size;',
    after: 'currentOffset = ispeBox.offset + (ispeBox.size > 0 ? ispeBox.size : 8);',
  },
  {
    before: 'offset = jxlpBox.offset + jxlpBox.size;',
    after: 'offset = jxlpBox.offset + (jxlpBox.size > 0 ? jxlpBox.size : 8);',
  },
  {
    before: 'imageOffset += imageHeader[1];',
    after: 'imageOffset += imageHeader[1] > 0 ? imageHeader[1] : 8;',
  },
];

const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (/\.(?:cjs|mjs)$/.test(entry.name)) files.push(path);
  }
}
collect(join(root, 'dist'));

const expectedAffected = [
  'dist/detector.cjs', 'dist/detector.mjs', 'dist/fromFile.cjs', 'dist/fromFile.mjs',
  'dist/index.cjs', 'dist/index.mjs', 'dist/lookup.cjs', 'dist/lookup.mjs',
  'dist/types/heif.cjs', 'dist/types/heif.mjs', 'dist/types/icns.cjs', 'dist/types/icns.mjs',
  'dist/types/index.cjs', 'dist/types/index.mjs', 'dist/types/jxl.cjs', 'dist/types/jxl.mjs',
];
const affected = files
  .filter((path) => replacements.some(({ before, after }) => {
    const source = readFileSync(path, 'utf8');
    return source.includes(before) || source.includes(after);
  }))
  .map((path) => path.slice(root.length + 1).replaceAll('\\', '/'))
  .sort();
if (JSON.stringify(affected) !== JSON.stringify(expectedAffected)) {
  throw new Error(`unexpected image-size@2.0.2 affected dist files: ${JSON.stringify(affected)}`);
}

for (const replacement of replacements) {
  const baselineCount = files.reduce(
    (count, path) => count + readFileSync(path, 'utf8').split(replacement.before).length - 1,
    0,
  );
  const patchedCount = files.reduce(
    (count, path) => count + readFileSync(path, 'utf8').split(replacement.after).length - 1,
    0,
  );
  if (!((baselineCount === 12 && patchedCount === 0) || (baselineCount === 0 && patchedCount === 12))) {
    throw new Error(`unexpected image-size@2.0.2 dist anchors: baseline=${baselineCount} patched=${patchedCount}`);
  }
  if (baselineCount === 12) {
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      if (source.includes(replacement.before)) {
        writeFileSync(path, source.replaceAll(replacement.before, replacement.after));
      }
    }
  }
}

// HEIF/JXL: upstream bdbe560bfd98af6feab93b46aed67f2f0a77e4d5 (PR #439).
// ICNS: upstream 0f6a6665a166c530ba126a8ab8608a0603cb49dc (PR #453).
console.log('[patch] Netlify image-size@2.0.2 progress guards applied');
