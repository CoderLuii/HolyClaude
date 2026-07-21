import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const COMPATIBLE_LICENSE_ID = 'Artistic-dist';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || !value) throw new Error(`invalid argument near ${flag ?? '<end>'}`);
    args[flag.slice(2)] = value;
  }
  for (const required of ['input', 'output', 'evidence']) {
    if (!args[required]) throw new Error(`missing --${required}`);
  }
  const paths = [args.input, args.output, args.evidence].map((path) => resolve(path));
  if (new Set(paths).size !== paths.length) throw new Error('input, output, and evidence paths must be different');
  return args;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeLicenseChoices(value) {
  let count = 0;
  function visit(node) {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node.licenses)) {
      for (const choice of node.licenses) {
        const license = choice?.license;
        if (!license || license.id !== COMPATIBLE_LICENSE_ID) continue;
        if (Object.hasOwn(license, 'name')) {
          throw new Error(`${COMPATIBLE_LICENSE_ID} license choice contains both id and name`);
        }
        const { id, ...rest } = license;
        choice.license = { name: id, ...rest };
        count += 1;
      }
    }
    for (const child of Object.values(node)) visit(child);
  }
  visit(value);
  return count;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputBytes = readFileSync(args.input);
  const document = JSON.parse(inputBytes.toString('utf8'));
  if (document.bomFormat !== 'CycloneDX' || document.specVersion !== '1.7') {
    throw new Error('expected a CycloneDX 1.7 document');
  }

  const count = normalizeLicenseChoices(document);
  if (count === 0) throw new Error(`expected at least one ${COMPATIBLE_LICENSE_ID} license choice`);

  const outputBytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
  const evidence = {
    schemaVersion: 1,
    input: basename(args.input),
    output: basename(args.output),
    inputSha256: sha256(inputBytes),
    outputSha256: sha256(outputBytes),
    normalizations: [
      {
        id: COMPATIBLE_LICENSE_ID,
        count,
        representation: 'CycloneDX license name',
        rationale: 'The CycloneDX 1.7 schema SPDX enum predates this current SPDX license identifier.',
      },
    ],
  };

  writeFileSync(args.output, outputBytes);
  writeFileSync(args.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

main();
