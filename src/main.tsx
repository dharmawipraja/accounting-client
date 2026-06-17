import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Providers } from '@/app/providers';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AppErrorBoundary>
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </Providers>
  </StrictMode>,
);
