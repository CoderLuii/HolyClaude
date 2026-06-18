import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  lstat,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const persistScript = path.join(repoRoot, 'scripts/persist-claude-json.mjs');

const defaultState = '{"hasCompletedOnboarding":true,"installMethod":"native"}';
const sessionA = {
  projects: {
    '/workspace': {
      allowedTools: ['Bash'],
    },
  },
  oauthAccount: {
    emailAddress: 'issue-48-a@example.invalid',
  },
};
const sessionB = {
  projects: {
    '/workspace/app': {
      allowedTools: ['Edit'],
    },
  },
  oauthAccount: {
    emailAddress: 'issue-48-b@example.invalid',
  },
};

async function makeHome() {
  const home = await mkdtemp(path.join(tmpdir(), 'holyclaude-persist-'));
  await mkdir(path.join(home, '.claude'), { recursive: true });
  return {
    home,
    livePath: path.join(home, '.claude.json'),
    persistedPath: path.join(home, '.claude', '.claude.json.persist'),
  };
}

async function runPersist(home, args = []) {
  return execFileAsync(process.execPath, [persistScript, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      CLAUDE_HOME: home,
      PUID: '1000',
      PGID: '1000',
    },
  });
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value));
}

async function backupNames(home) {
  return readdir(path.join(home, '.claude'));
}

async function setFileTime(filePath, epochSeconds) {
  const date = new Date(epochSeconds * 1000);
  await utimes(filePath, date, date);
}

test('prepare restores persisted Claude state over a fresh default live file', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeFile(livePath, defaultState);
  await writeJson(persistedPath, sessionA);

  await runPersist(home);

  assert.deepEqual(await readJson(livePath), sessionA);
  assert.deepEqual(await readJson(persistedPath), sessionA);
});

test('save-live refuses to overwrite a valid persisted session with default state', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeFile(livePath, defaultState);
  await writeJson(persistedPath, sessionA);

  await runPersist(home, ['--save-live']);

  assert.deepEqual(await readJson(persistedPath), sessionA);
});

test('prepare saves valid live state when persisted state is missing', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeJson(livePath, sessionA);

  await runPersist(home);

  assert.deepEqual(await readJson(persistedPath), sessionA);
});

test('prepare moves invalid persisted state aside before saving valid live state', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeJson(livePath, sessionA);
  await writeFile(persistedPath, '{not json');

  await runPersist(home);

  assert.deepEqual(await readJson(persistedPath), sessionA);
  assert.ok(
    (await backupNames(home)).some((name) => name.startsWith('.claude.json.persist.invalid.')),
    'invalid persisted state should be kept as a timestamped backup'
  );
});

test('prepare moves invalid live state aside and creates default live state when no session exists', async () => {
  const { home, livePath } = await makeHome();
  await writeFile(livePath, '{secret_token:"do-not-log"}');

  const { stdout, stderr } = await runPersist(home);

  assert.deepEqual(await readJson(livePath), JSON.parse(defaultState));
  assert.ok(
    (await readdir(home)).some((name) => name.startsWith('.claude.json.invalid.')),
    'invalid live state should be kept as a timestamped backup'
  );
  assert.equal(stdout.includes('do-not-log'), false);
  assert.equal(stderr.includes('do-not-log'), false);
});

test('prepare moves invalid persisted state aside and creates default live state when no session exists', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeFile(persistedPath, '{secret_token:"do-not-log"}');

  const { stdout, stderr } = await runPersist(home);

  assert.deepEqual(await readJson(livePath), JSON.parse(defaultState));
  assert.ok(
    (await backupNames(home)).some((name) => name.startsWith('.claude.json.persist.invalid.')),
    'invalid persisted state should be kept as a timestamped backup'
  );
  assert.equal(stdout.includes('do-not-log'), false);
  assert.equal(stderr.includes('do-not-log'), false);
});

test('prepare keeps the newer valid live state and backs up older persisted conflict', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeJson(livePath, sessionA);
  await writeJson(persistedPath, sessionB);
  await setFileTime(persistedPath, 1000);
  await setFileTime(livePath, 2000);

  await runPersist(home);

  assert.deepEqual(await readJson(livePath), sessionA);
  assert.deepEqual(await readJson(persistedPath), sessionA);
  assert.ok(
    (await backupNames(home)).some((name) => name.startsWith('.claude.json.persist.conflict.')),
    'older persisted state should be kept as a conflict backup'
  );
});

test('prepare restores the newer persisted state and backs up older live conflict', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeJson(livePath, sessionA);
  await writeJson(persistedPath, sessionB);
  await setFileTime(livePath, 1000);
  await setFileTime(persistedPath, 2000);

  await runPersist(home);

  assert.deepEqual(await readJson(livePath), sessionB);
  assert.deepEqual(await readJson(persistedPath), sessionB);
  assert.ok(
    (await readdir(home)).some((name) => name.startsWith('.claude.json.conflict.')),
    'older live state should be kept as a conflict backup'
  );
});

test('save-live backs up conflicting persisted state before promoting newer live state', async () => {
  const { home, livePath, persistedPath } = await makeHome();
  await writeJson(livePath, sessionA);
  await writeJson(persistedPath, sessionB);
  await setFileTime(persistedPath, 1000);
  await setFileTime(livePath, 2000);

  await runPersist(home, ['--save-live']);

  assert.deepEqual(await readJson(persistedPath), sessionA);
  assert.ok(
    (await backupNames(home)).some((name) => name.startsWith('.claude.json.persist.conflict.')),
    'conflicting persisted state should be kept as a backup'
  );
});

test('prepare rejects oversized live state and does not log its contents', async () => {
  const { home, livePath } = await makeHome();
  const oversized = `${'x'.repeat(1024 * 1024 + 1)}secret-token`;
  await writeFile(livePath, oversized);

  const { stdout, stderr } = await runPersist(home);

  assert.deepEqual(await readJson(livePath), JSON.parse(defaultState));
  assert.equal(stdout.includes('secret-token'), false);
  assert.equal(stderr.includes('secret-token'), false);
});

test('prepare rejects symlinked persisted state without following it', async (t) => {
  const { home, livePath, persistedPath } = await makeHome();
  const targetPath = path.join(home, 'external-session.json');
  await writeJson(targetPath, sessionB);
  await writeJson(livePath, sessionA);

  try {
    await symlink(targetPath, persistedPath);
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'ENOTSUP') {
      t.skip('symlink creation requires elevated Windows privileges on this host');
      return;
    }
    throw error;
  }

  await runPersist(home);

  assert.deepEqual(await readJson(persistedPath), sessionA);
  assert.deepEqual(await readJson(targetPath), sessionB);
  assert.equal((await lstat(persistedPath)).isSymbolicLink(), false);
});
