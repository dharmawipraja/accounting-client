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

import { useAccountsDetailQuery } from '@/hooks/useAccountsQuery'
import { useCreateBulkLedgersMutation } from '@/hooks/useLedgersQuery'
import { useTranslation } from '@/hooks/useTranslation'
import type { CreateBulkLedgersPayload } from '@/types/payloads'
import {
  formatAmountInput,
  formatCurrency,
  formatDateShort,
} from '@/utils/formatters'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle,
  Edit,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Individual ledger entry schema (matching API LedgerItem interface)
// Note: Validation messages will be translated dynamically in the form
const ledgerEntrySchema = z.object({
  ledgerDate: z.string().min(1, 'Please select a date'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters long')
    .max(500, 'Description is too long (maximum 500 characters)'),
  transactionType: z.enum(['DEBIT', 'KREDIT'], {
    message: 'Please select either Debit or Kredit',
  }),
  accountDetailAccountNumber: z
    .string()
    .min(1, 'Please select an account detail'),
  accountGeneralAccountNumber: z.string().min(1, 'Account general is required'),
  ledgerType: z.enum(['KAS', 'KAS_MASUK', 'KAS_KELUAR'], {
    message: 'Please select a ledger type',
  }),
  amount: z.number().min(0.01, 'Please enter an amount greater than Rp 0'),
  // Additional fields for form UI only
  referenceNumber: z
    .string()
    .max(50, 'Reference number is too long (maximum 50 characters)')
    .optional()
    .or(z.literal('')),
})

// Single entry form schema for adding new entries
const singleEntryFormSchema = ledgerEntrySchema

type SingleEntryFormData = z.infer<typeof singleEntryFormSchema>
type LedgerEntry = SingleEntryFormData & { id: string }

// These will be translated dynamically
const transactionTypeOptions = [
  { value: 'DEBIT', labelKey: 'accounts.transactionTypes.DEBIT' },
  { value: 'KREDIT', labelKey: 'accounts.transactionTypes.KREDIT' },
] as const

const ledgerTypeOptions = [
  { value: 'KAS', labelKey: 'ledgers.types.KAS' },
  { value: 'KAS_MASUK', labelKey: 'ledgers.types.KAS_MASUK' },
  { value: 'KAS_KELUAR', labelKey: 'ledgers.types.KAS_KELUAR' },
] as const

interface BulkLedgerFormProps {
  defaultLedgerType?: 'KAS' | 'KAS_MASUK' | 'KAS_KELUAR'
  isLedgerTypeReadonly?: boolean
}

export function BulkLedgerForm({
  defaultLedgerType = 'KAS_MASUK',
  isLedgerTypeReadonly = false,
}: BulkLedgerFormProps = {}) {
  const router = useRouter()
  const { t } = useTranslation()
  const createBulkMutation = useCreateBulkLedgersMutation()

  // State for managing the list of entries
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null)

  // Fetch accounts data for dropdown
  const { data: accountsData, isLoading: isLoadingAccounts } =
    useAccountsDetailQuery({
      limit: 1000, // Get a large number to include all accounts
    })

  // Form for adding/editing single entry
  const form = useForm<SingleEntryFormData>({
    resolver: zodResolver(singleEntryFormSchema),
    defaultValues: {
      ledgerDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      description: '',
      transactionType: 'DEBIT',
      accountDetailAccountNumber: '',
      accountGeneralAccountNumber: '',
      ledgerType: defaultLedgerType,
      amount: 0,
    },
  })

  // Helper function to handle account detail selection
  const handleAccountDetailChange = (accountNumber: string) => {
    const selectedAccount = accountsData?.data?.find(
      (account) => account.accountNumber === accountNumber,
    )

    if (selectedAccount) {
      // Auto-populate the general account number
      form.setValue('accountDetailAccountNumber', accountNumber)
      form.setValue(
        'accountGeneralAccountNumber',
        selectedAccount.accountGeneralAccountNumber,
      )
    }
  }

  // Calculate totals from entries list
  const { totalDebitAmount, totalCreditAmount, isBalanced } = useMemo(() => {
    let debitTotal = 0
    let creditTotal = 0

    entries.forEach((entry) => {
      if (entry.transactionType === 'DEBIT') {
        debitTotal += entry.amount || 0
      } else if (entry.transactionType === 'KREDIT') {
        creditTotal += entry.amount || 0
      }
    })

    return {
      totalDebitAmount: debitTotal,
      totalCreditAmount: creditTotal,
      isBalanced:
        debitTotal === creditTotal && debitTotal > 0 && entries.length >= 2,
    }
  }, [entries])

  // Handle adding new entry
  const handleAddEntry = (data: SingleEntryFormData) => {
    console.log('handleAddEntry called with data:', data)
    if (editingEntry) {
      // Update existing entry
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingEntry.id
            ? { ...data, id: editingEntry.id }
            : entry,
        ),
      )
      setEditingEntry(null)
      toast.success('Entry updated successfully!')
    } else {
      // Add new entry
      const newEntry: LedgerEntry = {
        ...data,
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }
      setEntries((prev) => [...prev, newEntry])
      toast.success('Entry added successfully!')
    }

    // Reset form - preserve date and reference number if entries exist
    const hasEntries = entries.length > 0 || !editingEntry
    const firstEntry = entries.length > 0 ? entries[0] : data

    form.reset({
      ledgerDate:
        hasEntries && !editingEntry
          ? firstEntry.ledgerDate
          : new Date().toISOString().split('T')[0],
      referenceNumber:
        hasEntries && !editingEntry ? firstEntry.referenceNumber : '',
      description: '',
      transactionType: 'DEBIT',
      accountDetailAccountNumber: '',
      accountGeneralAccountNumber: '',
      ledgerType: defaultLedgerType,
      amount: 0,
    })
  }

  // Handle editing entry
  const handleEditEntry = (entry: LedgerEntry) => {
    setEditingEntry(entry)
    form.reset(entry)
  }

  // Handle removing entry
  const handleRemoveEntry = (id: string) => {
    const newEntries = entries.filter((entry) => entry.id !== id)
    setEntries(newEntries)

    // If all entries are removed, reset form to allow new date and reference number
    if (newEntries.length === 0) {
      form.reset({
        ledgerDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        description: '',
        transactionType: 'DEBIT',
        accountDetailAccountNumber: '',
        accountGeneralAccountNumber: '',
        ledgerType: defaultLedgerType,
        amount: 0,
      })
    }

    toast.success('Entry removed successfully!')
  }

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingEntry(null)

    // Preserve date and reference number if entries exist
    const firstEntry = entries.length > 0 ? entries[0] : null

    form.reset({
      ledgerDate: firstEntry
        ? firstEntry.ledgerDate
        : new Date().toISOString().split('T')[0],
      referenceNumber: firstEntry ? firstEntry.referenceNumber : '',
      description: '',
      transactionType: 'DEBIT',
      accountDetailAccountNumber: '',
      accountGeneralAccountNumber: '',
      ledgerType: defaultLedgerType,
      amount: 0,
    })
  }

  // Handle final submission
  const handleSubmitAll = async () => {
    // Validate double-entry balance
    if (!isBalanced) {
      toast.error(t('ledgers.unbalanced'), {
        description: `${t('ledgers.totalDebit')} (${formatCurrency(totalDebitAmount)}) ${t('ledgers.totalCredit')} (${formatCurrency(totalCreditAmount)})`,
      })
      return
    }

    if (entries.length < 2) {
      toast.error(t('ledgers.validation.minTwoEntries'))
      return
    }

    try {
      // Transform entries to match API payload structure
      const apiPayload: CreateBulkLedgersPayload = {
        ledgers: entries.map((entry) => ({
          ledgerDate: entry.ledgerDate,
          description: entry.description,
          ledgerType: entry.ledgerType,
          transactionType: entry.transactionType,
          accountDetailAccountNumber: entry.accountDetailAccountNumber,
          accountGeneralAccountNumber: entry.accountGeneralAccountNumber,
          amount: entry.amount,
        })),
      }

      await createBulkMutation.mutateAsync(apiPayload)
      toast.success('Ledger entries created successfully!')
      router.navigate({ to: '/ledgers' })
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'An error occurred while creating ledger entries',
      )
    }
  }

  const handleCancel = () => {
    router.navigate({ to: '/ledgers' })
  }

  return (
    <div className="container px-3 py-4 mx-auto sm:px-6 lg:px-8">
      <div className="mb-4 space-y-3 sm:mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="hover:bg-gray-100 md:hidden"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('ledgers.backToLedgers')}
        </Button>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {t('ledgers.createBulk')}
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            {t('ledgers.subtitle')}
          </p>
        </div>
      </div>

      {/* Balance Summary Card */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('ledgers.balanceSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                {t('ledgers.totalDebit')}
              </label>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalDebitAmount)}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                {t('ledgers.totalCredit')}
              </label>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalCreditAmount)}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">
                Status
              </label>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <Badge
                      variant="outline"
                      className="text-green-700 border-green-200 bg-green-50"
                    >
                      {t('ledgers.balanced')}
                    </Badge>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <Badge
                      variant="outline"
                      className="text-orange-700 border-orange-200 bg-orange-50"
                    >
                      {t('ledgers.unbalanced')}
                    </Badge>
                  </>
                )}
              </div>
              {!isBalanced && totalDebitAmount !== totalCreditAmount && (
                <div className="text-sm text-orange-600">
                  {t('labels.difference')}:{' '}
                  {formatCurrency(
                    Math.abs(totalDebitAmount - totalCreditAmount),
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Single Entry Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {editingEntry ? 'Edit Entry' : 'Add New Entry'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleAddEntry, (errors) => {
                console.log('Form validation errors:', errors)
                toast.error('Please fill in all required fields correctly')
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="ledgerDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('labels.date')}{' '}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={entries.length > 0 && !editingEntry}
                        />
                      </FormControl>
                      <FormMessage className="mt-1 text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('labels.referenceOptional')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="REF-001"
                          {...field}
                          disabled={entries.length > 0 && !editingEntry}
                        />
                      </FormControl>
                      <FormMessage className="mt-1 text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('labels.transactionType')}{' '}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('ledgers.selectLedgerType')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {transactionTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1 text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('labels.amount')}{' '}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Rp 0"
                          value={
                            field.value ? formatAmountInput(field.value) : ''
                          }
                          onChange={(e) => {
                            // Remove 'Rp' and format characters, keep only numbers
                            const numericValue = e.target.value.replace(
                              /[^\d]/g,
                              '',
                            )
                            field.onChange(
                              numericValue ? parseFloat(numericValue) : 0,
                            )
                          }}
                          className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{
                            MozAppearance: 'textfield',
                          }}
                        />
                      </FormControl>
                      <FormMessage className="mt-1 text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountDetailAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('labels.accountDetail')}{' '}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          handleAccountDetailChange(value)
                        }}
                        value={field.value}
                        disabled={isLoadingAccounts}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingAccounts
                                  ? 'Loading accounts...'
                                  : 'Select account detail'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountsData?.data?.map((account) => (
                            <SelectItem
                              key={account.accountNumber}
                              value={account.accountNumber}
                            >
                              {account.accountNumber} - {account.accountName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="mt-1 text-xs text-red-600" />
                    </FormItem>
                  )}
                />

                {/* Hidden fields */}
                <div className="hidden">
                  <FormField
                    control={form.control}
                    name="ledgerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t('labels.ledgerType')}{' '}
                          <span className="text-red-500">*</span>
                        </FormLabel>
                        {isLedgerTypeReadonly ? (
                          <div className="flex w-full h-10 px-3 py-2 text-sm border rounded-md opacity-50 border-input bg-background ring-offset-background">
                            {t(
                              ledgerTypeOptions.find(
                                (option) => option.value === field.value,
                              )?.labelKey || 'ledgers.types.KAS',
                            )}
                          </div>
                        ) : (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t('ledgers.selectLedgerType')}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ledgerTypeOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {t(option.labelKey)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage className="mt-1 text-xs text-red-600" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountGeneralAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('labels.description')}{' '}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('ledgers.enterDescription')}
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="mt-1 text-xs text-red-600" />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-2 pt-4">
                <Button type="submit" className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {editingEntry ? 'Update Entry' : 'Add Entry'}
                </Button>
                {editingEntry && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Entries List */}
      {entries.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Journal Entries ({entries.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  variant={entries.length >= 2 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {entries.length >= 2
                    ? '✓ Ready to Submit'
                    : `Need ${2 - entries.length} more`}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 border-b bg-gray-50">
                <div className="col-span-1">{t('labels.type')}</div>
                <div className="col-span-3">{t('labels.description')}</div>
                <div className="col-span-2">{t('labels.account')}</div>
                <div className="col-span-2">{t('labels.reference')}</div>
                <div className="col-span-1">{t('labels.date')}</div>
                <div className="col-span-2 text-right">
                  {t('labels.amount')}
                </div>
                <div className="col-span-1 text-center">
                  {t('labels.actions')}
                </div>
              </div>

              {/* Entry Rows */}
              <div className="divide-y divide-gray-100">
                {entries.map((entry, index) => {
                  const accountName =
                    accountsData?.data?.find(
                      (acc) =>
                        acc.accountNumber === entry.accountDetailAccountNumber,
                    )?.accountName || 'Unknown Account'

                  return (
                    <div
                      key={entry.id}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        editingEntry?.id === entry.id
                          ? 'bg-blue-50 border-l-4 border-blue-400'
                          : ''
                      }`}
                    >
                      {/* Transaction Type */}
                      <div className="flex items-center col-span-1">
                        <Badge
                          variant={
                            entry.transactionType === 'DEBIT'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs font-medium"
                        >
                          {entry.transactionType === 'DEBIT' ? 'DR' : 'CR'}
                        </Badge>
                      </div>

                      {/* Description */}
                      <div className="flex items-center col-span-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.description}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            Entry #{index + 1}
                          </p>
                        </div>
                      </div>

                      {/* Account */}
                      <div className="flex items-center col-span-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {entry.accountDetailAccountNumber}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {accountName}
                          </p>
                        </div>
                      </div>

                      {/* Reference */}
                      <div className="flex items-center col-span-2">
                        <span className="font-mono text-xs text-gray-600">
                          {entry.referenceNumber}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="flex items-center col-span-1">
                        <span className="text-xs text-gray-600">
                          {formatDateShort(entry.ledgerDate)}
                        </span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center justify-end col-span-2">
                        <div className="text-right">
                          <p
                            className={`text-sm font-bold ${
                              entry.transactionType === 'DEBIT'
                                ? 'text-blue-600'
                                : 'text-purple-600'
                            }`}
                          >
                            {formatCurrency(entry.amount)}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-center col-span-1">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntry(entry)}
                            className="w-6 h-6 p-0 text-blue-600 rounded hover:text-blue-800 hover:bg-blue-100"
                            title={t('common.edit')}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEntry(entry.id)}
                            className="w-6 h-6 p-0 text-red-600 rounded hover:text-red-800 hover:bg-red-100"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary Row */}
              <div className="px-4 py-3 border-t-2 border-gray-200 bg-gray-50">
                <div className="grid grid-cols-12 gap-2">
                  <div className="flex items-center col-span-9">
                    <span className="text-sm font-medium text-gray-700">
                      Total Entries: {entries.length}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-600">
                          {t('accounts.transactionTypes.DEBIT')}:
                        </span>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(totalDebitAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-purple-600">
                          {t('accounts.transactionTypes.KREDIT')}:
                        </span>
                        <span className="font-medium text-purple-600">
                          {formatCurrency(totalCreditAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center col-span-1">
                    <div
                      title={
                        isBalanced
                          ? t('ledgers.balanced')
                          : t('ledgers.unbalanced')
                      }
                    >
                      {isBalanced ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Section */}
      <div className="space-y-4">
        {/* Submit Buttons */}
        <div className="flex justify-end pt-6 space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createBulkMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitAll}
            disabled={
              createBulkMutation.isPending || !isBalanced || entries.length < 2
            }
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {createBulkMutation.isPending
              ? 'Creating Entries...'
              : `Create ${entries.length} Ledger Entries`}
          </Button>
        </div>

        {/* Balance Warning */}
        {entries.length > 0 && !isBalanced && (
          <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                {t('labels.transactionNotBalanced')}
              </span>
            </div>
            <p className="mt-1 text-sm text-orange-700">
              {t('labels.doubleEntryWarning')}
            </p>
          </div>
        )}

        {/* Minimum entries warning */}
        {entries.length < 2 && entries.length > 0 && (
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">
                {t('labels.minimumEntriesRequired')}
              </span>
            </div>
            <p className="mt-1 text-sm text-blue-700">
              {t('labels.minimumEntriesWarning')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
