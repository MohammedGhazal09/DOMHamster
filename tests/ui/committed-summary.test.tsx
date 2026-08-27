import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  selectCommittedPlan,
  selectOpenRequests,
} from '../../src/app/selectors.ts';
import { CommittedSummary } from '../../src/ui/CommittedSummary.tsx';
import { workflowStates } from '../helpers/webmcp-fixtures.ts';

describe('committed plan summary', () => {
  it('renders the final plan and contact boundary without exposing restricted fields', () => {
    const state = workflowStates().COMMITTED;
    const plan = selectCommittedPlan(state);
    if (plan === null) throw new Error('TEST_EXPECTED_COMMITTED_PLAN');

    render(<CommittedSummary plan={plan} requests={selectOpenRequests(state)} />);

    const region = screen.getByRole('region', { name: 'Committed plan' });
    expect(
      within(region).getByText('Plan committed. Human-approved version 1 is now final.'),
    ).toBeVisible();
    expect(within(region).getByText(plan.id)).toBeVisible();
    expect(within(region).getByRole('table', { name: 'Final assignment plan' })).toBeVisible();
    expect(
      within(region).getByRole('region', {
        name: 'Final assignment plan horizontal scroll area',
      }),
    ).toBeVisible();
    expect(within(region).getAllByRole('row')).toHaveLength(9);
    expect(
      within(region).getByText(
        'Dispatch details are fictional, returned only for selected assigned requests, and every access is recorded.',
      ),
    ).toBeVisible();

    expect(document.body).not.toHaveTextContent('fictionalLocation');
    expect(document.body).not.toHaveTextContent('fictionalContactChannel');
    expect(document.body).not.toHaveTextContent('privateContacts');
  });
});
