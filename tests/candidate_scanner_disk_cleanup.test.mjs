import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const bash = process.env.BASH_PATH || 'bash';
const helper = 'tests/cleanup_candidate_scanner_disk.sh';
const workflowPath = '.github/workflows/docker-publish.yml';
const workflow = readFileSync(workflowPath, 'utf8');
const upgrade = readFileSync('tests/docker_upgrade_rollback_smoke.sh', 'utf8');
const sha = 'a'.repeat(40);

const targets = {
  'full-amd64': 'coderluii/holyclaude:1.5.9@sha256:b797a832983c4f78e73ffdc9e673d384137f7c7e9836d71cf1672a2a10285ebd',
  'full-arm64': 'coderluii/holyclaude:1.5.9@sha256:30e2c9af3f85fd56ea515123532ee4f941c7154f66ad41bfdd07b02e0f541356',
  'slim-amd64': 'coderluii/holyclaude:1.5.9-slim@sha256:24aa28d1a801f02d560c0fb7406cdd33092b9776eaf563e78167840cbe384fc3',
  'slim-arm64': 'coderluii/holyclaude:1.5.9-slim@sha256:c69dbd24af1d4fb88fb00b71f931fc7824ece3e019d856b55abf5a3253955d74',
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-scanner-cleanup-'));
  const log = join(root, 'commands.log');
  const docker = join(root, process.platform === 'win32' ? 'docker.exe' : 'docker');
  const df = join(root, process.platform === 'win32' ? 'df.exe' : 'df');
  writeFileSync(docker, `#!/usr/bin/env bash
set -eu
printf 'docker %s\\n' "$*" >> "$COMMAND_LOG"
if [ "$1 $2" = 'image inspect' ]; then
  count_file="$FIXTURE_ROOT/inspect-count"
  count=0; [ ! -f "$count_file" ] || count="$(cat "$count_file")"
  count=$((count + 1)); printf '%s\\n' "$count" > "$count_file"
  id=sha256:candidate; [ "\${CANDIDATE_DRIFT:-}" != yes ] || [ "$count" -lt 2 ] || id=sha256:changed
  printf '%s|["repo@sha256:digest"]\\n' "$id"
elif [ "$1 $2" = 'image ls' ]; then
  [ "\${FAIL_REPRO_LOOKUP:-}" != yes ] || exit 72
  if [ "\${MISSING_REPRO:-}" != yes ]; then printf 'sha256:repro\\n'; fi
elif [ "$1 $2" = 'image rm' ]; then
  [ "\${FAIL_REMOVE:-}" != "$3" ] || exit 73
elif [ "$1 $2" = 'buildx du' ]; then
  [ "\${FAIL_BUILDX_DU:-}" != yes ] || exit 74
elif [ "$1 $2" = 'buildx prune' ]; then
  [ "\${FAIL_PRUNE:-}" != yes ] || exit 77
  [ "$*" = "buildx prune --all --force --builder $BUILDER" ] || exit 75
else
  exit 76
fi
`);
  writeFileSync(df, '#!/usr/bin/env bash\nset -eu\nprintf \'df %s\\n\' "$*" >> "$COMMAND_LOG"\nprintf \'fixture-df\\n\'\n');
  chmodSync(docker, 0o755);
  chmodSync(df, 0o755);
  return { root, log };
}

function runCleanup(variant, arch, overrides = {}) {
  const { root, log } = fixture();
  const image = overrides.IMAGE_OVERRIDE
    ?? `coderluii/holyclaude:candidate-${sha}-123-2-${variant}-${arch}@sha256:${'b'.repeat(64)}`;
  const env = {
    ...process.env,
    PATH: `${root}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`,
    COMMAND_LOG: log,
    FIXTURE_ROOT: root,
    GITHUB_ACTIONS: 'true',
    RUNNER_ENVIRONMENT: 'github-hosted',
    GITHUB_SHA: sha,
    GITHUB_RUN_ID: '123',
    GITHUB_RUN_ATTEMPT: '2',
    DOCKERHUB_IMAGE: 'coderluii/holyclaude',
    BUILDER: 'builder-fixture',
    ...overrides,
  };
  const result = spawnSync(bash, [helper, image, variant, arch, sha, env.BUILDER], {
    cwd: process.cwd(), env, encoding: 'utf8', timeout: 10_000,
  });
  return { result, commands: existsSync(log) ? readFileSync(log, 'utf8') : '', image };
}

test('executes exact target cleanup without removing or changing the candidate', () => {
  const helperSource = readFileSync(helper, 'utf8');
  assert.doesNotMatch(helperSource, /docker (?:image|system) prune|docker image rm\s+-|rm -[rf]/);
  for (const [target, baseline] of Object.entries(targets)) {
    const [variant, arch] = target.split('-');
    const { result, commands, image } = runCleanup(variant, arch);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(commands, new RegExp(`docker image rm ${baseline.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.doesNotMatch(commands, new RegExp(`docker image rm ${image.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(commands, /docker buildx prune --all --force --builder builder-fixture/);
    for (const build of ['a', 'b']) {
      const repro = `holyclaude-ffmpeg-repro:${sha}-${arch}-${build}`;
      assert.equal(commands.includes(`docker image rm ${repro}`), variant === 'full');
    }
    assert.match(helperSource, new RegExp(baseline.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(upgrade, new RegExp(baseline.split('@')[0].split(':').at(-1).replace('.', '\\.') + '.*' + baseline.split('@')[1]));
  }
});

test('skips absent FFmpeg reproduction refs but fails on Docker errors and identity drift', () => {
  assert.equal(runCleanup('full', 'amd64', { MISSING_REPRO: 'yes' }).result.status, 0);
  assert.notEqual(runCleanup('full', 'amd64', { FAIL_REPRO_LOOKUP: 'yes' }).result.status, 0);
  assert.notEqual(runCleanup('slim', 'arm64', { FAIL_REMOVE: targets['slim-arm64'] }).result.status, 0);
  assert.notEqual(runCleanup('slim', 'amd64', { FAIL_PRUNE: 'yes' }).result.status, 0);
  assert.notEqual(runCleanup('full', 'arm64', { CANDIDATE_DRIFT: 'yes' }).result.status, 0);
});

test('rejects non-hosted, unnamed-builder, SHA, and target drift before cleanup', () => {
  for (const [variant, arch, overrides] of [
    ['full', 'amd64', { RUNNER_ENVIRONMENT: 'self-hosted' }],
    ['full', 'amd64', { BUILDER: '' }],
    ['full', 'amd64', { BUILDER: 'default' }],
    ['full', 'amd64', { GITHUB_SHA: 'c'.repeat(40) }],
    ['full', 'amd64', { IMAGE_OVERRIDE: `coderluii/holyclaude:candidate-${'c'.repeat(40)}-123-2-full-amd64@sha256:${'b'.repeat(64)}` }],
    ['other', 'amd64', {}],
    ['slim', 'riscv64', {}],
  ]) {
    const { result, commands } = runCleanup(variant, arch, overrides);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(commands, /image rm|buildx prune/);
  }
});

test('workflow parses and binds the job-owned Buildx builder between smoke and scanner installation', () => {
  const parsed = spawnSync('python', ['-c', 'import sys,yaml; yaml.safe_load(open(sys.argv[1], encoding="utf-8"))', workflowPath], {
    encoding: 'utf8', timeout: 10_000,
  });
  assert.equal(parsed.status, 0, parsed.stderr);
  const setup = workflow.indexOf('      - name: Set up Docker Buildx');
  const smoke = workflow.indexOf('      - name: Run complete candidate smoke matrix');
  const cleanup = workflow.indexOf('      - name: Reclaim candidate scanner disk');
  const scanners = workflow.indexOf('      - name: Install pinned security scanners');
  assert.ok(setup >= 0 && setup < smoke && smoke < cleanup && cleanup < scanners);
  assert.match(workflow.slice(setup, smoke), /id: buildx/);
  const cleanupStep = workflow.slice(cleanup, scanners);
  assert.match(cleanupStep, /timeout-minutes: 10/);
  assert.match(cleanupStep, /BUILDER: \$\{\{ steps\.buildx\.outputs\.name \}\}/);
  assert.match(cleanupStep, /IMAGE: \$\{\{ steps\.refs\.outputs\.dockerhub_ref \}\}@\$\{\{ steps\.digests\.outputs\.dockerhub_digest \}\}/);
  assert.match(cleanupStep, /bash tests\/cleanup_candidate_scanner_disk\.sh "\$IMAGE" "\$VARIANT" "\$ARCH" "\$SOURCE_SHA" "\$BUILDER"/);
});
