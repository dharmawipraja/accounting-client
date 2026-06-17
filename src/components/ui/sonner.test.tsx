import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useTheme } from '@/stores/theme';

// Spy on the props our composition passes to the underlying sonner Toaster.
// vi.hoisted lets the hoisted vi.mock factory reference the spy safely.
const { sonnerSpy } = vi.hoisted(() => ({ sonnerSpy: vi.fn() }));
vi.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonnerSpy(props);
    return null;
  },
}));

// Imported after vi.mock so Providers -> our Toaster wrapper -> mocked sonner.
import { Providers } from '@/app/providers';

function lastProps() {
  return sonnerSpy.mock.calls.at(-1)![0] as {
    theme?: string;
    richColors?: unknown;
    toastOptions?: { classNames?: Record<string, string> };
  };
}

afterEach(() => {
  sonnerSpy.mockClear();
  useTheme.setState({ theme: 'light' });
});

it('drives the toaster theme from the app store, not next-themes', () => {
  useTheme.setState({ theme: 'dark' });
  render(
    <Providers>
      <div />
    </Providers>,
  );
  expect(sonnerSpy).toHaveBeenCalled();
  expect(lastProps()).toMatchObject({ theme: 'dark' });
});

it('does not enable sonner richColors (Buku uses semantic per-type classes)', () => {
  render(
    <Providers>
      <div />
    </Providers>,
  );
  expect(lastProps().richColors).toBeFalsy();
});

it('applies the Buku semantic per-type accent classNames', () => {
  render(
    <Providers>
      <div />
    </Providers>,
  );
  const cn = lastProps().toastOptions?.classNames ?? {};
  expect(cn.success).toContain('border-l-success');
  expect(cn.error).toContain('border-l-destructive');
  expect(cn.warning).toContain('border-l-warning');
  expect(cn.info).toContain('border-l-primary');
});
