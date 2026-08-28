import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { auditLockfileLicenses } from './lib/license-policy.mjs';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
const notice = readFileSync(join(root, 'NOTICE.md'), 'utf8');
const problems = auditLockfileLicenses(lock, notice);

assert.deepEqual(problems, [], `DOMHAMSTER_LICENSE_FAILURE\n${problems.join('\n')}`);
console.log(`DOMHAMSTER_LICENSE_PASS packages=${Object.keys(lock.packages ?? {}).length - 1}`);
