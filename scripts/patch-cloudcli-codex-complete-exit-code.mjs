import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const cliTarget = process.argv[2];
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI Codex complete exitCode anchors not found';
const UPSTREAM_SUCCESS_EXIT_CODE = 'exitCode: terminalFailure ? 1 : 0';
const UPSTREAM_ERROR_EXIT_CODE = 'exitCode: 1';

const providerCompleteWithFieldsPattern = /raw\.type === ['"]turn_complete['"][\s\S]*?kind:\s*['"]complete['"],\s*\r?\n\s*exitCode:\s*0,\s*\r?\n\s*success:\s*true,\s*\r?\n\s*aborted:\s*false,/m;
const providerCompleteWithoutFieldsPattern = /(\s*if\s*\(raw\.type === ['"]turn_complete['"]\)\s*\{\s*\r?\n\s*return\s*\[createNormalizedMessage\(\{\s*\r?\n\s*id:\s*baseId,\s*\r?\n\s*sessionId,\s*\r?\n\s*timestamp:\s*ts,\s*\r?\n\s*provider:\s*PROVIDER,\s*\r?\n\s*kind:\s*['"]complete['"],\s*\r?\n)(\s*\}\)\];)/m;

function verifyCodexRuntimeTargets(root) {
  const targets = [
    { label: 'source codex runtime', path: `${root}/server/modules/providers/list/codex/codex-runtime.provider.js` },
    { label: 'runtime codex runtime', path: `${root}/dist-server/server/modules/providers/list/codex/codex-runtime.provider.js` }
  ];

  for (const target of targets) {
    if (!existsSync(target.path)) {
      console.error(`${ERROR_MESSAGE}: missing ${target.path}`);
      process.exit(1);
    }

    const source = readFileSync(target.path, 'utf8');
    if (!source.includes(UPSTREAM_SUCCESS_EXIT_CODE) || !source.includes(UPSTREAM_ERROR_EXIT_CODE)) {
      console.error(`${ERROR_MESSAGE}: missing upstream final exitCode in ${target.label}`);
      process.exit(1);
    }
  }
}

function resolveTargets() {
  if (cliTarget && existsSync(cliTarget) && statSync(cliTarget).isFile()) {
    return [{ label: 'target', path: cliTarget }];
  }

  const root = cliTarget || DEFAULT_CLOUDCLI_ROOT;
  verifyCodexRuntimeTargets(root);
  const targets = [
    { label: 'source provider', path: `${root}/server/modules/providers/list/codex/codex-sessions.provider.ts` },
    { label: 'runtime provider', path: `${root}/dist-server/server/modules/providers/list/codex/codex-sessions.provider.js` }
  ];
  const missingTargets = targets.filter((target) => !existsSync(target.path));

  if (missingTargets.length > 0) {
    console.error(`${ERROR_MESSAGE}: missing ${missingTargets.map((target) => target.path).join(', ')}`);
    process.exit(1);
  }

  return targets;
}

function patchTarget(target) {
  let source = readFileSync(target.path, 'utf8');

  if (providerCompleteWithFieldsPattern.test(source)) {
    console.log(`[patch] CloudCLI Codex provider complete fields already present (${target.label})`);
    return;
  }

  if (!providerCompleteWithoutFieldsPattern.test(source)) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  source = source.replace(
    providerCompleteWithoutFieldsPattern,
    (_, prefix, suffix) => `${prefix}        exitCode: 0,\n        success: true,\n        aborted: false,\n${suffix}`
  );

  if (!providerCompleteWithFieldsPattern.test(source)) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  writeFileSync(target.path, source);
  console.log(`[patch] CloudCLI Codex provider complete fields applied (${target.label})`);
}

const targets = resolveTargets();
if (targets.length === 0) {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

for (const target of targets) {
  patchTarget(target);
}
