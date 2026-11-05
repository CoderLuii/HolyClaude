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
  ['v160-full-amd64-gh-fixed-cve-2024-52308', 'CVE-2024-52308', ['gh'], ['2.101.0'], 'fixed', 'None'],
  ['v160-full-amd64-gh-fixed-cve-2026-48501', 'CVE-2026-48501', ['gh'], ['2.101.0'], 'fixed', 'None'],
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
    assert.equal(review.reviewedAt, id.includes('-gh-fixed-') ? '2026-09-18' : common.reviewedAt);
    assert.equal(review.expiresAt, id.includes('-gh-fixed-') ? '2026-10-18' : common.expiresAt);
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
      'pkg:oci/docker.io/coderluii/holyclaude@1.6.4?variant=full',
      'pkg:oci/ghcr.io/coderluii/holyclaude@1.6.4?variant=full',
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

test('runs additional full evidence on both native candidates without repeating it after promotion', () => {
  assert.match(workflow, /if \[ "\$VARIANT" = full \]; then[\s\S]*?\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  assert.doesNotMatch(workflow, /if \[ "\$VARIANT" = full \] && \[ "\$ARCH" = amd64 \]; then[\s\S]*?\/tests\/full_additional_linux_advisory_runtime_checks\.sh/);
  const finalSmoke = workflow.slice(workflow.indexOf('  post-publish-smoke:'), workflow.indexOf('  rollback-mutable-aliases:'));
  assert.doesNotMatch(finalSmoke, /full_additional_linux_advisory_runtime_checks\.sh/);
  assert.match(workflow, /name: Revalidate candidate security evidence/);
});

test('runtime proof covers exact full-only packages and negative execute paths', () => {
  for (const packageName of ['libaom-dev', 'libblkid-dev', 'libmount-dev', 'uuid-dev', 'zlib1g-dev']) {
    assert.match(runtime, new RegExp(`require_package[^\\n]*${packageName}|for package in [\\s\\S]*?${packageName}`));
  }
  assert.match(runtime, /require_package dnsutils '1:9\.18\.49-1~deb12u3' all/);
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

test('BIND runtime guards require the exact current package version and architecture', async (t) => {
  const bash = process.platform === 'win32'
    ? join(process.env.ProgramW6432 ?? process.env.ProgramFiles, 'Git', 'bin', 'bash.exe')
    : 'bash';
  for (const path of ['tests/slim_linux_advisory_runtime_checks.sh', 'tests/full_additional_linux_advisory_runtime_checks.sh']) {
    const source = readFileSync(path, 'utf8');
    const requirePackage = source.match(/^require_package\(\) \{[\s\S]*?^\}/m)?.[0];
    const bindPackages = source.match(/^for package in bind9-dnsutils bind9-host bind9-libs; do\n[\s\S]*?^done$/m)?.[0];
    const dnsutils = source.match(/^require_package dnsutils [^\n]+/m)?.[0];
    assert.ok(requirePackage && bindPackages && dnsutils, `${path} must retain all four BIND package guards`);
    for (const architecture of ['amd64', 'arm64']) {
      const wrongArchitecture = architecture === 'amd64' ? 'arm64' : 'amd64';
      const cases = [
        { name: 'current tuple', version: '1:9.18.49-1~deb12u3', architecture, dnsutilsArchitecture: 'all' },
        { name: 'stale version', version: '1:9.18.49-1~deb12u2', architecture, dnsutilsArchitecture: 'all', error: 'unexpected bind9-dnsutils version: expected 1:9.18.49-1~deb12u3, got 1:9.18.49-1~deb12u2' },
        { name: 'unreviewed version', version: '1:9.18.49-1~deb12u4', architecture, dnsutilsArchitecture: 'all', error: 'unexpected bind9-dnsutils version: expected 1:9.18.49-1~deb12u3, got 1:9.18.49-1~deb12u4' },
        { name: 'wrong native architecture', version: '1:9.18.49-1~deb12u3', architecture: wrongArchitecture, dnsutilsArchitecture: 'all', error: `unexpected bind9-dnsutils architecture: expected ${architecture}, got ${wrongArchitecture}` },
        { name: 'wrong metapackage architecture', version: '1:9.18.49-1~deb12u3', architecture, dnsutilsArchitecture: architecture, error: `unexpected dnsutils architecture: expected all, got ${architecture}` },
      ];
      for (const fixture of cases) {
        await t.test(`${path} ${architecture}: ${fixture.name}`, () => {
          const result = spawnSync(bash, ['-c', `
set -Eeuo pipefail
architecture=${architecture}
dpkg-query() {
  [ "$#" = 3 ] && [ "$1" = -W ] || return 99
  case "$3" in bind9-dnsutils|bind9-host|bind9-libs|dnsutils) ;; *) return 98 ;; esac
  printf 'queried:%s:%s\\n' "$3" "$2" >&2
  case "$2" in
    '-f=\${Version}') printf '%s' '${fixture.version}' ;;
    '-f=\${Architecture}')
      if [ "$3" = dnsutils ]; then printf '%s' '${fixture.dnsutilsArchitecture}'; else printf '%s' '${fixture.architecture}'; fi ;;
    *) return 97 ;;
  esac
}
${requirePackage}
${bindPackages}
${dnsutils}
printf 'BIND guards passed\\n'
`], { encoding: 'utf8', timeout: 5000 });
          assert.ifError(result.error);
          if (fixture.error) {
            assert.equal(result.status, 1, result.stderr);
            assert.ok(result.stderr.includes(fixture.error), result.stderr);
            assert.doesNotMatch(result.stdout, /BIND guards passed/);
          } else {
            assert.equal(result.status, 0, result.stderr);
            assert.equal(result.stdout, 'BIND guards passed\n');
            const queriedPackages = result.stderr.split('\n').filter((line) => line.startsWith('queried:'))
              .map((line) => line.split(':')[1]);
            assert.deepEqual(queriedPackages, ['bind9-dnsutils', 'bind9-dnsutils', 'bind9-host', 'bind9-host', 'bind9-libs', 'bind9-libs', 'dnsutils', 'dnsutils']);
          }
        });
      }
    }
  }
});
