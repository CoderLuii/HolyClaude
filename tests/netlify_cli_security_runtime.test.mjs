import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');
const runtimeChecks = readFileSync('tests/browser_runtime_container_checks.sh', 'utf8');
const releaseInputs = readFileSync('tests/release_input_integrity.test.mjs', 'utf8');
const securityPatch = readFileSync('scripts/patch-global-node-security-dependencies.mjs', 'utf8');

test('Netlify CLI uses the checksum-bound upstream TOML security release', () => {
  assert.match(dockerfile, /netlify-cli@27\.6\.0/);
  assert.doesNotMatch(dockerfile, /netlify-cli@27\.5\.2/);
  assert.match(
    immutableInputs,
    /name: Netlify CLI[\s\S]*?version: 27\.6\.0[\s\S]*?archive-sha256: df7dcd2bd917f6d6a23d006fd21e7b1eefb94048791ec4c904a7cb57a999e3bc[\s\S]*?npm-integrity: "sha512-WW4NpAWUcoi9cX\/CEpqu5sm4e6Q\/ueJRpJEhzpWd92T6wrTk5QrGT1V0gqDJohYsNxa\+q1YrDS6sTQELqDWduQ=="/,
  );
  assert.match(releaseInputs, /'netlify-cli@27\.6\.0'/);
});

test('full-image runtime validates Netlify parser upgrades and real Rust TOML reachability', () => {
  for (const expected of [
    "'netlify-cli': '27.6.0'",
    'Netlify CLI TOML dependency',
    'Netlify CLI cron-parser dependency',
    'Netlify CLI raw-body dependency',
    'Netlify CLI TOML package version',
    'Netlify CLI cron-parser package version',
    'Netlify CLI raw-body package version',
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
  assert.match(runtimeChecks, /dependencies\.toml[\s\S]{0,180}"\^4\.0\.0"/);
  assert.match(runtimeChecks, /dependencies\['cron-parser'\][\s\S]{0,180}"\^5\.0\.0"/);
  assert.match(runtimeChecks, /dependencies\['raw-body'\][\s\S]{0,180}"\^4\.0\.0"/);
  assert.match(runtimeChecks, /toml\/package\.json'[\s\S]{0,180}"4\.3\.0"/);
  assert.match(runtimeChecks, /cron-parser\/package\.json'[\s\S]{0,180}"5\.10\.1"/);
  assert.match(runtimeChecks, /raw-body\/package\.json'[\s\S]{0,180}"4\.0\.0"/);
  assert.match(runtimeChecks, /dist\/lib\/functions\/runtimes\/rust\/index\.js/);
  assert.match(runtimeChecks, /\[package\]\\nname = "secure_function"/);
  assert.match(runtimeChecks, /a\.b\.y\.__proto__\.__proto__/);
  assert.match(runtimeChecks, /instanceof RangeError/);
});

test('Netlify Sharp uses the checksum-bound fixed native set and owned runtime checks', () => {
  for (const expected of [
    'Netlify ipx sharp dependency',
    'Netlify sharp package version',
    'Netlify sharp libvips version',
    'Netlify sharp libheif version',
    'npm --prefix /usr/local/lib/node_modules/netlify-cli ls sharp --all',
    'netlify_sharp_png_transform=ok',
    'netlify_sharp_avif_decode=ok',
  ]) {
    assert.ok(runtimeChecks.includes(expected), 'runtime smoke should contain ' + expected);
  }
  assert.match(securityPatch, /netlify-cli\/node_modules\/ipx\/package\.json/);
  assert.match(dockerfile, /netlify-cli\/node_modules\/sharp/);
  assert.match(immutableInputs, /name: Netlify sharp nested package[\s\S]*version: 0\.35\.4[\s\S]*archive-sha256: 6ebef10290372c7309d9e22e3ecb9e32ca6a3aa6e07f3d83aa904df8ae4f6a5a/);
});

test('fixed Netlify Sharp no longer retains its obsolete High exception', () => {
  const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
  assert.equal(
    ledger.reviews.some((review) => review.id === 'v155-sharp-high-exception-859b5a32ea'),
    false,
  );
});
