import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const recipePath = 'examples/docker-client/Dockerfile';
const validatorPath = 'tests/validate_optional_docker_client.sh';
const composePath = 'tests/fixtures/optional-docker-client-compose.yaml';
const workflowPath = '.github/workflows/docker-publish.yml';

const recipe = readFileSync(recipePath, 'utf8');
const validator = readFileSync(validatorPath, 'utf8');
const compose = readFileSync(composePath, 'utf8');
const configuration = readFileSync('docs/configuration.md', 'utf8');
const workflow = readFileSync(workflowPath, 'utf8');

const bashPath = process.env.BASH_PATH || 'bash';
const exactCandidate = `fixture@sha256:${'a'.repeat(64)}`;

function writeExecutable(path, contents) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function runValidatorFixture(dockerScript, env = {}, jqScript = `#!/usr/bin/env bash\ncat >/dev/null\ncase "$*" in\n  *buildx.build.ref*) echo fixture-builder/fixture-builder0/fixture-record ;;\n  *Attachments*) echo sha256:manifest ;;\n  *.layers*) echo 100 ;;\nesac\n`) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-optional-client-validator-'));
  const bin = join(root, 'bin');
  const log = join(root, 'commands.log');
  const mkdir = spawnSync(bashPath, ['-lc', `mkdir -p '${bin.replaceAll('\\', '/')}'`], { encoding: 'utf8' });
  assert.equal(mkdir.status, 0, mkdir.stderr);
  writeExecutable(join(bin, 'docker'), dockerScript);
  writeExecutable(join(bin, 'jq'), jqScript);
  writeExecutable(join(bin, 'uname'), '#!/usr/bin/env bash\necho x86_64\n');
  const binPath = bin.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
  const result = spawnSync(bashPath, [], {
    input: `export PATH='${binPath}':"$PATH"\nexec bash '${validatorPath}' '${exactCandidate}' optional-fixture\n`,
    encoding: 'utf8',
    env: {
      ...process.env,
      RUN_SOCKET_COMPOSE: '1',
      REQUIRE_SOCKET_COMPOSE: '1',
      GITHUB_ACTIONS: 'true',
      RUNNER_ENVIRONMENT: 'github-hosted',
      FIXTURE_LOG: log.replaceAll('\\', '/'),
      FIXTURE_STATE: join(root, 'state').replaceAll('\\', '/'),
      ...env,
    },
  });
  const commands = existsSync(log) ? readFileSync(log, 'utf8') : '';
  rmSync(root, { recursive: true, force: true });
  return { ...result, commands };
}

const historyFixture = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FIXTURE_LOG"
case "$1 $2" in
  'image inspect')
    if [[ $* == *'--format {{.Architecture}}'* ]]; then echo amd64; exit 0; fi
    if [[ $* == *'--format {{.Config.User}}'* ]]; then exit 0; fi
    if [[ $3 == holyclaude-optional-docker-client:* ]]; then
      count=$(cat "$FIXTURE_STATE" 2>/dev/null || echo 0)
      echo $((count + 1)) > "$FIXTURE_STATE"
      [[ $count -gt 0 ]]
      exit
    fi
    exit 0
    ;;
  'ps -aq'|'network ls') exit 0 ;;
  'info --format') echo x86_64; exit 0 ;;
  'buildx build')
    while [[ $# -gt 0 ]]; do
      if [[ $1 == --metadata-file ]]; then
        printf '{"buildx.build.ref":"%s"}\\n' "\${BUILD_REF:-fixture-builder/fixture-builder0/fixture-record}" > "$2"
        break
      fi
      shift
    done
    exit 0
    ;;
  'image rm') exit 0 ;;
esac
if [[ $* == *'--name optional-fixture-client-cleanup '*' compose --project-name '*' down --remove-orphans' ]]; then exit "\${CLEANUP_COMPOSE_STATUS:-0}"; fi
if [[ $* == *'compose --project-name'*' logs '* ]]; then echo optional-docker-client-compose-ok; fi
if [[ $* == *'dpkg-query -W'* ]]; then
  [[ $* == *holyclaude-optional-docker-client:* ]] && printf '%s\\n' 'docker-ce-cli|5:29.8.1-1~debian.12~bookworm' 'docker-compose-plugin|5.5.1-1~debian.12~bookworm'
fi
if [[ $* == 'buildx history inspect --builder fixture-builder --format json fixture-record' ]]; then
  [[ -z \${LOOKUP_STATUS:-} ]] || exit "$LOOKUP_STATUS"
  printf '%s\\n' '{"Name":"fixture","Ref":"fixture-record","Attachments":[{"Digest":"sha256:manifest","Type":"application/vnd.oci.image.manifest.v1+json"}]}'
  exit 0
fi
if [[ $* == 'buildx history inspect attachment --builder fixture-builder --type manifest fixture-record' ]]; then
  [[ -z \${ATTACHMENT_STATUS:-} ]] || exit "$ATTACHMENT_STATUS"
  if [[ -n \${MANIFEST_JSON:-} ]]; then
    printf '%s\\n' "$MANIFEST_JSON"
    exit 0
  fi
  printf '%s\\n' '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","config":{"digest":"sha256:config","size":600},"layers":[{"digest":"sha256:base","size":1000},{"digest":"sha256:added","size":32141303}]}'
  exit 0
fi
if [[ $* == *'buildx history inspect'* ]]; then exit 91; fi
if [[ $* == *'--entrypoint du'* ]]; then echo '100 /'; fi
exit 0
`;

const realJqWrapper = '#!/usr/bin/env bash\nexec "$REAL_JQ_PATH" "$@"\n';

function hasRealJq(t) {
  if (process.env.REAL_JQ_PATH) return true;
  const lookup = spawnSync(bashPath, ['-lc', 'command -v jq'], { encoding: 'utf8' });
  if (lookup.status === 0 && lookup.stdout.trim()) {
    process.env.REAL_JQ_PATH = lookup.stdout.trim();
    return true;
  }
  t.skip('real jq is unavailable');
  return false;
}

test('optional recipe pins only the signed Bookworm Docker client packages and upstream notices', () => {
  assert.match(recipe, /^ARG BASE_IMAGE\r?\nFROM \$\{BASE_IMAGE\}/m);
  assert.doesNotMatch(recipe, /^ARG BASE_IMAGE=/m);
  assert.match(recipe, /signed-by=\/etc\/apt\/keyrings\/docker\.asc/);
  assert.match(recipe, /docker-ce-cli="\$\{DOCKER_CE_CLI_VERSION\}"/);
  assert.match(recipe, /docker-compose-plugin="\$\{DOCKER_COMPOSE_PLUGIN_VERSION\}"/);
  assert.match(recipe, /DOCKER_CE_CLI_VERSION=5:29\.8\.1-1~debian\.12~bookworm/);
  assert.match(recipe, /DOCKER_COMPOSE_PLUGIN_VERSION=5\.5\.1-1~debian\.12~bookworm/);
  assert.match(recipe, /--no-install-recommends/);
  assert.doesNotMatch(recipe, /docker-ce(?:\s|=)|containerd\.io|docker-buildx-plugin|docker-ce-rootless-extras/);
  for (const digest of [
    '2d81ea060825006fc8f3fe28aa5dc0ffeb80faf325b612c955229157b8c10dc0',
    'a8c869fbda819afb8d80e0ac19bac52e766bc6c19cb38cf94f52d64c4be2aab6',
    '58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd',
    'b7dca0a6b01fa7365e4892877a6321179ee343d72ee87a96cfc222141b99a1e6',
  ]) assert.ok(recipe.includes(digest));
});

test('native validator requires an exact digest and unique prefix, fails closed, and cleans only owned resources', () => {
  assert.match(validator, /\[\[ \$# -ne 2 \]\]/);
  assert.match(validator, /\^\[a-z0-9\]\[a-z0-9_.-\]\{5,62\}\$/);
  assert.match(validator, /@sha256:\[0-9a-f\]\{64\}\$/);
  assert.match(validator, /REQUIRE_SOCKET_COMPOSE:-0.*!= 1/);
  assert.match(validator, /GITHUB_ACTIONS:-false.*!= true/);
  assert.match(validator, /RUNNER_ENVIRONMENT:-.*!= github-hosted/);
  for (const packageName of ['docker-ce', 'docker-ce-rootless-extras', 'containerd.io', 'docker-buildx-plugin']) {
    assert.match(validator, new RegExp(`package_installed ${packageName.replace('.', '\\.')}`));
  }
  assert.match(validator, /--user 65534:65534[\s\S]*\/var\/run\/docker\.sock/);
  assert.match(validator, /DOCKER_HOST=tcp:\/\/127\.0\.0\.1:1/);
  assert.match(validator, /compose_client create create[\s\S]*compose_client start start[\s\S]*compose_client stop stop[\s\S]*compose_client down down/);
  assert.match(validator, /buildx history inspect attachment/);
  assert.match(validator, /added_layer_compressed_bytes=/);
  assert.match(validator, /filesystem_delta_bytes=/);
  assert.match(validator, /package_arch=/);
  assert.match(validator, /x86_64\) image_arch=amd64; package_arch=amd64/);
  assert.match(validator, /aarch64\) image_arch=arm64; package_arch=arm64/);
  assert.match(validator, /engine_arch/);
  assert.match(validator, /base_default_user=/);
  assert.match(validator, /derived_default_user=/);
  assert.ok(validator.includes('dpkg-query -W -f="\\${Package}|\\${Version}\\n"'));
  assert.ok(validator.includes('dpkg-query -W -f="\\${Architecture}"'));
  assert.ok(validator.includes('dpkg-query -W -f="\\${db:Status-Abbrev}"'));
  assert.doesNotMatch(validator, /(?:image|system|builder) prune|docker rm -f \$\(|docker network prune/);
  assert.match(validator, /docker image rm "\$\{derived_image\}"/);
  assert.match(validator, /exit "\$\{original_status\}"/);
  assert.match(validator, /label=com\.docker\.compose\.project=\$\{project_name\}/);
});

test('validator resolves the composite Buildx metadata reference with the owning builder and terminal record ID', (t) => {
  if (!hasRealJq(t)) return;
  const result = runValidatorFixture(historyFixture, {}, realJqWrapper);
  assert.equal(result.status, 0, `${result.stderr}\n${result.commands}`);
  assert.match(result.stdout, /added_layer_compressed_bytes=32141303/);
  assert.match(result.commands, /^buildx history inspect --builder fixture-builder --format json fixture-record$/m);
  assert.match(result.commands, /^buildx history inspect attachment --builder fixture-builder --type manifest fixture-record$/m);
  assert.doesNotMatch(result.commands, /history inspect.*fixture-builder\/fixture-builder0\/fixture-record/);
});

test('validator rejects malformed Buildx metadata references before history lookup', (t) => {
  if (!hasRealJq(t)) return;
  for (const buildRef of [
    'fixture-builder/fixture-record',
    'fixture-builder/fixture-builder0/fixture-record/extra',
    'fixture-builder//fixture-record',
    'fixture builder/fixture-builder0/fixture-record',
  ]) {
    const result = runValidatorFixture(historyFixture, { BUILD_REF: buildRef }, realJqWrapper);
    assert.equal(result.status, 1, `${buildRef}\n${result.stderr}\n${result.commands}`);
    assert.match(result.stderr, /Invalid Buildx build reference/);
    assert.doesNotMatch(result.commands, /buildx history inspect/);
  }
});

test('validator preserves Buildx history lookup failure across owned cleanup', (t) => {
  if (!hasRealJq(t)) return;
  const result = runValidatorFixture(historyFixture, { LOOKUP_STATUS: '17', CLEANUP_COMPOSE_STATUS: '9' }, realJqWrapper);
  assert.equal(result.status, 17, `${result.stderr}\n${result.commands}`);
  assert.match(result.commands, /optional-fixture-client-cleanup.*down --remove-orphans/);
  assert.doesNotMatch(result.commands, /history inspect attachment/);
});

test('validator preserves Buildx manifest attachment failure across owned cleanup', (t) => {
  if (!hasRealJq(t)) return;
  const result = runValidatorFixture(historyFixture, { ATTACHMENT_STATUS: '19', CLEANUP_COMPOSE_STATUS: '9' }, realJqWrapper);
  assert.equal(result.status, 19, `${result.stderr}\n${result.commands}`);
  assert.match(result.commands, /optional-fixture-client-cleanup.*down --remove-orphans/);
});

test('validator rejects unsafe or malformed compressed layer sizes before reporting evidence', (t) => {
  if (!hasRealJq(t)) return;
  const invalidManifests = [
    ['fractional', '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":[{"size":1.5}]}'],
    ['negative', '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":[{"size":-1}]}'],
    ['string', '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":[{"size":"100"}]}'],
    ['above safe integer', '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":[{"size":9007199254740992}]}'],
    ['empty layers', '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":[]}'],
    ['wrong manifest type', '{"schemaVersion":2,"mediaType":"application/vnd.oci.image.index.v1+json","layers":[{"size":100}]}'],
  ];
  for (const [name, manifest] of invalidManifests) {
    const result = runValidatorFixture(historyFixture, { MANIFEST_JSON: manifest, CLEANUP_COMPOSE_STATUS: '9' }, realJqWrapper);
    assert.equal(result.status, 4, `${name}\n${result.stderr}\n${result.commands}`);
    assert.doesNotMatch(result.stdout, /added_layer_compressed_bytes=/);
    assert.match(result.commands, /optional-fixture-client-cleanup.*down --remove-orphans/);
  }
});

test('real EXIT trap preserves a validation failure and reports cleanup failure after success', () => {
  const fixture = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FIXTURE_LOG"
case "$1 $2" in
  'image inspect')
    if [[ $* == *'--format {{.Architecture}}'* ]]; then echo amd64; exit 0; fi
    if [[ $* == *'--format {{.Config.User}}'* ]]; then exit 0; fi
    if [[ $3 == holyclaude-optional-docker-client:* ]]; then
      count=$(cat "$FIXTURE_STATE" 2>/dev/null || echo 0)
      echo $((count + 1)) > "$FIXTURE_STATE"
      if [[ $count -gt 0 && -n \${CLEANUP_INSPECT_STATUS:-} ]]; then exit "$CLEANUP_INSPECT_STATUS"; fi
      [[ $count -gt 0 ]]
      exit
    fi
    exit 0
    ;;
  'ps -aq'|'network ls') exit 0 ;;
  'info --format') echo x86_64; exit 0 ;;
  'buildx build') exit "\${PRODUCT_STATUS:-0}" ;;
  'image rm') exit 0 ;;
esac
if [[ $* == *'--name optional-fixture-client-cleanup '*' compose --project-name '*' down --remove-orphans' ]]; then exit "\${CLEANUP_COMPOSE_STATUS:-9}"; fi
if [[ $* == *'compose --project-name'*' logs '* ]]; then echo optional-docker-client-compose-ok; fi
if [[ $* == *'dpkg-query -W'* ]]; then
  [[ $* == *holyclaude-optional-docker-client:* ]] && printf '%s\\n' 'docker-ce-cli|5:29.8.1-1~debian.12~bookworm' 'docker-compose-plugin|5.5.1-1~debian.12~bookworm'
fi
if [[ $* == *'buildx history inspect attachment'* ]]; then echo 100; fi
if [[ $* == *'--entrypoint du'* ]]; then echo '100 /'; fi
exit 0
`;

  const productFailure = runValidatorFixture(fixture, { PRODUCT_STATUS: '7' });
  assert.equal(productFailure.status, 7, productFailure.stderr);
  assert.match(productFailure.commands, /compose --project-name optional-fixture-compose.*down --remove-orphans/);
  assert.match(productFailure.commands, /image rm holyclaude-optional-docker-client:optional-fixture/);

  const cleanupFailure = runValidatorFixture(fixture, { PRODUCT_STATUS: '0' });
  assert.equal(cleanupFailure.status, 9, `${cleanupFailure.stderr}\n${cleanupFailure.commands}`);

  const cleanupInspectFailure = runValidatorFixture(fixture, {
    PRODUCT_STATUS: '0',
    CLEANUP_INSPECT_STATUS: '23',
    CLEANUP_COMPOSE_STATUS: '0',
  });
  assert.equal(cleanupInspectFailure.status, 23, `${cleanupInspectFailure.stderr}\n${cleanupInspectFailure.commands}`);
  assert.doesNotMatch(cleanupInspectFailure.commands, /--name optional-fixture-client-cleanup/);

  const productAndInspectFailure = runValidatorFixture(fixture, {
    PRODUCT_STATUS: '7',
    CLEANUP_INSPECT_STATUS: '23',
    CLEANUP_COMPOSE_STATUS: '0',
  });
  assert.equal(productAndInspectFailure.status, 7, productAndInspectFailure.stderr);
});

test('same Compose project container collision is rejected without cleanup before namespace reservation', () => {
  const fixture = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FIXTURE_LOG"
case "$1 $2" in
  'image inspect') exit 1 ;;
  'ps -aq')
    [[ $* == *'label=com.docker.compose.project=optional-fixture-compose'* ]] && echo preexisting-container
    exit 0
    ;;
  'network ls') exit 0 ;;
esac
exit 97
`;
  const collision = runValidatorFixture(fixture);
  assert.equal(collision.status, 1, collision.stderr);
  assert.match(collision.stderr, /Compose project container collision/);
  assert.match(collision.commands, /ps -aq --filter label=com\.docker\.compose\.project=optional-fixture-compose/);
  assert.doesNotMatch(collision.commands, /compose --project-name|image rm/);
  assert.equal(collision.commands.match(/image inspect holyclaude-optional-docker-client:optional-fixture/g)?.length, 1);
});

test('Compose probe uses the exact derived candidate without another mutable image pull', () => {
  assert.match(compose, /image: \$\{OPTIONAL_DOCKER_CLIENT_IMAGE:\?set OPTIONAL_DOCKER_CLIENT_IMAGE\}/);
  assert.match(compose, /pull_policy: never/);
  assert.match(compose, /entrypoint: \/bin\/sh/);
  assert.match(compose, /com\.coderluii\.validation: optional-docker-client/);
  assert.doesNotMatch(compose, /alpine|latest/);
});

test('configuration guide keeps Docker access opt-in and documents authenticated remote use', () => {
  const section = configuration.match(/### Optional Docker client[\s\S]*?(?=\n### |\n## )/)?.[0];
  assert.ok(section, 'optional Docker client section must exist');
  assert.match(section, /examples\/docker-client\/Dockerfile/);
  assert.match(section, /RepoDigests/);
  assert.match(section, /DOCKER_HOST=ssh:\/\//);
  assert.match(section, /TLS/);
  assert.match(section, /Docker context/);
  assert.match(section, /\.\/data\/claude\/docker-client/);
  assert.match(section, /credential|secret/i);
  assert.match(section, /host-level authority/);
  assert.match(section, /Docker CLI 29\.8\.1/);
  assert.match(section, /Compose 5\.5\.1/);
  assert.match(section, /existing Full Compose service/i);
  assert.match(section, /image: holyclaude:1\.6\.1-docker-client/);
  assert.match(section, /DOCKER_CONFIG=\/home\/claude\/\.claude\/docker-client/);
  assert.match(section, /container's terminal/i);
  assert.match(section, /native release workflow[\s\S]*amd64[\s\S]*arm64/i);
  assert.doesNotMatch(section, /preliminarily|work in progress/i);
  assert.match(section, /NAS compatibility has not been verified/);
  assert.match(section, /never expose.*2375/i);
  assert.match(section, /do not mount `\/var\/run\/docker\.sock`/i);
});

test('native Full candidates run optional client validation after digest capture and before scanners', () => {
  const digest = workflow.indexOf('      - name: Capture registry digests');
  const optional = workflow.indexOf('      - name: Validate optional Docker client');
  const scanner = workflow.indexOf('      - name: Install pinned security scanners');
  assert.ok(digest >= 0 && digest < optional && optional < scanner);
  const step = workflow.slice(optional, scanner);
  assert.match(step, /if: matrix\.variant == 'full'/);
  assert.match(step, /RUN_SOCKET_COMPOSE: '1'/);
  assert.match(step, /REQUIRE_SOCKET_COMPOSE: '1'/);
  assert.match(step, /steps\.refs\.outputs\.dockerhub_ref.*steps\.digests\.outputs\.dockerhub_digest/);
  assert.match(step, /optional-client-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}-\$\{\{ matrix\.arch \}\}/);
  assert.match(step, /bash tests\/validate_optional_docker_client\.sh "\$IMAGE" "\$NAME_PREFIX"/);
});

test('optional validator shell syntax parses', () => {
  const result = spawnSync(bashPath, ['-n', validatorPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
