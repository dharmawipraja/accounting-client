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
    useUnpostNeracaDetailMutation
} from '@/hooks/usePostingQuery'
import type { NeracaDetailFormData } from '@/types/posting'
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
            toast.success('Neraca Detail posted successfully!')
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'Failed to post Neraca Detail'
            )
        }
    }

    const onSubmitUnpost = async (data: NeracaDetailFormData) => {
        try {
            await unpostMutation.mutateAsync({
                date: formatDateForAPI(data.date),
            })
            toast.success('Neraca Detail unposted successfully!')
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'Failed to unpost Neraca Detail'
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
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-green-600" />
                        Neraca Detail Posting
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Post detailed balance sheet information
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Posting Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Post Neraca Detail</CardTitle>
                        <CardDescription>
                            Post detailed balance sheet with account-level breakdowns
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={form.handleSubmit(onSubmitPost)} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Posting Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {postMutation.isPending ? (
                                        <LoadingState size="sm" />
                                    ) : (
                                        'Post Neraca Detail'
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
                                        'Unpost Neraca Detail'
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
                            <h4 className="font-medium text-gray-900">What is Neraca Detail Posting?</h4>
                            <p className="text-sm text-gray-600">
                                Neraca Detail posting creates a detailed balance sheet that shows
                                account-level breakdowns for assets, liabilities, and equity accounts.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">What happens during posting?</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Detailed account balances are calculated and recorded</li>
                                <li>• Sub-account totals are aggregated to parent accounts</li>
                                <li>• Balance sheet structure is validated for completeness</li>
                                <li>• Detailed balance report becomes available for review</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">Prerequisites</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Buku Besar must be posted for the same date</li>
                                <li>• All account detail entries should be complete</li>
                                <li>• Account hierarchies should be properly structured</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-gray-900">When to use Unpost?</h4>
                            <p className="text-sm text-gray-600">
                                Unposting removes the detailed balance sheet and returns accounts to
                                their pre-posting state. Use this if account structures need adjustment.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-800">Processing Order</span>
                            </div>
                            <p className="text-sm text-blue-700 mt-1">
                                This should be performed after Buku Besar posting and before
                                Neraca Balance posting for proper sequence.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
