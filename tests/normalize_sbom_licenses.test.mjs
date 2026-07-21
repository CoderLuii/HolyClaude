import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const normalizer = resolve('scripts/normalize-sbom-license-ids.mjs');

function runFixture(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'holyclaude-sbom-license-'));
  try {
    const input = {
      bomFormat: 'CycloneDX',
      specVersion: '1.7',
      components: [
        {
          type: 'library',
          name: 'perl',
          version: '5.36.0',
          licenses: [
            { license: { id: 'Artistic-2.0' } },
            { license: { id: 'Artistic-dist', acknowledgement: 'declared' } },
          ],
        },
      ],
    };
    mutate(input);
    const inputPath = join(root, 'raw.json');
    const outputPath = join(root, 'normalized.json');
    const evidencePath = join(root, 'normalization.json');
    writeFileSync(inputPath, `${JSON.stringify(input)}\n`);
    const result = spawnSync(
      process.execPath,
      [
        normalizer,
        '--input',
        inputPath,
        '--output',
        outputPath,
        '--evidence',
        evidencePath,
      ],
      { encoding: 'utf8' },
    );
    return {
      ...result,
      input: JSON.parse(readFileSync(inputPath, 'utf8')),
      output: result.status === 0 ? JSON.parse(readFileSync(outputPath, 'utf8')) : null,
      evidence: result.status === 0 ? JSON.parse(readFileSync(evidencePath, 'utf8')) : null,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('preserves the raw SBOM and normalizes only Artistic-dist license choices', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.input.components[0].licenses[1].license.id, 'Artistic-dist');
  assert.deepEqual(result.output.components[0].licenses, [
    { license: { id: 'Artistic-2.0' } },
    { license: { name: 'Artistic-dist', acknowledgement: 'declared' } },
  ]);
  assert.equal(result.evidence.schemaVersion, 1);
  assert.equal(result.evidence.normalizations[0].id, 'Artistic-dist');
  assert.equal(result.evidence.normalizations[0].count, 1);
  assert.match(result.evidence.inputSha256, /^[0-9a-f]{64}$/);
  assert.match(result.evidence.outputSha256, /^[0-9a-f]{64}$/);
  assert.notEqual(result.evidence.inputSha256, result.evidence.outputSha256);
});

test('normalizes nested CycloneDX components', () => {
  const result = runFixture((input) => {
    input.components[0].components = [
      {
        type: 'library',
        name: 'perl-base',
        licenses: [{ license: { id: 'Artistic-dist' } }],
      },
    ];
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.evidence.normalizations[0].count, 2);
  assert.equal(result.output.components[0].components[0].licenses[0].license.name, 'Artistic-dist');
});

test('fails closed when the expected compatibility case is absent', () => {
  const result = runFixture((input) => {
    input.components[0].licenses.splice(1, 1);
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected at least one Artistic-dist license choice/);
});

test('rejects a non-CycloneDX input document', () => {
  const result = runFixture((input) => {
    input.bomFormat = 'SPDX';
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected a CycloneDX 1\.7 document/);
});
