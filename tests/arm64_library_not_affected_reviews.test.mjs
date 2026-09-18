import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));

function workflowStep(workflow, name) {
  const marker = `      - name: ${name}`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `${name} step must exist`);
  const next = workflow.indexOf('\n      - name:', start + marker.length);
  return workflow.slice(start, next === -1 ? workflow.length : next);
}

const components = [
  {
    slug: 'libtiff6',
    name: 'libtiff6',
    version: '4.5.0-6+deb12u4',
    vulnerabilities: ['CVE-2026-52490'],
    rationale: /tools\/tiffcrop\.c.*libtiff-tools.*contains only libtiff\.so\.6/,
  },
];

test('binds two exact ARM64 component records to not-affected OpenVEX statements', () => {
  let count = 0;
  for (const variant of ['full', 'slim']) {
    for (const component of components) {
      for (const vulnerability of component.vulnerabilities) {
        const suffix = vulnerability.toLowerCase();
        const id = `v160-${variant}-arm64-${component.slug}-${suffix}-not-affected`;
        const reviews = ledger.reviews.filter((review) => review.id === id);
        assert.equal(reviews.length, 1, `${id} must exist exactly once`);
        const review = reviews[0];
        assert.deepEqual(review.vulnerabilities, [vulnerability]);
        assert.deepEqual(review.component.names, [component.name]);
        assert.deepEqual(review.component.versions, [component.version]);
        assert.deepEqual(review.component.types, ['deb']);
        assert.ok(review.component.locationPatterns.includes(
          `^/var/lib/dpkg/info/${component.name.replaceAll('.', '\\.')}\:arm64\\.md5sums$`,
        ));
        assert.deepEqual(review.variants, [variant]);
        assert.deepEqual(review.architectures, ['arm64']);
        assert.equal(review.disposition, 'not_affected');
        assert.equal(review.effectiveSeverity, 'None');
        assert.equal(review.reviewedAt, '2026-09-09');
        assert.equal(review.expiresAt, '2026-10-09');
        assert.equal('approvedBy' in review, false);
        assert.equal('authorityEvidence' in review, false);
        assert.match(review.rationale, component.rationale);
        assert.match(review.rationale, new RegExp(`${variant} arm64 image must lack`));

        const statements = vex.statements.filter((statement) => statement['@id'] === review.vexStatement);
        assert.equal(statements.length, 1, `${review.vexStatement} must exist exactly once`);
        const statement = statements[0];
        assert.equal(statement.vulnerability.name, vulnerability);
        assert.equal(statement.status, 'not_affected');
        assert.equal(statement.justification, 'vulnerable_code_not_present');
        assert.deepEqual(statement.products.map((product) => product['@id']).sort(), [
          `pkg:oci/docker.io/coderluii/holyclaude@1.6.2?variant=${variant}`,
          `pkg:oci/ghcr.io/coderluii/holyclaude@1.6.2?variant=${variant}`,
        ]);
        for (const product of statement.products) {
          assert.deepEqual(product.subcomponents, [{
            identifiers: {
              purl: `pkg:deb/debian/${encodeURIComponent(component.name)}@${encodeURIComponent(component.version)}?arch=arm64`,
            },
          }]);
        }
        count += 1;
      }
    }
  }
  assert.equal(count, 2);
});

test('removes all replaced ARM64 exceptions and retired Chromium authority records', () => {
  const removedIds = [
    'v158-libtiff-cve-2026-52490-critical-exception-full-arm64',
    'v158-libtiff-cve-2026-52490-critical-exception-slim-arm64',
    'v158-libevent-critical-exception-full-arm64',
    'v158-libevent-critical-exception-slim-arm64',
  ];
  assert.ok(ledger.reviews.every((review) => !removedIds.includes(review.id)));

  for (const [file, candidate] of [
    ['security/critical-exception-authority-evidence-full-arm64.json', { variant: 'full', architecture: 'arm64', reportSha256: null }],
    ['security/critical-exception-authority-evidence-slim-arm64.json', { variant: 'slim', architecture: 'arm64', reportSha256: null }],
    ['security/critical-exception-authority-evidence.json', { variant: 'slim', architecture: 'arm64', reportSha256: null }],
  ]) {
    const evidence = JSON.parse(readFileSync(file, 'utf8'));
    assert.deepEqual(evidence.candidate, candidate);
    assert.deepEqual(evidence.records, []);
  }
});

test('guards both architectures and binds exact ARM64 library payloads', () => {
  const expectedChecks = [
    /amd64\)[\s\S]*?library_dir=\/usr\/lib\/x86_64-linux-gnu/,
    /arm64\)[\s\S]*?library_dir=\/usr\/lib\/aarch64-linux-gnu/,
    /libevent_core-2\.1\.so\.7\.0\.1/,
    /62ef2b9108270573f45b92c84b59ab897e29b71e2c22b2e3e5dcef07fb141430/,
    /9331ae738c166e786f2bae7e28777f680e8582a42139f48921c0ae47b1f3efa0/,
    /libtiff\.so\.6\.0\.0/,
    /c56e31d69b7ad5fe570edf3ee145b0fa67bffa9b1e99aa6ca14798ec2ea1cddf/,
    /Machine:\[\[:space:\]\]\+AArch64\$/,
    /unexpected libevent-extra package/,
    /unexpected libevent_extra library/,
    /unexpected libevent static library/,
    /unexpected libtiff-tools package/,
    /for command in tiffcrop tiffinfo tiffcp/,
  ];

  for (const file of [
    'tests/full_linux_advisory_runtime_checks.sh',
    'tests/slim_linux_advisory_runtime_checks.sh',
  ]) {
    const runtime = readFileSync(file, 'utf8');
    for (const check of expectedChecks) {
      assert.match(runtime, check, `${file} must retain ${check}`);
    }
  }
});

test('requires ARM64 applicability guards in candidate, final, and published matrices', () => {
  const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
  const candidate = workflowStep(workflow, 'Run complete candidate smoke matrix');

  for (const variant of ['full', 'slim']) {
    const script = `${variant}_linux_advisory_runtime_checks.sh`;
    assert.match(
      candidate,
      new RegExp(`if \\[ "\\$VARIANT" = ${variant} \\]; then\\s+docker run[^\\n]+/${script}`),
      `${variant} candidate evidence must run without an amd64-only condition`,
    );
    for (const stage of ['final', 'published']) {
      const step = workflowStep(workflow, `Verify ${stage} ${variant} advisory evidence`);
      assert.match(step, new RegExp(`if: matrix\\.variant == '${variant}'(?:\\r?\\n)`));
      assert.doesNotMatch(step, /matrix\.arch/);
      assert.match(step, new RegExp(`/${script}`));
    }
  }

  assert.match(candidate, /if \[ "\$VARIANT" = full \]; then\s+docker run[^\n]+\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  for (const stage of ['final', 'published']) {
    const step = workflowStep(workflow, `Verify ${stage} additional full advisory evidence`);
    assert.match(step, /if: matrix\.variant == 'full'/);
    assert.doesNotMatch(step, /matrix\.arch/);
    assert.match(step, /\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  }
});
