import { existsSync, readFileSync, writeFileSync } from 'fs';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const CLOUDCLI_ROOT = process.argv[2] || DEFAULT_CLOUDCLI_ROOT;
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI self-update anchors not found';

const CLI_MARKER = 'const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;';
const SYSTEM_MARKER = 'const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {';
const DOCKER_UPDATE_COMMAND = 'docker compose pull && docker compose up -d';

// CloudCLI 1.37.x split the flat server/cli.js and server/index.js into the cli and
// system modules, so each tree is patched through its own module file.
const CLI_CHECK_ANCHOR = 'const checkForUpdates = async (silent = false)';
const CLI_UPDATE_ANCHOR = 'const updatePackage = async (';
const CLI_OLD_PROMPT = "Run ${terminalTextStyles.bright('cloudcli update')} to update";
const CLI_SERVICE_OLD_NPM_UPDATE = 'npm update -g @cloudcli-ai/cloudcli';
const CLI_MODULE_OLD_NPM_UPDATE = "execSync('npm update -g @cloudcli-ai/cloudcli', { stdio: 'inherit' });";
const CLI_MODULE_DISABLED_UPDATE = '// HolyClaude disables CloudCLI npm self-updates; see cli.service.';
const SANDBOX_OLD_GLOBAL_INSTALL_HINT =
  "dependencies.output.log(`\\n${terminalTextStyles.dim('  Or install globally:')} npm install -g @cloudcli-ai/cloudcli\\n`);";
const SANDBOX_DOCKER_UPDATE_HINT =
  "dependencies.output.log(`\\n${terminalTextStyles.dim('  HolyClaude updates:')} " + DOCKER_UPDATE_COMMAND + "\\n`);";

const SYSTEM_ROUTE_ANCHOR = "router.post('/update', async (_request, response, next) => {";
const SYSTEM_ROUTER_ANCHOR = 'const router = express.Router();';
const SYSTEM_SERVICE_OLD_NPM_UPDATE = "'npm install -g @cloudcli-ai/cloudcli@latest'";
const SYSTEM_SERVICE_DISABLED_COMMAND = 'HOLYCLAUDE_DISABLED_UPDATE_COMMAND';
const SYSTEM_SERVICE_ANCHOR = 'export function createSystemUpdateService(';

// Workspace browsing shares the system module's former home in server/index.js. These
// stay presence-only assertions so an upstream move is reported instead of silently
// dropping the routes the patch used to sit next to.
const FILE_TREE_BROWSE_ROUTE = "router.get('/browse-filesystem'";
const FILE_TREE_CREATE_FOLDER_ROUTE = "router.post('/create-folder'";
const FILE_TREE_WORKSPACE_HELPER = 'function expandWorkspacePath';
const FILE_TREE_EXPANDED_PATH = 'const expandedPath = expandWorkspacePath(dependencies.workspace.rootPath, folderPath);';

const targets = [
  {
    label: 'source',
    cliServicePath: `${CLOUDCLI_ROOT}/server/modules/cli/cli.service.ts`,
    cliModulePath: `${CLOUDCLI_ROOT}/server/modules/cli/cli.module.ts`,
    sandboxServicePath: `${CLOUDCLI_ROOT}/server/modules/cli/sandbox.service.ts`,
    systemRoutesPath: `${CLOUDCLI_ROOT}/server/modules/system/system.routes.ts`,
    systemServicePath: `${CLOUDCLI_ROOT}/server/modules/system/system.service.ts`,
    fileTreeRoutesPath: `${CLOUDCLI_ROOT}/server/modules/file-tree/file-tree.routes.ts`,
    fileTreeServicePath: `${CLOUDCLI_ROOT}/server/modules/file-tree/file-tree.service.ts`
  },
  {
    label: 'runtime',
    cliServicePath: `${CLOUDCLI_ROOT}/dist-server/server/modules/cli/cli.service.js`,
    cliModulePath: `${CLOUDCLI_ROOT}/dist-server/server/modules/cli/cli.module.js`,
    sandboxServicePath: `${CLOUDCLI_ROOT}/dist-server/server/modules/cli/sandbox.service.js`,
    systemRoutesPath: `${CLOUDCLI_ROOT}/dist-server/server/modules/system/system.routes.js`,
    systemServicePath: `${CLOUDCLI_ROOT}/dist-server/server/modules/system/system.service.js`,
    fileTreeRoutesPath: `${CLOUDCLI_ROOT}/dist-server/server/modules/file-tree/file-tree.routes.js`,
    fileTreeServicePath: `${CLOUDCLI_ROOT}/dist-server/server/modules/file-tree/file-tree.service.js`
  }
].filter((target) => existsSync(target.cliServicePath)
  && existsSync(target.cliModulePath)
  && existsSync(target.systemRoutesPath)
  && existsSync(target.systemServicePath));

if (targets.length === 0) {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

function fail(detail) {
  console.error(detail ? `${ERROR_MESSAGE}: ${detail}` : ERROR_MESSAGE);
  process.exit(1);
}

function readSource(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return fail(`cannot read ${path}`);
  }
}

function writeSource(path, source) {
  try {
    writeFileSync(path, source);
  } catch {
    fail(`cannot write ${path}`);
  }
}

function countOccurrences(source, searchText) {
  let count = 0;
  let searchIndex = source.indexOf(searchText);

  while (searchIndex !== -1) {
    count += 1;
    searchIndex = source.indexOf(searchText, searchIndex + searchText.length);
  }

  return count;
}

function findBlockEnd(source, bodyStartIndex) {
  if (bodyStartIndex === -1) {
    return -1;
  }

  let braceDepth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let templateDepth = 0;

  for (let sourceIndex = bodyStartIndex; sourceIndex < source.length; sourceIndex += 1) {
    const character = source[sourceIndex];
    const nextCharacter = source[sourceIndex + 1];

    if (lineComment) {
      if (character === '\n' || character === '\r') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (character === '*' && nextCharacter === '/') {
        blockComment = false;
        sourceIndex += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (quote === '`' && character === '$' && nextCharacter === '{') {
        templateDepth += 1;
        sourceIndex += 1;
      } else if (quote === '`' && character === '}' && templateDepth > 0) {
        templateDepth -= 1;
      } else if (character === quote && templateDepth === 0) {
        quote = null;
      }
      continue;
    }

    if (character === '/' && nextCharacter === '/') {
      lineComment = true;
      sourceIndex += 1;
      continue;
    }

    if (character === '/' && nextCharacter === '*') {
      blockComment = true;
      sourceIndex += 1;
      continue;
    }

    if (character === '\'' || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{') {
      braceDepth += 1;
      continue;
    }

    if (character === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        return sourceIndex + 1;
      }
    }
  }

  return -1;
}

function indentOf(source, index) {
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const line = source.slice(lineStart, index);
  return /^\s*$/.test(line) ? line : '';
}

function indentBlock(block, indent) {
  return block
    .split('\n')
    .map((line, lineIndex) => (lineIndex === 0 || line === '' ? line : `${indent}${line}`))
    .join('\n');
}

// ---------- server/modules/cli/cli.service ----------

function patchCliService(path) {
  let source = readSource(path);
  if (source.includes(CLI_MARKER)) {
    if (source.includes(CLI_SERVICE_OLD_NPM_UPDATE) || source.includes(CLI_OLD_PROMPT)) {
      fail(`stale self-update text remains in ${path}`);
    }
    return true;
  }

  const checkIndex = source.indexOf(CLI_CHECK_ANCHOR);
  const updateIndex = source.indexOf(CLI_UPDATE_ANCHOR);

  if (checkIndex === -1
    || updateIndex === -1
    || countOccurrences(source, CLI_CHECK_ANCHOR) !== 1
    || countOccurrences(source, CLI_UPDATE_ANCHOR) !== 1
    || checkIndex > updateIndex
    || !source.includes(CLI_OLD_PROMPT)
    || !source.includes(CLI_SERVICE_OLD_NPM_UPDATE)) {
    fail(`cli service anchors missing in ${path}`);
  }

  const updateEndIndex = findBlockEnd(source, source.indexOf('{', updateIndex));
  if (updateEndIndex === -1) {
    fail(`cannot find the end of updatePackage in ${path}`);
  }

  const terminatorMatch = source.slice(updateEndIndex).match(/^\s*;/);
  if (!terminatorMatch) {
    fail(`updatePackage is not a terminated assignment in ${path}`);
  }

  const indent = indentOf(source, checkIndex);
  const replacement = indentBlock([
    '// HolyClaude ships patched CloudCLI files. npm self-updates can replace them.',
    CLI_MARKER,
    `const HOLYCLAUDE_DOCKER_UPDATE_COMMAND = '${DOCKER_UPDATE_COMMAND}';`,
    '',
    'const checkForUpdates = async (silent = false) => {',
    '  if (!silent) {',
    "    dependencies.output.log(`${terminalTextStyles.warn('[UPDATE]')} CloudCLI self-update is disabled in HolyClaude.`);",
    "    dependencies.output.log(`         Use ${terminalTextStyles.bright(HOLYCLAUDE_DOCKER_UPDATE_COMMAND)} to update the image.\\n`);",
    '  }',
    '  return false;',
    '};',
    '',
    'const updatePackage = async () => {',
    "  dependencies.output.log(`${terminalTextStyles.warn('[UPDATE]')} CloudCLI self-update is disabled in HolyClaude.`);",
    "  dependencies.output.log(`         Use ${terminalTextStyles.bright(HOLYCLAUDE_DOCKER_UPDATE_COMMAND)} to update the image.`);",
    "  dependencies.output.log('         If this container already ran an npm update, recreate it from the HolyClaude image.');",
    '}'
  ].join('\n'), indent);

  source = `${source.slice(0, checkIndex)}${replacement}${source.slice(updateEndIndex)}`;

  if (!source.includes(CLI_MARKER)
    || source.includes(CLI_SERVICE_OLD_NPM_UPDATE)
    || source.includes(CLI_OLD_PROMPT)) {
    fail(`cli service patch did not remove the self-update path in ${path}`);
  }

  writeSource(path, source);
  return false;
}

// ---------- server/modules/cli/cli.module ----------

function patchCliModule(path) {
  const source = readSource(path);
  if (!source.includes(CLI_MODULE_OLD_NPM_UPDATE)) {
    if (source.includes(CLI_MODULE_DISABLED_UPDATE)) {
      return true;
    }
    fail(`cli module npm update anchor missing in ${path}`);
  }

  const patched = source.replace(CLI_MODULE_OLD_NPM_UPDATE, CLI_MODULE_DISABLED_UPDATE);
  if (patched.includes(CLI_MODULE_OLD_NPM_UPDATE) || !patched.includes(CLI_MODULE_DISABLED_UPDATE)) {
    fail(`cli module patch did not apply in ${path}`);
  }

  writeSource(path, patched);
  return false;
}

// ---------- server/modules/cli/sandbox.service ----------

function patchSandboxService(path) {
  if (!existsSync(path)) {
    return true;
  }

  const source = readSource(path);
  if (!source.includes(SANDBOX_OLD_GLOBAL_INSTALL_HINT)) {
    if (source.includes(SANDBOX_DOCKER_UPDATE_HINT)) {
      return true;
    }
    fail(`sandbox install hint anchor missing in ${path}`);
  }

  writeSource(path, source.replace(SANDBOX_OLD_GLOBAL_INSTALL_HINT, SANDBOX_DOCKER_UPDATE_HINT));
  return false;
}

// ---------- server/modules/system/system.routes ----------

function patchSystemRoutes(path) {
  let source = readSource(path);
  if (source.includes(SYSTEM_MARKER)) {
    return true;
  }

  const routeIndex = source.indexOf(SYSTEM_ROUTE_ANCHOR);
  const routerIndex = source.indexOf(SYSTEM_ROUTER_ANCHOR);
  if (routeIndex === -1
    || routerIndex === -1
    || countOccurrences(source, SYSTEM_ROUTE_ANCHOR) !== 1
    || countOccurrences(source, SYSTEM_ROUTER_ANCHOR) !== 1
    || routerIndex > routeIndex) {
    fail(`system update route anchors missing in ${path}`);
  }

  const bodyEndIndex = findBlockEnd(source, source.indexOf('{', routeIndex));
  if (bodyEndIndex === -1) {
    fail(`cannot find the end of the system update route in ${path}`);
  }

  const terminatorMatch = source.slice(bodyEndIndex).match(/^\s*\);/);
  if (!terminatorMatch) {
    fail(`system update route is not a terminated call in ${path}`);
  }

  const routeEndIndex = bodyEndIndex + terminatorMatch[0].length;
  const indent = indentOf(source, routeIndex);
  const replacement = indentBlock([
    "router.post('/update', async (_request, response) => {",
    '  response.status(409).json(HOLYCLAUDE_UPDATE_DISABLED_RESPONSE);',
    '});'
  ].join('\n'), indent);

  source = `${source.slice(0, routeIndex)}${replacement}${source.slice(routeEndIndex)}`;

  const constantIndent = indentOf(source, source.indexOf(SYSTEM_ROUTER_ANCHOR));
  const constant = indentBlock([
    '// HolyClaude ships patched CloudCLI files. npm self-updates can replace them.',
    'const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {',
    '  success: false,',
    "  error: 'CloudCLI self-update is disabled in HolyClaude',",
    `  message: 'Update HolyClaude with ${DOCKER_UPDATE_COMMAND}. This image includes patched CloudCLI files; npm self-updates can replace them.'`,
    '};',
    '',
    SYSTEM_ROUTER_ANCHOR
  ].join('\n'), constantIndent);

  source = source.replace(SYSTEM_ROUTER_ANCHOR, constant);

  if (!source.includes(SYSTEM_MARKER) || !source.includes('response.status(409).json(HOLYCLAUDE_UPDATE_DISABLED_RESPONSE);')) {
    fail(`system routes patch did not apply in ${path}`);
  }

  writeSource(path, source);
  return false;
}

// ---------- server/modules/system/system.service ----------

function patchSystemService(path) {
  let source = readSource(path);
  if (!source.includes(SYSTEM_SERVICE_OLD_NPM_UPDATE)) {
    if (source.includes(SYSTEM_SERVICE_DISABLED_COMMAND)) {
      return true;
    }
    fail(`system service npm update anchor missing in ${path}`);
  }

  const serviceIndex = source.indexOf(SYSTEM_SERVICE_ANCHOR);
  if (serviceIndex === -1) {
    fail(`system service factory missing in ${path}`);
  }

  source = source.replace(SYSTEM_SERVICE_OLD_NPM_UPDATE, SYSTEM_SERVICE_DISABLED_COMMAND);

  const indent = indentOf(source, source.indexOf(SYSTEM_SERVICE_ANCHOR));
  const constant = indentBlock([
    '// HolyClaude disables CloudCLI npm self-updates. This command only runs if the',
    "// module's update route is ever reached without the HolyClaude route patch.",
    `const ${SYSTEM_SERVICE_DISABLED_COMMAND} = 'echo \\'CloudCLI self-update is disabled in HolyClaude\\' >&2 && exit 1';`,
    '',
    SYSTEM_SERVICE_ANCHOR
  ].join('\n'), indent);

  source = source.replace(SYSTEM_SERVICE_ANCHOR, constant);

  if (source.includes(SYSTEM_SERVICE_OLD_NPM_UPDATE)
    || !source.includes(`const ${SYSTEM_SERVICE_DISABLED_COMMAND} =`)) {
    fail(`system service patch did not apply in ${path}`);
  }

  writeSource(path, source);
  return false;
}

// ---------- workspace browsing preservation ----------

function verifyFileTreePreserved(target) {
  const routes = existsSync(target.fileTreeRoutesPath) ? readSource(target.fileTreeRoutesPath) : null;
  const service = existsSync(target.fileTreeServicePath) ? readSource(target.fileTreeServicePath) : null;

  if (routes === null || service === null) {
    fail(`file tree module missing for the ${target.label} tree`);
  }

  if (!routes.includes(FILE_TREE_BROWSE_ROUTE)
    || !routes.includes(FILE_TREE_CREATE_FOLDER_ROUTE)
    || !service.includes(FILE_TREE_WORKSPACE_HELPER)
    || !service.includes(FILE_TREE_EXPANDED_PATH)) {
    fail(`workspace browse and create-folder handling drifted in the ${target.label} tree`);
  }
}

for (const target of targets) {
  verifyFileTreePreserved(target);

  const alreadyPatched = [
    patchCliService(target.cliServicePath),
    patchCliModule(target.cliModulePath),
    patchSandboxService(target.sandboxServicePath),
    patchSystemRoutes(target.systemRoutesPath),
    patchSystemService(target.systemServicePath)
  ].every(Boolean);

  const status = alreadyPatched ? 'already disabled' : 'disabled';
  console.log(`[patch] CloudCLI self-update ${status} (${target.label})`);
}
