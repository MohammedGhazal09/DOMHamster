import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/app/App.tsx';
import type { AppState, WorkflowState } from '../../src/domain/types.ts';
import { workflowStates } from '../helpers/webmcp-fixtures.ts';

const ORDERED_STATES: readonly WorkflowState[] = Object.freeze([
  'READY',
  'DRAFT_INVALID',
  'DRAFT_VALID',
  'AWAITING_APPROVAL',
  'APPROVED',
  'COMMITTED',
]);

function renderState(state: AppState): void {
  render(
    <App
      state={state}
      capabilityStatus="AVAILABLE"
      now={() => Date.parse('2026-08-26T12:00:30.000Z')}
    />,
  );
}

function ariaHiddenFocusableElements(): readonly HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[aria-hidden="true"]')].flatMap((root) =>
    [
      ...root.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.hasAttribute('disabled')),
  );
}

describe('automated accessibility contract', () => {
  it.each(ORDERED_STATES)('keeps %s landmarks and application status unambiguous', (stateName) => {
    const state = workflowStates()[stateName];
    renderState(state);

    expect(document.querySelectorAll('main')).toHaveLength(1);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelector('nav[aria-label="Application actions"]')).not.toBeNull();

    const status = document.querySelector<HTMLElement>(
      '[role="status"][aria-label="Current application status"]',
    );
    expect(status).not.toBeNull();
    if (status === null) throw new Error('TEST_CURRENT_APPLICATION_STATUS_MISSING');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveTextContent(stateName);
    expect(status).toHaveTextContent('WebMCP connected');

    expect(ariaHiddenFocusableElements()).toHaveLength(0);
  });

  it('marks the approval dialog busy state and keeps every decision human-only', () => {
    const state = workflowStates().AWAITING_APPROVAL;
    if (state.draft === null) throw new Error('TEST_EXPECTED_APPROVAL_DRAFT');
    renderState(state);

    const dialog = screen.getByRole('dialog', {
      name: `Review draft v${state.draft.version} before approval`,
    });
    expect(dialog).toHaveAttribute('aria-busy', 'false');
    expect(within(dialog).getByRole('button', { name: /approve version/i })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: /reject and return/i })).toBeVisible();
    expect(within(dialog).queryByRole('button', { name: /commit/i })).not.toBeInTheDocument();
  });

  it('announces approved authorization without reading every countdown tick', () => {
    renderState(workflowStates().APPROVED);

    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('aria-live', 'off');
    expect(timer).toHaveAttribute('aria-atomic', 'true');
    expect(timer).toHaveTextContent(/approval expires in/i);
  });

  it('exposes confirmation progress and returns focus to the reset trigger', async () => {
    const user = userEvent.setup();
    renderState(workflowStates().READY);

    const reset = screen.getByRole('button', { name: 'Reset' });
    await user.click(reset);

    const dialog = screen.getByRole('alertdialog', { name: 'Reset the fictional scenario?' });
    expect(dialog).toHaveAttribute('aria-busy', 'false');
    await user.keyboard('{Escape}');
    expect(reset).toHaveFocus();
  });

  it('uses text labels as well as color for every draft validation severity', () => {
    renderState(workflowStates().DRAFT_INVALID);

    const issues = document.querySelectorAll<HTMLElement>('.validation-item');
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.textContent).toMatch(/error|warning/i);
    }
  });

  it('provides one atomic plan announcement region for accepted coordinator actions', () => {
    renderState(workflowStates().DRAFT_VALID);

    const announcement = document.getElementById('plan-announcement');
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    expect(announcement).toHaveAttribute('aria-atomic', 'true');
  });
});
