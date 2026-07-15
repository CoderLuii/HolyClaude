import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildImage = 'node:26.5.0-bookworm-slim@sha256:2d49d876e96237d76de412761cf05dbfe5aee325cc4406a4d41d5824c5bb8beb';
const buildCommand = [
  'apt-get update >/dev/null',
  'apt-get install -y --no-install-recommends ca-certificates git build-essential python3 pkg-config >/dev/null',
  'npm install -g npm@11.17.0 >/dev/null',
  'node scripts/build-cloudcli-account-management-artifact.mjs',
].join(' && ');

execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '--platform',
    'linux/amd64',
    '--mount',
    `type=bind,src=${repoRoot},dst=/repo`,
    '--workdir',
    '/repo',
    '--env',
    'HOLYCLAUDE_CLOUDCLI_BUILD_IMAGE=' + buildImage,
    buildImage,
    'sh',
    '-lc',
    buildCommand,
  ],
  { stdio: 'inherit' },
);
