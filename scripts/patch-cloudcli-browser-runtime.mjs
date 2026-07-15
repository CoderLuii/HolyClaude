import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const CLOUDCLI_ROOT = process.argv[2] || DEFAULT_CLOUDCLI_ROOT;
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI browser runtime anchors not found';
const PATCH_MARKER = '// HolyClaude canonical browser runtime';
const EXECUTABLE_PATH_FIELD = 'executablePath: process.env.CHROME_PATH,';
const READINESS_ANCHOR = 'const executablePath = playwright.chromium.executablePath();';
const READINESS_FIELD = 'const executablePath = process.env.CHROME_PATH || playwright.chromium.executablePath();';

const targets = [
  {
    label: 'source',
    path: `${CLOUDCLI_ROOT}/server/modules/browser-use/browser-use.service.ts`,
    indent: '      '
  },
  {
    label: 'runtime',
    path: `${CLOUDCLI_ROOT}/dist-server/server/modules/browser-use/browser-use.service.js`,
    indent: '            '
  }
];

function fail() {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

function countOccurrences(source, searchText) {
  return source.split(searchText).length - 1;
}

function patchTarget(target) {
  if (!existsSync(target.path)) {
    fail();
  }

  let source;
  try {
    source = readFileSync(target.path, 'utf8');
  } catch {
    fail();
  }

  const launchAnchor = [
    'const launchOptions = {',
    `${target.indent}headless: true,`,
    `${target.indent}args: ['--disable-dev-shm-usage'],`
  ].join('\n');
  const patchedAnchor = [
    'const launchOptions = {',
    `${target.indent}${PATCH_MARKER}`,
    `${target.indent}${EXECUTABLE_PATH_FIELD}`,
    `${target.indent}headless: true,`,
    `${target.indent}args: ['--disable-dev-shm-usage'],`
  ].join('\n');

  const markerCount = countOccurrences(source, PATCH_MARKER);
  const fieldCount = countOccurrences(source, EXECUTABLE_PATH_FIELD);
  const readinessFieldCount = countOccurrences(source, READINESS_FIELD);
  if (
    markerCount === 1
    && fieldCount === 1
    && readinessFieldCount === 1
    && source.includes(patchedAnchor)
  ) {
    console.log(`[patch] CloudCLI browser runtime already patched (${target.label})`);
    return;
  }

  if (
    markerCount !== 0
    || fieldCount !== 0
    || readinessFieldCount !== 0
    || countOccurrences(source, launchAnchor) !== 1
    || countOccurrences(source, READINESS_ANCHOR) !== 1
  ) {
    fail();
  }

  source = source
    .replace(launchAnchor, patchedAnchor)
    .replace(READINESS_ANCHOR, READINESS_FIELD);
  if (
    countOccurrences(source, PATCH_MARKER) !== 1
    || countOccurrences(source, EXECUTABLE_PATH_FIELD) !== 1
    || countOccurrences(source, READINESS_FIELD) !== 1
    || countOccurrences(source, READINESS_ANCHOR) !== 0
    || !source.includes(patchedAnchor)
  ) {
    fail();
  }

  try {
    writeFileSync(target.path, source);
  } catch {
    fail();
  }
  console.log(`[patch] CloudCLI browser runtime patched (${target.label})`);
}

for (const target of targets) {
  patchTarget(target);
}
