import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const cliTarget = process.argv[2];
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI Codex permission mode anchors not found';
const PATCH_MARKER = 'const HOLYCLAUDE_CODEX_CHAT_PERMISSION_PATCH = true;';
const ENV_NAME = 'HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE';
const ENV_CONSTANT = 'HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE_ENV';
const MAP_ANCHOR = 'function mapPermissionModeToCodexOptions(permissionMode)';
const QUERY_ANCHOR = 'export async function queryCodex(command, options = {}, ws, context)';
const WORKING_DIRECTORY_PATTERN = /^(\s*)const workingDirectory = cwd \|\| projectPath \|\| process\.cwd\(\);/m;
const MAP_CALL_PATTERN = /const \{ sandboxMode, approvalPolicy \} = mapPermissionModeToCodexOptions\(permissionMode\);/;

const helperCode = `
const HOLYCLAUDE_CODEX_CHAT_PERMISSION_PATCH = true;
const HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE_ENV = 'HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE';
const HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODES = new Set(['default', 'acceptEdits', 'bypassPermissions']);

function getConfiguredCodexChatPermissionMode() {
  const configuredPermissionMode = process.env[HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE_ENV];
  if (configuredPermissionMode == null || String(configuredPermissionMode).trim() === '') {
    return 'acceptEdits';
  }

  const normalizedPermissionMode = String(configuredPermissionMode).trim();
  if (HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODES.has(normalizedPermissionMode)) {
    return normalizedPermissionMode;
  }

  console.warn(\`[Codex] Invalid \${HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODE_ENV}; falling back to default\`);
  return 'default';
}

function resolveCodexChatPermissionMode(permissionMode, hasExplicitPermissionMode) {
  if (!hasExplicitPermissionMode) {
    return getConfiguredCodexChatPermissionMode();
  }

  const normalizedPermissionMode = String(permissionMode).trim();
  if (HOLYCLAUDE_CODEX_CHAT_PERMISSION_MODES.has(normalizedPermissionMode)) {
    return normalizedPermissionMode;
  }

  console.warn('[Codex] Invalid request permission mode; falling back to default');
  return 'default';
}
`;

function resolveTargets() {
  if (cliTarget && existsSync(cliTarget) && statSync(cliTarget).isFile()) {
    return [{ label: 'target', path: cliTarget }];
  }

  const root = cliTarget || DEFAULT_CLOUDCLI_ROOT;
  return [
    { label: 'source', path: `${root}/server/modules/providers/list/codex/codex-runtime.provider.js` },
    { label: 'runtime', path: `${root}/dist-server/server/modules/providers/list/codex/codex-runtime.provider.js` }
  ].filter((target) => existsSync(target.path));
}

function hasFullHolyClaudeRuntimeContract(source) {
  const envAccessPatterns = [
    `process.env.${ENV_NAME}`,
    `process.env['${ENV_NAME}']`,
    `process.env["${ENV_NAME}"]`,
    `process.env[${ENV_CONSTANT}]`
  ];
  const explicitRequestPatterns = [
    "hasOwnProperty.call(options, 'permissionMode')",
    'hasOwnProperty.call(options, "permissionMode")',
    "Object.hasOwn(options, 'permissionMode')",
    'Object.hasOwn(options, "permissionMode")'
  ];
  const hasEnvFallback = envAccessPatterns.some((pattern) => source.includes(pattern));
  const hasExplicitRequestCheck = explicitRequestPatterns.some((pattern) => source.includes(pattern));
  const hasAllowedModes = ["'default'", "'acceptEdits'", "'bypassPermissions'"].every((mode) => source.includes(mode));
  const hasSafeDefaultBehavior = /return\s+['"]acceptEdits['"]/.test(source)
    && /falling back to default/.test(source)
    && /return\s+['"]default['"]/.test(source);
  const hasCodexMappings = source.includes("sandboxMode: 'workspace-write'")
    && source.includes("sandboxMode: 'danger-full-access'")
    && source.includes("approvalPolicy: 'never'")
    && source.includes("approvalPolicy: 'untrusted'");
  const hasResolvedMapCall = !MAP_CALL_PATTERN.test(source)
    && /mapPermissionModeToCodexOptions\(\s*(?:effective|resolved)\w*PermissionMode\s*\)/.test(source);

  return hasEnvFallback
    && hasExplicitRequestCheck
    && hasAllowedModes
    && hasSafeDefaultBehavior
    && hasCodexMappings
    && hasResolvedMapCall;
}

function findFunctionEnd(source, functionAnchor) {
  const functionIndex = source.indexOf(functionAnchor);
  if (functionIndex === -1) {
    return -1;
  }

  const bodyStartIndex = source.indexOf('{', functionIndex);
  if (bodyStartIndex === -1) {
    return -1;
  }

  let braceDepth = 0;
  for (let sourceIndex = bodyStartIndex; sourceIndex < source.length; sourceIndex += 1) {
    const character = source[sourceIndex];
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

function patchTarget(target) {
  let source = readFileSync(target.path, 'utf8');

  if (hasFullHolyClaudeRuntimeContract(source)) {
    console.log(`[patch] CloudCLI Codex permission mode already applied (${target.label})`);
    return;
  }

  const mapFunctionEndIndex = findFunctionEnd(source, MAP_ANCHOR);
  const requiredAnchorsPresent = source.includes(MAP_ANCHOR)
    && source.includes(QUERY_ANCHOR)
    && /permissionMode\s*=\s*'default'/.test(source)
    && WORKING_DIRECTORY_PATTERN.test(source)
    && MAP_CALL_PATTERN.test(source)
    && mapFunctionEndIndex !== -1;

  if (!requiredAnchorsPresent) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  if (!source.includes(PATCH_MARKER)) {
    source = `${source.slice(0, mapFunctionEndIndex)}${helperCode}${source.slice(mapFunctionEndIndex)}`;
  }

  source = source.replace(/permissionMode\s*=\s*'default'/, 'permissionMode');
  source = source.replace(WORKING_DIRECTORY_PATTERN, (_, indent) => [
    `${indent}const hasExplicitPermissionMode = Object.prototype.hasOwnProperty.call(options, 'permissionMode');`,
    `${indent}const effectivePermissionMode = resolveCodexChatPermissionMode(permissionMode, hasExplicitPermissionMode);`,
    `${indent}const workingDirectory = cwd || projectPath || process.cwd();`
  ].join('\n'));
  source = source.replace(
    MAP_CALL_PATTERN,
    'const { sandboxMode, approvalPolicy } = mapPermissionModeToCodexOptions(effectivePermissionMode);'
  );

  if (!hasFullHolyClaudeRuntimeContract(source)) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  writeFileSync(target.path, source);
  console.log(`[patch] CloudCLI Codex permission mode applied (${target.label})`);
}

const targets = resolveTargets();
if (targets.length === 0) {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

for (const target of targets) {
  patchTarget(target);
}
