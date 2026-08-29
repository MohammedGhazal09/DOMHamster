import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('identifies DOMHamster as the human-approved agent dispatcher', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'DOMHamster' })).toBeVisible();
    expect(screen.getByText('The human-approved agent dispatcher')).toBeVisible();
  });

  it('renders the configured release identity in diagnostics', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Diagnostics' }));

    const diagnostics = screen.getByRole('dialog', { name: 'Diagnostics' });
    expect(within(diagnostics).getByText('1.0.0')).toBeVisible();
    expect(within(diagnostics).getByText(__DOMHAMSTER_COMMIT_REF__)).toBeVisible();
    expect(__DOMHAMSTER_COMMIT_REF__).toMatch(/^(?:local|[0-9a-f]{40})$/);
  });
});
