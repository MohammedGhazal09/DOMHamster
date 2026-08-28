import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const allowed = new Set([
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
const problems = [];
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path === '' || (entry.dev === undefined && entry.license === undefined)) continue;
  const license = entry.license;
  if (typeof license !== 'string' || license.trim() === '') {
    problems.push(`${path}:missing-license`);
    continue;
  }
  const identifiers = license.match(/[A-Za-z0-9.-]+/gu) ?? [];
  const meaningful = identifiers.filter((value) => !['AND', 'OR', 'WITH'].includes(value));
  if (meaningful.some((identifier) => !allowed.has(identifier)))
    problems.push(`${path}:${license}`);
}
assert.deepEqual(problems, [], `DOMHAMSTER_LICENSE_FAILURE\n${problems.join('\n')}`);
console.log(`DOMHAMSTER_LICENSE_PASS packages=${Object.keys(lock.packages ?? {}).length - 1}`);
