import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/u).filter(Boolean);
const textExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.css', '.html', '.toml', '.yml', '.yaml']);
const secretPatterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/u,/\bgithub_pat_[A-Za-z0-9_]{20,}\b/u,/\bsk-[A-Za-z0-9_-]{20,}\b/u,/\bAKIA[0-9A-Z]{16}\b/u];
const violations = [];
for (const path of tracked) {
  if (!textExtensions.has(extname(path)) && !['LICENSE', '.gitignore', '.npmrc', '.nvmrc'].includes(path)) continue;
  const text = readFileSync(path, 'utf8');
  for (const pattern of secretPatterns) if (pattern.test(text)) violations.push(`${path}:secret:${pattern.source}`);
  if (path.startsWith('src/')) {
    if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/u.test(text)) violations.push(`${path}:runtime-network-client`);
    if (/\b(?:gtag|analytics|segment|mixpanel|sentry)\b/iu.test(text)) violations.push(`${path}:telemetry-token`);
    if (/console\.(?:log|debug|info)\s*\(/u.test(text)) violations.push(`${path}:unsafe-console-output`);
  }
  if (path.startsWith('src/ui/') && /\b(?:privateContacts|fictionalContactChannel|fictionalLocation)\b/u.test(text)) violations.push(`${path}:restricted-field-reference`);
  if (path.startsWith('src/webmcp/') && /document\.(?:querySelector|getElementById)|\.click\s*\(/u.test(text)) violations.push(`${path}:presentation-dom-access`);
  if (path.startsWith('src/ui/') && /\blocalStorage\b/u.test(text)) violations.push(`${path}:direct-storage-access`);
}
assert.deepEqual(violations, [], `DOMHAMSTER_SOURCE_SAFETY_FAILURE\n${violations.join('\n')}`);
console.log(`DOMHAMSTER_SOURCE_SAFETY_PASS files=${tracked.length}`);
