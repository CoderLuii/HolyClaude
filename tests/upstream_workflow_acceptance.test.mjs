import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const releaseWorkflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8').replaceAll('\r\n', '\n');
const monitorWorkflow = readFileSync('.github/workflows/source-security.yml', 'utf8').replaceAll('\r\n', '\n');

test('v1.6.6 release workflow evaluates the standing policy at source, candidate, and promotion', () => {
  assert.equal((releaseWorkflow.match(/evaluate-upstream-dependency-report\.mjs/g) ?? []).length, 3);
  assert.equal((releaseWorkflow.match(/--policy security\/upstream-dependency-policy\.json/g) ?? []).length, 3);
  assert.match(releaseWorkflow, /--preflight true/);
  assert.match(releaseWorkflow, /cmp "\$\{output\}\/release-upstream-vulnerabilities\.json" "\$\{evidence_dir\}\/release-upstream-vulnerabilities\.json"/);
  assert.doesNotMatch(releaseWorkflow, /security\/v1\.6\.4-(?:accepted-risk|release-security-deferral)\.json/);
  assert.doesNotMatch(releaseWorkflow, /release-accepted-risk\.json/);
  assert.doesNotMatch(releaseWorkflow, /security\/openvex\.json/);
});

test('candidate evidence binds policy, immutable inputs, report, SBOM, database, and digest', () => {
  for (const field of [
    'upstreamPolicySha256', 'upstreamRetainedBaselineSha256', 'upstreamImmutableInputsSha256', 'upstreamReportSha256',
    'upstreamSbomSha256', 'upstreamDatabaseEvidenceSha256', 'upstreamImageDigest',
    'upstreamSyftJsonSha256',
    'upstreamRelease', 'upstreamAsOf', 'upstreamFindingCount', 'upstreamSeverityCounts',
    'upstreamIgnoredMatchCount',
  ]) assert.match(releaseWorkflow, new RegExp(`"${field}"`));
  assert.match(releaseWorkflow, /accepted_upstream_vulnerability_not_fixed/);
  assert.match(releaseWorkflow, /sha256sum \.\/\*\.json > SHA256SUMS/);
  assert.match(releaseWorkflow, /sha256sum -c SHA256SUMS/);
  assert.equal((releaseWorkflow.match(/--syft-json/g) ?? []).length, 2);
  assert.equal((releaseWorkflow.match(/--image-ref/g) ?? []).length, 2);
  assert.match(releaseWorkflow, /-o "syft-json=\$\{evidence_dir\}\/sbom\.syft\.json"/);
  assert.match(releaseWorkflow, /syft "\$\{image\}" --from registry --parallelism 1/);
  assert.match(releaseWorkflow, /\.dockerhub_ref \+ "@" \+ \.dockerhub_digest/);
  assert.match(releaseWorkflow, /test "\$\(jq -r \.image "\$\{metadata\}"\)" = "\$\{image_ref\}"/);
  assert.match(releaseWorkflow, /if jq -e '\.scanner\.source\.type == "sbom-file"'/);
  assert.match(releaseWorkflow, /"\$\{source_args\[@\]\}"/);
});

test('release promotion retains four native targets, successful-run gate, and rollback', () => {
  assert.match(releaseWorkflow, /expected exactly four successful native candidate jobs/);
  assert.match(releaseWorkflow, /expected_targets = \{\("full", "amd64"\), \("full", "arm64"\), \("slim", "amd64"\), \("slim", "arm64"\)\}/);
  assert.match(releaseWorkflow, /Snapshot mutable aliases/);
  assert.match(releaseWorkflow, /Roll back mutable aliases after failed final smoke/);
  assert.match(releaseWorkflow, /Restore recorded aliases/);
});

test('source workflow validates PR and master changes and scheduled scans cannot publish', () => {
  assert.match(monitorWorkflow, /pull_request:/);
  assert.match(monitorWorkflow, /branches:\n\s+- master/);
  assert.match(monitorWorkflow, /schedule:/);
  assert.match(monitorWorkflow, /published scan \(\$\{\{ matrix\.variant \}\}, \$\{\{ matrix\.arch \}\}\)/);
  assert.match(monitorWorkflow, /ubuntu-24\.04-arm/);
  const release = JSON.parse(readFileSync('contracts/product-facts.json', 'utf8')).release.dockerVersion;
  for (const variant of ['full', 'slim']) {
    const tag = variant === 'full' ? release : `${release}-slim`;
    assert.equal(monitorWorkflow.split(`tag: "${tag}"`).length - 1, 2);
  }
  assert.match(monitorWorkflow, /name: Checkout\n\s+uses: actions\/checkout@[a-f0-9]{40}[^\n]*\n\s+with:\n\s+fetch-depth: 0/);
  assert.equal((monitorWorkflow.match(/evaluate-upstream-dependency-report\.mjs/g) ?? []).length, 2);
  assert.doesNotMatch(monitorWorkflow, /docker\/build-push-action/);
  assert.doesNotMatch(monitorWorkflow, /docker push|buildx imagetools create|packages:\s*write/);
  assert.doesNotMatch(monitorWorkflow, /openvex\.json/);
  assert.match(monitorWorkflow, /imagetools inspect --raw/);
  assert.match(monitorWorkflow, /\.platform\.architecture == \$arch/);
  assert.match(monitorWorkflow, /docker image inspect --format '\{\{\.Architecture\}\}'/);
  assert.match(monitorWorkflow, /name: Upload monitoring evidence\n\s+if: always\(\)/);
  assert.match(monitorWorkflow, /if-no-files-found: error/);
  assert.match(monitorWorkflow, /-o syft-json=evidence\/sbom\.syft\.json/);
  assert.match(monitorWorkflow, /--syft-json evidence\/sbom\.syft\.json/);
  assert.match(monitorWorkflow, /syft "\$\{image\}@\$\{digest\}" --from registry/);
  assert.match(monitorWorkflow, /--image-ref "\$\{image\}@\$\{digest\}"/);
});

test('both workflows pin accepted Syft and Grype versions and architecture checksums', () => {
  for (const workflow of [releaseWorkflow, monitorWorkflow]) {
    assert.match(workflow, /SYFT_VERSION: 1\.54\.1/);
    assert.match(workflow, /GRYPE_VERSION: 0\.120\.1/);
    assert.match(workflow, /c069905b391cc4c20a5ba65ad5c10be2a7ba074f8ea6ad203e24d14e303dad47/);
    assert.match(workflow, /dfdf0537610113edbefe1f1fc6548bc957b2d77439636ec824fcf0e10d46d054/);
    assert.match(workflow, /0a9ee97ef5ae2ee953b0a80098105052e846cdbe319a57d808b519c33cd1343d/);
    assert.match(workflow, /29f47391dc283aa79fcc38e65224cd61f64dec0ecfd0db7074128ebf8ff23514/);
  }
});
