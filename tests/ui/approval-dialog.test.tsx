import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { selectAssignmentDraft, selectOpenRequests } from '../../src/app/selectors.ts';
import type { AppState } from '../../src/domain/types.ts';
import { ApprovalDialog } from '../../src/ui/ApprovalDialog.tsx';
import type { WorkflowCommandHandler } from '../../src/ui/workflow-commands.ts';
import { workflowStates } from '../helpers/webmcp-fixtures.ts';

function awaitingApprovalState(): Extract<AppState, { workflowState: 'AWAITING_APPROVAL' }> {
  const state = workflowStates().AWAITING_APPROVAL;
  if (state.workflowState !== 'AWAITING_APPROVAL') {
    throw new Error('TEST_EXPECTED_AWAITING_APPROVAL');
  }
  return state;
}

function ApprovalHarness({ onCommand }: { readonly onCommand: WorkflowCommandHandler }) {
  const state = awaitingApprovalState();
  const draft = selectAssignmentDraft(state);
  const [open, setOpen] = useState(false);
  if (draft === null) throw new Error('TEST_EXPECTED_DRAFT');

  return (
    <>
      <button id="approval-opener" type="button" onClick={() => setOpen(true)}>
        Open review
      </button>
      {open ? (
        <ApprovalDialog
          draft={draft}
          approval={state.approval}
          requests={selectOpenRequests(state)}
          onCommand={async (command) => {
            await onCommand(command);
            if (command.type === 'CANCEL_APPROVAL') setOpen(false);
          }}
          onAnnouncement={() => undefined}
          returnFocusId="approval-opener"
        />
      ) : null}
    </>
  );
}

describe('approval review dialog', () => {
  it('shows the exact version, all assignments, warnings, locks, and only human decisions', async () => {
    const state = awaitingApprovalState();
    const draft = selectAssignmentDraft(state);
    if (draft === null) throw new Error('TEST_EXPECTED_DRAFT');

    render(
      <ApprovalDialog
        draft={draft}
        approval={state.approval}
        requests={selectOpenRequests(state)}
        onCommand={() => undefined}
        onAnnouncement={() => undefined}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Review draft v1 before approval',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      within(dialog).getByText(
        'Approval authorizes the agent to commit this exact version for 120 seconds. Any edit, unlock, rejection, cancellation, reset, reload, or expiry invalidates approval.',
      ),
    ).toBeVisible();
    expect(within(dialog).getByRole('table', { name: 'Draft assignment review' })).toBeVisible();
    expect(
      within(dialog).getByRole('region', {
        name: 'Draft assignment review horizontal scroll area',
      }),
    ).toBeVisible();
    expect(within(dialog).getByText('15:00:00')).toBeVisible();
    expect(within(dialog).getAllByRole('row')).toHaveLength(9);
    expect(within(dialog).getByText(/8 assignments reviewed/)).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Approve version 1' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Reject and return' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Cancel review' })).toBeEnabled();
    expect(within(dialog).queryByRole('button', { name: /commit/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        within(dialog).getByRole('heading', { name: 'Review draft v1 before approval' }),
      ).toHaveFocus();
    });
  });

  it('dispatches exact approve and reject commands for the reviewed version', async () => {
    const state = awaitingApprovalState();
    const draft = selectAssignmentDraft(state);
    if (draft === null) throw new Error('TEST_EXPECTED_DRAFT');
    const onCommand = vi.fn<WorkflowCommandHandler>().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <ApprovalDialog
        draft={draft}
        approval={state.approval}
        requests={selectOpenRequests(state)}
        onCommand={onCommand}
        onAnnouncement={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Approve version 1' }));
    expect(onCommand).toHaveBeenLastCalledWith({
      type: 'APPROVE',
      actor: 'human',
      expectedDraftVersion: 1,
    });

    cleanup();
    render(
      <ApprovalDialog
        draft={draft}
        approval={state.approval}
        requests={selectOpenRequests(state)}
        onCommand={onCommand}
        onAnnouncement={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Reject and return' }));
    expect(onCommand).toHaveBeenLastCalledWith({
      type: 'REJECT',
      actor: 'human',
      expectedDraftVersion: 1,
    });
  });

  it('traps focus, cancels with Escape, and returns focus to the opener', async () => {
    const onCommand = vi.fn<WorkflowCommandHandler>().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ApprovalHarness onCommand={onCommand} />);

    const opener = screen.getByRole('button', { name: 'Open review' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', {
      name: 'Review draft v1 before approval',
    });
    await waitFor(() => {
      expect(within(dialog).getByRole('heading', { level: 2 })).toHaveFocus();
    });

    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Cancel review' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByRole('button', { name: 'Approve version 1' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onCommand).toHaveBeenLastCalledWith({
      type: 'CANCEL_APPROVAL',
      actor: 'human',
      expectedDraftVersion: 1,
    });
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
