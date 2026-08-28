import assert from 'node:assert/strict';
import test from 'node:test';
import { APPROVED_LICENSE_IDS, auditLockfileLicenses } from '../../scripts/lib/license-policy.mjs';

function lockfile(packages) {
  return {
    lockfileVersion: 3,
    packages: {
      '': { name: 'fixture', version: '1.0.0', license: 'MIT' },
      ...packages,
    },
  };
}

const completeNotice = `
# Notices

caniuse-lite is a development dependency licensed under CC-BY-4.0.
Its browser-support data is sourced from caniuse.com.

lightningcss and lightningcss-* platform packages are unmodified development dependencies
licensed under MPL-2.0. Source: https://github.com/parcel-bundler/lightningcss
`;

test('accepts the exact approved license set with required development-only notices', () => {
  assert.equal(APPROVED_LICENSE_IDS.has('MIT-0'), true);
  assert.equal(APPROVED_LICENSE_IDS.has('CC-BY-4.0'), true);
  assert.equal(APPROVED_LICENSE_IDS.has('MPL-2.0'), true);

  const problems = auditLockfileLicenses(
    lockfile({
      'node_modules/permissive': { version: '1.0.0', license: 'MIT-0' },
      'node_modules/caniuse-lite': {
        version: '1.0.0',
        license: 'CC-BY-4.0',
        dev: true,
      },
      'node_modules/lightningcss': {
        version: '1.0.0',
        license: 'MPL-2.0',
        dev: true,
      },
      'node_modules/lightningcss-linux-x64-gnu': {
        version: '1.0.0',
        license: 'MPL-2.0',
        dev: true,
        optional: true,
      },
    }),
    completeNotice,
  );

  assert.deepEqual(problems, []);
});

test('rejects attribution or file-level-copyleft packages when the notice is incomplete', () => {
  const problems = auditLockfileLicenses(
    lockfile({
      'node_modules/caniuse-lite': {
        version: '1.0.0',
        license: 'CC-BY-4.0',
        dev: true,
      },
      'node_modules/lightningcss': {
        version: '1.0.0',
        license: 'MPL-2.0',
        dev: true,
      },
    }),
    '# Notices\n',
  );

  assert.deepEqual(problems, [
    'node_modules/caniuse-lite:notice-missing:CC-BY-4.0',
    'node_modules/lightningcss:notice-missing:MPL-2.0',
  ]);
});

test('rejects CC-BY-4.0 and MPL-2.0 packages outside development scope', () => {
  const problems = auditLockfileLicenses(
    lockfile({
      'node_modules/runtime-data': { version: '1.0.0', license: 'CC-BY-4.0' },
      'node_modules/runtime-transformer': { version: '1.0.0', license: 'MPL-2.0' },
    }),
    completeNotice,
  );

  assert.deepEqual(problems, [
    'node_modules/runtime-data:development-only-license:CC-BY-4.0',
    'node_modules/runtime-transformer:development-only-license:MPL-2.0',
  ]);
});

test('rejects unknown and missing license metadata', () => {
  const problems = auditLockfileLicenses(
    lockfile({
      'node_modules/unknown': { version: '1.0.0', license: 'GPL-3.0-only', dev: true },
      'node_modules/missing': { version: '1.0.0', dev: true },
    }),
    completeNotice,
  );

  assert.deepEqual(problems, [
    'node_modules/missing:missing-license',
    'node_modules/unknown:GPL-3.0-only',
  ]);
});
