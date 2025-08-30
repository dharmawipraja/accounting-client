import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SubmitOverlay } from '@/components/ui/submit-overlay'
import { useTranslation } from '@/hooks/useTranslation'
import {
  reportsService,
  type ReportGenerationOptions,
} from '@/services/reports'
import { Download, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function ReportsPage() {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportType, setReportType] = useState<
    'neraca-detail' | 'neraca' | 'penjelasan-neraca'
  >('penjelasan-neraca')
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf')

  const handleGenerateReport = async () => {
    if (!reportType || !format) {
      toast.error(t('reports.selectTypeAndFormat'))
      return
    }

    setIsGenerating(true)

    try {
      const options: ReportGenerationOptions = {
        includeDetail:
          reportType === 'neraca-detail' || reportType === 'penjelasan-neraca',
        includeGeneral:
          reportType === 'neraca' || reportType === 'penjelasan-neraca',
        format,
        fileName: `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format}`,
      }

      await reportsService.generateReportByType(reportType, options)

      toast.success(
        t('reports.generatedSuccessfully', { format: format.toUpperCase() }),
      )
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error(t('reports.generateFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const reportOptions = [
    {
      id: 'neraca-detail',
      title: t('reports.types.neracaDetail.title'),
      description: t('reports.types.neracaDetail.description'),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'neraca',
      title: t('reports.types.neraca.title'),
      description: t('reports.types.neraca.description'),
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'penjelasan-neraca',
      title: t('reports.types.penjelasanNeraca.title'),
      description: t('reports.types.penjelasanNeraca.description'),
      icon: FileSpreadsheet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  const formatOptions = [
    {
      value: 'pdf',
      label: t('reports.formats.pdf.label'),
      icon: FileText,
      description: t('reports.formats.pdf.description'),
    },
    {
      value: 'xlsx',
      label: t('reports.formats.xlsx.label'),
      icon: FileSpreadsheet,
      description: t('reports.formats.xlsx.description'),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {isGenerating && (
        <SubmitOverlay
          isVisible={true}
          message={`${t('reports.generating')} ${t('common.pleaseWait')}`}
        />
      )}

      <main className="container px-3 py-4 mx-auto sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              {t('reports.title')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t('reports.subtitle')}
            </p>
          </div>

          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                {t('reports.configuration')}
              </CardTitle>
              <CardDescription>
                {t('reports.configureSettings')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Report Type Dropdown */}
                <div className="space-y-3">
                  <Label htmlFor="report-type">{t('reports.reportType')}</Label>
                  <Select
                    value={reportType}
                    onValueChange={(
                      value: 'neraca-detail' | 'neraca' | 'penjelasan-neraca',
                    ) => setReportType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.reportType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {reportOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <SelectItem key={option.id} value={option.id}>
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-1.5 rounded-md ${option.bgColor}`}
                              >
                                <Icon className={`w-4 h-4 ${option.color}`} />
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  {option.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format Selection */}
                <div className="space-y-3">
                  <Label htmlFor="format">{t('reports.fileFormat')}</Label>
                  <Select
                    value={format}
                    onValueChange={(value: 'pdf' | 'xlsx') => setFormat(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.fileFormat')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              <div>
                                <div className="font-medium">
                                  {option.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {option.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Report Preview */}
              <div className="p-4 rounded-lg bg-muted/30">
                <h4 className="mb-2 text-sm font-medium">
                  {t('reports.preview')}
                </h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    {t('reports.type')}:{' '}
                    {reportOptions.find((opt) => opt.id === reportType)
                      ?.title || t('reports.notSelected')}
                  </p>
                  <p>
                    {t('reports.format')}:{' '}
                    {formatOptions.find((opt) => opt.value === format)?.label ||
                      t('reports.notSelected')}
                  </p>
                  <p>
                    {t('reports.filename')}: {reportType}_accounts_report_
                    {new Date().toISOString().split('T')[0]}.{format}
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateReport}
                disabled={!reportType || !format || isGenerating}
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                {isGenerating ? t('reports.generating') : t('reports.generate')}
              </Button>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('reports.information')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h4 className="mb-1 text-sm font-medium">
                    {t('reports.types.neracaDetail.title')}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t('reports.neracaDetailInfo')}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium">
                    {t('reports.types.neraca.title')}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t('reports.neracaInfo')}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium">
                    {t('reports.types.penjelasanNeraca.title')}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {t('reports.penjelasanNeracaInfo')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
