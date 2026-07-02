import { beforeEach, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { id as messages } from '@/lib/i18n/messages.id';
import { ApiError } from './errors';
import { mutationFeedback } from './mutationFeedback';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

it('onSuccess toasts the message and runs onClose', () => {
  const onClose = vi.fn();
  mutationFeedback({ t: messages, success: 'Selesai', onClose }).onSuccess();
  expect(toast.success).toHaveBeenCalledWith('Selesai');
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('onError in plain mode toasts the generic error and runs onClose', () => {
  const onClose = vi.fn();
  mutationFeedback({ t: messages, success: 'x', onClose }).onError(
    new ApiError({ status: 500, code: 'INTERNAL', message: 'boom' }),
  );
  expect(toast.error).toHaveBeenCalledWith(messages.common.error);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('onError in domain mode routes via toastApiError (403 SoD -> role message)', () => {
  mutationFeedback({ t: messages, success: 'x', errorMode: 'domain' }).onError(
    new ApiError({ status: 403, code: 'SEGREGATION_OF_DUTIES', message: 'x' }),
  );
  expect(toast.error).toHaveBeenCalledWith(messages.roles.segregationOfDuties);
});

it('omits the close callback when none is given', () => {
  expect(() => mutationFeedback({ t: messages, success: 'x' }).onSuccess()).not.toThrow();
  expect(toast.success).toHaveBeenCalledWith('x');
});
