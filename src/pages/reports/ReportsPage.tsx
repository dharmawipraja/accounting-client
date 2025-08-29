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
import {
  reportsService,
  type ReportGenerationOptions,
} from '@/services/reports'
import { Download, FileSpreadsheet, FileText, BarChart3 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportType, setReportType] = useState<
    'neraca-detail' | 'neraca' | 'penjelasan-neraca'
  >('penjelasan-neraca')
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf')

  const handleGenerateReport = async () => {
    if (!reportType || !format) {
      toast.error('Please select report type and format')
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

      toast.success(`${format.toUpperCase()} report generated successfully!`)
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const reportOptions = [
    {
      id: 'neraca-detail',
      title: 'Neraca Detail',
      description: 'Only get data from account detail with ReportType NERACA',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'neraca',
      title: 'Neraca',
      description: 'Only get data from account general with ReportType NERACA',
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      id: 'penjelasan-neraca',
      title: 'Penjelasan Neraca',
      description:
        'Combine both data from account general and account detail with ReportType NERACA',
      icon: FileSpreadsheet,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  const formatOptions = [
    {
      value: 'pdf',
      label: 'PDF Document',
      icon: FileText,
      description: 'Portable Document Format',
    },
    {
      value: 'xlsx',
      label: 'Excel Spreadsheet',
      icon: FileSpreadsheet,
      description: 'Microsoft Excel Format',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {isGenerating && (
        <SubmitOverlay
          isVisible={true}
          message="Generating report... Please wait"
        />
      )}

      <main className="container px-3 py-4 mx-auto sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              Generate Reports
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Generate comprehensive account reports in PDF or Excel format
            </p>
          </div>

          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>
                Configure your account report settings and generate the file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Report Type Dropdown */}
                <div className="space-y-3">
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select
                    value={reportType}
                    onValueChange={(
                      value: 'neraca-detail' | 'neraca' | 'penjelasan-neraca',
                    ) => setReportType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
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
                  <Label htmlFor="format">File Format</Label>
                  <Select
                    value={format}
                    onValueChange={(value: 'pdf' | 'xlsx') => setFormat(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
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
                <h4 className="mb-2 text-sm font-medium">Report Preview</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Type:{' '}
                    {reportOptions.find((opt) => opt.id === reportType)
                      ?.title || 'Not selected'}
                  </p>
                  <p>
                    Format:{' '}
                    {formatOptions.find((opt) => opt.value === format)?.label ||
                      'Not selected'}
                  </p>
                  <p>
                    Filename: {reportType}_accounts_report_
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
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Report Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <h4 className="mb-1 text-sm font-medium">Neraca Detail</h4>
                  <p className="text-xs text-muted-foreground">
                    Only includes account detail data with ReportType NERACA,
                    showing detailed balance sheet account information.
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium">Neraca</h4>
                  <p className="text-xs text-muted-foreground">
                    Only includes account general data with ReportType NERACA,
                    showing main balance sheet account structure.
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-medium">
                    Penjelasan Neraca
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Combines both account general and detail data with
                    ReportType NERACA, providing comprehensive balance sheet
                    overview.
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
