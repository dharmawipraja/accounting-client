import { NeracaAkhirPostingPage } from '@/pages/posting/NeracaAkhirPostingPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/neraca-akhir')({
    component: NeracaAkhirPostingPage,
})
