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
import { SubmitOverlay } from '@/components/ui/submit-overlay'
import {
  ACCOUNT_CATEGORIES,
  ACCOUNT_CATEGORY_LABELS,
  REPORT_TYPES,
  REPORT_TYPE_LABELS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
} from '@/constants'
import {
  useAccountsGeneralQuery,
  useCreateAccountDetailMutation,
  useUpdateAccountDetailMutation,
} from '@/hooks/useAccountsQuery'
import type { AccountDetail } from '@/types/accounts'
import type {
  CreateAccountDetailPayload,
  UpdateAccountDetailPayload,
} from '@/types/payloads'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { ArrowLeft, Calculator, Save } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const accountDetailSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  accountName: z.string().min(1, 'Account name is required'),
  accountCategory: z.enum(
    Object.values(ACCOUNT_CATEGORIES) as [string, ...string[]],
  ),
  reportType: z.enum(Object.values(REPORT_TYPES) as [string, ...string[]]),
  transactionType: z.enum(
    Object.values(TRANSACTION_TYPES) as [string, ...string[]],
  ),
  accountGeneralAccountNumber: z.string().min(1, 'General account is required'),
  amountDebit: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'Debit amount must be a valid non-negative number',
    ),
  amountCredit: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      'Credit amount must be a valid non-negative number',
    ),
})

type AccountDetailFormData = z.infer<typeof accountDetailSchema>

interface AccountDetailFormProps {
  account?: AccountDetail
  mode: 'create' | 'edit'
}

export function AccountDetailForm({ account, mode }: AccountDetailFormProps) {
  const router = useRouter()
  const createMutation = useCreateAccountDetailMutation()
  const updateMutation = useUpdateAccountDetailMutation()

  const form = useForm<AccountDetailFormData>({
    resolver: zodResolver(accountDetailSchema),
    mode: 'onChange',
    defaultValues: {
      accountNumber: account?.accountNumber || '',
      accountName: account?.accountName || '',
      accountCategory: account?.accountCategory || '',
      reportType: account?.reportType || '',
      transactionType: account?.transactionType || '',
      accountGeneralAccountNumber: account?.accountGeneralAccountNumber || '',
      amountDebit: account?.amountDebit?.toString() || '0',
      amountCredit: account?.amountCredit?.toString() || '0',
    },
  })

  // Watch category to filter general accounts
  const selectedCategory = form.watch('accountCategory')

  // Fetch general accounts for the selected category
  const { data: generalAccountsData } = useAccountsGeneralQuery(
    selectedCategory ? { accountCategory: selectedCategory as any } : {},
  )

  const availableGeneralAccounts = useMemo(() => {
    return generalAccountsData?.data || []
  }, [generalAccountsData])

  // Update form when account data changes
  useEffect(() => {
    if (account) {
      form.reset({
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountCategory: account.accountCategory,
        reportType: account.reportType,
        transactionType: account.transactionType,
        accountGeneralAccountNumber: account.accountGeneralAccountNumber,
        amountDebit: account.amountDebit.toString(),
        amountCredit: account.amountCredit.toString(),
      })
    }
  }, [account, form])

  const onSubmit = async (data: AccountDetailFormData) => {
    try {
      const payload = {
        ...data,
        amountDebit: parseFloat(data.amountDebit),
        amountCredit: parseFloat(data.amountCredit),
      }

      if (mode === 'create') {
        await createMutation.mutateAsync(payload as CreateAccountDetailPayload)
        toast.success('Detail account created successfully')
      } else if (account) {
        await updateMutation.mutateAsync({
          accountNumber: account.accountNumber,
          data: payload as UpdateAccountDetailPayload,
        })
        toast.success('Detail account updated successfully')
      }

      router.navigate({ to: '/accounts/detail' })
    } catch {
      toast.error(
        mode === 'create'
          ? 'Failed to create detail account'
          : 'Failed to update detail account',
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'ASSET':
        return 'default'
      case 'HUTANG':
        return 'destructive'
      case 'MODAL':
        return 'secondary'
      case 'PENDAPATAN':
        return 'outline'
      case 'BIAYA':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const selectedReportType = form.watch('reportType')
  const selectedTransactionType = form.watch('transactionType')

  return (
    <div className="container max-w-2xl px-4 py-8 mx-auto">
      {isSubmitting && (
        <SubmitOverlay
          isVisible={true}
          message={
            mode === 'create'
              ? 'Creating detail account...'
              : 'Updating detail account...'
          }
        />
      )}

      <div className="container px-3 py-4 mx-auto space-y-4 sm:px-6 lg:px-8 lg:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.navigate({ to: '/accounts/detail' })}
            className="self-start md:hidden"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Detail Accounts
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'create'
              ? 'Create Detail Account'
              : 'Edit Detail Account'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'create'
              ? 'Add a new detail account linked to a general account'
              : 'Update the detail account information'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1001.01" {...field} />
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
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., BCA Current Account"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="accountCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Account Category
                          {selectedCategory && (
                            <Badge variant={getBadgeVariant(selectedCategory)}>
                              {
                                ACCOUNT_CATEGORY_LABELS[
                                  selectedCategory as keyof typeof ACCOUNT_CATEGORY_LABELS
                                ]
                              }
                            </Badge>
                          )}
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value)
                            // Reset general account when category changes
                            form.setValue('accountGeneralAccountNumber', '')
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(ACCOUNT_CATEGORIES).map(
                              (category) => (
                                <SelectItem key={category} value={category}>
                                  {
                                    ACCOUNT_CATEGORY_LABELS[
                                      category as keyof typeof ACCOUNT_CATEGORY_LABELS
                                    ]
                                  }
                                </SelectItem>
                              ),
                            )}
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
                        <FormLabel className="flex items-center gap-2">
                          Report Type
                          {selectedReportType && (
                            <Badge variant="outline">
                              {
                                REPORT_TYPE_LABELS[
                                  selectedReportType as keyof typeof REPORT_TYPE_LABELS
                                ]
                              }
                            </Badge>
                          )}
                        </FormLabel>
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
                            {Object.values(REPORT_TYPES).map((reportType) => (
                              <SelectItem key={reportType} value={reportType}>
                                {
                                  REPORT_TYPE_LABELS[
                                    reportType as keyof typeof REPORT_TYPE_LABELS
                                  ]
                                }
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
                        <FormLabel className="flex items-center gap-2">
                          Transaction Type
                          {selectedTransactionType && (
                            <Badge
                              variant={
                                selectedTransactionType === 'DEBIT'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {
                                TRANSACTION_TYPE_LABELS[
                                  selectedTransactionType as keyof typeof TRANSACTION_TYPE_LABELS
                                ]
                              }
                            </Badge>
                          )}
                        </FormLabel>
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
                            {Object.values(TRANSACTION_TYPES).map(
                              (transactionType) => (
                                <SelectItem
                                  key={transactionType}
                                  value={transactionType}
                                >
                                  {
                                    TRANSACTION_TYPE_LABELS[
                                      transactionType as keyof typeof TRANSACTION_TYPE_LABELS
                                    ]
                                  }
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="accountGeneralAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>General Account</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedCategory}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                selectedCategory
                                  ? 'Select general account'
                                  : 'Please select a category first'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableGeneralAccounts.map((generalAccount) => (
                            <SelectItem
                              key={generalAccount.id}
                              value={generalAccount.id}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {generalAccount.accountName}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {generalAccount.accountNumber}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="amountDebit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Debit Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground">
                              Rp
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amountCredit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground">
                              Rp
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-8"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.navigate({ to: '/accounts/detail' })}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="w-4 h-4 mr-2" />
                    {mode === 'create' ? 'Create Account' : 'Update Account'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
