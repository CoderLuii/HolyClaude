#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const expectedLockSha256 = '84801d30cba43008fe983ab18cbf318f99bb453a3be9f256e84a342cd7000c19';
const expectedName = '@cloudcli-ai/cloudcli';
const expectedVersion = '1.37.3';
const expectedBetterSqlite3 = {
  version: '12.11.1',
  resolved: 'https://registry.npmjs.org/better-sqlite3/-/better-sqlite3-12.11.1.tgz',
  integrity: 'sha512-dq9AtApgg5PGFtBzPFSBl3HZQjHok5gaQCM6zh2Yk0aSmDCs1CbnVI8/HgASQkNKsWFpseIO9beg5xxpYhbIfA==',
  node: '20.x || 22.x || 23.x || 24.x || 25.x || 26.x',
};
const expectedSecurityPackages = {
  'node_modules/fast-uri': {
    version: '3.1.8',
    integrity: 'sha512-GZMtZUTNRpOVIECoXwLNZS5xUGE+mVNbTB8h/7Rwh2TFWcBQiPzTgyZi05BF9UMZKkLJv8XBRJTlU7zg8+ZfMg==',
  },
  'brace-expansion@1': {
    version: '1.1.21',
    integrity: 'sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==',
  },
  'brace-expansion@2': {
    version: '2.1.7',
    integrity: 'sha512-uZbew1NqdmPDTMJ8ah1y+b+9QEJrfkXFk3RcTQw3X0jW/xRUvFKsg1CfQdSYGdTbXZWExtU3J3ccxtnfw1Fi0g==',
  },
  'brace-expansion@5': {
    version: '5.0.12',
    integrity: 'sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==',
  },
};
const declarationFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'bin'];

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  args.set(process.argv[index], process.argv[index + 1]);
}

const lockPath = args.get('--lock');
const packagePath = args.get('--package');
if (!lockPath || !packagePath || args.size !== 2) {
  throw new Error('usage: verify-cloudcli-account-management-lock.mjs --lock <path> --package <path>');
}

for (const [label, filePath] of [['CloudCLI build lock', lockPath], ['CloudCLI package.json', packagePath]]) {
  if (!existsSync(filePath)) throw new Error(`${label} does not exist: ${path.resolve(filePath)}`);
}

const lockSource = readFileSync(lockPath);
const actualLockSha256 = createHash('sha256').update(lockSource).digest('hex');
if (actualLockSha256 !== expectedLockSha256) {
  throw new Error(`CloudCLI build lock SHA-256 mismatch: expected ${expectedLockSha256}, got ${actualLockSha256}`);
}

const lock = JSON.parse(lockSource.toString('utf8'));
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const lockRoot = lock.packages?.[''];
if (lock.lockfileVersion !== 3 || !lockRoot) {
  throw new Error('CloudCLI build lock must be an npm lockfileVersion 3 package lock');
}
if (
  packageJson.name !== expectedName
  || lock.name !== expectedName
  || lockRoot.name !== expectedName
  || packageJson.version !== expectedVersion
  || lock.version !== expectedVersion
  || lockRoot.version !== expectedVersion
) {
  throw new Error(`CloudCLI package.json and build lock must describe ${expectedName} ${expectedVersion}`);
}
for (const field of declarationFields) {
  if (JSON.stringify(packageJson[field] ?? {}) !== JSON.stringify(lockRoot[field] ?? {})) {
    throw new Error(`CloudCLI package.json and build lock root dependency declarations differ for ${field}`);
  }
}
const betterSqlite3 = lock.packages?.['node_modules/better-sqlite3'];
for (const [field, expected] of Object.entries(expectedBetterSqlite3)) {
  const actual = field === 'node' ? betterSqlite3?.engines?.node : betterSqlite3?.[field];
  if (actual !== expected) {
    throw new Error(`CloudCLI build lock better-sqlite3 ${field} drift: expected ${expected}, got ${actual}`);
  }
}
for (const [packagePath, expected] of Object.entries(expectedSecurityPackages)) {
  if (packagePath === 'node_modules/fast-uri') {
    const actual = lock.packages?.[packagePath];
    assertSecurityPackage(packagePath, actual, expected);
    continue;
  }
  const matches = Object.entries(lock.packages)
    .filter(([candidatePath, metadata]) => (
      candidatePath.endsWith('node_modules/brace-expansion')
      && metadata.version.split('.')[0] === expected.version.split('.')[0]
    ));
  if (matches.length === 0) {
    throw new Error(`CloudCLI build lock must include ${packagePath}`);
  }
  for (const [candidatePath, actual] of matches) {
    assertSecurityPackage(candidatePath, actual, expected);
  }
}
if (lockSource.includes('registry.npmmirror.com')) {
  throw new Error('CloudCLI build lock must use registry.npmjs.org URLs');
}

console.log(`CloudCLI build lock verified: ${actualLockSha256}`);

function assertSecurityPackage(packagePath, actual, expected) {
  if (actual?.version !== expected.version || actual?.integrity !== expected.integrity) {
    throw new Error(
      `CloudCLI build lock ${packagePath} drift: expected ${expected.version} ${expected.integrity}, got ${actual?.version ?? 'missing'} ${actual?.integrity ?? 'missing'}`,
    );
  }
}
