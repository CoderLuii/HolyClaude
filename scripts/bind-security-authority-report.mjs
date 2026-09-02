#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
  for (const required of ['authority-evidence', 'report', 'output']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  if (resolve(args['authority-evidence']) === resolve(args.output)) {
    throw new Error('bound authority evidence output must not overwrite the committed input');
  }
  return args;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const authorityEvidence = JSON.parse(
    readFileSync(args['authority-evidence'], 'utf8').replace(/^\uFEFF/, ''),
  );
  if (authorityEvidence?.candidate?.reportSha256 !== null) {
    throw new Error('committed authority evidence reportSha256 must be null before runtime binding');
  }
  const reportText = readFileSync(args.report, 'utf8').replace(/^\uFEFF/, '');
  JSON.parse(reportText);
  authorityEvidence.candidate.reportSha256 = createHash('sha256').update(reportText).digest('hex');
  writeFileSync(args.output, `${JSON.stringify(authorityEvidence, null, 2)}\n`);
  console.log(`bound authority evidence to ${authorityEvidence.candidate.reportSha256}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
