import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const releaseWorkflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8').replaceAll('\r\n', '\n');
const monitorWorkflow = readFileSync('.github/workflows/source-security.yml', 'utf8').replaceAll('\r\n', '\n');

test('v1.6.9 release workflow evaluates the standing policy at source, candidate, and promotion', () => {
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

test('published Full-image monitoring provisions scanner capacity before installing scanners', () => {
  const disk = monitorWorkflow.indexOf('      - name: Free up monitoring disk space');
  const swap = monitorWorkflow.indexOf('      - name: Provision full-image scanner swap');
  const scanners = monitorWorkflow.indexOf('      - name: Install checksum-pinned scanners');
  assert.ok(disk >= 0 && disk < swap && swap < scanners);

  const capacity = monitorWorkflow.slice(disk, scanners);
  assert.match(capacity, /if: matrix\.variant == 'full'/);
  assert.match(capacity, /sudo fallocate -l 16G "\$\{swap_file\}"/);
  assert.match(capacity, /swapon --show --bytes \| grep -F "\$\{swap_file\}"/);
  assert.match(capacity, /if \[\[ "\$\{RUNNER_ENVIRONMENT:-\}" == "github-hosted" \]\]/);
  assert.match(capacity, /sudo rm -rf \/usr\/share\/dotnet \/usr\/local\/lib\/android \/opt\/ghc \/opt\/hostedtoolcache/);
  assert.match(capacity, /df -h/);
  assert.match(capacity, /free -h/);
});

test('both workflows pin accepted Syft and Grype versions and architecture checksums', () => {
  for (const workflow of [releaseWorkflow, monitorWorkflow]) {
    assert.match(workflow, /SYFT_VERSION: 1\.56\.0/);
    assert.match(workflow, /GRYPE_VERSION: 0\.121\.1/);
    assert.match(workflow, /1c2493cfcf52d3367d6cb25780d9190c111c2219c34c820574c43e8bae15c528/);
    assert.match(workflow, /ace61b9397ae28189c674ae332d67a8074dafd71e87724dfb8b22412d8253bb5/);
    assert.match(workflow, /bc3ea3f9e6fd56ac781c08c6c5e614271b79f438200757f6932085c19b0a4657/);
    assert.match(workflow, /33670612aad351c48cf3c37f4a85d8b043d1b64b21e6034e675bb00b956d78c1/);
  }
});
