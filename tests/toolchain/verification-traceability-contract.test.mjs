import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const traceabilityPath = join(root, 'tests/README.md');
assert.equal(existsSync(traceabilityPath), true, 'TRACEABILITY_INDEX_MISSING:tests/README.md');

const traceability = readFileSync(traceabilityPath, 'utf8');
const referencedPaths = new Set(
  [...traceability.matchAll(/`((?:tests|evals)\/[^`]+\.(?:ts|tsx|mjs|json))`/gu)].map(
    ([, path]) => path,
  ),
);

for (const path of [...referencedPaths].sort()) {
  assert.equal(existsSync(join(root, path)), true, `TRACEABILITY_EVIDENCE_MISSING:${path}`);
}

const requiredEvidence = [
  'tests/security/human-authority.test.ts',
  'tests/security/privacy-boundary.test.ts',
  'tests/security/prompt-injection.test.ts',
  'tests/e2e/canonical.spec.ts',
  'tests/e2e/tool-lifecycle.spec.ts',
];
for (const path of requiredEvidence) {
  assert.equal(existsSync(join(root, path)), true, `REQUIRED_RELEASE_EVIDENCE_MISSING:${path}`);
}

assert.doesNotMatch(
  traceability,
  /planned in WP11/iu,
  'TRACEABILITY_MUST_DESCRIBE_COMMITTED_EVIDENCE',
);

const harness = readFileSync(join(root, 'tests/e2e/model-context-harness.ts'), 'utf8');
assert.match(harness, /validDraftToolInput/u, 'E2E_HARNESS_MUST_USE_AUTHORITATIVE_VALID_FIXTURE');
assert.doesNotMatch(
  harness,
  /requestId:\s*['"]R-101['"]/u,
  'E2E_HARNESS_MUST_NOT_DUPLICATE_ASSIGNMENT_FIXTURE',
);

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(
  packageJson.scripts?.['verify:traceability'],
  'node tests/toolchain/verification-traceability-contract.test.mjs',
  'TRACEABILITY_SCRIPT_MISSING',
);
assert.match(
  packageJson.scripts?.verify ?? '',
  /npm run verify:traceability/u,
  'TRACEABILITY_NOT_IN_VERIFY_GATE',
);

console.log(`DOMHAMSTER_VERIFICATION_TRACEABILITY_PASS references=${referencedPaths.size}`);
