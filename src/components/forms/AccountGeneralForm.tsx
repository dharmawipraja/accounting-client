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
import { useTranslation } from '@/hooks/useTranslation'
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

// Note: For validation messages, we'll handle them in the component with dynamic translation
const createAccountGeneralFormSchema = (t: any) =>
  z.object({
    accountNumber: z
      .string()
      .min(1, t('accounts.validation.accountNumberRequired'))
      .max(20, t('accounts.validation.accountNumberLength'))
      .regex(/^[0-9-]+$/, t('accounts.validation.accountNumberFormat')),
    accountName: z
      .string()
      .min(3, t('accounts.validation.accountNameRequired'))
      .max(100, t('accounts.validation.accountNameLength')),
    accountCategory: z.enum([
      'ASSET',
      'HUTANG',
      'MODAL',
      'PENDAPATAN',
      'BIAYA',
    ]),
    reportType: z.enum(['NERACA', 'LABA_RUGI']),
    transactionType: z.enum(['DEBIT', 'KREDIT']),
    amountCredit: z
      .string()
      .refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
        t('accounts.validation.creditAmountValid'),
      ),
    amountDebit: z
      .string()
      .refine(
        (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
        t('accounts.validation.debitAmountValid'),
      ),
  })

type AccountGeneralFormData = z.infer<
  ReturnType<typeof createAccountGeneralFormSchema>
>

interface AccountGeneralFormProps {
  mode: 'create' | 'edit'
  account?: AccountGeneral
}

// These options will use translation keys
const accountCategoryOptions = [
  { value: 'ASSET', labelKey: 'accounts.categories.ASSET' },
  { value: 'HUTANG', labelKey: 'accounts.categories.HUTANG' },
  { value: 'MODAL', labelKey: 'accounts.categories.MODAL' },
  { value: 'PENDAPATAN', labelKey: 'accounts.categories.PENDAPATAN' },
  { value: 'BIAYA', labelKey: 'accounts.categories.BIAYA' },
] as const

const reportTypeOptions = [
  { value: 'NERACA', labelKey: 'accounts.reportTypes.NERACA' },
  { value: 'LABA_RUGI', labelKey: 'accounts.reportTypes.LABA_RUGI' },
] as const

const transactionTypeOptions = [
  { value: 'DEBIT', labelKey: 'accounts.transactionTypes.DEBIT' },
  { value: 'KREDIT', labelKey: 'accounts.transactionTypes.KREDIT' },
] as const

export function AccountGeneralForm({ mode, account }: AccountGeneralFormProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const createMutation = useCreateAccountGeneralMutation()
  const updateMutation = useUpdateAccountGeneralMutation()

  const form = useForm<AccountGeneralFormData>({
    resolver: zodResolver(createAccountGeneralFormSchema(t)),
    mode: 'onChange',
    defaultValues: {
      accountNumber: '',
      accountName: '',
      accountCategory: 'ASSET',
      reportType: 'NERACA',
      transactionType: 'DEBIT',
      amountCredit: '0',
      amountDebit: '0',
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
        amountCredit: account.amountCredit.toString(),
        amountDebit: account.amountDebit.toString(),
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
          amountCredit: parseFloat(data.amountCredit),
          amountDebit: parseFloat(data.amountDebit),
        }
        await createMutation.mutateAsync(payload)
        toast.success(t('accounts.messages.generalCreated'))
      } else if (account) {
        const payload: UpdateAccountGeneralPayload = {
          accountName: data.accountName,
          accountCategory: data.accountCategory,
          reportType: data.reportType,
          transactionType: data.transactionType,
          amountCredit: parseFloat(data.amountCredit),
          amountDebit: parseFloat(data.amountDebit),
        }
        await updateMutation.mutateAsync({
          accountNumber: account.accountNumber,
          data: payload,
        })
        toast.success(t('accounts.messages.generalUpdated'))
      }

      router.navigate({ to: '/accounts/general' })
    } catch {
      toast.error(
        mode === 'create'
          ? t('accounts.messages.createFailed', {
              type: t('accounts.form.generalAccount'),
            })
          : t('accounts.messages.updateFailed', {
              type: t('accounts.form.generalAccount'),
            }),
      )
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="container max-w-2xl py-6 mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.navigate({ to: '/accounts/general' })}
          className="mb-4 md:hidden"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('accounts.form.backTo', { type: t('accounts.general') })}
        </Button>
        <h1 className="text-3xl font-bold">
          {mode === 'create'
            ? t('accounts.form.create')
            : t('accounts.form.edit')}{' '}
          {t('accounts.form.generalAccount')}
        </h1>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? t('accounts.form.createNew', {
                type: t('accounts.form.generalAccount'),
              })
            : t('accounts.form.updateInfo', {
                type: t('accounts.form.generalAccount'),
              })}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Calculator className="w-4 h-4 sm:h-5 sm:w-5" />
            {t('accounts.form.accountInformation')}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {t('accounts.form.fillDetails', {
              type: t('accounts.form.generalAccount'),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Basic Information */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('accounts.accountNumber')}{' '}
                        {t('accounts.form.required')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'accounts.form.placeholder.accountNumber',
                          )}
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
                      <FormLabel>
                        {t('accounts.accountName')}{' '}
                        {t('accounts.form.required')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t(
                            'accounts.form.placeholder.accountName',
                          )}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <hr className="my-4" />

              {/* Account Classification */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="accountCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('accounts.accountCategory')}{' '}
                        {t('accounts.form.required')}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'accounts.form.placeholder.selectCategory',
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountCategoryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
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
                      <FormLabel>
                        {t('accounts.reportType')} {t('accounts.form.required')}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'accounts.form.placeholder.selectReportType',
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reportTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(option.labelKey)}
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
                      <FormLabel>
                        {t('accounts.transactionType')}{' '}
                        {t('accounts.form.required')}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                'accounts.form.placeholder.selectTransactionType',
                              )}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <hr className="my-4" />

              {/* Balance Information */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amountCredit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('accounts.creditAmount')}</FormLabel>
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
                      <FormLabel>{t('accounts.debitAmount')}</FormLabel>
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
              <div className="flex justify-end pt-6 space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.navigate({ to: '/accounts/general' })}
                  disabled={isSubmitting}
                >
                  {t('accounts.form.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting
                    ? mode === 'create'
                      ? t('accounts.form.creating')
                      : t('accounts.form.updating')
                    : mode === 'create'
                      ? t('accounts.form.createAccount')
                      : t('accounts.form.updateAccount')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
