import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync('netlify.toml', 'utf8');
const requiredPatterns = Object.freeze([
  ['build command', /\[build\][\s\S]*?command\s*=\s*"npm run build"/u],
  ['publish directory', /\[build\][\s\S]*?publish\s*=\s*"dist"/u],
  ['Node 24 runtime', /NODE_VERSION\s*=\s*"24(?:\.[0-9]+){0,2}"/u],
  [
    'SPA fallback',
    /\[\[redirects\]\][\s\S]*?from\s*=\s*"\/\*"[\s\S]*?to\s*=\s*"\/index\.html"[\s\S]*?status\s*=\s*200/u,
  ],
  [
    'immutable asset cache',
    /for\s*=\s*"\/assets\/\*"[\s\S]*?Cache-Control\s*=\s*"public, max-age=31536000, immutable"/u,
  ],
  ['HTML no-store', /for\s*=\s*"\/index\.html"[\s\S]*?Cache-Control\s*=\s*"no-store, max-age=0"/u],
  [
    'release identity no-store',
    /for\s*=\s*"\/release-manifest\.json"[\s\S]*?Cache-Control\s*=\s*"no-store, max-age=0"/u,
  ],
  ['origin agent cluster', /Origin-Agent-Cluster\s*=\s*"\?1"/u],
  ['same-origin WebMCP policy', /Permissions-Policy\s*=\s*"tools=\(self\)"/u],
  ['no-referrer policy', /Referrer-Policy\s*=\s*"no-referrer"/u],
  ['MIME sniffing protection', /X-Content-Type-Options\s*=\s*"nosniff"/u],
  ['frame denial', /X-Frame-Options\s*=\s*"DENY"/u],
  [
    'restrictive CSP',
    /Content-Security-Policy\s*=\s*"[^"]*default-src 'self'[^"]*frame-ancestors 'none'[^"]*object-src 'none'[^"]*"/u,
  ],
]);

for (const [label, pattern] of requiredPatterns) {
  assert.match(config, pattern, `DOMHAMSTER_NETLIFY_CONFIG_MISSING:${label}`);
}

assert.doesNotMatch(
  config,
  /(?:TOKEN|SECRET|PASSWORD|API_KEY)\s*=/iu,
  'DOMHAMSTER_NETLIFY_SECRET_REFERENCE',
);
assert.doesNotMatch(config, /https?:\/\//u, 'DOMHAMSTER_NETLIFY_EXTERNAL_TARGET');

console.log(`DOMHAMSTER_NETLIFY_CONFIG_PASS checks=${requiredPatterns.length}`);
