import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const dockerfile = readFileSync('Dockerfile', 'utf8');
const immutableInputs = readFileSync('security/immutable-inputs.yml', 'utf8');

test('replaces only npm bundled Undici with the checksum-bound patched release', () => {
  assert.match(dockerfile, /ARG NPM_UNDICI_VERSION=6\.28\.1/);
  assert.match(
    dockerfile,
    /ARG NPM_UNDICI_ARCHIVE_SHA256=e18191aac9c0ff43dac7fe9b10b7041a22d07addb7b66a6e8ac14a52a5b69b74/,
  );
  assert.match(
    dockerfile,
    /test "\$\(node -p "require\('\/usr\/local\/lib\/node_modules\/npm\/node_modules\/undici\/package\.json'\)\.version"\)" = "6\.27\.0";[\s\S]*replace_node_module undici "\$NPM_UNDICI_VERSION" "\$NPM_UNDICI_ARCHIVE_SHA256" \\\n+      \/usr\/local\/lib\/node_modules\/npm\/node_modules\/undici;/,
  );
  assert.match(
    dockerfile,
    /test "\$\(node -p "require\('\/usr\/local\/lib\/node_modules\/npm\/node_modules\/undici\/package\.json'\)\.version"\)" = "\$NPM_UNDICI_VERSION";/,
  );
  assert.match(dockerfile, /npm --prefix \/usr\/local\/lib\/node_modules\/npm ls undici --all >\/dev\/null;/);
  assert.match(
    dockerfile,
    /require\('\/usr\/local\/lib\/node_modules\/npm\/node_modules\/undici'\).*typeof undici\.request !== 'function'/,
  );
  assert.match(dockerfile, /npm@12\.0\.2/);
});

test('records the npm Undici replacement as an immutable input', () => {
  assert.match(
    immutableInputs,
    /name: npm bundled undici[\s\S]*version: 6\.28\.1[\s\S]*archive-sha256: e18191aac9c0ff43dac7fe9b10b7041a22d07addb7b66a6e8ac14a52a5b69b74[\s\S]*npm-integrity: "sha512-zWpdTVD54H48CIybL0rWQ3ukpb9d23wM7eH5RtfdmeP70cWHNjtfo7P4vZX\+5CoDcO53J4Pu5uXp7lNfjc6DRA=="/,
  );
});
