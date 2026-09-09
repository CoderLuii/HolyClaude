import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const require = createRequire('/usr/local/lib/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const phase = process.argv[2];
assert.ok(phase === 'first' || phase === 'second');
const base = 'http://127.0.0.1:3001';
async function api(path, options = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers ?? {}) }, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  return { response, payload: await response.json() };
}
const credentials = { username: 'plugin-runtime', password: 'synthetic-plugin-password' };
const auth = phase === 'first' ? await api('/api/auth/register', { method: 'POST', body: credentials }) : await api('/api/auth/login', { method: 'POST', body: credentials });
assert.equal(auth.response.status, 200, JSON.stringify(auth.payload));
assert.equal(auth.payload.success, true);
const onboarding = await api('/api/user/complete-onboarding', { method: 'POST', headers: { authorization: `Bearer ${auth.payload.token}` } });
assert.equal(onboarding.response.status, 200, JSON.stringify(onboarding.payload));
if (phase === 'first') {
  const project = await api('/api/projects/create-project', { method: 'POST', headers: { authorization: `Bearer ${auth.payload.token}` }, body: { path: '/workspace' } });
  assert.equal(project.response.status, 200, JSON.stringify(project.payload));
}
const context = await chromium.launchPersistentContext('/browser-profile', { executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = context.pages()[0] ?? await context.newPage();
await page.addInitScript((token) => localStorage.setItem('auth-token', token), auth.payload.token);
await page.goto(base, { waitUntil: 'domcontentloaded' });
const rememberedTabs = await page.evaluate(() => JSON.parse(localStorage.getItem('web-terminal-tabs') ?? '[]'));
const projectNav = page.getByText('workspace', { exact: true }).last();
if (await projectNav.count()) await projectNav.click();
const terminalNav = page.getByText('Terminal', { exact: true }).last();
for (let step = 0; step < 10 && !await terminalNav.isVisible().catch(() => false); step += 1) {
  const gitStep = (await page.locator('body').innerText()).includes('Configure your git identity');
  const name = page.getByLabel('Git Name');
  const email = page.getByLabel('Git Email');
  if (gitStep && await name.count()) await name.fill('Plugin Runtime');
  else if (gitStep && await page.locator('input').count() >= 1) await page.locator('input').nth(0).fill('Plugin Runtime');
  if (gitStep && await email.count()) await email.fill('plugin-runtime@example.invalid');
  else if (gitStep && await page.locator('input').count() >= 2) await page.locator('input').nth(1).fill('plugin-runtime@example.invalid');
  const advance = page.getByRole('button', { name: /^(Next|Skip|Finish|Get Started|Complete Setup)$/ }).last();
  if (await advance.count() === 0) break;
  await advance.click();
  await page.waitForTimeout(300);
}
try {
  await terminalNav.waitFor({ timeout: 30_000 });
} catch (error) {
  console.error(JSON.stringify({ url: page.url(), title: await page.title(), body: (await page.locator('body').innerText()).slice(0, 4000) }));
  throw error;
}
await terminalNav.click();
await page.getByRole('button', { name: 'New terminal' }).waitFor({ timeout: 30_000 });
if (phase === 'first') {
  await page.locator('.wt-btn[aria-label="Settings"]').click();
  const dialog = page.getByRole('dialog', { name: 'Terminal settings' });
  await dialog.waitFor();
  const increase = dialog.getByRole('button', { name: 'Increase font size' });
  for (let size = 14; size < 18; size += 1) await increase.click();
  await dialog.getByLabel('GPU acceleration').uncheck();
  await page.locator('.wt-btn[aria-label="Settings"]').click();
}
const terminal = page.locator('.xterm-helper-textarea').first();
await terminal.waitFor({ timeout: 30_000 });
await terminal.click();
const command = phase === 'first'
  ? "export HC_OLD_PTY_SENTINEL=present; printf 'first-plugin-terminal-ok\\n'"
  : "if [ -z \"${HC_OLD_PTY_SENTINEL:-}\" ]; then printf clean > /workspace/pty-status; else printf dirty > /workspace/pty-status; fi; printf 'second-plugin-terminal-ok\\n'";
await terminal.pressSequentially(command);
await terminal.press('Enter');
await page.waitForFunction((expected) => document.querySelector('.xterm-rows')?.textContent?.includes(expected), `${phase}-plugin-terminal-ok`, { timeout: 30_000 });
await page.waitForFunction(() => { const tabs = JSON.parse(localStorage.getItem('web-terminal-tabs') ?? '[]'); return tabs.length > 0 && typeof tabs[0]?.sessionId === 'string'; });
const state = await page.evaluate(() => ({ prefs: JSON.parse(localStorage.getItem('web-terminal-prefs') ?? '{}'), tabs: JSON.parse(localStorage.getItem('web-terminal-tabs') ?? '[]') }));
assert.equal(state.prefs.fontSize, 18);
assert.ok(state.tabs[0]?.sessionId);
if (phase === 'second') { assert.ok(rememberedTabs[0]?.sessionId); assert.equal(readFileSync('/workspace/pty-status', 'utf8'), 'clean'); }
const statsResponse = await fetch(`${base}/api/plugins/project-stats/rpc/stats?path=%2Fworkspace`, { headers: { authorization: `Bearer ${auth.payload.token}` } });
assert.equal(statsResponse.status, 200);
const stats = await statsResponse.json();
assert.equal(stats.totalFiles, phase === 'first' ? 1 : 2);
assert.equal(stats.totalLines, 3);
assert.equal(new Map(stats.byExtension).get('.js'), 1);
console.log(JSON.stringify({ phase, sessionId: state.tabs[0].sessionId, rememberedSessionId: rememberedTabs[0]?.sessionId ?? null, fontSize: state.prefs.fontSize, projectFiles: stats.totalFiles }));
await context.close();
