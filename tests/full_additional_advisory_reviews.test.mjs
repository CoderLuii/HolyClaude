import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const runtime = readFileSync('tests/full_additional_linux_advisory_runtime_checks.sh', 'utf8');

const common = {
  variants: ['full'],
  architectures: ['amd64'],
  reviewedAt: '2026-09-08',
  expiresAt: '2026-10-08',
};

const reviewSpecs = [
  ['v160-full-amd64-gh-fixed-cve-2024-52308', 'CVE-2024-52308', ['gh'], ['2.100.0'], 'fixed', 'None'],
  ['v160-full-amd64-gh-fixed-cve-2026-48501', 'CVE-2026-48501', ['gh'], ['2.100.0'], 'fixed', 'None'],
  ['v160-full-amd64-aom-debian-minor-cve-2023-6879', 'CVE-2023-6879', ['libaom-dev', 'libaom3'], ['3.6.0-1+deb12u3'], 'vendor_severity', 'Low'],
  ['v160-full-amd64-aom-debian-minor-cve-2023-39616', 'CVE-2023-39616', ['libaom-dev', 'libaom3'], ['3.6.0-1+deb12u3'], 'vendor_severity', 'Low'],
  ['v160-full-amd64-util-linux-cve-2026-76642-not-affected', 'CVE-2026-76642', ['libblkid-dev', 'libblkid1', 'libfdisk1', 'libmount-dev', 'libmount1', 'libsmartcols1', 'libuuid1', 'mount', 'util-linux', 'util-linux-extra', 'uuid-dev'], ['2.38.1-5+deb12u3'], 'not_affected', 'None'],
  ['v160-full-amd64-bsdutils-cve-2026-76642-not-affected', 'CVE-2026-76642', ['bsdutils'], ['1:2.38.1-5+deb12u3'], 'not_affected', 'None'],
  ['v160-full-amd64-util-linux-cve-2026-78408-not-affected', 'CVE-2026-78408', ['libblkid-dev', 'libblkid1', 'libfdisk1', 'libmount-dev', 'libmount1', 'libsmartcols1', 'libuuid1', 'mount', 'util-linux', 'util-linux-extra', 'uuid-dev'], ['2.38.1-5+deb12u3'], 'not_affected', 'None'],
  ['v160-full-amd64-bsdutils-cve-2026-78408-not-affected', 'CVE-2026-78408', ['bsdutils'], ['1:2.38.1-5+deb12u3'], 'not_affected', 'None'],
  ['v160-full-amd64-util-linux-cve-2026-78409-not-affected', 'CVE-2026-78409', ['libblkid-dev', 'libblkid1', 'libfdisk1', 'libmount-dev', 'libmount1', 'libsmartcols1', 'libuuid1', 'mount', 'util-linux', 'util-linux-extra', 'uuid-dev'], ['2.38.1-5+deb12u3'], 'not_affected', 'None'],
  ['v160-full-amd64-bsdutils-cve-2026-78409-not-affected', 'CVE-2026-78409', ['bsdutils'], ['1:2.38.1-5+deb12u3'], 'not_affected', 'None'],
  ['v160-full-amd64-zlib-cve-2026-85091-not-affected', 'CVE-2026-85091', ['zlib1g', 'zlib1g-dev'], ['1:1.2.13.dfsg-1'], 'not_affected', 'None'],
  ['v160-full-amd64-bind-clients-cve-2025-40777-not-affected', 'CVE-2025-40777', ['bind9-dnsutils', 'bind9-host', 'bind9-libs'], ['1:9.18.49-1~deb12u2'], 'not_affected', 'None'],
  ['v160-full-amd64-dnsutils-cve-2025-40777-not-affected', 'CVE-2025-40777', ['dnsutils'], ['1:9.18.49-1~deb12u2'], 'not_affected', 'None'],
];

test('maps all 48 selected full amd64 findings with exact full-only package coverage', () => {
  assert.equal(reviewSpecs.reduce((count, spec) => count + spec[2].length, 0), 48);
  for (const [id, vulnerability, names, versions, disposition, effectiveSeverity] of reviewSpecs) {
    const matches = ledger.reviews.filter((review) => review.id === id);
    assert.equal(matches.length, 1, `${id} must exist exactly once`);
    const review = matches[0];
    assert.deepEqual(review.vulnerabilities, [vulnerability]);
    assert.deepEqual(review.component.names, names);
    assert.deepEqual(review.component.versions, versions);
    assert.deepEqual(review.component.types, ['deb']);
    assert.equal(review.disposition, disposition);
    assert.equal(review.effectiveSeverity, effectiveSeverity);
    assert.deepEqual(review.variants, common.variants);
    assert.deepEqual(review.architectures, common.architectures);
    assert.equal(review.reviewedAt, common.reviewedAt);
    assert.equal(review.expiresAt, common.expiresAt);
    assert.equal('approvedBy' in review, false);
    if (disposition !== 'not_affected') assert.equal('vexStatement' in review, false);
  }

  const dnsutils = ledger.reviews.find((review) => review.id === 'v160-full-amd64-dnsutils-cve-2025-40777-not-affected');
  assert.deepEqual(dnsutils.component.packageArchitectures, ['all']);
  assert.match(dnsutils.rationale, /architecture-all metapackage/);

  const aom = ledger.reviews.filter((review) => review.id.startsWith('v160-full-amd64-aom-'));
  assert.ok(aom.every((review) => /still vulnerable/.test(review.rationale)));

  const caveat = ledger.reviews.filter((review) => review.id.includes('cve-2026-76642'));
  assert.ok(caveat.every((review) => /through 2\.42\.2 as affected/.test(review.rationale)));
});

test('binds every full not-affected record to exact full products and subcomponents', () => {
  const notAffected = reviewSpecs.filter((spec) => spec[4] === 'not_affected');
  for (const [id, vulnerability, names, versions] of notAffected) {
    const review = ledger.reviews.find((item) => item.id === id);
    assert.ok(review.vexStatement);
    const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
    assert.ok(statement, review.vexStatement);
    assert.equal(statement.vulnerability.name, vulnerability);
    assert.equal(statement.status, 'not_affected');
    assert.equal(
      statement.justification,
      vulnerability === 'CVE-2025-40777' ? 'vulnerable_code_not_in_execute_path' : 'vulnerable_code_not_present',
    );
    assert.deepEqual(statement.products.map((product) => product['@id']).sort(), [
      'pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=full',
      'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=full',
    ]);
    const expectedPurls = names.map((name) => {
      const arch = name === 'dnsutils' ? 'all' : 'amd64';
      return `pkg:deb/debian/${name}@${encodeURIComponent(versions[0])}?arch=${arch}`;
    }).sort();
    for (const product of statement.products) {
      assert.deepEqual(product.subcomponents.map((item) => item.identifiers.purl).sort(), expectedPurls);
    }
  }
});

test('does not suppress the excluded full amd64 risks', () => {
  const excluded = new Set(['CVE-2026-78410', 'CVE-2026-86140']);
  assert.deepEqual(ledger.reviews.filter((review) =>
    review.disposition === 'not_affected' &&
    (review.variants === undefined || review.variants.includes('full')) &&
    (review.architectures === undefined || review.architectures.includes('amd64')) &&
    review.vulnerabilities.some((vulnerability) => excluded.has(vulnerability))), []);
  assert.deepEqual(vex.statements.filter((statement) =>
    excluded.has(statement.vulnerability.name) &&
    statement.products.some((product) => product['@id'].endsWith('?variant=full'))), []);
});

test('runs additional full evidence for both architectures on candidate and final image digests', () => {
  assert.match(workflow, /if \[ "\$VARIANT" = full \]; then[\s\S]*?\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  assert.doesNotMatch(workflow, /if \[ "\$VARIANT" = full \] && \[ "\$ARCH" = amd64 \]; then[\s\S]*?\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Verify final additional full advisory evidence\s+if: matrix\.variant == 'full'/);
  const finalStep = workflow.slice(workflow.indexOf('      - name: Verify final additional full advisory evidence'));
  assert.match(finalStep, /steps\.image\.outputs\.ref.*steps\.image\.outputs\.digest/);
  assert.match(finalStep, /\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
});

test('runtime proof covers exact full-only packages and negative execute paths', () => {
  for (const packageName of ['libaom-dev', 'libblkid-dev', 'libmount-dev', 'uuid-dev', 'zlib1g-dev']) {
    assert.match(runtime, new RegExp(`require_package[^\\n]*${packageName}|for package in [\\s\\S]*?${packageName}`));
  }
  assert.match(runtime, /require_package dnsutils '1:9\.18\.49-1~deb12u2' all/);
  assert.match(runtime, /--join-cgroup/);
  assert.match(runtime, /MNT_STAGE_MOUNT_POST/);
  assert.match(runtime, /hook_subdir/);
  assert.match(runtime, /case "\$architecture" in/);
  assert.match(runtime, /amd64\|arm64\)/);
  assert.match(runtime, /Unsupported architecture: \$architecture/);
  assert.match(runtime, /dpkg-architecture -qDEB_HOST_MULTIARCH/);
  assert.match(runtime, /\/usr\/lib\/\$multiarch\/libz\.a/);
  assert.doesNotMatch(runtime, /\/usr\/lib\/x86_64-linux-gnu\/libz\.a/);
  assert.match(runtime, /gz_vacate/);
  assert.match(runtime, /dpkg-query -W -f='\$\{Status\}' bind9/);
  assert.match(runtime, /\/usr\/sbin\/named/);
});

test('runtime proof rejects an unsupported package architecture before advisory checks', () => {
  const bash = process.platform === 'win32'
    ? join(process.env.ProgramW6432 ?? process.env.ProgramFiles, 'Git', 'bin', 'bash.exe')
    : 'bash';
  const result = spawnSync(bash, ['-c', `
cat() {
  [ "$1" = /etc/holyclaude-variant ] && { printf '%s\\n' full; return; }
  command cat "$@"
}
dpkg() {
  [ "$1" = --print-architecture ] && { printf '%s\\n' riscv64; return; }
  return 99
}
source tests/full_additional_linux_advisory_runtime_checks.sh
`], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsupported architecture: riscv64/);
  assert.doesNotMatch(result.stderr, /unexpected util-linux hook marker|unexpected zlib|unexpected bind9/);
});
