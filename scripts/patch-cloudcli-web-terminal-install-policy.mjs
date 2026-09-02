import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_PLUGIN_ROOT = '/home/claude/.claude-code-ui/plugins/web-terminal';
const EXPECTED_POLICY = { 'node-pty@1.1.0': true };
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
    || packageJson.version !== '1.0.2'
    || packageJson.dependencies?.['node-pty'] !== '^1.1.0'
    || lock.lockfileVersion !== 3
    || lock.packages?.['']?.name !== 'cloudcli-plugin-terminal'
    || lock.packages?.['']?.version !== '1.0.2'
    || lock.packages?.['']?.dependencies?.['node-pty'] !== '^1.1.0'
  ) {
    throw new Error('unexpected CloudCLI Web Terminal package metadata');
  }

  if (!isExact(lock.packages?.['node_modules/node-pty'], EXPECTED_NODE_PTY)) {
    throw new Error('unexpected node-pty@1.1.0 lock metadata');
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
