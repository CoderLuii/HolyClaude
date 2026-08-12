import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const ffmpegBuilder = readFileSync('scripts/build-ffmpeg-security-backport.sh', 'utf8');
const cryptographyBuilder = readFileSync('scripts/build-cryptography-security-backport.sh', 'utf8');
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');
const productionRetryArguments = [
  '--disable',
  '--retry',
  '8',
  '--retry-all-errors',
  '--retry-max-time',
  '300',
  '--remove-on-error',
  '--connect-timeout',
  '15',
  '--max-time',
  '300',
];
const productionCurlPrefix = `curl ${productionRetryArguments.join(' ')} -fsSL -o`;
const workflowCurlPrefix = `curl ${productionRetryArguments.join(' ')} -fsSL -O`;

function runCurl(url, output, { retryMaxTime = '10', maxTime = '2' } = {}) {
  const executable = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const arguments_ = [
    '--disable',
    '--retry',
    '8',
    '--retry-all-errors',
    '--retry-max-time',
    retryMaxTime,
    '--remove-on-error',
    '--noproxy',
    '*',
    '--connect-timeout',
    '1',
    '--max-time',
    maxTime,
    '-fsSL',
    '-o',
    output,
    url,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, { windowsHide: true });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (status) => resolve({ status, stderr }));
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test('all checksum-bound direct-file downloads use the bounded retry policy and fail closed', () => {
  const s6Block = dockerfile.match(/# ---------- s6-overlay v3 \(multi-arch\) ----------[\s\S]*?# ---------- System packages \(always installed\) ----------/)?.[0];
  const fzfBlock = dockerfile.match(/# ---------- fzf \(official multi-arch release\) ----------[\s\S]*?RUN rm -f \/etc\/ssh\/ssh_host_/)?.[0];
  assert.ok(s6Block, 's6 download block must exist');
  assert.ok(fzfBlock, 'fzf download block must exist');

  const s6CurlCount = s6Block.split(productionCurlPrefix).length - 1;
  const fzfCurlCount = fzfBlock.split(productionCurlPrefix).length - 1;
  assert.equal(s6CurlCount, 2, 'the two looped s6 curl commands must carry the retry policy');
  assert.equal(fzfCurlCount, 2, 'the fzf archive and checksum commands must carry the retry policy');
  assert.match(s6Block, /for S6_ASSET in noarch "\$S6_ARCH"; do/);

  const dockerfileTemplates = [
    `${productionCurlPrefix} "/tmp/s6-overlay-\${S6_ASSET}.tar.xz"`,
    `${productionCurlPrefix} "/tmp/s6-overlay-\${S6_ASSET}.tar.xz.sha256"`,
    `${productionCurlPrefix} "/tmp/\${FZF_ASSET}"`,
    `${productionCurlPrefix} /tmp/fzf-checksums.txt`,
    `${productionCurlPrefix} /tmp/azure-cli-install.sh`,
    `${productionCurlPrefix} "/tmp/\${GITHUB_CLI_PACKAGE}"`,
    `${productionCurlPrefix} /tmp/claude-install.sh`,
    `${productionCurlPrefix} /tmp/node-tar.tgz`,
    `${productionCurlPrefix} "/tmp/setuptools-\${SETUPTOOLS_VERSION}-py3-none-any.whl"`,
    `${productionCurlPrefix} /tmp/cursor-agent.tar.gz`,
    `${productionCurlPrefix} "/tmp/\${JUNIE_ARCHIVE}"`,
    `${productionCurlPrefix} "$archive"`,
  ];
  for (const expected of dockerfileTemplates) {
    assert.ok(dockerfile.includes(expected), `missing retry policy on ${expected}`);
  }
  assert.equal(dockerfile.split(`${productionCurlPrefix} "$archive"`).length - 1, 2);
  const dockerfileTemplateCount = dockerfile.split(productionCurlPrefix).length - 1;
  const ffmpegTemplateCount = ffmpegBuilder.split(productionCurlPrefix).length - 1;
  const cryptographyTemplateCount = cryptographyBuilder.split(productionCurlPrefix).length - 1;
  assert.equal(dockerfileTemplateCount, 13);
  assert.equal(ffmpegTemplateCount, 1);
  assert.equal(cryptographyTemplateCount, 1);
  assert.equal(dockerfileTemplateCount + ffmpegTemplateCount + cryptographyTemplateCount, 15);

  const replaceNodeDownloads = (dockerfile.match(/^\s+replace_node_module \S+/gm) ?? []).length;
  const replaceNestedDownloads = (dockerfile.match(/^\s+replace_nested_node_module \S+/gm) ?? []).length;
  const ffmpegDownloads = (ffmpegBuilder.match(/^download '/gm) ?? []).length;
  assert.equal(replaceNodeDownloads, 14);
  assert.equal(replaceNestedDownloads, 4);
  assert.equal(ffmpegDownloads, 4);
  const logicalDownloads = (s6CurlCount * 2) + fzfCurlCount + 7
    + replaceNodeDownloads + replaceNestedDownloads + ffmpegDownloads + 1;
  assert.equal(logicalDownloads, 36);

  const checksumDownloadSources = `${dockerfile}\n${ffmpegBuilder}\n${cryptographyBuilder}`;
  assert.doesNotMatch(checksumDownloadSources, /--retry-delay/);
  assert.doesNotMatch(checksumDownloadSources, /curl -fsSL(?: --retry 3)?/);
  assert.match(s6Block, /if ! \{[\s\S]*?sha256sum -c -;\s*\\\r?\n\s*\}; then/);
  assert.match(s6Block, /rm -f "\/tmp\/s6-overlay-\$\{S6_ASSET\}\.tar\.xz" "\/tmp\/s6-overlay-\$\{S6_ASSET\}\.tar\.xz\.sha256";\s*\\\r?\n\s*exit 1/);
  assert.match(s6Block, /rm -f \/tmp\/s6-overlay-noarch\.tar\.xz \/tmp\/s6-overlay-noarch\.tar\.xz\.sha256 "\/tmp\/s6-overlay-\$\{S6_ARCH\}\.tar\.xz" "\/tmp\/s6-overlay-\$\{S6_ARCH\}\.tar\.xz\.sha256"/);
  assert.match(fzfBlock, /fzf_\$\{FZF_VERSION\}_checksums\.txt[\s\S]*?test "\$\(grep -F[\s\S]*?sha256sum -c -/);
  assert.match(ffmpegBuilder, /download 'ffmpeg_5\.1\.9-0\+deb12u1\.debian\.tar\.xz'[\s\S]*?printf '%s  %s\\n'[\s\S]*?\| sha256sum -c -/);
  assert.match(cryptographyBuilder, /CRYPTOGRAPHY_SOURCE_URL[\s\S]*?printf '%s  %s\\n'[\s\S]*?\| sha256sum -c -/);
});

test('runtime probes and checksum-verified installer internals remain outside download retries', () => {
  assert.match(dockerfile, /CMD curl -sf http:\/\/localhost:3001\/ \|\| exit 1/);
  assert.doesNotMatch(dockerfile, /CMD curl --disable/);
  assert.match(dockerfile, /bash \/tmp\/azure-cli-install\.sh/);
  assert.match(dockerfile, /bash \/tmp\/claude-install\.sh "\$CLAUDE_CODE_VERSION"/);
});

test('workflow scanner downloads use the same bounded policy before checksum validation', () => {
  const scannerBlock = workflow.match(/- name: Install pinned security scanners[\s\S]*?- name: Generate digest-bound security evidence/)?.[0];
  assert.ok(scannerBlock, 'scanner install block must exist');
  assert.equal(scannerBlock.split(workflowCurlPrefix).length - 1, 3);
  assert.ok(scannerBlock.includes(`${workflowCurlPrefix} "\${base}/\${archive}"`));
  assert.ok(scannerBlock.includes(`${workflowCurlPrefix} "\${base}/\${tool}_\${version}_checksums.txt"`));
  assert.ok(scannerBlock.includes(`${workflowCurlPrefix} "https://github.com/CycloneDX/sbom-utility/releases/download/v\${SBOM_UTILITY_VERSION}/\${sbom_utility_archive}"`));
  const scannerInvocations = (scannerBlock.match(/^\s+install_scanner (syft|grype) /gm) ?? []).length;
  assert.equal(scannerInvocations, 2);
  assert.equal((2 * scannerInvocations) + 1, 5);
  assert.doesNotMatch(scannerBlock, /--retry-delay|curl -fsSLO/);
  assert.match(scannerBlock, /checksums\.txt"\s*\r?\n\s+grep -F[\s\S]*?sha256sum -c -/);
  assert.match(scannerBlock, /sbom_utility_archive}"\s*\r?\n\s+printf '%s  %s\\n'[\s\S]*?sha256sum -c -/);
});

test('curl recovers from connection reset and HTTP 503 with default backoff', async () => {
  const requestTimes = [];
  const payload = Buffer.from('retry recovered\n');
  const server = createServer((request, response) => {
    requestTimes.push(Date.now());
    if (requestTimes.length === 1) {
      request.socket.resetAndDestroy();
      return;
    }
    if (requestTimes.length === 2) {
      response.writeHead(503, { 'Content-Length': '0' });
      response.end();
      return;
    }
    response.writeHead(200, { 'Content-Length': String(payload.length) });
    response.end(payload);
  });
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-download-retry-'));
  const output = join(root, 'asset');

  try {
    await listen(server);
    const { port } = server.address();
    const result = await runCurl(`http://127.0.0.1:${port}/asset`, output);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(output), payload);
    assert.equal(requestTimes.length, 3);
    assert.ok(requestTimes[1] - requestTimes[0] >= 800, 'first default backoff must be at least one second');
    assert.ok(requestTimes[2] - requestTimes[1] >= 1800, 'second default backoff must be at least two seconds');
    assert.match(result.stderr, /curl: \(56\)/);
    assert.match(result.stderr, /curl: \(22\).*503/);
  } finally {
    await close(server);
    rmSync(root, { recursive: true, force: true });
  }
});

test('checksum mismatch is rejected after one successful request without retry', async () => {
  let requestCount = 0;
  const payload = Buffer.from('wrong payload\n');
  const expectedSha256 = createHash('sha256').update('expected payload\n').digest('hex');
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'Content-Length': String(payload.length) });
    response.end(payload);
  });
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-download-checksum-'));
  const output = join(root, 'asset');

  try {
    await listen(server);
    const { port } = server.address();
    const result = await runCurl(`http://127.0.0.1:${port}/asset`, output);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(output), true);
    assert.notEqual(createHash('sha256').update(readFileSync(output)).digest('hex'), expectedSha256);
    const checksum = spawnSync(
      process.execPath,
      ['-e', 'const { createHash } = require("node:crypto"); const { readFileSync } = require("node:fs"); process.exit(createHash("sha256").update(readFileSync(process.argv[1])).digest("hex") === process.argv[2] ? 0 : 1);', output, expectedSha256],
    );
    assert.notEqual(checksum.status, 0, 'checksum mismatch must reject the downloaded payload');
    assert.equal(requestCount, 1);
  } finally {
    await close(server);
    rmSync(root, { recursive: true, force: true });
  }
});

test('retry exhaustion is bounded and removes a partial output', async () => {
  let requestCount = 0;
  const partial = Buffer.from('partial');
  const server = createServer((_request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'Content-Length': String(partial.length + 32) });
    response.write(partial);
    response.destroy();
  });
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-download-exhaustion-'));
  const output = join(root, 'asset');

  try {
    await listen(server);
    const { port } = server.address();
    const started = Date.now();
    const result = await runCurl(`http://127.0.0.1:${port}/asset`, output, {
      retryMaxTime: '3',
      maxTime: '1',
    });
    const elapsed = Date.now() - started;
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(output), false);
    assert.ok(requestCount >= 2 && requestCount <= 3, `unexpected request count: ${requestCount}`);
    assert.ok(elapsed >= 2800 && elapsed < 6000, `unexpected retry window: ${elapsed}ms`);
    assert.match(result.stderr, /curl: \((18|52|56)\)/);
  } finally {
    await close(server);
    rmSync(root, { recursive: true, force: true });
  }
});
