import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { useSession } from '@/stores/session';
import { LoginForm } from './LoginForm';

afterEach(() => useSession.getState().clear());

it('validates required fields before submitting', async () => {
  renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /masuk/i }));
  // Expect at least one role="alert" validation error to appear
  const alerts = await screen.findAllByRole('alert');
  expect(alerts.length).toBeGreaterThanOrEqual(1);
});

it('logs in and calls onSuccess', async () => {
  const onSuccess = vi.fn();
  renderWithProviders(<LoginForm onSuccess={onSuccess} />);
  await userEvent.type(screen.getByLabelText(/email/i), 'admin@buku.id');
  await userEvent.type(screen.getByLabelText(/kata sandi/i), 'ok');
  await userEvent.click(screen.getByRole('button', { name: /masuk/i }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  expect(useSession.getState().user?.role).toBe('ADMIN');
});

it('shows an error message on bad credentials', async () => {
  renderWithProviders(<LoginForm onSuccess={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/email/i), 'admin@buku.id');
  await userEvent.type(screen.getByLabelText(/kata sandi/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /masuk/i }));
  // t.auth.invalidCredentials = "Email atau kata sandi salah" (contains "salah")
  expect(await screen.findByText(/salah/i)).toBeInTheDocument();
});
