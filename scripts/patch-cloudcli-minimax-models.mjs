import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const modulePath = 'server/modules/providers/list/opencode/opencode-models.provider';
const targets = [path.join(root, `${modulePath}.ts`), path.join(root, `dist-server/${modulePath}.js`)];
const current = "{ value: 'opencode/minimax-m3', label: 'MiniMax M3', description: 'OpenCode Zen' },";
const flash = "{ value: 'opencode/minimax-m3.1-flash-free', label: 'MiniMax M3.1 Flash', description: 'OpenCode Zen · Free' },";
const retired = [
  "{ value: 'opencode/minimax-m2.7', label: 'MiniMax M2.7', description: 'OpenCode Zen' },",
  "{ value: 'opencode/minimax-m2.5', label: 'MiniMax M2.5', description: 'OpenCode Zen' },",
  "{ value: 'opencode-go/minimax-m2.7', label: 'MiniMax M2.7', description: 'OpenCode Go' },",
];

// Only change immutable suggestions. Custom rows and session selections are
// merged/resolved separately by CloudCLI and must retain their exact model IDs.
const updates = targets.map((target) => {
  const source = readFileSync(target, 'utf8');
  const count = (value) => source.split(value).length - 1;
  const alreadyPatched = count(flash) === 1 && retired.every((value) => count(value) === 0);
  if (count(current) !== 1 || (!alreadyPatched && (count(flash) !== 0 || retired.some((value) => count(value) !== 1)))) {
    throw new Error(`[patch] CloudCLI MiniMax catalog anchors not found: ${target}`);
  }
  if (alreadyPatched) return [target, source];
  const indent = source.slice(source.lastIndexOf('\n', source.indexOf(current)) + 1, source.indexOf(current));
  let updated = source.replace(current, `${flash}\n${indent}${current}`);
  for (const value of retired) {
    updated = updated.split('\n').filter((line) => line.trim() !== value).join('\n');
  }
  return [target, updated];
});

// Validate both representations before writing either one.
for (const [target, updated] of updates) writeFileSync(target, updated);
console.log('[patch] CloudCLI MiniMax suggestions updated (source and runtime)');
