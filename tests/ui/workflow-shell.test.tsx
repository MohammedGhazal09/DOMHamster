import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { StoreConnectedApp } from '../../src/app/StoreConnectedApp.tsx';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { registrySourceForStore } from '../helpers/registry-source.ts';
import { createTestStore, workflowStates } from '../helpers/webmcp-fixtures.ts';

describe('store-connected approval and recovery workflow', () => {
  it('lets the human approve the exact reviewed version and exposes no human commit button', async () => {
    const initialState = workflowStates().AWAITING_APPROVAL;
    const { store } = createTestStore(initialState);
    const user = userEvent.setup();

    render(
      <StoreConnectedApp
        store={store}
        capabilityStatus="AVAILABLE"
        registrySource={registrySourceForStore(store)}
        now={() => Date.parse('2026-08-26T12:00:30.000Z')}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Approve version 1' }));

    expect(await screen.findByText(/Version 1 approved/)).toBeVisible();
    expect(store.getState().workflowState).toBe('APPROVED');
    expect(screen.queryByRole('button', { name: /commit/i })).not.toBeInTheDocument();
  });

  it('requires a least-destructive confirmation before reset and restores READY', async () => {
    const initialState = workflowStates().COMMITTED;
    const { store } = createTestStore(initialState);
    const user = userEvent.setup();

    render(
      <StoreConnectedApp
        store={store}
        capabilityStatus="AVAILABLE"
        registrySource={registrySourceForStore(store)}
        now={() => Date.parse('2026-08-26T12:00:30.000Z')}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());
    await user.click(cancel);
    expect(store.getState().workflowState).toBe('COMMITTED');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Reset scenario' }));

    expect(await screen.findByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();
    expect(store.getState().workflowState).toBe('READY');
  });

  it('keeps approval by default and can explicitly return an approved draft to DRAFT_VALID', async () => {
    const initialState = workflowStates().APPROVED;
    const { store } = createTestStore(initialState);
    const user = userEvent.setup();

    render(
      <StoreConnectedApp
        store={store}
        capabilityStatus="AVAILABLE"
        registrySource={registrySourceForStore(store)}
        now={() => Date.parse('2026-08-26T12:00:30.000Z')}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel approval' }));
    const keepApproval = screen.getByRole('button', { name: 'Keep approval' });
    await waitFor(() => expect(keepApproval).toHaveFocus());
    await user.click(keepApproval);
    expect(store.getState().workflowState).toBe('APPROVED');

    await user.click(screen.getByRole('button', { name: 'Cancel approval' }));
    await user.click(screen.getAllByRole('button', { name: 'Cancel approval' }).at(-1)!);

    expect(await screen.findByText('Draft v1')).toBeVisible();
    expect(store.getState().workflowState).toBe('DRAFT_VALID');
    expect(store.getState().approval).toBeNull();
  });

  it('suppresses stale registered tools when WebMCP is unavailable', async () => {
    const state = workflowStates().READY;
    const user = userEvent.setup();

    render(
      <App
        state={state}
        capabilityStatus="API_UNAVAILABLE"
        registeredToolNames={desiredToolNames('READY')}
      />,
    );

    const plan = screen.getByRole('region', { name: 'Assignment plan' });
    expect(within(plan).getByText('0 tools available')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Diagnostics' }));
    const registeredTools = screen.getByRole('region', { name: 'Registered tools' });
    expect(within(registeredTools).getByText('None')).toBeVisible();
  });

  it('records safe command rejection codes in diagnostics', async () => {
    const state = workflowStates().DRAFT_VALID;
    const onWorkflowCommand = vi.fn().mockResolvedValue({
      ok: false,
      state,
      error: {
        code: 'STALE_DRAFT_VERSION',
        message: 'STALE_DRAFT_VERSION',
      },
    });
    const user = userEvent.setup();

    render(
      <App
        state={state}
        capabilityStatus="AVAILABLE"
        registeredToolNames={desiredToolNames(state.workflowState)}
        onWorkflowCommand={onWorkflowCommand}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Lock assignment for R-101' }));
    await waitFor(() => {
      expect(onWorkflowCommand).toHaveBeenCalledTimes(1);
    });
    await user.click(screen.getByRole('button', { name: 'Diagnostics' }));

    const errors = screen.getByRole('region', { name: 'Recent safe error codes' });
    expect(within(errors).getByText('STALE_DRAFT_VERSION')).toBeVisible();
  });

  it('records unexpected workflow exceptions as INTERNAL_ERROR', async () => {
    const state = workflowStates().DRAFT_VALID;
    const onWorkflowCommand = vi.fn().mockRejectedValue(new Error('private failure detail'));
    const user = userEvent.setup();

    render(
      <App
        state={state}
        capabilityStatus="AVAILABLE"
        registeredToolNames={desiredToolNames(state.workflowState)}
        onWorkflowCommand={onWorkflowCommand}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Lock assignment for R-101' }));
    await waitFor(() => {
      expect(onWorkflowCommand).toHaveBeenCalledTimes(1);
    });
    await user.click(screen.getByRole('button', { name: 'Diagnostics' }));

    const errors = screen.getByRole('region', { name: 'Recent safe error codes' });
    expect(within(errors).getByText('INTERNAL_ERROR')).toBeVisible();
    expect(document.body).not.toHaveTextContent('private failure detail');
  });

  it('opens activity and diagnostics from the global actions', async () => {
    const initialState = workflowStates().APPROVED;
    const { store } = createTestStore(initialState);
    const user = userEvent.setup();

    render(
      <StoreConnectedApp
        store={store}
        capabilityStatus="AVAILABLE"
        registrySource={registrySourceForStore(store)}
        now={() => Date.parse('2026-08-26T12:00:30.000Z')}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Activity' }));
    expect(screen.getByRole('dialog', { name: 'Activity history' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Close activity history' }));

    await user.click(screen.getByRole('button', { name: 'Diagnostics' }));
    expect(screen.getByRole('dialog', { name: 'Diagnostics' })).toBeVisible();
  });
});
