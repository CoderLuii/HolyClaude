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

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) throw new Error(`${label} is invalid`);
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
    (!component.locationPatterns ||
      locations.some((location) => component.locationPatterns.some((pattern) => new RegExp(pattern).test(location))))
  );
}

function validateAuthority(review) {
  if (!review.authority?.name || !review.authority?.url) throw new Error(`${review.id}: authority is incomplete`);
  const url = new URL(review.authority.url);
  if (url.protocol !== 'https:' || !ALLOWED_AUTHORITY_HOSTS.has(url.hostname)) {
    throw new Error(`${review.id}: unsupported authority URL ${review.authority.url}`);
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
  validateAuthority(review);

  const reviewedAt = parseDate(review.reviewedAt, `${review.id}.reviewedAt`);
  const expiresAt = parseDate(review.expiresAt, `${review.id}.expiresAt`);
  if (expiresAt < asOf) throw new Error(`${review.id}: review expired on ${review.expiresAt}`);
  if (review.disposition === 'high_exception') {
    if (review.effectiveSeverity !== 'High' || review.approvedBy !== 'CoderLuii') {
      throw new Error(`${review.id}: High exceptions require CoderLuii approval`);
    }
    const lifetimeDays = (expiresAt - reviewedAt) / 86_400_000;
    if (lifetimeDays > 30) throw new Error(`${review.id}: High exception exceeds 30 days`);
  }
  if (review.disposition === 'not_affected' && !review.vexStatement) {
    throw new Error(`${review.id}: not_affected review must link an OpenVEX statement`);
  }
}

function validateVex(vex, reviews, variant) {
  if (vex['@context'] !== 'https://openvex.dev/ns/v0.2.0') throw new Error('OpenVEX context must be v0.2.0');
  const statements = vex.statements ?? [];
  const ids = new Set();
  const expectedProduct = `pkg:oci/ghcr.io/coderluii/holyclaude@1.5.0?variant=${variant}`;
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
  for (const review of reviews.filter((item) => item.disposition === 'not_affected')) {
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
  const reviews = ledger.reviews ?? [];
  for (const review of reviews) validateReview(review, asOf);
  validateVex(vex, reviews, args.variant);

  const rawCritical = (report.matches ?? []).filter((match) => match.vulnerability?.severity === 'Critical');
  const rawHigh = (report.matches ?? []).filter((match) => match.vulnerability?.severity === 'High');
  const errors = [];
  const reviewedCritical = rawCritical.map((match) => {
    const vulnerability = match.vulnerability?.id;
    const candidates = reviews.filter(
      (review) => review.vulnerabilities.includes(vulnerability) && matchesComponent(match, review.component),
    );
    if (candidates.length !== 1) {
      errors.push(`${vulnerability} ${match.artifact?.name}@${match.artifact?.version}: matched ${candidates.length} reviews`);
      return { ...findingRecord(match), policy: null };
    }
    const review = candidates[0];
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

  const highFindings = rawHigh.map(enrichHigh);
  const outputDir = resolve(args['output-dir']);
  mkdirSync(outputDir, { recursive: true });
  writeJson(resolve(outputDir, 'critical-findings.json'), reviewedCritical);
  writeJson(resolve(outputDir, 'high-findings.json'), highFindings);
  writeJson(resolve(outputDir, 'openvex.json'), vex);
  writeJson(resolve(outputDir, 'policy.json'), {
    variant: args.variant,
    arch: args.arch,
    asOf: asOfText,
    rawCriticalCount: rawCritical.length,
    reviewedCriticalCount: reviewedCritical.length - unresolvedCritical.length,
    effectiveCriticalCount: unresolvedCritical.length,
    rawHighCount: rawHigh.length,
    mappedHighCount: highFindings.length,
    errors,
  });
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

main();
