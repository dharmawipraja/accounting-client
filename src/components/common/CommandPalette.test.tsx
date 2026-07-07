import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}));

import { useSession } from '@/stores/session';
import { CommandPalette } from './CommandPalette';

afterEach(() => { useSession.getState().clear(); navigate.mockClear(); });

it('opens on Ctrl+K and navigates when a page command is chosen', async () => {
  const user = userEvent.setup();
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  render(<CommandPalette />);
  // closed initially
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  await user.click(await screen.findByText('Dasbor'));
  expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' });
});

it('offers create actions to an editor but not a VIEWER', async () => {
  useSession.getState().setUser({ id: '1', email: 'v@b.c', role: 'VIEWER', mustChangePassword: false });
  const { rerender } = render(<CommandPalette />);
  fireEvent.keyDown(document, { key: 'k', metaKey: true });
  expect(await screen.findByText('Dasbor')).toBeInTheDocument();
  expect(screen.queryByText(/faktur baru/i)).not.toBeInTheDocument();

  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT', mustChangePassword: false });
  rerender(<CommandPalette />);
  expect(screen.getByText(/faktur baru/i)).toBeInTheDocument();
});
