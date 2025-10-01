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
  usePostNeracaDetailMutation,
  useUnpostNeracaDetailMutation,
} from '@/hooks/usePostingQuery'
import { useTranslation } from '@/hooks/useTranslation'
// import type { NeracaDetailFormData } from '@/types/posting'
import { formatDateForAPI, getCurrentDateForAPI } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const neracaDetailFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
})

type NeracaDetailFormData = z.infer<typeof neracaDetailFormSchema>

export function NeracaDetailPostingPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const postMutation = usePostNeracaDetailMutation()
  const unpostMutation = useUnpostNeracaDetailMutation()

  const form = useForm<NeracaDetailFormData>({
    resolver: zodResolver(neracaDetailFormSchema),
    defaultValues: {
      date: getCurrentDateForAPI(),
    },
  })

  const onSubmitPost = async (data: NeracaDetailFormData) => {
    try {
      await postMutation.mutateAsync({
        date: formatDateForAPI(data.date),
      })
      toast.success(t('posting.neracaDetailPosting.successPost'))
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t('posting.neracaDetailPosting.errorPost'),
      )
    }
  }

  const onSubmitUnpost = async (data: NeracaDetailFormData) => {
    try {
      await unpostMutation.mutateAsync({
        date: formatDateForAPI(data.date),
      })
      toast.success(t('posting.neracaDetailPosting.successUnpost'))
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t('posting.neracaDetailPosting.errorUnpost'),
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
          className="flex items-center gap-2 self-start md:hidden"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('posting.backToPosting')}
        </Button>
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:gap-3 sm:text-2xl lg:text-3xl">
            <BarChart3 className="w-6 h-6 text-green-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            <span className="leading-tight">
              {t('posting.neracaDetailPosting.title')}
            </span>
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            {t('posting.neracaDetailPosting.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Posting Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('posting.neracaDetailPosting.postButton')}</CardTitle>
            <CardDescription>
              {t('posting.neracaDetailPosting.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={form.handleSubmit(onSubmitPost)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="date">{t('posting.postingDate')}</Label>
                <div className="relative">
                  <Calendar className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                  <Input
                    id="date"
                    type="date"
                    {...form.register('date')}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.date && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {postMutation.isPending ? (
                    <LoadingState size="sm" />
                  ) : (
                    t('posting.neracaDetailPosting.postButton')
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
                    t('posting.neracaDetailPosting.unpostButton')
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
