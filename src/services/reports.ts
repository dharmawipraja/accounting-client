import { REPORT } from '@/constants/report'
import type { AccountDetail, AccountGeneral } from '@/types/accounts'
import type { PaginatedResponse } from '@/types/api'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { api } from './api'

export interface ReportData {
  accountDetail?: AccountDetail[]
  accountGeneral?: AccountGeneral[]
  generatedAt: string
  totalRecords: number
}

export interface ReportGenerationOptions {
  includeDetail: boolean
  includeGeneral: boolean
  format: 'pdf' | 'xlsx'
  fileName?: string
  viewInNewTab?: boolean
}

export type NeracaReportType = 'neraca' | 'neraca-detail' | 'penjelasan-neraca'

export interface HierarchicalAccount {
  general: AccountGeneral
  details: AccountDetail[]
}

/**
 * Create hierarchical structure grouping detail accounts under their general accounts
 */
function createHierarchicalAccountList(
  data: ReportData,
): HierarchicalAccount[] {
  const hierarchicalAccounts: HierarchicalAccount[] = []

  if (!data.accountGeneral) return hierarchicalAccounts

  // Create a map for quick detail account lookup by general account number
  const detailsByGeneral = new Map<string, AccountDetail[]>()

  if (data.accountDetail) {
    data.accountDetail.forEach((detail) => {
      const generalAccountNumber = detail.accountGeneralAccountNumber
      if (!detailsByGeneral.has(generalAccountNumber)) {
        detailsByGeneral.set(generalAccountNumber, [])
      }
      detailsByGeneral.get(generalAccountNumber)!.push(detail)
    })
  }

  // Create hierarchical structure
  data.accountGeneral.forEach((general) => {
    const details = detailsByGeneral.get(general.accountNumber) || []
    // Sort details by account number
    details.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))

    hierarchicalAccounts.push({
      general,
      details,
    })
  })

  // Sort by general account number
  return hierarchicalAccounts.sort((a, b) =>
    a.general.accountNumber.localeCompare(b.general.accountNumber),
  )
}

/**
 * Get standalone detail accounts (those without matching general accounts)
 */
function getStandaloneDetailAccounts(data: ReportData): AccountDetail[] {
  if (!data.accountDetail || !data.accountGeneral)
    return data.accountDetail || []

  const generalAccountNumbers = new Set(
    data.accountGeneral.map((g) => g.accountNumber),
  )

  return data.accountDetail
    .filter(
      (detail) =>
        !generalAccountNumbers.has(detail.accountGeneralAccountNumber),
    )
    .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
}

/**
 * Reports service for generating account reports
 */
export const reportsService = {
  /**
   * Fetch account data filtered by NERACA report type
   */
  async fetchNeracaAccountData(
    reportType: NeracaReportType,
  ): Promise<ReportData> {
    // Determine which data to fetch based on report type
    const needsDetail =
      reportType === 'neraca-detail' || reportType === 'penjelasan-neraca'
    const needsGeneral =
      reportType === 'neraca' || reportType === 'penjelasan-neraca'

    let accountDetail: AccountDetail[] = []
    let accountGeneral: AccountGeneral[] = []

    try {
      if (needsDetail) {
        // Fetch detail accounts with NERACA report type
        const detailResponse = await api.get<
          PaginatedResponse<AccountDetail[]>
        >('/accounts/detail', {
          params: {
            limit: 9999,
            reportType: 'NERACA',
          },
        })
        accountDetail = detailResponse.data.data
      }

      if (needsGeneral) {
        // Fetch general accounts with NERACA report type
        const generalResponse = await api.get<
          PaginatedResponse<AccountGeneral[]>
        >('/accounts/general', {
          params: {
            limit: 9999,
            reportType: 'NERACA',
          },
        })
        accountGeneral = generalResponse.data.data
      }

      return {
        accountDetail: needsDetail ? accountDetail : undefined,
        accountGeneral: needsGeneral ? accountGeneral : undefined,
        generatedAt: new Date().toISOString(),
        totalRecords: accountDetail.length + accountGeneral.length,
      }
    } catch {
      throw new Error('Failed to fetch NERACA account data for reports')
    }
  },

  /**
   * Fetch all account data for reports (without pagination)
   */
  async fetchAllAccountData(): Promise<ReportData> {
    const promises: Promise<any>[] = []

    // Fetch all detail accounts
    promises.push(
      api.get<PaginatedResponse<AccountDetail[]>>('/accounts/detail', {
        params: { limit: 9999 }, // Large limit to get all records
      }),
    )

    // Fetch all general accounts
    promises.push(
      api.get<PaginatedResponse<AccountGeneral[]>>('/accounts/general', {
        params: { limit: 9999 }, // Large limit to get all records
      }),
    )

    try {
      const [detailResponse, generalResponse] = await Promise.all(promises)

      return {
        accountDetail: detailResponse.data.data,
        accountGeneral: generalResponse.data.data,
        generatedAt: new Date().toISOString(),
        totalRecords:
          detailResponse.data.data.length + generalResponse.data.data.length,
      }
    } catch {
      throw new Error('Failed to fetch account data for reports')
    }
  },

  /**
   * Generate PDF report
   */
  async generatePDF(
    data: ReportData,
    options: ReportGenerationOptions,
  ): Promise<void> {
    const doc = new jsPDF()
    const fileName =
      options.fileName ||
      `account_report_${new Date().toISOString().split('T')[0]}.pdf`

    // Check if this is a Neraca report and format accordingly
    if (options.fileName?.includes('neraca')) {
      await this.generateNeracaPDF(doc, data, options)
    } else {
      await this.generateStandardPDF(doc, data, options)
    }

    // Either save the PDF or view in new tab
    if (options.viewInNewTab) {
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      // Clean up the URL after a short delay to free memory
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000)
    } else {
      doc.save(fileName)
    }
  },

  /**
   * View PDF report in new tab
   */
  async viewPDFInNewTab(
    data: ReportData,
    options: ReportGenerationOptions,
  ): Promise<void> {
    const viewOptions = { ...options, viewInNewTab: true }
    await this.generatePDF(data, viewOptions)
  },

  /**
   * Generate Neraca-formatted PDF (Balance Sheet)
   */
  async generateNeracaPDF(
    doc: any,
    data: ReportData,
    options: ReportGenerationOptions,
  ): Promise<void> {
    const currentDate = new Date()
    const indonesianMonths = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ]
    const formattedDate = `${currentDate.getDate()} ${indonesianMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}`

    // Check if this is specifically a neraca-detail report
    if (options.fileName?.includes('neraca-detail')) {
      await this.generateNeracaDetailPDF(formattedDate, doc, data, options)
      return
    }

    // Check if this is a penjelasan-neraca report
    if (options.fileName?.includes('penjelasan-neraca')) {
      await this.generatePenjelasanNeracaPDF(formattedDate, doc, data, options)
      return
    }

    // Header for regular neraca
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(REPORT.JENIS_USAHA, 105, 20, { align: 'center' })
    doc.text(REPORT.NAMA_USAHA, 105, 30, { align: 'center' })
    doc.setFontSize(16)
    doc.text('NERACA', 105, 45, { align: 'center' })

    // Date
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`s/d Tanggal ${formattedDate}`, 105, 55, { align: 'center' })

    // Table headers
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('REKENING - REKENING', 20, 75)
    doc.text('SALDO AKUMULASI', 170, 75, { align: 'right' })

    // Draw line under headers
    doc.setLineWidth(0.5)
    doc.line(20, 78, 190, 78)

    let yPosition = 90

    // Group accounts by category
    const aktivaAccounts = this.getAccountsByCategory(data, ['ASSET'])
    const pasivaAccounts = this.getAccountsByCategory(data, ['HUTANG', 'MODAL'])

    // AKTIVA Section
    if (aktivaAccounts.length > 0) {
      // Section header with light background
      doc.setFillColor(245, 245, 245) // Light gray background
      doc.rect(18, yPosition - 7, 174, 12, 'F')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0) // Black text
      doc.text('AKTIVA', 30, yPosition)
      doc.text('1', 20, yPosition)
      yPosition += 10

      const aktivaTotal = this.renderAccountSection(
        doc,
        aktivaAccounts,
        yPosition,
        40,
      )
      yPosition = aktivaTotal.yPosition

      // AKTIVA Total with highlighted background
      doc.setFillColor(220, 240, 220) // Light green background
      doc.rect(18, yPosition - 7, 174, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL AKTIVA', 40, yPosition)
      doc.text(formatCurrency(aktivaTotal.total), 170, yPosition, {
        align: 'right',
      })
      yPosition += 15
    }

    // PASIVA Section
    if (pasivaAccounts.length > 0) {
      // Add spacing before PASIVA section
      yPosition += 5

      // Section header with light background
      doc.setFillColor(245, 245, 245) // Light gray background
      doc.rect(18, yPosition - 7, 174, 12, 'F')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0) // Black text
      doc.text('PASIVA', 30, yPosition)
      doc.text('2', 20, yPosition)
      yPosition += 10

      const pasivaTotal = this.renderAccountSection(
        doc,
        pasivaAccounts,
        yPosition,
        40,
      )
      yPosition = pasivaTotal.yPosition

      // PASIVA Total with highlighted background
      doc.setFillColor(240, 220, 220) // Light red background
      doc.rect(18, yPosition - 7, 174, 12, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL PASIVA', 40, yPosition)
      doc.text(formatCurrency(pasivaTotal.total), 170, yPosition, {
        align: 'right',
      })
      yPosition += 20
    }

    // Signature section
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 30
    } else {
      yPosition += 20 // Add extra spacing before footer
    }

    // Add a subtle separator line before footer
    doc.setLineWidth(0.3)
    doc.setDrawColor(180, 180, 180)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 15

    // Signature section with maximum page width distribution
    const leftSignatureX = 45 // Move much closer to left margin
    const rightSignatureX = 165 // Move much closer to right margin

    // Date and location - positioned above Bendahara with matching alignment and font
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0) // Black text to match signatures

    const dateText = `${REPORT.LOKASI}, ${formattedDate}`
    doc.text(dateText, rightSignatureX, yPosition, { align: 'center' })
    yPosition += 15 // Space between date and signature titles

    // Position titles
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0) // Black text
    doc.text('Ketua', leftSignatureX, yPosition, { align: 'center' })
    doc.text('Bendahara', rightSignatureX, yPosition, { align: 'center' })
    yPosition += 50 // Space for signatures

    // Add signature lines (wider to match maximum spacing)
    doc.setLineWidth(0.5)
    doc.setDrawColor(100, 100, 100)
    doc.line(leftSignatureX - 35, yPosition, leftSignatureX + 35, yPosition) // Left signature line (wider)
    doc.line(rightSignatureX - 35, yPosition, rightSignatureX + 35, yPosition) // Right signature line (wider)
    yPosition += 10

    // Names below signature lines
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(REPORT.NAMA_KETUA, leftSignatureX, yPosition, { align: 'center' })
    doc.text(REPORT.NAMA_BENDAHARA, rightSignatureX, yPosition, {
      align: 'center',
    })
  },

  /**
   * Generate Neraca Detail PDF formatted like the image provided
   */
  async generateNeracaDetailPDF(
    formattedDate: string,
    doc: any,
    data: ReportData,
    _options: ReportGenerationOptions,
  ): Promise<void> {
    // Header - Company Info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(REPORT.JENIS_USAHA, 105, 20, { align: 'center' })
    doc.text(REPORT.NAMA_USAHA, 105, 30, { align: 'center' })

    // Title
    doc.setFontSize(14)
    doc.text('NERACA DETAIL', 105, 45, { align: 'center' })

    // Date
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`s.d Tanggal ${formattedDate}`, 105, 55, { align: 'center' })

    // Column headers
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('NOMOR', 20, 75)
    doc.text('PERKIRAAN', 20, 82)
    doc.text('NAMA PERKIRAAN', 70, 78)
    doc.text('SALDO AKUMULASI', 170, 78, { align: 'right' })

    // Draw line under headers
    doc.setLineWidth(0.5)
    doc.line(20, 85, 190, 85)

    let yPosition = 100

    // Get accounts by category
    const aktivaAccounts = this.getAccountsByCategory(data, ['ASSET'])
    const hutangAccounts = this.getAccountsByCategory(data, ['HUTANG'])
    const modalAccounts = this.getAccountsByCategory(data, ['MODAL'])

    let aktivaTotal = 0
    let hutangTotal = 0
    let modalTotal = 0

    // AKTIVA Section
    if (aktivaAccounts.length > 0) {
      aktivaTotal = this.renderNeracaDetailSection(
        doc,
        aktivaAccounts,
        yPosition,
        'AKTIVA',
      )
      yPosition = this.getNextYPosition(doc, aktivaAccounts, yPosition, 30)

      // TOTAL AKTIVA
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL AKTIVA', 70, yPosition)
      doc.text(formatCurrency(aktivaTotal), 170, yPosition, {
        align: 'right',
      })
      yPosition += 15
    }

    // HUTANG Section
    if (hutangAccounts.length > 0) {
      yPosition += 5
      hutangTotal = this.renderNeracaDetailSection(
        doc,
        hutangAccounts,
        yPosition,
        'HUTANG',
      )
      yPosition = this.getNextYPosition(doc, hutangAccounts, yPosition, 30)

      // TOTAL HUTANG
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL HUTANG', 70, yPosition)
      doc.text(formatCurrency(hutangTotal), 170, yPosition, {
        align: 'right',
      })
      yPosition += 15
    }

    // MODAL Section
    if (modalAccounts.length > 0) {
      yPosition += 5
      modalTotal = this.renderNeracaDetailSection(
        doc,
        modalAccounts,
        yPosition,
        'MODAL',
      )
      yPosition = this.getNextYPosition(doc, modalAccounts, yPosition, 30)

      // TOTAL MODAL
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL MODAL', 70, yPosition)
      doc.text(formatCurrency(modalTotal), 170, yPosition, {
        align: 'right',
      })
      yPosition += 10

      // TOTAL PASIVA (HUTANG + MODAL)
      const totalPasiva = hutangTotal + modalTotal
      doc.text('TOTAL PASIVA', 70, yPosition)
      doc.text(formatCurrency(totalPasiva), 170, yPosition, {
        align: 'right',
      })
      yPosition += 20
    }

    // Footer signature section
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 30
    } else {
      yPosition += 20
    }

    // Date and location
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${REPORT.LOKASI}, ${formattedDate}`, 140, yPosition)
    yPosition += 15

    // Signature titles
    doc.setFont('helvetica', 'bold')
    doc.text('Ketua', 60, yPosition, { align: 'center' })
    doc.text('Bendahara', 140, yPosition, { align: 'center' })
    yPosition += 40

    // Signature lines
    doc.setLineWidth(0.5)
    doc.line(30, yPosition, 90, yPosition)
    doc.line(110, yPosition, 170, yPosition)
    yPosition += 10

    // Names
    doc.setFont('helvetica', 'normal')
    doc.text(REPORT.NAMA_KETUA, 60, yPosition, { align: 'center' })
    doc.text(REPORT.NAMA_BENDAHARA, 140, yPosition, { align: 'center' })
  },

  /**
   * Generate Penjelasan Neraca PDF - comprehensive neraca combining general and detail accounts
   */
  async generatePenjelasanNeracaPDF(
    formattedDate: string,
    doc: any,
    data: ReportData,
    _options: ReportGenerationOptions,
  ): Promise<void> {
    // Header - Company Info
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(REPORT.JENIS_USAHA, 105, 20, { align: 'center' })
    doc.text(REPORT.NAMA_USAHA, 105, 30, { align: 'center' })

    // Title
    doc.setFontSize(14)
    doc.text('PENJELASAN NERACA', 105, 45, { align: 'center' })

    // Date
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`s.d Tanggal ${formattedDate}`, 105, 55, { align: 'center' })

    // Column headers
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('REKENING', 20, 75)
    doc.text('URAIAN', 70, 75)
    doc.text('TOTAL', 170, 75, { align: 'right' })

    // Draw line under headers
    doc.setLineWidth(0.5)
    doc.line(20, 78, 190, 78)

    let yPosition = 90

    // Create hierarchical account structure
    const hierarchicalAccounts = createHierarchicalAccountList(data)
    const standaloneDetails = getStandaloneDetailAccounts(data)

    // Group accounts by category
    const aktivaAccounts: HierarchicalAccount[] = []
    const hutangAccounts: HierarchicalAccount[] = []
    const modalAccounts: HierarchicalAccount[] = []

    hierarchicalAccounts.forEach((account) => {
      switch (account.general.accountCategory) {
        case 'ASSET':
          aktivaAccounts.push(account)
          break
        case 'HUTANG':
          hutangAccounts.push(account)
          break
        case 'MODAL':
          modalAccounts.push(account)
          break
      }
    })

    let totalAktiva = 0
    let totalHutang = 0
    let totalModal = 0

    // AKTIVA Section
    if (aktivaAccounts.length > 0) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('AKTIVA', 20, yPosition)
      yPosition += 10

      const result = this.renderPenjelasanNeracaSection(
        doc,
        aktivaAccounts,
        yPosition,
        'AKTIVA',
      )
      totalAktiva = result.total
      yPosition = result.yPosition

      // TOTAL AKTIVA
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL AKTIVA', 70, yPosition)
      doc.text(formatCurrency(totalAktiva), 170, yPosition, {
        align: 'right',
      })
      yPosition += 15
    }

    // HUTANG Section
    if (hutangAccounts.length > 0) {
      yPosition += 5
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('HUTANG', 20, yPosition)
      yPosition += 10

      const result = this.renderPenjelasanNeracaSection(
        doc,
        hutangAccounts,
        yPosition,
        'HUTANG',
      )
      totalHutang = result.total
      yPosition = result.yPosition

      // TOTAL HUTANG
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL HUTANG', 70, yPosition)
      doc.text(formatCurrency(totalHutang), 170, yPosition, {
        align: 'right',
      })
      yPosition += 15
    }

    // MODAL Section
    if (modalAccounts.length > 0) {
      yPosition += 5
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('MODAL', 20, yPosition)
      yPosition += 10

      const result = this.renderPenjelasanNeracaSection(
        doc,
        modalAccounts,
        yPosition,
        'MODAL',
      )
      totalModal = result.total
      yPosition = result.yPosition

      // TOTAL MODAL
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL MODAL', 70, yPosition)
      doc.text(formatCurrency(totalModal), 170, yPosition, {
        align: 'right',
      })
      yPosition += 10

      // TOTAL PASIVA
      const totalPasiva = totalHutang + totalModal
      doc.text('TOTAL PASIVA', 70, yPosition)
      doc.text(formatCurrency(totalPasiva), 170, yPosition, {
        align: 'right',
      })
      yPosition += 20
    }

    // Add standalone detail accounts if any
    if (standaloneDetails.length > 0) {
      yPosition += 10
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      standaloneDetails.forEach((detail) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 30
        }

        doc.text(detail.accountNumber, 25, yPosition)
        doc.text(detail.accountName, 70, yPosition)

        const balance =
          detail.accountCategory === 'ASSET'
            ? detail.amountDebit - detail.amountCredit
            : detail.amountCredit - detail.amountDebit

        doc.text(formatCurrency(balance), 170, yPosition, {
          align: 'right',
        })
        yPosition += 8
      })
    }

    // Footer signature section
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 30
    } else {
      yPosition += 20
    }

    // Date and location
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${REPORT.LOKASI}, ${formattedDate}`, 140, yPosition)
    yPosition += 15

    // Signature titles
    doc.setFont('helvetica', 'bold')
    doc.text('NAMA KETUA', 60, yPosition, { align: 'center' })
    doc.text('NAMA BENDAHARA', 140, yPosition, { align: 'center' })
    yPosition += 40

    // Signature lines
    doc.setLineWidth(0.5)
    doc.line(30, yPosition, 90, yPosition)
    doc.line(110, yPosition, 170, yPosition)
    yPosition += 10

    // Names
    doc.setFont('helvetica', 'normal')
    doc.text(REPORT.NAMA_KETUA, 60, yPosition, { align: 'center' })
    doc.text(REPORT.NAMA_BENDAHARA, 140, yPosition, { align: 'center' })
  },

  /**
   * Render a section for penjelasan neraca with hierarchical accounts
   */
  renderPenjelasanNeracaSection(
    doc: any,
    accounts: HierarchicalAccount[],
    startY: number,
    sectionName: string,
  ): { yPosition: number; total: number } {
    let yPosition = startY
    let sectionTotal = 0

    accounts.forEach(({ general, details }) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 30
      }

      // Render general account (without amount - just as header)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')

      doc.text(general.accountNumber, 25, yPosition)
      doc.text(general.accountName, 70, yPosition)
      // No amount displayed for general accounts
      yPosition += 8

      let generalAccountTotal = 0

      // Render detail accounts if any
      if (details.length > 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)

        details.forEach((detail) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 30
          }

          // Indent detail accounts
          doc.text(detail.accountNumber, 35, yPosition)
          doc.text(detail.accountName, 80, yPosition)

          // Calculate balance for detail account
          let detailBalance = 0
          if (sectionName === 'AKTIVA') {
            detailBalance = detail.amountDebit - detail.amountCredit
          } else {
            // HUTANG or MODAL
            detailBalance = detail.amountCredit - detail.amountDebit
          }

          // Add to general account total
          generalAccountTotal += detailBalance
          doc.text(formatCurrency(detailBalance), 170, yPosition, {
            align: 'right',
          })
          yPosition += 7
        })

        // Show subtotal for this general account
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text(`TOTAL ${general.accountName.toUpperCase()}`, 80, yPosition)
        doc.text(formatCurrency(generalAccountTotal), 170, yPosition, {
          align: 'right',
        })
        yPosition += 10
      }

      // Add general account total to section total
      sectionTotal += generalAccountTotal
      yPosition += 3 // Small gap between account groups
    })

    return { yPosition: yPosition + 10, total: sectionTotal }
  },

  /**
   * Render a section for neraca detail (AKTIVA, HUTANG, or MODAL)
   */
  renderNeracaDetailSection(
    doc: any,
    accounts: (AccountGeneral | AccountDetail)[],
    startY: number,
    sectionName: string,
  ): number {
    let yPosition = startY
    let sectionTotal = 0

    accounts.forEach((account) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 30
      }

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')

      // Account number
      doc.text(account.accountNumber, 25, yPosition)

      // Account name
      doc.text(account.accountName, 70, yPosition)

      // Calculate balance based on section
      let balance = 0
      if (sectionName === 'AKTIVA') {
        balance = account.amountDebit - account.amountCredit
      } else {
        // HUTANG or MODAL
        balance = account.amountCredit - account.amountDebit
      }

      sectionTotal += balance

      // Amount (right-aligned)
      doc.text(formatCurrency(balance), 170, yPosition, { align: 'right' })

      yPosition += 8
    })

    return sectionTotal
  },

  /**
   * Calculate next Y position after rendering accounts
   */
  getNextYPosition(
    doc: any,
    accounts: (AccountGeneral | AccountDetail)[],
    startY: number,
    baseSpacing: number,
  ): number {
    const yPosition = startY + accounts.length * 8 + baseSpacing

    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage()
      return 30
    }

    return yPosition
  },

  /**
   * Generate standard PDF format
   */
  async generateStandardPDF(
    doc: any,
    data: ReportData,
    options: ReportGenerationOptions,
  ): Promise<void> {
    // Add title
    doc.setFontSize(20)
    doc.text('Account Report', 20, 30)

    // Add generation info
    doc.setFontSize(12)
    doc.text(`Generated: ${formatDateTime(data.generatedAt)}`, 20, 50)
    doc.text(`Total Records: ${data.totalRecords}`, 20, 60)

    let yPosition = 80

    // Continue with standard PDF format logic...
    // Check if this is a complete report (both general and detail)
    if (
      options.includeGeneral &&
      options.includeDetail &&
      data.accountGeneral &&
      data.accountDetail
    ) {
      // Generate hierarchical report
      const hierarchicalAccounts = createHierarchicalAccountList(data)
      const standaloneDetails = getStandaloneDetailAccounts(data)

      doc.setFontSize(16)
      doc.text('Complete Account Report', 20, yPosition)
      yPosition += 15

      // Render hierarchical accounts
      hierarchicalAccounts.forEach(({ general, details }) => {
        // Check if we need a new page
        if (yPosition > 260) {
          doc.addPage()
          yPosition = 20
        }

        // General Account
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(
          `${general.accountNumber} ${general.accountName}`,
          20,
          yPosition,
        )

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Category: ${general.accountCategory} | Type: ${general.reportType} | Debit: ${formatCurrency(general.amountDebit)} | Credit: ${formatCurrency(general.amountCredit)}`,
          25,
          yPosition + 8,
        )
        yPosition += 20

        // Detail Accounts
        details.forEach((detail) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `  └─ ${detail.accountNumber} ${detail.accountName}`,
            30,
            yPosition,
          )

          doc.setFontSize(8)
          doc.text(
            `     Category: ${detail.accountCategory} | Debit: ${formatCurrency(detail.amountDebit)} | Credit: ${formatCurrency(detail.amountCredit)}`,
            35,
            yPosition + 6,
          )
          yPosition += 15
        })

        yPosition += 5
      })

      // Add standalone detail accounts if any
      if (standaloneDetails.length > 0) {
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Standalone Detail Accounts', 20, yPosition)
        yPosition += 15

        standaloneDetails.forEach((detail) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `${detail.accountNumber} ${detail.accountName}`,
            20,
            yPosition,
          )

          doc.setFontSize(8)
          doc.text(
            `Category: ${detail.accountCategory} | General: ${detail.accountGeneral?.accountName || 'N/A'} | Debit: ${formatCurrency(detail.amountDebit)} | Credit: ${formatCurrency(detail.amountCredit)}`,
            25,
            yPosition + 6,
          )
          yPosition += 15
        })
      }
    } else if (options.includeGeneral && data.accountGeneral) {
      // General Accounts only
      doc.setFontSize(16)
      doc.text('General Accounts', 20, yPosition)
      yPosition += 15

      data.accountGeneral
        .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
        .forEach((account) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text(
            `${account.accountNumber} ${account.accountName}`,
            20,
            yPosition,
          )

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `Category: ${account.accountCategory} | Type: ${account.reportType} | Debit: ${formatCurrency(account.amountDebit)} | Credit: ${formatCurrency(account.amountCredit)}`,
            25,
            yPosition + 8,
          )
          yPosition += 20
        })
    } else if (options.includeDetail && data.accountDetail) {
      // Detail Accounts only
      doc.setFontSize(16)
      doc.text('Detail Accounts', 20, yPosition)
      yPosition += 15

      data.accountDetail
        .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
        .forEach((account) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text(
            `${account.accountNumber} ${account.accountName}`,
            20,
            yPosition,
          )

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.text(
            `Category: ${account.accountCategory} | General: ${account.accountGeneral?.accountName || 'N/A'} | Debit: ${formatCurrency(account.amountDebit)} | Credit: ${formatCurrency(account.amountCredit)}`,
            25,
            yPosition + 8,
          )
          yPosition += 20
        })
    }
  },

  /**
   * Generate XLSX report
   */
  async generateXLSX(
    data: ReportData,
    options: ReportGenerationOptions,
  ): Promise<void> {
    const workbook = XLSX.utils.book_new()
    const fileName =
      options.fileName ||
      `account_report_${new Date().toISOString().split('T')[0]}.xlsx`

    // Check if this is a Neraca report and format accordingly
    if (options.fileName?.includes('neraca')) {
      if (options.fileName.includes('penjelasan-neraca')) {
        this.generatePenjelasanNeracaXLSX(workbook, data, options)
      } else {
        this.generateNeracaXLSX(workbook, data, options)
      }
    } else {
      this.generateStandardXLSX(workbook, data, options)
    }

    // Save the file
    XLSX.writeFile(workbook, fileName)
  },

  /**
   * Generate Neraca-formatted XLSX (Balance Sheet)
   */
  generateNeracaXLSX(
    workbook: any,
    data: ReportData,
    _options: ReportGenerationOptions,
  ): void {
    const neracaData: any[] = []

    // Header rows
    neracaData.push({ Account: REPORT.JENIS_USAHA, Balance: '' })
    neracaData.push({ Account: REPORT.NAMA_USAHA, Balance: '' })
    neracaData.push({ Account: 'NERACA', Balance: '' })
    neracaData.push({
      Account: `s/d Tanggal ${formatDate(new Date())}`,
      Balance: '',
    })
    neracaData.push({ Account: '', Balance: '' })
    neracaData.push({
      Account: 'REKENING - REKENING',
      Balance: 'SALDO AKUMULASI',
    })
    neracaData.push({ Account: '', Balance: '' })

    // AKTIVA Section
    const aktivaAccounts = this.getAccountsByCategory(data, ['ASSET'])
    if (aktivaAccounts.length > 0) {
      neracaData.push({ Account: '1  AKTIVA', Balance: '' })

      let aktivaTotal = 0
      const aktivaCategorized = new Map<
        string,
        (AccountGeneral | AccountDetail)[]
      >()

      aktivaAccounts.forEach((account) => {
        if (!aktivaCategorized.has(account.accountCategory)) {
          aktivaCategorized.set(account.accountCategory, [])
        }
        aktivaCategorized.get(account.accountCategory)!.push(account)
      })

      aktivaCategorized.forEach((categoryAccounts, _category) => {
        neracaData.push({ Account: `   10  AKTIVA LANCAR`, Balance: '' })

        categoryAccounts.forEach((account) => {
          const balance = account.amountDebit - account.amountCredit // Assets have debit normal balance
          aktivaTotal += balance
          neracaData.push({
            Account: `      ${account.accountNumber}  ${account.accountName}`,
            Balance: formatCurrency(balance),
          })
        })
      })

      neracaData.push({
        Account: '   TOTAL AKTIVA',
        Balance: formatCurrency(aktivaTotal),
      })
      neracaData.push({ Account: '', Balance: '' })
    }

    // PASIVA Section
    const pasivaAccounts = this.getAccountsByCategory(data, ['HUTANG', 'MODAL'])
    if (pasivaAccounts.length > 0) {
      neracaData.push({ Account: '2  PASIVA', Balance: '' })

      let pasivaTotal = 0
      const pasivaCategorized = new Map<
        string,
        (AccountGeneral | AccountDetail)[]
      >()

      pasivaAccounts.forEach((account) => {
        if (!pasivaCategorized.has(account.accountCategory)) {
          pasivaCategorized.set(account.accountCategory, [])
        }
        pasivaCategorized.get(account.accountCategory)!.push(account)
      })

      pasivaCategorized.forEach((categoryAccounts, category) => {
        const categoryNumber = category === 'HUTANG' ? '20' : '30'
        neracaData.push({
          Account: `   ${categoryNumber}  ${category}`,
          Balance: '',
        })

        categoryAccounts.forEach((account) => {
          const balance = account.amountCredit - account.amountDebit // Liabilities & Equity have credit normal balance
          pasivaTotal += balance
          neracaData.push({
            Account: `      ${account.accountNumber}  ${account.accountName}`,
            Balance: formatCurrency(balance),
          })
        })
      })

      neracaData.push({
        Account: '   TOTAL PASIVA',
        Balance: formatCurrency(pasivaTotal),
      })
    }

    const neracaWorksheet = XLSX.utils.json_to_sheet(neracaData)
    XLSX.utils.book_append_sheet(workbook, neracaWorksheet, 'Neraca')
  },

  /**
   * Generate Penjelasan Neraca XLSX (Comprehensive Balance Sheet)
   */
  generatePenjelasanNeracaXLSX(
    workbook: any,
    data: ReportData,
    _options: ReportGenerationOptions,
  ): void {
    const penjelasanNeracaData: any[] = []

    // Header rows
    penjelasanNeracaData.push({
      Account: REPORT.JENIS_USAHA,
      Description: '',
      Balance: '',
    })
    penjelasanNeracaData.push({
      Account: REPORT.NAMA_USAHA,
      Description: '',
      Balance: '',
    })
    penjelasanNeracaData.push({
      Account: 'PENJELASAN NERACA',
      Description: '',
      Balance: '',
    })
    penjelasanNeracaData.push({
      Account: `s.d Tanggal ${formatDate(new Date())}`,
      Description: '',
      Balance: '',
    })
    penjelasanNeracaData.push({ Account: '', Description: '', Balance: '' })
    penjelasanNeracaData.push({
      Account: 'REKENING',
      Description: 'URAIAN',
      Balance: 'TOTAL',
    })
    penjelasanNeracaData.push({ Account: '', Description: '', Balance: '' })

    // Create hierarchical account structure
    const hierarchicalAccounts = createHierarchicalAccountList(data)
    const standaloneDetails = getStandaloneDetailAccounts(data)

    // Group accounts by category
    const aktivaAccounts: HierarchicalAccount[] = []
    const hutangAccounts: HierarchicalAccount[] = []
    const modalAccounts: HierarchicalAccount[] = []

    hierarchicalAccounts.forEach((account) => {
      switch (account.general.accountCategory) {
        case 'ASSET':
          aktivaAccounts.push(account)
          break
        case 'HUTANG':
          hutangAccounts.push(account)
          break
        case 'MODAL':
          modalAccounts.push(account)
          break
      }
    })

    let totalAktiva = 0
    let totalHutang = 0
    let totalModal = 0

    // AKTIVA Section
    if (aktivaAccounts.length > 0) {
      penjelasanNeracaData.push({
        Account: 'AKTIVA',
        Description: '',
        Balance: '',
      })

      aktivaAccounts.forEach(({ general, details }) => {
        // General account (no amount - just header)
        penjelasanNeracaData.push({
          Account: general.accountNumber,
          Description: general.accountName,
          Balance: '',
        })

        let generalAccountTotal = 0

        // Detail accounts (only these have amounts)
        details.forEach((detail) => {
          const detailBalance = detail.amountDebit - detail.amountCredit
          generalAccountTotal += detailBalance

          penjelasanNeracaData.push({
            Account: `  ${detail.accountNumber}`,
            Description: `  ${detail.accountName}`,
            Balance: formatCurrency(detailBalance),
          })
        })

        // Add subtotal for this general account
        if (details.length > 0) {
          penjelasanNeracaData.push({
            Account: '',
            Description: `TOTAL ${general.accountName.toUpperCase()}`,
            Balance: formatCurrency(generalAccountTotal),
          })
        }

        // Add to section total
        totalAktiva += generalAccountTotal
      })

      penjelasanNeracaData.push({
        Account: '',
        Description: 'TOTAL AKTIVA',
        Balance: formatCurrency(totalAktiva),
      })
      penjelasanNeracaData.push({ Account: '', Description: '', Balance: '' })
    }

    // HUTANG Section
    if (hutangAccounts.length > 0) {
      penjelasanNeracaData.push({
        Account: 'HUTANG',
        Description: '',
        Balance: '',
      })

      hutangAccounts.forEach(({ general, details }) => {
        // General account (no amount - just header)
        penjelasanNeracaData.push({
          Account: general.accountNumber,
          Description: general.accountName,
          Balance: '',
        })

        let generalAccountTotal = 0

        // Detail accounts (only these have amounts)
        details.forEach((detail) => {
          const detailBalance = detail.amountCredit - detail.amountDebit
          generalAccountTotal += detailBalance

          penjelasanNeracaData.push({
            Account: `  ${detail.accountNumber}`,
            Description: `  ${detail.accountName}`,
            Balance: formatCurrency(detailBalance),
          })
        })

        // Add subtotal for this general account
        if (details.length > 0) {
          penjelasanNeracaData.push({
            Account: '',
            Description: `TOTAL ${general.accountName.toUpperCase()}`,
            Balance: formatCurrency(generalAccountTotal),
          })
        }

        // Add to section total
        totalHutang += generalAccountTotal
      })

      penjelasanNeracaData.push({
        Account: '',
        Description: 'TOTAL HUTANG',
        Balance: formatCurrency(totalHutang),
      })
      penjelasanNeracaData.push({ Account: '', Description: '', Balance: '' })
    }

    // MODAL Section
    if (modalAccounts.length > 0) {
      penjelasanNeracaData.push({
        Account: 'MODAL',
        Description: '',
        Balance: '',
      })

      modalAccounts.forEach(({ general, details }) => {
        // General account (no amount - just header)
        penjelasanNeracaData.push({
          Account: general.accountNumber,
          Description: general.accountName,
          Balance: '',
        })

        let generalAccountTotal = 0

        // Detail accounts (only these have amounts)
        details.forEach((detail) => {
          const detailBalance = detail.amountCredit - detail.amountDebit
          generalAccountTotal += detailBalance

          penjelasanNeracaData.push({
            Account: `  ${detail.accountNumber}`,
            Description: `  ${detail.accountName}`,
            Balance: formatCurrency(detailBalance),
          })
        })

        // Add subtotal for this general account
        if (details.length > 0) {
          penjelasanNeracaData.push({
            Account: '',
            Description: `TOTAL ${general.accountName.toUpperCase()}`,
            Balance: formatCurrency(generalAccountTotal),
          })
        }

        // Add to section total
        totalModal += generalAccountTotal
      })

      penjelasanNeracaData.push({
        Account: '',
        Description: 'TOTAL MODAL',
        Balance: formatCurrency(totalModal),
      })
      penjelasanNeracaData.push({
        Account: '',
        Description: 'TOTAL PASIVA',
        Balance: formatCurrency(totalHutang + totalModal),
      })
    }

    // Add standalone detail accounts if any
    if (standaloneDetails.length > 0) {
      penjelasanNeracaData.push({ Account: '', Description: '', Balance: '' })
      penjelasanNeracaData.push({
        Account: 'STANDALONE ACCOUNTS',
        Description: '',
        Balance: '',
      })

      standaloneDetails.forEach((detail) => {
        const balance =
          detail.accountCategory === 'ASSET'
            ? detail.amountDebit - detail.amountCredit
            : detail.amountCredit - detail.amountDebit

        penjelasanNeracaData.push({
          Account: detail.accountNumber,
          Description: detail.accountName,
          Balance: formatCurrency(balance),
        })
      })
    }

    const penjelasanNeracaWorksheet =
      XLSX.utils.json_to_sheet(penjelasanNeracaData)
    XLSX.utils.book_append_sheet(
      workbook,
      penjelasanNeracaWorksheet,
      'Penjelasan Neraca',
    )
  },

  /**
   * Generate standard XLSX format
   */
  generateStandardXLSX(
    workbook: any,
    data: ReportData,
    options: ReportGenerationOptions,
  ): void {
    // Check if this is a complete report (both general and detail)
    if (
      options.includeGeneral &&
      options.includeDetail &&
      data.accountGeneral &&
      data.accountDetail
    ) {
      // Generate hierarchical worksheet
      const hierarchicalAccounts = createHierarchicalAccountList(data)
      const standaloneDetails = getStandaloneDetailAccounts(data)

      const hierarchicalData: any[] = []

      // Add hierarchical accounts
      hierarchicalAccounts.forEach(({ general, details }) => {
        // Add general account
        hierarchicalData.push({
          Level: 'GENERAL',
          'Account Number': general.accountNumber,
          'Account Name': general.accountName,
          Category: general.accountCategory,
          'Report Type': general.reportType,
          'Transaction Type': general.transactionType,
          'General Account': '-',
          'Debit Amount': general.amountDebit,
          'Credit Amount': general.amountCredit,
          'Created At': formatDate(general.createdAt),
          'Updated At': formatDate(general.updatedAt),
        })

        // Add detail accounts under this general account
        details.forEach((detail) => {
          hierarchicalData.push({
            Level: 'DETAIL',
            'Account Number': `  ${detail.accountNumber}`, // Indented with spaces
            'Account Name': `  ${detail.accountName}`, // Indented with spaces
            Category: detail.accountCategory,
            'Report Type': detail.reportType,
            'Transaction Type': detail.transactionType,
            'General Account': detail.accountGeneral?.accountName || 'N/A',
            'Debit Amount': detail.amountDebit,
            'Credit Amount': detail.amountCredit,
            'Created At': formatDate(detail.createdAt),
            'Updated At': formatDate(detail.updatedAt),
          })
        })

        // Add empty row for separation
        hierarchicalData.push({
          Level: '',
          'Account Number': '',
          'Account Name': '',
          Category: '',
          'Report Type': '',
          'Transaction Type': '',
          'General Account': '',
          'Debit Amount': '',
          'Credit Amount': '',
          'Created At': '',
          'Updated At': '',
        })
      })

      // Add standalone detail accounts if any
      if (standaloneDetails.length > 0) {
        hierarchicalData.push({
          Level: 'SECTION',
          'Account Number': 'STANDALONE DETAIL ACCOUNTS',
          'Account Name': '',
          Category: '',
          'Report Type': '',
          'Transaction Type': '',
          'General Account': '',
          'Debit Amount': '',
          'Credit Amount': '',
          'Created At': '',
          'Updated At': '',
        })

        standaloneDetails.forEach((detail) => {
          hierarchicalData.push({
            Level: 'DETAIL',
            'Account Number': detail.accountNumber,
            'Account Name': detail.accountName,
            Category: detail.accountCategory,
            'Report Type': detail.reportType,
            'Transaction Type': detail.transactionType,
            'General Account': detail.accountGeneral?.accountName || 'N/A',
            'Debit Amount': detail.amountDebit,
            'Credit Amount': detail.amountCredit,
            'Created At': formatDate(detail.createdAt),
            'Updated At': formatDate(detail.updatedAt),
          })
        })
      }

      const hierarchicalWorksheet = XLSX.utils.json_to_sheet(hierarchicalData)
      XLSX.utils.book_append_sheet(
        workbook,
        hierarchicalWorksheet,
        'Hierarchical Report',
      )
    } else if (options.includeGeneral && data.accountGeneral) {
      // General Accounts only
      const generalData = data.accountGeneral
        .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
        .map((account) => ({
          'Account Number': account.accountNumber,
          'Account Name': account.accountName,
          Category: account.accountCategory,
          'Report Type': account.reportType,
          'Transaction Type': account.transactionType,
          'Debit Amount': account.amountDebit,
          'Credit Amount': account.amountCredit,
          'Created At': formatDate(account.createdAt),
          'Updated At': formatDate(account.updatedAt),
        }))

      const generalWorksheet = XLSX.utils.json_to_sheet(generalData)
      XLSX.utils.book_append_sheet(
        workbook,
        generalWorksheet,
        'General Accounts',
      )
    } else if (options.includeDetail && data.accountDetail) {
      // Detail Accounts only
      const detailData = data.accountDetail
        .sort((a, b) => a.accountNumber.localeCompare(b.accountNumber))
        .map((account) => ({
          'Account Number': account.accountNumber,
          'Account Name': account.accountName,
          Category: account.accountCategory,
          'Report Type': account.reportType,
          'Transaction Type': account.transactionType,
          'General Account Number': account.accountGeneralAccountNumber,
          'General Account Name': account.accountGeneral?.accountName || 'N/A',
          'Debit Amount': account.amountDebit,
          'Credit Amount': account.amountCredit,
          'Created At': formatDate(account.createdAt),
          'Updated At': formatDate(account.updatedAt),
        }))

      const detailWorksheet = XLSX.utils.json_to_sheet(detailData)
      XLSX.utils.book_append_sheet(workbook, detailWorksheet, 'Detail Accounts')
    }

    // Create summary worksheet
    const summaryData = [
      {
        Field: 'Report Generated',
        Value: formatDateTime(data.generatedAt),
      },
      {
        Field: 'Total General Accounts',
        Value: data.accountGeneral?.length || 0,
      },
      {
        Field: 'Total Detail Accounts',
        Value: data.accountDetail?.length || 0,
      },
      { Field: 'Total Records', Value: data.totalRecords },
    ]

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary')
  },

  /**
   * Generate NERACA report based on type and options
   */
  async generateReportByType(
    reportType: NeracaReportType,
    options: ReportGenerationOptions,
  ): Promise<void> {
    try {
      const data = await this.fetchNeracaAccountData(reportType)

      if (options.format === 'pdf') {
        await this.generatePDF(data, options)
      } else if (options.format === 'xlsx') {
        await this.generateXLSX(data, options)
      }
    } catch (error) {
      throw new Error(
        'Failed to generate NERACA report: ' + (error as Error).message,
      )
    }
  },

  /**
   * View NERACA report in new tab (PDF only)
   */
  async viewReportByTypeInNewTab(
    reportType: NeracaReportType,
    options: ReportGenerationOptions,
  ): Promise<void> {
    try {
      const data = await this.fetchNeracaAccountData(reportType)

      if (options.format === 'pdf') {
        await this.viewPDFInNewTab(data, options)
      } else {
        throw new Error('View in new tab is only supported for PDF format')
      }
    } catch (error) {
      throw new Error(
        'Failed to view NERACA report: ' + (error as Error).message,
      )
    }
  },

  /**
   * Generate report based on options (legacy method for backward compatibility)
   */
  async generateReport(options: ReportGenerationOptions): Promise<void> {
    try {
      const data = await this.fetchAllAccountData()

      if (options.format === 'pdf') {
        await this.generatePDF(data, options)
      } else if (options.format === 'xlsx') {
        await this.generateXLSX(data, options)
      }
    } catch (error) {
      throw new Error('Failed to generate report: ' + (error as Error).message)
    }
  },

  /**
   * Helper method to get accounts by category for Neraca formatting
   */
  getAccountsByCategory(
    data: ReportData,
    categories: string[],
  ): (AccountGeneral | AccountDetail)[] {
    const accounts: (AccountGeneral | AccountDetail)[] = []

    if (data.accountGeneral) {
      accounts.push(
        ...data.accountGeneral.filter((acc) =>
          categories.includes(acc.accountCategory),
        ),
      )
    }

    if (data.accountDetail) {
      accounts.push(
        ...data.accountDetail.filter((acc) =>
          categories.includes(acc.accountCategory),
        ),
      )
    }

    return accounts.sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber),
    )
  },

  /**
   * Helper method to render a section of accounts in the PDF
   */
  renderAccountSection(
    doc: any,
    accounts: (AccountGeneral | AccountDetail)[],
    startY: number,
    indentLevel: number,
  ): { yPosition: number; total: number } {
    let yPosition = startY
    let total = 0

    // Group by category for sub-sections
    const categorizedAccounts = new Map<
      string,
      (AccountGeneral | AccountDetail)[]
    >()

    accounts.forEach((account) => {
      if (!categorizedAccounts.has(account.accountCategory)) {
        categorizedAccounts.set(account.accountCategory, [])
      }
      categorizedAccounts.get(account.accountCategory)!.push(account)
    })

    // Define category order and numbering
    const categoryInfo: Record<string, { name: string; number: string }> = {
      ASSET: { name: 'AKTIVA LANCAR', number: '10' },
      HUTANG: { name: 'HUTANG', number: '20' },
      MODAL: { name: 'MODAL', number: '30' },
    }

    categorizedAccounts.forEach((categoryAccounts, category) => {
      if (yPosition > 260) {
        doc.addPage()
        yPosition = 30
      }

      // Category header with subtle background
      const catInfo = categoryInfo[category] || { name: category, number: '' }
      doc.setFillColor(250, 250, 250) // Very light gray background
      doc.rect(indentLevel - 20, yPosition - 6, 180, 10, 'F')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50) // Dark gray text
      doc.text(catInfo.name, indentLevel, yPosition)
      if (catInfo.number) {
        doc.text(catInfo.number, indentLevel - 15, yPosition)
      }
      yPosition += 8

      // Render accounts in this category
      categoryAccounts.forEach((account, index) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 30
        }

        // Alternating row background for better readability
        if (index % 2 === 1) {
          doc.setFillColor(252, 252, 252) // Very light alternating background
          doc.rect(indentLevel, yPosition - 4, 160, 8, 'F')
        }

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0) // Reset to black text

        // Position account number first
        doc.text(account.accountNumber, indentLevel + 5, yPosition)

        // Position account name with sufficient spacing to avoid overlap
        doc.text(account.accountName, indentLevel + 35, yPosition)

        // Calculate balance based on account category's normal balance:
        // ASSET (AKTIVA): Normal debit balance → balance = debit - credit
        // HUTANG (Liabilities): Normal credit balance → balance = credit - debit
        // MODAL (Equity): Normal credit balance → balance = credit - debit
        const balance =
          account.accountCategory === 'ASSET'
            ? account.amountDebit - account.amountCredit
            : account.amountCredit - account.amountDebit
        total += balance

        // Right-align the currency amount
        doc.setTextColor(0, 0, 100) // Dark blue for amounts
        doc.text(formatCurrency(balance), 170, yPosition, {
          align: 'right',
        })
        doc.setTextColor(0, 0, 0) // Reset to black
        yPosition += 6
      })

      yPosition += 8 // Extra space after category

      // Add a subtle line separator after each category
      doc.setLineWidth(0.3)
      doc.setDrawColor(200, 200, 200) // Light gray line
      doc.line(indentLevel, yPosition - 3, 180, yPosition - 3)
      doc.setDrawColor(0, 0, 0) // Reset to black
    })

    return { yPosition, total }
  },
}
