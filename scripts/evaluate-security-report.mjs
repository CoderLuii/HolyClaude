#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOWED_AUTHORITY_HOSTS = new Set([
  'github.com',
  'nodejs.org',
  'nvd.nist.gov',
  'pkg.go.dev',
  'security-tracker.debian.org',
]);
const ALLOWED_DISPOSITIONS = new Set(['fixed', 'high_exception', 'not_affected', 'vendor_severity']);
const ALLOWED_VARIANTS = new Set(['full', 'slim']);
const ALLOWED_ARCHITECTURES = new Set(['amd64', 'arm64']);
const EXPECTED_GRYPE_VERSION = '0.116.0';
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

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`invalid argument near ${key ?? '<end>'}`);
    args[key.slice(2)] = value;
  }
  for (const required of ['report', 'ledger', 'vex', 'output-dir', 'variant', 'arch']) {
    if (!args[required]) throw new Error(`missing --${required}`);
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
  if (ledger.schemaVersion !== 1) throw new Error('advisory ledger schemaVersion must be 1');
  if (typeof ledger.policy !== 'string' || !ledger.policy) throw new Error('advisory ledger policy is required');
  if (!Array.isArray(ledger.reviews)) throw new Error('advisory ledger reviews must be an array');
}

function validateVexDocument(vex) {
  if (!isRecord(vex)) throw new Error('OpenVEX document must be an object');
  if (typeof vex['@id'] !== 'string' || !vex['@id']) throw new Error('OpenVEX id is required');
  if (typeof vex.author !== 'string' || !vex.author) throw new Error('OpenVEX author is required');
  if (typeof vex.timestamp !== 'string' || Number.isNaN(Date.parse(vex.timestamp))) {
    throw new Error('OpenVEX timestamp is invalid');
  }
  if (!Number.isInteger(vex.version) || vex.version < 1) throw new Error('OpenVEX version must be a positive integer');
  if (!Array.isArray(vex.statements)) throw new Error('OpenVEX statements must be an array');
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
  const url = new URL(review.authority.url);
  if (url.protocol !== 'https:' || !ALLOWED_AUTHORITY_HOSTS.has(url.hostname)) {
    throw new Error(`${review.id}: unsupported authority URL ${review.authority.url}`);
  }
}

function validateComponent(review) {
  const component = review.component;
  for (const selector of ['names', 'versions', 'types', 'locationPatterns']) {
    if (!Array.isArray(component[selector]) || component[selector].length === 0) {
      const label = selector === 'names' ? 'exact names selector' : `${selector} selector`;
      throw new Error(`${review.id}: component requires a non-empty ${label}`);
    }
    if (component[selector].some((value) => typeof value !== 'string' || value.length === 0)) {
      throw new Error(`${review.id}: component ${selector} entries must be non-empty strings`);
    }
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
      if ('.*+?{['.includes(character)) {
        broadSyntax = true;
        break;
      }
    }
    if (!pattern.startsWith('^/') || !suffixAnchored || broadSyntax) {
      throw new Error(`${review.id}: broad component location pattern ${JSON.stringify(pattern)}`);
    }
  }
}

function validateReview(review, asOf) {
  if (!review.id || !Array.isArray(review.vulnerabilities) || review.vulnerabilities.length === 0) {
    throw new Error('each review needs an id and vulnerability list');
  }
  if (!review.component || !review.effectiveSeverity || !review.disposition || !review.rationale || !review.owner) {
    throw new Error(`${review.id}: incomplete review`);
  }
  if (review.disposition === 'accepted_risk') throw new Error(`${review.id}: accepted risk is prohibited`);
  if (!ALLOWED_DISPOSITIONS.has(review.disposition)) throw new Error(`${review.id}: invalid disposition`);
  if (!SEVERITY_ORDER.has(review.effectiveSeverity)) throw new Error(`${review.id}: invalid effective severity`);
  if (review.effectiveSeverity === 'Critical') throw new Error(`${review.id}: effective Critical findings cannot be dispositioned`);
  if (['fixed', 'not_affected'].includes(review.disposition) && review.effectiveSeverity !== 'None') {
    throw new Error(`${review.id}: ${review.disposition} requires effective severity None`);
  }
  if (review.disposition === 'high_exception' && review.effectiveSeverity !== 'High') {
    throw new Error(`${review.id}: high_exception requires effective severity High`);
  }
  validateAuthority(review);
  validateTargetSelectors(review);

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
  if (review.disposition === 'not_affected' && !review.vexStatement) {
    throw new Error(`${review.id}: not_affected review must link an OpenVEX statement`);
  }
  validateComponent(review);
}

function validateVex(vex, reviews, variant, arch) {
  if (vex['@context'] !== 'https://openvex.dev/ns/v0.2.0') throw new Error('OpenVEX context must be v0.2.0');
  const statements = vex.statements;
  const ids = new Set();
  const expectedProduct = `pkg:oci/ghcr.io/coderluii/holyclaude@1.5.1?variant=${variant}`;
  for (const statement of statements) {
    if (!statement['@id'] || ids.has(statement['@id'])) throw new Error('OpenVEX statement ids must be unique');
    ids.add(statement['@id']);
    if (statement.status !== 'not_affected') throw new Error(`${statement['@id']}: OpenVEX is limited to not_affected`);
    if (!(statement.products ?? []).some((product) => product['@id'] === expectedProduct)) {
      throw new Error(`${statement['@id']}: missing exact ${variant} product`);
    }
    if (!statement.justification || !statement.impact_statement) {
      throw new Error(`${statement['@id']}: missing justification or impact statement`);
    }
  }
  for (const review of reviews.filter(
    (item) => item.disposition === 'not_affected' && appliesToTarget(item, variant, arch),
  )) {
    const statement = statements.find((item) => item['@id'] === review.vexStatement);
    if (!statement) throw new Error(`${review.id}: linked OpenVEX statement is missing`);
    const vexId = statement.vulnerability?.name ?? statement.vulnerability?.['@id']?.split('/').pop();
    for (const vulnerability of review.vulnerabilities) {
      if (vexId !== vulnerability && !(statement.aliases ?? []).includes(vulnerability)) {
        throw new Error(`${review.id}: OpenVEX statement does not cover ${vulnerability}`);
      }
    }
  }
}

function ownerFor(match) {
  const paths = locationsFor(match).join('\n');
  if (paths.includes('/home/claude/.local/share/cursor-agent/')) return 'Cursor CLI';
  if (paths.includes('/home/claude/.local/share/claude/')) return 'Claude Code';
  if (paths.includes('/home/claude/.local/share/junie/')) return 'Junie CLI';
  if (paths.includes('/usr/local/lib/node_modules/@cloudcli-ai/cloudcli/')) return 'CloudCLI';
  if (paths.includes('/usr/local/lib/node_modules/netlify-cli/')) return 'Netlify CLI';
  if (paths.includes('/usr/local/lib/node_modules/')) return 'Full image npm toolset';
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
  const asOf = parseDate(asOfText, 'as-of');
  const report = readJson(args.report);
  const ledger = readJson(args.ledger);
  const vex = readJson(args.vex);
  validateReport(report);
  validateLedger(ledger);
  validateVexDocument(vex);
  const reviews = ledger.reviews;
  for (const review of reviews) validateReview(review, asOf);
  validateVex(vex, reviews, args.variant, args.arch);

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
    (finding) => !finding.policy || finding.policy.effectiveSeverity === 'Critical',
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
        review.disposition === 'high_exception' &&
        appliesToTarget(review, args.variant, args.arch) &&
        review.vulnerabilities.includes(vulnerability) &&
        matchesComponent(match, review.component),
    );
    if (candidates.length > 1) {
      errors.push(`${vulnerability} ${match.artifact?.name}@${match.artifact?.version}: matched ${candidates.length} High exceptions`);
    }
    for (const review of candidates) {
      highExceptionMatchCounts.set(review.id, (highExceptionMatchCounts.get(review.id) ?? 0) + 1);
    }
    const record = enrichHigh(match);
    if (candidates.length !== 1) return { ...record, policy: null };
    const review = candidates[0];
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
    if (count !== 1) errors.push(`${reviewId}: matched ${count} High findings`);
  }
  const outputDir = resolve(args['output-dir']);
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, 'critical-findings.json'), reviewedCritical);
  writeJson(resolve(outputDir, 'high-findings.json'), highFindings);
  writeJson(resolve(outputDir, 'ignored-findings.json'), ignoredFindings);
  writeJson(resolve(outputDir, 'openvex.json'), vex);
  writeJson(resolve(outputDir, 'policy.json'), {
    variant: args.variant,
    arch: args.arch,
    asOf: asOfText,
    rawCriticalCount: rawCritical.length,
    reviewedCriticalCount: reviewedCritical.length - unresolvedCritical.length,
    effectiveCriticalCount: unresolvedCritical.length,
    rawHighCount: rawHigh.length,
    mappedHighCount: highFindings.filter((finding) => finding.policy).length,
    ignoredMatchCount: report.ignoredMatches.length,
    ignoredCriticalCount: ignoredMatchesBySeverity.Critical,
    ignoredMatchesBySeverity,
    errors,
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

main();
