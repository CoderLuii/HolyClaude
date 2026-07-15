import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULT_CLOUDCLI_ROOT = '/usr/local/lib/node_modules/@cloudcli-ai/cloudcli';
const inputPath = process.argv[2] || DEFAULT_CLOUDCLI_ROOT;
const knownUnsupportedVersions = new Set(['1.36.0', '1.36.1', '1.36.2']);

let cleanupPath = null;

function unpackIfNeeded(candidatePath) {
  if (statSync(candidatePath).isFile()) {
    const unpackRoot = mkdtempSync(path.join(tmpdir(), 'holyclaude-cloudcli-account-'));
    execFileSync('tar', ['-xzf', candidatePath, '-C', unpackRoot]);
    cleanupPath = unpackRoot;
    return path.join(unpackRoot, 'package');
  }
  return candidatePath;
}

function readOptional(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function readPackageJson(root) {
  try {
    return JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch {
    return {};
  }
}

function readClientAssets(root) {
  const assetsDir = path.join(root, 'dist/assets');
  if (!existsSync(assetsDir)) {
    return '';
  }

  return readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => readOptional(path.join(assetsDir, name)))
    .join('\n');
}

function includesAll(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

const root = unpackIfNeeded(inputPath);
const packageJson = readPackageJson(root);
const sourceAuthRoute = readOptional(path.join(root, 'server/routes/auth.js'));
const runtimeAuthRoute = readOptional(path.join(root, 'dist-server/server/routes/auth.js'));
const sourceAuthMiddleware = readOptional(path.join(root, 'server/middleware/auth.js'));
const runtimeAuthMiddleware = readOptional(path.join(root, 'dist-server/server/middleware/auth.js'));
const sourceUsersRepo = readOptional(path.join(root, 'server/modules/database/repositories/users.ts'));
const runtimeUsersRepo = readOptional(path.join(root, 'dist-server/server/modules/database/repositories/users.js'));
const clientApi = readOptional(path.join(root, 'src/utils/api.js'));
const clientAssets = readClientAssets(root);

const routeMarkers = ["router.post('/change-password'", 'auth_token_generation', 'Current password is incorrect'];
const middlewareMarkers = ['authTokenGeneration', 'authenticateWebSocket', 'Invalid token. Please sign in again.'];
const repositoryMarkers = ['getUserAuthById', 'updatePasswordHash'];
const clientMarkers = ['/api/auth/change-password', 'Change Password', 'Logout removes the saved browser token'];

const checks = {
  sourceRoute: includesAll(sourceAuthRoute, routeMarkers),
  runtimeRoute: includesAll(runtimeAuthRoute, routeMarkers),
  sourceMiddleware: includesAll(sourceAuthMiddleware, middlewareMarkers),
  runtimeMiddleware: includesAll(runtimeAuthMiddleware, middlewareMarkers),
  sourceUsersRepo: includesAll(sourceUsersRepo, repositoryMarkers),
  runtimeUsersRepo: includesAll(runtimeUsersRepo, repositoryMarkers),
  clientApi: clientApi === '' || clientApi.includes('/api/auth/change-password'),
  clientAssets: includesAll(clientAssets, clientMarkers),
  bridgeMarkers: sourceAuthRoute.includes('HOLYCLAUDE_ACCOUNT_MANAGEMENT_BRIDGE')
    || runtimeAuthRoute.includes('HOLYCLAUDE_ACCOUNT_MANAGEMENT_BRIDGE'),
};

const complete = checks.sourceRoute
  && checks.runtimeRoute
  && checks.sourceMiddleware
  && checks.runtimeMiddleware
  && checks.sourceUsersRepo
  && checks.runtimeUsersRepo
  && checks.clientApi
  && checks.clientAssets;

let state;
let ok;
if (complete && checks.bridgeMarkers) {
  state = 'holyclaude-bridge-complete';
  ok = true;
} else if (complete && !checks.bridgeMarkers) {
  state = 'upstream-complete';
  ok = true;
} else if (!Object.values({
  sourceRoute: checks.sourceRoute,
  runtimeRoute: checks.runtimeRoute,
  sourceMiddleware: checks.sourceMiddleware,
  runtimeMiddleware: checks.runtimeMiddleware,
  clientAssets: checks.clientAssets,
}).some(Boolean) && knownUnsupportedVersions.has(packageJson.version)) {
  state = 'unsupported-known';
  ok = false;
} else {
  state = 'partial-or-drifted';
  ok = false;
}

const result = {
  state,
  ok,
  package: packageJson.name || null,
  version: packageJson.version || null,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (cleanupPath) {
  rmSync(cleanupPath, { recursive: true, force: true });
}
if (!ok) {
  process.exit(1);
}
