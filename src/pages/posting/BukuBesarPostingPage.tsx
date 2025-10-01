import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingState } from '@/components/ui/loading-state'
import {
  usePostBukuBesarMutation,
  useUnpostBukuBesarMutation,
} from '@/hooks/usePostingQuery'
import { useTranslation } from '@/hooks/useTranslation'
// import type { BukuBesarFormData } from '@/types/posting'
import { getCurrentDateForAPI } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const bukuBesarFormSchema = z.object({
  ledgerDate: z.string().min(1, 'Ledger date is required'),
})

type BukuBesarFormData = z.infer<typeof bukuBesarFormSchema>

export function BukuBesarPostingPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const postMutation = usePostBukuBesarMutation()
  const unpostMutation = useUnpostBukuBesarMutation()

  const form = useForm<BukuBesarFormData>({
    resolver: zodResolver(bukuBesarFormSchema),
    defaultValues: {
      ledgerDate: getCurrentDateForAPI(),
    },
  })

  const onSubmitPost = async (data: BukuBesarFormData) => {
    try {
      await postMutation.mutateAsync({
        ledgerDate: data.ledgerDate,
      })
      toast.success(t('posting.bukuBesarPosting.successPost'))
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t('posting.bukuBesarPosting.errorPost'),
      )
    }
  }

  const onSubmitUnpost = async (data: BukuBesarFormData) => {
    try {
      await unpostMutation.mutateAsync({
        ledgerDate: data.ledgerDate,
      })
      toast.success(t('posting.bukuBesarPosting.successUnpost'))
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t('posting.bukuBesarPosting.errorUnpost'),
      )
    }
  }

  const isLoading = postMutation.isPending || unpostMutation.isPending

  return (
    <div className="container px-3 py-4 mx-auto space-y-4 sm:px-6 lg:px-8 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.navigate({ to: '/posting' })}
          className="flex items-center self-start gap-2 md:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('posting.backToPosting')}
        </Button>
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:gap-3 sm:text-2xl lg:text-3xl">
            <FileText className="w-6 h-6 text-blue-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            <span className="leading-tight">
              {t('posting.bukuBesarPosting.title')}
            </span>
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            {t('posting.bukuBesarPosting.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Posting Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('posting.bukuBesarPosting.postButton')}</CardTitle>
            <CardDescription>
              {t('posting.bukuBesarPosting.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={form.handleSubmit(onSubmitPost)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="ledgerDate">{t('posting.ledgerDate')}</Label>
                <div className="relative">
                  <Calendar className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                  <Input
                    id="ledgerDate"
                    type="date"
                    {...form.register('ledgerDate')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.ledgerDate && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.ledgerDate.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {postMutation.isPending ? (
                    <LoadingState size="sm" />
                  ) : (
                    t('posting.bukuBesarPosting.postButton')
                  )}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={form.handleSubmit(onSubmitUnpost)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {unpostMutation.isPending ? (
                    <LoadingState size="sm" />
                  ) : (
                    t('posting.bukuBesarPosting.unpostButton')
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
