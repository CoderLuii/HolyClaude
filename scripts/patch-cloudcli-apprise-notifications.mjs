import { existsSync, readFileSync, statSync, writeFileSync } from 'fs';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const cliTarget = process.argv[2];
const ERROR_MESSAGE = '[patch] ERROR: CloudCLI notification orchestrator anchors not found';
const SPAWN_IMPORT = "import { spawn } from 'child_process';";
const STOP_ANCHOR = 'function notifyRunStopped({ userId, provider, sessionId = null, stopReason = \'completed\', sessionName = null })';
const FAILED_ANCHOR = 'function notifyRunFailed({ userId, provider, sessionId = null, error, sessionName = null })';
const HELPER_MARKER = "const APPRISE_PROVIDER_ALLOWLIST = new Set(['codex']);";
const HELPER_NAME = 'sendAppriseLifecycleNotification';
const SANITIZE_MARKER = "replace(/\\x00/g, '').replace(/\\s+/g, ' ')";

const databaseImportAnchors = [
  "import { notificationPreferencesDb, pushSubscriptionsDb, sessionsDb } from '@/modules/database/index.js';",
  "import { notificationPreferencesDb, pushSubscriptionsDb, sessionsDb } from '../../../modules/database/index.js';"
];

const helperCode = `
const APPRISE_PROVIDER_ALLOWLIST = new Set(['codex']);

function sanitizeAppriseArg(value, maxLength) {
  if (value == null) {
    return null;
  }

  const sanitized = String(value).replace(/\\x00/g, '').replace(/\\s+/g, ' ').trim();
  if (!sanitized) {
    return null;
  }

  return sanitized.length > maxLength ? sanitized.slice(0, maxLength) : sanitized;
}

function sendAppriseLifecycleNotification({ provider, kind, sessionId = null, sessionName = null, stopReason = null, error = null }) {
  if (!APPRISE_PROVIDER_ALLOWLIST.has(provider)) {
    return;
  }

  const args = [kind, '--provider', provider];
  const cleanSessionId = sanitizeAppriseArg(sessionId, 80);
  const cleanSessionName = sanitizeAppriseArg(sessionName, 80);
  const cleanStopReason = sanitizeAppriseArg(stopReason, 120);
  const cleanError = sanitizeAppriseArg(error, 180);

  if (cleanSessionId) {
    args.push('--session-id', cleanSessionId);
  }
  if (cleanSessionName) {
    args.push('--session-name', cleanSessionName);
  }
  if (cleanStopReason) {
    args.push('--reason', cleanStopReason);
  }
  if (cleanError) {
    args.push('--error', cleanError);
  }

  try {
    const child = spawn('/usr/local/bin/notify.py', args, {
      shell: false,
      detached: true,
      stdio: 'ignore',
      env: process.env
    });
    child.on('error', () => {});
    if (typeof child.unref === 'function') child.unref();
  } catch {
  }
}
`;

const stopCall = `  sendAppriseLifecycleNotification({
    provider,
    kind: 'stop',
    sessionId,
    sessionName,
    stopReason
  });

`;

const failedCall = `  const errorMessage = normalizeErrorMessage(error);

  sendAppriseLifecycleNotification({
    provider,
    kind: 'error',
    sessionId,
    sessionName,
    error: errorMessage
  });`;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveTargets() {
  if (cliTarget && existsSync(cliTarget) && statSync(cliTarget).isFile()) {
    return [{ label: 'target', path: cliTarget }];
  }

  const root = cliTarget || DEFAULT_CLOUDCLI_ROOT;
  return [
    { label: 'source', path: `${root}/server/modules/notifications/services/notification-orchestrator.service.js` },
    { label: 'runtime', path: `${root}/dist-server/server/modules/notifications/services/notification-orchestrator.service.js` }
  ].filter((target) => existsSync(target.path));
}

function findDatabaseImportAnchor(source) {
  return databaseImportAnchors.find((anchor) => source.includes(anchor)) || null;
}

function patchTarget(target) {
  let source = readFileSync(target.path, 'utf8');
  const importAnchor = findDatabaseImportAnchor(source);

  const requiredAnchorsPresent = importAnchor
    && source.includes(STOP_ANCHOR)
    && source.includes(FAILED_ANCHOR);
  if (!requiredAnchorsPresent) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  const alreadyApplied = source.includes(SPAWN_IMPORT)
    && source.includes(HELPER_MARKER)
    && source.includes(`function ${HELPER_NAME}(`)
    && source.includes(SANITIZE_MARKER)
    && source.includes("child.on('error', () => {})")
    && source.includes('typeof child.unref')
    && source.includes("kind: 'stop'")
    && source.includes("kind: 'error'");

  if (alreadyApplied) {
    console.log(`[patch] CloudCLI Apprise lifecycle notifications already applied (${target.label})`);
    return;
  }

  if (!source.includes(SPAWN_IMPORT)) {
    source = source.replace(importAnchor, `${SPAWN_IMPORT}\n${importAnchor}`);
  }

  if (!source.includes(HELPER_MARKER)) {
    source = source.replace(`${STOP_ANCHOR} {`, `${helperCode}\n${STOP_ANCHOR} {`);
  }

  if (!source.includes("kind: 'stop'")) {
    source = source.replace(`${STOP_ANCHOR} {\n`, `${STOP_ANCHOR} {\n${stopCall}`);
  }

  if (!source.includes("kind: 'error'")) {
    const failedPattern = new RegExp(`${escapeRegex(FAILED_ANCHOR)} \\{\\n\\s*const errorMessage = normalizeErrorMessage\\(error\\);`);
    if (!failedPattern.test(source)) {
      console.error(ERROR_MESSAGE);
      process.exit(1);
    }
    source = source.replace(failedPattern, `${FAILED_ANCHOR} {\n${failedCall}`);
  }

  const finalApplied = source.includes(SPAWN_IMPORT)
    && source.includes(HELPER_MARKER)
    && source.includes(`function ${HELPER_NAME}(`)
    && source.includes(SANITIZE_MARKER)
    && source.includes("child.on('error', () => {})")
    && source.includes('typeof child.unref')
    && source.includes("kind: 'stop'")
    && source.includes("kind: 'error'");

  if (!finalApplied) {
    console.error(ERROR_MESSAGE);
    process.exit(1);
  }

  writeFileSync(target.path, source);
  console.log(`[patch] CloudCLI Apprise lifecycle notifications applied (${target.label})`);
}

const targets = resolveTargets();
if (targets.length === 0) {
  console.error(ERROR_MESSAGE);
  process.exit(1);
}

for (const target of targets) {
  patchTarget(target);
}
