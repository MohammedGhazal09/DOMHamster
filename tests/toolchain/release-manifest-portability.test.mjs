import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, posix, resolve, win32 } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const manifestScripts = ['create-release-manifest.mjs', 'verify-release.mjs'];

function artifactIdentity(path, separator) {
  return createHash('sha256')
    .update(path.replaceAll(separator, '/'))
    .update('\0')
    .update('fixture')
    .update('\0')
    .digest('hex');
}

test('Windows and POSIX relative paths produce the same artifact identity', () => {
  const windowsPath = win32.relative('C:\\dist', 'C:\\dist\\assets\\app.js');
  const posixPath = posix.relative('/dist', '/dist/assets/app.js');

  assert.notEqual(windowsPath, posixPath);
  assert.equal(artifactIdentity(windowsPath, win32.sep), artifactIdentity(posixPath, posix.sep));
});

test('creator and verifier normalize every relative dist path before use', () => {
  for (const name of manifestScripts) {
    const source = readFileSync(join(root, 'scripts', name), 'utf8');
    assert.ok(
      source.includes("relative(directory, child).replaceAll(sep, '/')"),
      `${name}: ignored-file inventory must use canonical separators`,
    );
    assert.ok(
      source.includes("relative(directory, path).replaceAll(sep, '/')"),
      `${name}: artifact hashing must use canonical separators`,
    );
  }
});

test('client artifact identity excludes wall-clock build values', () => {
  const viteSource = readFileSync(join(root, 'vite.config.ts'), 'utf8');

  assert.doesNotMatch(viteSource, /(?:__DOMHAMSTER_BUILT_AT__|new Date|Date\.now)/u);
});
