#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const expectedLockSha256 = '5e84dee0c448f9cd10eed9828a03681c0a8323935a365f42e9dad914e3109025';
const expectedName = '@cloudcli-ai/cloudcli';
const expectedVersion = '1.37.3';
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
if (lockSource.includes('registry.npmmirror.com')) {
  throw new Error('CloudCLI build lock must use registry.npmjs.org URLs');
}

console.log(`CloudCLI build lock verified: ${actualLockSha256}`);
