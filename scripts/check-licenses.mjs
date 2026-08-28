import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const runtimeAllowed = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC0-1.0',
  'ISC',
  'MIT',
  'Python-2.0',
  'Unlicense',
  'BlueOak-1.0.0',
]);
const developmentAllowed = new Set(['MIT-0', 'CC-BY-4.0', 'MPL-2.0']);

function licenseAllowed(identifier, entry) {
  return (
    runtimeAllowed.has(identifier) || (entry.dev === true && developmentAllowed.has(identifier))
  );
}

const problems = [];
let developmentExceptions = 0;
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path === '' || (entry.dev === undefined && entry.license === undefined)) continue;
  const license = entry.license;
  if (typeof license !== 'string' || license.trim() === '') {
    problems.push(`${path}:missing-license`);
    continue;
  }
  const identifiers = license.match(/[A-Za-z0-9.-]+/gu) ?? [];
  const meaningful = identifiers.filter((value) => !['AND', 'OR', 'WITH'].includes(value));
  if (meaningful.some((identifier) => !licenseAllowed(identifier, entry))) {
    problems.push(`${path}:${license}`);
    continue;
  }
  if (entry.dev === true && meaningful.some((identifier) => developmentAllowed.has(identifier))) {
    developmentExceptions += 1;
  }
}

const notice = readFileSync('NOTICE.md', 'utf8');
const usesCcByData = Object.values(lock.packages ?? {}).some(
  (entry) => entry.dev === true && entry.license === 'CC-BY-4.0',
);
if (usesCcByData) {
  assert.match(notice, /caniuse\.com/u, 'DOMHAMSTER_CC_BY_ATTRIBUTION_MISSING');
}

assert.deepEqual(problems, [], `DOMHAMSTER_LICENSE_FAILURE\n${problems.join('\n')}`);
console.log(
  `DOMHAMSTER_LICENSE_PASS packages=${Object.keys(lock.packages ?? {}).length - 1} developmentExceptions=${developmentExceptions}`,
);
