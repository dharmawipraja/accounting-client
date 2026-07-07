import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { UserFormDialog } from './UserFormDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof UserFormDialog>> = {}) {
  const onCreated = vi.fn();
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <UserFormDialog open mode="create" onOpenChange={vi.fn()} currentUserId="me" onCreated={onCreated} {...props} />
    </QueryClientProvider>,
  );
  return onCreated;
}

it('create: submitting email+name+role calls onCreated with the temp password', async () => {
  const user = userEvent.setup();
  const onCreated = renderDialog();
  await user.type(screen.getByLabelText('Email'), 'x@y.zz');
  await user.type(screen.getByLabelText('Nama'), 'X User');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ tempPassword: 'Temp-abc123' })));
});

it('create: a 409 duplicate email shows the inline "already registered" error and does not call onCreated', async () => {
  server.use(
    http.post(`${API}/users`, () => HttpResponse.json({ code: 'CONFLICT', message: 'x' }, { status: 409 })),
  );
  const user = userEvent.setup();
  const onCreated = renderDialog();
  await user.type(screen.getByLabelText('Email'), 'dupe@y.zz');
  await user.type(screen.getByLabelText('Nama'), 'X User');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Email sudah terdaftar')).toBeInTheDocument();
  expect(onCreated).not.toHaveBeenCalled();
});

it('create: a malformed email shows the inline "invalid email" error and does not call onCreated', async () => {
  const user = userEvent.setup();
  const onCreated = renderDialog();
  await user.type(screen.getByLabelText('Email'), 'nope');
  await user.type(screen.getByLabelText('Nama'), 'X User');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Email tidak valid')).toBeInTheDocument();
  expect(onCreated).not.toHaveBeenCalled();
});

it('edit: role select is disabled when editing yourself', async () => {
  renderDialog({
    mode: 'edit',
    currentUserId: 'u1',
    user: { id: 'u1', email: 'a@b.c', name: 'Me', role: 'ADMIN', isActive: true, mustChangePassword: false, createdAt: '2026-07-01T00:00:00.000Z' },
  });
  expect(await screen.findByLabelText('Peran')).toBeDisabled();
});
