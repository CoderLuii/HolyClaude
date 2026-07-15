import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const wrapper = readFileSync('scripts/holyclaude-chromium', 'utf8');

test('Dockerfile uses pinned Playwright bindings and the canonical browser path', () => {
  assert.match(dockerfile, /playwright@1\.61\.0/);
  assert.match(dockerfile, /playwright==1\.61\.0/);
  assert.doesNotMatch(dockerfile, /PLAYWRIGHT_BROWSERS_PATH=/);
  assert.match(dockerfile, /NODE_PATH=\/usr\/local\/lib\/node_modules/);
  assert.match(dockerfile, /CHROME_PATH=\/usr\/bin\/chromium/);
  assert.match(dockerfile, /PUPPETEER_EXECUTABLE_PATH=\/usr\/bin\/chromium/);
});

test('Dockerfile pins the Bookworm security Chromium packages', () => {
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=150\.0\.7871\.114-1~deb12u1/);
  assert.match(dockerfile, /chromium="\$\{CHROMIUM_DEBIAN_VERSION\}"/);
  assert.match(dockerfile, /chromium-common="\$\{CHROMIUM_DEBIAN_VERSION\}"/);
  assert.match(dockerfile, /chromium-sandbox="\$\{CHROMIUM_DEBIAN_VERSION\}"/);
  assert.match(dockerfile, /dpkg-query -W -f='\$\{Version\}' chromium/);
  assert.match(dockerfile, /test -x \/usr\/lib\/chromium\/chromium/);
});

test('Dockerfile does not download a separate Playwright browser', () => {
  assert.match(dockerfile, /PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i -g/);
  assert.doesNotMatch(dockerfile, /playwright install/);
  assert.doesNotMatch(dockerfile, /\/ms-playwright/);
  assert.match(dockerfile, /ln -sf \/usr\/local\/bin\/holyclaude-chromium \/usr\/bin\/chromium/);
});

test('Dockerfile verifies both Playwright bindings and CloudCLI use the system browser contract', () => {
  assert.match(dockerfile, /require\('\/usr\/local\/lib\/node_modules\/playwright\/package\.json'\)\.version/);
  assert.match(dockerfile, /importlib\.metadata\.version\('playwright'\)/);
  assert.match(dockerfile, /createRequire\('file:\/\/\/usr\/local\/lib\/node_modules\/@cloudcli-ai\/cloudcli\/dist-server\/server\/index\.js'\)/);
  assert.match(dockerfile, /require\('playwright\/package\.json'\)\.version/);
  assert.match(dockerfile, /test -x \/usr\/bin\/chromium/);
});

test('chromium wrapper resolves pinned Debian Chromium and fails closed', () => {
  assert.match(wrapper, /^#!\/bin\/sh/);
  assert.match(wrapper, /HOLYCLAUDE_CHROMIUM_BINARY:-\/usr\/lib\/chromium\/chromium/);
  assert.match(wrapper, /Debian Chromium executable not found/);
  assert.match(wrapper, /exit 127/);
  assert.match(wrapper, /exec "\$BROWSER_BIN"/);
});
