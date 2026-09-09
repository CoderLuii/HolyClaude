import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('tests/cloudcli_auth_session_runtime.mjs', 'utf8');
const wrapper = readFileSync('tests/cloudcli_auth_session_smoke.sh', 'utf8');

test('CloudCLI auth-session runtime harness covers every authenticated transport and rollback boundary', () => {
  for (const path of ['/ws', '/shell', '/plugin-ws/web-terminal', '/desktop-notifications']) {
    assert.ok(source.includes(`'${path}'`), `missing authenticated WebSocket path ${path}`);
  }

  assert.match(source, /CREATE TRIGGER holyclaude_auth_generation_fail_insert/);
  assert.match(source, /CREATE TRIGGER holyclaude_auth_generation_fail_update/);
  assert.match(source, /DROP TRIGGER IF EXISTS holyclaude_auth_generation_fail_/);
  assert.match(source, /AUTH_TOKEN_INVALID/);
  assert.match(source, /invalid-token/);
  assert.match(source, /closeCode, 4001/);
  assert.match(source, /browser\.newContext/);
  assert.match(source, /context\.newPage/g);
  assert.match(source, /__holyclaudeAuthSockets = \{ attempts: \[\], opens: \[\], closes: \[\] \}/);
  assert.match(source, /__holyclaudeAuthSockets\.opens\.some/);
  assert.match(source, /localStorage\.getItem\('auth-token'\)/);
  assert.match(source, /waitForTimeout\(3_500\)/);
  assert.match(source, /waitForTimeout\(1_500\)/);
  assert.match(source, /#account-current-password/);
  assert.match(source, /#account-new-password/);
  assert.match(source, /#account-confirm-password/);
  assert.match(source, /getByRole\('button', \{ name: 'Change Password', exact: true \}\)/);
  assert.equal(
    source.match(/submitPasswordChange\(browserSession\.pages\[0\]/g)?.length,
    2,
    'failed and successful rotations must both use the real account settings form',
  );
  assert.doesNotMatch(source, /request\('\/api\/auth\/change-password'/);
  assert.match(source, /error\?\.closeCode === 4404/);
  assert.match(source, /better-sqlite3/);
  assert.match(source, /playwright/);
  assert.match(source, /waitForCloudCliReadiness/);
  assert.match(source, /cloudcliPackage\.version, '1\.37\.3'/);
  assert.match(source, /request\('\/api\/user\/complete-onboarding'/);
  assert.match(source, /assert\.equal\(onboarding\.json\?\.success, true/);
});

test('CloudCLI auth-session wrapper is bounded, disposable, and carries no host state', () => {
  assert.match(wrapper, /--image IMAGE --variant full\|slim --expected-arch amd64\|arm64/);
  assert.match(wrapper, /CONTAINER_ID="\$\(docker_cmd run -d/);
  assert.match(wrapper, /--cpus 2/);
  assert.match(wrapper, /--memory 2g/);
  assert.match(wrapper, /--memory-swap 2g/);
  assert.match(wrapper, /--shm-size=1g/);
  assert.match(wrapper, /trap cleanup EXIT/);
  assert.match(wrapper, /docker_cmd rm -f "\$CONTAINER_ID"/);
  assert.match(wrapper, /docker_literal_cmd exec "\$CONTAINER_ID" cat \/etc\/holyclaude-variant/);
  assert.match(wrapper, /docker_literal_cmd exec "\$CONTAINER_ID" curl -fsS http:\/\/127\.0\.0\.1:3001\/health/);
  assert.match(wrapper, /image inspect --format '\{\{\.Architecture\}\}'/);
  assert.match(wrapper, /docker_literal_cmd cp "\$HARNESS_HOST_PATH" "\$CONTAINER_ID:\/tmp\/cloudcli_auth_session_runtime\.mjs"/);
  assert.match(wrapper, /timeout 180s node \/tmp\/cloudcli_auth_session_runtime\.mjs/);
  const runBlock = wrapper.match(/CONTAINER_ID="\$\(docker_cmd run -d \\\n([\s\S]*?)\n  "\$IMAGE"\)"/)?.[0];
  assert.ok(runBlock, 'missing bounded docker run block');
  assert.doesNotMatch(runBlock, /--mount|(?:^|\s)-v(?:\s|=)/m);
  assert.doesNotMatch(wrapper, /full-image container/);
});
