import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  FROZEN_FIXTURE_HASH,
  gitCommit,
  readToolMetadata,
  sha256File,
} from './lib/source-metadata.mjs';

const IGNORED_DIST_FILES = new Set(['release-manifest.json']);

function directoryHash(directory) {
  const files = [];

  function walk(path) {
    for (const name of readdirSync(path).sort()) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) walk(child);
      else if (!IGNORED_DIST_FILES.has(relative(directory, child).replaceAll(sep, '/')))
        files.push(child);
    }
  }

  walk(directory);
  const hash = createHash('sha256');
  for (const path of files) {
    hash.update(relative(directory, path).replaceAll(sep, '/'));
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return { hash: hash.digest('hex'), files: files.length };
}

const root = process.cwd();
const distDirectory = join(root, 'dist');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const { contracts, lifecycle } = readToolMetadata(root);
const dist = directoryHash(distDirectory);
const sourceCommit = process.env.COMMIT_REF ?? gitCommit(root);
const manifest = {
  schemaVersion: 1,
  product: 'DOMHamster',
  releaseVersion: process.env.DOMHAMSTER_RELEASE_VERSION ?? packageJson.version,
  sourceCommit,
  generatedAt: new Date().toISOString(),
  runtime: { node: process.version, packageManager: packageJson.packageManager },
  deployment: {
    context: process.env.CONTEXT ?? 'local',
    deployId: process.env.DEPLOY_ID ?? null,
    deployUrl: process.env.DEPLOY_PRIME_URL ?? null,
  },
  fixture: { sha256: FROZEN_FIXTURE_HASH, requests: 8, volunteers: 5 },
  tools: {
    count: contracts.length,
    names: contracts.map(({ name }) => name),
    lifecycleCounts: Object.fromEntries(
      Object.entries(lifecycle).map(([state, names]) => [state, names.length]),
    ),
  },
  hashes: {
    packageLockSha256: sha256File(join(root, 'package-lock.json')),
    contractsSha256: sha256File(join(root, 'src/webmcp/contracts.ts')),
    lifecycleSha256: sha256File(join(root, 'src/webmcp/lifecycle.ts')),
    distSha256: dist.hash,
  },
  build: { files: dist.files },
};
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

mkdirSync(distDirectory, { recursive: true });
writeFileSync(join(distDirectory, 'release-manifest.json'), serialized);
if (!process.argv.includes('--dist-only')) {
  writeFileSync(join(root, 'release-manifest.json'), serialized);
}

console.log(`DOMHAMSTER_RELEASE_MANIFEST_CREATED commit=${manifest.sourceCommit}`);
