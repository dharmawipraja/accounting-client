import { AppLayout } from '@/components/AppLayout'
import { BukuBesarPostingPage } from '@/pages/posting/BukuBesarPostingPage'
import { requireAuth } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/buku-besar')({
  beforeLoad: requireAuth(),
  component: () => (
    <AppLayout>
      <BukuBesarPostingPage />
    </AppLayout>
  ),
})
