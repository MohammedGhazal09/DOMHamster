import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StoreConnectedApp } from './app/StoreConnectedApp.tsx';
import { createDefaultBrowserRuntime } from './app/browser-runtime.ts';
import { ApplicationErrorBoundary } from './ui/ErrorBoundaryFallback.tsx';
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

async function resetAfterRenderFailure(): Promise<void> {
  const result = await runtime.store.dispatch({ type: 'RESET_DEMO', actor: 'human' });
  if (!result.ok) throw new Error('DOMHAMSTER_RENDER_RECOVERY_FAILED');
}

createRoot(rootElement).render(
  <StrictMode>
    <ApplicationErrorBoundary onReset={resetAfterRenderFailure}>
      <StoreConnectedApp
        store={runtime.store}
        capabilityStatus={runtime.capabilityStatus}
        registrySource={registrySource}
      />
    </ApplicationErrorBoundary>
  </StrictMode>,
);

void runtime.start();
window.addEventListener('pagehide', () => runtime.teardown(), { once: true });
