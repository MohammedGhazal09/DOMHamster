import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { AppHeader } from '../../src/ui/AppHeader.tsx';
import { JudgeBrief } from '../../src/ui/JudgeBrief.tsx';
import { desiredToolNames } from '../../src/webmcp/lifecycle.ts';
import { readyState } from '../helpers/webmcp-fixtures.ts';

const CANONICAL_PROMPT =
  'Build today’s plan. Prioritize urgent food deliveries, keep every volunteer at three tasks or fewer, and make sure R-104 has an Arabic-speaking volunteer.';

function renderReadyApp(capabilityStatus: 'AVAILABLE' | 'API_UNAVAILABLE' = 'AVAILABLE') {
  return render(
    <App
      state={readyState()}
      capabilityStatus={capabilityStatus}
      registeredToolNames={capabilityStatus === 'AVAILABLE' ? desiredToolNames('READY') : []}
    />,
  );
}

describe('judge-facing application shell', () => {
  it('renders the product identity, state, WebMCP status, date, and global actions', () => {
    render(
      <AppHeader
        workflowState="READY"
        capabilityStatus="AVAILABLE"
        scenarioDate="2026-08-26"
        onOpenActivity={() => undefined}
        onOpenDiagnostics={() => undefined}
        onReset={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'DOMHamster' })).toBeVisible();
    expect(screen.getByText('The human-approved agent dispatcher')).toBeVisible();
    expect(screen.getByText('READY')).toBeVisible();
    expect(screen.getByText('WebMCP connected')).toBeVisible();
    expect(screen.getByText('26 Aug 2026 · Riyadh')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Activity' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Diagnostics' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });

  it('locks the exact value proposition, safety disclaimer, and canonical prompt', () => {
    render(<JudgeBrief />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Coordinate the day. Let the agent draft. Keep the human in charge.',
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'DOMHamster turns a live coordination board into structured WebMCP tools so an agent can build and repair a plan while a coordinator controls locks and approval.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Fictional demo data only. DOMHamster is for non-emergency coordination and is not an emergency-dispatch system.',
      ),
    ).toBeVisible();
    expect(screen.getByText(CANONICAL_PROMPT)).toBeVisible();
  });

  it('copies the canonical prompt and announces the accepted action', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const user = userEvent.setup();
    render(<JudgeBrief />);

    await user.click(screen.getByRole('button', { name: 'Copy prompt' }));

    expect(writeText).toHaveBeenCalledWith(CANONICAL_PROMPT);
    expect(screen.getByRole('status')).toHaveTextContent('Demo prompt copied.');
  });

  it('renders truthful READY metrics from the canonical state', () => {
    renderReadyApp();
    const summary = screen.getByRole('region', { name: 'Live coordination summary' });

    for (const [label, value] of [
      ['Open requests', '8'],
      ['Available volunteers', '5'],
      ['Assigned', '0'],
      ['Unassigned', '8'],
      ['Hard errors', '0'],
      ['Warnings', '0'],
    ]) {
      const metric = within(summary).getByTestId(`metric-${label.toLowerCase().replaceAll(' ', '-')}`);
      expect(metric).toHaveTextContent(label);
      expect(metric).toHaveTextContent(value);
    }
  });

  it('shows all privacy-minimized requests and volunteers without restricted contact data', () => {
    renderReadyApp();
    const requestRegion = screen.getByRole('region', { name: 'Requests' });
    const volunteerRegion = screen.getByRole('region', { name: 'Volunteers' });

    expect(within(requestRegion).getAllByRole('listitem')).toHaveLength(8);
    expect(within(volunteerRegion).getAllByRole('listitem')).toHaveLength(5);
    expect(within(requestRegion).getByText('R-104')).toBeVisible();
    expect(within(requestRegion).getByText('Arabic')).toBeVisible();
    expect(within(volunteerRegion).getByText('V-03')).toBeVisible();
    expect(within(volunteerRegion).getByText(/Driving/)).toBeVisible();

    expect(document.body).not.toHaveTextContent('Fictional phone');
    expect(document.body).not.toHaveTextContent('Fictional Address');
    expect(document.body).not.toHaveTextContent('privateContacts');
  });

  it('renders the READY empty state and exact current agent-tool evidence', () => {
    renderReadyApp();
    const plan = screen.getByRole('region', { name: 'Assignment plan' });

    expect(within(plan).getByRole('heading', { name: 'No assignment draft yet' })).toBeVisible();
    expect(
      within(plan).getByText(
        'Ask your browser agent to use DOMHamster’s WebMCP tools, or copy the demo prompt above.',
      ),
    ).toBeVisible();
    expect(within(plan).getByText('5 tools available')).toBeVisible();

    for (const name of desiredToolNames('READY')) {
      expect(within(plan).getByText(name)).toBeVisible();
    }
    expect(within(plan).getByText('Human authority is enforced')).toBeVisible();
  });

  it('preserves semantic navigation and a keyboard skip target', () => {
    renderReadyApp();

    expect(screen.getByRole('link', { name: 'Skip to coordination workspace' })).toHaveAttribute(
      'href',
      '#coordination-workspace',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'coordination-workspace');
    expect(screen.getAllByRole('heading', { level: 2 }).map(({ textContent }) => textContent)).toEqual(
      expect.arrayContaining([
        'Coordinate the day. Let the agent draft. Keep the human in charge.',
        'Live coordination summary',
        'Requests',
        'Assignment plan',
        'Volunteers',
      ]),
    );
  });

  it('shows the exact unsupported-browser guidance without hiding the coordinator data', () => {
    renderReadyApp('API_UNAVAILABLE');

    expect(
      screen.getByText(
        'WebMCP tools are unavailable in this browser. The coordinator interface still works; open the site in ChatGPT’s in-app browser or Chrome with WebMCP testing enabled.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('region', { name: 'Requests' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Volunteers' })).toBeVisible();
    expect(screen.queryByText('WebMCP connected')).not.toBeInTheDocument();
  });
});
