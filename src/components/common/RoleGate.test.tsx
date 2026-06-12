import { render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { RoleGate } from './RoleGate';

afterEach(() => useSession.getState().clear());

it('renders children when the user role is allowed', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'APPROVER' });
  render(<RoleGate allow={['APPROVER', 'ADMIN']}><button>Post</button></RoleGate>);
  expect(screen.getByRole('button', { name: 'Post' })).toBeInTheDocument();
});

it('hides children when the role is not allowed', () => {
  useSession.getState().setUser({ id: '1', email: 'a@b.c', role: 'ACCOUNTANT' });
  render(<RoleGate allow={['APPROVER', 'ADMIN']}><button>Post</button></RoleGate>);
  expect(screen.queryByRole('button', { name: 'Post' })).not.toBeInTheDocument();
});
