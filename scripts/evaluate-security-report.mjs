#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_AUTHORITY_HOSTS = new Set([
  'github.com',
  'go.dev',
  'chromereleases.googleblog.com',
  'mozilla.org',
  'www.mozilla.org',
  'nodejs.org',
  'openssl-library.org',
  'nvd.nist.gov',
  'pkg.go.dev',
  'security-tracker.debian.org',
  'www.libssh.org',
  'www.openssl-library.org',
]);
const ALLOWED_DISPOSITIONS = new Set([
  'critical_exception',
  'fixed',
  'high_exception',
  'not_affected',
  'vendor_severity',
]);
const ALLOWED_VARIANTS = new Set(['full', 'slim']);
const ALLOWED_ARCHITECTURES = new Set(['amd64', 'arm64']);
const EXPECTED_GRYPE_VERSION = '0.118.0';
const GRYPE_SEVERITIES = new Set(['Unknown', 'Negligible', 'Low', 'Medium', 'High', 'Critical']);
const SEVERITY_ORDER = new Map([
  ['None', 0],
  ['Negligible', 1],
  ['Low', 2],
  ['Medium', 3],
  ['Moderate', 3],
  ['High', 4],
  ['Critical', 5],
]);
const LEDGER_KEYS = new Set(['schemaVersion', 'policy', 'reviews']);
const REVIEW_KEYS = new Set([
  'id',
  'vulnerabilities',
  'component',
  'sourcePackage',
  'disposition',
  'effectiveSeverity',
  'owner',
  'authority',
  'reviewedAt',
  'expiresAt',
  'rationale',
  'vexStatement',
  'approvedBy',
  'variants',
  'architectures',
  'authorityEvidence',
]);
const COMPONENT_KEYS = new Set(['names', 'versions', 'types', 'locationPatterns']);
const AUTHORITY_KEYS = new Set(['name', 'url']);
const AUTHORITY_EVIDENCE_KEYS = new Set(['schemaVersion', 'candidate', 'records']);
const AUTHORITY_EVIDENCE_CANDIDATE_KEYS = new Set(['variant', 'architecture', 'reportSha256']);
const AUTHORITY_EVIDENCE_RECORD_KEYS = new Set([
  'id',
  'review',
  'vulnerability',
  'component',
  'sourcePackage',
  'repository',
  'advisoryStatus',
  'fixedVersion',
  'authority',
  'checkedAt',
]);
const AUTHORITY_EVIDENCE_COMPONENT_KEYS = new Set(['name', 'version', 'type', 'locations']);
const AUTHORITY_EVIDENCE_REPOSITORY_KEYS = new Set([
  'origin',
  'distribution',
  'suite',
  'urls',
  'packageVersion',
]);
const OFFICIAL_DEBIAN_REPOSITORY_URLS = [
  'https://deb.debian.org/debian',
  'https://security.debian.org/debian-security',
];
const VEX_KEYS = new Set(['@context', '@id', 'author', 'timestamp', 'version', 'statements']);
const VEX_STATEMENT_KEYS = new Set([
  '@id',
  'vulnerability',
  'products',
  'status',
  'justification',
  'impact_statement',
]);
const VEX_PRODUCT_KEYS = new Set(['@id', 'subcomponents']);
const VEX_SUBCOMPONENT_KEYS = new Set(['identifiers']);
const VEX_IDENTIFIERS_KEYS = new Set(['purl']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`invalid argument near ${key ?? '<end>'}`);
    args[key.slice(2)] = value;
  }
  for (const required of [
    'report',
    'ledger',
    'authority-evidence',
    'vex',
    'output-dir',
    'variant',
    'arch',
    'image-digest',
    'sbom-sha256',
  ]) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(args['image-digest'])) {
    throw new Error('--image-digest must be a lowercase sha256 digest');
  }
  if (!/^[a-f0-9]{64}$/.test(args['sbom-sha256'])) {
    throw new Error('--sbom-sha256 must be a lowercase SHA-256 hash');
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  return isRecord(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function isLinuxLibcAppliedIgnoreRule(rule) {
  return hasExactKeys(rule, ['namespace', 'package', 'match-type']) &&
    rule.namespace === '' &&
    rule['match-type'] === 'exact-indirect-match' &&
    hasExactKeys(rule.package, ['name', 'language', 'type', 'upstream-name']) &&
    rule.package.name === 'linux-libc-dev' &&
    rule.package.language === '' &&
    rule.package.type === 'deb' &&
    rule.package['upstream-name'] === 'linux';
}

function isLinuxLibcDescriptorIgnoreRule(rule) {
  return hasExactKeys(rule, [
    'vulnerability',
    'include-aliases',
    'reason',
    'namespace',
    'fix-state',
    'package',
    'vex-status',
    'vex-justification',
    'match-type',
  ]) &&
    rule.vulnerability === '' &&
    rule['include-aliases'] === false &&
    rule.reason === '' &&
    rule.namespace === '' &&
    rule['fix-state'] === '' &&
    rule['vex-status'] === '' &&
    rule['vex-justification'] === '' &&
    rule['match-type'] === 'exact-indirect-match' &&
    hasExactKeys(rule.package, ['name', 'version', 'language', 'type', 'location', 'upstream-name']) &&
    rule.package.name === 'linux-libc-dev' &&
    rule.package.version === '' &&
    rule.package.language === '' &&
    rule.package.type === 'deb' &&
    rule.package.location === '' &&
    rule.package['upstream-name'] === 'linux';
}

function validateIgnoredMatches(report) {
  if (report.ignoredMatches.length === 0) return;
  const configuration = report.descriptor.configuration;
  if (!isRecord(configuration) || configuration['match-upstream-kernel-headers'] !== false) {
    throw new Error('Grype ignored matches require match-upstream-kernel-headers=false');
  }
  if (!Array.isArray(configuration.ignore) || !configuration.ignore.some(isLinuxLibcDescriptorIgnoreRule)) {
    throw new Error('Grype ignored linux-libc-dev match is missing its exact descriptor ignore rule');
  }
  for (const [index, match] of report.ignoredMatches.entries()) {
    if (!isRecord(match) || !isRecord(match.vulnerability) || !isRecord(match.artifact)) {
      throw new Error(`Grype ignored match ${index} is incomplete`);
    }
    if (!GRYPE_SEVERITIES.has(match.vulnerability.severity)) {
      throw new Error(`Grype ignored match ${index} has invalid severity ${JSON.stringify(match.vulnerability.severity)}`);
    }
    if (
      match.artifact.name !== 'linux-libc-dev' ||
      match.artifact.type !== 'deb' ||
      !match.artifact.version ||
      !Array.isArray(match.artifact.locations)
    ) {
      throw new Error(`Grype ignored match ${index} must target linux-libc-dev as an exact deb package`);
    }
    if (
      !Array.isArray(match.appliedIgnoreRules) ||
      match.appliedIgnoreRules.length !== 1 ||
      !isLinuxLibcAppliedIgnoreRule(match.appliedIgnoreRules[0])
    ) {
      throw new Error(`Grype ignored match ${index} has an unsupported applied ignore rule`);
    }
    if (
      !Array.isArray(match.matchDetails) ||
      match.matchDetails.length === 0 ||
      match.matchDetails.some((detail) =>
        detail?.type !== 'exact-indirect-match' ||
        detail?.matcher !== 'dpkg-matcher' ||
        detail?.searchedBy?.package?.name !== 'linux' ||
        detail?.found?.vulnerabilityID !== match.vulnerability.id
      )
    ) {
      throw new Error(`Grype ignored match ${index} must contain only exact indirect dpkg matches`);
    }
  }
}

function validateReport(report) {
  if (!isRecord(report)) throw new Error('Grype report must be an object');
  if (!Array.isArray(report.matches)) throw new Error('Grype report matches must be an array');
  if (!Array.isArray(report.ignoredMatches)) throw new Error('Grype report ignoredMatches must be an array');
  if (!isRecord(report.source) || !report.source.type || !report.source.target) {
    throw new Error('Grype report source is incomplete');
  }
  if (!isRecord(report.distro)) throw new Error('Grype report distro must be an object');
  if (!isRecord(report.descriptor) || report.descriptor.name !== 'grype' || !report.descriptor.version) {
    throw new Error('Grype report descriptor is incomplete');
  }
  if (report.descriptor.version !== EXPECTED_GRYPE_VERSION) {
    throw new Error(`expected Grype ${EXPECTED_GRYPE_VERSION}, found ${report.descriptor.version}`);
  }
  validateIgnoredMatches(report);
  for (const [index, match] of report.matches.entries()) {
    if (!isRecord(match) || !isRecord(match.vulnerability) || !isRecord(match.artifact)) {
      throw new Error(`Grype report match ${index} is incomplete`);
    }
    if (!match.vulnerability.id || !match.vulnerability.severity) {
      throw new Error(`Grype report match ${index} has an incomplete vulnerability`);
    }
    if (!GRYPE_SEVERITIES.has(match.vulnerability.severity)) {
      throw new Error(`Grype report match ${index} has invalid severity ${JSON.stringify(match.vulnerability.severity)}`);
    }
    if (!match.artifact.name || !match.artifact.version || !match.artifact.type) {
      throw new Error(`Grype report match ${index} has an incomplete artifact`);
    }
    if (!Array.isArray(match.artifact.locations)) {
      throw new Error(`Grype report match ${index} locations must be an array`);
    }
  }
}

function validateLedger(ledger) {
  if (!isRecord(ledger)) throw new Error('advisory ledger must be an object');
  validateKeys(ledger, LEDGER_KEYS, 'advisory ledger');
  if (ledger.schemaVersion !== 1) throw new Error('advisory ledger schemaVersion must be 1');
  if (typeof ledger.policy !== 'string' || !ledger.policy) throw new Error('advisory ledger policy is required');
  if (!Array.isArray(ledger.reviews)) throw new Error('advisory ledger reviews must be an array');
  const ids = ledger.reviews.map((review) => review?.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('advisory ledger review ids must be unique');
}

function validateVexDocument(vex) {
  if (!isRecord(vex)) throw new Error('OpenVEX document must be an object');
  validateKeys(vex, VEX_KEYS, 'OpenVEX document');
  if (typeof vex['@id'] !== 'string' || !vex['@id']) throw new Error('OpenVEX id is required');
  if (typeof vex.author !== 'string' || !vex.author) throw new Error('OpenVEX author is required');
  if (typeof vex.timestamp !== 'string' || Number.isNaN(Date.parse(vex.timestamp))) {
    throw new Error('OpenVEX timestamp is invalid');
  }
  if (!Number.isInteger(vex.version) || vex.version < 1) throw new Error('OpenVEX version must be a positive integer');
  if (!Array.isArray(vex.statements)) throw new Error('OpenVEX statements must be an array');
}

function validateKeys(value, allowed, label) {
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new Error(`${label} contains unexpected fields: ${unexpected.sort().join(', ')}`);
  }
}

function validateUniqueStrings(values, label) {
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    values.some((value) => typeof value !== 'string' || value.length === 0) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`${label} must contain unique non-empty strings`);
  }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is invalid`);
  }
  return date;
}

function locationsFor(match) {
  return [...new Set((match.artifact?.locations ?? []).map((location) => location.path).filter(Boolean))].sort();
}

function matchesComponent(match, component) {
  const artifact = match.artifact ?? {};
  const locations = locationsFor(match);
  const exact = (values, value) => !values || values.includes(value);
  const patterns = (values, value) => !values || values.some((pattern) => new RegExp(pattern).test(value ?? ''));
  return (
    exact(component.names, artifact.name) &&
    patterns(component.namePatterns, artifact.name) &&
    exact(component.versions, artifact.version) &&
    patterns(component.versionPatterns, artifact.version) &&
    exact(component.types, artifact.type) &&
    locations.length > 0 &&
    component.locationPatterns &&
    locations.every((location) => component.locationPatterns.some((pattern) => new RegExp(pattern).test(location)))
  );
}

function validateTargetSelectors(review) {
  for (const [selector, allowed] of [
    ['variants', ALLOWED_VARIANTS],
    ['architectures', ALLOWED_ARCHITECTURES],
  ]) {
    if (review[selector] === undefined) continue;
    if (
      !Array.isArray(review[selector]) ||
      review[selector].length === 0 ||
      new Set(review[selector]).size !== review[selector].length ||
      review[selector].some((value) => !allowed.has(value))
    ) {
      throw new Error(`${review.id}: invalid ${selector} selector`);
    }
  }
}

function appliesToTarget(review, variant, arch) {
  return (!review.variants || review.variants.includes(variant)) &&
    (!review.architectures || review.architectures.includes(arch));
}

function validateAuthority(review) {
  if (!review.authority?.name || !review.authority?.url) throw new Error(`${review.id}: authority is incomplete`);
  validateKeys(review.authority, AUTHORITY_KEYS, `${review.id}.authority`);
  const url = new URL(review.authority.url);
  if (url.protocol !== 'https:' || !ALLOWED_AUTHORITY_HOSTS.has(url.hostname)) {
    throw new Error(`${review.id}: unsupported authority URL ${review.authority.url}`);
  }
}

function validateComponent(review) {
  const component = review.component;
  if (!isRecord(component)) throw new Error(`${review.id}: component must be an object`);
  validateKeys(component, COMPONENT_KEYS, `${review.id}.component`);
  for (const selector of ['names', 'versions', 'types', 'locationPatterns']) {
    validateUniqueStrings(component[selector], `${review.id}.component.${selector}`);
  }
  if (component.namePatterns || component.versionPatterns) {
    throw new Error(`${review.id}: component requires exact names and versions instead of pattern selectors`);
  }
  for (const pattern of component.locationPatterns) {
    try {
      new RegExp(pattern);
    } catch {
      throw new Error(`${review.id}: invalid component location pattern ${JSON.stringify(pattern)}`);
    }
    const suffixAnchored = pattern.endsWith('$') || pattern.endsWith('/');
    let escaped = false;
    let broadSyntax = false;
    for (const character of pattern) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if ('.*+?{[()|'.includes(character)) {
        broadSyntax = true;
        break;
      }
    }
    if (!pattern.startsWith('^/') || pattern === '^/' || !suffixAnchored || broadSyntax) {
      throw new Error(`${review.id}: broad component location pattern ${JSON.stringify(pattern)}`);
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactLocationPattern(location) {
  return `^${escapeRegExp(location)}$`;
}

function validateLiteralLocationSelectors(review, errorMessage) {
  for (const pattern of review.component.locationPatterns) {
    if (!pattern.startsWith('^/') || !pattern.endsWith('$')) {
      throw new Error(`${review.id}: ${errorMessage}`);
    }
    const body = pattern.slice(1, -1);
    let literal = '';
    for (let index = 0; index < body.length; index += 1) {
      const character = body[index];
      if (character === '\\') {
        index += 1;
        if (index >= body.length) {
          throw new Error(`${review.id}: ${errorMessage}`);
        }
        literal += body[index];
        continue;
      }
      if ('.*+?^${}()|[]'.includes(character)) {
        throw new Error(`${review.id}: ${errorMessage}`);
      }
      literal += character;
    }
    if (pattern !== exactLocationPattern(literal)) {
      throw new Error(`${review.id}: ${errorMessage}`);
    }
  }
}

function validateOfficialVendorHigh(review) {
  if (review.disposition !== 'vendor_severity' || review.effectiveSeverity !== 'High') return;
  const authorityUrl = new URL(review.authority.url);
  if (
    review.authority.name !== 'Chrome Releases' ||
    authorityUrl.hostname !== 'chromereleases.googleblog.com'
  ) {
    throw new Error(`${review.id}: raw Critical vendor severity requires an explicit official vendor High authority`);
  }
  if (review.variants?.length !== 1 || review.architectures?.length !== 1) {
    throw new Error(`${review.id}: raw Critical vendor severity requires exact variant and architecture selectors`);
  }
  validateLiteralLocationSelectors(
    review,
    'raw Critical vendor severity requires fully anchored literal location selectors',
  );
}

function validateReview(review, asOf) {
  if (!isRecord(review)) throw new Error('each review must be an object');
  validateKeys(review, REVIEW_KEYS, review.id || 'advisory review');
  if (!review.id || !Array.isArray(review.vulnerabilities) || review.vulnerabilities.length === 0) {
    throw new Error('each review needs an id and vulnerability list');
  }
  validateUniqueStrings(review.vulnerabilities, `${review.id}.vulnerabilities`);
  if (!review.component || !review.effectiveSeverity || !review.disposition || !review.rationale || !review.owner) {
    throw new Error(`${review.id}: incomplete review`);
  }
  if (review.disposition === 'accepted_risk') throw new Error(`${review.id}: accepted risk is prohibited`);
  if (!ALLOWED_DISPOSITIONS.has(review.disposition)) throw new Error(`${review.id}: invalid disposition`);
  if (!SEVERITY_ORDER.has(review.effectiveSeverity)) throw new Error(`${review.id}: invalid effective severity`);
  if (review.effectiveSeverity === 'Critical' && review.disposition !== 'critical_exception') {
    throw new Error(`${review.id}: effective Critical findings cannot be dispositioned without a Critical exception`);
  }
  if (review.disposition === 'critical_exception' && review.effectiveSeverity !== 'Critical') {
    throw new Error(`${review.id}: critical_exception requires effective severity Critical`);
  }
  if (['fixed', 'not_affected'].includes(review.disposition) && review.effectiveSeverity !== 'None') {
    throw new Error(`${review.id}: ${review.disposition} requires effective severity None`);
  }
  if (review.disposition === 'high_exception' && review.effectiveSeverity !== 'High') {
    throw new Error(`${review.id}: high_exception requires effective severity High`);
  }
  if (
    review.effectiveSeverity === 'High' &&
    !['high_exception', 'vendor_severity'].includes(review.disposition)
  ) {
    throw new Error(`${review.id}: effective High findings require high_exception`);
  }
  validateAuthority(review);
  validateTargetSelectors(review);
  validateComponent(review);
  validateOfficialVendorHigh(review);

  const reviewedAt = parseDate(review.reviewedAt, `${review.id}.reviewedAt`);
  const expiresAt = parseDate(review.expiresAt, `${review.id}.expiresAt`);
  if (expiresAt < reviewedAt) throw new Error(`${review.id}: review expires before it was reviewed`);
  if (reviewedAt > asOf) throw new Error(`${review.id}: review was reviewed after as-of`);
  if (expiresAt < asOf) throw new Error(`${review.id}: review expired on ${review.expiresAt}`);
  if (review.disposition === 'high_exception') {
    if (review.approvedBy !== 'CoderLuii') {
      throw new Error(`${review.id}: High exceptions require CoderLuii approval`);
    }
    const lifetimeDays = (expiresAt - reviewedAt) / 86_400_000;
    if (lifetimeDays > 30) throw new Error(`${review.id}: High exception exceeds 30 days`);
  }
  if (review.disposition === 'critical_exception') {
    if (review.approvedBy !== 'CoderLuii') {
      throw new Error(`${review.id}: Critical exceptions require CoderLuii approval`);
    }
    const lifetimeDays = (expiresAt - reviewedAt) / 86_400_000;
    if (lifetimeDays > 7) throw new Error(`${review.id}: Critical exception exceeds 7 days`);
    if (review.variants?.length !== 1 || review.architectures?.length !== 1) {
      throw new Error(`${review.id}: Critical exceptions require exact variant and architecture selectors`);
    }
    if (review.component.types.some((type) => type !== 'deb')) {
      throw new Error(`${review.id}: Critical exceptions apply only to official repository packages`);
    }
    if (typeof review.sourcePackage !== 'string' || !review.sourcePackage) {
      throw new Error(`${review.id}: Critical exceptions require an exact source package`);
    }
    validateLiteralLocationSelectors(
      review,
      'Critical exceptions require fully anchored literal location selectors',
    );
    validateUniqueStrings(review.authorityEvidence, `${review.id}.authorityEvidence`);
    if (review.vexStatement) throw new Error(`${review.id}: Critical exceptions cannot link OpenVEX`);
  }
  if (review.disposition === 'not_affected' && !review.vexStatement) {
    throw new Error(`${review.id}: not_affected review must link an OpenVEX statement`);
  }
  if (review.disposition === 'not_affected' && review.vulnerabilities.length !== 1) {
    throw new Error(`${review.id}: not_affected review must cover exactly one vulnerability`);
  }
}

function validateAuthorityEvidence(authorityEvidence, reviews, asOf, expectedCandidate, report) {
  if (!isRecord(authorityEvidence)) throw new Error('Critical exception authority evidence must be an object');
  validateKeys(authorityEvidence, AUTHORITY_EVIDENCE_KEYS, 'Critical exception authority evidence');
  if (authorityEvidence.schemaVersion !== 1) {
    throw new Error('Critical exception authority evidence schemaVersion must be 1');
  }
  if (!isRecord(authorityEvidence.candidate)) {
    throw new Error('Critical exception authority evidence candidate must be an object');
  }
  validateKeys(
    authorityEvidence.candidate,
    AUTHORITY_EVIDENCE_CANDIDATE_KEYS,
    'Critical exception authority evidence candidate',
  );
  if (
    !ALLOWED_VARIANTS.has(authorityEvidence.candidate.variant) ||
    !ALLOWED_ARCHITECTURES.has(authorityEvidence.candidate.architecture) ||
    (expectedCandidate
      ? !/^[a-f0-9]{64}$/.test(authorityEvidence.candidate.reportSha256)
      : authorityEvidence.candidate.reportSha256 !== null &&
        !/^[a-f0-9]{64}$/.test(authorityEvidence.candidate.reportSha256))
  ) {
    throw new Error('Critical exception authority evidence candidate is invalid');
  }
  if (expectedCandidate) {
    const evaluatesEvidenceCandidate =
      authorityEvidence.candidate.variant === expectedCandidate.variant &&
      authorityEvidence.candidate.architecture === expectedCandidate.architecture;
    if (evaluatesEvidenceCandidate && authorityEvidence.candidate.reportSha256 !== expectedCandidate.reportSha256) {
      throw new Error('authority evidence report SHA-256 does not match the evaluated report');
    }
  }
  if (!Array.isArray(authorityEvidence.records)) {
    throw new Error('Critical exception authority evidence records must be an array');
  }
  const recordsById = new Map();
  for (const record of authorityEvidence.records) {
    if (!isRecord(record)) throw new Error('Critical exception authority evidence records must contain objects');
    validateKeys(record, AUTHORITY_EVIDENCE_RECORD_KEYS, record.id || 'authority evidence record');
    if (!record.id || recordsById.has(record.id)) {
      throw new Error('Critical exception authority evidence record ids must be unique');
    }
    recordsById.set(record.id, record);
    if (!isRecord(record.component)) throw new Error(`${record.id}: authority evidence component is required`);
    validateKeys(record.component, AUTHORITY_EVIDENCE_COMPONENT_KEYS, `${record.id}.component`);
    validateUniqueStrings(record.component.locations, `${record.id}.component.locations`);
    if (
      !record.component.name ||
      !record.component.version ||
      record.component.type !== 'deb' ||
      !record.sourcePackage
    ) {
      throw new Error(`${record.id}: authority evidence requires an exact Debian component and source package`);
    }
    if (!isRecord(record.repository)) throw new Error(`${record.id}: authority evidence repository is required`);
    validateKeys(record.repository, AUTHORITY_EVIDENCE_REPOSITORY_KEYS, `${record.id}.repository`);
    if (record.repository.origin !== 'official_debian_repository') {
      throw new Error(`${record.id}: authority evidence requires an official Debian repository origin`);
    }
    if (
      record.repository.distribution !== 'Debian' ||
      record.repository.suite !== 'bookworm' ||
      JSON.stringify(record.repository.urls) !== JSON.stringify(OFFICIAL_DEBIAN_REPOSITORY_URLS)
    ) {
      throw new Error(`${record.id}: authority evidence repository provenance is not the configured official Debian repository`);
    }
    if (record.repository.packageVersion !== record.component.version) {
      throw new Error(`${record.id}: authority evidence package version does not match the exact component tuple`);
    }
    if (record.advisoryStatus !== 'open' || record.fixedVersion !== null) {
      throw new Error(`${record.id}: authority evidence must record an open advisory with no fixed package version`);
    }
    if (!isRecord(record.authority)) throw new Error(`${record.id}: authority evidence authority is required`);
    validateKeys(record.authority, AUTHORITY_KEYS, `${record.id}.authority`);
    const authorityUrl = new URL(record.authority.url);
    if (
      record.authority.name !== 'Debian Security Tracker' ||
      authorityUrl.protocol !== 'https:' ||
      authorityUrl.hostname !== 'security-tracker.debian.org' ||
      authorityUrl.pathname !== `/tracker/${record.vulnerability}`
    ) {
      throw new Error(`${record.id}: authority evidence must use the exact Debian Security Tracker advisory`);
    }
    const checkedAt = parseDate(record.checkedAt, `${record.id}.checkedAt`);
    if (checkedAt > asOf) {
      throw new Error(`${record.id}: authority evidence checkedAt must equal the review date and not be after as-of`);
    }
    if (report && expectedCandidate) {
      const evaluatesEvidenceCandidate =
        authorityEvidence.candidate.variant === expectedCandidate.variant &&
        authorityEvidence.candidate.architecture === expectedCandidate.architecture;
      if (evaluatesEvidenceCandidate) {
        const tupleMatches = report.matches.filter((match) =>
          match.vulnerability?.id === record.vulnerability &&
          match.artifact?.name === record.component.name &&
          match.artifact?.version === record.component.version &&
          match.artifact?.type === record.component.type
        );
        if (
          tupleMatches.length > 1 ||
          (tupleMatches.length === 1 &&
          JSON.stringify(locationsFor(tupleMatches[0] ?? {}).sort()) !==
            JSON.stringify([...record.component.locations].sort()))
        ) {
          throw new Error(`${record.id}: authority evidence locations do not match the exact Grype component tuple`);
        }
      }
    }
  }

  const linkedEvidenceIds = new Set();
  const targetReviews = reviews.filter((item) =>
    item.disposition === 'critical_exception' &&
    item.variants[0] === authorityEvidence.candidate.variant &&
    item.architectures[0] === authorityEvidence.candidate.architecture
  );
  for (const review of targetReviews) {
    const records = review.authorityEvidence.map((id) => {
      const record = recordsById.get(id);
      if (!record) throw new Error(`${review.id}: missing authority evidence ${id}`);
      if (linkedEvidenceIds.has(id)) throw new Error(`${review.id}: authority evidence ${id} is linked more than once`);
      linkedEvidenceIds.add(id);
      return record;
    });
    const expectedTuples = review.vulnerabilities.flatMap((vulnerability) =>
      review.component.names.flatMap((name) =>
        review.component.versions.map((version) => `${vulnerability}\n${name}\n${version}\ndeb`),
      ),
    ).sort();
    const actualTuples = records.map((record) => {
      if (record.review !== review.id) throw new Error(`${record.id}: authority evidence review does not match ${review.id}`);
      if (record.sourcePackage !== review.sourcePackage) {
        throw new Error(`${record.id}: authority evidence source package does not match the exact component tuple`);
      }
      if (record.checkedAt !== review.reviewedAt) {
        throw new Error(`${record.id}: authority evidence checkedAt must equal the review date and not be after as-of`);
      }
      return `${record.vulnerability}\n${record.component.name}\n${record.component.version}\n${record.component.type}`;
    }).sort();
    if (JSON.stringify(actualTuples) !== JSON.stringify(expectedTuples)) {
      throw new Error(`${review.id}: authority evidence does not cover every exact vulnerability and component tuple`);
    }
    const evidencePatterns = [...new Set(records.flatMap((record) => record.component.locations.map(exactLocationPattern)))].sort();
    if (JSON.stringify(evidencePatterns) !== JSON.stringify([...review.component.locationPatterns].sort())) {
      throw new Error(`${review.id}: authority evidence locations do not match the exact component selectors`);
    }
  }
  for (const record of authorityEvidence.records) {
    if (!linkedEvidenceIds.has(record.id)) throw new Error(`${record.id}: orphan Critical exception authority evidence`);
  }
}

function componentPurls(review, arch) {
  const purls = [];
  for (const type of review.component.types) {
    if (type !== 'deb') throw new Error(`${review.id}: unsupported OpenVEX component type ${type}`);
    for (const name of review.component.names) {
      for (const version of review.component.versions) {
        purls.push(`pkg:deb/debian/${encodeURIComponent(name)}@${encodeURIComponent(version)}?arch=${arch}`);
      }
    }
  }
  return purls.sort();
}

function validateVexProduct(product, statementId) {
  if (!isRecord(product)) throw new Error(`${statementId}: products must contain objects`);
  validateKeys(product, VEX_PRODUCT_KEYS, `${statementId}.product`);
  if (typeof product['@id'] !== 'string' || !product['@id']) {
    throw new Error(`${statementId}: product id is required`);
  }
  if (!Array.isArray(product.subcomponents) || product.subcomponents.length === 0) {
    throw new Error(`${statementId}: missing exact component subcomponent`);
  }
  const purls = product.subcomponents.map((subcomponent) => {
    if (!isRecord(subcomponent)) throw new Error(`${statementId}: subcomponents must contain objects`);
    validateKeys(subcomponent, VEX_SUBCOMPONENT_KEYS, `${statementId}.subcomponent`);
    if (!isRecord(subcomponent.identifiers)) {
      throw new Error(`${statementId}: subcomponent identifiers are required`);
    }
    validateKeys(subcomponent.identifiers, VEX_IDENTIFIERS_KEYS, `${statementId}.subcomponent.identifiers`);
    const purl = subcomponent.identifiers.purl;
    if (typeof purl !== 'string' || !purl.startsWith('pkg:')) {
      throw new Error(`${statementId}: subcomponent purl is required`);
    }
    return purl;
  });
  if (new Set(purls).size !== purls.length) {
    throw new Error(`${statementId}: component subcomponent purls must be unique`);
  }
  return purls.sort();
}

function validateVex(vex, reviews, variant, arch, imageDigest) {
  if (vex['@context'] !== 'https://openvex.dev/ns/v0.2.0') throw new Error('OpenVEX context must be v0.2.0');
  const statements = vex.statements;
  const ids = new Set();
  const statementReviews = new Map();
  for (const statement of statements) {
    if (!isRecord(statement)) throw new Error('OpenVEX statements must be objects');
    validateKeys(statement, VEX_STATEMENT_KEYS, statement['@id'] || 'OpenVEX statement');
    if (!statement['@id'] || ids.has(statement['@id'])) throw new Error('OpenVEX statement ids must be unique');
    ids.add(statement['@id']);
    if (!isRecord(statement.vulnerability)) throw new Error(`${statement['@id']}: vulnerability must be an object`);
    validateKeys(statement.vulnerability, new Set(['@id', 'name']), `${statement['@id']}.vulnerability`);
    if (!Array.isArray(statement.products) || statement.products.length === 0) {
      throw new Error(`${statement['@id']}: products must be a non-empty array`);
    }
    const products = statement.products.map((product) => ({
      product,
      purls: validateVexProduct(product, statement['@id']),
    }));
    const productIds = products.map(({ product }) => product['@id']);
    if (new Set(productIds).size !== productIds.length) {
      throw new Error(`${statement['@id']}: product ids must be unique`);
    }
    if (statement.status !== 'not_affected') throw new Error(`${statement['@id']}: OpenVEX is limited to not_affected`);
    if (!statement.justification || !statement.impact_statement) {
      throw new Error(`${statement['@id']}: missing justification or impact statement`);
    }

    const linkedReviews = reviews.filter(
      (review) => review.disposition === 'not_affected' && review.vexStatement === statement['@id'],
    );
    if (linkedReviews.length === 0) {
      throw new Error(`${statement['@id']}: orphan OpenVEX statement`);
    }
    if (linkedReviews.length !== 1) {
      throw new Error(`${statement['@id']}: must link exactly one not_affected review`);
    }
    const review = linkedReviews[0];
    statementReviews.set(statement['@id'], review);
    if (statement.vulnerability.name !== review.vulnerabilities[0]) {
      throw new Error(`${review.id}: OpenVEX statement does not cover ${review.vulnerabilities[0]}`);
    }

    const reviewVariants = review.variants ?? [...ALLOWED_VARIANTS];
    const reviewArchitectures = review.architectures ?? [...ALLOWED_ARCHITECTURES];
    const expectedProductIds = reviewVariants.flatMap((reviewVariant) => [
      `pkg:oci/ghcr.io/coderluii/holyclaude@1.5.8?variant=${reviewVariant}`,
      `pkg:oci/docker.io/coderluii/holyclaude@1.5.8?variant=${reviewVariant}`,
    ]).sort();
    for (const reviewVariant of reviewVariants) {
      const ghcrProduct = `pkg:oci/ghcr.io/coderluii/holyclaude@1.5.8?variant=${reviewVariant}`;
      const dockerHubProduct = `pkg:oci/docker.io/coderluii/holyclaude@1.5.8?variant=${reviewVariant}`;
      if (!productIds.includes(ghcrProduct)) {
        throw new Error(`${statement['@id']}: missing exact ${reviewVariant} product`);
      }
      if (!productIds.includes(dockerHubProduct)) {
        throw new Error(`${statement['@id']}: missing exact ${reviewVariant} Docker Hub product`);
      }
    }
    if (JSON.stringify(productIds.sort()) !== JSON.stringify(expectedProductIds)) {
      throw new Error(`${statement['@id']}: unexpected OpenVEX product scope`);
    }
    const expectedPurls = reviewArchitectures.flatMap((reviewArch) => componentPurls(review, reviewArch)).sort();
    for (const { purls } of products) {
      if (JSON.stringify(purls) !== JSON.stringify(expectedPurls)) {
        throw new Error(`${statement['@id']}: missing exact component subcomponent`);
      }
    }
  }

  for (const review of reviews.filter((item) => item.disposition === 'not_affected')) {
    if (!statementReviews.has(review.vexStatement)) {
      throw new Error(`${review.id}: linked OpenVEX statement is missing`);
    }
  }

  const digest = imageDigest.slice('sha256:'.length);
  return {
    ...vex,
    statements: statements
      .filter((statement) => appliesToTarget(statementReviews.get(statement['@id']), variant, arch))
      .map((statement) => {
        const review = statementReviews.get(statement['@id']);
        const expectedPurls = new Set(componentPurls(review, arch));
        return {
          ...statement,
          products: statement.products
            .filter((product) => product['@id'].endsWith(`?variant=${variant}`))
            .map((product) => ({
              ...product,
              hashes: { 'sha-256': digest },
              subcomponents: product.subcomponents.filter((subcomponent) =>
                expectedPurls.has(subcomponent.identifiers.purl)),
            })),
        };
      }),
  };
}

export function validateSecurityPolicy({
  ledger,
  authorityEvidence,
  vex,
  asOfText,
  variant = 'slim',
  arch = 'amd64',
  imageDigest = `sha256:${'0'.repeat(64)}`,
  reportSha256,
  report,
}) {
  const asOf = parseDate(asOfText, 'as-of');
  validateLedger(ledger);
  validateVexDocument(vex);
  const reviews = ledger.reviews;
  for (const review of reviews) validateReview(review, asOf);
  validateAuthorityEvidence(
    authorityEvidence,
    reviews,
    asOf,
    reportSha256 ? { variant, architecture: arch, reportSha256 } : undefined,
    report,
  );
  return {
    reviews,
    targetVex: validateVex(vex, reviews, variant, arch, imageDigest),
  };
}

function ownerFor(match) {
  const paths = locationsFor(match).join('\n');
  if (paths.includes('/home/claude/.local/share/cursor-agent/')) return 'Cursor CLI';
  if (paths.includes('/home/claude/.local/share/claude/')) return 'Claude Code';
  if (paths.includes('/home/claude/.local/share/junie/')) return 'Junie CLI';
  if (paths.includes('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/')) return 'CloudCLI';
  if (paths.includes('/usr/local/lib/node_modules/netlify-cli/')) return 'Netlify CLI';
  if (paths.includes('/usr/local/lib/node_modules/')) return 'Common npm toolset';
  if (paths.includes('/usr/local/lib/python')) return 'Python toolset';
  if (paths.includes('/usr/lib/chromium/') || paths.includes('/usr/bin/chromium')) return 'Chromium runtime';
  return 'Debian Bookworm base';
}

function findingRecord(match) {
  const vulnerability = match.vulnerability ?? {};
  const artifact = match.artifact ?? {};
  return {
    vulnerability: vulnerability.id,
    severity: vulnerability.severity,
    package: artifact.name,
    version: artifact.version,
    type: artifact.type,
    locations: locationsFor(match),
    fixVersions: vulnerability.fix?.versions ?? [],
  };
}

function scannerReportsFix(match) {
  const fix = match.vulnerability?.fix;
  return (Array.isArray(fix?.versions) && fix.versions.length > 0) || fix?.state === 'fixed';
}

function enrichHigh(match) {
  const record = findingRecord(match);
  const fixAvailable = record.fixVersions.length > 0;
  return {
    ...record,
    owner: ownerFor(match),
    reachability: 'not_assessed',
    followUp: fixAvailable
      ? 'Review the listed fixed version against the owning tool before the next release.'
      : 'Recheck vendor guidance and runtime reachability before the next release.',
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const asOfText = args['as-of'] ?? new Date().toISOString().slice(0, 10);
  const reportText = readFileSync(args.report, 'utf8').replace(/^\uFEFF/, '');
  const report = JSON.parse(reportText);
  const ledger = readJson(args.ledger);
  const authorityEvidence = readJson(args['authority-evidence']);
  const vex = readJson(args.vex);
  validateReport(report);
  const { reviews, targetVex } = validateSecurityPolicy({
    ledger,
    authorityEvidence,
    vex,
    asOfText,
    variant: args.variant,
    arch: args.arch,
    imageDigest: args['image-digest'],
    reportSha256: createHash('sha256').update(reportText).digest('hex'),
    report,
  });

  const rawCritical = report.matches.filter((match) => match.vulnerability.severity === 'Critical');
  const rawHigh = report.matches.filter((match) => match.vulnerability.severity === 'High');
  const ignoredMatchesBySeverity = Object.fromEntries(
    [...GRYPE_SEVERITIES].map((severity) => [
      severity,
      report.ignoredMatches.filter((match) => match.vulnerability.severity === severity).length,
    ]),
  );
  const ignoredFindings = report.ignoredMatches.map((match) => ({
    ...findingRecord(match),
    policy: {
      source: 'grype_builtin_kernel_header_rule',
      disposition: 'not_applicable_to_header_package',
      rationale: 'The match is an exact indirect Linux kernel match against the linux-libc-dev userspace header package.',
    },
  }));
  const errors = [];
  const criticalExceptionMatchCounts = new Map(
    reviews
      .filter(
        (review) => review.disposition === 'critical_exception' && appliesToTarget(review, args.variant, args.arch),
      )
      .map((review) => [review.id, 0]),
  );
  const reviewedCritical = rawCritical.map((match) => {
    const vulnerability = match.vulnerability?.id;
    const candidates = reviews.filter(
      (review) =>
        appliesToTarget(review, args.variant, args.arch) &&
        review.vulnerabilities.includes(vulnerability) &&
        matchesComponent(match, review.component),
    );
    if (candidates.length !== 1) {
      errors.push(`${vulnerability} ${match.artifact?.name}@${match.artifact?.version}: matched ${candidates.length} reviews`);
      return { ...findingRecord(match), policy: null };
    }
    const review = candidates[0];
    if (review.disposition === 'high_exception') {
      errors.push(`${review.id}: high_exception only applies to raw High findings`);
      return { ...findingRecord(match), policy: null };
    }
    if (review.disposition === 'critical_exception') {
      if (scannerReportsFix(match)) {
        errors.push(`${review.id}: critical_exception is prohibited because a fix is available`);
        return { ...findingRecord(match), policy: null };
      }
      criticalExceptionMatchCounts.set(review.id, (criticalExceptionMatchCounts.get(review.id) ?? 0) + 1);
    }
    return {
      ...findingRecord(match),
      policy: {
        review: review.id,
        disposition: review.disposition,
        effectiveSeverity: review.effectiveSeverity,
        owner: review.owner,
        expiresAt: review.expiresAt,
        authority: review.authority,
        rationale: review.rationale,
        vexStatement: review.vexStatement ?? null,
        approvedBy: review.approvedBy ?? null,
      },
    };
  });
  const unresolvedCritical = reviewedCritical.filter(
    (finding) => !finding.policy,
  );
  if (unresolvedCritical.length > 0) errors.push(`${unresolvedCritical.length} Critical findings remain unresolved`);
  const highExceptionMatchCounts = new Map(
    reviews
      .filter(
        (review) => review.disposition === 'high_exception' && appliesToTarget(review, args.variant, args.arch),
      )
      .map((review) => [review.id, 0]),
  );
  const highFindings = rawHigh.map((match) => {
    const vulnerability = match.vulnerability?.id;
    const candidates = reviews.filter(
      (review) =>
        appliesToTarget(review, args.variant, args.arch) &&
        review.vulnerabilities.includes(vulnerability) &&
        matchesComponent(match, review.component),
    );
    if (candidates.length !== 1) {
      errors.push(
        `${vulnerability} ${match.artifact?.name}@${match.artifact?.version}: matched ${candidates.length} reviews for raw High finding`,
      );
    }
    for (const review of candidates.filter((item) => item.disposition === 'high_exception')) {
      highExceptionMatchCounts.set(review.id, (highExceptionMatchCounts.get(review.id) ?? 0) + 1);
    }
    const record = enrichHigh(match);
    if (candidates.length !== 1) return { ...record, policy: null };
    const review = candidates[0];
    if (review.disposition === 'critical_exception') {
      if (scannerReportsFix(match)) {
        errors.push(`${review.id}: critical_exception is prohibited because a fix is available`);
        return { ...record, policy: null };
      }
      criticalExceptionMatchCounts.set(review.id, (criticalExceptionMatchCounts.get(review.id) ?? 0) + 1);
    }
    return {
      ...record,
      policy: {
        review: review.id,
        disposition: review.disposition,
        effectiveSeverity: review.effectiveSeverity,
        owner: review.owner,
        expiresAt: review.expiresAt,
        authority: review.authority,
        rationale: review.rationale,
        approvedBy: review.approvedBy,
      },
    };
  });
  for (const [reviewId, count] of highExceptionMatchCounts) {
    if (count < 1) errors.push(`${reviewId}: matched no High findings`);
  }
  for (const [reviewId, count] of criticalExceptionMatchCounts) {
    if (count < 1) errors.push(`${reviewId}: matched no effective-Critical findings`);
    const expectedCount = reviews.find((review) => review.id === reviewId)?.authorityEvidence.length ?? 0;
    if (count > 0 && count !== expectedCount) {
      errors.push(`${reviewId}: matched ${count} of ${expectedCount} effective-Critical findings`);
    }
  }
  const acceptedTemporaryCritical = [...reviewedCritical, ...highFindings].filter(
    (finding) => finding.policy?.disposition === 'critical_exception',
  );
  const outputDir = resolve(args['output-dir']);
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, 'critical-findings.json'), reviewedCritical);
  writeJson(resolve(outputDir, 'high-findings.json'), highFindings);
  writeJson(resolve(outputDir, 'ignored-findings.json'), ignoredFindings);
  writeJson(resolve(outputDir, 'openvex.json'), targetVex);
  writeJson(resolve(outputDir, 'policy.json'), {
    variant: args.variant,
    arch: args.arch,
    imageDigest: args['image-digest'],
    sbomSha256: args['sbom-sha256'],
    asOf: asOfText,
    rawCriticalCount: rawCritical.length,
    reviewedCriticalCount: reviewedCritical.length - unresolvedCritical.length,
    effectiveCriticalCount: unresolvedCritical.length,
    acceptedTemporaryCriticalCount: acceptedTemporaryCritical.length,
    acceptedTemporaryCriticalReviews: [
      ...new Set(acceptedTemporaryCritical.map((finding) => finding.policy.review)),
    ].sort(),
    rawHighCount: rawHigh.length,
    mappedHighCount: highFindings.filter((finding) => finding.policy).length,
    ignoredMatchCount: report.ignoredMatches.length,
    ignoredCriticalCount: ignoredMatchesBySeverity.Critical,
    ignoredMatchesBySeverity,
    errors,
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
