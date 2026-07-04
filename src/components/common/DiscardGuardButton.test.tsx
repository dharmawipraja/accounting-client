import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { DiscardGuardButton } from './DiscardGuardButton';

it('discards immediately when not dirty, without a confirm', async () => {
  const user = userEvent.setup();
  const onDiscard = vi.fn();
  render(<DiscardGuardButton dirty={false} onDiscard={onDiscard} />);
  await user.click(screen.getByRole('button', { name: 'Batal' }));
  expect(onDiscard).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('asks to confirm before discarding when dirty', async () => {
  const user = userEvent.setup();
  const onDiscard = vi.fn();
  render(<DiscardGuardButton dirty onDiscard={onDiscard} />);
  await user.click(screen.getByRole('button', { name: 'Batal' }));
  expect(onDiscard).not.toHaveBeenCalled();
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: 'Buang' }));
  expect(onDiscard).toHaveBeenCalledTimes(1);
});
