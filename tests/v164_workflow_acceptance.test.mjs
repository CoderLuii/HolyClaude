import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

test('v1.6.4 release-specific acceptance remains preserved as historical evidence', () => {
  for (const path of [
    'security/v1.6.4-accepted-risk.json',
    'security/v1.6.4-release-security-deferral.json',
    'scripts/evaluate-release-security-deferral.mjs',
  ]) assert.equal(existsSync(path), true, `${path} must remain preserved`);

  const accepted = JSON.parse(readFileSync('security/v1.6.4-accepted-risk.json', 'utf8'));
  const deferral = JSON.parse(readFileSync('security/v1.6.4-release-security-deferral.json', 'utf8'));
  assert.equal(accepted.release, 'v1.6.4');
  assert.equal(deferral.release, 'v1.6.4');
  assert.equal(accepted.approvedBy, 'CoderLuii');
  assert.equal(deferral.expiresAt, '2026-10-04');
});

test('historical v1.6.4 decisions do not become the active release workflow policy', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  assert.doesNotMatch(workflow, /evaluate-release-security-deferral\.mjs/);
  assert.doesNotMatch(workflow, /--accepted-risk-manifest security\/v1\.6\.4-accepted-risk\.json/);
  assert.match(workflow, /evaluate-upstream-dependency-report\.mjs/);
  assert.match(workflow, /security\/upstream-dependency-policy\.json/);
});
