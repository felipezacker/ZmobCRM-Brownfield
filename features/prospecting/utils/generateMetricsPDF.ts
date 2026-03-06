/**
 * PDF generation for prospecting metrics (CP-2.4)
 *
 * Uses jsPDF + jspdf-autotable (already in package.json).
 * Pure client-side generation — no server dependency.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number }
}
import type { ProspectingMetrics, BrokerMetric, PeriodRange } from '../hooks/useProspectingMetrics'
import { formatDuration } from './formatDuration'

interface GeneratePdfOptions {
  metrics: ProspectingMetrics | null
  activities: unknown[]
  brokers: BrokerMetric[]
  range: PeriodRange
  isAdminOrDirector: boolean
  organizationName: string
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export async function generateMetricsPDF(options: GeneratePdfOptions) {
  const { metrics, brokers, range, isAdminOrDirector, organizationName } = options

  if (!metrics) throw new Error('Métricas não disponíveis')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 15

  // ========================================
  // Header
  // ========================================
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(organizationName, 14, y)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Relatório de Prospecção', 14, y + 8)

  doc.setFontSize(9)
  doc.text(
    `Periodo: ${formatDate(range.start)} - ${formatDate(range.end)}`,
    14,
    y + 15,
  )

  const now = new Date()
  const generatedAt = `Gerado em ${now.toLocaleDateString('pt-BR')} as ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  doc.text(generatedAt, pageWidth - 14, y + 15, { align: 'right' })

  // Separator line
  y += 22
  doc.setDrawColor(200, 200, 200)
  doc.line(14, y, pageWidth - 14, y)
  y += 8

  // ========================================
  // KPIs Section (2x3 grid)
  // ========================================
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('KPIs Resumidos', 14, y)
  y += 8

  const kpis = [
    { label: 'Ligações Discadas', value: String(metrics.totalCalls) },
    { label: 'Atendidas', value: String(metrics.connectedCalls) },
    { label: 'Sem Resposta', value: String(metrics.byOutcome.find(o => o.outcome === 'no_answer')?.count || 0) },
    { label: 'Correio de Voz', value: String(metrics.byOutcome.find(o => o.outcome === 'voicemail')?.count || 0) },
    { label: 'Tempo Médio', value: formatDuration(metrics.avgDuration) },
    { label: 'Contatos Prospectados', value: String(metrics.uniqueContacts) },
  ]

  const colWidth = (pageWidth - 28) / 3
  const rowHeight = 18

  kpis.forEach((kpi, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 14 + col * colWidth
    const yPos = y + row * rowHeight

    // Card background
    doc.setFillColor(245, 247, 250)
    doc.roundedRect(x, yPos, colWidth - 4, rowHeight - 3, 2, 2, 'F')

    // Label
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(kpi.label, x + 4, yPos + 5)

    // Value
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(kpi.value, x + 4, yPos + 12)
  })

  y += Math.ceil(kpis.length / 3) * rowHeight + 6

  // Connection rate summary
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(
    `Taxa de conexão: ${metrics.connectionRate.toFixed(1)}%`,
    14,
    y,
  )
  y += 10

  // ========================================
  // Daily Calls Table
  // ========================================
  if (metrics.byDay.length > 0) {
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Ligações por Dia', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Total', 'Atendidas', 'Sem Resp.', 'Caixa Postal', 'Ocupado']],
      body: metrics.byDay.map(d => [
        formatDate(d.date),
        String(d.total),
        String(d.connected),
        String(d.no_answer),
        String(d.voicemail),
        String(d.busy),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  // ========================================
  // Broker Ranking (admin/director only)
  // ========================================
  if (isAdminOrDirector && brokers.length > 0) {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage()
      y = 15
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Ranking de Corretores', 14, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['#', 'Corretor', 'Ligacoes', 'Atendidas', 'Taxa Conexao', 'Tempo Medio', 'Contatos']],
      body: brokers.map((b, i) => [
        String(i + 1),
        b.ownerName,
        String(b.totalCalls),
        String(b.connectedCalls),
        `${b.connectionRate.toFixed(0)}%`,
        formatDuration(b.avgDuration),
        String(b.uniqueContacts),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  // ========================================
  // Insights Section
  // ========================================
  const insights = generateTextInsights(metrics)
  if (insights.length > 0) {
    if (y > 250) {
      doc.addPage()
      y = 15
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Insights', 14, y)
    y += 7

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)

    for (const insight of insights) {
      if (y > 275) {
        doc.addPage()
        y = 15
      }
      doc.text(`• ${insight}`, 16, y)
      y += 5
    }
  }

  // ========================================
  // Footer
  // ========================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text(
      'Gerado pelo ZmobCRM',
      14,
      doc.internal.pageSize.getHeight() - 8,
    )
    doc.text(
      `Página ${i}/${totalPages}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' },
    )
  }

  // Save
  const filename = `prospeccao-${range.start}-a-${range.end}.pdf`
  doc.save(filename)
}

function generateTextInsights(metrics: ProspectingMetrics): string[] {
  const insights: string[] = []

  if (metrics.totalCalls >= 10 && metrics.connectionRate < 20) {
    insights.push(
      `Baixa taxa de resposta (${metrics.connectionRate.toFixed(0)}%). Considere revisar horários de ligação.`,
    )
  }

  if (metrics.totalCalls >= 10 && metrics.connectionRate >= 30) {
    insights.push(
      `Boa taxa de conexão (${metrics.connectionRate.toFixed(0)}%). Continue com essa estratégia.`,
    )
  }

  const noAnswer = metrics.byOutcome.find(o => o.outcome === 'no_answer')?.count || 0
  const noAnswerRate = metrics.totalCalls > 0 ? (noAnswer / metrics.totalCalls) * 100 : 0
  if (metrics.totalCalls >= 10 && noAnswerRate > 60) {
    insights.push(
      `Alto volume sem resposta (${noAnswerRate.toFixed(0)}%). Tente ligar em horários diferentes.`,
    )
  }

  if (metrics.byBroker.length >= 2) {
    const top = metrics.byBroker[0]
    if (top.totalCalls > 0) {
      insights.push(
        `${top.ownerName} lidera com ${top.totalCalls} ligações e ${top.connectionRate.toFixed(0)}% de conexão.`,
      )
    }
  }

  if (metrics.avgDuration > 0 && metrics.avgDuration < 30 && metrics.connectedCalls >= 5) {
    insights.push(
      `Tempo médio de ${Math.round(metrics.avgDuration)}s por ligação. Tente manter conversas mais longas.`,
    )
  }

  if (metrics.totalCalls < 10 && metrics.totalCalls > 0) {
    insights.push(
      `Apenas ${metrics.totalCalls} ligações no período. Aumente o volume para resultados consistentes.`,
    )
  }

  return insights
}
