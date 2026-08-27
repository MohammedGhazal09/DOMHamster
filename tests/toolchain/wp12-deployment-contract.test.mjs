import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const requiredFiles = [
  'netlify.toml',
  'docs/compatibility/chatgpt-in-app.md',
  'docs/compatibility/chrome-webmcp.md',
  'docs/releases/rc-checklist.md',
  'scripts/check-netlify-config.mjs',
];

for (const path of requiredFiles) {
  assert.equal(existsSync(join(root, path)), true, `WP12_REQUIRED_FILE_MISSING:${path}`);
}

const config = readFileSync(join(root, 'netlify.toml'), 'utf8');
const requiredPatterns = [
  /\[build\][\s\S]*?command\s*=\s*"npm run build"/u,
  /\[build\][\s\S]*?publish\s*=\s*"dist"/u,
  /from\s*=\s*"\/\*"[\s\S]*?to\s*=\s*"\/index\.html"[\s\S]*?status\s*=\s*200/u,
  /for\s*=\s*"\/assets\/\*"[\s\S]*?Cache-Control\s*=\s*"public, max-age=31536000, immutable"/u,
  /for\s*=\s*"\/index\.html"[\s\S]*?Cache-Control\s*=\s*"no-store, max-age=0"/u,
  /for\s*=\s*"\/release-manifest\.json"[\s\S]*?Cache-Control\s*=\s*"no-store, max-age=0"/u,
  /Origin-Agent-Cluster\s*=\s*"\?1"/u,
  /Permissions-Policy\s*=\s*"tools=\(self\)"/u,
  /Referrer-Policy\s*=\s*"no-referrer"/u,
  /X-Content-Type-Options\s*=\s*"nosniff"/u,
  /Content-Security-Policy\s*=\s*"[^"]*default-src 'self'[^"]*frame-ancestors 'none'[^"]*"/u,
];
for (const pattern of requiredPatterns) {
  assert.match(config, pattern, `WP12_NETLIFY_CONTRACT_MISSING:${pattern.source}`);
}
assert.doesNotMatch(config, /(?:TOKEN|SECRET|PASSWORD|API_KEY)\s*=/iu, 'WP12_NETLIFY_SECRET_REFERENCE');

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(packageJson.scripts?.['verify:deployment'], 'node scripts/check-netlify-config.mjs');
assert.match(packageJson.scripts?.build ?? '', /create-release-manifest\.mjs --dist-only/u);

console.log('DOMHAMSTER_WP12_DEPLOYMENT_CONTRACT_PASS');
