import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoreConnectedApp } from '../../src/app/StoreConnectedApp.tsx';
import { reduceCommand } from '../../src/domain/commands.ts';
import { requestId, type AppState } from '../../src/domain/types.ts';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import {
  commandDependencies,
  createTestStore,
  expectCommandSuccess,
  readyState,
  workflowStates,
} from '../helpers/webmcp-fixtures.ts';

function lockedAwaitingReviewState(): AppState {
  const dependencies = commandDependencies();
  const draft = expectCommandSuccess(
    reduceCommand(
      readyState(),
      {
        type: 'CREATE_DRAFT',
        actor: 'agent',
        assignments: workflowStates().DRAFT_VALID.draft?.assignments ?? [],
      },
      dependencies,
    ),
  );
  if (draft.workflowState !== 'DRAFT_VALID') {
    throw new Error('TEST_EXPECTED_VALID_DRAFT');
  }
  const locked = expectCommandSuccess(
    reduceCommand(
      draft,
      {
        type: 'LOCK_ASSIGNMENT',
        actor: 'human',
        expectedDraftVersion: draft.draft.version,
        requestId: requestId('R-105'),
      },
      dependencies,
    ),
  );
  if (locked.workflowState !== 'DRAFT_VALID') {
    throw new Error('TEST_EXPECTED_LOCKED_VALID_DRAFT');
  }
  return expectCommandSuccess(
    reduceCommand(
      locked,
      {
        type: 'PREPARE_APPROVAL',
        actor: 'agent',
        expectedDraftVersion: locked.draft.version,
      },
      dependencies,
    ),
  );
}

function renderStoreState(state: AppState) {
  const runtime = createTestStore(state);
  const result = render(
    <StoreConnectedApp
      store={runtime.store}
      capabilityStatus="AVAILABLE"
      registeredToolNames={desiredToolNames(state.workflowState)}
      now={() => Date.parse(runtime.dependencies.now())}
    />,
  );
  return { ...runtime, ...result };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('approval, commit, activity, and recovery surfaces', () => {
  it('shows an exact human approval review and approves only the visible version', async () => {
    const user = userEvent.setup();
    const { store } = renderStoreState(lockedAwaitingReviewState());

    const dialog = screen.getByRole('dialog', {
      name: 'Review draft v2 before approval',
    });
    expect(
      within(dialog).getByText(
        'Approval authorizes the agent to commit this exact version for 120 seconds. Any edit, unlock, rejection, cancellation, reset, reload, or expiry invalidates approval.',
      ),
    ).toBeVisible();
    expect(within(dialog).getAllByRole('row')).toHaveLength(9);
    expect(within(dialog).getByText('R-105')).toBeVisible();
    expect(within(dialog).getByText('Locked by coordinator')).toBeVisible();
    expect(within(dialog).getByText('No warnings require acknowledgement.')).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Approve version 2' }));

    expect(store.getState().workflowState).toBe('APPROVED');
    expect(
      await screen.findByText(
        'Version 2 approved. Waiting for the agent to commit. Approval expires in 02:00.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('dialog', { name: /Review draft/ })).not.toBeInTheDocument();
    expect(screen.getByText('commit_assignment_plan')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Commit/ })).not.toBeInTheDocument();
  });

  it.each([
    ['Reject and return', 'APPROVAL_REJECTED'],
    ['Cancel review', 'APPROVAL_CANCELLED'],
  ] as const)('returns review through %s and records %s', async (buttonName, eventType) => {
    const user = userEvent.setup();
    const { store } = renderStoreState(workflowStates().AWAITING_APPROVAL);

    await user.click(screen.getByRole('button', { name: buttonName }));

    expect(store.getState().workflowState).toBe('DRAFT_VALID');
    expect(store.getState().auditHistory.at(-1)?.type).toBe(eventType);
    expect(screen.queryByRole('dialog', { name: /Review draft/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('This draft passes all hard constraints and is ready for human review.'),
    ).toBeVisible();
  });

  it('allows the human to cancel an active approval without discarding the draft', async () => {
    const user = userEvent.setup();
    const { store } = renderStoreState(workflowStates().APPROVED);

    await user.click(screen.getByRole('button', { name: 'Cancel approval' }));
    const confirmation = screen.getByRole('alertdialog', {
      name: 'Cancel approval for version 1?',
    });
    expect(within(confirmation).getByRole('button', { name: 'Keep approval' })).toHaveFocus();
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel approval' }));

    expect(store.getState().workflowState).toBe('DRAFT_VALID');
    expect(store.getState().draft?.version).toBe(1);
    expect(store.getState().auditHistory.at(-1)?.type).toBe('APPROVAL_CANCELLED');
    expect(screen.queryByText('commit_assignment_plan')).not.toBeInTheDocument();
  });

  it('expires approval through the system clock and removes the commit tool', async () => {
    vi.useFakeTimers();
    const state = workflowStates().APPROVED;
    const { store, dependencies } = renderStoreState(state);

    expect(
      screen.getByText(
        'Version 1 approved. Waiting for the agent to commit. Approval expires in 02:00.',
      ),
    ).toBeVisible();

    dependencies.setNow(state.approval?.expiresAt ?? '2026-08-26T12:02:00.000Z');
    await vi.advanceTimersByTimeAsync(120_000);

    expect(store.getState().workflowState).toBe('DRAFT_VALID');
    expect(store.getState().auditHistory.at(-1)?.type).toBe('APPROVAL_EXPIRED');
    expect(screen.queryByText('commit_assignment_plan')).not.toBeInTheDocument();
  });

  it('confirms draft discard with the least-destructive initial focus', async () => {
    const user = userEvent.setup();
    const { store } = renderStoreState(workflowStates().DRAFT_VALID);

    await user.click(screen.getByRole('button', { name: 'Discard draft' }));
    const confirmation = screen.getByRole('alertdialog', { name: 'Discard draft v1?' });
    expect(within(confirmation).getByRole('button', { name: 'Keep draft' })).toHaveFocus();
    await user.click(within(confirmation).getByRole('button', { name: 'Discard draft' }));

    expect(store.getState().workflowState).toBe('READY');
    expect(store.getState().auditHistory.at(-1)?.type).toBe('DRAFT_DISCARDED');
    expect(screen.getByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();
  });

  it('shows the committed plan, progressive-disclosure notice, and no human commit control', () => {
    renderStoreState(workflowStates().COMMITTED);

    const summary = screen.getByRole('region', { name: 'Committed plan' });
    expect(within(summary).getByText('Plan committed. Human-approved version 1 is now final.'))
      .toBeVisible();
    expect(within(summary).getByText('PLAN-2')).toBeVisible();
    expect(within(summary).getAllByRole('row')).toHaveLength(9);
    expect(
      within(summary).getByText(
        'Dispatch details are fictional, returned only for selected assigned requests, and every access is recorded.',
      ),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: /Commit/ })).not.toBeInTheDocument();
    expect(screen.getByText('access_dispatch_contacts')).toBeVisible();
  });

  it('opens recent immutable activity with actor labels and closes without mutation', async () => {
    const user = userEvent.setup();
    const { store } = renderStoreState(workflowStates().COMMITTED);
    const before = store.getState();

    await user.click(screen.getByRole('button', { name: 'Activity' }));

    const drawer = screen.getByRole('dialog', { name: 'Activity' });
    expect(within(drawer).getByText('PLAN_COMMITTED')).toBeVisible();
    expect(within(drawer).getAllByText('Agent').length).toBeGreaterThan(0);
    expect(within(drawer).getAllByRole('listitem').length).toBeGreaterThan(0);
    await user.click(within(drawer).getByRole('button', { name: 'Close activity' }));

    expect(screen.queryByRole('dialog', { name: 'Activity' })).not.toBeInTheDocument();
    expect(store.getState()).toBe(before);
  });

  it('resets even a committed run only after explicit confirmation', async () => {
    const user = userEvent.setup();
    const { store } = renderStoreState(workflowStates().COMMITTED);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const confirmation = screen.getByRole('alertdialog', {
      name: 'Reset the canonical scenario?',
    });
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(confirmation).getByRole('button', { name: 'Reset scenario' }));

    expect(store.getState().workflowState).toBe('READY');
    expect(store.getState().auditHistory).toHaveLength(1);
    expect(store.getState().auditHistory[0]?.type).toBe('SCENARIO_RESET');
  });
});
