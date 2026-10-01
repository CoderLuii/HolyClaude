#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_RELEASE = 'v1.6.4';
const ARGUMENTS = new Set([
  'manifest',
  'ledger',
  'authority-evidence',
  'vex',
  'variant',
  'arch',
  'release',
  'as-of',
  'preflight',
  'report',
  'output-dir',
  'image-digest',
  'sbom-sha256',
  'accepted-risk-manifest',
]);
const MANIFEST_KEYS = new Set([
  'schemaVersion',
  'release',
  'approvedBy',
  'reviewedAt',
  'expiresAt',
  'rationale',
  'monitoring',
  'deferredReviewIds',
]);
const DEBIAN_TRACKER_PREFIX = 'https://security-tracker.debian.org/';
const ACCEPTED_RISK_MANIFEST_KEYS = new Set([
  'schemaVersion',
  'release',
  'approvedBy',
  'reviewedAt',
  'expiresAt',
  'rationale',
  'monitoring',
  'targets',
]);
const ACCEPTED_RISK_TARGET_KEYS = new Set(['variant', 'architecture', 'findings']);
const ACCEPTED_RISK_FINDING_KEYS = new Set([
  'vulnerability',
  'severity',
  'package',
  'version',
  'type',
  'locations',
  'fixState',
  'fixVersions',
  'occurrenceCount',
]);
const ACCEPTED_RISK_TARGETS = new Set(['full/amd64', 'full/arm64', 'slim/amd64', 'slim/arm64']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid argument near ${key ?? '<end>'}`);
    }
    const name = key.slice(2);
    if (!ARGUMENTS.has(name)) throw new Error(`unknown argument --${name}`);
    if (name in args) throw new Error(`duplicate argument --${name}`);
    args[name] = value;
  }
  for (const required of ['manifest', 'ledger', 'authority-evidence', 'vex', 'variant', 'arch', 'release', 'as-of']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  if (args.preflight !== 'true') {
    for (const required of ['report', 'output-dir', 'image-digest', 'sbom-sha256']) {
      if (!args[required]) throw new Error(`missing --${required}`);
    }
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

function parseDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is invalid`);
  }
  return date;
}

function uniqueStrings(values, label, { allowEmpty = false } = {}) {
  if (
    !Array.isArray(values) ||
    (!allowEmpty && values.length === 0) ||
    values.some((value) => typeof value !== 'string' || !value) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`${label} must contain unique non-empty strings`);
  }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const unexpected = Object.keys(value).filter((key) => !keys.has(key));
  const missing = [...keys].filter((key) => !(key in value));
  if (unexpected.length || missing.length) {
    throw new Error(`${label} fields are invalid; missing=${missing.sort().join(',')} unexpected=${unexpected.sort().join(',')}`);
  }
}

function assertDebianOwnedReview(review, label) {
  if (
    !Array.isArray(review.component?.types) ||
    review.component.types.length !== 1 ||
    review.component.types[0] !== 'deb' ||
    review.authority?.name !== 'Debian Security Tracker' ||
    typeof review.authority?.url !== 'string' ||
    !review.authority.url.startsWith(DEBIAN_TRACKER_PREFIX) ||
    typeof review.owner !== 'string' ||
    !review.owner.startsWith('Debian')
  ) {
    throw new Error(`${label}: only exact Debian Security Tracker reviews can be deferred`);
  }
  if (review.disposition === 'critical_exception' || review.effectiveSeverity === 'Critical') {
    throw new Error(`${label}: Critical findings cannot use the release deferral`);
  }
}

function validateManifest(manifest, ledger, release, asOfText) {
  exactKeys(manifest, MANIFEST_KEYS, 'release security deferral');
  if (manifest.schemaVersion !== 1) throw new Error('release security deferral schemaVersion must be 1');
  if (manifest.release !== EXPECTED_RELEASE) {
    throw new Error(`release security deferral must target ${EXPECTED_RELEASE}`);
  }
  if (release !== EXPECTED_RELEASE || manifest.release !== release) {
    throw new Error(`release security deferral does not match requested release ${release}`);
  }
  if (manifest.approvedBy !== 'CoderLuii') throw new Error('release security deferral requires CoderLuii approval');
  if (typeof manifest.rationale !== 'string' || !/upstream/i.test(manifest.rationale)) {
    throw new Error('release security deferral rationale must identify the upstream boundary');
  }
  if (typeof manifest.monitoring !== 'string' || !/Syft/i.test(manifest.monitoring) || !/Grype/i.test(manifest.monitoring)) {
    throw new Error('release security deferral monitoring must retain Syft and Grype');
  }
  uniqueStrings(manifest.deferredReviewIds, 'release security deferral deferredReviewIds', { allowEmpty: true });

  const reviewedAt = parseDate(manifest.reviewedAt, 'release security deferral reviewedAt');
  const expiresAt = parseDate(manifest.expiresAt, 'release security deferral expiresAt');
  const asOf = parseDate(asOfText, 'as-of');
  if (expiresAt < reviewedAt) throw new Error('release security deferral expires before it was reviewed');
  if ((expiresAt - reviewedAt) / 86_400_000 > 7) {
    throw new Error('release security deferral exceeds seven days');
  }
  if (asOf < reviewedAt) throw new Error('release security deferral was reviewed after as-of');
  if (expiresAt < asOf) throw new Error(`release deferral expired on ${manifest.expiresAt}`);

  const reviewsById = new Map(ledger.reviews.map((review) => [review.id, review]));
  const deferredReviews = manifest.deferredReviewIds.map((id) => {
    const review = reviewsById.get(id);
    if (!review) throw new Error(`${id}: deferred review does not exist in the committed ledger`);
    assertDebianOwnedReview(review, id);
    if (parseDate(review.expiresAt, `${id}.expiresAt`) >= asOf) {
      throw new Error(`${id}: review is still current and must not use the release deferral`);
    }
    return review;
  });

  return { deferredReviews };
}

function canonicalFindingKey(finding) {
  return JSON.stringify([
    finding.vulnerability,
    finding.severity,
    finding.package,
    finding.version,
    finding.type,
    finding.locations,
    finding.fixState,
    finding.fixVersions,
  ]);
}

function acceptedRiskIdentity(finding) {
  return JSON.stringify([
    finding.vulnerability,
    finding.severity,
    finding.package,
    finding.version,
    finding.type,
    finding.locations,
  ]);
}

function validateAcceptedRiskFinding(finding, label) {
  exactKeys(finding, ACCEPTED_RISK_FINDING_KEYS, label);
  for (const field of ['vulnerability', 'package', 'version', 'type', 'fixState']) {
    if (typeof finding[field] !== 'string' || !finding[field]) throw new Error(`${label}.${field} is required`);
    if (/[*?\[\]]/.test(finding[field])) throw new Error(`${label}.${field} must not contain wildcards`);
  }
  if (!['Critical', 'High'].includes(finding.severity)) {
    throw new Error(`${label}.severity must be Critical or High`);
  }
  uniqueStrings(finding.locations, `${label}.locations`);
  uniqueStrings(finding.fixVersions, `${label}.fixVersions`, { allowEmpty: true });
  if ([...finding.locations, ...finding.fixVersions].some((value) => /[*?\[\]]/.test(value))) {
    throw new Error(`${label} must not contain wildcards`);
  }
  if (JSON.stringify(finding.locations) !== JSON.stringify([...finding.locations].sort())) {
    throw new Error(`${label}.locations must be sorted`);
  }
  if (JSON.stringify(finding.fixVersions) !== JSON.stringify([...finding.fixVersions].sort())) {
    throw new Error(`${label}.fixVersions must be sorted`);
  }
  if (!Number.isInteger(finding.occurrenceCount) || finding.occurrenceCount < 1) {
    throw new Error(`${label}.occurrenceCount must be a positive integer`);
  }
}

function validateAcceptedRiskManifest(manifest, release, asOfText) {
  exactKeys(manifest, ACCEPTED_RISK_MANIFEST_KEYS, 'accepted-known-risk manifest');
  if (manifest.schemaVersion !== 1) throw new Error('accepted-known-risk schemaVersion must be 1');
  if (manifest.release !== EXPECTED_RELEASE) throw new Error(`accepted-known-risk manifest must target ${EXPECTED_RELEASE}`);
  if (release !== EXPECTED_RELEASE || manifest.release !== release) {
    throw new Error(`accepted-known-risk manifest does not match requested release ${release}`);
  }
  if (manifest.approvedBy !== 'CoderLuii') throw new Error('accepted-known-risk manifest requires CoderLuii approval');
  if (typeof manifest.rationale !== 'string' || !manifest.rationale.trim()) {
    throw new Error('accepted-known-risk rationale is required');
  }
  if (typeof manifest.monitoring !== 'string' || !/Syft/i.test(manifest.monitoring) || !/Grype/i.test(manifest.monitoring)) {
    throw new Error('accepted-known-risk monitoring must retain Syft and Grype');
  }
  const reviewedAt = parseDate(manifest.reviewedAt, 'accepted-known-risk reviewedAt');
  const expiresAt = parseDate(manifest.expiresAt, 'accepted-known-risk expiresAt');
  const asOf = parseDate(asOfText, 'as-of');
  if (expiresAt < reviewedAt) throw new Error('accepted-known-risk approval expires before it was reviewed');
  if ((expiresAt - reviewedAt) / 86_400_000 > 7) throw new Error('accepted-known-risk approval exceeds seven days');
  if (asOf < reviewedAt) throw new Error('accepted-known-risk approval was reviewed after as-of');
  if (expiresAt < asOf) throw new Error(`accepted-known-risk approval expired on ${manifest.expiresAt}`);
  if (!Array.isArray(manifest.targets)) throw new Error('accepted-known-risk targets must be an array');
  const targetKeys = [];
  for (const [targetIndex, target] of manifest.targets.entries()) {
    const label = `accepted-known-risk targets[${targetIndex}]`;
    exactKeys(target, ACCEPTED_RISK_TARGET_KEYS, label);
    const targetKey = `${target.variant}/${target.architecture}`;
    if (!ACCEPTED_RISK_TARGETS.has(targetKey)) throw new Error(`${label} has invalid target ${targetKey}`);
    targetKeys.push(targetKey);
    if (!Array.isArray(target.findings) || target.findings.length === 0) {
      throw new Error(`${label}.findings must be a non-empty array`);
    }
    const findingKeys = new Set();
    for (const [findingIndex, finding] of target.findings.entries()) {
      const findingLabel = `${label}.findings[${findingIndex}]`;
      validateAcceptedRiskFinding(finding, findingLabel);
      const key = canonicalFindingKey(finding);
      if (findingKeys.has(key)) throw new Error(`${targetKey}: duplicate accepted-known-risk finding`);
      findingKeys.add(key);
    }
    const sortedFindings = [...target.findings].sort((left, right) => canonicalFindingKey(left).localeCompare(canonicalFindingKey(right)));
    if (JSON.stringify(target.findings) !== JSON.stringify(sortedFindings)) {
      throw new Error(`${targetKey}: accepted-known-risk findings must be canonically sorted`);
    }
  }
  if (new Set(targetKeys).size !== targetKeys.length) throw new Error('accepted-known-risk targets must be unique');
  for (const target of ACCEPTED_RISK_TARGETS) {
    if (!targetKeys.includes(target)) throw new Error(`accepted-known-risk manifest is missing target ${target}`);
  }
  if (targetKeys.length !== ACCEPTED_RISK_TARGETS.size) throw new Error('accepted-known-risk manifest must contain exactly four targets');
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function reportFindingKey({ vulnerability, package: packageName, version, type, locations }) {
  return JSON.stringify([vulnerability, packageName, version, type, [...locations].sort()]);
}

function matchFindingKey(match) {
  return reportFindingKey({
    vulnerability: match.vulnerability?.id,
    package: match.artifact?.name,
    version: match.artifact?.version,
    type: match.artifact?.type,
    locations: [...new Set((match.artifact?.locations ?? []).map((location) => location.path).filter(Boolean))],
  });
}

function scannerReportsFix(match) {
  const fix = match.vulnerability?.fix;
  return (Array.isArray(fix?.versions) && fix.versions.length > 0) || fix?.state === 'fixed';
}

function acceptedRiskRecord(match) {
  const fix = match.vulnerability?.fix ?? {};
  return {
    vulnerability: match.vulnerability?.id,
    severity: match.vulnerability?.severity,
    package: match.artifact?.name,
    version: match.artifact?.version,
    type: match.artifact?.type,
    locations: [...new Set((match.artifact?.locations ?? []).map((location) => location.path).filter(Boolean))].sort(),
    fixState: typeof fix.state === 'string' ? fix.state : '',
    fixVersions: [...new Set(Array.isArray(fix.versions) ? fix.versions : [])].sort(),
    occurrenceCount: 1,
  };
}

function acceptedRiskMultiset(report, findingPaths, deferredIds) {
  const outputFindings = findingPaths.flatMap((path) => readJson(path));
  const unresolvedKeys = new Set(outputFindings
    .filter((finding) => finding.policy === null)
    .map((finding) => reportFindingKey(finding)));
  const prohibitedCriticalDeferralKeys = new Set(outputFindings
    .filter((finding) => finding.severity === 'Critical' && deferredIds.has(finding.policy?.review))
    .map((finding) => reportFindingKey(finding)));
  const acceptedKeys = new Set([...unresolvedKeys, ...prohibitedCriticalDeferralKeys]);
  const grouped = new Map();
  for (const match of report.matches) {
    if (!['Critical', 'High'].includes(match.vulnerability?.severity)) continue;
    if (!acceptedKeys.has(matchFindingKey(match))) continue;
    const record = acceptedRiskRecord(match);
    const key = canonicalFindingKey(record);
    const current = grouped.get(key);
    if (current) current.occurrenceCount += 1;
    else grouped.set(key, record);
  }
  return {
    findings: [...grouped.values()].sort((left, right) => canonicalFindingKey(left).localeCompare(canonicalFindingKey(right))),
    unmappedKeys: unresolvedKeys,
    prohibitedCriticalDeferralKeys,
  };
}

function expectedUnmappedErrors(findings) {
  const errors = [];
  let criticalCount = 0;
  for (const finding of findings) {
    const suffix = finding.severity === 'High' ? ' for raw High finding' : '';
    for (let index = 0; index < finding.occurrenceCount; index += 1) {
      errors.push(`${finding.vulnerability} ${finding.package}@${finding.version}: matched 0 reviews${suffix}`);
    }
    if (finding.severity === 'Critical') criticalCount += finding.occurrenceCount;
  }
  if (criticalCount > 0) errors.push(`${criticalCount} Critical findings remain unresolved`);
  return errors.sort();
}

function reconcileAcceptedRisk({ manifest, args, report, reportSha256, findingPaths, outputDir, deferredIds }) {
  const target = manifest.targets.find(
    (item) => item.variant === args.variant && item.architecture === args.arch,
  );
  if (!target) throw new Error(`accepted-known-risk manifest is missing target ${args.variant}/${args.arch}`);
  const { findings: actualFindings, unmappedKeys, prohibitedCriticalDeferralKeys } = acceptedRiskMultiset(
    report,
    findingPaths,
    deferredIds,
  );
  const expectedByIdentity = new Map(target.findings.map((finding) => [acceptedRiskIdentity(finding), finding]));
  for (const finding of actualFindings) {
    const expected = expectedByIdentity.get(acceptedRiskIdentity(finding));
    if (
      expected &&
      expected.fixState !== 'fixed' &&
      expected.fixVersions.length === 0 &&
      (finding.fixState === 'fixed' || finding.fixVersions.length > 0)
    ) {
      throw new Error('an accepted-known-risk finding newly reports a fix');
    }
  }
  if (JSON.stringify(actualFindings) !== JSON.stringify(target.findings)) {
    throw new Error(`accepted-known-risk findings do not exactly match ${args.variant}/${args.arch} scanner evidence`);
  }

  const policyPath = join(outputDir, 'policy.json');
  const policy = readJson(policyPath);
  const allowedErrors = expectedUnmappedErrors(
    actualFindings.filter((finding) => unmappedKeys.has(reportFindingKey(finding))),
  );
  if (JSON.stringify([...policy.errors].sort()) !== JSON.stringify(allowedErrors)) {
    throw new Error('security policy reported errors outside the exact accepted-known-risk multiset');
  }

  const manifestText = readFileSync(args['accepted-risk-manifest'], 'utf8').replace(/^\uFEFF/, '');
  const manifestSha256 = createHash('sha256').update(manifestText).digest('hex');
  const acceptedCriticalCount = actualFindings
    .filter((finding) => finding.severity === 'Critical')
    .reduce((total, finding) => total + finding.occurrenceCount, 0);
  const acceptedHighCount = actualFindings
    .filter((finding) => finding.severity === 'High')
    .reduce((total, finding) => total + finding.occurrenceCount, 0);
  const acceptedFindingCount = acceptedCriticalCount + acceptedHighCount;

  for (const path of findingPaths) {
    const findings = readJson(path);
    for (const finding of findings) {
      const prohibitedCriticalDeferral =
        finding.severity === 'Critical' && prohibitedCriticalDeferralKeys.has(reportFindingKey(finding));
      if (finding.policy !== null && !prohibitedCriticalDeferral) continue;
      finding.policy = {
        source: 'release_accepted_known_risk',
        disposition: 'accepted_known_risk',
        rawSeverity: finding.severity,
        approvedBy: manifest.approvedBy,
        reviewedAt: manifest.reviewedAt,
        expiresAt: manifest.expiresAt,
        status: 'known_risk_accepted',
      };
    }
    writeJson(path, findings);
  }

  policy.securityStatus = 'known_risk_accepted';
  policy.errors = [];
  policy.acceptedKnownRisk = {
    release: manifest.release,
    status: 'known_risk_accepted',
    manifestSha256,
    approvedBy: manifest.approvedBy,
    reviewedAt: manifest.reviewedAt,
    expiresAt: manifest.expiresAt,
    acceptedFindingCount,
    acceptedCriticalCount,
    acceptedHighCount,
    originalPolicyErrors: allowedErrors,
  };
  writeJson(policyPath, policy);
  writeJson(join(outputDir, 'release-accepted-risk.json'), {
    schemaVersion: 1,
    release: manifest.release,
    status: 'known_risk_accepted',
    variant: args.variant,
    architecture: args.arch,
    asOf: args['as-of'],
    approvedBy: manifest.approvedBy,
    reviewedAt: manifest.reviewedAt,
    expiresAt: manifest.expiresAt,
    manifestSha256,
    reportSha256,
    imageDigest: args['image-digest'],
    sbomSha256: args['sbom-sha256'],
    acceptedFindingCount,
    acceptedCriticalCount,
    acceptedHighCount,
    findings: actualFindings,
    monitoring: manifest.monitoring,
  });
  return { acceptedFindingCount, acceptedCriticalCount, acceptedHighCount };
}

function validateAuthorityBinding(authorityEvidence, args, reportSha256 = null) {
  if (authorityEvidence?.candidate?.variant !== args.variant || authorityEvidence?.candidate?.architecture !== args.arch) {
    throw new Error('authority evidence target does not match requested variant and architecture');
  }
  if (reportSha256 === null) {
    if (authorityEvidence.candidate.reportSha256 !== null) {
      throw new Error('preflight authority evidence must not be bound to a report');
    }
    return;
  }
  if (authorityEvidence.candidate.reportSha256 !== reportSha256) {
    throw new Error('authority evidence reportSha256 does not match the scanner report');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestText = readFileSync(args.manifest, 'utf8').replace(/^\uFEFF/, '');
  const manifest = JSON.parse(manifestText);
  const ledger = readJson(args.ledger);
  const authorityEvidence = readJson(args['authority-evidence']);
  const { deferredReviews } = validateManifest(manifest, ledger, args.release, args['as-of']);
  const acceptedRiskManifest = args['accepted-risk-manifest'] ? readJson(args['accepted-risk-manifest']) : null;
  if (acceptedRiskManifest) {
    validateAcceptedRiskManifest(acceptedRiskManifest, args.release, args['as-of']);
    if (!acceptedRiskManifest.targets.some(
      (target) => target.variant === args.variant && target.architecture === args.arch,
    )) {
      throw new Error(`accepted-known-risk manifest is missing target ${args.variant}/${args.arch}`);
    }
  }
  if (args.preflight === 'true') validateAuthorityBinding(authorityEvidence, args);

  const effectiveLedger = structuredClone(ledger);
  const deferredIds = new Set(manifest.deferredReviewIds);
  const asOf = parseDate(args['as-of'], 'as-of');
  effectiveLedger.reviews = effectiveLedger.reviews.flatMap((review) => {
    if (deferredIds.has(review.id)) {
      return [{ ...review, reviewedAt: manifest.reviewedAt, expiresAt: manifest.expiresAt }];
    }
    return parseDate(review.expiresAt, `${review.id}.expiresAt`) < asOf ? [] : [review];
  });
  const effectiveVex = readJson(args.vex);
  const retainedVexStatements = new Set(
    effectiveLedger.reviews.map((review) => review.vexStatement).filter(Boolean),
  );
  effectiveVex.statements = effectiveVex.statements.filter((statement) => retainedVexStatements.has(statement['@id']));

  const effectiveAuthority = structuredClone(authorityEvidence);
  const retainedAuthorityIds = new Set(
    effectiveLedger.reviews
      .filter((review) => review.disposition === 'critical_exception')
      .flatMap((review) => review.authorityEvidence ?? []),
  );
  effectiveAuthority.records = effectiveAuthority.records.filter((record) => retainedAuthorityIds.has(record.id));

  const scratch = mkdtempSync(join(tmpdir(), 'holyclaude-release-deferral-policy-'));
  try {
    const ledgerPath = join(scratch, 'ledger.json');
    const authorityPath = join(scratch, 'authority.json');
    const vexPath = join(scratch, 'openvex.json');
    writeJson(ledgerPath, effectiveLedger);
    writeJson(authorityPath, effectiveAuthority);
    writeJson(vexPath, effectiveVex);

    if (args.preflight === 'true') {
      const result = spawnSync(process.execPath, [
        fileURLToPath(new URL('./preflight-security-policy.mjs', import.meta.url)),
        '--ledger', ledgerPath,
        '--authority-evidence', authorityPath,
        '--vex', vexPath,
        '--as-of', args['as-of'],
      ], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim());
      console.log(`release security deferral preflight passed for ${args.variant}/${args.arch}`);
      return;
    }

    const reportText = readFileSync(args.report, 'utf8').replace(/^\uFEFF/, '');
    const reportSha256 = createHash('sha256').update(reportText).digest('hex');
    const report = JSON.parse(reportText);
    validateAuthorityBinding(authorityEvidence, args, reportSha256);
    const reportFixAvailability = new Map();
    for (const match of report.matches) {
      const key = matchFindingKey(match);
      reportFixAvailability.set(key, (reportFixAvailability.get(key) ?? false) || scannerReportsFix(match));
    }
    const evaluatorArgs = [
      fileURLToPath(new URL('./evaluate-security-report.mjs', import.meta.url)),
      '--report', args.report,
      '--ledger', ledgerPath,
      '--authority-evidence', authorityPath,
      '--vex', vexPath,
      '--output-dir', args['output-dir'],
      '--variant', args.variant,
      '--arch', args.arch,
      '--image-digest', args['image-digest'],
      '--sbom-sha256', args['sbom-sha256'],
      '--as-of', args['as-of'],
    ];
    const result = spawnSync(process.execPath, evaluatorArgs, { encoding: 'utf8' });
    const outputDir = resolve(args['output-dir']);
    const findingPaths = [join(outputDir, 'critical-findings.json'), join(outputDir, 'high-findings.json')];
    let acceptedRiskCounts = null;
    if (acceptedRiskManifest) {
      if (!findingPaths.every((path) => {
        try {
          readFileSync(path);
          return true;
        } catch {
          return false;
        }
      })) {
        throw new Error(result.stderr.trim() || result.stdout.trim() || 'security evaluator did not emit finding evidence');
      }
      acceptedRiskCounts = reconcileAcceptedRisk({
        manifest: acceptedRiskManifest,
        args,
        report,
        reportSha256,
        findingPaths,
        outputDir,
        deferredIds,
      });
    } else if (result.status !== 0) {
      throw new Error(result.stderr.trim() || result.stdout.trim());
    }

    const originalExpiry = new Map(deferredReviews.map((review) => [review.id, review.expiresAt]));
    const deferralIds = deferredIds;
    const usedReviewIds = new Set();
    let deferredFindingCount = 0;
    for (const path of findingPaths) {
      const findings = readJson(path);
      for (const finding of findings) {
        const reviewId = finding.policy?.review;
        if (!deferralIds.has(reviewId)) continue;
        if (finding.type !== 'deb') {
          throw new Error(`${reviewId}: release deferral matched a non-Debian finding`);
        }
        if (finding.severity === 'Critical') {
          throw new Error(`${reviewId}: raw Critical findings cannot use the release deferral`);
        }
        const findingKey = reportFindingKey(finding);
        if (!reportFixAvailability.has(findingKey)) {
          throw new Error(`${reviewId}: deferred finding is missing from the bound scanner report`);
        }
        if (reportFixAvailability.get(findingKey)) {
          throw new Error(`${reviewId}: release deferral is prohibited because the scanner reports a fix`);
        }
        usedReviewIds.add(reviewId);
        deferredFindingCount += 1;
        finding.policy = {
          ...finding.policy,
          expiresAt: originalExpiry.get(reviewId) ?? manifest.expiresAt,
          releaseDeferral: {
            release: manifest.release,
            approvedBy: manifest.approvedBy,
            reviewedAt: manifest.reviewedAt,
            expiresAt: manifest.expiresAt,
            status: 'deferred_not_fixed',
          },
        };
      }
      writeJson(path, findings);
    }
    if (usedReviewIds.size === 0 && deferredIds.size > 0) {
      throw new Error(`no ${args.variant}/${args.arch} findings used the committed release deferral`);
    }

    const manifestSha256 = createHash('sha256').update(manifestText).digest('hex');
    const policyPath = join(outputDir, 'policy.json');
    const policy = readJson(policyPath);
    if (deferredIds.size > 0) {
      policy.releaseDeferral = {
        release: manifest.release,
        manifestSha256,
        approvedBy: manifest.approvedBy,
        reviewedAt: manifest.reviewedAt,
        expiresAt: manifest.expiresAt,
        status: 'deferred_not_fixed',
        deferredFindingCount,
        usedReviewIds: [...usedReviewIds].sort(),
      };
    }
    writeJson(policyPath, policy);
    if (deferredIds.size > 0) {
      writeJson(join(outputDir, 'release-security-deferral.json'), {
        schemaVersion: 1,
        release: manifest.release,
        status: 'deferred_not_fixed',
        variant: args.variant,
        architecture: args.arch,
        asOf: args['as-of'],
        approvedBy: manifest.approvedBy,
        reviewedAt: manifest.reviewedAt,
        expiresAt: manifest.expiresAt,
        manifestSha256,
        reportSha256,
        imageDigest: args['image-digest'],
        sbomSha256: args['sbom-sha256'],
        deferredFindingCount,
        usedReviewIds: [...usedReviewIds].sort(),
        monitoring: manifest.monitoring,
      });
    }
    const acceptedMessage = acceptedRiskCounts
      ? ` and accepted ${acceptedRiskCounts.acceptedFindingCount} exact known-risk findings`
      : '';
    console.log(`release security deferral accepted ${deferredFindingCount} exact findings${acceptedMessage} for ${args.variant}/${args.arch}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
