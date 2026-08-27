import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const wrapper = readFileSync('scripts/holyclaude-chromium', 'utf8');

test('Dockerfile uses pinned Playwright bindings and the canonical browser path', () => {
  assert.match(dockerfile, /playwright@1\.62\.0/);
  assert.match(dockerfile, /playwright==1\.62\.0/);
  assert.doesNotMatch(dockerfile, /PLAYWRIGHT_BROWSERS_PATH=/);
  assert.match(dockerfile, /NODE_PATH=\/usr\/local\/lib\/node_modules/);
  assert.match(dockerfile, /CHROME_PATH=\/usr\/bin\/chromium/);
  assert.match(dockerfile, /PUPPETEER_EXECUTABLE_PATH=\/usr\/bin\/chromium/);
});

test('Dockerfile pins the Bookworm security Chromium packages', () => {
  assert.match(dockerfile, /ARG CHROMIUM_DEBIAN_VERSION=151\.0\.7922\.108-1~deb12u1/);
  for (const packageName of ['CHROMIUM_PACKAGE', 'CHROMIUM_COMMON_PACKAGE', 'CHROMIUM_SANDBOX_PACKAGE']) {
    assert.match(dockerfile, new RegExp(`ARG ${packageName}_SHA256_AMD64=[0-9a-f]{64}`));
    assert.match(dockerfile, new RegExp(`ARG ${packageName}_SHA256_ARM64=[0-9a-f]{64}`));
  }
  assert.match(dockerfile, /apt-get download[\s\S]+"chromium=\$\{CHROMIUM_DEBIAN_VERSION\}"/);
  assert.match(dockerfile, /chromium-common_\$\{CHROMIUM_DEBIAN_VERSION\}_\$\{DEB_ARCH\}\.deb/);
  assert.match(dockerfile, /chromium-sandbox_\$\{CHROMIUM_DEBIAN_VERSION\}_\$\{DEB_ARCH\}\.deb/);
  assert.match(dockerfile, /\| sha256sum -c -/);
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
