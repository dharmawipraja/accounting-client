import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { LEDGER_TYPE_LABELS } from '@/constants'
import { useCreateBulkLedgersMutation } from '@/hooks/useLedgersQuery'
import type { CreateBulkLedgersPayload } from '@/types/payloads'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useMemo } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Individual ledger entry schema (matching API LedgerItem interface)
const ledgerEntrySchema = z.object({
  ledgerDate: z.string().min(1, 'Date is required'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(500, 'Description must not exceed 500 characters'),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  accountDetailId: z.string().min(1, 'Account detail is required'),
  accountGeneralId: z.string().min(1, 'Account general is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  // Additional fields for form UI only
  referenceNumber: z
    .string()
    .min(1, 'Reference number is required')
    .max(50, 'Reference number must not exceed 50 characters'),
})

// Bulk form schema
const bulkLedgerFormSchema = z.object({
  entries: z
    .array(ledgerEntrySchema)
    .min(2, 'At least 2 entries are required for double-entry'),
})

type BulkLedgerFormData = z.infer<typeof bulkLedgerFormSchema>

interface BulkLedgerFormProps {
  ledgerType: 'KAS_MASUK' | 'KAS_KELUAR'
}

const transactionTypeOptions = [
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Credit' },
] as const

export function BulkLedgerForm({ ledgerType }: BulkLedgerFormProps) {
  const router = useRouter()
  const createBulkMutation = useCreateBulkLedgersMutation()

  const form = useForm<BulkLedgerFormData>({
    resolver: zodResolver(bulkLedgerFormSchema),
    defaultValues: {
      entries: [
        {
          ledgerDate: new Date().toISOString().split('T')[0],
          referenceNumber: '',
          description: '',
          transactionType: 'DEBIT',
          accountDetailId: '',
          accountGeneralId: '',
          amount: 0,
        },
        {
          ledgerDate: new Date().toISOString().split('T')[0],
          referenceNumber: '',
          description: '',
          transactionType: 'CREDIT',
          accountDetailId: '',
          accountGeneralId: '',
          amount: 0,
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'entries',
  })

  // Watch all entries to calculate totals
  const watchedEntries = useWatch({
    control: form.control,
    name: 'entries',
  })

  // Calculate totals
  const { totalDebitAmount, totalCreditAmount, isBalanced } = useMemo(() => {
    let debitTotal = 0
    let creditTotal = 0

    watchedEntries.forEach((entry) => {
      if (entry.transactionType === 'DEBIT') {
        debitTotal += entry.amount || 0
      } else if (entry.transactionType === 'CREDIT') {
        creditTotal += entry.amount || 0
      }
    })

    return {
      totalDebitAmount: debitTotal,
      totalCreditAmount: creditTotal,
      isBalanced: debitTotal === creditTotal && debitTotal > 0,
    }
  }, [watchedEntries])

  const handleSubmit = async (data: BulkLedgerFormData) => {
    // Validate double-entry balance
    if (!isBalanced) {
      toast.error('Transaction is not balanced!', {
        description: `Total Debit (${totalDebitAmount.toLocaleString('id-ID', {
          style: 'currency',
          currency: 'IDR',
        })}) must equal Total Credit (${totalCreditAmount.toLocaleString(
          'id-ID',
          {
            style: 'currency',
            currency: 'IDR',
          },
        )})`,
      })
      return
    }

    try {
      // Transform form data to match API payload structure
      const apiPayload: CreateBulkLedgersPayload = {
        ledgers: data.entries.map((entry) => ({
          ledgerDate: entry.ledgerDate,
          description: entry.description,
          ledgerType: ledgerType, // Use the prop instead of form field
          transactionType: entry.transactionType,
          accountDetailId: entry.accountDetailId,
          accountGeneralId: entry.accountGeneralId,
          amount: entry.amount,
        })),
      }

      await createBulkMutation.mutateAsync(apiPayload)
      toast.success('Ledger entries created successfully!')
      router.navigate({ to: '/ledgers' })
    } catch (error: any) {
      console.error('Form submission error:', error)
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'An error occurred while creating ledger entries',
      )
    }
  }

  const addEntry = () => {
    append({
      ledgerDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      description: '',
      transactionType: 'DEBIT',
      accountDetailId: '',
      accountGeneralId: '',
      amount: 0,
    })
  }

  const removeEntry = (index: number) => {
    if (fields.length > 2) {
      remove(index)
    } else {
      toast.error(
        'At least 2 entries are required for double-entry bookkeeping',
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
          Create {LEDGER_TYPE_LABELS[ledgerType]} Entries
        </h1>
        <p className="text-gray-600">
          Add multiple {LEDGER_TYPE_LABELS[ledgerType].toLowerCase()} entries
          with double-entry validation
        </p>
      </div>

      {/* Balance Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Transaction Balance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Total Debit Amount
              </label>
              <div className="text-2xl font-bold text-blue-600">
                {totalDebitAmount.toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Total Credit Amount
              </label>
              <div className="text-2xl font-bold text-purple-600">
                {totalCreditAmount.toLocaleString('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Balance Status
              </label>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      Balanced
                    </Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <Badge
                      variant="outline"
                      className="bg-orange-50 text-orange-700 border-orange-200"
                    >
                      Unbalanced
                    </Badge>
                  </>
                )}
              </div>
              {!isBalanced && totalDebitAmount !== totalCreditAmount && (
                <div className="text-sm text-orange-600">
                  Difference:{' '}
                  {Math.abs(
                    totalDebitAmount - totalCreditAmount,
                  ).toLocaleString('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Ledger Entries */}
          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">
                      Entry #{index + 1}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEntry(index)}
                      disabled={fields.length <= 2}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`entries.${index}.ledgerDate`}
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
                      name={`entries.${index}.referenceNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Number</FormLabel>
                          <FormControl>
                            <Input placeholder="REF-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`entries.${index}.transactionType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {transactionTypeOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
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
                      name={`entries.${index}.amount`}
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
                      name={`entries.${index}.accountDetailId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Detail ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Detail account ID" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`entries.${index}.accountGeneralId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account General ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="General account ID"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`entries.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter description for this entry"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Entry Summary */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">
                        {watchedEntries[index]?.transactionType || 'DEBIT'}{' '}
                        Entry
                      </span>
                      <span className="font-bold">
                        {(watchedEntries[index]?.amount || 0).toLocaleString(
                          'id-ID',
                          {
                            style: 'currency',
                            currency: 'IDR',
                          },
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Entry Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={addEntry}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Entry
            </Button>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createBulkMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createBulkMutation.isPending || !isBalanced}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {createBulkMutation.isPending
                ? 'Creating Entries...'
                : `Create ${fields.length} Ledger Entries`}
            </Button>
          </div>

          {/* Balance Warning */}
          {!isBalanced && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Transaction Not Balanced</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                In double-entry bookkeeping, total debit amounts must equal
                total credit amounts. Please adjust the amounts to balance the
                transaction before submitting.
              </p>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
