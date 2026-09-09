import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const lock = JSON.parse(readFileSync(
  'vendor/locks/cloudcli-web-terminal-6757ed0ef067cf7d8e1bf20fa0dd64b97e61889d.package-lock.json',
  'utf8',
));

test('Web Terminal replaces both locked esbuild executables with the pinned Go rebuild', () => {
  assert.equal(lock.packages['node_modules/esbuild'].version, '0.25.12');
  assert.equal(lock.packages['node_modules/@esbuild/linux-x64'].version, '0.25.12');
  assert.equal(lock.packages['node_modules/@esbuild/linux-arm64'].version, '0.25.12');

  assert.match(dockerfile, /^FROM golang:1\.27\.1-bookworm@sha256:[0-9a-f]{64} AS esbuild-builder$/m);
  assert.match(dockerfile, /go install "github\.com\/evanw\/esbuild\/cmd\/esbuild@v\$\{ESBUILD_VERSION\}"/);
  assert.match(
    dockerfile,
    /COPY --from=esbuild-builder --chown=claude:claude \/out\/0\.25\.12\/esbuild \/tmp\/web-terminal-esbuild/,
  );
  assert.match(
    dockerfile,
    /require\('\.\/node_modules\/esbuild\/package\.json'\)\.version"\)" = "0\.25\.12"/,
  );
  assert.match(
    dockerfile,
    /require\('\.\/node_modules\/@esbuild\/linux-\$\{ESBUILD_PACKAGE_ARCH\}\/package\.json'\)\.version"\)" = "0\.25\.12"/,
  );
  assert.match(dockerfile, /install -m 0755 \/tmp\/web-terminal-esbuild node_modules\/esbuild\/bin\/esbuild/);
  assert.match(
    dockerfile,
    /install -m 0755 \/tmp\/web-terminal-esbuild "node_modules\/@esbuild\/linux-\$\{ESBUILD_PACKAGE_ARCH\}\/bin\/esbuild"/,
  );
  assert.match(
    dockerfile,
    /sha256sum node_modules\/esbuild\/bin\/esbuild[\s\S]{0,240}node_modules\/@esbuild\/linux-\$\{ESBUILD_PACKAGE_ARCH\}\/bin\/esbuild/,
  );
  assert.match(dockerfile, /rm -f [^\n]*\/tmp\/web-terminal-esbuild$/m);
});

test('common runtime checks cover both rebuilt Web Terminal binaries for full and slim', () => {
  const commonBlock = runtimeChecks.match(/require_eq "Cursor Agent build"[\s\S]+?if \[ "\$VARIANT" = "full" \]; then/);
  assert.ok(commonBlock, 'Web Terminal checks must run before the full-only branch');
  assert.match(commonBlock[0], /Web Terminal esbuild package version/);
  assert.match(commonBlock[0], /Web Terminal platform esbuild package version/);
  assert.match(runtimeChecks, /Web Terminal esbuild package version[\s\S]{0,160}"0\.25\.12"/);
  assert.match(runtimeChecks, /Web Terminal platform esbuild package version[\s\S]{0,220}"0\.25\.12"/);
  assert.match(runtimeChecks, /Web Terminal esbuild binary version[\s\S]{0,180}"0\.25\.12"/);
  assert.match(runtimeChecks, /Web Terminal platform esbuild binary version[\s\S]{0,240}"0\.25\.12"/);
  assert.match(runtimeChecks, /web_terminal_esbuild_go=go1\.27\.1/);
  assert.match(runtimeChecks, /transformSync\('const value: number = 1'/);
  assert.match(runtimeChecks, /web_terminal_esbuild_transform=ok/);
  assert.match(runtimeChecks, /web_terminal_esbuild_sha256=/);
});
