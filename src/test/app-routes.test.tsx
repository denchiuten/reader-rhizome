import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from '@/App';

vi.mock('@/pages/Reading', () => ({ default: () => <main>Reading dashboard</main> }));
vi.mock('@/pages/Index.tsx', () => ({ default: () => <main>Highlight graph</main> }));
afterEach(cleanup);

it('opens the books dashboard at the main landing address', () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(screen.getByRole('main').textContent).toBe('Reading dashboard');
});

it('keeps the graph accessible at its own address', () => {
  window.history.replaceState({}, '', '/graph?source=123');
  render(<App />);
  expect(screen.getByRole('main').textContent).toBe('Highlight graph');
});