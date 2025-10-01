import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import {
  BarChart3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function ReportsPage() {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isViewingPdf, setIsViewingPdf] = useState(false)
  const [reportType, setReportType] = useState<
    'neraca-detail' | 'neraca' | 'penjelasan-neraca'
  >('penjelasan-neraca')
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false)

  const handleGenerateReport = async (format: 'pdf' | 'xlsx') => {
    if (!reportType) {
      toast.error(t('reports.selectTypeAndFormat'))
      return
    }

    setIsGenerating(true)
    setIsFormatModalOpen(false)

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

  const handleViewPdf = async () => {
    if (!reportType) {
      toast.error('Please select a report type')
      return
    }

    setIsViewingPdf(true)

    try {
      const options: ReportGenerationOptions = {
        includeDetail:
          reportType === 'neraca-detail' || reportType === 'penjelasan-neraca',
        includeGeneral:
          reportType === 'neraca' || reportType === 'penjelasan-neraca',
        format: 'pdf',
        fileName: `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`,
      }

      await reportsService.viewReportByTypeInNewTab(reportType, options)

      toast.success(t('reports.viewPdfSuccessfully'))
    } catch (error) {
      console.error('Error viewing PDF:', error)
      toast.error(t('reports.viewPdfFailed'))
    } finally {
      setIsViewingPdf(false)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {(isGenerating || isViewingPdf) && (
        <SubmitOverlay
          isVisible={true}
          message={
            isViewingPdf
              ? `${t('reports.viewingPdf')} ${t('common.pleaseWait')}`
              : `${t('reports.generating')} ${t('common.pleaseWait')}`
          }
        />
      )}

      <main className="container max-w-6xl px-4 py-8 mx-auto">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-full">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900">
            {t('reports.title')}
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-600">
            {t('reports.subtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Main Configuration Card */}
          <div>
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-gray-900">
                  {t('reports.configuration')}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {t('reports.configureSettings')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Report Type Selection */}
                <div className="space-y-4">
                  <Label
                    htmlFor="report-type"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    {t('reports.reportType')}
                  </Label>
                  <Select
                    value={reportType}
                    onValueChange={(
                      value: 'neraca-detail' | 'neraca' | 'penjelasan-neraca',
                    ) => setReportType(value)}
                  >
                    <SelectTrigger className="px-4 py-8 transition-all duration-200 bg-white border-2 border-gray-200 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 hover:border-gray-300">
                      <SelectValue placeholder={t('reports.reportType')} />
                    </SelectTrigger>
                    <SelectContent className="border shadow-xl rounded-xl bg-white p-1 min-w-[400px]">
                      {reportOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <SelectItem
                            key={option.id}
                            value={option.id}
                            className="cursor-pointer rounded-lg my-1 data-[highlighted]:bg-blue-50 data-[state=checked]:bg-blue-100 focus:bg-blue-50"
                          >
                            <div className="flex items-center gap-3 py-2">
                              <div
                                className={`p-2.5 rounded-lg ${option.bgColor} shadow-sm`}
                              >
                                <Icon className={`w-5 h-5 ${option.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900">
                                  {option.title}
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">
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

                {/* Selected Report Preview */}
                <div className="p-6 border border-blue-200 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h4 className="font-semibold text-gray-900">
                      {t('reports.preview')}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {t('reports.type')}:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {reportOptions.find((opt) => opt.id === reportType)
                          ?.title || t('reports.notSelected')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {t('reports.format')}:
                      </span>
                      <span className="text-sm font-medium text-blue-600">
                        {t('reports.selectFormatOnGenerate')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-blue-200">
                      <span className="text-sm text-gray-600">
                        {t('reports.filename')}:
                      </span>
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {reportType}_report_
                        {new Date().toISOString().split('T')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <AlertDialog
                    open={isFormatModalOpen}
                    onOpenChange={setIsFormatModalOpen}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={!reportType || isGenerating || isViewingPdf}
                        className="h-12 text-base font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        size="lg"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {t('reports.generate')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-0 shadow-2xl sm:max-w-lg rounded-2xl bg-white/95 backdrop-blur-sm">
                      <AlertDialogHeader className="pb-6 text-center">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
                          <Download className="w-6 h-6 text-blue-600" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-gray-900">
                          {t('reports.selectFormat')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-base text-gray-600">
                          {t('reports.selectFormatDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="grid gap-4 py-2">
                        {formatOptions.map((option, index) => {
                          const Icon = option.icon
                          return (
                            <Button
                              key={option.value}
                              onClick={() =>
                                handleGenerateReport(
                                  option.value as 'pdf' | 'xlsx',
                                )
                              }
                              variant="outline"
                              className="justify-start h-auto p-6 transition-all duration-300 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md rounded-xl group animate-in slide-in-from-bottom-2 fade-in"
                              style={{
                                animationDelay: `${index * 100}ms`,
                              }}
                            >
                              <div className="flex items-center w-full gap-4">
                                <div className="p-3 transition-shadow duration-200 bg-white rounded-lg shadow-sm group-hover:shadow-md">
                                  <Icon className="w-6 h-6 text-gray-700" />
                                </div>
                                <div className="flex-1 text-left">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {option.label}
                                  </div>
                                  <div className="mt-1 text-sm text-gray-600">
                                    {option.description}
                                  </div>
                                </div>
                                <div className="w-2 h-2 transition-opacity duration-200 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100"></div>
                              </div>
                            </Button>
                          )
                        })}
                      </div>
                      <AlertDialogFooter className="pt-6">
                        <AlertDialogCancel className="px-6 py-2 transition-colors duration-200 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                          {t('common.cancel')}
                        </AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    onClick={handleViewPdf}
                    disabled={!reportType || isGenerating || isViewingPdf}
                    className="h-12 text-base font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                    size="lg"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    {isViewingPdf
                      ? t('reports.viewingPdf')
                      : t('reports.viewPdf')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
