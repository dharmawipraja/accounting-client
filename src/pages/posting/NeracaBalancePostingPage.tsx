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
  useNeracaBalanceQuery,
  usePostNeracaBalanceMutation,
} from '@/hooks/usePostingQuery'
import { useTranslation } from '@/hooks/useTranslation'
// import type { NeracaBalanceFormData } from '@/types/posting'
import { formatCurrency } from '@/utils'
import { getCurrentDateForAPI } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Calculator, Calendar } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const neracaBalanceFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  sisaHasilUsahaAmount: z.number().min(0, 'Amount must be positive'),
})

type NeracaBalanceFormData = z.infer<typeof neracaBalanceFormSchema>

// Helper function to convert ISO date to DD-MM-YYYY format
const formatDateForAPI = (isoDate: string): string => {
  const date = new Date(isoDate)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function NeracaBalancePostingPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const postMutation = usePostNeracaBalanceMutation()

  const form = useForm<NeracaBalanceFormData>({
    resolver: zodResolver(neracaBalanceFormSchema),
    defaultValues: {
      date: getCurrentDateForAPI(),
      sisaHasilUsahaAmount: 0,
    },
  })

  // Fetch balance calculation
  const { data: balanceCalculation } = useNeracaBalanceQuery(
    formatDateForAPI(getCurrentDateForAPI()),
  )

  // Auto-populate SHU amount when balance calculation is available
  useEffect(() => {
    if (
      balanceCalculation?.data?.data?.calculationDetails?.sisaHasilUsaha !==
      undefined
    ) {
      const shuAmount = parseFloat(
        balanceCalculation.data.data.calculationDetails.sisaHasilUsaha,
      )
      form.setValue('sisaHasilUsahaAmount', shuAmount)
    }
  }, [balanceCalculation, form])

  const onSubmitPost = async (data: NeracaBalanceFormData) => {
    try {
      await postMutation.mutateAsync({
        date: formatDateForAPI(data.date),
        sisaHasilUsahaAmount: data.sisaHasilUsahaAmount,
      })
      toast.success(t('posting.neracaBalancePosting.successPost'))
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t('posting.neracaBalancePosting.errorPost'),
      )
    }
  }

  const balance = balanceCalculation?.data?.data

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
            <Calculator className="w-6 h-6 text-purple-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            <span className="leading-tight">
              {t('posting.neracaBalancePosting.title')}
            </span>
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            {t('posting.neracaBalancePosting.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Balance Calculation */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Balance Calculation</CardTitle>
            <CardDescription>
              Calculate balance sheet totals before posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="calculationDate">Calculation Date</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                  <Input
                    id="calculationDate"
                    type="date"
                    value={calculationDate}
                    onChange={(e) => setCalculationDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCalculate}
                  variant="outline"
                >
                  Calculate
                </Button>
              </div>
            </div>



            {balance && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <span className="font-medium text-blue-900">
                      Total Assets
                    </span>
                    <span className="font-bold text-blue-900">
                      {formatCurrency(balance.totalAsset)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                    <span className="font-medium text-red-900">
                      Total Liabilities
                    </span>
                    <span className="font-bold text-red-900">
                      {formatCurrency(balance.totalLiability)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <span className="font-medium text-green-900">
                      Total Equity
                    </span>
                    <span className="font-bold text-green-900">
                      {formatCurrency(balance.totalEquity)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50">
                    <span className="font-medium text-purple-900">
                      Sisa Hasil Usaha
                    </span>
                    <span className="font-bold text-purple-900">
                      {formatCurrency(balance.sisaHasilUsaha)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  {balance.isBalanced ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span
                    className={`font-medium ${
                      balance.isBalanced ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    Balance Status:{' '}
                    {balance.isBalanced ? 'Balanced' : 'Not Balanced'}
                  </span>
                </div>

                <p className="text-xs text-gray-500">
                  Calculated on:{' '}
                  {new Date(balance.calculatedAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card> */}

        {/* Posting Form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('posting.neracaBalancePosting.postButton')}
            </CardTitle>
            <CardDescription>
              {t('posting.neracaBalancePosting.description')}
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
                    disabled={postMutation.isPending}
                  />
                </div>
                {form.formState.errors.date && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sisaHasilUsahaAmount">
                  {t('posting.neracaBalancePosting.shuAmount')}
                </Label>
                <div className="relative">
                  <Input
                    id="sisaHasilUsahaAmount"
                    type="text"
                    value={formatCurrency(form.watch('sisaHasilUsahaAmount'))}
                    readOnly
                    className="pl-10 cursor-not-allowed bg-gray-50"
                    disabled
                  />
                </div>
                {form.formState.errors.sisaHasilUsahaAmount && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.sisaHasilUsahaAmount.message}
                  </p>
                )}
                {balance?.calculationDetails ? (
                  <p className="text-sm text-green-600">
                    {t('posting.neracaBalancePosting.autoCalculated')}{' '}
                    {formatCurrency(
                      parseFloat(balance.calculationDetails.sisaHasilUsaha),
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-orange-600">
                    {t('posting.neracaBalancePosting.calculateFirst')}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={
                  postMutation.isPending || !balance?.calculationDetails
                }
                className="w-full"
              >
                {postMutation.isPending ? (
                  <LoadingState size="sm" />
                ) : !balance?.calculationDetails ? (
                  t('posting.neracaBalancePosting.calculateBalanceFirst')
                ) : (
                  t('posting.neracaBalancePosting.postButton')
                )}
              </Button>
            </form>

            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  {t('posting.neracaBalancePosting.reminder')}
                </span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                {t('posting.neracaBalancePosting.reminderText')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
