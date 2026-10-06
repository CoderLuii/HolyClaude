import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMON_PACKAGES = [
  [
    'home/claude/.local/share/cursor-agent/versions/2026.09.15-d2fe57e/node_modules/piscina/package.json',
    'piscina',
    '4.9.3',
    '4.9.4',
  ],
];

const FULL_PACKAGES = [
  [
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/undici/package.json',
    'undici',
    '8.9.0',
    '8.10.2',
  ],
  ['usr/local/lib/node_modules/eas-cli/node_modules/nanoid/package.json', 'nanoid', '3.3.8', '3.3.19'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/joi/package.json', 'joi', '17.11.0', '17.13.7'],
  ['usr/local/lib/node_modules/pm2/node_modules/js-yaml/package.json', 'js-yaml', '4.3.1', '4.3.2'],
  [
    'usr/local/lib/node_modules/@marp-team/marp-cli/node_modules/@xmldom/xmldom/package.json',
    '@xmldom/xmldom',
    '0.9.10',
    '0.9.12',
  ],
  ['usr/local/lib/node_modules/netlify-cli/node_modules/sharp/package.json', 'sharp', '0.34.5', '0.35.4'],
  ['usr/local/lib/node_modules/eas-cli/node_modules/minimatch/package.json', 'minimatch', '5.1.2', '5.1.9'],
  ['usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/ws/package.json', 'ws', '8.18.0', '8.21.3'],
];

const FULL_DEPENDENCIES = [
  [
    'usr/local/lib/node_modules/netlify-cli/package.json',
    'netlify-cli',
    '27.8.0',
    '@netlify/images',
    '^2.0.1',
    '^2.0.1',
  ],
  [
    'usr/local/lib/node_modules/netlify-cli/node_modules/@netlify/images/package.json',
    '@netlify/images',
    '2.0.3',
    'ipx',
    '^3.1.1',
    '^3.1.1',
  ],
  ['usr/local/lib/node_modules/pm2/package.json', 'pm2', '7.0.4', 'js-yaml', '4.3.1', '4.3.2'],
  [
    'usr/local/lib/node_modules/@marp-team/marp-cli/node_modules/speech-rule-engine/package.json',
    'speech-rule-engine',
    '4.1.4',
    '@xmldom/xmldom',
    '0.9.10',
    '0.9.12',
  ],
  [
    'usr/local/lib/node_modules/@earendil-works/pi-coding-agent/package.json',
    '@earendil-works/pi-coding-agent',
    '0.85.1',
    'undici',
    '8.9.0',
    '8.10.2',
  ],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.7.0', 'nanoid', '3.3.8', '3.3.19'],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.7.0', 'joi', '17.11.0', '17.13.7'],
  [
    'usr/local/lib/node_modules/eas-cli/node_modules/@expo/eas-json/package.json',
    '@expo/eas-json',
    '24.5.0',
    'joi',
    '17.11.0',
    '17.13.7',
  ],
  ['usr/local/lib/node_modules/eas-cli/package.json', 'eas-cli', '24.7.0', 'minimatch', '5.1.2', '5.1.9'],
  [
    'usr/local/lib/node_modules/netlify-cli/node_modules/ipx/package.json',
    'ipx',
    '3.1.1',
    'sharp',
    '^0.34.3',
    '0.35.4',
  ],
  [
    'usr/local/lib/node_modules/@cloudflare/next-on-pages/node_modules/miniflare/package.json',
    'miniflare',
    '3.20250718.3',
    'ws',
    '8.18.0',
    '8.21.3',
  ],
];

function parseArguments(argv) {
  const rootIndex = argv.indexOf('--root');
  const variantIndex = argv.indexOf('--variant');
  const checkBaseline = argv.includes('--check-baseline');
  const expectedLength = checkBaseline ? 5 : 4;
  if (
    rootIndex === -1 ||
    variantIndex === -1 ||
    !argv[rootIndex + 1] ||
    !['full', 'slim'].includes(argv[variantIndex + 1]) ||
    argv.length !== expectedLength
  ) {
    throw new Error(
      'usage: patch-global-node-security-dependencies.mjs --root <path> --variant <full|slim> [--check-baseline]',
    );
  }
  return {
    root: resolve(argv[rootIndex + 1]),
    variant: argv[variantIndex + 1],
    checkBaseline,
  };
}

function loadPackage(path, expectedName, expectedVersion) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value.name !== expectedName || value.version !== expectedVersion) {
    throw new Error(`unexpected package at ${path}: expected ${expectedName}@${expectedVersion}`);
  }
  return value;
}

function verifyPackage(root, definition, checkBaseline) {
  const [relativePath, name, baseline, target] = definition;
  loadPackage(resolve(root, relativePath), name, checkBaseline ? baseline : target);
}

function patchDependency(root, definition, checkBaseline) {
  const [relativePath, name, version, dependency, baseline, target, dependencyGroup = 'dependencies'] = definition;
  const path = resolve(root, relativePath);
  const value = loadPackage(path, name, version);
  const expected = checkBaseline ? baseline : target;
  const current = value[dependencyGroup]?.[dependency];
  if (current !== expected && !(checkBaseline === false && current === baseline)) {
    throw new Error(
      `unexpected ${dependency} dependency in ${path}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(current)}`,
    );
  }
  if (!checkBaseline && current === baseline) {
    value[dependencyGroup][dependency] = target;
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  }
}

function main() {
  const { root, variant, checkBaseline } = parseArguments(process.argv.slice(2));
  const packages = variant === 'full' ? [...COMMON_PACKAGES, ...FULL_PACKAGES] : COMMON_PACKAGES;
  for (const definition of packages) verifyPackage(root, definition, checkBaseline);
  if (variant === 'full') {
    for (const definition of FULL_DEPENDENCIES) patchDependency(root, definition, checkBaseline);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
