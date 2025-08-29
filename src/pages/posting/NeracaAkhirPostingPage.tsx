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
// import type { NeracaAkhirFormData } from '@/types/posting'
import { getCurrentDateForAPI } from '@/utils/date'
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

// Helper function to convert ISO date to DD-MM-YYYY format
const formatDateForAPI = (isoDate: string): string => {
  const date = new Date(isoDate)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export function NeracaAkhirPostingPage() {
  const router = useRouter()
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
      toast.success('Neraca Akhir posted successfully!')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to post Neraca Akhir',
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
          Back to Posting
        </Button>
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:gap-3 sm:text-2xl lg:text-3xl">
            <CheckCircle className="w-6 h-6 text-amber-600 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            <span className="leading-tight">Neraca Akhir Posting</span>
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            Post final balance sheet for period-end closing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Posting Form */}
        <Card>
          <CardHeader>
            <CardTitle>Post Neraca Akhir</CardTitle>
            <CardDescription>
              Finalize the balance sheet for accounting period closure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={form.handleSubmit(onSubmitPost)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="date">Period End Date</Label>
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
                {isLoading ? <LoadingState size="sm" /> : 'Post Neraca Akhir'}
              </Button>
            </form>

            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">
                  Final Step Warning
                </span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                This is the final step in the posting sequence. Once completed,
                the accounting period will be considered closed and locked.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Information Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Operation Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                What is Neraca Akhir Posting?
              </h4>
              <p className="text-sm text-gray-600">
                Neraca Akhir (Final Balance Sheet) posting is the last step in
                the accounting period closure process. It creates the official
                final balance sheet that will be used for financial reporting.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                What happens during posting?
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Final balance sheet is generated and locked</li>
                <li>• All account balances are finalized for the period</li>
                <li>• Financial statements become officially reportable</li>
                <li>• Period closure is marked as complete</li>
                <li>• Audit trail is finalized for compliance</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Prerequisites</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Buku Besar posting completed</li>
                <li>• Neraca Detail posting completed</li>
                <li>• Neraca Balance posting completed</li>
                <li>• All account reconciliations verified</li>
                <li>• Management approval for period closure</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">After Posting</h4>
              <p className="text-sm text-gray-600">
                Once Neraca Akhir is posted, the accounting period is considered
                closed. Any subsequent adjustments will require special
                procedures and approvals.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Period Closure
                </span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                Ensure all previous posting steps are completed and verified
                before proceeding with this final posting operation.
              </p>
            </div>

            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">
                  Best Practice
                </span>
              </div>
              <p className="mt-1 text-sm text-green-700">
                Backup your database before performing final posting to ensure
                data recovery capability if needed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
