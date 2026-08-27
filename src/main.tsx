import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreConnectedApp } from './app/StoreConnectedApp.tsx';
import { createDefaultBrowserRuntime } from './app/browser-runtime.ts';
import './app/hardening.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('DOMHAMSTER_ROOT_MISSING');
}

const runtime = createDefaultBrowserRuntime();
const registrySource = Object.freeze({
  subscribe: runtime.subscribeRegistry,
  getSnapshot: runtime.getRegistrySnapshot,
});

createRoot(rootElement).render(
  <StrictMode>
    <StoreConnectedApp
      store={runtime.store}
      capabilityStatus={runtime.capabilityStatus}
      registrySource={registrySource}
    />
  </StrictMode>,
);

void runtime.start();
window.addEventListener('pagehide', () => runtime.teardown(), { once: true });
