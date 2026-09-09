import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const evaluator = resolve('scripts/evaluate-security-report.mjs');
const commonPaths = {
  bsdutils: [
    '/usr/share/doc/bsdutils/copyright',
    '/var/lib/dpkg/info/bsdutils.list',
    '/var/lib/dpkg/info/bsdutils.md5sums',
    '/var/lib/dpkg/status',
  ],
  mount: [
    '/usr/share/doc/mount/copyright',
    '/var/lib/dpkg/info/mount.list',
    '/var/lib/dpkg/info/mount.md5sums',
    '/var/lib/dpkg/status',
  ],
  'util-linux': [
    '/usr/share/doc/util-linux/copyright',
    '/var/lib/dpkg/info/util-linux.conffiles',
    '/var/lib/dpkg/info/util-linux.list',
    '/var/lib/dpkg/info/util-linux.md5sums',
    '/var/lib/dpkg/info/util-linux.postinst',
    '/var/lib/dpkg/info/util-linux.postrm',
    '/var/lib/dpkg/info/util-linux.prerm',
    '/var/lib/dpkg/status',
  ],
  'util-linux-extra': [
    '/usr/share/doc/util-linux-extra/copyright',
    '/var/lib/dpkg/info/util-linux-extra.conffiles',
    '/var/lib/dpkg/info/util-linux-extra.list',
    '/var/lib/dpkg/info/util-linux-extra.md5sums',
    '/var/lib/dpkg/info/util-linux-extra.postinst',
    '/var/lib/dpkg/info/util-linux-extra.postrm',
    '/var/lib/dpkg/info/util-linux-extra.preinst',
    '/var/lib/dpkg/status',
  ],
};
const utilNames = ['libblkid1', 'libfdisk1', 'libmount1', 'libsmartcols1', 'libuuid1', 'mount', 'util-linux', 'util-linux-extra'];

function pathsFor(name, arch) {
  return commonPaths[name] ?? [
    `/usr/share/doc/${name}/copyright`,
    `/var/lib/dpkg/info/${name}:${arch}.md5sums`,
    '/var/lib/dpkg/status',
  ];
}

function specsFor(arch) {
  return [
    {
      id: `v160-slim-${arch}-libxml2-cve-2026-86140-high-exception`,
      vulnerabilities: ['CVE-2026-86140'], names: ['libxml2'], versions: ['2.9.14+dfsg-1.3~deb12u6'],
      paths: pathsFor('libxml2', arch),
    },
    {
      id: `v160-slim-${arch}-bsdutils-cve-2026-78410-high-exception`,
      vulnerabilities: ['CVE-2026-78410'], names: ['bsdutils'], versions: ['1:2.38.1-5+deb12u3'],
      paths: pathsFor('bsdutils', arch),
    },
    {
      id: `v160-slim-${arch}-util-linux-cve-2026-78410-high-exception`,
      vulnerabilities: ['CVE-2026-78410'], names: utilNames, versions: ['2.38.1-5+deb12u3'],
      paths: utilNames.flatMap((name) => pathsFor(name, arch)),
    },
  ];
}

const targetSpecs = ['amd64', 'arm64'].flatMap(specsFor);

function exactPattern(value) {
  return `^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;
}

function reportFor(arch) {
  const matches = [];
  for (const spec of specsFor(arch)) {
    for (const vulnerability of spec.vulnerabilities) {
      for (const name of spec.names) {
        matches.push({
          vulnerability: { id: vulnerability, severity: 'High', fix: { versions: [], state: 'not-fixed' } },
          artifact: { name, version: spec.versions[0], type: 'deb', locations: pathsFor(name, arch).map((path) => ({ path })) },
        });
      }
    }
  }
  return {
    source: { type: 'sbom', target: `v160-slim-${arch}-approved-high.cdx.json` },
    distro: { name: 'debian', version: '12.15', idLike: ['debian'] },
    descriptor: { name: 'grype', version: '0.118.0', configuration: {} },
    ignoredMatches: [], matches,
  };
}

function evaluate(arch, report, asOf) {
  const root = mkdtempSync(join(tmpdir(), `holyclaude-v160-slim-${arch}-approved-`));
  try {
    const reportText = `${JSON.stringify(report, null, 2)}\n`;
    const ids = new Set(specsFor(arch).map(({ id }) => id));
    const files = {
      ledger: { schemaVersion: ledger.schemaVersion, policy: ledger.policy, reviews: ledger.reviews.filter((review) => ids.has(review.id)) },
      authority: { schemaVersion: 1, candidate: { variant: 'slim', architecture: arch, reportSha256: createHash('sha256').update(reportText).digest('hex') }, records: [] },
      vex: { '@context': 'https://openvex.dev/ns/v0.2.0', '@id': `urn:test:v160-slim-${arch}`, author: 'CoderLuii', timestamp: '2026-09-09T00:00:00Z', version: 1, statements: [] },
    };
    writeFileSync(join(root, 'report.json'), reportText);
    for (const [name, value] of Object.entries(files)) writeFileSync(join(root, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
    const output = join(root, 'output');
    const result = spawnSync(process.execPath, [
      evaluator, '--report', join(root, 'report.json'), '--ledger', join(root, 'ledger.json'),
      '--authority-evidence', join(root, 'authority.json'), '--vex', join(root, 'vex.json'), '--output-dir', output,
      '--variant', 'slim', '--arch', arch, '--image-digest', `sha256:${'a'.repeat(64)}`,
      '--sbom-sha256', 'b'.repeat(64), '--as-of', asOf,
    ], { encoding: 'utf8' });
    return { ...result, policy: result.status === 0 ? JSON.parse(readFileSync(join(output, 'policy.json'), 'utf8')) : null };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('binds the 20 approved slim findings to six exact architecture-specific exceptions', () => {
  assert.equal(targetSpecs.length, 6);
  assert.equal(reportFor('amd64').matches.length, 10);
  assert.equal(reportFor('arm64').matches.length, 10);
  for (const spec of targetSpecs) {
    const review = ledger.reviews.find((item) => item.id === spec.id);
    assert.ok(review, `${spec.id} must exist`);
    assert.deepEqual(review.vulnerabilities, spec.vulnerabilities);
    assert.deepEqual(review.component.names, spec.names);
    assert.deepEqual(review.component.versions, spec.versions);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(
      [...review.component.locationPatterns].sort(),
      [...new Set(spec.paths)].map(exactPattern).sort(),
    );
    assert.equal(review.disposition, 'high_exception');
    assert.equal(review.effectiveSeverity, 'High');
    assert.equal(review.approvedBy, 'CoderLuii');
    assert.equal(review.reviewedAt, '2026-09-09');
    assert.equal(review.expiresAt, '2026-09-16');
    assert.deepEqual(review.variants, ['slim']);
    assert.deepEqual(review.architectures, [spec.id.includes('-amd64-') ? 'amd64' : 'arm64']);
    assert.equal('vexStatement' in review, false);
  }
});

test('removes the stale AOM and libssh2 selectors after both native variants verify replacement', () => {
  for (const id of ['v155-aom-high-exception-slim-amd64-retained', 'v155-libssh2-high-exception-slim-amd64-retained']) {
    assert.equal(ledger.reviews.some((review) => review.id === id), false);
  }
  for (const id of ['v155-aom-high-exception', 'v155-libssh2-high-exception']) {
    assert.equal(ledger.reviews.some((review) => review.id === id), false);
  }
});

test('accepts both approved targets through expiry and rejects them afterward', () => {
  for (const arch of ['amd64', 'arm64']) {
    const report = reportFor(arch);
    const valid = evaluate(arch, report, '2026-09-16');
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(valid.policy.rawHighCount, 10);
    assert.equal(valid.policy.mappedHighCount, 10);
    const expired = evaluate(arch, report, '2026-09-17');
    assert.notEqual(expired.status, 0);
    assert.match(expired.stderr, /expired on 2026-09-16/);
  }
});

test('leaves unrelated High and Critical findings fail closed', () => {
  const report = reportFor('amd64');
  report.matches.push(
    { vulnerability: { id: 'GHSA-v5mp-jgw5-2x6j', severity: 'High', fix: { versions: ['4.1.2'], state: 'fixed' } }, artifact: { name: 'toml', version: '3.0.0', type: 'npm', locations: [{ path: '/usr/local/lib/node_modules/netlify-cli/node_modules/toml/package.json' }] } },
    { vulnerability: { id: 'CVE-2099-0001', severity: 'Critical', fix: { versions: [], state: 'not-fixed' } }, artifact: { name: 'libxml2', version: '2.9.14+dfsg-1.3~deb12u6', type: 'deb', locations: pathsFor('libxml2', 'amd64').map((path) => ({ path })) } },
  );
  const result = evaluate('amd64', report, '2026-09-16');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /GHSA-v5mp-jgw5-2x6j toml@3\.0\.0: matched 0 reviews for raw High finding/);
  assert.match(result.stderr, /CVE-2099-0001 libxml2@2\.9\.14\+dfsg-1\.3~deb12u6: matched 0 reviews/);
  assert.match(result.stderr, /1 Critical findings remain unresolved/);
});
