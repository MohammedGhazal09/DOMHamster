import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreConnectedApp } from './app/StoreConnectedApp.tsx';
import { createDefaultBrowserRuntime } from './app/browser-runtime.ts';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('DOMHAMSTER_ROOT_MISSING');
}

const runtime = createDefaultBrowserRuntime();

createRoot(rootElement).render(
  <StrictMode>
    <StoreConnectedApp
      store={runtime.store}
      capabilityStatus={runtime.capabilityStatus}
    />
  </StrictMode>,
);

void runtime.start();
window.addEventListener('pagehide', () => runtime.teardown(), { once: true });
