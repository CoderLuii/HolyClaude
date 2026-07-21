#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const REQUIRED_CATEGORIES = [
  'base-images',
  'release-assets',
  'installers',
  'vendored-artifacts',
  'plugins',
  'github-actions',
  'deferred-migrations',
];
const TOP_LEVEL_KEYS = new Set(['schema-version', 'release', 'reviewed-at', 'expires-at', ...REQUIRED_CATEGORIES]);
const SHA256 = /^[a-f0-9]{64}$/i;
const IMAGE_DIGEST = /^sha256:[a-f0-9]{64}$/i;
const COMMIT_SHA = /^[a-f0-9]{40}$/i;

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new Error(`invalid argument near ${key ?? '<end>'}`);
    args[key.slice(2)] = value;
  }
  for (const required of ['file', 'as-of', 'release']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  return args;
}

function parseDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is invalid`);
  }
  return date;
}

function parseScalar(raw, lineNumber) {
  const value = raw.trim();
  if (!value) throw new Error(`line ${lineNumber}: scalar value is empty`);
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed !== 'string') throw new Error();
      return parsed;
    } catch {
      throw new Error(`line ${lineNumber}: invalid quoted scalar`);
    }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length < 2) throw new Error(`line ${lineNumber}: invalid quoted scalar`);
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (/^[\[\]{}&*!|>@`]/.test(value)) throw new Error(`line ${lineNumber}: unsupported YAML construct`);
  return value;
}

function parseEntry(text, lineNumber) {
  const match = /^([a-z][a-z0-9-]*):\s*(.*?)\s*$/.exec(text);
  if (!match) throw new Error(`line ${lineNumber}: expected a key and scalar value`);
  return [match[1], parseScalar(match[2], lineNumber)];
}

// This parser intentionally accepts only the mappings and two-space lists used by the committed evidence schema.
function parseEvidenceYaml(text) {
  const document = {};
  let category = null;
  let item = null;
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (line.includes('\t')) throw new Error(`line ${lineNumber}: tabs are not allowed`);

    const topLevel = /^([a-z][a-z0-9-]*):\s*(.*?)\s*$/.exec(line);
    if (topLevel) {
      const [, key, raw] = topLevel;
      if (!TOP_LEVEL_KEYS.has(key)) throw new Error(`line ${lineNumber}: unknown top-level key ${key}`);
      if (Object.hasOwn(document, key)) throw new Error(`duplicate top-level key ${key}`);
      if (raw) {
        document[key] = parseScalar(raw, lineNumber);
        category = null;
      } else {
        document[key] = [];
        category = key;
      }
      item = null;
      continue;
    }

    const listItem = /^  -\s+(.+?)\s*$/.exec(line);
    if (listItem) {
      if (!category || !Array.isArray(document[category])) {
        throw new Error(`line ${lineNumber}: list item is outside a category`);
      }
      if (/^[a-z][a-z0-9-]*:\s*/.test(listItem[1])) {
        const [key, value] = parseEntry(listItem[1], lineNumber);
        item = { [key]: value };
      } else {
        item = parseScalar(listItem[1], lineNumber);
      }
      document[category].push(item);
      continue;
    }

    const property = /^    (.+?)\s*$/.exec(line);
    if (property) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`line ${lineNumber}: property is outside a record`);
      }
      const [key, value] = parseEntry(property[1], lineNumber);
      if (Object.hasOwn(item, key)) throw new Error(`line ${lineNumber}: duplicate record key ${key}`);
      item[key] = value;
      continue;
    }

    throw new Error(`line ${lineNumber}: unsupported YAML structure`);
  }

  return document;
}

function requireFields(category, record, fields) {
  for (const field of fields) {
    if (typeof record[field] !== 'string' || !record[field]) {
      throw new Error(`${category} ${record.name ?? '<unnamed>'}: missing ${field}`);
    }
  }
}

function validateUniqueRecords(category, records) {
  const seen = new Set();
  for (const record of records) {
    const key = typeof record === 'string' ? record : record.name;
    if (!key) throw new Error(`${category} contains a record without a name`);
    if (seen.has(key)) throw new Error(`${category} has duplicate name ${key}`);
    seen.add(key);
  }
}

function validateHashes(category, record) {
  for (const [field, value] of Object.entries(record)) {
    if ((field === 'sha256' || field.endsWith('-sha256')) && !SHA256.test(value)) {
      throw new Error(`${category} ${record.name}: ${field} must be a 64-character SHA-256`);
    }
  }

  const architectureSuffixes = new Set();
  for (const field of Object.keys(record)) {
    const match = /^(amd64|arm64)-(.+-sha256)$/.exec(field);
    if (match) architectureSuffixes.add(match[2]);
  }
  for (const suffix of architectureSuffixes) {
    if (!record[`amd64-${suffix}`] || !record[`arm64-${suffix}`]) {
      throw new Error(`${category} ${record.name}: requires both amd64-${suffix} and arm64-${suffix}`);
    }
  }
}

function resolveReferencedFile(category, record, field) {
  const value = record[field];
  if (!value) return null;
  const root = resolve(process.cwd());
  const path = resolve(root, value);
  const pathFromRoot = relative(root, path);
  if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error(`${category} ${record.name}: ${field} must stay inside the repository`);
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new Error(`${category} ${record.name}: ${field} does not exist: ${value}`);
  }
  return path;
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function validateJsonFile(category, record, field, path) {
  try {
    JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    throw new Error(`${category} ${record.name}: ${field} is not valid JSON`);
  }
}

function verifyReferencedHash(category, record, field, path, hashField) {
  if (!record[hashField]) return;
  if (sha256File(path) !== record[hashField].toLowerCase()) {
    throw new Error(`${category} ${record.name}: ${field} hash mismatch`);
  }
}

function validateDocument(document, args) {
  if (document['schema-version'] !== '1') throw new Error('schema-version must be 1');
  if (document.release !== args.release) {
    throw new Error(`expected release ${args.release}, found ${document.release ?? '<missing>'}`);
  }
  for (const category of REQUIRED_CATEGORIES) {
    if (!Array.isArray(document[category]) || document[category].length === 0) {
      throw new Error(`missing ${category}`);
    }
    validateUniqueRecords(category, document[category]);
  }

  const reviewedAt = parseDate(document['reviewed-at'], 'reviewed-at');
  const expiresAt = parseDate(document['expires-at'], 'expires-at');
  const asOf = parseDate(args['as-of'], 'as-of');
  if (expiresAt < reviewedAt) throw new Error(`expires-at ${document['expires-at']} is before reviewed-at ${document['reviewed-at']}`);
  if (reviewedAt > asOf) throw new Error(`reviewed-at ${document['reviewed-at']} is after as-of ${args['as-of']}`);
  if (expiresAt < asOf) throw new Error(`immutable input evidence expired on ${document['expires-at']}`);

  for (const record of document['base-images']) {
    requireFields('base-images', record, ['name', 'reference', 'digest', 'status']);
    if (!IMAGE_DIGEST.test(record.digest)) throw new Error(`base-images ${record.name}: digest must be sha256:<64 hex>`);
  }
  for (const record of document['release-assets']) {
    requireFields('release-assets', record, ['name', 'version', 'verification', 'verification-mode', 'status']);
    if (!['committed-hash', 'repository-index'].includes(record['verification-mode'])) {
      throw new Error(`release-assets ${record.name}: invalid verification-mode`);
    }
    validateHashes('release-assets', record);
    if (
      record['verification-mode'] === 'committed-hash' &&
      !Object.keys(record).some((field) => field === 'sha256' || field.endsWith('-sha256'))
    ) {
      throw new Error(`release-assets ${record.name}: committed-hash requires payload hashes`);
    }
  }
  for (const record of document.installers) {
    requireFields('installers', record, ['name', 'status']);
    if (!record.version && !record['build-id']) throw new Error(`installers ${record.name}: missing version or build-id`);
    validateHashes('installers', record);
  }
  for (const record of document['vendored-artifacts']) {
    requireFields('vendored-artifacts', record, [
      'name',
      'version',
      'upstream-commit',
      'artifact',
      'manifest',
      'manifest-sha256',
      'sha256',
      'verification',
      'status',
    ]);
    if (!COMMIT_SHA.test(record['upstream-commit'])) {
      throw new Error(`vendored-artifacts ${record.name}: upstream-commit must be a full 40-character SHA`);
    }
    validateHashes('vendored-artifacts', record);
    const artifact = resolveReferencedFile('vendored-artifacts', record, 'artifact');
    const manifest = resolveReferencedFile('vendored-artifacts', record, 'manifest');
    verifyReferencedHash('vendored-artifacts', record, 'artifact', artifact, 'sha256');
    verifyReferencedHash('vendored-artifacts', record, 'manifest', manifest, 'manifest-sha256');
    validateJsonFile('vendored-artifacts', record, 'manifest', manifest);
  }
  for (const record of document.plugins) {
    requireFields('plugins', record, ['name', 'repository', 'commit', 'install', 'status']);
    if (!COMMIT_SHA.test(record.commit)) throw new Error(`plugins ${record.name}: commit must be a full 40-character SHA`);
    validateHashes('plugins', record);
    if (record.lock) {
      const lock = resolveReferencedFile('plugins', record, 'lock');
      verifyReferencedHash('plugins', record, 'lock', lock, 'lock-sha256');
      validateJsonFile('plugins', record, 'lock', lock);
    }
  }
  for (const record of document['github-actions']) {
    requireFields('github-actions', record, ['name', 'version', 'commit']);
    if (!COMMIT_SHA.test(record.commit)) {
      throw new Error(`github-actions ${record.name}: commit must be a full 40-character SHA`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const document = parseEvidenceYaml(readFileSync(args.file, 'utf8'));
  validateDocument(document, args);
}

main();
