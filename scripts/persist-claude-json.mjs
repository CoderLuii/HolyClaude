#!/usr/bin/env node
import { constants as fsConstants } from 'node:fs';
import {
  chmod,
  chown,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
} from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_STATE = '{"hasCompletedOnboarding":true,"installMethod":"native"}';
const MAX_STATE_BYTES = 1024 * 1024;
const ONBOARDING_ONLY_KEYS = new Set([
  'hasCompletedOnboarding',
  'installMethod',
  'autoUpdates',
  'firstStartTime',
  'lastStartTime',
  'numStartups',
  'tipsHistory',
]);

const args = new Set(process.argv.slice(2));
const mode = args.has('--save-live') ? 'save-live' : 'prepare';
const quiet = args.has('--quiet');
const claudeHome = process.env.CLAUDE_HOME || '/home/claude';
const livePath = path.join(claudeHome, '.claude.json');
const claudeDir = path.join(claudeHome, '.claude');
const persistedPath = path.join(claudeDir, '.claude.json.persist');
const owner = readOwner();

function log(message) {
  if (!quiet) {
    console.log(`[persist-claude-json] ${message}`);
  }
}

function warn(message) {
  if (!quiet) {
    console.warn(`[persist-claude-json] WARNING: ${message}`);
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function readOwner() {
  const uid = parseNumericId(process.env.PUID);
  const gid = parseNumericId(process.env.PGID);
  return { uid, gid };
}

function parseNumericId(value) {
  if (!/^[0-9]+$/.test(value || '')) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 2147483647) {
    return null;
  }

  return parsed;
}

async function analyzeState(filePath) {
  let fileStat;
  try {
    fileStat = await lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, path: filePath, reason: 'missing' };
    }
    return { exists: true, path: filePath, reason: 'stat_failed' };
  }

  if (fileStat.isSymbolicLink()) {
    return { exists: true, path: filePath, reason: 'symlink' };
  }

  if (!fileStat.isFile()) {
    return { exists: true, path: filePath, reason: 'not_regular' };
  }

  if (fileStat.size === 0) {
    return { exists: true, path: filePath, reason: 'empty', stat: fileStat };
  }

  if (fileStat.size > MAX_STATE_BYTES) {
    return { exists: true, path: filePath, reason: 'oversized', stat: fileStat };
  }

  let source;
  try {
    source = await readFile(filePath, 'utf8');
  } catch {
    return { exists: true, path: filePath, reason: 'read_failed', stat: fileStat };
  }

  let data;
  try {
    data = JSON.parse(source);
  } catch {
    return { exists: true, path: filePath, reason: 'invalid_json', stat: fileStat };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { exists: true, path: filePath, reason: 'not_object', stat: fileStat };
  }

  const defaultLike = isDefaultLike(data);
  return {
    exists: true,
    path: filePath,
    reason: defaultLike ? 'default_like' : 'authoritative',
    stat: fileStat,
    data,
    source,
    normalized: JSON.stringify(data),
    authoritative: !defaultLike,
  };
}

function isDefaultLike(data) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return true;
  }

  if (data.hasCompletedOnboarding !== true || typeof data.installMethod !== 'string') {
    return false;
  }

  return keys.every((key) => ONBOARDING_ONLY_KEYS.has(key));
}

async function ensureClaudeDir() {
  await mkdir(claudeDir, { recursive: true });
  await repairOwnership(claudeDir);
}

async function backupExisting(filePath, suffix) {
  let fileStat;
  try {
    fileStat = await lstat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  const backupBase = `${filePath}.${suffix}.${timestamp()}`;
  let backupPath = backupBase;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await lstat(backupPath);
      backupPath = `${backupBase}.${attempt}`;
    } catch (error) {
      if (error.code === 'ENOENT') {
        break;
      }
      throw error;
    }
  }

  await rename(filePath, backupPath);
  if (fileStat.isFile() && !fileStat.isSymbolicLink()) {
    await chmodBestEffort(backupPath, 0o600);
    await repairOwnership(backupPath);
  }
  return backupPath;
}

async function writeAtomic(filePath, source) {
  await mkdir(path.dirname(filePath), { recursive: true });

  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  const previousUmask = process.umask(0o077);
  let handle;
  try {
    handle = await open(tmpPath, fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY, 0o600);
    await handle.writeFile(source);
    await handle.sync();
    await handle.close();
    handle = null;
    await chmodBestEffort(tmpPath, 0o600);
    await repairOwnership(tmpPath);
    await rename(tmpPath, filePath);
    await chmodBestEffort(filePath, 0o600);
    await repairOwnership(filePath);
  } finally {
    process.umask(previousUmask);
    if (handle) {
      await handle.close().catch(() => {});
    }
    await lstat(tmpPath)
      .then(() => unlink(tmpPath).catch(() => {}))
      .catch(() => {});
  }
}

async function chmodBestEffort(filePath, modeBits) {
  try {
    await chmod(filePath, modeBits);
  } catch {
    warn(`could not chmod ${path.basename(filePath)}; check host mount permissions`);
  }
}

async function repairOwnership(filePath) {
  if (owner.uid === null || owner.gid === null || typeof process.getuid !== 'function' || process.getuid() !== 0) {
    return;
  }

  try {
    await chown(filePath, owner.uid, owner.gid);
  } catch {
    warn(`could not chown ${path.basename(filePath)}; check host mount permissions or PUID/PGID`);
  }
}

async function sameState(left, right) {
  return left.authoritative && right.authoritative && left.normalized === right.normalized;
}

async function promote(sourceState, targetPath, label) {
  await writeAtomic(targetPath, sourceState.source);
  log(`${label} updated`);
}

async function prepare() {
  await ensureClaudeDir();

  let live = await analyzeState(livePath);
  let persisted = await analyzeState(persistedPath);

  if (persisted.exists && !persisted.authoritative && persisted.reason !== 'default_like') {
    const backupPath = await backupExisting(persistedPath, 'invalid');
    if (backupPath) {
      log(`moved invalid persisted state to ${path.basename(backupPath)}`);
      persisted = await analyzeState(persistedPath);
    }
  }

  if (live.exists && !live.authoritative && live.reason !== 'default_like') {
    const backupPath = await backupExisting(livePath, 'invalid');
    if (backupPath) {
      log(`moved invalid live state to ${path.basename(backupPath)}`);
      live = await analyzeState(livePath);
    }
  }

  if (persisted.authoritative && !live.authoritative) {
    await promote(persisted, livePath, 'live Claude state restored from persisted state');
    return;
  }

  if (live.authoritative && !persisted.authoritative) {
    await promote(live, persistedPath, 'persisted Claude state saved from live state');
    return;
  }

  if (live.authoritative && persisted.authoritative) {
    if (await sameState(live, persisted)) {
      await repairOwnership(livePath);
      await repairOwnership(persistedPath);
      return;
    }

    if (live.stat.mtimeMs > persisted.stat.mtimeMs) {
      const backupPath = await backupExisting(persistedPath, 'conflict');
      if (backupPath) {
        log(`preserved older persisted state as ${path.basename(backupPath)}`);
      }
      await promote(live, persistedPath, 'persisted Claude state saved from newer live state');
      return;
    }

    const backupPath = await backupExisting(livePath, 'conflict');
    if (backupPath) {
      log(`preserved older live state as ${path.basename(backupPath)}`);
    }
    await promote(persisted, livePath, 'live Claude state restored from newer persisted state');
    return;
  }

  if (!live.exists) {
    await writeAtomic(livePath, DEFAULT_STATE);
    log('created default live Claude state');
    return;
  }

  if (live.reason === 'default_like') {
    await repairOwnership(livePath);
    return;
  }

  await writeAtomic(livePath, DEFAULT_STATE);
  log('created default live Claude state after rejecting invalid state');
}

async function saveLive() {
  await ensureClaudeDir();

  const live = await analyzeState(livePath);
  let persisted = await analyzeState(persistedPath);

  if (!live.authoritative) {
    return;
  }

  if (persisted.exists && !persisted.authoritative && persisted.reason !== 'default_like') {
    const backupPath = await backupExisting(persistedPath, 'invalid');
    if (backupPath) {
      log(`moved invalid persisted state to ${path.basename(backupPath)}`);
      persisted = await analyzeState(persistedPath);
    }
  }

  if (persisted.authoritative) {
    if (await sameState(live, persisted)) {
      await repairOwnership(persistedPath);
      return;
    }

    if (persisted.stat.mtimeMs > live.stat.mtimeMs) {
      return;
    }

    const backupPath = await backupExisting(persistedPath, 'conflict');
    if (backupPath) {
      log(`preserved older persisted state as ${path.basename(backupPath)}`);
    }
  }

  await promote(live, persistedPath, 'persisted Claude state saved from live state');
}

try {
  if (mode === 'save-live') {
    await saveLive();
  } else {
    await prepare();
  }
} catch (error) {
  const message = error && typeof error.message === 'string' ? error.message : String(error);
  console.error(`[persist-claude-json] ERROR: ${message}`);
  process.exitCode = 1;
}
