import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { beforeEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { id as messages } from '@/lib/i18n/messages.id';
import { ApiError } from '@/lib/api/errors';
import { useDocumentSubmit } from './useDocumentSubmit';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

function Harness({ onSaved, err }: { onSaved: () => void; err?: unknown }) {
  const form = useForm();
  const h = useDocumentSubmit(form, onSaved);
  return (
    <>
      <button onClick={() => h.onSuccess()}>ok</button>
      <button onClick={() => h.onError(err)}>fail</button>
    </>
  );
}

it('onSuccess toasts "saved" and runs onSaved', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<Harness onSaved={onSaved} />);
  await user.click(screen.getByText('ok'));
  expect(toast.success).toHaveBeenCalledWith(messages.crud.saved);
  expect(onSaved).toHaveBeenCalledTimes(1);
});

it('onError routes an ApiError through applyApiErrorToForm (403 SoD -> toast.error)', async () => {
  const user = userEvent.setup();
  render(<Harness onSaved={vi.fn()} err={new ApiError({ status: 403, code: 'SEGREGATION_OF_DUTIES', message: 'x' })} />);
  await user.click(screen.getByText('fail'));
  expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties);
});
