#!/usr/bin/env node

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const baseUrl = new URL(process.env.CLOUDCLI_BASE_URL ?? 'http://127.0.0.1:3001/');
const cloudcliRoot = process.env.CLOUDCLI_ROOT ?? '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const databasePath = process.env.CLOUDCLI_DATABASE_PATH ?? '/home/claude/.cloudcli/auth.db';
const globalNodeModules = process.env.GLOBAL_NODE_MODULES ?? '/usr/local/lib/node_modules';
const chromePath = process.env.CHROME_PATH ?? '/usr/bin/chromium';
const requestTimeoutMs = Number(process.env.CLOUDCLI_RUNTIME_REQUEST_TIMEOUT_MS ?? 15_000);
const pluginReadinessTimeoutMs = 30_000;

const cloudcliRequire = createRequire(path.join(cloudcliRoot, 'package.json'));
const globalRequire = createRequire(path.join(globalNodeModules, '_holyclaude_runtime_probe.cjs'));

function usage() {
  console.log(`Usage: node tests/cloudcli_auth_session_runtime.mjs

Runs inside a disposable HolyClaude container against a fresh,
already-running CloudCLI 1.37.3 instance.

Environment:
  CLOUDCLI_BASE_URL              HTTP origin (default http://127.0.0.1:3001/)
  CLOUDCLI_ROOT                  installed CloudCLI package root
  CLOUDCLI_DATABASE_PATH         fresh disposable SQLite database
  GLOBAL_NODE_MODULES            global package root containing Playwright
  CHROME_PATH                    Chromium executable
  CLOUDCLI_RUNTIME_REQUEST_TIMEOUT_MS
`);
}

if (process.argv.includes('--help')) {
  usage();
  process.exit(0);
}
if (process.argv.length !== 2) {
  usage();
  process.exit(2);
}

const { WebSocket } = cloudcliRequire('ws');
const Database = cloudcliRequire('better-sqlite3');
const { chromium } = globalRequire('playwright');
const cloudcliPackage = cloudcliRequire('./package.json');

function endpoint(pathname) {
  return new URL(pathname.replace(/^\//, ''), baseUrl);
}

async function request(pathname, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint(pathname), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

async function waitForCloudCliReadiness(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const status = await request('/api/auth/status');
      if (status.response.status === 200) return status;
      lastError = new Error(`CloudCLI readiness returned HTTP ${status.response.status}: ${status.text}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`CloudCLI did not become ready: ${lastError instanceof Error ? lastError.message : lastError}`);
}

function wsUrl(pathname, token) {
  const url = endpoint(pathname);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('token', token);
  return url;
}

function withTimeout(promise, label, timeoutMs = requestTimeoutMs) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

function waitForOpen(socket, label) {
  return withTimeout(new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off('open', onOpen);
      socket.off('error', onError);
      socket.off('unexpected-response', onUnexpectedResponse);
      socket.off('close', onClose);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onUnexpectedResponse = (_request, response) => {
      cleanup();
      reject(new Error(`${label} rejected with HTTP ${response.statusCode}`));
    };
    const onClose = (code, reason) => {
      cleanup();
      reject(new Error(`${label} closed before open: ${code} ${reason.toString()}`));
    };
    socket.once('open', onOpen);
    socket.once('error', onError);
    socket.once('unexpected-response', onUnexpectedResponse);
    socket.once('close', onClose);
  }), `${label} open`);
}

function waitForMessage(socket, predicate, label) {
  return withTimeout(new Promise((resolve, reject) => {
    const onMessage = (data) => {
      let value;
      try {
        value = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (predicate(value)) {
        cleanup();
        resolve(value);
      }
    };
    const onClose = (code, reason) => {
      cleanup();
      reject(new Error(`${label} closed before readiness: ${code} ${reason.toString()}`));
    };
    const cleanup = () => {
      socket.off('message', onMessage);
      socket.off('close', onClose);
    };
    socket.on('message', onMessage);
    socket.on('close', onClose);
  }), label);
}

function waitForStableOpen(socket, label, stableMs = 400) {
  return withTimeout(new Promise((resolve, reject) => {
    let stableTimer;
    const cleanup = () => {
      clearTimeout(stableTimer);
      socket.off('error', onError);
      socket.off('close', onClose);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onClose = (code, reason) => {
      cleanup();
      const error = new Error(`${label} closed before readiness: ${code} ${reason.toString()}`);
      error.closeCode = code;
      reject(error);
    };
    socket.once('error', onError);
    socket.once('close', onClose);
    stableTimer = setTimeout(() => {
      cleanup();
      resolve();
    }, stableMs);
  }), `${label} stable open`);
}

function waitForClose(socket, label) {
  return withTimeout(new Promise((resolve) => {
    socket.once('close', (closeCode, reason) => resolve({ closeCode, reason: reason.toString() }));
  }), `${label} close`);
}

async function connectAuthenticatedSockets(token) {
  const sockets = new Map();
  try {
    for (const pathname of ['/ws', '/shell', '/plugin-ws/web-terminal', '/desktop-notifications']) {
      const deadline = Date.now() + (pathname === '/plugin-ws/web-terminal' ? pluginReadinessTimeoutMs : 0);
      while (true) {
        const socket = new WebSocket(wsUrl(pathname, token));
        sockets.set(pathname, socket);
        try {
          await waitForOpen(socket, pathname);
          if (pathname === '/desktop-notifications') {
            const registered = waitForMessage(
              socket,
              (message) => message.type === 'registered' && message.deviceId === 'holyclaude-auth-runtime',
              `${pathname} registration`,
            );
            socket.send(JSON.stringify({
              type: 'register',
              deviceId: 'holyclaude-auth-runtime',
              label: 'HolyClaude auth runtime',
              platform: 'linux',
            }));
            await registered;
          } else {
            await waitForStableOpen(socket, pathname);
          }
          assert.equal(socket.readyState, WebSocket.OPEN, `${pathname} should remain ready after authentication`);
          break;
        } catch (error) {
          if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
          const pluginStarting = pathname === '/plugin-ws/web-terminal'
            && error?.closeCode === 4404
            && Date.now() < deadline;
          if (!pluginStarting) throw error;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
    return sockets;
  } catch (error) {
    for (const socket of sockets.values()) socket.terminate();
    throw error;
  }
}

function addDatabaseFault(database) {
  database.exec(`
    CREATE TRIGGER holyclaude_auth_generation_fail_insert
    BEFORE INSERT ON app_config
    WHEN NEW.key = 'auth_token_generation'
    BEGIN
      SELECT RAISE(ABORT, 'HolyClaude auth generation fault');
    END;
    CREATE TRIGGER holyclaude_auth_generation_fail_update
    BEFORE UPDATE OF value ON app_config
    WHEN NEW.key = 'auth_token_generation'
    BEGIN
      SELECT RAISE(ABORT, 'HolyClaude auth generation fault');
    END;
  `);
}

function removeDatabaseFault(database) {
  database.exec(`
    DROP TRIGGER IF EXISTS holyclaude_auth_generation_fail_insert;
    DROP TRIGGER IF EXISTS holyclaude_auth_generation_fail_update;
  `);
}

function readGeneration(database) {
  return database.prepare("SELECT value FROM app_config WHERE key = 'auth_token_generation'").get()?.value ?? null;
}

async function login(username, password) {
  return request('/api/auth/login', { method: 'POST', body: { username, password } });
}

async function assertLogin(username, password, expectedStatus) {
  const result = await login(username, password);
  assert.equal(result.response.status, expectedStatus, result.text);
  return result;
}

async function createBrowserSession(token) {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  try {
    const context = await browser.newContext();
    await context.addInitScript(({ initialToken }) => {
      const NativeWebSocket = window.WebSocket;
      window.__holyclaudeAuthSockets = { attempts: [], opens: [], closes: [] };
      window.WebSocket = class InstrumentedWebSocket extends NativeWebSocket {
        constructor(url, protocols) {
          if (protocols === undefined) super(url);
          else super(url, protocols);
          window.__holyclaudeAuthSockets.attempts.push(String(url));
          this.addEventListener('open', () => {
            window.__holyclaudeAuthSockets.opens.push(String(url));
          });
          this.addEventListener('close', (event) => {
            window.__holyclaudeAuthSockets.closes.push({ code: event.code, reason: event.reason });
          });
        }
      };
      localStorage.setItem('auth-token', initialToken);
    }, { initialToken: token });

    const firstPage = await context.newPage();
    const secondPage = await context.newPage();
    for (const page of [firstPage, secondPage]) {
      await page.goto(baseUrl.href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        (expectedToken) => localStorage.getItem('auth-token') === expectedToken
          && window.__holyclaudeAuthSockets.opens.some((url) => url.includes('/ws?token=')),
        token,
      );
    }
    return { browser, pages: [firstPage, secondPage] };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function assertBrowserRevocation(pages) {
  for (const page of pages) {
    await page.waitForFunction(() => localStorage.getItem('auth-token') === null);
    await page.locator('input[name="username"]').waitFor({ state: 'visible' });
    await page.locator('input[name="password"]').waitFor({ state: 'visible' });
  }

  const attemptCounts = await Promise.all(
    pages.map((page) => page.evaluate(() => window.__holyclaudeAuthSockets.attempts.length)),
  );
  await pages[0].waitForTimeout(3_500);
  for (let index = 0; index < pages.length; index += 1) {
    assert.equal(
      await pages[index].evaluate(() => window.__holyclaudeAuthSockets.attempts.length),
      attemptCounts[index],
      `page ${index + 1} must not reconnect after authentication revocation`,
    );
  }
}

async function submitPasswordChange(page, currentPassword, newPassword) {
  const currentPasswordInput = page.locator('#account-current-password');
  if (!await currentPasswordInput.isVisible()) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Account', exact: true }).click();
    await currentPasswordInput.waitFor({ state: 'visible' });
  }

  await currentPasswordInput.fill(currentPassword);
  await page.locator('#account-new-password').fill(newPassword);
  await page.locator('#account-confirm-password').fill(newPassword);
  const responsePromise = page.waitForResponse((response) => (
    response.request().method() === 'POST'
      && new URL(response.url()).pathname === endpoint('/api/auth/change-password').pathname
  ));
  await page.getByRole('button', { name: 'Change Password', exact: true }).click();
  const response = await responsePromise;
  return { status: response.status(), text: await response.text() };
}

async function main() {
  const username = `auth-runtime-${process.pid}`;
  const oldPassword = `old-${randomUUID()}`;
  const newPassword = `new-${randomUUID()}`;
  let database;
  let browserSession;
  let sockets;

  try {
    assert.equal(cloudcliPackage.version, '1.37.3');
    const status = await waitForCloudCliReadiness();
    assert.equal(status.json?.needsSetup, true, 'runtime harness requires a fresh disposable CloudCLI database');
    database = new Database(databasePath);

    const registration = await request('/api/auth/register', {
      method: 'POST',
      body: { username, password: oldPassword },
    });
    assert.equal(registration.response.status, 200, registration.text);
    assert.equal(registration.json?.success, true, registration.text);
    const oldToken = registration.json?.token;
    assert.equal(typeof oldToken, 'string');

    const onboarding = await request('/api/user/complete-onboarding', {
      method: 'POST',
      token: oldToken,
    });
    assert.equal(onboarding.response.status, 200, onboarding.text);
    assert.equal(onboarding.json?.success, true, onboarding.text);

    browserSession = await createBrowserSession(oldToken);
    sockets = await connectAuthenticatedSockets(oldToken);
    const generationBeforeFault = readGeneration(database);

    addDatabaseFault(database);
    const failedChange = await submitPasswordChange(browserSession.pages[0], oldPassword, newPassword);
    assert.equal(failedChange.status, 500, failedChange.text);
    await browserSession.pages[0].getByRole('alert').waitFor({ state: 'visible' });
    await browserSession.pages[0].waitForTimeout(1_500);
    assert.equal(readGeneration(database), generationBeforeFault, 'failed generation update must roll back');

    const oldJwtAfterFailure = await request('/api/auth/user', { token: oldToken });
    assert.equal(oldJwtAfterFailure.response.status, 200, oldJwtAfterFailure.text);
    await assertLogin(username, oldPassword, 200);
    await assertLogin(username, newPassword, 401);
    for (const [pathname, socket] of sockets) {
      assert.equal(socket.readyState, WebSocket.OPEN, `${pathname} must survive rolled-back password rotation`);
    }
    for (const page of browserSession.pages) {
      assert.equal(await page.evaluate(() => localStorage.getItem('auth-token')), oldToken);
      assert.equal(
        await page.evaluate(() => window.__holyclaudeAuthSockets.closes.some(({ code }) => code === 4001)),
        false,
        'browser WebSocket must survive rolled-back password rotation',
      );
    }

    removeDatabaseFault(database);
    const closeResults = new Map(
      [...sockets].map(([pathname, socket]) => [pathname, waitForClose(socket, pathname)]),
    );
    const successfulChange = await submitPasswordChange(browserSession.pages[0], oldPassword, newPassword);
    assert.equal(successfulChange.status, 200, successfulChange.text);
    assert.notEqual(readGeneration(database), generationBeforeFault, 'successful rotation must replace token generation');

    for (const [pathname, closePromise] of closeResults) {
      const { closeCode, reason } = await closePromise;
      assert.equal(closeCode, 4001, `${pathname} close reason: ${reason}`);
    }
    await assertBrowserRevocation(browserSession.pages);

    const rejectedRest = await request('/api/auth/user', { token: oldToken });
    assert.equal(rejectedRest.response.status, 401, rejectedRest.text);
    assert.equal(rejectedRest.response.headers.get('x-auth-error'), 'invalid-token');
    assert.equal(rejectedRest.json?.code, 'AUTH_TOKEN_INVALID');
    await assertLogin(username, oldPassword, 401);
    const currentLogin = await assertLogin(username, newPassword, 200);
    assert.equal(currentLogin.json?.success, true, currentLogin.text);

    console.log(JSON.stringify({
      cloudcli: '1.37.3',
      authenticatedSockets: [...sockets.keys()],
      rollback: 'old-jwt-password-sockets-preserved',
      rotationCloseCode: 4001,
      oldRest: { status: 401, header: 'invalid-token', code: 'AUTH_TOKEN_INVALID' },
      browserPages: 2,
      reconnectSuppressionMs: 3_500,
      result: 'ok',
    }));
  } finally {
    try {
      if (database) removeDatabaseFault(database);
    } catch {
      // The disposable database may already be gone during container teardown.
    }
    for (const socket of sockets?.values() ?? []) {
      if (socket.readyState !== WebSocket.CLOSED) socket.terminate();
    }
    await browserSession?.browser.close();
    database?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
