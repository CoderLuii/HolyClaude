import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const productFacts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));

const upgradedPackages = new Map([
  ['npm', '12.2.0'],
  ['tsx', '4.23.15'],
  ['pnpm', '12.9.1'],
  ['vite', '8.3.2'],
  ['eslint', '10.12.0'],
  ['prettier', '3.9.9'],
  ['@google/gemini-cli', '0.62.0'],
  ['@openai/codex', '0.160.1'],
  ['opencode-ai', '1.18.34'],
  ['wrangler', '4.147.0'],
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
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'gemini-cli')?.version, '0.62.0');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'openai-codex')?.version, '0.160.1');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'opencode')?.version, '1.18.34');
});

test('retains overlay-bound tools at their reviewed owner versions', () => {
  for (const [name, version] of [
    ['vercel', '62.4.0'],
    ['netlify-cli', '27.8.0'],
    ['@earendil-works/pi-coding-agent', '0.85.1'],
  ]) {
    assert.ok(dockerfile.includes(`${name}@${version}`), `${name} should stay at reviewed overlay owner ${version}`);
  }
});
