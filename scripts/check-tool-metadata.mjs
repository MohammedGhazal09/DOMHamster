import assert from 'node:assert/strict';
import { readToolMetadata } from './lib/source-metadata.mjs';
const EXPECTED_COUNTS = Object.freeze({
  READY: 5,
  DRAFT_INVALID: 7,
  DRAFT_VALID: 8,
  AWAITING_APPROVAL: 3,
  APPROVED: 4,
  COMMITTED: 3,
});
const { contracts, lifecycle } = readToolMetadata();
const names = contracts.map(({ name }) => name);
assert.equal(contracts.length, 12, 'DOMHAMSTER_REQUIRES_12_TOOL_CONTRACTS');
assert.equal(new Set(names).size, 12, 'DOMHAMSTER_TOOL_NAMES_MUST_BE_UNIQUE');
for (const contract of contracts) {
  assert.match(contract.name, /^[a-z][a-z0-9_]{2,63}$/);
  assert.ok(
    contract.title.length >= 8 && contract.title.length <= 80,
    `TITLE_LENGTH:${contract.name}`,
  );
  assert.ok(
    contract.description.length >= 60 && contract.description.length <= 240,
    `DESCRIPTION_LENGTH:${contract.name}`,
  );
  assert.equal(typeof contract.readOnlyHint, 'boolean');
  assert.equal(typeof contract.untrustedContentHint, 'boolean');
}
for (const [state, expectedCount] of Object.entries(EXPECTED_COUNTS)) {
  const stateNames = lifecycle[state];
  assert.ok(Array.isArray(stateNames), `LIFECYCLE_STATE_MISSING:${state}`);
  assert.equal(stateNames.length, expectedCount, `LIFECYCLE_COUNT:${state}`);
  assert.equal(new Set(stateNames).size, stateNames.length, `LIFECYCLE_DUPLICATE:${state}`);
  for (const name of stateNames)
    assert.ok(names.includes(name), `LIFECYCLE_UNKNOWN_TOOL:${state}:${name}`);
}
const humanOnlyFragments = ['lock', 'unlock', 'approve', 'reject', 'cancel', 'discard', 'reset'];
for (const name of names)
  assert.equal(
    humanOnlyFragments.some((fragment) => name === fragment || name.startsWith(`${fragment}_`)),
    false,
    `HUMAN_ONLY_TOOL_EXPOSED:${name}`,
  );
console.log(
  `DOMHAMSTER_TOOL_METADATA_PASS tools=${contracts.length} states=${Object.keys(lifecycle).length}`,
);
