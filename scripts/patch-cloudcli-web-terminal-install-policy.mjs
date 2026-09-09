import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_PLUGIN_ROOT = '/home/claude/.claude-code-ui/plugins/web-terminal';
const EXPECTED_POLICY = { 'esbuild@0.25.12': true, 'node-pty@1.1.0': true };
const EXPECTED_ESBUILD = {
  version: '0.25.12',
  resolved: 'https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz',
  integrity: 'sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==',
  hasInstallScript: true,
  license: 'MIT',
  bin: {
    esbuild: 'bin/esbuild',
  },
  engines: {
    node: '>=18',
  },
  optionalDependencies: {
    '@esbuild/aix-ppc64': '0.25.12',
    '@esbuild/android-arm': '0.25.12',
    '@esbuild/android-arm64': '0.25.12',
    '@esbuild/android-x64': '0.25.12',
    '@esbuild/darwin-arm64': '0.25.12',
    '@esbuild/darwin-x64': '0.25.12',
    '@esbuild/freebsd-arm64': '0.25.12',
    '@esbuild/freebsd-x64': '0.25.12',
    '@esbuild/linux-arm': '0.25.12',
    '@esbuild/linux-arm64': '0.25.12',
    '@esbuild/linux-ia32': '0.25.12',
    '@esbuild/linux-loong64': '0.25.12',
    '@esbuild/linux-mips64el': '0.25.12',
    '@esbuild/linux-ppc64': '0.25.12',
    '@esbuild/linux-riscv64': '0.25.12',
    '@esbuild/linux-s390x': '0.25.12',
    '@esbuild/linux-x64': '0.25.12',
    '@esbuild/netbsd-arm64': '0.25.12',
    '@esbuild/netbsd-x64': '0.25.12',
    '@esbuild/openbsd-arm64': '0.25.12',
    '@esbuild/openbsd-x64': '0.25.12',
    '@esbuild/openharmony-arm64': '0.25.12',
    '@esbuild/sunos-x64': '0.25.12',
    '@esbuild/win32-arm64': '0.25.12',
    '@esbuild/win32-ia32': '0.25.12',
    '@esbuild/win32-x64': '0.25.12',
  },
};
const EXPECTED_NODE_PTY = {
  version: '1.1.0',
  resolved: 'https://registry.npmjs.org/node-pty/-/node-pty-1.1.0.tgz',
  integrity: 'sha512-20JqtutY6JPXTUnL0ij1uad7Qe1baT46lyolh2sSENDd4sTzKZ4nmAFkeAARDKwmlLjPx6XKRlwRUxwjOy+lUg==',
  hasInstallScript: true,
  license: 'MIT',
  dependencies: {
    'node-addon-api': '^7.1.0',
  },
};

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isExact(value, expected) {
  return JSON.stringify(value) === JSON.stringify(expected);
}

function main() {
  const pluginRoot = resolve(process.argv[2] || DEFAULT_PLUGIN_ROOT);
  const packagePath = resolve(pluginRoot, 'package.json');
  const lockPath = resolve(pluginRoot, 'package-lock.json');
  const packageJson = loadJson(packagePath);
  const lock = loadJson(lockPath);

  if (
    packageJson.name !== 'cloudcli-plugin-terminal'
    || packageJson.version !== '1.1.0'
    || packageJson.dependencies?.['node-pty'] !== '^1.1.0'
    || lock.lockfileVersion !== 3
    || lock.packages?.['']?.name !== 'cloudcli-plugin-terminal'
    || lock.packages?.['']?.version !== '1.1.0'
    || lock.packages?.['']?.dependencies?.['node-pty'] !== '^1.1.0'
  ) {
    throw new Error('unexpected CloudCLI Web Terminal package metadata');
  }

  if (!isExact(lock.packages?.['node_modules/node-pty'], EXPECTED_NODE_PTY)) {
    throw new Error('unexpected node-pty@1.1.0 lock metadata');
  }

  if (!isExact(lock.packages?.['node_modules/esbuild'], EXPECTED_ESBUILD)) {
    throw new Error('unexpected esbuild@0.25.12 lock metadata');
  }

  if (packageJson.allowScripts !== undefined && !isExact(packageJson.allowScripts, EXPECTED_POLICY)) {
    throw new Error('unexpected CloudCLI Web Terminal allowScripts policy');
  }

  if (packageJson.allowScripts === undefined) {
    packageJson.allowScripts = EXPECTED_POLICY;
    writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
