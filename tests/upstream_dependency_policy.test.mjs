import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

const evaluator = 'scripts/evaluate-upstream-dependency-report.mjs';
const sourceLabels = {
  'org.opencontainers.image.revision': 'fixture-sha',
  'org.opencontainers.image.version': 'v1.6.5',
};
const layerId = `sha256:${'4'.repeat(64)}`;
const configText = JSON.stringify({
  architecture: 'amd64', os: 'linux', config: { Labels: sourceLabels }, rootfs: { type: 'layers', diff_ids: [layerId] },
});
const imageId = `sha256:${sha256(configText)}`;
const registryManifestText = JSON.stringify({
  schemaVersion: 2,
  mediaType: 'application/vnd.oci.image.manifest.v1+json',
  config: { mediaType: 'application/vnd.oci.image.config.v1+json', digest: imageId, size: Buffer.byteLength(configText) },
  layers: [{ mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip', digest: `sha256:${'6'.repeat(64)}`, size: 123 }],
});
const syftManifestText = JSON.stringify({
  schemaVersion: 2,
  mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
  config: { mediaType: 'application/vnd.docker.container.image.v1+json', digest: imageId, size: Buffer.byteLength(configText) },
  layers: [{ mediaType: 'application/vnd.docker.image.rootfs.diff.tar.gzip', digest: layerId, size: 123 }],
});
const imageDigest = `sha256:${sha256(registryManifestText)}`;
const syftManifestDigest = `sha256:${sha256(syftManifestText)}`;
const imageRef = `coderluii/holyclaude@${imageDigest}`;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function immutableRecord(text, name) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf(`  - name: ${name}`);
  assert.notEqual(start, -1, `missing immutable record ${name}`);
  let section = '';
  for (let index = start - 1; index >= 0; index -= 1) {
    if (/^\S[^:]*:$/.test(lines[index])) {
      section = lines[index].slice(0, -1);
      break;
    }
  }
  let end = start + 1;
  while (end < lines.length && !/^  - name: /.test(lines[end]) && !/^\S/.test(lines[end])) end += 1;
  return `${section}\n${lines.slice(start, end).join('\n').replace(/\n+$/, '')}\n`;
}

function component({
  id = 'pkg:npm/example@1.0.0?package-id=fixture',
  purl = 'pkg:npm/example@1.0.0',
  name = 'example',
  version = '1.0.0',
  type = 'npm',
  path = '/usr/local/lib/node_modules/example/package.json',
} = {}) {
  return {
    type: 'library',
    name,
    version,
    purl,
    'bom-ref': id,
    properties: [
      { name: 'syft:package:type', value: type },
      { name: 'syft:location:0:layerID', value: layerId },
      { name: 'syft:location:0:path', value: path },
    ],
  };
}

function match({
  id = 'CVE-2099-0001',
  severity = 'Critical',
  artifactId = 'pkg:npm/example@1.0.0?package-id=fixture',
  purl = 'pkg:npm/example@1.0.0',
  name = 'example',
  version = '1.0.0',
  type = 'npm',
  path = '/usr/local/lib/node_modules/example/package.json',
  fixState = 'fixed',
  fixVersions = ['1.0.1'],
} = {}) {
  return {
    vulnerability: {
      id,
      severity,
      dataSource: `https://github.com/advisories/${id}`,
      fix: { state: fixState, versions: fixVersions },
    },
    relatedVulnerabilities: [{ id: `GHSA-${id.slice(-4)}` }],
    artifact: {
      id: artifactId,
      name,
      version,
      type,
      purl,
      locations: [{ path }],
    },
    matchDetails: [],
  };
}

function fixture() {
  const fixtureComponent = component();
  return {
    policy: JSON.parse(readFileSync('security/upstream-dependency-policy.json', 'utf8')),
    report: {
      matches: [match()],
      ignoredMatches: [],
      source: { type: 'sbom-file', target: 'fixture' },
      distro: { name: 'debian', version: '12.15' },
      descriptor: { name: 'grype', version: '0.120.0', configuration: {} },
    },
    sbom: {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      metadata: {
        component: { 'bom-ref': '5b7642aa89f8ce21', type: 'container', name: 'coderluii/holyclaude', version: 'fixture-image' },
        properties: [
          { name: 'syft:image:labels:org.opencontainers.image.revision', value: 'fixture-sha' },
          { name: 'syft:image:labels:org.opencontainers.image.version', value: 'v1.6.5' },
        ],
      },
      components: [fixtureComponent],
    },
    syft: {
      artifacts: [{
        id: 'fixture', name: fixtureComponent.name, version: fixtureComponent.version,
        type: 'npm', purl: fixtureComponent.purl,
        locations: [{ path: '/usr/local/lib/node_modules/example/package.json', layerID: layerId }],
      }],
      source: {
        id: imageDigest.slice(7), name: 'coderluii/holyclaude', version: 'fixture-image', type: 'image',
        metadata: {
          userInput: imageRef, imageID: imageId, manifestDigest: imageDigest,
          mediaType: 'application/vnd.oci.image.manifest.v1+json',
          manifest: Buffer.from(registryManifestText).toString('base64'),
          config: Buffer.from(configText).toString('base64'),
          architecture: 'amd64', os: 'linux', labels: sourceLabels,
          layers: [{ mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip', digest: layerId, size: 123 }],
          imageSize: 123,
        },
      },
      descriptor: { name: 'syft', version: '1.54.0', configuration: {} },
    },
    database: {
      schemaVersion: 'v6.1.10',
      built: '2026-10-05T00:00:00Z',
      source: `https://grype.anchore.io/databases/v6/database.tar.zst?checksum=sha256:${'2'.repeat(64)}`,
      checksum: `sha256:${'2'.repeat(64)}`,
      valid: true,
    },
    immutableInputs: readFileSync('security/immutable-inputs.yml', 'utf8'),
  };
}

function setIgnored(data, {
  purl = 'pkg:deb/debian/linux-libc-dev@6.1.0?arch=amd64',
  path = '/var/lib/dpkg/status',
  extraPath,
} = {}) {
  const ignored = match({
    id: 'CVE-2099-9001', severity: 'Negligible', artifactId: `${purl}${purl.includes('?') ? '&' : '?'}package-id=fixture`,
    purl, name: 'linux-libc-dev', version: '6.1.0', type: 'deb', path,
    fixState: 'not-fixed', fixVersions: [],
  });
  if (extraPath) ignored.artifact.locations.push({ path: extraPath });
  ignored.appliedIgnoreRules = [{
    namespace: '', package: { name: 'linux-libc-dev', language: '', type: 'deb', 'upstream-name': 'linux' },
    'match-type': 'exact-indirect-match',
  }];
  ignored.matchDetails = [{
    type: 'exact-indirect-match', matcher: 'dpkg-matcher',
    searchedBy: { package: { name: 'linux' } }, found: { vulnerabilityID: ignored.vulnerability.id },
  }];
  data.report.matches = [];
  data.report.ignoredMatches = [ignored];
  data.report.descriptor.configuration = {
    'match-upstream-kernel-headers': false,
    ignore: [{
      vulnerability: '', 'include-aliases': false, reason: '', namespace: '', 'fix-state': '',
      package: { name: 'linux-libc-dev', version: '', language: '', type: 'deb', location: '', 'upstream-name': 'linux' },
      'vex-status': '', 'vex-justification': '', 'match-type': 'exact-indirect-match',
    }],
  };
  data.sbom.components = [component({ id: ignored.artifact.id, purl, name: 'linux-libc-dev', version: '6.1.0', type: 'deb', path })];
  if (extraPath) data.sbom.components[0].properties.push({ name: 'syft:location:1:path', value: extraPath });
}

function syncSyftArtifacts(data) {
  data.syft.artifacts = data.sbom.components.flatMap((item) => {
    const type = (item.properties ?? []).find((property) => property.name === 'syft:package:type')?.value;
    if (!type) return [];
    const packageId = item['bom-ref'].match(/[?&]package-id=([^&]+)/)?.[1] ?? item['bom-ref'];
    return [{
      id: packageId,
      name: item.name,
      version: item.version,
      type,
      purl: item.purl ?? '',
      locations: componentCatalogLocationsForFixture(item),
    }];
  });
}

function componentLocationsForFixture(item) {
  return (item.properties ?? [])
    .filter((property) => /^syft:location:\d+:path$/.test(property.name))
    .map((property) => property.value)
    .sort();
}

function componentCatalogLocationsForFixture(item) {
  const locations = new Map();
  for (const property of item.properties ?? []) {
    const match = property.name.match(/^syft:location:(\d+):(path|layerID)$/);
    if (!match) continue;
    const location = locations.get(match[1]) ?? {};
    location[match[2]] = property.value;
    locations.set(match[1], location);
  }
  return [...locations.values()];
}

function useCycloneDxImageProjection(data) {
  const image = data.sbom.metadata.component;
  const labels = Object.fromEntries(data.sbom.metadata.properties.map((property) => [
    property.name.slice('syft:image:labels:'.length), property.value,
  ]));
  data.report.source = {
    type: 'image',
    target: {
      userInput: image.name,
      imageID: image['bom-ref'],
      manifestDigest: image.version,
      mediaType: '', tags: [], imageSize: 0, layers: null, manifest: null, config: null,
      repoDigests: [], architecture: '', os: '', labels,
    },
  };
}

function runFixture(mutate = () => {}, {
  preflight = false, release = 'v1.6.5', variant = 'full', arch = 'amd64', syncSyft = true,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-upstream-policy-'));
  const output = join(root, 'output');
  const data = fixture();
  mutate(data);
  if (syncSyft) syncSyftArtifacts(data);
  if (data.report.source.type === 'sbom-file') data.report.source.target = join(root, 'sbom.json');
  for (const key of ['policy', 'report', 'sbom', 'syft', 'database']) {
    writeFileSync(join(root, `${key}.json`), `${JSON.stringify(data[key], null, 2)}\n`);
  }
  writeFileSync(join(root, 'immutable-inputs.yml'), data.immutableInputs);
  const args = [
    evaluator,
    '--policy', join(root, 'policy.json'),
    '--release', release,
    '--variant', variant,
    '--arch', arch,
    '--as-of', '2026-10-05',
  ];
  if (preflight) {
    args.push('--preflight', 'true');
  } else {
    args.push(
      '--report', join(root, 'report.json'),
      '--sbom', join(root, 'sbom.json'),
      '--syft-json', join(root, 'syft.json'),
      '--image-ref', imageRef,
      '--db-evidence', join(root, 'database.json'),
      '--immutable-inputs', join(root, 'immutable-inputs.yml'),
      '--output-dir', output,
      '--image-digest', imageDigest,
    );
  }
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8' });
  let evidence = null;
  try {
    evidence = JSON.parse(readFileSync(join(output, 'release-upstream-vulnerabilities.json'), 'utf8'));
  } catch {}
  return { root, output, data, result, evidence };
}

function rerunRelocated(run, sourceTarget) {
  const relocated = join(run.root, 'relocated');
  const output = join(run.root, 'relocated-output');
  mkdirSync(relocated, { recursive: true });
  for (const name of ['policy.json', 'report.json', 'sbom.json', 'syft.json', 'database.json', 'immutable-inputs.yml']) {
    copyFileSync(join(run.root, name), join(relocated, name));
  }
  return spawnSync(process.execPath, [
    evaluator,
    '--policy', join(relocated, 'policy.json'), '--release', 'v1.6.5',
    '--report', join(relocated, 'report.json'), '--sbom', join(relocated, 'sbom.json'),
    '--syft-json', join(relocated, 'syft.json'), '--image-ref', imageRef,
    '--expected-source-target', sourceTarget,
    '--db-evidence', join(relocated, 'database.json'), '--immutable-inputs', join(relocated, 'immutable-inputs.yml'),
    '--output-dir', output, '--variant', 'full', '--arch', 'amd64',
    '--image-digest', imageDigest, '--as-of', '2026-10-05',
  ], { cwd: process.cwd(), encoding: 'utf8' });
}

function cleanup(t, root) {
  t.after(() => rmSync(root, { recursive: true, force: true }));
}

test('accepts fixable Critical and High upstream findings without calling them fixed', (t) => {
  const run = runFixture(({ report, sbom }) => {
    report.matches.push(match({ id: 'CVE-2099-0002', severity: 'High', artifactId: 'pkg:npm/second@2.0.0?package-id=fixture', purl: 'pkg:npm/second@2.0.0', name: 'second', version: '2.0.0', path: '/usr/local/lib/node_modules/second/package.json', fixState: 'not-fixed', fixVersions: [] }));
    sbom.components.push(component({ id: 'pkg:npm/second@2.0.0?package-id=fixture', purl: 'pkg:npm/second@2.0.0', name: 'second', version: '2.0.0', path: '/usr/local/lib/node_modules/second/package.json' }));
  });
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.status, 'accepted_upstream_vulnerability_not_fixed');
  assert.deepEqual(run.evidence.severityCounts, { Unknown: 0, Negligible: 0, Low: 0, Medium: 0, High: 1, Critical: 1 });
  assert.deepEqual(run.evidence.findings[0].fixVersions.concat(run.evidence.findings[1].fixVersions).sort(), ['1.0.1']);
  assert.ok(run.evidence.findings.every((finding) => finding.disposition === 'accepted_upstream_vulnerability_not_fixed'));
});

test('accepts every lower severity and a valid empty report', (t) => {
  const lower = ['Unknown', 'Negligible', 'Low', 'Medium'].map((severity, index) => {
    const suffix = index + 1;
    return match({ id: `CVE-2099-100${suffix}`, severity, artifactId: `pkg:npm/example${suffix}@1.0.0?package-id=fixture`, purl: `pkg:npm/example${suffix}@1.0.0`, name: `example${suffix}`, path: `/usr/local/lib/node_modules/example${suffix}/package.json`, fixState: 'not-fixed', fixVersions: [] });
  });
  const run = runFixture(({ report, sbom }) => {
    report.matches = lower;
    sbom.components = lower.map((item) => component({ id: item.artifact.id, purl: item.artifact.purl, name: item.artifact.name, path: item.artifact.locations[0].path }));
  });
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.deepEqual(run.evidence.severityCounts, { Unknown: 1, Negligible: 1, Low: 1, Medium: 1, High: 0, Critical: 0 });

  const empty = runFixture(({ report, sbom }) => { report.matches = []; sbom.components = []; });
  cleanup(t, empty.root);
  assert.equal(empty.result.status, 0, empty.result.stderr);
  assert.equal(empty.evidence.rawMatchCount, 0);
  assert.deepEqual(empty.evidence.findings, []);
});

test('accepts the official Grype empty-report omission of ignoredMatches', (t) => {
  const run = runFixture(({ report }) => {
    report.matches = [];
    delete report.ignoredMatches;
  });
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.rawMatchCount, 0);
  assert.equal(run.evidence.ignoredMatchCount, 0);
});

test('accepts the exact Grype image projection emitted from a Syft CycloneDX SBOM', (t) => {
  const run = runFixture((data) => {
    useCycloneDxImageProjection(data);
    data.syft.source.metadata.labels = {
      'org.opencontainers.image.version': 'v1.6.5',
      'org.opencontainers.image.revision': 'fixture-sha',
    };
  });
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.scanner.source.type, 'image');
  assert.equal(run.evidence.syftJsonSha256, sha256(readFileSync(join(run.root, 'syft.json'), 'utf8')));
});

test('preserves duplicate occurrences and exact component identities', (t) => {
  const run = runFixture(({ report }) => report.matches.push(structuredClone(report.matches[0])));
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.rawMatchCount, 2);
  assert.equal(run.evidence.findings.length, 1);
  assert.equal(run.evidence.findings[0].occurrenceCount, 2);
  assert.equal(run.evidence.findings[0].componentId, 'pkg:npm/example@1.0.0?package-id=fixture');
});

test('rejects a scanner location subset that hides a project-controlled SBOM location', (t) => {
  const run = runFixture(({ sbom }) => {
    sbom.components[0].properties.push({
      name: 'syft:location:1:path',
      value: '/usr/local/lib/holyclaude/example/package.json',
    });
  });
  cleanup(t, run.root);
  assert.notEqual(run.result.status, 0);
  assert.match(run.result.stderr, /scanner locations do not equal the exact SBOM component locations/);
});

test('accepts an exact retained modified third-party dependency and labels it honestly', (t) => {
  const run = runFixture(({ report, sbom }) => {
    report.matches = [match({
      id: 'CVE-2099-2001', severity: 'High', artifactId: 'pkg:npm/nanoid@3.3.19?package-id=cloudcli',
      purl: 'pkg:npm/nanoid@3.3.19', name: 'nanoid', version: '3.3.19',
      path: '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/nanoid/package.json',
    })];
    sbom.components = [component({
      id: report.matches[0].artifact.id, purl: report.matches[0].artifact.purl,
      name: 'nanoid', version: '3.3.19', path: report.matches[0].artifact.locations[0].path,
    })];
  });
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.findings[0].provenanceClass, 'retained_modified_third_party');
  assert.match(run.evidence.findings[0].dependencyOrigin, /^retained_modified_third_party:/);
});

test('classifies upgraded Vercel dependencies as official npm inputs rather than retained overlays', (t) => {
  const policy = JSON.parse(readFileSync('security/upstream-dependency-policy.json', 'utf8'));
  const retainedLocations = policy.retainedModifiedInputs.flatMap((input) => input.locationPrefixes);
  const retainedAnchors = policy.retainedModifiedInputs.flatMap((input) => input.inventoryAnchors);
  assert.equal(retainedLocations.some((path) => path.includes('/vercel/')), false);
  assert.equal(retainedAnchors.some((name) => name.toLowerCase().includes('vercel')), false);
  const easTar = policy.retainedModifiedInputs.find((input) =>
    input.locationPrefixes.includes('/usr/local/lib/node_modules/eas-cli/node_modules/tar/'));
  assert.ok(easTar);
  assert.ok(easTar.inventoryAnchors.includes('node-tar npm package'));

  const run = runFixture(({ report, sbom }) => {
    const purl = 'pkg:npm/tar@7.5.7';
    const path = '/usr/local/lib/node_modules/vercel/node_modules/tar/package.json';
    report.matches[0] = match({ artifactId: `${purl}?package-id=vercel`, purl, name: 'tar', version: '7.5.7', path });
    sbom.components[0] = component({ id: report.matches[0].artifact.id, purl, name: 'tar', version: '7.5.7', path });
  });
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.findings[0].provenanceClass, 'official_third_party');
  assert.equal(run.evidence.findings[0].dependencyOrigin, 'npm registry packages');
});

for (const [name, version, path] of [
  ['golang.org/x/sys', 'v0.35.0', '/usr/local/bin/fzf'],
  ['golang.org/x/crypto', 'v0.57.0', '/usr/bin/gh'],
]) {
  test(`classifies ${name} in its exact official release binary as an upstream dependency`, (t) => {
    const purl = `pkg:golang/${name}@${version}`;
    const run = runFixture(({ report, sbom }) => {
      report.matches[0] = match({
        artifactId: `${purl}?package-id=fixture`, purl, name, version, type: 'go-module', path,
      });
      sbom.components[0] = component({
        id: report.matches[0].artifact.id, purl, name, version, type: 'go-module', path,
      });
    });
    cleanup(t, run.root);
    assert.equal(run.result.status, 0, run.result.stderr);
    assert.equal(run.evidence.findings[0].dependencyOrigin, 'bundled official Go module releases');
  });
}

test('does not treat a path sharing an official binary prefix as the official binary', (t) => {
  const name = 'golang.org/x/crypto';
  const version = 'v0.57.0';
  const purl = `pkg:golang/${name}@${version}`;
  const run = runFixture(({ report, sbom }) => {
    report.matches[0] = match({
      artifactId: `${purl}?package-id=fixture`, purl, name, version, type: 'go-module', path: '/usr/bin/gh-unbound',
    });
    sbom.components[0] = component({
      id: report.matches[0].artifact.id, purl, name, version, type: 'go-module', path: '/usr/bin/gh-unbound',
    });
  });
  cleanup(t, run.root);
  assert.notEqual(run.result.status, 0);
  assert.match(run.result.stderr, /matched 0 official input origins/);
});

test('retained immutable record hashes reproduce from the exact v1.6.4 baseline', () => {
  const policy = JSON.parse(readFileSync('security/upstream-dependency-policy.json', 'utf8'));
  const baseline = JSON.parse(readFileSync(policy.retainedBaselineEvidence, 'utf8'));
  const baselineText = execFileSync('git', ['show', `${policy.retainedBaselineCommit}:security/immutable-inputs.yml`], { encoding: 'utf8' });
  const expectedAnchors = policy.retainedModifiedInputs.flatMap((input) => input.inventoryAnchors).sort();
  assert.deepEqual(Object.keys(baseline.immutableRecordSha256).sort(), expectedAnchors);
  for (const anchor of expectedAnchors) {
    const baselineName = baseline.immutableRecordBaselineNames[anchor] ?? anchor;
    assert.equal(sha256(immutableRecord(baselineText, baselineName)), baseline.immutableRecordSha256[anchor], anchor);
  }
});

test('rejects a retained component whose exact version, purl, or locations differ from the v1.6.4 baseline', (t) => {
  const run = runFixture(({ report, sbom }) => {
    report.matches = [match({
      artifactId: 'pkg:npm/nanoid@3.3.20?package-id=cloudcli', purl: 'pkg:npm/nanoid@3.3.20',
      name: 'nanoid', version: '3.3.20',
      path: '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/node_modules/nanoid/package.json',
    })];
    sbom.components = [component({
      id: report.matches[0].artifact.id, purl: report.matches[0].artifact.purl,
      name: 'nanoid', version: '3.3.20', path: report.matches[0].artifact.locations[0].path,
    })];
  });
  cleanup(t, run.root);
  assert.notEqual(run.result.status, 0);
  assert.match(run.result.stderr, /retained modified identity is not bound to the v1\.6\.4 baseline/);
});

test('rejects retained modified classification when immutable inventory records are missing, duplicated, or changed', (t) => {
  const missing = runFixture((data) => {
    data.immutableInputs = data.immutableInputs.replace(
      /  - name: CloudCLI HolyClaude account-management artifact\r?\n/,
      '  - name: missing CloudCLI account-management artifact\n',
    );
  });
  cleanup(t, missing.root);
  assert.notEqual(missing.result.status, 0);
  assert.match(missing.result.stderr, /immutable inventory record CloudCLI HolyClaude account-management artifact is missing or duplicated/);

  const duplicated = runFixture((data) => {
    data.immutableInputs += '  - name: Cursor CLI\n';
  });
  cleanup(t, duplicated.root);
  assert.notEqual(duplicated.result.status, 0);
  assert.match(duplicated.result.stderr, /immutable inventory record Cursor CLI is missing or duplicated/);

  const changed = runFixture((data) => {
    data.immutableInputs = data.immutableInputs.replace(
      /(- name: CloudCLI HolyClaude account-management artifact[\s\S]*?\n\s+sha256:) [a-f0-9]{64}/,
      `$1 ${'0'.repeat(64)}`,
    );
  });
  cleanup(t, changed.root);
  assert.notEqual(changed.result.status, 0);
  assert.match(changed.result.stderr, /immutable inventory record CloudCLI HolyClaude account-management artifact differs from the v1\.6\.4 baseline/);
});

test('rejects HolyClaude-owned and unclassified components', (t) => {
  const owned = runFixture(({ report, sbom }) => {
    report.matches[0] = match({ artifactId: 'pkg:generic/holyclaude@1.6.5?package-id=fixture', purl: 'pkg:generic/holyclaude@1.6.5', name: 'holyclaude', version: '1.6.5', type: 'binary', path: '/usr/local/bin/holyclaude-helper' });
    sbom.components[0] = component({ id: report.matches[0].artifact.id, purl: report.matches[0].artifact.purl, name: 'holyclaude', version: '1.6.5', path: '/usr/local/bin/holyclaude-helper' });
  });
  cleanup(t, owned.root);
  assert.notEqual(owned.result.status, 0);
  assert.match(owned.result.stderr, /project-controlled component/);

  const unknown = runFixture(({ report, sbom }) => {
    report.matches[0].artifact.type = 'ruby-gem';
    report.matches[0].artifact.purl = 'pkg:gem/example@1.0.0';
    report.matches[0].artifact.id = 'pkg:gem/example@1.0.0?package-id=fixture';
    sbom.components[0].purl = report.matches[0].artifact.purl;
    sbom.components[0]['bom-ref'] = report.matches[0].artifact.id;
  });
  cleanup(t, unknown.root);
  assert.notEqual(unknown.result.status, 0);
  assert.match(unknown.result.stderr, /matched 0 official input origins/);
});

for (const [label, type, purl, name, path] of [
  ['npm name', 'npm', 'pkg:npm/holyclaude@1.6.5', 'holyclaude', '/usr/local/lib/node_modules/holyclaude/package.json'],
  ['scoped npm name', 'npm', 'pkg:npm/%40holyclaude/helper@1.6.5', '@holyclaude/helper', '/usr/local/lib/node_modules/@holyclaude/helper/package.json'],
  ['normalized PyPI name', 'python', 'pkg:pypi/holy_claude@1.6.5', 'Holy.Claude', '/opt/venv/lib/python3.14/site-packages/holy_claude/__init__.py'],
]) {
  test(`rejects project-controlled ${label} at an ordinary official dependency path`, (t) => {
    const run = runFixture(({ report, sbom }) => {
      report.matches[0] = match({ artifactId: `${purl}?package-id=owned`, purl, name, version: '1.6.5', type, path });
      sbom.components[0] = component({ id: report.matches[0].artifact.id, purl, name, version: '1.6.5', path });
    });
    cleanup(t, run.root);
    assert.notEqual(run.result.status, 0);
    assert.match(run.result.stderr, /project-controlled component/);
  });
}

for (const [label, options, expected] of [
  ['unbound ignored artifact', { purl: 'pkg:generic/unbound@6.1.0' }, /matched 0 official input origins/],
  ['project-controlled ignored artifact', { purl: 'pkg:generic/holyclaude@1.6.5' }, /project-controlled component/],
  ['mixed-location ignored artifact', { extraPath: '/usr/local/lib/holyclaude/linux-libc-dev' }, /project-controlled component/],
]) {
  test(`rejects ${label} before advisory acceptance`, (t) => {
    const run = runFixture((data) => setIgnored(data, options));
    cleanup(t, run.root);
    assert.notEqual(run.result.status, 0);
    assert.match(run.result.stderr, expected);
  });
}

for (const [type, purl, path] of [
  ['binary', 'pkg:generic/holyclaude@1.6.5', '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/holyclaude'],
  ['go-module', 'pkg:golang/example.com/holyclaude@v1.6.5', '/home/claude/.claude-code-ui/plugins/project-stats/holyclaude'],
]) {
  test(`project-controlled identity blocks before retained ${type} path classification`, (t) => {
    const run = runFixture(({ policy, report, sbom }) => {
      policy.projectControlled.versionContains.push('holyclaude-owned');
      report.matches[0] = match({
        artifactId: `${purl}?package-id=owned`, purl, name: 'holyclaude-owned',
        version: '1.6.5-holyclaude-owned', type, path,
      });
      sbom.components[0] = component({
        id: report.matches[0].artifact.id, purl, name: 'holyclaude-owned',
        version: '1.6.5-holyclaude-owned', path,
      });
    });
    cleanup(t, run.root);
    assert.notEqual(run.result.status, 0);
    assert.match(run.result.stderr, /project-controlled component/);
  });
}

for (const [label, mutate, expected] of [
  ['unsupported scanner version', ({ report }) => { report.descriptor.version = '0.119.0'; }, /expected Grype 0\.120\.0/],
  ['missing SBOM identity', ({ report }) => { delete report.matches[0].artifact.id; }, /lacks exact SBOM identity/],
  ['ambiguous SBOM identity', ({ sbom }) => { sbom.components.push(structuredClone(sbom.components[0])); sbom.components[1]['bom-ref'] = sbom.components[0]['bom-ref']; }, /component identities must be unique/],
  ['malformed fix versions', ({ report }) => { report.matches[0].vulnerability.fix.versions = '1.0.1'; }, /fix metadata is malformed/],
  ['invalid severity', ({ report }) => { report.matches[0].vulnerability.severity = 'Severe'; }, /invalid severity/],
  ['explicit null ignored matches', ({ report }) => { report.ignoredMatches = null; }, /ignoredMatches must be an array/],
  ['arbitrary ignored match', ({ report }) => { report.ignoredMatches = [structuredClone(report.matches[0])]; }, /match-upstream-kernel-headers=false/],
  ['tampered database checksum', ({ database }) => { database.checksum = 'sha256:bad'; }, /database checksum is invalid/],
  ['database source checksum mismatch', ({ database }) => { database.checksum = `sha256:${'3'.repeat(64)}`; }, /source checksum does not match evidence/],
  ['stale database', ({ database }) => { database.built = '2026-09-01T00:00:00Z'; }, /future-dated or stale/],
  ['unofficial database host', ({ database }) => { database.source = 'https://example.com/grype/db'; }, /database source is invalid/],
  ['report not sourced from an SBOM', ({ report }) => { report.source.type = 'image'; }, /not the exact supplied CycloneDX projection/],
  ['tampered Syft image reference', ({ syft }) => { syft.source.metadata.userInput = 'coderluii/other@sha256:bad'; }, /not bound to the requested image reference/],
  ['tampered Syft image digest', ({ syft }) => { syft.source.metadata.manifestDigest = `sha256:${'3'.repeat(64)}`; }, /not bound to the requested image digest/],
  ['Docker-provider Syft manifest projection', ({ syft }) => {
    syft.source.id = syftManifestDigest.slice('sha256:'.length);
    syft.source.metadata.manifestDigest = syftManifestDigest;
    syft.source.metadata.mediaType = 'application/vnd.docker.distribution.manifest.v2+json';
    syft.source.metadata.manifest = Buffer.from(syftManifestText).toString('base64');
  }, /not bound to the requested image digest/],
  ['tampered Syft manifest bytes', ({ syft }) => { syft.source.metadata.manifest = Buffer.from('{}').toString('base64'); }, /manifest bytes do not match/],
  ['tampered Syft config bytes', ({ syft }) => { syft.source.metadata.config = Buffer.from('{}').toString('base64'); }, /config is not bound/],
  ['tampered Syft source layer identity', ({ syft }) => { syft.source.metadata.layers[0].digest = `sha256:${'5'.repeat(64)}`; }, /platform or content evidence is invalid/],
  ['tampered CycloneDX image identity', ({ sbom }) => { sbom.metadata.component['bom-ref'] = 'tampered-image-id'; }, /not bound to the Syft image source/],
]) {
  test(`rejects ${label}`, (t) => {
    const run = runFixture(mutate);
    cleanup(t, run.root);
    assert.notEqual(run.result.status, 0);
    assert.match(run.result.stderr, expected);
  });
}

test('rejects an untyped CycloneDX library component instead of silently filtering it', (t) => {
  const run = runFixture(({ sbom }) => {
    sbom.components[0].properties = sbom.components[0].properties.filter((property) => property.name !== 'syft:package:type');
    sbom.components[0].type = 'library';
  }, { syncSyft: false });
  cleanup(t, run.root);
  assert.notEqual(run.result.status, 0);
  assert.match(run.result.stderr, /without Syft package identity has an invalid type/);
});

test('rejects a CycloneDX package catalog that differs from the Syft JSON catalog', (t) => {
  const run = runFixture(({ syft }) => {
    syft.artifacts[0].version = 'tampered';
  }, { syncSyft: false });
  cleanup(t, run.root);
  assert.notEqual(run.result.status, 0);
  assert.match(run.result.stderr, /package catalog is not bound/);
});

test('rejects a Syft package layer identity that differs from CycloneDX', (t) => {
  const run = runFixture(({ syft }) => {
    syft.artifacts[0].locations[0].layerID = `sha256:${'5'.repeat(64)}`;
  }, { syncSyft: false });
  cleanup(t, run.root);
  assert.notEqual(run.result.status, 0);
  assert.match(run.result.stderr, /package catalog is not bound/);
});

test('allows promotion revalidation after evidence relocation only with the authenticated original source target', (t) => {
  const run = runFixture();
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);

  const sourceTarget = run.data.report.source.target;
  const relocated = rerunRelocated(run, sourceTarget);
  assert.equal(relocated.status, 0, relocated.stderr);

  const wrongSource = rerunRelocated(run, join(run.root, 'other-sbom.json'));
  assert.notEqual(wrongSource.status, 0);
  assert.match(wrongSource.stderr, /not bound to the supplied SBOM/);
});

test('rejects wrong release, target, and image digest', (t) => {
  const wrongRelease = runFixture(() => {}, { release: 'v1.6.4', preflight: true });
  cleanup(t, wrongRelease.root);
  assert.notEqual(wrongRelease.result.status, 0);
  assert.match(wrongRelease.result.stderr, /must target v1\.6\.5/);

  const wrongTarget = runFixture(() => {}, { arch: 'ppc64le', preflight: true });
  cleanup(t, wrongTarget.root);
  assert.notEqual(wrongTarget.result.status, 0);
  assert.match(wrongTarget.result.stderr, /requested target is invalid/);

  const invalidDigest = runFixture(() => {});
  cleanup(t, invalidDigest.root);
  const rerun = spawnSync(process.execPath, [
    evaluator, '--policy', join(invalidDigest.root, 'policy.json'), '--release', 'v1.6.5',
    '--variant', 'full', '--arch', 'amd64', '--as-of', '2026-10-05',
    '--report', join(invalidDigest.root, 'report.json'), '--sbom', join(invalidDigest.root, 'sbom.json'),
    '--syft-json', join(invalidDigest.root, 'syft.json'), '--image-ref', imageRef,
    '--db-evidence', join(invalidDigest.root, 'database.json'), '--immutable-inputs', join(invalidDigest.root, 'immutable-inputs.yml'),
    '--output-dir', join(invalidDigest.root, 'invalid-output'), '--image-digest', 'latest',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(rerun.status, 0);
  assert.match(rerun.stderr, /image digest must be a lowercase SHA-256 digest/);
});

test('binds actual policy, report, SBOM, database, immutable input, and image evidence', (t) => {
  const run = runFixture();
  cleanup(t, run.root);
  assert.equal(run.result.status, 0, run.result.stderr);
  assert.equal(run.evidence.policySha256, sha256(readFileSync(join(run.root, 'policy.json'), 'utf8')));
  assert.equal(run.evidence.reportSha256, sha256(readFileSync(join(run.root, 'report.json'), 'utf8')));
  assert.equal(run.evidence.sbomSha256, sha256(readFileSync(join(run.root, 'sbom.json'), 'utf8')));
  assert.equal(run.evidence.databaseEvidenceSha256, sha256(readFileSync(join(run.root, 'database.json'), 'utf8')));
  assert.equal(run.evidence.immutableInputsSha256, sha256(readFileSync(join(run.root, 'immutable-inputs.yml'), 'utf8')));
  assert.equal(run.evidence.retainedBaselineSha256, sha256(readFileSync('security/retained-modified-third-party-baseline.json', 'utf8')));
  assert.equal(run.evidence.imageDigest, imageDigest);
});

test('changed raw evidence requires a regenerated acceptance record', (t) => {
  const first = runFixture();
  cleanup(t, first.root);
  assert.equal(first.result.status, 0, first.result.stderr);
  const originalHash = first.evidence.reportSha256;
  const changed = runFixture(({ report }) => { report.matches[0].vulnerability.fix.versions.push('1.0.2'); });
  cleanup(t, changed.root);
  assert.equal(changed.result.status, 0, changed.result.stderr);
  assert.notEqual(changed.evidence.reportSha256, originalHash);
  assert.deepEqual(changed.evidence.findings[0].fixVersions, ['1.0.1', '1.0.2']);
});

test('committed policy preflight has standing authorization and all native targets', () => {
  for (const [variant, arch] of [['full', 'amd64'], ['full', 'arm64'], ['slim', 'amd64'], ['slim', 'arm64']]) {
    const result = spawnSync(process.execPath, [
      evaluator, '--policy', 'security/upstream-dependency-policy.json', '--release', 'v1.6.5',
      '--variant', variant, '--arch', arch, '--as-of', '2026-10-05', '--preflight', 'true',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  const policy = JSON.parse(readFileSync('security/upstream-dependency-policy.json', 'utf8'));
  assert.equal('expiresAt' in policy, false);
});
