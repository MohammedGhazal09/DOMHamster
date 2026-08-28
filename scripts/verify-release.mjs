import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  FROZEN_FIXTURE_HASH,
  gitCommit,
  readToolMetadata,
  sha256File,
} from './lib/source-metadata.mjs';

const IGNORED_DIST_FILES = new Set(['release-manifest.json']);

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function directoryHash(directory) {
  const files = [];

  function walk(path) {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) walk(child);
      else if (!IGNORED_DIST_FILES.has(relative(directory, child))) files.push(child);
    }
  }

  walk(directory);
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(relative(directory, path));
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return { hash: hash.digest('hex'), files: files.length };
}

const root = process.cwd();
const manifestPath = join(root, argument('--manifest') ?? 'release-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const { contracts, lifecycle } = readToolMetadata(root);
const expectedCommit = process.env.COMMIT_REF ?? gitCommit(root);
const dist = directoryHash(join(root, 'dist'));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.product, 'DOMHamster');
assert.equal(manifest.sourceCommit, expectedCommit, 'DOMHAMSTER_RELEASE_COMMIT_MISMATCH');
assert.equal(manifest.fixture.sha256, FROZEN_FIXTURE_HASH, 'DOMHAMSTER_FIXTURE_HASH_MISMATCH');
assert.deepEqual(
  manifest.tools.names,
  contracts.map(({ name }) => name),
);
assert.deepEqual(
  manifest.tools.lifecycleCounts,
  Object.fromEntries(Object.entries(lifecycle).map(([state, names]) => [state, names.length])),
);
assert.equal(manifest.hashes.packageLockSha256, sha256File(join(root, 'package-lock.json')));
assert.equal(manifest.hashes.contractsSha256, sha256File(join(root, 'src/webmcp/contracts.ts')));
assert.equal(manifest.hashes.lifecycleSha256, sha256File(join(root, 'src/webmcp/lifecycle.ts')));
assert.equal(manifest.hashes.distSha256, dist.hash);
assert.equal(manifest.build.files, dist.files);

console.log(`DOMHAMSTER_RELEASE_VERIFIED commit=${manifest.sourceCommit}`);
