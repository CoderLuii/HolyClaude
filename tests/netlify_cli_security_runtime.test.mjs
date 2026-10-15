import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const releaseInputs = readFileSync('tests/release_input_integrity.test.mjs', 'utf8');
const securityPatch = readFileSync('scripts/patch-global-node-security-dependencies.mjs', 'utf8');
const upstreamPolicy = JSON.parse(readFileSync('security/upstream-dependency-policy.json', 'utf8'));

test('Netlify CLI uses the checksum-bound upstream TOML security release', () => {
  assert.match(dockerfile, /netlify-cli@27\.12\.1/);
  assert.doesNotMatch(dockerfile, /netlify-cli@27\.5\.2/);
  assert.match(
    immutableInputs,
    /name: Netlify CLI[\s\S]*?version: 27\.12\.1[\s\S]*?archive-sha256: 540b6857bddddcf84992248000c11ea4e2854d040e33b0100ecbdbb3a6959da4[\s\S]*?npm-integrity: "sha512-Pd9aNEWdstTxFkvBS92CoJVSEGQdOKI73dudjbouuwgasPoaBA2UHYsGyah0aW\+y7EY9L\/ugtoZwXhcKvI\+AhQ=="/,
  );
  assert.match(releaseInputs, /'netlify-cli@27\.12\.1'/);
  assert.doesNotMatch(dockerfile, /rm -f[^\n]*local-functions-proxy/);
  assert.match(runtimeChecks, /test -x .*local-functions-proxy/);
});

test('full-image runtime validates Netlify parser upgrades and real Rust TOML reachability', () => {
  for (const expected of [
    "'netlify-cli': '27.12.1'",
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
  assert.match(runtimeChecks, /Netlify ipx sharp dependency[\s\S]{0,180}\^0\.34\.3/);
  assert.match(runtimeChecks, /Netlify sharp package version[\s\S]{0,180}0\.34\.5/);
});

test('historical Netlify exception is not used to hide current upstream findings', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  assert.equal(
    ledger.reviews.some((review) => review.id === 'v155-sharp-high-exception-859b5a32ea'),
    false,
  );
});
