import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.DOMHAMSTER_ROOT ?? process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const registry = read('src/webmcp/registry.ts');
const runtime = read('src/app/browser-runtime.ts');
const connectedApp = read('src/app/StoreConnectedApp.tsx');
const app = read('src/app/App.tsx');
const main = read('src/main.tsx');

for (const fragment of [
  'subscribe(listener: () => void): () => void;',
  'const listeners = new Set<() => void>();',
  'function notify(): void',
  'subscribe(listener: () => void)',
]) {
  assert.ok(registry.includes(fragment), `REGISTRY_BRIDGE_FRAGMENT_MISSING:${fragment}`);
}

for (const fragment of [
  'readonly subscribeRegistry: (listener: () => void) => () => void;',
  'return registry?.subscribe(listener)',
]) {
  assert.ok(runtime.includes(fragment), `RUNTIME_REGISTRY_BRIDGE_MISSING:${fragment}`);
}

for (const fragment of [
  'RegistrySnapshotSource',
  'registrySource',
  'registrySnapshotKey',
  'registrySnapshot?.registeredToolNames ?? EMPTY_REGISTERED_TOOL_NAMES',
  'registrySnapshot?.errorCodes ?? EMPTY_REGISTRY_ERRORS',
]) {
  assert.ok(connectedApp.includes(fragment), `CONNECTED_APP_REGISTRY_BRIDGE_MISSING:${fragment}`);
}

for (const fragment of [
  'readonly registryErrorCodes?: readonly string[];',
  'const combinedErrorCodes = useMemo',
  'registryErrorCodes',
]) {
  assert.ok(app.includes(fragment), `APP_REGISTRY_DIAGNOSTICS_MISSING:${fragment}`);
}

assert.ok(main.includes('registrySource={registrySource}'), 'MAIN_REGISTRY_SOURCE_NOT_CONNECTED');
assert.ok(
  main.includes('subscribe: runtime.subscribeRegistry'),
  'MAIN_REGISTRY_SUBSCRIBE_NOT_CONNECTED',
);
assert.ok(
  main.includes('getSnapshot: runtime.getRegistrySnapshot'),
  'MAIN_REGISTRY_SNAPSHOT_NOT_CONNECTED',
);

console.log('DOMHAMSTER_REGISTRY_UI_BRIDGE_CONTRACT_PASS');
