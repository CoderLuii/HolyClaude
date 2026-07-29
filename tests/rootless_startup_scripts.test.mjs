import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const entrypoint = readFileSync('scripts/entrypoint.sh', 'utf8');
const bootstrap = readFileSync('scripts/bootstrap.sh', 'utf8');
const cloudcliRun = readFileSync('s6-overlay/s6-rc.d/cloudcli/run', 'utf8');
const dockerfile = readFileSync('Dockerfile', 'utf8');
const podmanCompose = readFileSync('docker-compose.podman-rootless.yaml', 'utf8');
const rootlessDocs = [
  readFileSync('README.md', 'utf8'),
  readFileSync('docs/configuration.md', 'utf8'),
  readFileSync('docs/dockerhub-description.md', 'utf8'),
  readFileSync('docs/troubleshooting.md', 'utf8'),
];

test('entrypoint gates root-only operations for non-root startup', () => {
  assert.match(entrypoint, /RUNNING_AS_ROOT=0/);
  assert.match(entrypoint, /run_as_claude\(\)/);
  assert.match(entrypoint, /chown_if_root\(\)/);
  assert.match(entrypoint, /Non-root startup detected/);
  assert.match(entrypoint, /groupmod -o -g/);
  assert.match(entrypoint, /usermod -o -u/);
});

test('bootstrap uses the same root-aware command helpers', () => {
  assert.match(bootstrap, /RUNNING_AS_ROOT=0/);
  assert.match(bootstrap, /run_as_claude\(\)/);
  assert.match(bootstrap, /chown_if_root\(\)/);
  assert.doesNotMatch(bootstrap, /^runuser /m);
});

test('cloudcli service skips s6 privilege drop when already non-root', () => {
  assert.match(cloudcliRun, /if \[ "\$\(id -u\)" = "0" \]/);
  assert.match(cloudcliRun, /exec s6-setuidgid claude cloudcli --port 3001/);
  assert.match(cloudcliRun, /exec cloudcli --port 3001/);
});

test('image prepares the CloudCLI state directory for fresh volume copy-up', () => {
  assert.match(dockerfile, /mkdir -p \/home\/claude\/\.cloudcli/);
  assert.match(dockerfile, /chown claude:claude \/home\/claude\/\.cloudcli/);
});

test('rootless Podman profile persists CloudCLI state with SELinux labeling', () => {
  assert.match(podmanCompose, /\.\/data\/cloudcli:\/home\/claude\/\.cloudcli:Z/);
  assert.match(podmanCompose, /mkdir -p data\/claude data\/cloudcli workspace/);
});

test('rootless Podman instructions prepare every bind-mounted directory', () => {
  for (const documentation of rootlessDocs) {
    assert.match(documentation, /mkdir -p data\/claude data\/cloudcli workspace/);
    assert.match(documentation, /podman compose -f docker-compose\.podman-rootless\.yaml up -d/);
  }
});

test('entrypoint repairs CloudCLI state without following links or crossing filesystems', () => {
  assert.match(entrypoint, /CLOUDCLI_DIR="\$CLAUDE_HOME\/\.cloudcli"/);
  assert.match(entrypoint, /find "\$CLOUDCLI_DIR" -xdev/);
  assert.match(entrypoint, /chown -h "\$PUID:\$PGID"/);
  assert.match(entrypoint, /CloudCLI state path must not be a symbolic link/);
  assert.doesNotMatch(entrypoint, /chmod 777/);
});

test('entrypoint verifies CloudCLI state as the runtime user before s6 starts', () => {
  const cloudcliPreparation = entrypoint.indexOf('# ---------- Prepare CloudCLI state ----------');
  const s6Handoff = entrypoint.indexOf('# ---------- Hand off to s6-overlay ----------');

  assert.notEqual(cloudcliPreparation, -1);
  assert.ok(cloudcliPreparation < s6Handoff);
  assert.match(entrypoint, /run_as_claude_env sh -c/);
  assert.match(entrypoint, /\.holyclaude-write-test/);
  assert.match(entrypoint, /auth\.db-wal/);
  assert.match(entrypoint, /CloudCLI state is not writable/);
});
