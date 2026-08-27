import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const requiredFiles = [
  'tests/README.md',
  'evals/cases.json',
  'evals/results/README.md',
  'scripts/lib/source-metadata.mjs',
  'scripts/check-tool-metadata.mjs',
  'scripts/check-source-safety.mjs',
  'scripts/check-bundle-size.mjs',
  'scripts/check-licenses.mjs',
  'scripts/run-agent-evals.mjs',
  'scripts/create-release-manifest.mjs',
  'scripts/verify-release.mjs',
];

for (const path of requiredFiles) {
  assert.equal(existsSync(join(root, path)), true, `WP11_REQUIRED_FILE_MISSING:${path}`);
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const requiredScripts = [
  'test:accessibility',
  'test:security',
  'verify:metadata',
  'verify:safety',
  'verify:bundle',
  'verify:licenses',
  'eval',
  'release:manifest',
  'release:verify',
];
for (const name of requiredScripts) {
  assert.equal(typeof packageJson.scripts?.[name], 'string', `WP11_SCRIPT_MISSING:${name}`);
}

const casesDocument = JSON.parse(readFileSync(join(root, 'evals/cases.json'), 'utf8'));
assert.equal(casesDocument.version, 1);
assert.equal(casesDocument.cases.length, 30, 'WP11_REQUIRES_30_EVAL_CASES');
assert.equal(new Set(casesDocument.cases.map(({ id }) => id)).size, 30, 'WP11_EVAL_IDS_UNIQUE');
assert.ok(
  casesDocument.cases.filter(({ risk }) => risk === 'high').length >= 10,
  'WP11_REQUIRES_HIGH_RISK_CASES',
);

const traceability = readFileSync(join(root, 'tests/README.md'), 'utf8');
for (let index = 1; index <= 24; index += 1) {
  const id = `AC-${index.toString().padStart(3, '0')}`;
  assert.match(traceability, new RegExp(`\\b${id}\\b`), `WP11_ACCEPTANCE_ID_MISSING:${id}`);
}

console.log('DOMHAMSTER_WP11_VERIFICATION_CONTRACT_PASS');
