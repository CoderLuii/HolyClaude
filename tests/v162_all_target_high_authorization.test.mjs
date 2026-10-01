import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ledger = JSON.parse(readFileSync('security/advisory-reviews.json', 'utf8'));
const vulnerabilities = [
  'CVE-2026-86138',
  'CVE-2026-86139',
  'CVE-2026-86142',
  'CVE-2026-86143',
  'CVE-2026-86144',
  'CVE-2026-19499',
];

const libxml2Vulnerabilities = vulnerabilities.slice(0, 5);

test('removes the expired all-target High authorizations', () => {
  for (const vulnerability of vulnerabilities) {
    const review = ledger.reviews.find((item) =>
      item.vulnerabilities.length === 1 &&
      item.vulnerabilities[0] === vulnerability &&
      (vulnerability === 'CVE-2026-19499' || item.component.names.length === 1 && item.component.names[0] === 'libxml2'));
    assert.equal(review, undefined, vulnerability);
  }
});

test('removes both runtime and development libxml2 exceptions after expiry', () => {
  for (const vulnerability of libxml2Vulnerabilities) {
    const reviews = ledger.reviews.filter((item) =>
      item.vulnerabilities.length === 1 && item.vulnerabilities[0] === vulnerability);
    assert.deepEqual(reviews, [], vulnerability);
  }
});
