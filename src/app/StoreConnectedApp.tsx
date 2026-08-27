import { useSyncExternalStore } from 'react';
import { App, type AppProps } from './App.tsx';
import type { AppStore } from './store.ts';

export interface StoreConnectedAppProps
  extends Omit<AppProps, 'state' | 'onHumanDraftCommand' | 'onWorkflowCommand'> {
  readonly store: AppStore;
}

export function StoreConnectedApp({ store, ...appProps }: StoreConnectedAppProps) {
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);

  return (
    <App
      {...appProps}
      state={state}
      onWorkflowCommand={store.dispatch}
    />
  );
}
