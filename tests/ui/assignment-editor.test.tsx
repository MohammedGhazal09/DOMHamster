import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  selectAssignmentDraft,
  selectAvailableVolunteers,
  selectOpenRequests,
} from '../../src/app/selectors.ts';
import { StoreConnectedApp } from '../../src/app/StoreConnectedApp.tsx';
import { reduceCommand } from '../../src/domain/commands.ts';
import { requestId, volunteerId, type AppState } from '../../src/domain/types.ts';
import type { HumanDraftCommandHandler } from '../../src/ui/AssignmentTable.tsx';
import { PlanWorkspace } from '../../src/ui/PlanWorkspace.tsx';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import {
  commandDependencies,
  createTestStore,
  expectCommandSuccess,
  workflowStates,
} from '../helpers/webmcp-fixtures.ts';

function renderDraft(state: AppState, onCommand: HumanDraftCommandHandler = vi.fn()) {
  const draft = selectAssignmentDraft(state);
  if (draft === null) throw new Error('TEST_EXPECTED_DRAFT');

  return render(
    <PlanWorkspace
      state={state}
      draft={draft}
      requests={selectOpenRequests(state)}
      volunteers={selectAvailableVolunteers(state)}
      toolNames={desiredToolNames(state.workflowState)}
      onCommand={onCommand}
    />,
  );
}

function lockedDraftState(): AppState {
  const state = workflowStates().DRAFT_VALID;
  if (state.workflowState !== 'DRAFT_VALID') {
    throw new Error('TEST_EXPECTED_VALID_DRAFT_STATE');
  }

  return expectCommandSuccess(
    reduceCommand(
      state,
      {
        type: 'LOCK_ASSIGNMENT',
        actor: 'human',
        expectedDraftVersion: state.draft.version,
        requestId: requestId('R-105'),
      },
      commandDependencies(),
    ),
  );
}

describe('human assignment editor', () => {
  it('renders the complete valid draft with labeled native controls and actor cues', () => {
    renderDraft(workflowStates().DRAFT_VALID);

    expect(
      screen.getByText('This draft passes all hard constraints and is ready for human review.'),
    ).toBeVisible();
    expect(screen.getByText('Draft v1')).toBeVisible();

    const table = screen.getByRole('table', { name: 'Assignment editor' });
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    expect(within(table).getByRole('rowheader', { name: /R-105/ })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Volunteer for R-105' })).toHaveValue('V-01');
    expect(screen.getByLabelText('Start time for R-105')).toHaveValue('12:30');
    expect(screen.getByRole('button', { name: 'Lock assignment for R-105' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getAllByText('Last accepted change: Agent').length).toBeGreaterThan(0);
  });

  it('emits one exact human edit command when the volunteer changes', async () => {
    const onCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDraft(workflowStates().DRAFT_VALID, onCommand);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Volunteer for R-105' }),
      'V-03',
    );

    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({
      type: 'EDIT_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
      patch: {
        volunteerId: volunteerId('V-03'),
        startTime: '12:30',
        status: 'planned',
      },
    });
  });

  it('emits one exact human edit command when the start time changes', () => {
    const onCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    renderDraft(workflowStates().DRAFT_VALID, onCommand);

    fireEvent.change(screen.getByLabelText('Start time for R-105'), {
      target: { value: '13:00' },
    });

    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({
      type: 'EDIT_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
      patch: {
        volunteerId: volunteerId('V-01'),
        startTime: '13:00',
        status: 'planned',
      },
    });
  });

  it('uses an explicit unassigned option and clears volunteer and time together', async () => {
    const onCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDraft(workflowStates().DRAFT_VALID, onCommand);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Volunteer for R-105' }),
      '',
    );

    expect(onCommand).toHaveBeenCalledWith({
      type: 'EDIT_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
      patch: {
        volunteerId: null,
        startTime: null,
        status: 'unassigned',
      },
    });
  });

  it('emits lock and unlock commands while making locked assignments read-only', async () => {
    const lockCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderDraft(workflowStates().DRAFT_VALID, lockCommand);

    await user.click(screen.getByRole('button', { name: 'Lock assignment for R-105' }));

    expect(lockCommand).toHaveBeenCalledWith({
      type: 'LOCK_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 1,
      requestId: requestId('R-105'),
    });

    const unlockCommand = vi.fn<HumanDraftCommandHandler>().mockResolvedValue(undefined);
    renderDraft(lockedDraftState(), unlockCommand);

    expect(
      screen.getAllByRole('combobox', { name: 'Volunteer for R-105' }).at(-1),
    ).toBeDisabled();
    expect(screen.getAllByLabelText('Start time for R-105').at(-1)).toBeDisabled();
    const unlockButton = screen
      .getAllByRole('button', { name: 'Unlock assignment for R-105' })
      .at(-1);
    expect(unlockButton).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen
        .getAllByText(
          'Locked by the coordinator. Agent revisions cannot change this assignment.',
        )
        .at(-1),
    ).toBeVisible();
    expect(screen.getAllByText('Last accepted change: You').at(-1)).toBeVisible();

    if (unlockButton === undefined) throw new Error('TEST_UNLOCK_BUTTON_MISSING');
    await user.click(unlockButton);

    expect(unlockCommand).toHaveBeenCalledWith({
      type: 'UNLOCK_ASSIGNMENT',
      actor: 'human',
      expectedDraftVersion: 2,
      requestId: requestId('R-105'),
    });
  });

  it('re-renders accepted human commands from the shared application store', async () => {
    const initialState = workflowStates().DRAFT_VALID;
    const { store } = createTestStore(initialState);
    const user = userEvent.setup();

    render(
      <StoreConnectedApp
        store={store}
        capabilityStatus="AVAILABLE"
        registeredToolNames={desiredToolNames(initialState.workflowState)}
      />,
    );

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Volunteer for R-105' }),
      'V-03',
    );
    expect(await screen.findByText('Draft v2')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Lock assignment for R-105' }));
    expect(await screen.findByText('Draft v3')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Volunteer for R-105' })).toBeDisabled();
    expect(store.getState().draft?.version).toBe(3);
  });

  it('renders blocking validation evidence and links issues back to affected rows', async () => {
    const user = userEvent.setup();
    renderDraft(workflowStates().DRAFT_INVALID);

    expect(
      screen.getByText(
        'This draft has blocking conflicts. Resolve every error before approval can begin.',
      ),
    ).toBeVisible();

    const validation = screen.getByRole('region', { name: 'Draft validation' });
    expect(within(validation).getByText('VOLUNTEER_TIME_OVERLAP')).toBeVisible();
    expect(within(validation).getByText('Volunteer assignments overlap in time.')).toBeVisible();

    await user.click(
      within(validation).getByRole('button', { name: 'Focus assignment R-105' }),
    );
    expect(document.activeElement).toHaveAttribute('id', 'assignment-row-R-105');
  });
});
