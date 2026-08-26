import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function schemaTarget(rootSchema, reference) {
  if (!reference.startsWith('#/')) {
    throw new Error(`unsupported schema reference: ${reference}`);
  }
  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], rootSchema);
}

function valueType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function validateSchema(value, schema, rootSchema, path) {
  if (schema.$ref) {
    const target = schemaTarget(rootSchema, schema.$ref);
    if (!target) throw new Error(`${path}: unresolved schema reference ${schema.$ref}`);
    validateSchema(value, target, rootSchema, path);
    return;
  }

  if (Object.hasOwn(schema, 'const') && !Object.is(value, schema.const)) {
    throw new Error(`${path}: must equal ${JSON.stringify(schema.const)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    throw new Error(`${path}: must be one of ${schema.enum.join(', ')}`);
  }
  if (schema.type && valueType(value) !== schema.type) {
    throw new Error(`${path}: must be ${schema.type}`);
  }

  if (schema.type === 'object') {
    for (const property of schema.required ?? []) {
      if (!Object.hasOwn(value, property)) {
        throw new Error(`${path}: missing required property ${property}`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const property of Object.keys(value)) {
        if (!Object.hasOwn(schema.properties ?? {}, property)) {
          throw new Error(`${path}: unknown property ${property}`);
        }
      }
    }
    for (const [property, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, property)) {
        validateSchema(value[property], childSchema, rootSchema, `${path}.${property}`);
      }
    }
  }

  if (schema.type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      throw new Error(`${path}: must contain at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      throw new Error(`${path}: must contain at most ${schema.maxItems} items`);
    }
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
      throw new Error(`${path}: items must be unique`);
    }
    value.forEach((item, index) => validateSchema(item, schema.items, rootSchema, `${path}[${index}]`));
  }

  if (schema.type === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      throw new Error(`${path}: must contain at least ${schema.minLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      throw new Error(`${path}: must match ${schema.pattern}`);
    }
    if (schema.format === 'uri') {
      let url;
      try {
        url = new URL(value);
      } catch {
        throw new Error(`${path}: must be a valid HTTPS URL`);
      }
      if (url.protocol !== 'https:') {
        throw new Error(`${path}: must be a valid HTTPS URL`);
      }
    }
  }

  if (schema.type === 'integer') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      throw new Error(`${path}: must be at least ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      throw new Error(`${path}: must be at most ${schema.maximum}`);
    }
  }
}

const supportedSchemaKeywords = new Set([
  '$schema',
  '$id',
  '$ref',
  'title',
  'type',
  'required',
  'additionalProperties',
  'properties',
  '$defs',
  'const',
  'enum',
  'pattern',
  'format',
  'minLength',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
  'uniqueItems',
  'items',
]);

function assertSupportedSchema(schema, path = 'schema') {
  for (const [keyword, value] of Object.entries(schema)) {
    if (!supportedSchemaKeywords.has(keyword)) {
      throw new Error(`${path}: unsupported schema keyword ${keyword}`);
    }
    if (keyword === 'format' && value !== 'uri') {
      throw new Error(`${path}: unsupported schema format ${value}`);
    }
    if (keyword === 'properties' || keyword === '$defs') {
      for (const [name, child] of Object.entries(value)) {
        assertSupportedSchema(child, `${path}.${keyword}.${name}`);
      }
    } else if (keyword === 'items' && value && typeof value === 'object') {
      assertSupportedSchema(value, `${path}.items`);
    }
  }
}

function rejectDuplicates(items, key, label) {
  const values = items.map((item) => item[key]);
  if (new Set(values).size !== values.length) {
    throw new Error(`product facts: duplicate ${label}`);
  }
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

export function validateProductFacts(facts, schema) {
  assertSupportedSchema(schema);
  validateSchema(facts, schema, schema, 'product facts');
  rejectDuplicates(facts.aiClis, 'id', 'CLI id');
  rejectDuplicates(facts.aiClis, 'command', 'CLI command');
  rejectDuplicates(facts.ports, 'id', 'port id');
  rejectDuplicates(facts.features, 'id', 'feature id');

  if (!sameMembers(facts.variants, ['full', 'slim'])) {
    throw new Error('product facts: variants must be full and slim');
  }
  if (!sameMembers(facts.platforms, ['linux/amd64', 'linux/arm64'])) {
    throw new Error('product facts: platforms must be linux/amd64 and linux/arm64');
  }
  if (facts.release.tag !== `v${facts.release.dockerVersion}`) {
    throw new Error('product facts: release tag and Docker version differ');
  }

  const common = facts.aiClis.filter((cli) => sameMembers(cli.variants, ['full', 'slim']));
  const fullOnly = facts.aiClis.filter((cli) => sameMembers(cli.variants, ['full']));
  if (common.length !== 5 || fullOnly.length !== 3) {
    throw new Error('product facts: expected 5 common CLIs and 3 full-only CLIs');
  }
  const expectedClis = new Map([
    ['claude-code', { name: 'Claude Code', command: 'claude', variants: ['full', 'slim'] }],
    ['gemini-cli', { name: 'Gemini CLI', command: 'gemini', variants: ['full', 'slim'] }],
    ['openai-codex', { name: 'OpenAI Codex', command: 'codex', variants: ['full', 'slim'] }],
    ['cursor-agent', { name: 'Cursor Agent', command: 'cursor', variants: ['full', 'slim'] }],
    ['taskmaster-ai', { name: 'TaskMaster AI', command: 'task-master', variants: ['full', 'slim'] }],
    ['junie', { name: 'Junie', command: 'junie', variants: ['full'] }],
    ['opencode', { name: 'OpenCode', command: 'opencode', variants: ['full'] }],
    ['pi-coding-agent', { name: 'Pi Coding Agent', command: 'pi', variants: ['full'] }],
  ]);
  for (const cli of facts.aiClis) {
    const expected = expectedClis.get(cli.id);
    if (!expected || cli.name !== expected.name || cli.command !== expected.command || !sameMembers(cli.variants, expected.variants)) {
      throw new Error(`product facts: ${cli.id} has incorrect identity or variant membership`);
    }
  }
  if (facts.cloudcli.name !== 'CloudCLI' || facts.cloudcli.command !== 'cloudcli' || !sameMembers(facts.cloudcli.variants, ['full', 'slim'])) {
    throw new Error('product facts: CloudCLI has incorrect identity or variant membership');
  }
  if (facts.registries.dockerHub.repository !== 'coderluii/holyclaude'
    || facts.registries.dockerHub.url !== 'https://hub.docker.com/r/coderluii/holyclaude'
    || facts.registries.ghcr.repository !== 'ghcr.io/coderluii/holyclaude'
    || facts.registries.ghcr.url !== 'https://github.com/CoderLuii/HolyClaude/pkgs/container/holyclaude') {
    throw new Error('product facts: registry coordinates are incorrect');
  }
  if (facts.licenses.source !== 'https://github.com/CoderLuii/HolyClaude/blob/master/LICENSE'
    || facts.licenses.thirdPartyNotices !== 'https://github.com/CoderLuii/HolyClaude/blob/master/THIRD-PARTY-NOTICES') {
    throw new Error('product facts: license links are incorrect');
  }
  if (!sameMembers(facts.ports.map((port) => port.id), ['cloudcli', 'codex-auth-callback', 'ssh', 'mosh'])) {
    throw new Error('product facts: unexpected port inventory');
  }
  const expectedPorts = new Map([
    ['cloudcli', { protocol: 'tcp', start: 3001, end: 3001, publishedByDefault: true, defaultBinding: '127.0.0.1' }],
    ['codex-auth-callback', { protocol: 'tcp', start: 1455, end: 1455, publishedByDefault: false, defaultBinding: '127.0.0.1' }],
    ['ssh', { protocol: 'tcp', start: 22, end: 22, publishedByDefault: false, defaultBinding: '127.0.0.1' }],
    ['mosh', { protocol: 'udp', start: 60000, end: 60010, publishedByDefault: false, defaultBinding: '127.0.0.1' }],
  ]);
  for (const port of facts.ports) {
    const expected = expectedPorts.get(port.id);
    if (!expected || Object.entries(expected).some(([key, value]) => port[key] !== value)) {
      throw new Error(`product facts: ${port.id} has incorrect port settings`);
    }
  }
  if (!sameMembers(facts.features.map((feature) => feature.id), [
    'rootless-podman',
    'ssh',
    'mosh',
    'base-path',
    'browser-use',
    'account-management',
    'project-stats-plugin',
    'web-terminal-plugin',
    'apprise-notifications',
    'multi-arch',
  ])) {
    throw new Error('product facts: unexpected feature inventory');
  }
  if (!sameMembers(facts.notifications.integrations, ['claude-code', 'codex-cli', 'gemini-cli', 'cloudcli-codex'])) {
    throw new Error('product facts: unexpected notification inventory');
  }
  if (facts.ports.some((port) => port.start > port.end)) {
    throw new Error('product facts: port range start must not exceed end');
  }
}

export function validateExpectedRelease(facts, expectedRelease) {
  if (expectedRelease && facts.release.tag !== expectedRelease) {
    throw new Error(`product facts: release ${facts.release.tag} does not match expected ${expectedRelease}`);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

export function activeYaml(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trimStart().startsWith('#'))
    .map((line) => line.replace(/\s+#.*$/, ''))
    .join('\n');
}

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`source section is missing: ${startMarker}`);
  return source.slice(start, end);
}

export function verifyProductSources(facts, root) {
  const dockerfile = readFileSync(join(root, 'Dockerfile'), 'utf8');
  const compose = readFileSync(join(root, 'docker-compose.yaml'), 'utf8');
  const fullCompose = readFileSync(join(root, 'docker-compose.full.yaml'), 'utf8');
  const podmanCompose = readFileSync(join(root, 'docker-compose.podman-rootless.yaml'), 'utf8');
  const workflow = readFileSync(join(root, '.github/workflows/docker-publish.yml'), 'utf8');
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const settings = readFileSync(join(root, 'config/settings.json'), 'utf8');
  const bootstrap = readFileSync(join(root, 'scripts/bootstrap.sh'), 'utf8');
  const entrypoint = readFileSync(join(root, 'scripts/entrypoint.sh'), 'utf8');
  const notify = readFileSync(join(root, 'scripts/notify.py'), 'utf8');
  const moshWrapper = readFileSync(join(root, 'scripts/holyclaude-mosh-server'), 'utf8');
  const activeComposeFiles = [compose, fullCompose, podmanCompose].map(activeYaml);

  requireMatch(dockerfile, new RegExp(`ARG HOLYCLAUDE_VERSION=${escapeRegex(facts.release.dockerVersion)}(?:\\r?\\n)`), 'HolyClaude release does not match Dockerfile');
  requireMatch(dockerfile, /^LABEL org\.opencontainers\.image\.version=\$\{HOLYCLAUDE_VERSION\}$/m, 'HolyClaude OCI version label is not bound to HOLYCLAUDE_VERSION');
  requireMatch(dockerfile, new RegExp(`ARG CLOUDCLI_VERSION=${escapeRegex(facts.cloudcli.version)}(?:\\r?\\n)`), 'CloudCLI version does not match Dockerfile');

  const versionAnchors = new Map([
    ['claude-code', `ARG CLAUDE_CODE_VERSION=${facts.aiClis.find((cli) => cli.id === 'claude-code').version}`],
    ['cursor-agent', `ARG CURSOR_BUILD_ID=${facts.aiClis.find((cli) => cli.id === 'cursor-agent').version}`],
    ['junie', `ARG JUNIE_VERSION=${facts.aiClis.find((cli) => cli.id === 'junie').version}`],
    ['gemini-cli', `@google/gemini-cli@${facts.aiClis.find((cli) => cli.id === 'gemini-cli').version}`],
    ['openai-codex', `@openai/codex@${facts.aiClis.find((cli) => cli.id === 'openai-codex').version}`],
    ['taskmaster-ai', `task-master-ai@${facts.aiClis.find((cli) => cli.id === 'taskmaster-ai').version}`],
    ['opencode', `opencode-ai@${facts.aiClis.find((cli) => cli.id === 'opencode').version}`],
    ['pi-coding-agent', `@earendil-works/pi-coding-agent@${facts.aiClis.find((cli) => cli.id === 'pi-coding-agent').version}`],
  ]);
  for (const [id, anchor] of versionAnchors) {
    if (!dockerfile.includes(anchor)) throw new Error(`${id} version does not match Dockerfile`);
  }

  const commonStart = dockerfile.indexOf('# ---------- AI CLI providers ----------');
  const fullOnlyStart = dockerfile.indexOf('# ---------- Junie CLI (full only) ----------');
  const cloudcliStart = dockerfile.indexOf('ARG CLOUDCLI_VERSION=');
  if (commonStart < 0 || fullOnlyStart < commonStart || cloudcliStart < fullOnlyStart) {
    throw new Error('AI CLI install regions are missing or out of order');
  }
  const commonInstallRegion = dockerfile.slice(commonStart, fullOnlyStart);
  const fullOnlyInstallRegion = dockerfile.slice(fullOnlyStart, cloudcliStart);
  if (commonInstallRegion.includes('$VARIANT')) {
    throw new Error('common CLI install region must not be variant-gated');
  }
  const commonInstallAnchors = new Map([
    ['gemini-cli', versionAnchors.get('gemini-cli')],
    ['openai-codex', versionAnchors.get('openai-codex')],
    ['cursor-agent', 'test "$(cursor-agent --version)" = "$CURSOR_BUILD_ID"'],
    ['taskmaster-ai', versionAnchors.get('taskmaster-ai')],
  ]);
  for (const [id, anchor] of commonInstallAnchors) {
    if (!commonInstallRegion.includes(anchor)) {
      throw new Error(`${id} is not installed in the common CLI region`);
    }
  }
  if (!dockerfile.slice(0, commonStart).includes('bash /tmp/claude-install.sh "$CLAUDE_CODE_VERSION"')) {
    throw new Error('claude-code is not installed before the variant-specific CLI region');
  }
  const fullOnlyInstallAnchors = new Map([
    ['junie', 'JUNIE_ARCHIVE="junie-release-${JUNIE_VERSION}'],
    ['opencode', versionAnchors.get('opencode')],
    ['pi-coding-agent', versionAnchors.get('pi-coding-agent')],
  ]);
  for (const [id, anchor] of fullOnlyInstallAnchors) {
    if (!fullOnlyInstallRegion.includes(anchor)) {
      throw new Error(`${id} is not installed in the full-only CLI region`);
    }
  }
  const fullOnlySections = [
    section(dockerfile, '# ---------- Junie CLI (full only) ----------', '# ---------- OpenCode CLI (full only) ----------'),
    section(dockerfile, '# ---------- OpenCode CLI (full only) ----------', '# ---------- Pi Coding Agent (full only) ----------'),
    section(dockerfile, '# ---------- Pi Coding Agent (full only) ----------', 'ARG CLOUDCLI_VERSION='),
  ];
  for (const source of fullOnlySections) {
    requireMatch(source, /^\s*RUN if \[ "\$VARIANT" = "full" \]; then/m, 'full-only CLI install is not gated by VARIANT=full');
  }
  const cloudcliInstallRegion = section(dockerfile, 'ARG CLOUDCLI_VERSION=', '# ---------- CloudCLI plugins (');
  requireMatch(
    cloudcliInstallRegion,
    /tar -xzf \/tmp\/vendor\/cloudcli-ai-cloudcli\.tgz[\s\S]+npm ci --omit=dev[\s\S]+ln -s "\$CLOUDCLI_ROOT\/dist-server\/server\/modules\/cli\/cli\.js" \/usr\/local\/bin\/cloudcli/,
    'CloudCLI exact production install is missing',
  );
  if (cloudcliInstallRegion.includes('$VARIANT')) {
    throw new Error('CloudCLI install must be shared by full and slim variants');
  }

  const chromium = facts.browser.chromium.version;
  requireMatch(dockerfile, new RegExp(`ARG CHROMIUM_DEBIAN_VERSION=${escapeRegex(chromium)}-`), 'Chromium version does not match Dockerfile');
  for (const binding of ['playwright@', 'playwright==']) {
    if (!dockerfile.includes(`${binding}${facts.browser.playwright.version}`)) {
      throw new Error('Playwright version does not match Dockerfile');
    }
  }

  requireMatch(activeComposeFiles[0], /^\s*-\s*"127\.0\.0\.1:3001:3001"/m, 'CloudCLI port does not match Compose');
  requireMatch(activeComposeFiles[1], /^\s*-\s*"127\.0\.0\.1:\$\{HOLYCLAUDE_HOST_PORT:-3001\}:3001"/m, 'CloudCLI port does not match full Compose');
  requireMatch(fullCompose, /^\s*#\s*-\s*"127\.0\.0\.1:1455:1455"/m, 'codex-auth-callback port does not match full Compose');
  requireMatch(fullCompose, /^\s*#\s*-\s*"127\.0\.0\.1:2222:22"/m, 'ssh port does not match full Compose');
  requireMatch(fullCompose, /^\s*#\s*-\s*"127\.0\.0\.1:60000-60010:60000-60010\/udp"/m, 'mosh port does not match full Compose');
  for (const source of activeComposeFiles) {
    if (!source.includes(`shm_size: ${facts.capabilityProfile.shmSize}`)) {
      throw new Error('shm_size does not match Compose');
    }
    for (const capability of facts.capabilityProfile.capAdd) {
      if (!source.includes(`- ${capability}`)) throw new Error(`${capability} does not match Compose`);
    }
    for (const option of facts.capabilityProfile.securityOpt) {
      if (!source.includes(`- ${option}`)) throw new Error(`${option} does not match Compose`);
    }
  }

  const featureAnchors = {
    'rootless-podman': activeYaml(podmanCompose).includes('userns_mode: "keep-id:') && entrypoint.includes('RUNNING_AS_ROOT'),
    ssh: entrypoint.includes('configure_remote_shell()') && entrypoint.includes('SSHD_MARKER=') && existsSync(join(root, 's6-overlay/s6-rc.d/sshd/run')),
    mosh: entrypoint.includes('HOLYCLAUDE_MOSH_UDP_START') && moshWrapper.includes('mosh-server'),
    'base-path': dockerfile.includes('patch-cloudcli-base-path.mjs') && existsSync(join(root, 'scripts/patch-cloudcli-base-path.mjs')),
    'browser-use': dockerfile.includes('patch-cloudcli-browser-runtime.mjs'),
    'account-management': dockerfile.includes('verify-cloudcli-account-management-support.mjs'),
    'project-stats-plugin': dockerfile.includes('cloudcli-plugin-starter.git'),
    'web-terminal-plugin': dockerfile.includes('cloudcli-plugin-terminal.git'),
    'apprise-notifications': dockerfile.includes('patch-cloudcli-apprise-notifications.mjs'),
    'multi-arch': workflow.includes('arch: amd64') && workflow.includes('arch: arm64'),
  };
  for (const feature of facts.features) {
    if (!featureAnchors[feature.id]) throw new Error(`${feature.id} is not anchored in repository sources`);
  }
  if (!workflow.includes(`DOCKERHUB_IMAGE: ${facts.registries.dockerHub.repository}`)
    || !workflow.includes(`GHCR_IMAGE: ${facts.registries.ghcr.repository}`)) {
    throw new Error('registry coordinates do not match the release workflow');
  }
  if (!activeComposeFiles[0].includes('./workspace:/workspace')
    || !activeComposeFiles[0].includes('./data/claude:/home/claude/.claude')) {
    throw new Error('shared workspace and credential context do not match Compose');
  }

  if (!notify.includes(`FLAG_FILE = "/home/claude/.claude/notify-on"`) || facts.notifications.marker !== '~/.claude/notify-on') {
    throw new Error('notification marker does not match notify.py');
  }
  if (!readme.includes(facts.notifications.marker)) {
    throw new Error('notification marker is not documented');
  }
  const notificationAnchors = {
    'claude-code': settings.includes('/usr/local/bin/notify.py'),
    'codex-cli': bootstrap.includes('"command": "/usr/local/bin/notify.py stop"') && bootstrap.includes('$CLAUDE_HOME/.codex/hooks.json'),
    'gemini-cli': bootstrap.includes('"command": "/usr/local/bin/notify.py stop"') && bootstrap.includes('$CLAUDE_HOME/.gemini/settings.json'),
    'cloudcli-codex': dockerfile.includes('patch-cloudcli-apprise-notifications.mjs'),
  };
  for (const integration of facts.notifications.integrations) {
    if (!notificationAnchors[integration]) {
      throw new Error(`${integration} notification integration is not anchored in repository sources`);
    }
  }
  for (const path of ['LICENSE', 'THIRD-PARTY-NOTICES']) {
    readFileSync(join(root, path));
  }
}

function parseArgs(argv) {
  const options = { root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!['--root', '--contract', '--schema', '--release'].includes(name) || !value) {
      throw new Error(`unknown or incomplete argument: ${name}`);
    }
    options[name.slice(2)] = value;
    index += 1;
  }
  options.root = resolve(options.root);
  options.contract = isAbsolute(options.contract ?? '') ? options.contract : join(options.root, options.contract ?? 'contracts/product-facts.json');
  options.schema = isAbsolute(options.schema ?? '') ? options.schema : join(options.root, options.schema ?? 'contracts/product-facts.v1.schema.json');
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const facts = loadJson(options.contract);
  const schema = loadJson(options.schema);
  validateProductFacts(facts, schema);
  validateExpectedRelease(facts, options.release);
  verifyProductSources(facts, options.root);
  process.stdout.write(`Verified ${facts.release.tag} product facts.\n`);
}

if (resolve(process.argv[1] ?? '') === modulePath) {
  main();
}
