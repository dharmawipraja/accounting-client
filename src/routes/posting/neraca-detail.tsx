import { NeracaDetailPostingPage } from '@/pages/posting/NeracaDetailPostingPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/neraca-detail')({
    component: NeracaDetailPostingPage,
})
