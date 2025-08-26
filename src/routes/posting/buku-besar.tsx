import { BukuBesarPostingPage } from '@/pages/posting/BukuBesarPostingPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/posting/buku-besar')({
    component: BukuBesarPostingPage,
})
