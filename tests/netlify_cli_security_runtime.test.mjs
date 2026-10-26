import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const releaseInputs = readFileSync('tests/release_input_integrity.test.mjs', 'utf8');
const securityPatch = readFileSync('scripts/patch-global-node-security-dependencies.mjs', 'utf8');
const upstreamPolicy = JSON.parse(readFileSync('security/upstream-dependency-policy.json', 'utf8'));

test('Netlify CLI uses the checksum-bound upstream TOML security release', () => {
  assert.match(dockerfile, /netlify-cli@27\.14\.1/);
  assert.doesNotMatch(dockerfile, /netlify-cli@27\.5\.2/);
  assert.match(
    immutableInputs,
    /name: Netlify CLI[\s\S]*?version: 27\.14\.1[\s\S]*?archive-sha256: 33dfec563c056871d2562a4cac28159f98efa9b10769a2d99001bb89720a23af[\s\S]*?npm-integrity: "sha512-kbTpN5JhWUzm3jLgtqKj3O59mzmu\/ik4wbM9\/1IJMPX\/BCASQa\/rKR4fUJ76dy4u7PxAX\/0T5PfOK8Q\/tywfQQ=="/,
  );
  assert.match(releaseInputs, /'netlify-cli@27\.14\.1'/);
  assert.doesNotMatch(dockerfile, /rm -f[^\n]*local-functions-proxy/);
  assert.match(runtimeChecks, /test -x .*local-functions-proxy/);
});

test('full-image runtime validates Netlify parser upgrades and real Rust TOML reachability', () => {
  for (const expected of [
    "'netlify-cli': '27.14.1'",
    'const expectedRanges = {',
    'manifest.dependencies[name]',
    'semver.satisfies(installedVersion, declaredRange)',
    'npm --prefix /usr/local/lib/node_modules/netlify-cli ls toml cron-parser raw-body --all',
    'netlify_toml_cargo=ok',
    'netlify_toml_prototype_pollution=blocked',
    'netlify_toml_depth_limit=ok',
    'netlify_cron_parser=ok',
    'netlify_raw_body=ok',
    'netlify_rust_runtime=ok',
  ]) {
    assert.ok(runtimeChecks.includes(expected), 'runtime smoke should contain ' + expected);
  }
  assert.match(runtimeChecks, /toml: '\^4\.0\.0'/);
  assert.match(runtimeChecks, /'cron-parser': '\^5\.0\.0'/);
  assert.match(runtimeChecks, /'raw-body': '\^4\.0\.0'/);
  assert.match(runtimeChecks, /manifest\.dependencies\[name\]/);
  assert.match(runtimeChecks, /semver\.satisfies\(installedVersion, declaredRange\)/);
  assert.match(runtimeChecks, /acceptedCronVersions = \['5\.10\.1', '5\.10\.2'\]/);
  assert.match(runtimeChecks, /rejectedCronVersions = \['6\.0\.0', 'not-a-version'\]/);
  assert.match(runtimeChecks, /netlify_dependency_range_guard=ok/);
  assert.match(runtimeChecks, /netlify_dependency name=\$\{name\} range=\$\{declaredRange\} version=\$\{installedVersion\} satisfies=ok/);
  assert.doesNotMatch(runtimeChecks, /Netlify CLI cron-parser package version/);
  assert.match(runtimeChecks, /dist\/lib\/functions\/runtimes\/rust\/index\.js/);
  assert.match(runtimeChecks, /\[package\]\\nname = "secure_function"/);
  assert.match(runtimeChecks, /a\.b\.y\.__proto__\.__proto__/);
  assert.match(runtimeChecks, /instanceof RangeError/);
});

test('Netlify Sharp keeps the official dependency tree and runtime checks', () => {
  for (const expected of [
    'Netlify ipx sharp dependency',
    'Netlify sharp package version',
    'npm --prefix /usr/local/lib/node_modules/netlify-cli ls sharp --all',
    'netlify_sharp_png_transform=ok',
    'netlify_sharp_avif_decode=ok',
  ]) {
    assert.ok(runtimeChecks.includes(expected), 'runtime smoke should contain ' + expected);
  }
  assert.doesNotMatch(securityPatch, /netlify-cli/);
  assert.doesNotMatch(dockerfile, /replace_(?:scoped_)?node_module[^\n]*netlify-cli/);
  assert.match(dockerfile, /netlify-cli\/node_modules\/sharp/);
  assert.match(immutableInputs, /name: Netlify sharp nested package/);
  assert.equal(
    upstreamPolicy.officialInputs.some((input) =>
      input.locationPrefixes?.some((prefix) => prefix.includes('/netlify-cli/'))),
    false,
  );
  assert.match(runtimeChecks, /Netlify ipx sharp dependency[\s\S]{0,180}\^0\.35\.5/);
  assert.ok(
    dockerfile.includes("netlify-cli/node_modules/sharp/package.json').version\")\" = \"0.35.5\""),
    'Dockerfile should enforce the resolved Netlify Sharp version',
  );
  assert.match(runtimeChecks, /Netlify sharp package version[\s\S]{0,180}0\.35\.5/);
});

test('Netlify Sharp runtime assertion accepts the official ipx manifest and rejects changed ranges', () => {
  const requireEq = runtimeChecks.match(/^require_eq\(\) \{[\s\S]*?^\}/m)?.[0];
  const rangeCheck = runtimeChecks.split('\n').find((line) =>
    line.includes('require_eq "Netlify ipx sharp dependency"'));
  assert.ok(requireEq, 'runtime smoke should define require_eq');
  assert.ok(rangeCheck, 'runtime smoke should check the ipx Sharp declaration');
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-netlify-sharp-'));
  const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash';
  try {
    mkdirSync(join(root, 'node_modules', 'ipx'), { recursive: true });
    for (const [range, expectedStatus] of [['^0.35.5', 0], ['^0.34.3', 1], ['^0.36.0', 1], ['*', 1]]) {
      writeFileSync(join(root, 'node_modules', 'ipx', 'package.json'), JSON.stringify({
        name: 'ipx', version: '4.0.0', dependencies: { sharp: range },
      }));
      const result = spawnSync(bash, ['-eu', '-c', `${requireEq}
netlify_root="$NETLIFY_TEST_ROOT"
${rangeCheck.replace('$(node -p', '$("$NETLIFY_TEST_NODE" -p')}
`], {
        encoding: 'utf8',
        env: {
          ...process.env,
          NETLIFY_TEST_ROOT: root.replaceAll('\\', '/'),
          NETLIFY_TEST_NODE: process.execPath.replaceAll('\\', '/'),
        },
      });
      assert.equal(result.status, expectedStatus, `ipx Sharp range ${range}: ${result.stderr}`);
      if (expectedStatus !== 0) assert.match(result.stderr, /Netlify ipx sharp dependency expected/);
    }
  } finally {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
    rmSync(root, { recursive: true, force: true });
  }
});

test('historical Netlify exception is not used to hide current upstream findings', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  assert.equal(
    ledger.reviews.some((review) => review.id === 'v155-sharp-high-exception-859b5a32ea'),
    false,
  );
});
