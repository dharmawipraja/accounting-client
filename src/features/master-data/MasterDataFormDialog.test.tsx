import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/stores/session';
import { MasterDataFormDialog } from './MasterDataFormDialog';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { toast } from 'sonner';

afterEach(() => { vi.clearAllMocks(); useSession.getState().clear(); });

const schema = z.object({ code: z.string().min(1), name: z.string().min(1) });
type V = z.infer<typeof schema>;

function renderDialog(submit: (v: V) => Promise<unknown>) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MasterDataFormDialog<V>
        open onOpenChange={() => {}}
        title="New thing"
        schema={schema}
        defaultValues={{ code: '', name: '' }}
        resetOnSuccess
        submit={submit}
        fields={(form) => (
          <>
            <input aria-label="code" {...form.register('code')} />
            <input aria-label="name" {...form.register('name')} />
          </>
        )}
      />
    </QueryClientProvider>,
  );
}

it('submits valid values, then toasts success', async () => {
  const user = userEvent.setup();
  const submit = vi.fn().mockResolvedValue({});
  renderDialog(submit);
  await user.type(screen.getByLabelText('code'), 'C1');
  await user.type(screen.getByLabelText('name'), 'Name');
  await user.click(screen.getByRole('button', { name: /simpan|save/i }));
  expect(submit).toHaveBeenCalledWith({ code: 'C1', name: 'Name' });
  expect(toast.success).toHaveBeenCalled();
});

it('routes a 409 to the code field error (shown)', async () => {
  const user = userEvent.setup();
  const submit = vi.fn().mockRejectedValue(new ApiError({ status: 409, code: 'CONFLICT', message: 'dup' }));
  renderDialog(submit);
  await user.type(screen.getByLabelText('code'), 'C1');
  await user.type(screen.getByLabelText('name'), 'Name');
  await user.click(screen.getByRole('button', { name: /simpan|save/i }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(toast.success).not.toHaveBeenCalled();
});

it('blocks submit when validation fails', async () => {
  const user = userEvent.setup();
  const submit = vi.fn();
  renderDialog(submit);
  await user.click(screen.getByRole('button', { name: /simpan|save/i }));
  expect(submit).not.toHaveBeenCalled();
});
