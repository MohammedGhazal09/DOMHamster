import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  selectAuditHistory,
} from '../../src/app/selectors.ts';
import type { DiagnosticsSnapshot } from '../../src/diagnostics/diagnostics.ts';
import { ActivityDrawer } from '../../src/ui/ActivityDrawer.tsx';
import { ConfirmDialog } from '../../src/ui/ConfirmDialog.tsx';
import { DiagnosticsDrawer } from '../../src/ui/DiagnosticsDrawer.tsx';
import { workflowStates } from '../helpers/webmcp-fixtures.ts';

const DIAGNOSTICS: DiagnosticsSnapshot = {
  build: {
    version: '0.0.0',
    commitSha: 'local',
    builtAt: '2026-08-27T12:00:00.000Z',
  },
  fixtureHash: 'b861f7e997f2f14e087d209130de7e4aa465d8047110b11872edb7750a2122b1',
  workflowState: 'APPROVED',
  draftVersion: 1,
  capabilityStatus: 'AVAILABLE',
  desiredToolNames: ['get_coordination_overview', 'commit_assignment_plan'],
  registeredToolNames: ['get_coordination_overview', 'commit_assignment_plan'],
  persistenceStatus: 'READY',
  recentErrorCodes: ['STALE_DRAFT_VERSION'],
};

describe('activity and diagnostics drawers', () => {
  it('renders privacy-bounded audit events and closes with Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const events = selectAuditHistory(workflowStates().APPROVED);
    render(<ActivityDrawer open events={events} onClose={onClose} />);

    const drawer = screen.getByRole('dialog', { name: 'Activity history' });
    expect(within(drawer).getAllByRole('listitem')).toHaveLength(events.length);
    expect(within(drawer).getByText('APPROVAL_APPROVED')).toBeVisible();
    expect(document.body).not.toHaveTextContent('privateContacts');

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders bounded diagnostics and exact desired/registered tool evidence', () => {
    render(<DiagnosticsDrawer open snapshot={DIAGNOSTICS} onClose={() => undefined} />);

    const drawer = screen.getByRole('dialog', { name: 'Diagnostics' });
    expect(within(drawer).getByText('APPROVED')).toBeVisible();
    expect(within(drawer).getByText('STALE_DRAFT_VERSION')).toBeVisible();
    expect(within(drawer).getAllByText('commit_assignment_plan')).toHaveLength(2);
    expect(document.body).not.toHaveTextContent('fictionalLocation');
  });
});

describe('confirmation dialog', () => {
  it('initially focuses the least destructive action and cancels on Escape', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        title="Reset the fictional scenario?"
        body="This removes the current draft, approval, committed plan, and prior run history, then restores 8 requests and 5 volunteers."
        confirmLabel="Reset scenario"
        cancelLabel="Cancel"
        onConfirm={() => undefined}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset the fictional scenario?',
    });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
