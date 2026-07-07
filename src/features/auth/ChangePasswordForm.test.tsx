import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { API } from '@/test/handlers';
import { server } from '@/test/server';
import { ChangePasswordForm } from './ChangePasswordForm';

function renderForm(onSuccess = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ChangePasswordForm onSuccess={onSuccess} submitLabel="Simpan" currentPasswordLabel="Kata sandi saat ini" />
    </QueryClientProvider>,
  );
  return onSuccess;
}

it('rejects a mismatched confirmation without calling the API', async () => {
  const user = userEvent.setup();
  const onSuccess = renderForm();
  await user.type(screen.getByLabelText('Kata sandi saat ini'), 'old');
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'different-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Konfirmasi kata sandi tidak cocok')).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});

it('calls onSuccess after a successful change', async () => {
  server.use(http.post(`${API}/auth/change-password`, () => HttpResponse.json({ ok: true })));
  const user = userEvent.setup();
  const onSuccess = renderForm();
  await user.type(screen.getByLabelText('Kata sandi saat ini'), 'old');
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'new-password-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
});

it('shows the translated required error on a blank current password without calling the API', async () => {
  const user = userEvent.setup();
  const onSuccess = renderForm();
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'new-password-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Kata sandi wajib diisi')).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});

it('shows a field error when the current password is wrong (401)', async () => {
  server.use(
    http.post(`${API}/auth/change-password`, () =>
      HttpResponse.json({ code: 'UNAUTHORIZED', message: 'x' }, { status: 401 }),
    ),
  );
  const user = userEvent.setup();
  renderForm();
  await user.type(screen.getByLabelText('Kata sandi saat ini'), 'wrong');
  await user.type(screen.getByLabelText('Kata sandi baru'), 'new-password-1');
  await user.type(screen.getByLabelText('Konfirmasi kata sandi baru'), 'new-password-1');
  await user.click(screen.getByRole('button', { name: 'Simpan' }));
  expect(await screen.findByText('Kata sandi saat ini salah')).toBeInTheDocument();
});
