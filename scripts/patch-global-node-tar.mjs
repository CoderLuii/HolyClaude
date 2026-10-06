import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EAS_BASELINE_TAR_VERSION = '7.5.19';
const TARGET_TAR_VERSION = '7.5.22';

function parseArguments(argv) {
  const rootIndex = argv.indexOf('--root');
  const variantIndex = argv.indexOf('--variant');
  const checkBaseline = argv.includes('--check-baseline');
  const expectedLength = checkBaseline ? 5 : 4;
  if (
    rootIndex === -1 ||
    !argv[rootIndex + 1] ||
    variantIndex === -1 ||
    !['full', 'slim'].includes(argv[variantIndex + 1]) ||
    argv.length !== expectedLength ||
    (checkBaseline && argv.filter((value) => value === '--check-baseline').length !== 1)
  ) {
    throw new Error(
      'usage: patch-global-node-tar.mjs --root <path> --variant <full|slim> [--check-baseline]',
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
    throw new Error(
      `unexpected package at ${path}: expected ${expectedName}@${expectedVersion}`,
    );
  }
  return value;
}

function loadDependency(path, expectedName, expectedVersion, allowedTarVersions) {
  const value = loadPackage(path, expectedName, expectedVersion);
  const current = value.dependencies?.tar;
  if (!allowedTarVersions.includes(current)) {
    throw new Error(`unexpected tar dependency in ${path}: ${JSON.stringify(current)}`);
  }
  return value;
}

function patchDependency(path, value) {
  if (value.dependencies.tar !== TARGET_TAR_VERSION) {
    value.dependencies.tar = TARGET_TAR_VERSION;
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
  }
}

function verifyBaselineDependency(path, expectedName, expectedVersion, baselineTarVersion) {
  const value = loadPackage(path, expectedName, expectedVersion);
  if (value.dependencies?.tar !== baselineTarVersion) {
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
  const { root, variant, checkBaseline } = parseArguments(process.argv.slice(2));
  if (variant === 'slim') return;
  const easRoot = resolve(root, 'usr/local/lib/node_modules/eas-cli');
  const easManifest = resolve(easRoot, 'package.json');
  const easTarManifest = resolve(easRoot, 'node_modules/tar/package.json');
  if (checkBaseline) {
    verifyBaselineDependency(easManifest, 'eas-cli', '24.7.0', EAS_BASELINE_TAR_VERSION);
    loadPackage(easTarManifest, 'tar', EAS_BASELINE_TAR_VERSION);
    return;
  }
  verifyReplacement(easTarManifest);
  const easPackage = loadDependency(easManifest, 'eas-cli', '24.7.0', [
    EAS_BASELINE_TAR_VERSION,
    TARGET_TAR_VERSION,
  ]);
  patchDependency(easManifest, easPackage);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
