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
import {
  useCreateAccountGeneralMutation,
  useUpdateAccountGeneralMutation,
} from '@/hooks/useAccountsQuery'
import type { AccountGeneral } from '@/types/accounts'
import type {
  CreateAccountGeneralPayload,
  UpdateAccountGeneralPayload,
} from '@/types/payloads'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, Calculator, Save } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Form schema for validation
const accountGeneralFormSchema = z.object({
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .max(20, 'Account number must not exceed 20 characters')
    .regex(/^[0-9-]+$/, 'Account number can only contain numbers and hyphens'),
  accountName: z
    .string()
    .min(3, 'Account name must be at least 3 characters')
    .max(100, 'Account name must not exceed 100 characters'),
  accountCategory: z.enum(['ASSET', 'HUTANG', 'MODAL', 'PENDAPATAN', 'BIAYA']),
  reportType: z.enum(['NERACA', 'LABA_RUGI']),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  amountCredit: z.coerce.number().min(0, 'Credit amount must be positive'),
  amountDebit: z.coerce.number().min(0, 'Debit amount must be positive'),
})

type AccountGeneralFormData = z.infer<typeof accountGeneralFormSchema>

interface AccountGeneralFormProps {
  mode: 'create' | 'edit'
  account?: AccountGeneral
}

const accountCategoryOptions = [
  { value: 'ASSET', label: 'Asset' },
  { value: 'HUTANG', label: 'Hutang' },
  { value: 'MODAL', label: 'Modal' },
  { value: 'PENDAPATAN', label: 'Pendapatan' },
  { value: 'BIAYA', label: 'Biaya' },
] as const

const reportTypeOptions = [
  { value: 'NERACA', label: 'Neraca' },
  { value: 'LABA_RUGI', label: 'Laba Rugi' },
] as const

const transactionTypeOptions = [
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Credit' },
] as const

export function AccountGeneralForm({ mode, account }: AccountGeneralFormProps) {
  const router = useRouter()
  const createMutation = useCreateAccountGeneralMutation()
  const updateMutation = useUpdateAccountGeneralMutation()

  const form = useForm<AccountGeneralFormData>({
    resolver: zodResolver(accountGeneralFormSchema),
    defaultValues: {
      accountNumber: '',
      accountName: '',
      accountCategory: 'ASSET',
      reportType: 'NERACA',
      transactionType: 'DEBIT',
      amountCredit: 0,
      amountDebit: 0,
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (mode === 'edit' && account) {
      form.reset({
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountCategory: account.accountCategory,
        reportType: account.reportType,
        transactionType: account.transactionType,
        amountCredit: account.amountCredit,
        amountDebit: account.amountDebit,
      })
    }
  }, [account, form, mode])

  const handleSubmit = async (data: AccountGeneralFormData) => {
    try {
      if (mode === 'create') {
        const payload: CreateAccountGeneralPayload = {
          accountNumber: data.accountNumber,
          accountName: data.accountName,
          accountCategory: data.accountCategory,
          reportType: data.reportType,
          transactionType: data.transactionType,
          amountCredit: data.amountCredit,
          amountDebit: data.amountDebit,
        }
        await createMutation.mutateAsync(payload)
        toast.success('General account created successfully')
      } else if (account) {
        const payload: UpdateAccountGeneralPayload = {
          accountName: data.accountName,
          accountCategory: data.accountCategory,
          reportType: data.reportType,
          transactionType: data.transactionType,
          amountCredit: data.amountCredit,
          amountDebit: data.amountDebit,
        }
        await updateMutation.mutateAsync({ id: account.id, data: payload })
        toast.success('General account updated successfully')
      }

      router.navigate({ to: '/accounts/general' })
    } catch {
      toast.error(
        mode === 'create'
          ? 'Failed to create general account'
          : 'Failed to update general account',
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="container mx-auto max-w-2xl py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.navigate({ to: '/accounts/general' })}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to General Accounts
        </Button>
        <h1 className="text-3xl font-bold">
          {mode === 'create' ? 'Create' : 'Edit'} General Account
        </h1>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? 'Create a new general account for your chart of accounts'
            : 'Update the general account information'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Fill in the details for the general account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 1001"
                          {...field}
                          disabled={mode === 'edit'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Kas" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <hr className="my-4" />

              {/* Account Classification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="accountCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountCategoryOptions.map((option) => (
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
                  name="reportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Report Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select report type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reportTypeOptions.map((option) => (
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
                      <FormLabel>Transaction Type *</FormLabel>
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
              </div>

              <hr className="my-4" />

              {/* Balance Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amountCredit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountDebit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Debit Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          min="0"
                          step="0.01"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.navigate({ to: '/accounts/general' })}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSubmitting
                    ? mode === 'create'
                      ? 'Creating...'
                      : 'Updating...'
                    : mode === 'create'
                      ? 'Create Account'
                      : 'Update Account'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
