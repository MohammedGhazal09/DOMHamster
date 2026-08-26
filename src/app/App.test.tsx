import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('identifies DOMHamster as the human-approved agent dispatcher', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'DOMHamster' })).toBeVisible();
    expect(screen.getByText('The human-approved agent dispatcher')).toBeVisible();
  });
});
