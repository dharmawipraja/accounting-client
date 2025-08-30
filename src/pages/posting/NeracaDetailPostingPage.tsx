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
import { getCurrentDateForAPI } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, BarChart3, Calendar } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const neracaDetailFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
})

type NeracaDetailFormData = z.infer<typeof neracaDetailFormSchema>

// Helper function to convert ISO date to DD-MM-YYYY format
const formatDateForAPI = (isoDate: string): string => {
  const date = new Date(isoDate)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

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

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
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

        {/* Information Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('posting.neracaDetailPosting.operationInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {t('posting.neracaDetailPosting.whatIs')}
              </h4>
              <p className="text-sm text-gray-600">
                {t('posting.neracaDetailPosting.explanation')}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {t('posting.bukuBesarPosting.whatHappens')}
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• {t('posting.neracaDetailPosting.step1')}</li>
                <li>• {t('posting.neracaDetailPosting.step2')}</li>
                <li>• {t('posting.neracaDetailPosting.step3')}</li>
                <li>• {t('posting.neracaDetailPosting.step4')}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {t('posting.neracaDetailPosting.prerequisites')}
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• {t('posting.neracaDetailPosting.prereq1')}</li>
                <li>• {t('posting.neracaDetailPosting.prereq2')}</li>
                <li>• {t('posting.neracaDetailPosting.prereq3')}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                {t('posting.bukuBesarPosting.whenUnpost')}
              </h4>
              <p className="text-sm text-gray-600">
                {t('posting.neracaDetailPosting.unpostExplanation')}
              </p>
            </div>

            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {t('posting.neracaDetailPosting.processingOrder')}
                </span>
              </div>
              <p className="mt-1 text-sm text-blue-700">
                {t('posting.neracaDetailPosting.orderNote')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
