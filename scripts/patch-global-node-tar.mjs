import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_TAR_VERSION = '7.5.7';
const TARGET_TAR_VERSION = '7.5.20';

function parseArguments(argv) {
  const index = argv.indexOf('--root');
  const checkBaseline = argv.includes('--check-baseline');
  const expectedLength = checkBaseline ? 3 : 2;
  if (
    index === -1 ||
    !argv[index + 1] ||
    argv.length !== expectedLength ||
    (checkBaseline && argv.filter((value) => value === '--check-baseline').length !== 1)
  ) {
    throw new Error(
      'usage: patch-global-node-tar.mjs --root <path> [--check-baseline]',
    );
  }
  return { root: resolve(argv[index + 1]), checkBaseline };
}

function loadPackage(path, expectedName, expectedVersion) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value.name !== expectedName || value.version !== expectedVersion) {
    throw new Error(
      `unexpected package at ${path}: expected ${expectedName}@${expectedVersion}`,
    );
  }
  return value;
}

function patchDependency(path, expectedName, expectedVersion) {
  const value = loadPackage(path, expectedName, expectedVersion);
  const current = value.dependencies?.tar;
  if (current !== BASELINE_TAR_VERSION && current !== TARGET_TAR_VERSION) {
    throw new Error(`unexpected tar dependency in ${path}: ${JSON.stringify(current)}`);
  }
  if (current === BASELINE_TAR_VERSION) {
    value.dependencies.tar = TARGET_TAR_VERSION;
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  }
}

function verifyBaselineDependency(path, expectedName, expectedVersion) {
  const value = loadPackage(path, expectedName, expectedVersion);
  if (value.dependencies?.tar !== BASELINE_TAR_VERSION) {
    throw new Error(
      `unexpected baseline tar dependency in ${path}: ${JSON.stringify(value.dependencies?.tar)}`,
    );
  }
}

function verifyReplacement(path) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value.name !== 'tar' || value.version !== TARGET_TAR_VERSION) {
    throw new Error(`expected tar ${TARGET_TAR_VERSION} at ${path}`);
  }
}

function main() {
  const { root, checkBaseline } = parseArguments(process.argv.slice(2));
  const globalModules = resolve(root, 'usr/local/lib/node_modules');
  const easRoot = resolve(globalModules, 'eas-cli');
  const vercelRoot = resolve(globalModules, 'vercel');
  const easManifest = resolve(easRoot, 'package.json');
  const vercelManifest = resolve(vercelRoot, 'package.json');
  const vercelFunManifest = resolve(
    vercelRoot,
    'node_modules/@vercel/fun/package.json',
  );
  const easTarManifest = resolve(easRoot, 'node_modules/tar/package.json');
  const vercelTarManifest = resolve(vercelRoot, 'node_modules/tar/package.json');

  loadPackage(vercelManifest, 'vercel', '54.21.1');
  if (checkBaseline) {
    verifyBaselineDependency(easManifest, 'eas-cli', '20.5.1');
    verifyBaselineDependency(vercelFunManifest, '@vercel/fun', '1.3.0');
    loadPackage(easTarManifest, 'tar', BASELINE_TAR_VERSION);
    loadPackage(vercelTarManifest, 'tar', BASELINE_TAR_VERSION);
    return;
  }

  verifyReplacement(easTarManifest);
  verifyReplacement(vercelTarManifest);
  patchDependency(easManifest, 'eas-cli', '20.5.1');
  patchDependency(vercelFunManifest, '@vercel/fun', '1.3.0');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
