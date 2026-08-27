import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const requiredFiles = [
  'scripts/run-release-gate.mjs',
  'tests/toolchain/release-gate-runner.test.mjs',
  'docs/testing.md',
  'evals/results/README.md',
];
for (const path of requiredFiles) {
  assert.equal(existsSync(join(root, path)), true, `RELEASE_GATE_FILE_MISSING:${path}`);
}

const script = readFileSync(join(root, 'scripts/run-release-gate.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const testingDocs = readFileSync(join(root, 'docs/testing.md'), 'utf8');
const evalDocs = readFileSync(join(root, 'evals/results/README.md'), 'utf8');

for (const fragment of [
  "['run', 'verify']",
  "['run', 'test:e2e']",
  "['run', 'verify:bundle']",
  "['run', 'verify:licenses']",
  "['audit', '--audit-level=high']",
  "['run', 'eval', '--', '--results'",
  "['run', 'release:manifest']",
  "['run', 'release:verify']",
  'DOMHAMSTER_EVAL_RESULTS_REQUIRED',
  'DOMHAMSTER_RELEASE_GATE_PASS',
]) {
  assert.ok(script.includes(fragment), `RELEASE_GATE_FRAGMENT_MISSING:${fragment}`);
}

assert.equal(
  packageJson.scripts?.['verify:release'],
  'node scripts/run-release-gate.mjs',
  'RELEASE_GATE_PACKAGE_SCRIPT_MISMATCH',
);
for (const document of [testingDocs, evalDocs]) {
  assert.match(
    document,
    /npm run verify:release -- --eval-results/u,
    'RELEASE_GATE_USAGE_NOT_DOCUMENTED',
  );
}

console.log('DOMHAMSTER_RELEASE_GATE_CONTRACT_PASS');
