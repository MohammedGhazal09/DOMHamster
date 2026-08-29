import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const createSource = readFileSync(join(root, 'scripts/create-release-manifest.mjs'), 'utf8');
const verifySource = readFileSync(join(root, 'scripts/verify-release.mjs'), 'utf8');
const schema = JSON.parse(readFileSync(join(root, 'release-manifest.schema.json'), 'utf8'));

for (const fragment of [
  'IGNORED_DIST_FILES',
  "process.argv.includes('--dist-only')",
  'DEPLOY_ID',
  'DEPLOY_URL',
  "join(distDirectory, 'release-manifest.json')",
]) {
  assert.ok(createSource.includes(fragment), `WP12_RELEASE_CREATE_CONTRACT_MISSING:${fragment}`);
}
assert.ok(
  !createSource.includes('DEPLOY_PRIME_URL'),
  'WP12_RELEASE_CREATE_CONTRACT_REJECTS_MUTABLE_DEPLOY_PRIME_URL',
);
for (const fragment of ['IGNORED_DIST_FILES', "argument('--manifest')", 'manifest.build.files']) {
  assert.ok(verifySource.includes(fragment), `WP12_RELEASE_VERIFY_CONTRACT_MISSING:${fragment}`);
}
assert.ok(schema.required.includes('deployment'), 'WP12_RELEASE_SCHEMA_REQUIRES_DEPLOYMENT');
assert.equal(schema.properties.deployment.type, 'object');
assert.deepEqual(schema.properties.deployment.required, ['context', 'deployId', 'deployUrl']);

console.log('DOMHAMSTER_WP12_RELEASE_IDENTITY_CONTRACT_PASS');
