import { existsSync, readFileSync, writeFileSync } from 'fs';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const CLOUDCLI_ROOT = process.argv[2] || DEFAULT_CLOUDCLI_ROOT;
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI self-update anchors not found';
const CLI_MARKER = 'const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;';
const INDEX_MARKER = 'const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {';
const CLI_CHECK_ANCHOR = 'async function checkForUpdates(silent = false)';
const CLI_UPDATE_ANCHOR = 'async function updatePackage()';
const CLI_OLD_PROMPT = "Run ${c.bright('cloudcli update')} to update";
const CLI_OLD_NPM_UPDATE = "execSync('npm update -g @cloudcli-ai/cloudcli', { stdio: 'inherit' });";
const CLI_OLD_GLOBAL_INSTALL_HINT = "console.log(`\\n${c.dim('  Or install globally:')} npm install -g @cloudcli-ai/cloudcli\\n`);";
const CLI_DOCKER_UPDATE_HINT = "console.log(`\\n${c.dim('  HolyClaude updates:')} ${HOLYCLAUDE_DOCKER_UPDATE_COMMAND}\\n`);";
const INDEX_ROUTE_COMMENT = '// System update endpoint';
const INDEX_ROUTE_ANCHOR = "app.post('/api/system/update', authenticateToken, async (req, res) => {";
const INDEX_BROWSE_ROUTE = "app.get('/api/browse-filesystem'";
const INDEX_CREATE_FOLDER_ROUTE = "app.post('/api/create-folder'";
const INDEX_WORKSPACE_HELPER = 'const expandWorkspacePath';
const INDEX_OLD_NPM_UPDATE = "npm install -g @cloudcli-ai/cloudcli@latest";

const targets = [
  {
    label: 'source',
    servicePath: `${CLOUDCLI_ROOT}/server/modules/system/system.service.ts`
  },
  {
    label: 'runtime',
    servicePath: `${CLOUDCLI_ROOT}/dist-server/server/modules/system/system.service.js`
  }
].filter((target) => existsSync(target.servicePath));

if (targets.length === 0) {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

function readSource(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }
}

function writeSource(path, source) {
  try {
    writeFileSync(path, source);
  } catch {
    console.error(ERROR_MESSAGE);
    process.exit(1);
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
      } else if (character === quote) {
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
    } else if (character === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        return sourceIndex + 1;
      }
    }
  }

  return -1;
}

function findFunctionEnd(source, functionAnchor) {
  const functionIndex = source.indexOf(functionAnchor);
  if (functionIndex === -1) {
    return -1;
  }

  return findBlockEnd(source, source.indexOf('{', functionIndex));
}

function findRouteSpan(source, routeAnchor) {
  const routeIndex = source.indexOf(routeAnchor);
  if (routeIndex === -1 || countOccurrences(source, routeAnchor) !== 1) {
    return null;
  }

  const bodyEndIndex = findBlockEnd(source, source.indexOf('{', routeIndex));
  if (bodyEndIndex === -1) {
    return null;
  }

  const terminatorMatch = source.slice(bodyEndIndex).match(/^\s*\);/);
  if (!terminatorMatch) {
    return null;
  }

  const routeEndIndex = bodyEndIndex + terminatorMatch[0].length;
  const routeCommentIndex = source.lastIndexOf(INDEX_ROUTE_COMMENT, routeIndex);
  const commentMatchesRoute = routeCommentIndex !== -1
    && source.slice(routeCommentIndex + INDEX_ROUTE_COMMENT.length, routeIndex).trim() === '';
  const startIndex = commentMatchesRoute ? routeCommentIndex : routeIndex;

  return {
    startIndex,
    routeIndex,
    routeEndIndex,
    originalRoute: source.slice(routeIndex, routeEndIndex)
  };
}

function patchCli(path) {
  let source = readSource(path);
  const alreadyPatched = source.includes(CLI_MARKER);

  if (!alreadyPatched) {
    const checkIndex = source.indexOf(CLI_CHECK_ANCHOR);
    const updateIndex = source.indexOf(CLI_UPDATE_ANCHOR);
    const updateEndIndex = findFunctionEnd(source, CLI_UPDATE_ANCHOR);
    const checkCommentIndex = source.lastIndexOf('// Check for updates', checkIndex);

    const requiredAnchorsPresent = checkIndex !== -1
      && updateIndex !== -1
      && updateEndIndex !== -1
      && checkCommentIndex !== -1
      && source.includes(CLI_OLD_PROMPT)
      && source.includes(CLI_OLD_NPM_UPDATE);

    if (!requiredAnchorsPresent || checkCommentIndex > checkIndex || checkIndex > updateIndex) {
      console.error(ERROR_MESSAGE);
      process.exit(1);
    }

    const replacement = [
      '// HolyClaude ships patched CloudCLI files. npm self-updates can replace them.',
      'const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;',
      "const HOLYCLAUDE_DOCKER_UPDATE_COMMAND = 'docker compose pull && docker compose up -d';",
      '',
      'async function checkForUpdates(silent = false) {',
      '    if (!silent) {',
      "        console.log(`${c.warn('[UPDATE]')} CloudCLI self-update is disabled in HolyClaude.`);",
      '        console.log(`         Use ${c.bright(HOLYCLAUDE_DOCKER_UPDATE_COMMAND)} to update the image.\\n`);',
      '    }',
      '    return { hasUpdate: false, currentVersion: packageJson.version, disabled: true };',
      '}',
      '',
      'async function updatePackage() {',
      "    console.log(`${c.warn('[UPDATE]')} CloudCLI self-update is disabled in HolyClaude.`);",
      '    console.log(`         Use ${c.bright(HOLYCLAUDE_DOCKER_UPDATE_COMMAND)} to update the image.`);',
      "    console.log('         If this container already ran an npm update, recreate it from the HolyClaude image.');",
      '}'
    ].join('\n');

    source = `${source.slice(0, checkCommentIndex)}${replacement}${source.slice(updateEndIndex)}`;
  }

  if (source.includes(CLI_OLD_GLOBAL_INSTALL_HINT)) {
    source = source.replace(CLI_OLD_GLOBAL_INSTALL_HINT, CLI_DOCKER_UPDATE_HINT);
  }

  if (
    !source.includes(CLI_MARKER)
    || source.includes(CLI_OLD_NPM_UPDATE)
    || source.includes(CLI_OLD_PROMPT)
    || source.includes(CLI_OLD_GLOBAL_INSTALL_HINT)
  ) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  writeSource(path, source);
  return alreadyPatched;
}

function patchIndex(path) {
  let source = readSource(path);
  const alreadyPatched = source.includes(INDEX_MARKER);
  const hadWorkspaceHelper = source.includes(INDEX_WORKSPACE_HELPER);
  const hadBrowseRoute = source.includes(INDEX_BROWSE_ROUTE);
  const hadCreateFolderRoute = source.includes(INDEX_CREATE_FOLDER_ROUTE);

  if (!alreadyPatched) {
    const routeSpan = findRouteSpan(source, INDEX_ROUTE_ANCHOR);
    const helperIndex = source.indexOf(INDEX_WORKSPACE_HELPER);
    const browseRouteIndex = source.indexOf(INDEX_BROWSE_ROUTE);

    const requiredAnchorsPresent = routeSpan
      && routeSpan.originalRoute.includes(INDEX_OLD_NPM_UPDATE)
      && (helperIndex === -1 || routeSpan.routeEndIndex <= helperIndex)
      && (browseRouteIndex === -1 || routeSpan.routeEndIndex <= browseRouteIndex);

    if (!requiredAnchorsPresent) {
      console.error(ERROR_MESSAGE);
      process.exit(1);
    }

    const replacement = `// System update endpoint
const HOLYCLAUDE_UPDATE_DISABLED_RESPONSE = {
    success: false,
    error: 'CloudCLI self-update is disabled in HolyClaude',
    message: 'Update HolyClaude with docker compose pull && docker compose up -d. This image includes patched CloudCLI files; npm self-updates can replace them.'
};

app.post('/api/system/update', authenticateToken, async (req, res) => {
    res.status(409).json(HOLYCLAUDE_UPDATE_DISABLED_RESPONSE);
});
`;

    source = `${source.slice(0, routeSpan.startIndex)}${replacement}${source.slice(routeSpan.routeEndIndex)}`;
  }

  if (
    !source.includes(INDEX_MARKER)
    || source.includes(INDEX_OLD_NPM_UPDATE)
    || (hadWorkspaceHelper && !source.includes(INDEX_WORKSPACE_HELPER))
    || (hadBrowseRoute && !source.includes(INDEX_BROWSE_ROUTE))
    || (hadCreateFolderRoute && !source.includes(INDEX_CREATE_FOLDER_ROUTE))
    || (hadBrowseRoute && !source.includes('let targetPath = dirPath ? expandWorkspacePath(dirPath) : defaultRoot;'))
    || (hadCreateFolderRoute && !source.includes('const expandedPath = expandWorkspacePath(folderPath);'))
  ) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  writeSource(path, source);
  return alreadyPatched;
}

function patchSystemService(path) {
  let source = readSource(path);
  const marker = 'HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED';
  if (source.includes(marker)) {
    return true;
  }

  const functionAnchor = 'async updateSystem()';
  const functionIndex = source.indexOf(functionAnchor);
  const functionEndIndex = findFunctionEnd(source, functionAnchor);
  if (functionIndex === -1 || functionEndIndex === -1 || !source.includes(INDEX_OLD_NPM_UPDATE)) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  const replacement = `async updateSystem() {
            const HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED = true;
            return {
                success: false,
                disabled: HOLYCLAUDE_CLOUDCLI_SELF_UPDATE_DISABLED,
                error: 'CloudCLI self-update is disabled in HolyClaude',
                message: 'Update HolyClaude with docker compose pull && docker compose up -d.',
            };
        }`;
  source = `${source.slice(0, functionIndex)}${replacement}${source.slice(functionEndIndex)}`;
  if (!source.includes(marker) || source.includes(INDEX_OLD_NPM_UPDATE)) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }
  writeSource(path, source);
  return false;
}

for (const target of targets) {
  const alreadyPatched = patchSystemService(target.servicePath);
  const status = alreadyPatched ? 'already disabled' : 'disabled';
  console.log(`[patch] CloudCLI self-update ${status} (${target.label})`);
}
