import { LedgersListPage } from '@/pages/ledgers/LedgersListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/ledgers/')({
  component: LedgersListPage,
})
