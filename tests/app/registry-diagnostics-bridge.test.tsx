import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  StoreConnectedApp,
  type RegistrySnapshotSource,
} from '../../src/app/StoreConnectedApp.tsx';
import type { WebMcpRegistrySnapshot } from '../../src/webmcp/registry.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { createTestStore } from '../helpers/webmcp-fixtures.ts';

class MutableRegistrySource implements RegistrySnapshotSource {
  private readonly listeners = new Set<() => void>();

  constructor(private snapshot: WebMcpRegistrySnapshot | null) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): WebMcpRegistrySnapshot | null {
    return this.snapshot;
  }

  setSnapshot(snapshot: WebMcpRegistrySnapshot | null): void {
    this.snapshot = snapshot;
    for (const listener of [...this.listeners]) listener();
  }
}

function registrySnapshot(
  registeredToolNames: WebMcpRegistrySnapshot['registeredToolNames'],
  errorCodes: WebMcpRegistrySnapshot['errorCodes'],
  generation: number,
): WebMcpRegistrySnapshot {
  return Object.freeze({
    active: true,
    desiredToolNames: desiredToolNames('READY'),
    registeredToolNames,
    errorCodes,
    generation,
  });
}

describe('registry diagnostics bridge', () => {
  it('shows observed registrations and registration errors rather than desired tools', async () => {
    const user = userEvent.setup();
    const { store } = createTestStore();
    const source = new MutableRegistrySource(
      registrySnapshot(
        Object.freeze(['get_coordination_overview']),
        Object.freeze(['TOOL_REGISTRATION_FAILED']),
        1,
      ),
    );

    render(
      <StoreConnectedApp store={store} capabilityStatus="AVAILABLE" registrySource={source} />,
    );

    await user.click(screen.getByRole('button', { name: 'Diagnostics' }));

    const registered = within(screen.getByLabelText('Registered tools'));
    expect(registered.getByText('get_coordination_overview')).toBeVisible();
    expect(registered.queryByText('list_open_requests')).not.toBeInTheDocument();
    expect(screen.getByText('TOOL_REGISTRATION_FAILED')).toBeVisible();

    act(() => {
      source.setSnapshot(registrySnapshot(desiredToolNames('READY'), Object.freeze([]), 2));
    });

    expect(registered.getByText('list_open_requests')).toBeVisible();
    expect(screen.queryByText('TOOL_REGISTRATION_FAILED')).not.toBeInTheDocument();
  });
});
