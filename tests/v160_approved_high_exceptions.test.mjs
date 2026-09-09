import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const evaluator = resolve('scripts/evaluate-security-report.mjs');
const appPath = '/home/claude/.local/share/junie/versions/3220.1/lib/app/junie-nightly-3220.1.jar';
const runtimePath = '/home/claude/.local/share/junie/versions/3220.1/lib/runtime/release';

const reviewSpecs = [
  ['v160-full-amd64-junie-json-smart-high-exception', ['GHSA-pq2g-wx69-c263'], ['json-smart'], ['2.5.1'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-codec-high-exception', ['GHSA-558v-64gr-wgg4', 'GHSA-mj4r-2hfc-f8p6'], ['netty-codec'], ['4.1.118.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-codec-compression-high-exception', ['GHSA-558v-64gr-wgg4', 'GHSA-mj4r-2hfc-f8p6'], ['netty-codec-compression'], ['4.2.9.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-codec-dns-high-exception', ['GHSA-cm33-6792-r9fm'], ['netty-codec-dns'], ['4.1.118.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-codec-http-high-exception', ['GHSA-57rv-r2g8-2cj3', 'GHSA-6jqx-86gh-f27w', 'GHSA-f6hv-jmp6-3vwv', 'GHSA-jppx-w49h-x2qq', 'GHSA-mvh2-crg5-v77c', 'GHSA-pwqr-wmgm-9rr8'], ['netty-codec-http'], ['4.2.9.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-codec-http2-high-exception', ['GHSA-93wv-jw9v-4972', 'GHSA-f6hv-jmp6-3vwv', 'GHSA-w9fj-cfpg-grvv'], ['netty-codec-http2'], ['4.2.9.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-handler-high-exception', ['GHSA-3qp7-7mw8-wx86', 'GHSA-c653-97m9-rcg9', 'GHSA-x4gw-5cx5-pgmh'], ['netty-handler'], ['4.2.9.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-resolver-dns-high-exception', ['GHSA-5pvg-856g-cp85', 'GHSA-676x-f7gg-47vc'], ['netty-resolver-dns'], ['4.1.118.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-netty-transport-classes-epoll-high-exception', ['GHSA-rwm7-x88c-3g2p'], ['netty-transport-classes-epoll'], ['4.2.9.Final'], 'java-archive', [appPath]],
  ['v160-full-amd64-junie-openjdk-cve-2026-41254-high-exception', ['CVE-2026-41254'], ['openjdk'], ['21.0.11+10-b1163.116'], 'binary', [runtimePath]],
  ['v160-full-amd64-junie-openjdk-cve-2026-47063-high-exception', ['CVE-2026-47063'], ['openjdk'], ['21.0.11+10-b1163.116'], 'binary', [runtimePath]],
  ['v160-full-amd64-libxml2-cve-2026-86140-high-exception', ['CVE-2026-86140'], ['libxml2', 'libxml2-dev'], ['2.9.14+dfsg-1.3~deb12u6'], 'deb', [
    '/usr/share/doc/libxml2/copyright',
    '/usr/share/doc/libxml2-dev/copyright',
    '/var/lib/dpkg/info/libxml2-dev:amd64.md5sums',
    '/var/lib/dpkg/info/libxml2:amd64.md5sums',
    '/var/lib/dpkg/status',
  ]],
  ['v160-full-amd64-bsdutils-cve-2026-78410-high-exception', ['CVE-2026-78410'], ['bsdutils'], ['1:2.38.1-5+deb12u3'], 'deb', [
    '/usr/share/doc/bsdutils/copyright',
    '/var/lib/dpkg/info/bsdutils.list',
    '/var/lib/dpkg/info/bsdutils.md5sums',
    '/var/lib/dpkg/status',
  ]],
  ['v160-full-amd64-util-linux-cve-2026-78410-high-exception', ['CVE-2026-78410'], ['libblkid-dev', 'libblkid1', 'libfdisk1', 'libmount-dev', 'libmount1', 'libsmartcols1', 'libuuid1', 'mount', 'util-linux', 'util-linux-extra', 'uuid-dev'], ['2.38.1-5+deb12u3'], 'deb', [
    '/usr/share/doc/libblkid-dev/copyright', '/var/lib/dpkg/info/libblkid-dev:amd64.md5sums',
    '/usr/share/doc/libblkid1/copyright', '/var/lib/dpkg/info/libblkid1:amd64.md5sums',
    '/usr/share/doc/libfdisk1/copyright', '/var/lib/dpkg/info/libfdisk1:amd64.md5sums',
    '/usr/share/doc/libmount-dev/copyright', '/var/lib/dpkg/info/libmount-dev:amd64.md5sums',
    '/usr/share/doc/libmount1/copyright', '/var/lib/dpkg/info/libmount1:amd64.md5sums',
    '/usr/share/doc/libsmartcols1/copyright', '/var/lib/dpkg/info/libsmartcols1:amd64.md5sums',
    '/usr/share/doc/libuuid1/copyright', '/var/lib/dpkg/info/libuuid1:amd64.md5sums',
    '/usr/share/doc/mount/copyright', '/var/lib/dpkg/info/mount.list', '/var/lib/dpkg/info/mount.md5sums',
    '/usr/share/doc/util-linux/copyright', '/var/lib/dpkg/info/util-linux.conffiles', '/var/lib/dpkg/info/util-linux.list', '/var/lib/dpkg/info/util-linux.md5sums', '/var/lib/dpkg/info/util-linux.postinst', '/var/lib/dpkg/info/util-linux.postrm', '/var/lib/dpkg/info/util-linux.prerm',
    '/usr/share/doc/util-linux-extra/copyright', '/var/lib/dpkg/info/util-linux-extra.conffiles', '/var/lib/dpkg/info/util-linux-extra.list', '/var/lib/dpkg/info/util-linux-extra.md5sums', '/var/lib/dpkg/info/util-linux-extra.postinst', '/var/lib/dpkg/info/util-linux-extra.postrm', '/var/lib/dpkg/info/util-linux-extra.preinst',
    '/usr/share/doc/uuid-dev/copyright', '/var/lib/dpkg/info/uuid-dev:amd64.md5sums',
    '/var/lib/dpkg/status',
  ]],
];

const staleJunieIds = [
  'v155-json-smart-high-exception-626d5c1c9a',
  'v155-netty-codec-compression-high-exception-f725d2fd3a',
  'v155-netty-codec-dns-high-exception-9617bc52dc',
  'v155-netty-codec-http-high-exception-da6befc9ae',
  'v155-netty-codec-http2-high-exception-4e24b188b6',
  'v155-netty-codec-http2-high-exception-ghsa-93wv',
  'v155-netty-codec-high-exception-d6b7a4db67',
  'v155-netty-handler-high-exception-33656196a8',
  'v155-netty-resolver-dns-high-exception-7a88f9e11d',
  'v155-netty-transport-classes-epoll-high-exception-b07473f4a2',
];

function escapePattern(value) {
  return `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

function targetReviews() {
  const ids = new Set(reviewSpecs.map(([id]) => id));
  return ledger.reviews.filter((review) => ids.has(review.id));
}

function reportForApprovedFindings() {
  const matches = [];
  for (const [, vulnerabilities, names, versions, type, paths] of reviewSpecs) {
    for (const vulnerability of vulnerabilities) {
      for (const name of names) {
        const packagePaths = paths.filter((path) =>
          path === '/var/lib/dpkg/status' ||
          path.includes(`/share/doc/${name}/`) ||
          path.includes(`/dpkg/info/${name}.`) ||
          path.includes(`/dpkg/info/${name}:`),
        );
        matches.push({
          vulnerability: { id: vulnerability, severity: 'High', fix: { versions: [], state: 'not-fixed' } },
          artifact: { name, version: versions[0], type, locations: (packagePaths.length ? packagePaths : paths).map((path) => ({ path })) },
        });
      }
    }
  }
  return {
    source: { type: 'sbom', target: 'v160-approved-high-fixture.cdx.json' },
    distro: { name: 'debian', version: '12.15', idLike: ['debian'] },
    descriptor: { name: 'grype', version: '0.118.0', configuration: {} },
    ignoredMatches: [],
    matches,
  };
}

function evaluate(report, asOf) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-v160-approved-high-'));
  try {
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    const files = {
      report,
      ledger: { schemaVersion: ledger.schemaVersion, policy: ledger.policy, reviews: targetReviews() },
      authority: { schemaVersion: 1, candidate: { variant: 'full', architecture: 'amd64', reportSha256: createHash('sha256').update(reportText).digest('hex') }, records: [] },
      vex: { '@context': 'https://openvex.dev/ns/v0.2.0', '@id': 'urn:test:v160-approved-high', author: 'CoderLuii', timestamp: '2026-09-09T00:00:00Z', version: 1, statements: [] },
    };
    writeFileSync(join(root, 'report.json'), reportText);
    for (const [name, value] of Object.entries(files)) {
      if (name !== 'report') writeFileSync(join(root, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
    }
    const output = join(root, 'output');
    const result = spawnSync(process.execPath, [
      evaluator,
      '--report', join(root, 'report.json'),
      '--ledger', join(root, 'ledger.json'),
      '--authority-evidence', join(root, 'authority.json'),
      '--vex', join(root, 'vex.json'),
      '--output-dir', output,
      '--variant', 'full',
      '--arch', 'amd64',
      '--image-digest', `sha256:${'a'.repeat(64)}`,
      '--sbom-sha256', 'b'.repeat(64),
      '--as-of', asOf,
    ], { encoding: 'utf8' });
    return {
      ...result,
      policy: result.status === 0 ? JSON.parse(readFileSync(join(output, 'policy.json'), 'utf8')) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('binds the 37 approved full amd64 High findings to 14 exact temporary exceptions', () => {
  assert.equal(reviewSpecs.length, 14);
  assert.equal(reportForApprovedFindings().matches.length, 37);
  for (const [id, vulnerabilities, names, versions, type, paths] of reviewSpecs) {
    const matches = ledger.reviews.filter((review) => review.id === id);
    assert.equal(matches.length, 1, `${id} must exist exactly once`);
    const review = matches[0];
    assert.deepEqual(review.vulnerabilities, vulnerabilities);
    assert.deepEqual(review.component.names, names);
    assert.deepEqual(review.component.versions, versions);
    assert.deepEqual(review.component.types, [type]);
    assert.deepEqual(review.component.locationPatterns, paths.map(escapePattern));
    assert.equal(review.disposition, 'high_exception');
    assert.equal(review.effectiveSeverity, 'High');
    assert.equal(review.approvedBy, 'CoderLuii');
    assert.equal(review.reviewedAt, '2026-09-09');
    assert.equal(review.expiresAt, '2026-09-16');
    assert.deepEqual(review.variants, ['full']);
    assert.deepEqual(review.architectures, ['amd64']);
    assert.equal('vexStatement' in review, false);
  }
});

test('removes the legacy full arm64 selectors after native replacement verification', () => {
  for (const id of staleJunieIds) {
    assert.equal(ledger.reviews.some((review) => review.id === id), false, `${id} must be removed`);
  }
  for (const id of ['v158-full-amd64-high-exception-b92d85b26cd5', 'v158-full-amd64-high-exception-2b38903b9772']) {
    assert.equal(ledger.reviews.some((review) => review.id === id), false, `${id} must be removed`);
  }
  for (const id of ['v155-aom-high-exception', 'v155-libssh2-high-exception']) {
    const slimAmd = ledger.reviews.find((review) => review.id === `${id}-slim-amd64-retained`);
    assert.equal(ledger.reviews.some((review) => review.id === id), false, `${id} must be removed`);
    assert.equal(slimAmd, undefined);
  }
});

test('accepts the approved findings through the expiry date and rejects them after it', () => {
  const report = reportForApprovedFindings();
  const valid = evaluate(report, '2026-09-16');
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(valid.policy.rawHighCount, 37);
  assert.equal(valid.policy.mappedHighCount, 37);

  const expired = evaluate(report, '2026-09-17');
  assert.notEqual(expired.status, 0);
  assert.match(expired.stderr, /expired on 2026-09-16/);
});

test('leaves unrelated High and Critical findings fail closed', () => {
  const report = reportForApprovedFindings();
  report.matches.push(
    {
      vulnerability: { id: 'GHSA-v5mp-jgw5-2x6j', severity: 'High', fix: { versions: ['4.1.2'], state: 'fixed' } },
      artifact: { name: 'toml', version: '3.0.0', type: 'npm', locations: [{ path: '/usr/local/lib/node_modules/netlify-cli/node_modules/toml/package.json' }] },
    },
    {
      vulnerability: { id: 'CVE-2099-0001', severity: 'Critical', fix: { versions: [], state: 'not-fixed' } },
      artifact: { name: 'openjdk', version: '21.0.11+10-b1163.116', type: 'binary', locations: [{ path: runtimePath }] },
    },
  );
  const result = evaluate(report, '2026-09-16');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /GHSA-v5mp-jgw5-2x6j toml@3\.0\.0: matched 0 reviews for raw High finding/);
  assert.match(result.stderr, /CVE-2099-0001 openjdk@21\.0\.11\+10-b1163\.116: matched 0 reviews/);
  assert.match(result.stderr, /1 Critical findings remain unresolved/);
});
