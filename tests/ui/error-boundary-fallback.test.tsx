import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApplicationErrorBoundary,
  type ApplicationErrorBoundaryProps,
} from '../../src/ui/ErrorBoundaryFallback.tsx';

const RENDER_SENTINEL = 'DO_NOT_EXPOSE_RENDER_FAILURE';

function ThrowingView({ shouldThrow }: { readonly shouldThrow: () => boolean }) {
  if (shouldThrow()) throw new Error(RENDER_SENTINEL);
  return <p>Recovered workspace</p>;
}

function renderBoundary(
  props: Partial<ApplicationErrorBoundaryProps> = {},
  shouldThrow: () => boolean = () => true,
) {
  return render(
    <ApplicationErrorBoundary
      onReset={() => undefined}
      nextErrorReference={() => 'RENDER-42'}
      {...props}
    >
      <ThrowingView shouldThrow={shouldThrow} />
    </ApplicationErrorBoundary>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('application render recovery boundary', () => {
  it('shows a focused sanitized fallback without the thrown error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    renderBoundary();

    const heading = await screen.findByRole('heading', {
      name: 'DOMHamster paused this view',
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByText('RENDER-42')).toBeVisible();
    expect(document.body).not.toHaveTextContent(RENDER_SENTINEL);
    expect(document.body).not.toHaveTextContent('Error:');
  });

  it('resets the shared scenario and restores children after a successful recovery', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    let shouldThrow = true;
    const onReset = vi.fn(async () => {
      shouldThrow = false;
    });

    renderBoundary({ onReset }, () => shouldThrow);
    await user.click(await screen.findByRole('button', { name: 'Reset fictional scenario' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Recovered workspace')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the safe fallback when reset fails and never exposes the rejection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const onReset = vi.fn(() => Promise.reject(new Error(RENDER_SENTINEL)));

    renderBoundary({ onReset });
    await user.click(await screen.findByRole('button', { name: 'Reset fictional scenario' }));

    expect(
      await screen.findByText('Reset could not complete. Reload the page or try again.'),
    ).toBeVisible();
    expect(document.body).not.toHaveTextContent(RENDER_SENTINEL);
  });

  it('delegates the explicit reload recovery action', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const onReload = vi.fn();

    renderBoundary({ onReload });
    await user.click(await screen.findByRole('button', { name: 'Reload page' }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
