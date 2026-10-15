import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const productFacts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));

const wranglerRuntimeTreeChecks = [
  `require('/usr/local/lib/node_modules/wrangler/package.json').dependencies.miniflare\")\" \"5.20261012.0-beta\"`,
  `require('/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json').version\")\" \"5.20261012.0-beta\"`,
  `require('/usr/local/lib/node_modules/wrangler/package.json').dependencies.workerd\")\" \"1.20261012.1\"`,
  `require.resolve('workerd/package.json', { paths: ['/usr/local/lib/node_modules/wrangler'] })).version\")\" \"1.20261012.1\"`,
  `require('/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json').dependencies.workerd\")\" \"1.20261012.1\"`,
  `require('/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json').dependencies.undici\")\" \"7.29.1\"`,
  `require('/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json').dependencies.sharp\")\" \"0.35.5\"`,
  `require('/usr/local/lib/node_modules/wrangler/node_modules/sharp').versions.vips\")\" \"8.18.7\"`,
  `require('/usr/local/lib/node_modules/wrangler/node_modules/sharp').versions.heif\")\" \"1.23.5\"`,
];

const upgradedPackages = new Map([
  ['npm', '12.2.0'],
  ['tsx', '4.23.15'],
  ['pnpm', '12.11.2'],
  ['vite', '8.3.4'],
  ['eslint', '10.12.0'],
  ['prettier', '3.9.10'],
  ['@google/gemini-cli', '0.64.0'],
  ['@openai/codex', '0.162.1'],
  ['opencode-ai', '1.19.0'],
  ['wrangler', '4.151.0'],
  ['drizzle-kit', '0.31.11'],
]);

function packageInventoryPattern(name, version) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedVersion = version.replaceAll('.', '\\.');
  return new RegExp(`(?:['\"]${escapedName}['\"]|${escapedName}):\\s*['\"]${escapedVersion}['\"]`);
}

test('pins the reviewed npm CLI and developer tool upgrades', () => {
  for (const [name, version] of upgradedPackages) {
    assert.ok(dockerfile.includes(`${name}@${version}`), `Dockerfile should pin ${name}@${version}`);
    assert.match(
      runtimeChecks,
      packageInventoryPattern(name, version),
      `runtime package inventory should assert ${name}@${version}`,
    );
  }
});

test('keeps public AI CLI facts synchronized with the image pins', () => {
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'gemini-cli')?.version, '0.64.0');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'openai-codex')?.version, '0.162.1');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'opencode')?.version, '1.19.0');
});

test('pins reviewed overlay owner versions', () => {
  for (const [name, version] of [
    ['vercel', '63.1.2'],
    ['netlify-cli', '27.12.1'],
    ['@earendil-works/pi-coding-agent', '0.85.1'],
  ]) {
    assert.ok(dockerfile.includes(`${name}@${version}`), `${name} should stay at reviewed overlay owner ${version}`);
  }
});

test('binds Wrangler 4.151.0 to its reviewed Miniflare runtime tree', () => {
  for (const check of wranglerRuntimeTreeChecks) {
    assert.ok(runtimeChecks.includes(check), `runtime checks should preserve ${check}`);
  }

  for (const mutation of [
    ['5.20261012.0-beta', '5.20261006.1-alpha'],
    ['1.20261012.1', '1.20261006.1'],
    ['/usr/local/lib/node_modules/wrangler/node_modules/miniflare/package.json', '/tmp/miniflare/package.json'],
  ]) {
    const mutatedChecks = runtimeChecks.replaceAll(...mutation);
    assert.ok(
      wranglerRuntimeTreeChecks.some((check) => !mutatedChecks.includes(check)),
      `runtime contract should reject mutation ${mutation.join(' -> ')}`,
    );
  }
});
