import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const productFacts = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8'));

const upgradedPackages = new Map([
  ['pnpm', '12.6.0'],
  ['vite', '8.3.1'],
  ['eslint', '10.11.0'],
  ['prettier', '3.9.9'],
  ['@google/gemini-cli', '0.61.0'],
  ['@openai/codex', '0.160.0'],
  ['opencode-ai', '1.18.32'],
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
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'gemini-cli')?.version, '0.61.0');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'openai-codex')?.version, '0.160.0');
  assert.equal(productFacts.aiClis.find((cli) => cli.id === 'opencode')?.version, '1.18.32');
});

test('retains overlay-bound tools at their reviewed owner versions', () => {
  for (const [name, version] of [
    ['npm', '12.0.2'],
    ['wrangler', '4.146.0'],
    ['vercel', '59.23.1'],
    ['netlify-cli', '27.8.0'],
    ['@earendil-works/pi-coding-agent', '0.85.1'],
  ]) {
    assert.ok(dockerfile.includes(`${name}@${version}`), `${name} should stay at reviewed overlay owner ${version}`);
  }
});
