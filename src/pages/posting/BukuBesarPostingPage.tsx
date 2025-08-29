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
// import type { BukuBesarFormData } from '@/types/posting'
import { getCurrentDateForAPI } from '@/utils/date'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Calendar, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const bukuBesarFormSchema = z.object({
  ledgerDate: z.string().min(1, 'Ledger date is required'),
})

type BukuBesarFormData = z.infer<typeof bukuBesarFormSchema>

export function BukuBesarPostingPage() {
  const router = useRouter()
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
      toast.success('Buku Besar posted successfully!')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to post Buku Besar')
    }
  }

  const onSubmitUnpost = async (data: BukuBesarFormData) => {
    try {
      await unpostMutation.mutateAsync({
        ledgerDate: data.ledgerDate,
      })
      toast.success('Buku Besar unposted successfully!')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 'Failed to unpost Buku Besar',
      )
    }
  }

  const isLoading = postMutation.isPending || unpostMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.navigate({ to: '/posting' })}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Posting
        </Button>
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FileText className="w-8 h-8 text-blue-600" />
            Buku Besar Posting
          </h1>
          <p className="mt-1 text-gray-600">
            Post general ledger entries for a specific date
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Posting Form */}
        <Card>
          <CardHeader>
            <CardTitle>Post Buku Besar</CardTitle>
            <CardDescription>
              Post all pending ledger entries to the general ledger for the
              specified date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={form.handleSubmit(onSubmitPost)}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="ledgerDate">Ledger Date</Label>
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
                    'Post Buku Besar'
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
                    'Unpost Buku Besar'
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
              Operation Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                What is Buku Besar Posting?
              </h4>
              <p className="text-sm text-gray-600">
                Buku Besar (General Ledger) posting transfers all pending ledger
                entries to the posted status, making them part of the official
                accounting records.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">
                What happens during posting?
              </h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>
                  • All PENDING ledger entries for the date are marked as POSTED
                </li>
                <li>• Account balances are updated with the posted amounts</li>
                <li>• The posting timestamp is recorded for audit purposes</li>
                <li>
                  • Posted entries become immutable and part of the official
                  record
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">When to use Unpost?</h4>
              <p className="text-sm text-gray-600">
                Unposting reverses the posting operation and returns entries to
                PENDING status. Use this only when corrections are needed before
                month-end closing.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Important Warning
                </span>
              </div>
              <p className="mt-1 text-sm text-amber-700">
                Always ensure all ledger entries are correct before posting.
                Unposting should be done carefully as it affects financial
                reporting.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
