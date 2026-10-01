import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8').replaceAll('\r\n', '\n');

function metadataProgram() {
  const marker = '          POLICY_STATUS="${policy_status}" \\\n';
  const markerIndex = workflow.indexOf(marker);
  assert.ok(markerIndex >= 0, 'candidate policy status binding must exist');
  const startMarker = "          python3 - <<'PY'\n";
  const start = workflow.indexOf(startMarker, markerIndex) + startMarker.length;
  const end = workflow.indexOf('\n          PY', start);
  assert.ok(start >= startMarker.length && end > start, 'candidate metadata program must exist');
  return workflow.slice(start, end).replace(/^ {10}/gm, '');
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value)}\n`, 'utf8');
}

function runMetadataFixture({ includeDeferral = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-v164-workflow-acceptance-'));
  const imageDigest = `sha256:${'1'.repeat(64)}`;
  const rawSbom = JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    components: [{ licenses: [{ license: { id: 'Artistic-dist' } }] }],
  });
  const normalizedSbom = JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    components: [{ licenses: [{ license: { name: 'Artistic-dist' } }] }],
  });
  const grype = '{}\n';
  writeFileSync(join(root, 'grype.json'), grype);
  writeFileSync(join(root, 'sbom.cyclonedx.syft.json'), rawSbom);
  writeFileSync(join(root, 'sbom.cyclonedx.json'), normalizedSbom);
  writeJson(join(root, 'sbom.spdx.json'), { spdxVersion: 'SPDX-2.3', SPDXID: 'SPDXRef-DOCUMENT' });
  writeJson(join(root, 'sbom-license-normalization.json'), {
    schemaVersion: 1,
    inputSha256: sha256(rawSbom),
    outputSha256: sha256(normalizedSbom),
    normalizations: [{ id: 'Artistic-dist', count: 1 }],
  });
  const acceptance = {
    release: 'v1.6.4', status: 'known_risk_accepted', variant: 'slim', architecture: 'arm64',
    asOf: '2026-10-02', approvedBy: 'CoderLuii', reviewedAt: '2026-10-02', expiresAt: '2026-10-04',
    manifestSha256: 'a'.repeat(64), reportSha256: sha256(grype), imageDigest,
    sbomSha256: sha256(normalizedSbom), acceptedFindingCount: 2, acceptedCriticalCount: 1,
    acceptedHighCount: 1,
  };
  const releaseDeferral = {
    release: 'v1.6.4', status: 'deferred_not_fixed', manifestSha256: 'b'.repeat(64),
    approvedBy: 'CoderLuii', reviewedAt: '2026-10-02', expiresAt: '2026-10-04',
    deferredFindingCount: 2, usedReviewIds: ['review-a', 'review-b'],
  };
  writeJson(join(root, 'release-accepted-risk.json'), acceptance);
  writeJson(join(root, 'policy.json'), {
    imageDigest,
    sbomSha256: sha256(normalizedSbom),
    securityStatus: 'known_risk_accepted',
    acceptedKnownRisk: acceptance,
    releaseDeferral,
  });
  if (includeDeferral) writeJson(join(root, 'release-security-deferral.json'), {
    ...releaseDeferral,
    variant: 'slim', architecture: 'arm64', asOf: '2026-10-02', reportSha256: sha256(grype),
    imageDigest, sbomSha256: sha256(normalizedSbom),
  });
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: metadataProgram(),
    env: {
      ...process.env,
      EVIDENCE_DIR: root,
      IMAGE: `coderluii/holyclaude:candidate@${imageDigest}`,
      DOCKERHUB_DIGEST: imageDigest,
      GHCR_DIGEST: imageDigest,
      RELEASE: 'v1.6.4',
      VARIANT: 'slim',
      ARCH: 'arm64',
      POLICY_STATUS: '0',
    },
  });
  return { root, result };
}

test('v1.6.4 accepted-risk policy is evaluated at source, candidate, and promotion time', () => {
  assert.equal((workflow.match(/evaluate-release-security-deferral\.mjs/g) ?? []).length, 3);
  assert.equal(
    (workflow.match(/--accepted-risk-manifest security\/v1\.6\.4-accepted-risk\.json/g) ?? []).length,
    3,
  );
  assert.match(workflow, /--preflight true[\s\S]{0,120}?--as-of/);
  assert.match(workflow, /Revalidate candidate security evidence[\s\S]*?--accepted-risk-manifest security\/v1\.6\.4-accepted-risk\.json/);
});

test('candidate security evidence binds accepted risk to release, target, image, report, and SBOM', () => {
  assert.match(workflow, /release-accepted-risk\.json/);
  assert.match(workflow, /accepted.get\("status"\) != "known_risk_accepted"/);
  assert.match(workflow, /accepted.get\("release"\) != os\.environ\["RELEASE"\]/);
  assert.match(workflow, /accepted.get\("variant"\) != os\.environ\["VARIANT"\]/);
  assert.match(workflow, /accepted.get\("architecture"\) != os\.environ\["ARCH"\]/);
  assert.match(workflow, /accepted.get\("imageDigest"\) != os\.environ\["DOCKERHUB_DIGEST"\]/);
  assert.match(workflow, /accepted.get\("reportSha256"\) != hashlib\.sha256\(\(root \/ "grype\.json"\)\.read_bytes\(\)\)\.hexdigest\(\)/);
  assert.match(workflow, /accepted.get\("sbomSha256"\) != hashlib\.sha256\(normalized_path\.read_bytes\(\)\)\.hexdigest\(\)/);
  assert.match(workflow, /acceptedKnownRisk/);
  assert.match(workflow, /acceptedFindingCount/);
  assert.match(workflow, /acceptedCriticalCount/);
  assert.match(workflow, /acceptedHighCount/);
  assert.match(workflow, /acceptedRiskManifestSha256/);
  assert.match(workflow, /acceptedRiskRelease/);
  assert.match(workflow, /acceptedRiskAsOf/);
  assert.match(workflow, /acceptedRiskApprovedBy/);
  assert.match(workflow, /acceptedRiskReviewedAt/);
  assert.match(workflow, /acceptedRiskExpiresAt/);
});

test('known-risk acceptance keeps scanners, checksums, four native targets, successful-run gate, and rollback', () => {
  assert.match(workflow, /syft "\$\{image\}"/);
  assert.match(workflow, /grype --config/);
  assert.match(workflow, /sha256sum \.\/\*\.json > SHA256SUMS/);
  assert.match(workflow, /sha256sum -c SHA256SUMS/);
  assert.match(workflow, /expected exactly four successful native candidate jobs/);
  assert.match(workflow, /expected_targets = \{\("full", "amd64"\), \("full", "arm64"\), \("slim", "amd64"\), \("slim", "arm64"\)\}/);
  assert.match(workflow, /Snapshot mutable aliases/);
  assert.match(workflow, /Roll back mutable aliases after failed final smoke/);
  assert.match(workflow, /Restore recorded aliases/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true[\s\S]{0,200}accepted.risk/i);
});

test('successful policy requires accepted-risk evidence while deferral evidence remains conditional', () => {
  assert.match(
    workflow,
    /if policy_status == 0:[\s\S]*?release accepted-risk evidence is missing[\s\S]*?releaseDeferral[\s\S]*?usedReviewIds[\s\S]*?release security deferral evidence is missing/,
  );
  assert.match(workflow, /securityStatus/);
  assert.match(workflow, /known_risk_accepted/);
});

test('nonempty release deferral validates its evidence and fails closed when the evidence is missing', (t) => {
  const present = runMetadataFixture();
  t.after(() => rmSync(present.root, { recursive: true, force: true }));
  assert.equal(present.result.status, 0, present.result.stderr);

  const missing = runMetadataFixture({ includeDeferral: false });
  t.after(() => rmSync(missing.root, { recursive: true, force: true }));
  assert.notEqual(missing.result.status, 0);
  assert.match(missing.result.stderr, /release security deferral evidence is missing/);
});
