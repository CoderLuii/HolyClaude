import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reviews = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8')).reviews;
const reviewedAt = '2026-09-24';
const expiresAt = '2026-10-01';
const common = {
  disposition: 'high_exception',
  effectiveSeverity: 'High',
  owner: 'Debian Bookworm base',
  approvedBy: 'CoderLuii',
};

const expected = [
  {
    id: 'v163-perl-cve-2026-82560-high-exception',
    cve: 'CVE-2026-82560',
    names: ['libperl5.36', 'perl', 'perl-base', 'perl-modules-5.36'],
    version: '5.36.0-7+deb12u3',
    variants: ['full', 'slim'],
    locations: [
      '^/usr/share/doc/libperl5\\.36/copyright$',
      '^/usr/share/doc/perl-base/copyright$',
      '^/usr/share/doc/perl-modules-5\\.36/copyright$',
      '^/usr/share/doc/perl/copyright$',
      '^/var/lib/dpkg/info/libperl5\\.36:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libperl5\\.36:arm64\\.md5sums$',
      '^/var/lib/dpkg/info/perl-base\\.list$',
      '^/var/lib/dpkg/info/perl-base\\.md5sums$',
      '^/var/lib/dpkg/info/perl-base\\.postinst$',
      '^/var/lib/dpkg/info/perl-base\\.postrm$',
      '^/var/lib/dpkg/info/perl-base\\.preinst$',
      '^/var/lib/dpkg/info/perl-base\\.prerm$',
      '^/var/lib/dpkg/info/perl-modules-5\\.36\\.list$',
      '^/var/lib/dpkg/info/perl-modules-5\\.36\\.md5sums$',
      '^/var/lib/dpkg/info/perl\\.conffiles$',
      '^/var/lib/dpkg/info/perl\\.list$',
      '^/var/lib/dpkg/info/perl\\.md5sums$',
      '^/var/lib/dpkg/info/perl\\.postinst$',
      '^/var/lib/dpkg/info/perl\\.postrm$',
      '^/var/lib/dpkg/info/perl\\.preinst$',
      '^/var/lib/dpkg/info/perl\\.prerm$',
      '^/var/lib/dpkg/status$',
    ],
  },
  ...['CVE-2026-84384', 'CVE-2026-84447', 'CVE-2026-84446', 'CVE-2026-84444'].flatMap((cve) => [
    {
      id: `v163-libheif1-${cve.toLowerCase()}-high-exception`,
      cve,
      names: ['libheif1'],
      version: '1.15.1-1+deb12u1',
      variants: ['full', 'slim'],
      locations: [
        '^/usr/share/doc/libheif1/copyright$',
        '^/var/lib/dpkg/info/libheif1:amd64\\.md5sums$',
        '^/var/lib/dpkg/info/libheif1:arm64\\.md5sums$',
        '^/var/lib/dpkg/status$',
      ],
    },
    {
      id: `v163-full-libheif-dev-${cve.toLowerCase()}-high-exception`,
      cve,
      names: ['libheif-dev'],
      version: '1.15.1-1+deb12u1',
      variants: ['full'],
      locations: [
        '^/usr/share/doc/libheif-dev/copyright$',
        '^/var/lib/dpkg/info/libheif-dev:amd64\\.md5sums$',
        '^/var/lib/dpkg/info/libheif-dev:arm64\\.md5sums$',
        '^/var/lib/dpkg/status$',
      ],
    },
  ]),
  ...[
    ['CVE-2026-88807', 'libxrender1', 'libxrender-dev', '1:0.9.10-1.1'],
  ].flatMap(([cve, runtime, development, version]) => [
    {
      id: `v163-${runtime}-${cve.toLowerCase()}-high-exception`,
      cve,
      names: [runtime],
      version,
      variants: ['full', 'slim'],
      locations: [
        `^/usr/share/doc/${runtime}/copyright$`,
        `^/var/lib/dpkg/info/${runtime}:amd64\\.md5sums$`,
        `^/var/lib/dpkg/info/${runtime}:arm64\\.md5sums$`,
        '^/var/lib/dpkg/status$',
      ],
    },
    {
      id: `v163-full-${development}-${cve.toLowerCase()}-high-exception`,
      cve,
      names: [development],
      version,
      variants: ['full'],
      locations: [
        `^/usr/share/doc/${development}/copyright$`,
        `^/var/lib/dpkg/info/${development}:amd64\\.md5sums$`,
        `^/var/lib/dpkg/info/${development}:arm64\\.md5sums$`,
        '^/var/lib/dpkg/status$',
      ],
    },
  ]),
  {
    id: 'v163-libx11-cve-2026-88806-high-exception',
    cve: 'CVE-2026-88806',
    names: ['libx11-6', 'libx11-data', 'libx11-xcb1'],
    version: '2:1.8.4-2+deb12u2',
    variants: ['full', 'slim'],
    locations: [
      '^/usr/share/doc/libx11-6/copyright$',
      '^/usr/share/doc/libx11-data/copyright$',
      '^/usr/share/doc/libx11-xcb1/copyright$',
      '^/var/lib/dpkg/info/libx11-6:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libx11-6:arm64\\.md5sums$',
      '^/var/lib/dpkg/info/libx11-data\\.list$',
      '^/var/lib/dpkg/info/libx11-data\\.md5sums$',
      '^/var/lib/dpkg/info/libx11-xcb1:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libx11-xcb1:arm64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ],
  },
  {
    id: 'v163-full-libx11-dev-cve-2026-88806-high-exception',
    cve: 'CVE-2026-88806',
    names: ['libx11-dev'],
    version: '2:1.8.4-2+deb12u2',
    variants: ['full'],
    locations: [
      '^/usr/share/doc/libx11-dev/copyright$',
      '^/var/lib/dpkg/info/libx11-dev:amd64\\.md5sums$',
      '^/var/lib/dpkg/info/libx11-dev:arm64\\.md5sums$',
      '^/var/lib/dpkg/status$',
    ],
  },
];

test('retains only the v1.6.3 High reviews still present in v1.6.4', () => {
  const v163 = reviews.filter((review) => review.id.startsWith('v163-'));
  assert.equal(v163.length, 13);
  assert.deepEqual(v163.map((review) => review.id).sort(), expected.map((review) => review.id).sort());

  for (const item of expected) {
    const review = v163.find((candidate) => candidate.id === item.id);
    assert.ok(review, item.id);
    assert.deepEqual(review.vulnerabilities, [item.cve]);
    assert.deepEqual(review.component.names, item.names);
    assert.deepEqual(review.component.versions, [item.version]);
    assert.deepEqual(review.component.types, ['deb']);
    assert.deepEqual(review.component.locationPatterns, item.locations);
    assert.deepEqual(review.variants, item.variants);
    assert.deepEqual(review.architectures, ['amd64', 'arm64']);
    assert.equal(review.disposition, common.disposition);
    assert.equal(review.effectiveSeverity, common.effectiveSeverity);
    assert.equal(review.owner, common.owner);
    assert.equal(review.approvedBy, common.approvedBy);
    assert.equal(review.reviewedAt, reviewedAt);
    assert.equal(review.expiresAt, expiresAt);
    assert.deepEqual(review.authority, {
      name: 'Debian Security Tracker',
      url: `https://security-tracker.debian.org/tracker/${item.cve}`,
    });
    assert.equal('vexStatement' in review, false, item.id);
    assert.match(review.rationale, /affected and unfixed|vulnerable and unfixed/);
  }
});

test('adds no other September 24 review changes', () => {
  const dated = reviews.filter((review) => review.reviewedAt === reviewedAt);
  assert.equal(dated.length, expected.length);
  assert.ok(dated.every((review) => review.id.startsWith('v163-')));
  assert.deepEqual(
    new Set(dated.flatMap((review) => review.vulnerabilities)),
    new Set([
      'CVE-2026-82560',
      'CVE-2026-84384',
      'CVE-2026-84447',
      'CVE-2026-84446',
      'CVE-2026-84444',
      'CVE-2026-88807',
      'CVE-2026-88806',
    ]),
  );
});
