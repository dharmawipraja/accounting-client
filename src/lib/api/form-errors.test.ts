import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './errors';
import { applyApiErrorToForm } from './form-errors';
import { id as messages } from '@/lib/i18n/messages.id';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

function makeForm() {
  const errors: Record<string, { message: string }> = {};
  return {
    setError: vi.fn((name: string, e: { message: string }) => { errors[name] = e; }),
    _errors: errors,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('applyApiErrorToForm', () => {
  it('maps a 409 CONFLICT to the code field', () => {
    const form = makeForm();
    applyApiErrorToForm(
      new ApiError({ status: 409, code: 'CONFLICT', message: 'dup' }), form, messages,
    );
    expect(form.setError).toHaveBeenCalledWith('code', expect.objectContaining({ message: expect.any(String) }));
  });

  it('maps details.errors to a root error', () => {
    const form = makeForm();
    applyApiErrorToForm(
      new ApiError({ status: 400, code: 'INVALID_INPUT', message: 'bad', details: { errors: ['name must be a string'] } }),
      form, messages,
    );
    expect(form.setError).toHaveBeenCalledWith('root', expect.objectContaining({ message: expect.stringContaining('name must be a string') }));
  });

  it('toasts on 403 FORBIDDEN', () => {
    const form = makeForm();
    applyApiErrorToForm(new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' }), form, messages);
    expect(toast.error).toHaveBeenCalled();
  });

  it('toasts message + traceId on a generic error', () => {
    const form = makeForm();
    applyApiErrorToForm(
      new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom', traceId: 'trace-1' }), form, messages,
    );
    expect(toast.error).toHaveBeenCalledWith('boom', expect.objectContaining({ description: expect.stringContaining('trace-1') }));
  });

  it('toasts a generic message for a non-ApiError', () => {
    const form = makeForm();
    applyApiErrorToForm(new Error('network'), form, messages);
    expect(toast.error).toHaveBeenCalled();
  });
});
