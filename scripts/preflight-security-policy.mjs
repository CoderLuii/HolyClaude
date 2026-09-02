#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { validateSecurityPolicy } from './evaluate-security-report.mjs';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`invalid argument near ${key ?? '<end>'}`);
    }
    args[key.slice(2)] = value;
  }
  for (const required of ['ledger', 'authority-evidence', 'vex', 'as-of']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
}

try {
  const args = parseArgs(process.argv.slice(2));
  validateSecurityPolicy({
    ledger: readJson(args.ledger),
    authorityEvidence: readJson(args['authority-evidence']),
    vex: readJson(args.vex),
    asOfText: args['as-of'],
  });
  console.log(`security policy preflight passed for ${args['as-of']}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
