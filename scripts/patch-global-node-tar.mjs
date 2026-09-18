import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const EAS_BASELINE_TAR_VERSION = '7.5.19';
const NPM_BASELINE_TAR_SPEC = '^7.5.19';
const VERCEL_CONTAINER_BASELINE_TAR_VERSION = '7.5.11';
const VERCEL_FUN_BASELINE_TAR_VERSION = '7.5.7';
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

function findTarManifests(root) {
  const found = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const path = resolve(current, entry.name);
      if (entry.name === 'tar') {
        const manifest = resolve(path, 'package.json');
        if (existsSync(manifest)) found.push(manifest);
        continue;
      }
      pending.push(path);
    }
  }
  return found.sort();
}

function verifyVercelTarLayout(vercelRoot, expectedVersions) {
  const actual = findTarManifests(vercelRoot).map((path) =>
    relative(vercelRoot, path).split(sep).join('/'),
  );
  const expected = [...expectedVersions.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `unexpected Vercel tar layout: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`,
    );
  }
  for (const [path, version] of expectedVersions) {
    loadPackage(resolve(vercelRoot, path), 'tar', version);
  }
}

function main() {
  const { root, variant, checkBaseline } = parseArguments(process.argv.slice(2));
  const globalModules = resolve(root, 'usr/local/lib/node_modules');
  const npmRoot = resolve(globalModules, 'npm');
  const easRoot = resolve(globalModules, 'eas-cli');
  const vercelRoot = resolve(globalModules, 'vercel');
  const npmManifest = resolve(npmRoot, 'package.json');
  const easManifest = resolve(easRoot, 'package.json');
  const vercelManifest = resolve(vercelRoot, 'package.json');
  const vercelContainerManifest = resolve(
    vercelRoot,
    'node_modules/@vercel/container/package.json',
  );
  const vercelFunManifest = resolve(
    vercelRoot,
    'node_modules/@vercel/fun/package.json',
  );
  const vercelNodePreGypManifest = resolve(
    vercelRoot,
    'node_modules/@mapbox/node-pre-gyp/package.json',
  );
  const npmTarManifest = resolve(npmRoot, 'node_modules/tar/package.json');
  const easTarManifest = resolve(easRoot, 'node_modules/tar/package.json');
  const vercelTarLayout = new Map([
    ['node_modules/tar/package.json', VERCEL_CONTAINER_BASELINE_TAR_VERSION],
    [
      'node_modules/@vercel/fun/node_modules/tar/package.json',
      VERCEL_FUN_BASELINE_TAR_VERSION,
    ],
  ]);

  if (checkBaseline) {
    verifyBaselineDependency(npmManifest, 'npm', '12.0.2', NPM_BASELINE_TAR_SPEC);
    loadPackage(npmTarManifest, 'tar', EAS_BASELINE_TAR_VERSION);
    if (variant === 'slim') return;
    loadPackage(vercelManifest, 'vercel', '59.23.1');
    verifyBaselineDependency(
      easManifest,
      'eas-cli',
      '24.7.0',
      EAS_BASELINE_TAR_VERSION,
    );
    verifyBaselineDependency(
      vercelContainerManifest,
      '@vercel/container',
      '8.2.2',
      VERCEL_CONTAINER_BASELINE_TAR_VERSION,
    );
    verifyBaselineDependency(
      vercelFunManifest,
      '@vercel/fun',
      '1.3.0',
      VERCEL_FUN_BASELINE_TAR_VERSION,
    );
    verifyBaselineDependency(
      vercelNodePreGypManifest,
      '@mapbox/node-pre-gyp',
      '2.0.3',
      '^7.4.0',
    );
    loadPackage(easTarManifest, 'tar', EAS_BASELINE_TAR_VERSION);
    verifyVercelTarLayout(vercelRoot, vercelTarLayout);
    return;
  }

  verifyReplacement(npmTarManifest);
  const npmPackage = loadDependency(npmManifest, 'npm', '12.0.2', [
    NPM_BASELINE_TAR_SPEC,
    TARGET_TAR_VERSION,
  ]);
  if (variant === 'slim') {
    patchDependency(npmManifest, npmPackage);
    return;
  }
  loadPackage(vercelManifest, 'vercel', '59.23.1');
  verifyReplacement(easTarManifest);
  verifyVercelTarLayout(
    vercelRoot,
    new Map([...vercelTarLayout.keys()].map((path) => [path, TARGET_TAR_VERSION])),
  );
  const easPackage = loadDependency(easManifest, 'eas-cli', '24.7.0', [
    EAS_BASELINE_TAR_VERSION,
    TARGET_TAR_VERSION,
  ]);
  const vercelContainerPackage = loadDependency(
    vercelContainerManifest,
    '@vercel/container',
    '8.2.2',
    [VERCEL_CONTAINER_BASELINE_TAR_VERSION, TARGET_TAR_VERSION],
  );
  const vercelFunPackage = loadDependency(
    vercelFunManifest,
    '@vercel/fun',
    '1.3.0',
    [VERCEL_FUN_BASELINE_TAR_VERSION, TARGET_TAR_VERSION],
  );
  verifyBaselineDependency(
    vercelNodePreGypManifest,
    '@mapbox/node-pre-gyp',
    '2.0.3',
    '^7.4.0',
  );
  patchDependency(npmManifest, npmPackage);
  patchDependency(easManifest, easPackage);
  patchDependency(vercelContainerManifest, vercelContainerPackage);
  patchDependency(vercelFunManifest, vercelFunPackage);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
