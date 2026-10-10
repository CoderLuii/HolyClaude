#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { validateReport } from './evaluate-security-report.mjs';

const EXPECTED_RELEASE = 'v1.6.6';
const EXPECTED_SYFT_VERSION = '1.54.1';
const EXPECTED_GRYPE_VERSION = '0.120.1';
const EXPECTED_GRYPE_DB_SCHEMA_VERSION = 'v6.1.10';
const SEVERITIES = ['Unknown', 'Negligible', 'Low', 'Medium', 'High', 'Critical'];
const TYPES = new Set(['binary', 'deb', 'go-module', 'java-archive', 'npm', 'python']);
const VARIANTS = new Set(['full', 'slim']);
const ARCHITECTURES = new Set(['amd64', 'arm64']);
const POLICY_KEYS = new Set([
  'schemaVersion', 'release', 'scope', 'disposition', 'approvedBy', 'authorizedAt',
  'officialReleasesOnly', 'targets', 'officialInputs', 'retainedModifiedInputs',
  'retainedBaselineCommit', 'retainedBaselineEvidence', 'projectControlled', 'rationale', 'monitoring',
]);
const INPUT_KEYS = new Set(['origin', 'types', 'purlPrefixes', 'locationPrefixes', 'locationPaths']);
const RETAINED_INPUT_KEYS = new Set([
  'origin', 'types', 'purlPrefixes', 'locationPrefixes', 'versionContains', 'inventoryAnchors',
]);
const CONTROLLED_KEYS = new Set([
  'purlPrefixes', 'normalizedNames', 'namePrefixes', 'versionContains', 'locationPrefixes',
]);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`invalid argument near ${key ?? '<end>'}`);
    const name = key.slice(2);
    if (name in args) throw new Error(`duplicate argument --${name}`);
    args[name] = value;
  }
  for (const required of ['policy', 'release', 'variant', 'arch', 'as-of']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  if (args.preflight !== 'true') {
    for (const required of [
      'report', 'sbom', 'db-evidence', 'immutable-inputs', 'output-dir', 'image-digest',
      'syft-json', 'image-ref',
    ]) {
      if (!args[required]) throw new Error(`missing --${required}`);
    }
  }
  return args;
}

function readText(path) {
  return readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(path) {
  return JSON.parse(readText(path));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} fields are invalid`);
}

function uniqueStrings(values, label) {
  if (
    !Array.isArray(values) || values.length === 0 ||
    values.some((value) => typeof value !== 'string' || !value) ||
    new Set(values).size !== values.length
  ) throw new Error(`${label} must contain unique non-empty strings`);
}

function parseDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label} is invalid`);
  return date;
}

function validatePolicy(policy, args) {
  exactKeys(policy, POLICY_KEYS, 'upstream dependency policy');
  if (policy.schemaVersion !== 1) throw new Error('upstream dependency policy schemaVersion must be 1');
  if (policy.release !== EXPECTED_RELEASE || args.release !== policy.release) {
    throw new Error(`upstream dependency policy and request must target ${EXPECTED_RELEASE}`);
  }
  if (policy.scope !== 'third_party_dependencies_only') throw new Error('upstream dependency policy scope is invalid');
  if (policy.disposition !== 'accepted_upstream_vulnerability_not_fixed') throw new Error('upstream dependency disposition is invalid');
  if (policy.approvedBy !== 'CoderLuii' || policy.officialReleasesOnly !== true) {
    throw new Error('upstream dependency policy authority is invalid');
  }
  if (!/^[a-f0-9]{40}$/.test(policy.retainedBaselineCommit)) throw new Error('retainedBaselineCommit is invalid');
  if (policy.retainedBaselineEvidence !== 'security/retained-modified-third-party-baseline.json') {
    throw new Error('retainedBaselineEvidence is invalid');
  }
  const authorizedAt = parseDate(policy.authorizedAt, 'authorizedAt');
  const asOf = parseDate(args['as-of'], 'as-of');
  if (authorizedAt > asOf) throw new Error('upstream dependency policy was authorized after as-of');
  if (!VARIANTS.has(args.variant) || !ARCHITECTURES.has(args.arch)) throw new Error('requested target is invalid');
  const targets = policy.targets.map((target, index) => {
    exactKeys(target, new Set(['variant', 'architecture']), `target ${index}`);
    if (!VARIANTS.has(target.variant) || !ARCHITECTURES.has(target.architecture)) throw new Error(`target ${index} is invalid`);
    return `${target.variant}/${target.architecture}`;
  });
  const expectedTargets = ['full/amd64', 'full/arm64', 'slim/amd64', 'slim/arm64'];
  if (JSON.stringify([...targets].sort()) !== JSON.stringify(expectedTargets)) throw new Error('policy must declare all four exact targets');
  if (!targets.includes(`${args.variant}/${args.arch}`)) throw new Error('policy does not cover requested target');
  if (!Array.isArray(policy.officialInputs) || policy.officialInputs.length === 0) throw new Error('officialInputs must be non-empty');
  for (const [index, input] of policy.officialInputs.entries()) {
    exactKeys(input, INPUT_KEYS, `officialInputs[${index}]`);
    if (typeof input.origin !== 'string' || !input.origin) throw new Error(`officialInputs[${index}].origin is required`);
    uniqueStrings(input.types, `officialInputs[${index}].types`);
    uniqueStrings(input.purlPrefixes, `officialInputs[${index}].purlPrefixes`);
    uniqueStrings(input.locationPrefixes, `officialInputs[${index}].locationPrefixes`);
    if (!Array.isArray(input.locationPaths) || new Set(input.locationPaths).size !== input.locationPaths.length) {
      throw new Error(`officialInputs[${index}].locationPaths is invalid`);
    }
    if (input.locationPaths.some((value) => typeof value !== 'string' || !value)) {
      throw new Error(`officialInputs[${index}].locationPaths contains an invalid value`);
    }
    if (input.types.some((type) => !TYPES.has(type))) throw new Error(`officialInputs[${index}] contains unsupported types`);
  }
  if (!Array.isArray(policy.retainedModifiedInputs) || policy.retainedModifiedInputs.length === 0) {
    throw new Error('retainedModifiedInputs must be non-empty');
  }
  for (const [index, input] of policy.retainedModifiedInputs.entries()) {
    exactKeys(input, RETAINED_INPUT_KEYS, `retainedModifiedInputs[${index}]`);
    if (typeof input.origin !== 'string' || !input.origin.startsWith('retained_modified_third_party: ')) {
      throw new Error(`retainedModifiedInputs[${index}].origin is invalid`);
    }
    uniqueStrings(input.types, `retainedModifiedInputs[${index}].types`);
    uniqueStrings(input.purlPrefixes, `retainedModifiedInputs[${index}].purlPrefixes`);
    uniqueStrings(input.locationPrefixes, `retainedModifiedInputs[${index}].locationPrefixes`);
    if (!Array.isArray(input.versionContains) || new Set(input.versionContains).size !== input.versionContains.length) {
      throw new Error(`retainedModifiedInputs[${index}].versionContains is invalid`);
    }
    if (input.versionContains.some((value) => typeof value !== 'string' || !value)) {
      throw new Error(`retainedModifiedInputs[${index}].versionContains contains an invalid value`);
    }
    uniqueStrings(input.inventoryAnchors, `retainedModifiedInputs[${index}].inventoryAnchors`);
    if (input.types.some((type) => !TYPES.has(type))) throw new Error(`retainedModifiedInputs[${index}] contains unsupported types`);
  }
  exactKeys(policy.projectControlled, CONTROLLED_KEYS, 'projectControlled');
  for (const key of CONTROLLED_KEYS) uniqueStrings(policy.projectControlled[key], `projectControlled.${key}`);
  for (const key of ['rationale', 'monitoring']) {
    if (typeof policy[key] !== 'string' || !policy[key]) throw new Error(`${key} is required`);
  }
}

function validateRetainedBaseline(baseline, policy) {
  exactKeys(baseline, new Set([
    'schemaVersion', 'baselineRelease', 'baselineCommit', 'sourceWorkflowRun', 'targets',
    'immutableRecordSha256', 'immutableRecordBaselineNames',
  ]), 'retained baseline');
  if (baseline.schemaVersion !== 1 || baseline.baselineRelease !== 'v1.6.4' || baseline.baselineCommit !== policy.retainedBaselineCommit) {
    throw new Error('retained baseline authority is invalid');
  }
  if (!Number.isInteger(baseline.sourceWorkflowRun) || baseline.sourceWorkflowRun < 1) throw new Error('retained baseline source run is invalid');
  const expectedTargets = ['full-amd64', 'full-arm64', 'slim-amd64', 'slim-arm64'];
  if (JSON.stringify(Object.keys(baseline.targets).sort()) !== JSON.stringify(expectedTargets)) {
    throw new Error('retained baseline targets are invalid');
  }
  for (const target of expectedTargets) {
    const record = baseline.targets[target];
    exactKeys(record, new Set(['baselineSbomSha256', 'componentIdentitySha256']), `retained baseline ${target}`);
    if (!/^[a-f0-9]{64}$/.test(record.baselineSbomSha256)) throw new Error(`retained baseline ${target} SBOM hash is invalid`);
    uniqueStrings(record.componentIdentitySha256, `retained baseline ${target} identities`);
    if (record.componentIdentitySha256.some((value) => !/^[a-f0-9]{64}$/.test(value))) {
      throw new Error(`retained baseline ${target} identity hash is invalid`);
    }
  }
  const expectedAnchors = [...new Set(policy.retainedModifiedInputs.flatMap((input) => input.inventoryAnchors))].sort();
  exactKeys(baseline.immutableRecordSha256, new Set(expectedAnchors), 'retained baseline immutable records');
  if (Object.values(baseline.immutableRecordSha256).some((value) => !/^[a-f0-9]{64}$/.test(value))) {
    throw new Error('retained baseline immutable record hash is invalid');
  }
  if (!baseline.immutableRecordBaselineNames || typeof baseline.immutableRecordBaselineNames !== 'object' || Array.isArray(baseline.immutableRecordBaselineNames)) {
    throw new Error('retained baseline immutable record aliases are invalid');
  }
  for (const [currentName, baselineName] of Object.entries(baseline.immutableRecordBaselineNames)) {
    if (!expectedAnchors.includes(currentName) || typeof baselineName !== 'string' || !baselineName) {
      throw new Error('retained baseline immutable record alias is invalid');
    }
  }
}

function immutableRecord(text, anchor) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const marker = `  - name: ${anchor}`;
  const start = lines.indexOf(marker);
  if (start === -1 || lines.indexOf(marker, start + 1) !== -1) return null;
  let section = '';
  for (let index = start - 1; index >= 0; index -= 1) {
    if (/^\S[^:]*:$/.test(lines[index])) {
      section = lines[index].slice(0, -1);
      break;
    }
  }
  if (!section) return null;
  let end = start + 1;
  while (end < lines.length && !/^  - name: /.test(lines[end]) && !/^\S/.test(lines[end])) end += 1;
  const block = lines.slice(start, end).join('\n').replace(/\n+$/, '');
  return `${section}\n${block}\n`;
}

function validateRetainedInventory(policy, retainedBaseline, immutableInputsText) {
  for (const [index, input] of policy.retainedModifiedInputs.entries()) {
    for (const anchor of input.inventoryAnchors) {
      const record = immutableRecord(immutableInputsText, anchor);
      if (!record) {
        throw new Error(`retainedModifiedInputs[${index}] immutable inventory record ${anchor} is missing or duplicated`);
      }
      const baselineName = retainedBaseline.immutableRecordBaselineNames[anchor] ?? anchor;
      const canonicalRecord = record.replace(`  - name: ${anchor}\n`, `  - name: ${baselineName}\n`);
      if (sha256(canonicalRecord) !== retainedBaseline.immutableRecordSha256[anchor]) {
        throw new Error(`retainedModifiedInputs[${index}] immutable inventory record ${anchor} differs from the v1.6.4 baseline`);
      }
    }
  }
}

function componentLocations(component) {
  return (component.properties ?? [])
    .filter((property) => /^syft:location:\d+:path$/.test(property?.name) && typeof property.value === 'string')
    .map((property) => property.value)
    .sort();
}

function cycloneDxCatalogLocations(component) {
  const locations = new Map();
  for (const property of component.properties ?? []) {
    const match = typeof property?.name === 'string' && property.name.match(/^syft:location:(\d+):(path|layerID)$/);
    if (!match) continue;
    if (typeof property.value !== 'string' || !property.value) throw new Error('CycloneDX catalog location is invalid');
    const location = locations.get(match[1]) ?? {};
    if (match[2] in location) throw new Error('CycloneDX catalog location field is duplicated');
    location[match[2]] = property.value;
    locations.set(match[1], location);
  }
  return [...locations.values()].map((location) => {
    if (typeof location.path !== 'string' || !location.path) throw new Error('CycloneDX catalog location path is missing');
    return { path: location.path, layerID: location.layerID ?? '' };
  }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function syftCatalogLocations(artifact) {
  if (!Array.isArray(artifact.locations)) throw new Error('Syft artifact locations must be an array');
  return artifact.locations.map((location) => {
    if (
      typeof location?.path !== 'string' || !location.path ||
      (location.layerID !== undefined && (typeof location.layerID !== 'string' || !location.layerID))
    ) throw new Error('Syft artifact catalog location is invalid');
    return { path: location.path, layerID: location.layerID ?? '' };
  }).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function cycloneDxPackageIdentity(component) {
  const packageType = (component.properties ?? []).find((property) => property?.name === 'syft:package:type')?.value;
  if (typeof packageType !== 'string' || !packageType) return null;
  const purl = component.purl ?? '';
  let id = component['bom-ref'];
  if (purl) {
    const packageIds = [...component['bom-ref'].matchAll(/[?&]package-id=([^&#]+)/g)].map((match) => decodeURIComponent(match[1]));
    if (packageIds.length !== 1 || !packageIds[0]) {
      throw new Error('CycloneDX package reference is not bound to its purl and Syft package id');
    }
    id = packageIds[0];
  }
  return JSON.stringify({
    id,
    name: component.name,
    version: component.version,
    type: packageType,
    purl: component.purl ?? '',
    locations: cycloneDxCatalogLocations(component),
  });
}

function syftPackageIdentity(artifact) {
  if (
    typeof artifact?.id !== 'string' || !artifact.id ||
    typeof artifact.name !== 'string' || !artifact.name ||
    typeof artifact.version !== 'string' ||
    typeof artifact.type !== 'string' || !artifact.type ||
    (artifact.purl !== undefined && typeof artifact.purl !== 'string')
  ) throw new Error('Syft artifact identity is invalid');
  const purl = artifact.purl ?? '';
  return JSON.stringify({
    id: artifact.id,
    name: artifact.name,
    version: artifact.version,
    type: artifact.type,
    purl,
    locations: syftCatalogLocations(artifact),
  });
}

function cycloneDxImageMetadata(sbom) {
  const component = sbom.metadata?.component;
  if (
    !component || component.type !== 'container' ||
    typeof component['bom-ref'] !== 'string' || !component['bom-ref'] ||
    typeof component.name !== 'string' || !component.name ||
    typeof component.version !== 'string' || !component.version
  ) throw new Error('CycloneDX image metadata is invalid');
  const labels = {};
  for (const property of sbom.metadata?.properties ?? []) {
    if (typeof property?.name !== 'string' || !property.name.startsWith('syft:image:labels:')) continue;
    const name = property.name.slice('syft:image:labels:'.length);
    if (!name || typeof property.value !== 'string' || name in labels) throw new Error('CycloneDX image labels are invalid');
    labels[name] = property.value;
  }
  return { component, labels };
}

function decodeBase64Json(value, label) {
  if (typeof value !== 'string' || !value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error(`${label} is not canonical base64`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) throw new Error(`${label} is not canonical base64`);
  try {
    return { bytes, value: JSON.parse(bytes.toString('utf8')) };
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function validateSyftEvidence(syft, sbom, args) {
  if (!syft || typeof syft !== 'object' || Array.isArray(syft)) throw new Error('Syft JSON evidence must be an object');
  if (syft.descriptor?.name !== 'syft' || syft.descriptor?.version !== EXPECTED_SYFT_VERSION) {
    throw new Error(`Syft JSON evidence must use Syft ${EXPECTED_SYFT_VERSION}`);
  }
  if (!Array.isArray(syft.artifacts)) throw new Error('Syft JSON artifacts must be an array');
  const source = syft.source;
  const metadata = source?.metadata;
  if (
    source?.type !== 'image' || typeof source.id !== 'string' ||
    !metadata || typeof metadata !== 'object' || Array.isArray(metadata)
  ) throw new Error('Syft image source evidence is invalid');
  if (metadata.userInput !== args['image-ref']) throw new Error('Syft image source is not bound to the requested image reference');
  if (metadata.manifestDigest !== args['image-digest'] || source.id !== args['image-digest'].slice('sha256:'.length)) {
    throw new Error('Syft image source is not bound to the requested image digest');
  }
  const manifest = decodeBase64Json(metadata.manifest, 'Syft image manifest');
  const config = decodeBase64Json(metadata.config, 'Syft image config');
  if (sha256(manifest.bytes) !== args['image-digest'].slice('sha256:'.length)) {
    throw new Error('Syft image manifest bytes do not match the requested image digest');
  }
  if (
    !manifest.value.config || manifest.value.config.digest !== metadata.imageID ||
    manifest.value.config.size !== config.bytes.length ||
    sha256(config.bytes) !== metadata.imageID.slice('sha256:'.length)
  ) throw new Error('Syft image config is not bound to the image ID and manifest');
  const configLabels = config.value.config?.Labels ?? {};
  if (
    metadata.os !== 'linux' || metadata.architecture !== args.arch ||
    !/^sha256:[a-f0-9]{64}$/.test(metadata.imageID) ||
    config.value.os !== metadata.os || config.value.architecture !== metadata.architecture ||
    !isDeepStrictEqual(configLabels, metadata.labels ?? {}) ||
    metadata.mediaType !== manifest.value.mediaType ||
    !Array.isArray(metadata.layers) || !Array.isArray(manifest.value.layers) ||
    config.value.rootfs?.type !== 'layers' || !Array.isArray(config.value.rootfs?.diff_ids) ||
    metadata.layers.length !== manifest.value.layers.length ||
    manifest.value.layers.some((layer) =>
      typeof layer?.mediaType !== 'string' || !layer.mediaType ||
      !/^sha256:[a-f0-9]{64}$/.test(layer.digest) || !Number.isInteger(layer.size) || layer.size < 0
    ) ||
    config.value.rootfs.diff_ids.some((digest) => !/^sha256:[a-f0-9]{64}$/.test(digest)) ||
    !isDeepStrictEqual(metadata.layers.map((layer) => layer?.digest), config.value.rootfs.diff_ids) ||
    metadata.layers.some((layer) =>
      typeof layer?.mediaType !== 'string' || !layer.mediaType ||
      !/^sha256:[a-f0-9]{64}$/.test(layer.digest) || !Number.isInteger(layer.size) || layer.size < 0
    ) ||
    metadata.imageSize !== metadata.layers.reduce((total, layer) => total + layer.size, 0)
  ) throw new Error('Syft image source platform or content evidence is invalid');

  const { component, labels } = cycloneDxImageMetadata(sbom);
  if (
    !/^[a-f0-9]{16}$/.test(component['bom-ref']) ||
    component.name !== source.name || component.version !== source.version ||
    !isDeepStrictEqual(labels, metadata.labels ?? {})
  ) throw new Error('CycloneDX image metadata is not bound to the Syft image source');

  const syftIdentities = syft.artifacts.map(syftPackageIdentity).sort();
  const cycloneDxIdentities = sbom.components.map((component) => {
    const identity = cycloneDxPackageIdentity(component);
    if (!identity && !['file', 'operating-system'].includes(component?.type)) {
      throw new Error('CycloneDX component without Syft package identity has an invalid type');
    }
    return identity;
  }).filter(Boolean).sort();
  if (new Set(syftIdentities).size !== syftIdentities.length || JSON.stringify(syftIdentities) !== JSON.stringify(cycloneDxIdentities)) {
    throw new Error('CycloneDX package catalog is not bound to the Syft JSON catalog');
  }
  return { component, labels };
}

function validateGrypeSource(report, sbom, args, imageMetadata) {
  if (report.source.type === 'sbom-file') {
    const expectedSourceTarget = args['expected-source-target'] ?? args.sbom;
    if (typeof report.source.target !== 'string' || resolve(report.source.target) !== resolve(expectedSourceTarget)) {
      throw new Error('Grype report source is not bound to the supplied SBOM');
    }
    return;
  }
  const expectedTarget = {
    userInput: imageMetadata.component.name,
    imageID: imageMetadata.component['bom-ref'],
    manifestDigest: imageMetadata.component.version,
    mediaType: '',
    tags: [],
    imageSize: 0,
    layers: null,
    manifest: null,
    config: null,
    repoDigests: [],
    architecture: '',
    os: '',
    labels: imageMetadata.labels,
  };
  if (report.source.type !== 'image' || !isDeepStrictEqual(report.source.target, expectedTarget)) {
    throw new Error('Grype report image source is not the exact supplied CycloneDX projection');
  }
}

function findSbomComponent(match, sbom) {
  const artifact = match.artifact;
  if (typeof artifact.id !== 'string' || !artifact.id || typeof artifact.purl !== 'string' || !artifact.purl) {
    throw new Error(`${artifact.name}@${artifact.version}: scanner artifact lacks exact SBOM identity`);
  }
  const candidates = sbom.components.filter((component) =>
    component?.['bom-ref'] === artifact.id &&
    component?.purl === artifact.purl &&
    component?.name === artifact.name &&
    component?.version === artifact.version
  );
  if (candidates.length !== 1) throw new Error(`${artifact.name}@${artifact.version}: matched ${candidates.length} exact SBOM components`);
  const locations = [...new Set(artifact.locations.map((location) => location.path))].sort();
  const sbomLocations = componentLocations(candidates[0]);
  if (locations.length === 0 || JSON.stringify(locations) !== JSON.stringify(sbomLocations)) {
    throw new Error(`${artifact.name}@${artifact.version}: scanner locations do not equal the exact SBOM component locations`);
  }
  return { component: candidates[0], locations };
}

function startsWithAny(value, prefixes) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function componentIdentitySha256(artifact, locations) {
  return sha256(JSON.stringify({
    name: artifact.name,
    version: artifact.version,
    type: artifact.type,
    purl: artifact.purl,
    locations,
  }));
}

function classifyOrigin(match, locations, policy, retainedBaseline, target) {
  const artifact = match.artifact;
  const controlled = policy.projectControlled;
  const normalizedName = artifact.name.toLowerCase().replace(/[-_.]/g, '');
  if (
    startsWithAny(artifact.purl, controlled.purlPrefixes) ||
    controlled.normalizedNames.includes(normalizedName) ||
    controlled.namePrefixes.some((prefix) => artifact.name.toLowerCase().startsWith(prefix.toLowerCase())) ||
    controlled.versionContains.some((part) => artifact.version.includes(part)) ||
    locations.some((location) => startsWithAny(location, controlled.locationPrefixes))
  ) {
    throw new Error(`${artifact.name}@${artifact.version}: project-controlled component cannot use upstream advisory acceptance`);
  }
  const retained = policy.retainedModifiedInputs.filter((input) =>
    input.types.includes(artifact.type) &&
    startsWithAny(artifact.purl, input.purlPrefixes) &&
    locations.every((location) => startsWithAny(location, input.locationPrefixes)) &&
    (input.versionContains.length === 0 || input.versionContains.some((part) => artifact.version.includes(part)))
  );
  if (retained.length > 1) throw new Error(`${artifact.name}@${artifact.version}: matched multiple retained modified inputs`);
  if (retained.length === 1) {
    const identity = componentIdentitySha256(artifact, locations);
    if (!retainedBaseline.targets[target].componentIdentitySha256.includes(identity)) {
      throw new Error(`${artifact.name}@${artifact.version}: retained modified identity is not bound to the v1.6.4 baseline`);
    }
    return { origin: retained[0].origin, provenanceClass: 'retained_modified_third_party' };
  }
  const origins = policy.officialInputs.filter((input) =>
    input.types.includes(artifact.type) &&
    startsWithAny(artifact.purl, input.purlPrefixes) &&
    locations.every((location) => input.locationPaths.includes(location) || startsWithAny(location, input.locationPrefixes))
  );
  if (origins.length !== 1) throw new Error(`${artifact.name}@${artifact.version}: matched ${origins.length} official input origins`);
  return { origin: origins[0].origin, provenanceClass: 'official_third_party' };
}

function validateSbom(sbom) {
  if (!sbom || typeof sbom !== 'object' || Array.isArray(sbom)) throw new Error('CycloneDX SBOM must be an object');
  if (sbom.bomFormat !== 'CycloneDX' || typeof sbom.specVersion !== 'string') throw new Error('CycloneDX SBOM header is invalid');
  if (!Array.isArray(sbom.components)) throw new Error('CycloneDX SBOM components must be an array');
  const refs = sbom.components.map((component) => component?.['bom-ref']);
  if (refs.some((ref) => typeof ref !== 'string' || !ref) || new Set(refs).size !== refs.length) {
    throw new Error('CycloneDX SBOM component identities must be unique');
  }
}

function validateDatabaseEvidence(evidence, asOf) {
  exactKeys(evidence, new Set(['schemaVersion', 'built', 'source', 'checksum', 'valid']), 'Grype database evidence');
  if (evidence.schemaVersion !== EXPECTED_GRYPE_DB_SCHEMA_VERSION || evidence.valid !== true) {
    throw new Error('Grype database schema or validity is invalid');
  }
  if (typeof evidence.built !== 'string' || Number.isNaN(Date.parse(evidence.built))) throw new Error('Grype database built timestamp is invalid');
  const source = new URL(evidence.source);
  if (source.protocol !== 'https:' || source.hostname !== 'grype.anchore.io' || !source.pathname.startsWith('/databases/')) {
    throw new Error('Grype database source is invalid');
  }
  if (typeof evidence.checksum !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(evidence.checksum)) throw new Error('Grype database checksum is invalid');
  if (source.searchParams.get('checksum') !== evidence.checksum) throw new Error('Grype database source checksum does not match evidence');
  const built = new Date(evidence.built);
  const cutoff = new Date(`${asOf}T23:59:59Z`);
  if (built > cutoff || cutoff - built > 7 * 24 * 60 * 60 * 1000) throw new Error('Grype database is future-dated or stale');
}

function normalizeMatch(match, sbom, policy, retainedBaseline, target, scannerStatus = 'matched') {
  const fix = match.vulnerability.fix;
  if (!fix || typeof fix !== 'object' || Array.isArray(fix)) throw new Error(`${match.vulnerability.id}: fix metadata is missing`);
  if (typeof fix.state !== 'string' || !Array.isArray(fix.versions) || fix.versions.some((value) => typeof value !== 'string')) {
    throw new Error(`${match.vulnerability.id}: fix metadata is malformed`);
  }
  const { component, locations } = findSbomComponent(match, sbom);
  const { origin: dependencyOrigin, provenanceClass } = classifyOrigin(match, locations, policy, retainedBaseline, target);
  const relatedVulnerabilities = (match.relatedVulnerabilities ?? []).map((item) => item?.id).filter(Boolean).sort();
  const dataSource = match.vulnerability.dataSource ?? '';
  return {
    vulnerability: match.vulnerability.id,
    severity: match.vulnerability.severity,
    package: match.artifact.name,
    version: match.artifact.version,
    type: match.artifact.type,
    purl: match.artifact.purl,
    componentId: component['bom-ref'],
    locations,
    fixState: fix.state,
    rawFixVersions: [...fix.versions],
    fixVersions: [...new Set(fix.versions)].sort(),
    dataSource,
    relatedVulnerabilities,
    dependencyOrigin,
    provenanceClass,
    reachability: 'not_assessed',
    disposition: policy.disposition,
    scannerStatus,
    appliedIgnoreRules: scannerStatus === 'ignored' ? structuredClone(match.appliedIgnoreRules) : [],
  };
}

function findingKey(finding) {
  return JSON.stringify(finding);
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const policyText = readText(args.policy);
  const policy = JSON.parse(policyText);
  validatePolicy(policy, args);
  const retainedBaselineText = readText(resolve(policy.retainedBaselineEvidence));
  const retainedBaseline = JSON.parse(retainedBaselineText);
  validateRetainedBaseline(retainedBaseline, policy);
  if (args.preflight === 'true') {
    console.log(`upstream dependency policy preflight passed for ${args.variant}/${args.arch}`);
    return;
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(args['image-digest'])) throw new Error('image digest must be a lowercase SHA-256 digest');
  const reportText = readText(args.report);
  const sbomText = readText(args.sbom);
  const syftText = readText(args['syft-json']);
  const databaseText = readText(args['db-evidence']);
  const immutableInputsText = readText(args['immutable-inputs']);
  const report = JSON.parse(reportText);
  const sbom = JSON.parse(sbomText);
  const syft = JSON.parse(syftText);
  const databaseEvidence = JSON.parse(databaseText);
  const ignoredMatches = report.ignoredMatches === undefined ? [] : report.ignoredMatches;
  validateReport({ ...report, ignoredMatches }, EXPECTED_GRYPE_VERSION);
  validateSbom(sbom);
  const imageMetadata = validateSyftEvidence(syft, sbom, args);
  validateGrypeSource(report, sbom, args, imageMetadata);
  validateDatabaseEvidence(databaseEvidence, args['as-of']);
  validateRetainedInventory(policy, retainedBaseline, immutableInputsText);

  const target = `${args.variant}-${args.arch}`;
  const normalized = report.matches.map((match) => normalizeMatch(match, sbom, policy, retainedBaseline, target));
  const normalizedIgnored = ignoredMatches.map((match) =>
    normalizeMatch(match, sbom, policy, retainedBaseline, target, 'ignored')
  );
  const grouped = new Map();
  for (const finding of normalized) {
    const key = findingKey(finding);
    const existing = grouped.get(key);
    if (existing) existing.occurrenceCount += 1;
    else grouped.set(key, { ...finding, occurrenceCount: 1 });
  }
  const findings = [...grouped.values()].sort((left, right) => findingKey(left).localeCompare(findingKey(right)));
  const severityCounts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
  for (const match of report.matches) severityCounts[match.vulnerability.severity] += 1;
  const ignoredSeverityCounts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
  for (const match of ignoredMatches) ignoredSeverityCounts[match.vulnerability.severity] += 1;

  const outputDir = resolve(args['output-dir']);
  mkdirSync(outputDir, { recursive: true });
  const record = {
    schemaVersion: 1,
    release: policy.release,
    variant: args.variant,
    architecture: args.arch,
    asOf: args['as-of'],
    status: policy.disposition,
    scope: policy.scope,
    approvedBy: policy.approvedBy,
    authorizedAt: policy.authorizedAt,
    policySha256: sha256(policyText),
    retainedBaselineSha256: sha256(retainedBaselineText),
    immutableInputsSha256: sha256(immutableInputsText),
    reportSha256: sha256(reportText),
    sbomSha256: sha256(sbomText),
    syftJsonSha256: sha256(syftText),
    databaseEvidenceSha256: sha256(databaseText),
    imageDigest: args['image-digest'],
    scanner: { name: 'grype', version: EXPECTED_GRYPE_VERSION, source: report.source },
    database: databaseEvidence,
    rawMatchCount: report.matches.length,
    severityCounts,
    acceptedDependencyOccurrenceCount: report.matches.length,
    ignoredMatchCount: ignoredMatches.length,
    ignoredSeverityCounts,
    blockingProjectOrProvenanceErrorCount: 0,
    findings,
    rationale: policy.rationale,
    monitoring: policy.monitoring,
  };
  writeJson(resolve(outputDir, 'upstream-findings.json'), findings);
  writeJson(resolve(outputDir, 'ignored-findings.json'), normalizedIgnored);
  writeJson(resolve(outputDir, 'release-upstream-vulnerabilities.json'), record);
  writeJson(resolve(outputDir, 'policy.json'), {
    variant: args.variant,
    arch: args.arch,
    imageDigest: args['image-digest'],
    sbomSha256: record.sbomSha256,
    syftJsonSha256: record.syftJsonSha256,
    reportSha256: record.reportSha256,
    securityStatus: policy.disposition,
    rawMatchCount: record.rawMatchCount,
    severityCounts,
    ignoredMatchCount: record.ignoredMatchCount,
    ignoredSeverityCounts,
    blockingProjectOrProvenanceErrorCount: 0,
    upstreamDependencyAcceptance: {
      status: record.status,
      policySha256: record.policySha256,
      retainedBaselineSha256: record.retainedBaselineSha256,
      immutableInputsSha256: record.immutableInputsSha256,
      databaseEvidenceSha256: record.databaseEvidenceSha256,
      acceptedDependencyOccurrenceCount: record.acceptedDependencyOccurrenceCount,
    },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
