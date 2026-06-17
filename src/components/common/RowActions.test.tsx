import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { useSession } from '@/stores/session';
import { RowActions } from './RowActions';

afterEach(() => useSession.getState().clear());

it('shows Edit for ACCOUNTANT but not Deactivate/Delete', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  render(<RowActions onEdit={vi.fn()} active onToggleActive={vi.fn()} onDelete={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /aksi/i }));
  expect(await screen.findByRole('menuitem', { name: /ubah/i })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /nonaktifkan/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /hapus/i })).not.toBeInTheDocument();
});

it('shows Deactivate (active row) and Delete for ADMIN', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  render(<RowActions onEdit={vi.fn()} active onToggleActive={vi.fn()} onDelete={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /aksi/i }));
  expect(await screen.findByRole('menuitem', { name: 'Nonaktifkan' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /hapus/i })).toBeInTheDocument();
});

it('shows Activate (not Deactivate) for an inactive row', async () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ADMIN' });
  render(<RowActions onEdit={vi.fn()} active={false} onToggleActive={vi.fn()} onDelete={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /aksi/i }));
  expect(await screen.findByRole('menuitem', { name: 'Aktifkan' })).toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: 'Nonaktifkan' })).not.toBeInTheDocument();
});

it('renders nothing for VIEWER', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'VIEWER' });
  const { container } = render(<RowActions onEdit={vi.fn()} />);
  expect(container).toBeEmptyDOMElement();
});
