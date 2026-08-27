import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../src/domain/types.ts';
import { ApprovedBanner } from '../../src/ui/ApprovedBanner.tsx';
import type { WorkflowCommandHandler } from '../../src/ui/workflow-commands.ts';
import { workflowStates } from '../helpers/webmcp-fixtures.ts';

function approvedState(): Extract<AppState, { workflowState: 'APPROVED' }> {
  const state = workflowStates().APPROVED;
  if (state.workflowState !== 'APPROVED') throw new Error('TEST_EXPECTED_APPROVED');
  return state;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('approved-plan banner', () => {
  it('shows the exact approved version and bounded expiry countdown without a human commit control', () => {
    const state = approvedState();
    render(
      <ApprovedBanner
        approval={state.approval}
        draftVersion={state.draft.version}
        now={() => Date.parse(state.approval.expiresAt) - 90_000}
        onCommand={() => undefined}
        onRequestCancelApproval={() => undefined}
        onRequestDiscard={() => undefined}
        onAnnouncement={() => undefined}
      />,
    );

    expect(
      screen.getByText(
        'Version 1 approved. Waiting for the agent to commit. Approval expires in 01:30.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel approval' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard draft' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /commit/i })).not.toBeInTheDocument();
  });

  it('requests explicit human confirmations for cancellation and discard', async () => {
    const state = approvedState();
    const onRequestCancelApproval = vi.fn();
    const onRequestDiscard = vi.fn();
    const user = userEvent.setup();
    render(
      <ApprovedBanner
        approval={state.approval}
        draftVersion={state.draft.version}
        now={() => Date.parse(state.approval.expiresAt) - 60_000}
        onCommand={() => undefined}
        onRequestCancelApproval={onRequestCancelApproval}
        onRequestDiscard={onRequestDiscard}
        onAnnouncement={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel approval' }));
    await user.click(screen.getByRole('button', { name: 'Discard draft' }));

    expect(onRequestCancelApproval).toHaveBeenCalledTimes(1);
    expect(onRequestDiscard).toHaveBeenCalledTimes(1);
  });

  it('dispatches one system expiry command when the countdown reaches zero', async () => {
    vi.useFakeTimers();
    const state = approvedState();
    const onCommand = vi.fn<WorkflowCommandHandler>().mockResolvedValue(undefined);
    const now = Date.parse(state.approval.expiresAt) - 2_000;
    vi.setSystemTime(now);

    render(
      <ApprovedBanner
        approval={state.approval}
        draftVersion={state.draft.version}
        onCommand={onCommand}
        onRequestCancelApproval={() => undefined}
        onRequestDiscard={() => undefined}
        onAnnouncement={() => undefined}
      />,
    );

    await vi.advanceTimersByTimeAsync(2_100);

    expect(onCommand).toHaveBeenCalledTimes(1);
    expect(onCommand).toHaveBeenCalledWith({
      type: 'APPROVAL_EXPIRES',
      actor: 'system',
    });
  });
});
