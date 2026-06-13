import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './errors';
import { toastApiError } from './toastApiError';
import { id as messages } from '@/lib/i18n/messages.id';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('toastApiError', () => {
  it('shows the SoD message for 403 SEGREGATION_OF_DUTIES', () => {
    toastApiError(new ApiError({ status: 403, code: 'SEGREGATION_OF_DUTIES', message: 'x' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.roles.segregationOfDuties);
  });
  it('shows forbidden for a plain 403', () => {
    toastApiError(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'x' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.roles.forbidden);
  });
  it('shows closed-period for 409 CLOSED_PERIOD', () => {
    toastApiError(new ApiError({ status: 409, code: 'CLOSED_PERIOD', message: 'x' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.crud.closedPeriod);
  });
  it('shows message + traceId for a generic error', () => {
    toastApiError(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom', traceId: 'tr-1' }), messages);
    expect(toast.error).toHaveBeenLastCalledWith('boom', expect.objectContaining({ description: expect.stringContaining('tr-1') }));
  });
  it('shows a generic toast for a non-ApiError', () => {
    toastApiError(new Error('net'), messages);
    expect(toast.error).toHaveBeenLastCalledWith(messages.common.error);
  });
});
