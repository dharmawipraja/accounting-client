import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateLedgerMutation } from '@/hooks/useLedgersQuery'
import type { Ledger } from '@/types/ledgers'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Form schema for validation
const ledgerFormSchema = z.object({
  ledgerDate: z.string().min(1, 'Date is required'),
  referenceNumber: z
    .string()
    .min(1, 'Reference number is required')
    .max(50, 'Reference number must not exceed 50 characters'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description must not exceed 255 characters'),
  ledgerType: z.enum(['KAS_MASUK', 'KAS_KELUAR']),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  accountDetailId: z.string().min(1, 'Account detail is required'),
  accountGeneralId: z.string().min(1, 'Account general is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  postingStatus: z.enum(['PENDING', 'POSTED']),
})

type LedgerFormData = z.infer<typeof ledgerFormSchema>

interface LedgerFormProps {
  mode: 'create' | 'edit'
  ledger?: Ledger
}

const ledgerTypeOptions = [
  { value: 'MANUAL', label: 'Manual Entry' },
  { value: 'AUTOMATIC', label: 'Automatic Entry' },
  { value: 'ADJUSTING', label: 'Adjusting Entry' },
  { value: 'CLOSING', label: 'Closing Entry' },
] as const

const transactionTypeOptions = [
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Credit' },
] as const

const postingStatusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'POSTED', label: 'Posted' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const

export function LedgerForm({ mode, ledger }: LedgerFormProps) {
  const router = useRouter()
  const createMutation = useCreateLedgerMutation()
  const updateMutation = useUpdateLedgerMutation()

  const form = useForm<LedgerFormData>({
    resolver: zodResolver(ledgerFormSchema),
    defaultValues: {
      date: '',
      referenceNumber: '',
      description: '',
      ledgerType: 'MANUAL',
      transactionType: 'DEBIT',
      accountId: '',
      amount: 0,
      postingStatus: 'PENDING',
    },
  })

  // Set form values when editing
  useEffect(() => {
    if (mode === 'edit' && ledger) {
      form.reset({
        date: ledger.date,
        referenceNumber: ledger.referenceNumber,
        description: ledger.description,
        ledgerType: ledger.ledgerType,
        transactionType: ledger.transactionType,
        accountId: ledger.accountId,
        amount: ledger.amount,
        postingStatus: ledger.postingStatus,
      })
    }
  }, [form, mode, ledger])

  const handleSubmit = async (data: LedgerFormData) => {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync([data])
        toast.success('Ledger entry created successfully!')
        router.navigate({ to: '/ledgers' })
      } else if (mode === 'edit' && ledger) {
        await updateMutation.mutateAsync({
          id: ledger.id,
          data,
        })
        toast.success('Ledger entry updated successfully!')
        router.navigate({ to: '/ledgers' })
      }
    } catch (error: any) {
      console.error('Form submission error:', error)
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'An error occurred while saving the ledger entry',
      )
    }
  }

  const handleCancel = () => {
    router.navigate({ to: '/ledgers' })
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4 hover:bg-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Ledgers
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === 'create' ? 'Create New Ledger Entry' : 'Edit Ledger Entry'}
        </h1>
        <p className="text-gray-600">
          {mode === 'create'
            ? 'Add a new entry to the general ledger'
            : 'Update the ledger entry information'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Ledger Entry Details
          </CardTitle>
          <CardDescription>
            Enter the ledger entry information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter reference number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ledgerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ledger Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ledger type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ledgerTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select transaction type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postingStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posting Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select posting status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {postingStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description for this ledger entry"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : mode === 'create'
                      ? 'Create Ledger Entry'
                      : 'Update Ledger Entry'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
