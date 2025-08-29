import { AppLayout } from '@/components/AppLayout'
import { LedgersListPage } from '@/pages/ledgers/LedgersListPage'
import { requireRoles } from '@/utils/routeAuth'
import { createFileRoute } from '@tanstack/react-router'
// import { z } from 'zod'

// Define search params schema
// const ledgersSearchSchema = z.object({
//   page: z.number().int().positive().catch(1),
//   pageSize: z.number().int().positive().max(100).catch(10),
//   search: z.string().optional(),
//   type: z.enum(['KAS_MASUK', 'KAS_KELUAR']).optional(),
//   sortBy: z.enum(['createdAt', 'amount', 'description']).catch('createdAt'),
//   sortOrder: z.enum(['asc', 'desc']).catch('desc'),
// })

// export type LedgersSearch = z.infer<typeof ledgersSearchSchema>

export const Route = createFileRoute('/ledgers/')({
  beforeLoad: requireRoles(['ADMIN', 'MANAJER', 'AKUNTAN']),
  // validateSearch: ledgersSearchSchema,
  component: () => (
    <AppLayout>
      <LedgersListPage />
    </AppLayout>
  ),
})
