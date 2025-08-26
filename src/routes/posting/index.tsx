import { PostingDashboardPage } from '@/pages/posting/PostingDashboardPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/')({
    component: PostingDashboardPage,
})
