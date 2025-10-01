import { ProtectedRoute } from '@/components/ProtectedRoute'
import { BukuBesarListPage } from '@/pages/bukuBesar/BukuBesarListPage'
import { createFileRoute } from '@tanstack/react-router'

function BukuBesarPage() {
  return <BukuBesarListPage />
}

export const Route = createFileRoute('/buku-besar/')({
  component: () => (
    <ProtectedRoute requiredRoles={['ADMIN', 'MANAJER', 'AKUNTAN']}>
      <BukuBesarPage />
    </ProtectedRoute>
  ),
})
