import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

// Import the generated route tree
import { Toaster } from '@/components/ui/sonner'
import { routeTree } from './routeTree.gen'

import './styles.css'

// Initialize i18n
import './i18n/config'

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // This will be populated by the root route
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <RouterProvider router={router} />
      <Toaster />
    </StrictMode>,
  )
}
