import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const reviewIds = [
  'v157-ffmpeg-dvbsub-downstream-backport',
  'v157-ffmpeg-cfhd-downstream-backport',
];
const expectedVulnerabilities = ['CVE-2026-70628', 'CVE-2026-70632'];
const expectedNames = [
  'ffmpeg',
  'libavcodec59',
  'libavdevice59',
  'libavfilter8',
  'libavformat59',
  'libavutil57',
  'libpostproc56',
  'libswresample4',
  'libswscale6',
];
const expectedLocationPatterns = [
  '^/usr/share/doc/ffmpeg/copyright$',
  '^/usr/share/doc/libavcodec59/copyright$',
  '^/usr/share/doc/libavdevice59/copyright$',
  '^/usr/share/doc/libavfilter8/copyright$',
  '^/usr/share/doc/libavformat59/copyright$',
  '^/usr/share/doc/libavutil57/copyright$',
  '^/usr/share/doc/libpostproc56/copyright$',
  '^/usr/share/doc/libswresample4/copyright$',
  '^/usr/share/doc/libswscale6/copyright$',
  '^/var/lib/dpkg/info/ffmpeg\\.list$',
  '^/var/lib/dpkg/info/ffmpeg\\.md5sums$',
  '^/var/lib/dpkg/info/libavcodec59:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libavcodec59:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libavdevice59:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libavdevice59:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libavfilter8:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libavfilter8:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libavformat59:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libavformat59:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libavutil57:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libavutil57:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libpostproc56:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libpostproc56:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libswresample4:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libswresample4:arm64\\.md5sums$',
  '^/var/lib/dpkg/info/libswscale6:amd64\\.md5sums$',
  '^/var/lib/dpkg/info/libswscale6:arm64\\.md5sums$',
  '^/var/lib/dpkg/status$',
];
const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const reviews = reviewIds.map((id) => ledger.reviews.find((review) => review.id === id));

function runPreflight(asOf) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-ffmpeg-fixed-'));
  try {
    const ledgerPath = join(root, 'ledger.json');
    const authorityPath = join(root, 'authority.json');
    const vexPath = join(root, 'openvex.json');
    writeFileSync(ledgerPath, `${JSON.stringify({ ...ledger, reviews }, null, 2)}\n`);
    writeFileSync(authorityPath, `${JSON.stringify({
      schemaVersion: 1,
      candidate: { variant: 'full', architecture: 'amd64', reportSha256: '0'.repeat(64) },
      records: [],
    }, null, 2)}\n`);
    writeFileSync(vexPath, `${JSON.stringify({
      '@context': 'https://openvex.dev/ns/v0.2.0',
      '@id': 'urn:holyclaude:test:ffmpeg-fixed',
      author: 'CoderLuii',
      timestamp: '2026-09-14T00:00:00Z',
      version: 1,
      statements: [],
    }, null, 2)}\n`);
    return spawnSync(process.execPath, [
      'scripts/preflight-security-policy.mjs',
      '--ledger', ledgerPath,
      '--authority-evidence', authorityPath,
      '--vex', vexPath,
      '--as-of', asOf,
    ], { encoding: 'utf8' });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('keeps the two downstream FFmpeg fixed reviews exact and unchanged except for review dates', () => {
  assert.ok(reviews.every(Boolean));
  for (const [index, review] of reviews.entries()) {
    assert.deepEqual(review.vulnerabilities, [expectedVulnerabilities[index]]);
    assert.deepEqual(review.component.names, expectedNames);
    assert.deepEqual(review.component.versions, ['7:5.1.9-0+deb12u1+holyclaude2']);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.component.locationPatterns, expectedLocationPatterns);
    assert.equal(review.disposition, 'fixed');
    assert.equal(review.effectiveSeverity, 'None');
    assert.deepEqual(review.variants, ['full']);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.equal(review.approvedBy, undefined);
    assert.equal(review.reviewedAt, '2026-09-14');
    assert.equal(review.expiresAt, '2026-10-14');
  }
});

test('binds each fixed review to the committed upstream patch bytes', () => {
  const expected = new Map([
    ['v157-ffmpeg-dvbsub-downstream-backport', ['CVE-2026-70628.patch', 'd68cd830fb5f5dd2f597918def2efcdbf15306a9c8697cdae44636d1dd76c179']],
    ['v157-ffmpeg-cfhd-downstream-backport', ['CVE-2026-70632.patch', 'a45eaa63baad988a38aacdd4c58470e3b80ef49ecd19f3e53c68b954317594a7']],
  ]);
  for (const review of reviews) {
    const [file, hash] = expected.get(review.id);
    const actual = createHash('sha256').update(readFileSync(join('security', 'patches', 'ffmpeg', file))).digest('hex');
    assert.equal(actual, hash);
    assert.match(review.rationale, new RegExp(hash));
  }
});

test('accepts the isolated fixed reviews through October 14 and rejects October 15', () => {
  const boundary = runPreflight('2026-10-14');
  assert.equal(boundary.status, 0, boundary.stderr);

  const expired = runPreflight('2026-10-15');
  assert.equal(expired.status, 1);
  assert.match(expired.stderr, /review expired on 2026-10-14/);
});
