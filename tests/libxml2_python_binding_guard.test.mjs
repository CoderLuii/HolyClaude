import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const guardPath = 'tests/libxml2_python_binding_guard.py';
const unitPath = 'tests/libxml2_python_binding_guard_unit.py';
const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vex = JSON.parse(readFileSync('security/openvex.json', 'utf8'));
const workflow = readFileSync('.github/workflows/docker-publish.yml', 'utf8');

test('the fail-closed libxml2 Python-binding guard is wired into every Linux advisory gate', () => {
  assert.equal(existsSync(guardPath), true, `${guardPath} must exist`);
  for (const variant of ['full', 'slim']) {
    const harness = readFileSync(`tests/${variant}_linux_advisory_runtime_checks.sh`, 'utf8');
    assert.match(harness, new RegExp(`python3 -I -S /tests/libxml2_python_binding_guard\\.py --variant ${variant}`));
  }
  assert.match(workflow,
    /python3 -m unittest tests\/test_notify\.py tests\/junie_applicability_guard_unit\.py tests\/libxml2_python_binding_guard_unit\.py/);
  const guard = readFileSync(guardPath, 'utf8');
  assert.doesNotMatch(guard, /^\s*(?:from\s+libxml2|import\s+libxml2)/m);
  for (const root of ['/usr/local', '/usr/lib', '/opt', '/home/claude/.local', '/root/.local']) {
    assert.match(guard, new RegExp(root.replaceAll('/', '\\/')));
  }
});

test('unit coverage exercises the guard implementation', () => {
  const result = spawnSync('python', ['-m', 'unittest', unitPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('binds four exact libxml2 Python-binding reviews and OpenVEX statements', () => {
  for (const variant of ['full', 'slim']) {
    for (const architecture of ['amd64', 'arm64']) {
      const id = `v160-${variant}-${architecture}-libxml2-cve-2026-74860-python-binding-not-affected`;
      const matches = ledger.reviews.filter((review) => review.id === id);
      assert.equal(matches.length, 1, `${id} must exist exactly once`);
      const review = matches[0];
      assert.deepEqual(review.vulnerabilities, ['CVE-2026-74860']);
      assert.deepEqual(review.component.names, variant === 'full' ? ['libxml2', 'libxml2-dev'] : ['libxml2']);
      assert.deepEqual(review.component.versions, ['2.9.14+dfsg-1.3~deb12u6']);
      assert.deepEqual(review.component.types, ['deb']);
      assert.deepEqual(review.component.locationPatterns, [
        '^/usr/share/doc/libxml2/copyright$',
        ...(variant === 'full' ? ['^/usr/share/doc/libxml2-dev/copyright$'] : []),
        `^/var/lib/dpkg/info/libxml2:${architecture}\\.md5sums$`,
        ...(variant === 'full' ? [`^/var/lib/dpkg/info/libxml2-dev:${architecture}\\.md5sums$`] : []),
        '^/var/lib/dpkg/status$',
      ]);
      assert.deepEqual(review.variants, [variant]);
      assert.deepEqual(review.architectures, [architecture]);
      assert.equal(review.sourcePackage, 'libxml2');
      assert.equal(review.disposition, 'not_affected');
      assert.equal(review.effectiveSeverity, 'None');
      assert.equal('approvedBy' in review, false);
      assert.equal(review.reviewedAt, '2026-09-11');
      assert.equal(review.expiresAt, '2026-10-11');
      assert.deepEqual(review.authority, {
        name: 'Debian Security Tracker',
        url: 'https://security-tracker.debian.org/tracker/CVE-2026-74860',
      });
      assert.match(review.rationale, /pythonAttributeDecl/);
      assert.match(review.rationale, /native guard/);
      assert.match(review.rationale, /does not claim the installed libxml2 version is generally fixed/);

      const statement = vex.statements.find((item) => item['@id'] === review.vexStatement);
      assert.ok(statement, `${id} OpenVEX statement`);
      assert.equal(statement.vulnerability.name, 'CVE-2026-74860');
      assert.equal(statement.status, 'not_affected');
      assert.equal(statement.justification, 'vulnerable_code_not_present');
      assert.match(statement.impact_statement, /Python binding/);
      const expectedPurls = review.component.names.map((name) =>
        `pkg:deb/debian/${name}@2.9.14%2Bdfsg-1.3~deb12u6?arch=${architecture}`);
      for (const product of statement.products) {
        assert.deepEqual(product.subcomponents.map((item) => item.identifiers.purl), expectedPurls);
      }
      assert.deepEqual(statement.products.map((product) => product['@id']), [
        `pkg:oci/ghcr.io/coderluii/holyclaude@1.6.0?variant=${variant}`,
        `pkg:oci/docker.io/coderluii/holyclaude@1.6.0?variant=${variant}`,
      ]);
    }
  }
});
