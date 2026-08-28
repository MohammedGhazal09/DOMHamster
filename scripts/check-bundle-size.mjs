import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
const root = process.cwd();
const dist = join(root, 'dist');
const files = [];
function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(dist);
let rawBytes = 0;
let gzipCodeBytes = 0;
const inventory = [];
for (const path of files) {
  const bytes = readFileSync(path);
  rawBytes += bytes.length;
  const extension = extname(path);
  const gzipBytes = ['.js', '.css'].includes(extension) ? gzipSync(bytes).length : 0;
  gzipCodeBytes += gzipBytes;
  inventory.push({ path: relative(root, path), rawBytes: bytes.length, gzipBytes });
}
assert.ok(files.length > 0, 'DOMHAMSTER_DIST_EMPTY');
assert.ok(rawBytes <= 1_500_000, `DOMHAMSTER_BUNDLE_RAW_LIMIT:${rawBytes}`);
assert.ok(gzipCodeBytes <= 300 * 1024, `DOMHAMSTER_BUNDLE_GZIP_LIMIT:${gzipCodeBytes}`);
console.log(JSON.stringify({ rawBytes, gzipCodeBytes, inventory }, null, 2));
