import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

async function readJson(path) {
  const value = await readFile(new URL(path, root), 'utf8');
  return JSON.parse(value);
}

test('pins Node 24 and exposes the WP00 verification scripts', async () => {
  const [nvmrc, packageJson] = await Promise.all([
    readFile(new URL('.nvmrc', root), 'utf8'),
    readJson('package.json'),
  ]);

  assert.equal(nvmrc.trim(), '24');
  assert.equal(packageJson.engines.node, '>=24 <25');
  assert.equal(packageJson.engines.npm, '>=11.17.0 <12');
  assert.equal(packageJson.packageManager, 'npm@11.17.0');

  const requiredScripts = [
    'bootstrap:deps',
    'build',
    'dev',
    'format',
    'format:check',
    'lint',
    'preview',
    'test',
    'test:e2e',
    'test:run',
    'typecheck',
    'verify',
  ];

  for (const script of requiredScripts) {
    assert.equal(typeof packageJson.scripts?.[script], 'string', `missing script: ${script}`);
  }
});

test('keeps dependency versions exact', async () => {
  const packageJson = await readJson('package.json');
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const [name, version] of Object.entries(dependencies)) {
    assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, `${name} must be exact`);
  }
});

test('pins the verified TypeScript and lint compatibility set', async () => {
  const packageJson = await readJson('package.json');

  assert.equal(packageJson.devDependencies.typescript, '6.0.3');
  assert.equal(packageJson.devDependencies['typescript-eslint'], '8.67.0');
  assert.equal(packageJson.devDependencies['@eslint/js'], '10.0.1');
  assert.equal(packageJson.devDependencies.eslint, '10.9.1');
});

test('pins the verified DOM testing compatibility set', async () => {
  const packageJson = await readJson('package.json');

  assert.equal(packageJson.devDependencies['@testing-library/dom'], '10.4.1');
  assert.equal(packageJson.devDependencies['@testing-library/jest-dom'], '7.0.0');
  assert.equal(packageJson.devDependencies['@testing-library/react'], '16.3.2');
});

test('keeps the completed WP00 RED workflow as inert historical evidence', async () => {
  const workflow = await readFile(new URL('.github/workflows/bootstrap-wp00.yml', root), 'utf8');

  assert.match(workflow, /^name: WP00 RED evidence archive$/m);
  assert.match(workflow, /^\s*workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s*contents:\s*read\s*$/m);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node|upload-artifact)@/);
  assert.doesNotMatch(workflow, /npm (?:ci|install|run)/);
});

test('uses the current Node 24 action majors in the active verification workflow', async () => {
  const [ci, packageLock] = await Promise.all([
    readFile(new URL('.github/workflows/ci.yml', root), 'utf8'),
    readJson('package-lock.json'),
  ]);

  assert.equal(packageLock.lockfileVersion, 3);
  assert.match(ci, /actions\/checkout@v7/);
  assert.match(ci, /actions\/setup-node@v7/);
  assert.match(ci, /actions\/upload-artifact@v7/);
  assert.match(ci, /node-version:\s*24\.19\.0/);
  assert.match(ci, /^\s*cache:\s*npm\s*$/m);
});
