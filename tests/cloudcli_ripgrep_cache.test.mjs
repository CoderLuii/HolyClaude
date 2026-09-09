import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';

function toBashPath(path) {
  return path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

function cacheBlock() {
  const match = dockerfile.match(
    /: "BEGIN CLOUDCLI_RIPGREP_CACHE" && \\\r?\n([\s\S]*?)\r?\n\s*: "END CLOUDCLI_RIPGREP_CACHE"/,
  );
  assert.ok(match, 'Dockerfile must expose the exact CloudCLI ripgrep cache block');
  return match[1].replaceAll(/\\\r?\n\s*/g, ' ').replace(/\s*&&\s*\\?\s*$/, '');
}

function versionProbe() {
  const match = dockerfile.match(
    /: "BEGIN CLOUDCLI_RIPGREP_VERSION_PROBE" && \\\r?\n([\s\S]*?)\r?\n\s*: "END CLOUDCLI_RIPGREP_VERSION_PROBE"/,
  );
  assert.ok(match, 'Dockerfile must expose the exact CloudCLI ripgrep version probe');
  return match[1].replaceAll(/\\\r?\n\s*/g, ' ').replace(/\s*&&\s*\\?\s*$/, '');
}

function runCacheBlock({ arch, archive, expectedSha256 }) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-ripgrep-cache-'));
  const curlLog = join(root, 'curl.log');
  const curlStub = `curl() {
set -eu
destination=
url=
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) destination="$2"; shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done
mkdir -p "$(dirname "$destination")"
cp "$CURL_FIXTURE" "$destination"
printf '%s\n' "$url" > "$CURL_LOG"
}`;

  const result = spawnSync(bash, ['-eu', '-c', `${curlStub}\n${cacheBlock()}`], {
    encoding: 'utf8',
    env: {
      ...process.env,
      TARGETARCH: arch,
      CLOUDCLI_VSCODE_RIPGREP_PACKAGE_VERSION: '1.17.1',
      CLOUDCLI_RIPGREP_RELEASE_VERSION: '15.0.1',
      CLOUDCLI_RIPGREP_ARCHIVE_SHA256_AMD64: expectedSha256,
      CLOUDCLI_RIPGREP_ARCHIVE_SHA256_ARM64: expectedSha256,
      CLOUDCLI_RIPGREP_CACHE_ROOT: toBashPath(root),
      CURL_FIXTURE: toBashPath(archive),
      CURL_LOG: toBashPath(curlLog),
    },
    timeout: 10_000,
  });
  return { result, root, curlLog };
}

test('CloudCLI ripgrep cache uses the checksum-bound official asset for each supported architecture', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'holyclaude-ripgrep-fixture-'));
  const archive = join(fixtureRoot, 'ripgrep.tar.gz');
  writeFileSync(archive, 'reviewed-ripgrep-archive');
  const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');

  try {
    for (const [arch, target] of [
      ['amd64', 'x86_64-unknown-linux-musl'],
      ['arm64', 'aarch64-unknown-linux-musl'],
    ]) {
      const { result, root, curlLog } = runCacheBlock({ arch, archive, expectedSha256: sha256 });
      try {
        assert.equal(result.status, 0, `${arch}: ${result.stderr}`);
        const filename = `ripgrep-v15.0.1-${target}.tar.gz`;
        assert.equal(
          readFileSync(curlLog, 'utf8').trim(),
          `https://github.com/microsoft/ripgrep-prebuilt/releases/download/v15.0.1/${filename}`,
        );
        assert.equal(
          readFileSync(join(root, 'vscode-ripgrep-cache-1.17.1', filename), 'utf8'),
          'reviewed-ripgrep-archive',
        );
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('CloudCLI ripgrep production probe accepts only each official architecture-specific first line', () => {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-ripgrep-version-'));
  const binary = join(root, 'node_modules', '@vscode', 'ripgrep', 'bin', 'rg');
  mkdirSync(join(binary, '..'), { recursive: true });

  try {
    for (const [arch, output, expectedStatus] of [
      ['amd64', 'ripgrep 15.0.0 (rev 3a612f88b8)', 0],
      ['amd64', 'ripgrep 15.0.0', 1],
      ['amd64', 'ripgrep 15.0.0 (rev 0000000000)', 1],
      ['amd64', 'ripgrep 15.0.1 (rev 3a612f88b8)', 1],
      ['amd64', 'ripgrep 15.0.0 rev 3a612f88b8', 1],
      ['arm64', 'ripgrep 15.0.0', 0],
      ['arm64', 'ripgrep 15.0.0 (rev 3a612f88b8)', 1],
      ['arm64', 'ripgrep 15.0.0 (rev 0000000000)', 1],
      ['arm64', 'ripgrep 15.0.1', 1],
      ['arm64', 'ripgrep 14.1.1', 1],
      ['arm64', 'ripgrep 15.0.0 rev 3a612f88b8', 1],
      ['ppc64le', 'ripgrep 15.0.0', 1],
    ]) {
      writeFileSync(binary, `#!/bin/sh\nprintf '%s\\n' '${output}'\n`);
      chmodSync(binary, 0o755);
      const result = spawnSync(bash, ['-eu', '-c', versionProbe()], {
        encoding: 'utf8',
        env: {
          ...process.env,
          TARGETARCH: arch,
          CLOUDCLI_ROOT: toBashPath(root),
          CLOUDCLI_RIPGREP_BINARY_VERSION: '15.0.0',
          CLOUDCLI_RIPGREP_BINARY_REVISION_AMD64: '3a612f88b8',
        },
        timeout: 10_000,
      });
      assert.equal(result.status, expectedStatus, `${arch} ${output}: ${result.stderr}`);
      if (expectedStatus !== 0) {
        assert.match(result.stderr, /Unexpected CloudCLI ripgrep binary version|Unsupported TARGETARCH/);
      }
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('CloudCLI ripgrep cache rejects tampered bytes and unsupported architectures', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'holyclaude-ripgrep-negative-'));
  const archive = join(fixtureRoot, 'ripgrep.tar.gz');
  writeFileSync(archive, 'tampered-ripgrep-archive');

  try {
    let run = runCacheBlock({ arch: 'amd64', archive, expectedSha256: '0'.repeat(64) });
    try {
      assert.notEqual(run.result.status, 0);
      assert.match(run.result.stderr, /FAILED|did NOT match/);
    } finally {
      rmSync(run.root, { recursive: true, force: true });
    }

    run = runCacheBlock({ arch: 'ppc64le', archive, expectedSha256: '0'.repeat(64) });
    try {
      assert.notEqual(run.result.status, 0);
      assert.match(run.result.stderr, /Unsupported TARGETARCH: ppc64le/);
      assert.equal(existsSync(run.curlLog), false);
    } finally {
      rmSync(run.root, { recursive: true, force: true });
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
