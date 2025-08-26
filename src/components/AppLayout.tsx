import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { useAuth } from '@/hooks/useAuth'
import React from 'react'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth()

  // For non-authenticated pages (like login), don't show Header/Footer
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <main className="min-h-screen">{children}</main>
      </div>
    )
  }

  // For authenticated pages, show full layout with Header and Footer
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="container flex-1 px-4 py-6 mx-auto sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  )
}
