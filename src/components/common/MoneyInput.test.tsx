import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { MoneyInput } from './MoneyInput';

// Stateful harness so a controlled input actually accumulates keystrokes.
function Harness({ onChange }: { onChange?: (v: string) => void }) {
  const [v, setV] = useState('');
  return (
    <MoneyInput
      value={v}
      onChange={(raw) => {
        setV(raw);
        onChange?.(raw);
      }}
      aria-label="amount"
    />
  );
}

it('accepts valid decimals and emits the raw string (no float coercion)', async () => {
  render(<Harness />);
  await userEvent.type(screen.getByLabelText('amount'), '1500.50');
  // Value must be the raw string, not a float.
  expect(screen.getByLabelText('amount')).toHaveValue('1500.50');
});

it('allows up to 4 decimal places and rejects a 5th', async () => {
  render(<Harness />);
  await userEvent.type(screen.getByLabelText('amount'), '0.0000');
  expect(screen.getByLabelText('amount')).toHaveValue('0.0000');

  // A 5th decimal digit must be rejected — value stays at 4 dp.
  await userEvent.type(screen.getByLabelText('amount'), '5');
  expect(screen.getByLabelText('amount')).toHaveValue('0.0000');
});

it('rejects non-numeric characters — onChange is never called with letters', async () => {
  const spy = vi.fn();
  render(<Harness onChange={spy} />);
  await userEvent.type(screen.getByLabelText('amount'), 'abc');
  // Input stays empty (letters blocked by regex).
  expect(screen.getByLabelText('amount')).toHaveValue('');
  // onChange must never have been called with any letter-containing string.
  for (const call of spy.mock.calls) {
    expect(call[0]).not.toMatch(/[a-zA-Z]/);
  }
});
