import {
  Link,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { useUnsavedGuard, UnsavedGuardDialog } from './useUnsavedGuard';

function setup(dirty: boolean) {
  const rootRoute = createRootRoute();
  function EditorScreen() {
    const guard = useUnsavedGuard(() => dirty);
    return (
      <div>
        {/* cast: this test builds its own router, but Link is typed against the app route tree */}
        <Link to={'/other' as never}>Pergi</Link>
        <UnsavedGuardDialog guard={guard} />
      </div>
    );
  }
  const editorRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: EditorScreen });
  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/other',
    component: () => <div>Halaman lain</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([editorRoute, otherRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router} />);
}

it('blocks navigation and confirms discard when there are unsaved changes', async () => {
  const user = userEvent.setup();
  setup(true);
  await user.click(await screen.findByRole('link', { name: 'Pergi' }));
  // navigation is blocked → the discard confirm appears instead
  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByText('Buang perubahan?')).toBeInTheDocument();
  expect(screen.queryByText('Halaman lain')).not.toBeInTheDocument();
  // proceeding completes the navigation
  await user.click(within(dialog).getByRole('button', { name: 'Buang' }));
  expect(await screen.findByText('Halaman lain')).toBeInTheDocument();
});

it('does not block navigation when there are no unsaved changes', async () => {
  const user = userEvent.setup();
  setup(false);
  await user.click(await screen.findByRole('link', { name: 'Pergi' }));
  expect(await screen.findByText('Halaman lain')).toBeInTheDocument();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});
