import { NeracaBalancePostingPage } from '@/pages/posting/NeracaBalancePostingPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/neraca-balance')({
    component: NeracaBalancePostingPage,
})
