import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const requiredFiles = [
  'src/ui/ErrorBoundaryFallback.tsx',
  'tests/ui/error-boundary-fallback.test.tsx',
];
for (const path of requiredFiles) {
  assert.equal(existsSync(join(root, path)), true, `ERROR_BOUNDARY_REQUIRED_FILE_MISSING:${path}`);
}

const boundary = readFileSync(join(root, 'src/ui/ErrorBoundaryFallback.tsx'), 'utf8');
const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
const styles = readFileSync(join(root, 'src/app/hardening.css'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

for (const fragment of [
  'class ApplicationErrorBoundary',
  'getDerivedStateFromError',
  'componentDidCatch',
  'ErrorBoundaryFallback',
  'Reset fictional scenario',
  'Reload page',
  'role="alert"',
  'headingRef.current?.focus()',
]) {
  assert.ok(boundary.includes(fragment), `ERROR_BOUNDARY_FRAGMENT_MISSING:${fragment}`);
}
assert.doesNotMatch(
  boundary,
  /(?:error|caught|reason)\.(?:message|stack)|String\((?:error|caught|reason)\)/u,
  'ERROR_BOUNDARY_RAW_EXCEPTION_EXPOSURE',
);
assert.ok(
  main.includes("import { ApplicationErrorBoundary } from './ui/ErrorBoundaryFallback.tsx';"),
  'ERROR_BOUNDARY_MAIN_IMPORT_MISSING',
);
assert.ok(main.includes('<ApplicationErrorBoundary'), 'ERROR_BOUNDARY_MAIN_WRAPPER_MISSING');
assert.ok(
  main.includes("type: 'RESET_DEMO', actor: 'human'"),
  'ERROR_BOUNDARY_RESET_COMMAND_MISSING',
);
for (const className of [
  '.error-boundary-shell',
  '.error-boundary-card',
  '.error-boundary-actions',
  '.error-boundary-reference',
]) {
  assert.ok(styles.includes(className), `ERROR_BOUNDARY_STYLE_MISSING:${className}`);
}
assert.equal(
  packageJson.scripts?.['verify:recovery'],
  'node tests/toolchain/error-boundary-contract.test.mjs',
  'ERROR_BOUNDARY_VERIFY_SCRIPT_MISSING',
);
assert.match(
  packageJson.scripts?.verify ?? '',
  /npm run verify:recovery/u,
  'ERROR_BOUNDARY_NOT_IN_VERIFY_GATE',
);

console.log('DOMHAMSTER_ERROR_BOUNDARY_CONTRACT_PASS');
