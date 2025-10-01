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
import { usePostNeracaAkhirMutation } from '@/hooks/usePostingQuery'
import { useTranslation } from '@/hooks/useTranslation'
// import type { NeracaAkhirFormData } from '@/types/posting'
import { formatDateForAPI, getCurrentDateForAPI } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const neracaAkhirFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
})

type NeracaAkhirFormData = z.infer<typeof neracaAkhirFormSchema>

export function NeracaAkhirPostingPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const postMutation = usePostNeracaAkhirMutation()

  const form = useForm<NeracaAkhirFormData>({
    resolver: zodResolver(neracaAkhirFormSchema),
    defaultValues: {
      date: getCurrentDateForAPI(),
    },
  })

  const onSubmitPost = async (data: NeracaAkhirFormData) => {
    try {
      await postMutation.mutateAsync({
        date: formatDateForAPI(data.date),
      })
      toast.success(t('posting.neracaAkhirPosting.successPost'))
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t('posting.neracaAkhirPosting.errorPost'),
      )
    }
  }

  const isLoading = postMutation.isPending

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
            <CheckCircle className="w-6 h-6 text-amber-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            <span className="leading-tight">
              {t('posting.neracaAkhirPosting.title')}
            </span>
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            {t('posting.neracaAkhirPosting.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Posting Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('posting.neracaAkhirPosting.postButton')}</CardTitle>
            <CardDescription>
              {t('posting.neracaAkhirPosting.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={form.handleSubmit(onSubmitPost)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="date">{t('posting.periodEndDate')}</Label>
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

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <LoadingState size="sm" />
                ) : (
                  t('posting.neracaAkhirPosting.postButton')
                )}
              </Button>
            </form>

            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">
                  {t('posting.neracaAkhirPosting.finalStepWarning')}
                </span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                {t('posting.neracaAkhirPosting.finalWarning')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
