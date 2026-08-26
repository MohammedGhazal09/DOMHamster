import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('DOMHAMSTER_ROOT_MISSING');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
