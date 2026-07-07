import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TempPasswordDialog } from './TempPasswordDialog';

it('shows the temp password and a one-time warning', () => {
  render(<TempPasswordDialog open onOpenChange={vi.fn()} email="a@b.c" tempPassword="Temp-abc123" />);
  expect(screen.getByText('Temp-abc123')).toBeInTheDocument();
  expect(screen.getByText(/hanya ditampilkan sekali/i)).toBeInTheDocument();
});
