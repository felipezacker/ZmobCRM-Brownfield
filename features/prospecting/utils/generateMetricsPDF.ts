/**
 * PDF generation for prospecting metrics (CP-2.4, CP-6.4)
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
  comparisonMetrics?: ProspectingMetrics
}

// ── Colors ──────────────────────────────────────────────────
type RGB = [number, number, number]

const COLORS: Record<string, RGB> = {
  primary: [59, 130, 246],     // blue-500
  emerald: [16, 185, 129],     // emerald-500
  red: [239, 68, 68],          // red-500
  amber: [245, 158, 11],       // amber-500
  violet: [139, 92, 246],      // violet-500
  teal: [20, 184, 166],        // teal-500
  gray: [100, 116, 139],       // slate-500
  lightBg: [248, 250, 252],    // slate-50
  cardBg: [241, 245, 249],     // slate-100
  text: [15, 23, 42],          // slate-900
  textMuted: [100, 116, 139],  // slate-500
  border: [226, 232, 240],     // slate-200
  green: [34, 197, 94],
  white: [255, 255, 255],
}

const KPI_COLORS: RGB[] = [COLORS.primary, COLORS.emerald, COLORS.red, COLORS.amber, COLORS.violet, COLORS.teal]

// ── Helpers ─────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return null // "Novo" case
  const d = ((current - previous) / previous) * 100
  return d
}

function formatDeltaText(current: number, previous: number, invertDirection = false): string {
  if (previous === 0 && current === 0) return ''
  if (previous === 0 && current > 0) return 'Novo'
  const delta = ((current - previous) / previous) * 100
  if (delta === 0) return '0%'
  const arrow = delta > 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(delta).toFixed(1)}%`
}

function isDeltaPositive(current: number, previous: number, invertDirection = false): boolean | null {
  if (previous === 0) return null
  const delta = ((current - previous) / previous) * 100
  if (delta === 0) return null
  return invertDirection ? delta < 0 : delta > 0
}

function periodLabel(range: PeriodRange): string {
  const start = new Date(range.start + 'T00:00:00')
  const end = new Date(range.end + 'T00:00:00')
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (days === 1) return '1 dia'
  return `${days} dias`
}

// ── Main ────────────────────────────────────────────────────
export async function generateMetricsPDF(options: GeneratePdfOptions) {
  const { metrics, brokers, range, isAdminOrDirector, organizationName, comparisonMetrics } = options

  if (!metrics) throw new Error('Métricas não disponíveis')

  const doc = new jsPDF()
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const margin = 14
  const contentWidth = pw - margin * 2
  let y = 0

  // ════════════════════════════════════════════
  // Header bar
  // ════════════════════════════════════════════
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pw, 28, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.white)
  doc.text(organizationName, margin, 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatório de Prospecção', margin, 20)

  const periodText = `${formatDate(range.start)} — ${formatDate(range.end)} (${periodLabel(range)})`
  doc.setFontSize(9)
  doc.text(periodText, pw - margin, 12, { align: 'right' })

  const now = new Date()
  doc.setFontSize(7)
  doc.text(
    `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    pw - margin, 20, { align: 'right' },
  )

  y = 36

  // ════════════════════════════════════════════
  // Summary line
  // ════════════════════════════════════════════
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.textMuted)

  const summaryParts = [
    `${metrics.totalCalls} ligações`,
    `${metrics.connectionRate.toFixed(1)}% taxa de conexão`,
    `${formatDuration(metrics.avgDuration)} tempo médio`,
    `${metrics.uniqueContacts} contatos`,
  ]
  doc.text(summaryParts.join('  ·  '), margin, y)
  y += 8

  // ════════════════════════════════════════════
  // KPI Cards (2x3 grid with colored left border)
  // ════════════════════════════════════════════
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Indicadores-Chave', margin, y)
  y += 6

  const noAnswer = metrics.byOutcome.find(o => o.outcome === 'no_answer')?.count || 0
  const voicemailCount = metrics.byOutcome.find(o => o.outcome === 'voicemail')?.count || 0
  const compNoAnswer = comparisonMetrics?.byOutcome?.find(o => o.outcome === 'no_answer')?.count ?? 0
  const compVoicemail = comparisonMetrics?.byOutcome?.find(o => o.outcome === 'voicemail')?.count ?? 0
  const connectionImproved = comparisonMetrics ? (metrics.connectionRate > comparisonMetrics.connectionRate) : false
  const total = metrics.totalCalls

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(0)}%` : ''

  const kpis = [
    { label: 'Ligações Discadas', value: String(total), sub: '', curr: total, prev: comparisonMetrics?.totalCalls ?? 0, invert: false },
    { label: 'Atendidas', value: String(metrics.connectedCalls), sub: pct(metrics.connectedCalls), curr: metrics.connectedCalls, prev: comparisonMetrics?.connectedCalls ?? 0, invert: false },
    { label: 'Sem Resposta', value: String(noAnswer), sub: pct(noAnswer), curr: noAnswer, prev: compNoAnswer, invert: true },
    { label: 'Correio de Voz', value: String(voicemailCount), sub: pct(voicemailCount), curr: voicemailCount, prev: compVoicemail, invert: true },
    { label: 'Tempo Médio', value: formatDuration(metrics.avgDuration), sub: metrics.connectedCalls > 0 ? 'por ligação' : '', curr: metrics.avgDuration, prev: comparisonMetrics?.avgDuration ?? 0, invert: !connectionImproved },
    { label: 'Contatos Únicos', value: String(metrics.uniqueContacts), sub: '', curr: metrics.uniqueContacts, prev: comparisonMetrics?.uniqueContacts ?? 0, invert: false },
  ]

  const cols = 3
  const colW = (contentWidth - (cols - 1) * 4) / cols
  const cardH = comparisonMetrics ? 24 : 20

  kpis.forEach((kpi, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = margin + col * (colW + 4)
    const yPos = y + row * (cardH + 4)

    // Card background
    doc.setFillColor(...COLORS.cardBg)
    doc.roundedRect(x, yPos, colW, cardH, 2, 2, 'F')

    // Colored left border
    const color = KPI_COLORS[i]
    doc.setFillColor(...color)
    doc.rect(x, yPos + 2, 2.5, cardH - 4, 'F')

    // Label
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textMuted)
    doc.text(kpi.label.toUpperCase(), x + 6, yPos + 5)

    // Value
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(kpi.value, x + 6, yPos + 13)

    // Subtitle (% of total)
    if (kpi.sub) {
      const valueW = doc.getTextWidth(kpi.value)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.textMuted)
      doc.text(kpi.sub, x + 6 + valueW + 2, yPos + 13)
    }

    // Delta
    if (comparisonMetrics) {
      const deltaText = formatDeltaText(kpi.curr, kpi.prev, kpi.invert)
      if (deltaText) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        const positive = isDeltaPositive(kpi.curr, kpi.prev, kpi.invert)
        if (positive === null) {
          doc.setTextColor(...COLORS.textMuted)
        } else if (positive) {
          doc.setTextColor(...COLORS.green)
        } else {
          doc.setTextColor(...COLORS.red)
        }
        doc.text(deltaText, x + 6, yPos + 19)
      }
    }
  })

  y += Math.ceil(kpis.length / cols) * (cardH + 4) + 4

  // ════════════════════════════════════════════
  // Outcome Distribution Bar
  // ════════════════════════════════════════════
  if (total > 0) {
    doc.setTextColor(...COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Distribuição de Resultados', margin, y)
    y += 5

    const barH = 8
    const segments = [
      { label: 'Atendidas', count: metrics.connectedCalls, color: COLORS.emerald },
      { label: 'Sem Resposta', count: noAnswer, color: COLORS.red },
      { label: 'Correio de Voz', count: voicemailCount, color: COLORS.amber },
      { label: 'Ocupado', count: metrics.byOutcome.find(o => o.outcome === 'busy')?.count || 0, color: COLORS.violet },
    ].filter(s => s.count > 0)

    // Bar
    let barX = margin
    segments.forEach(seg => {
      const w = (seg.count / total) * contentWidth
      doc.setFillColor(...seg.color)
      doc.roundedRect(barX, y, Math.max(w, 2), barH, 1, 1, 'F')
      barX += w
    })
    y += barH + 3

    // Legend
    let legendX = margin
    doc.setFontSize(6.5)
    segments.forEach(seg => {
      doc.setFillColor(...seg.color)
      doc.circle(legendX + 1.5, y, 1.5, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.textMuted)
      const label = `${seg.label} ${seg.count} (${((seg.count / total) * 100).toFixed(0)}%)`
      doc.text(label, legendX + 5, y + 1)
      legendX += doc.getTextWidth(label) + 12
    })
    y += 8
  }

  // ════════════════════════════════════════════
  // Comparison Summary Table (when comparison is active)
  // ════════════════════════════════════════════
  if (comparisonMetrics) {
    if (y > 230) { doc.addPage(); y = 15 }

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Comparativo com Período Anterior', margin, y)
    y += 2

    const compRows = kpis.map(kpi => {
      const deltaText = formatDeltaText(kpi.curr, kpi.prev, kpi.invert)
      return [kpi.label, kpi.value, kpi.prev === 0 && kpi.curr === 0 ? '0' : String(kpi.prev), deltaText || '—']
    })

    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Atual', 'Anterior', 'Variação']],
      body: compRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [...COLORS.primary], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        3: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const text = String(data.cell.raw)
          if (text.includes('↑')) {
            const kpi = kpis[data.row.index]
            const positive = isDeltaPositive(kpi.curr, kpi.prev, kpi.invert)
            if (positive) {
              data.cell.styles.textColor = COLORS.green
            } else {
              data.cell.styles.textColor = COLORS.red
            }
          } else if (text.includes('↓')) {
            const kpi = kpis[data.row.index]
            const positive = isDeltaPositive(kpi.curr, kpi.prev, kpi.invert)
            if (positive) {
              data.cell.styles.textColor = COLORS.green
            } else {
              data.cell.styles.textColor = COLORS.red
            }
          }
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  // ════════════════════════════════════════════
  // Daily Calls Table
  // ════════════════════════════════════════════
  if (metrics.byDay.length > 0) {
    if (y > 220) { doc.addPage(); y = 15 }

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ligações por Dia', margin, y)
    y += 2

    const bestDay = [...metrics.byDay].sort((a, b) => b.connected - a.connected)[0]

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Total', 'Atendidas', 'Sem Resp.', 'Caixa Postal', 'Ocupado', 'Taxa Cx.']],
      body: metrics.byDay.map(d => [
        formatDate(d.date),
        String(d.total),
        String(d.connected),
        String(d.no_answer),
        String(d.voicemail),
        String(d.busy),
        d.total > 0 ? `${((d.connected / d.total) * 100).toFixed(0)}%` : '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [...COLORS.primary], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        6: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && bestDay) {
          const rowDate = metrics.byDay[data.row.index]?.date
          if (rowDate === bestDay.date && data.column.index === 2) {
            data.cell.styles.textColor = COLORS.green
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  // ════════════════════════════════════════════
  // Broker Ranking (admin/director only)
  // ════════════════════════════════════════════
  if (isAdminOrDirector && brokers.length > 0) {
    if (y > 220) { doc.addPage(); y = 15 }

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ranking de Corretores', margin, y)
    y += 2

    autoTable(doc, {
      startY: y,
      head: [['#', 'Corretor', 'Ligações', 'Atendidas', 'Taxa Cx.', 'Tempo Médio', 'Contatos']],
      body: brokers.map((b, i) => [
        String(i + 1),
        b.ownerName,
        String(b.totalCalls),
        String(b.connectedCalls),
        `${b.connectionRate.toFixed(0)}%`,
        formatDuration(b.avgDuration),
        String(b.uniqueContacts),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [...COLORS.primary], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { fontStyle: 'bold' },
        4: { halign: 'center' },
        6: { halign: 'center' },
      },
      didParseCell: (data) => {
        // Highlight #1
        if (data.section === 'body' && data.row.index === 0) {
          if (data.column.index === 0) {
            data.cell.styles.textColor = COLORS.amber
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  // ════════════════════════════════════════════
  // Insights
  // ════════════════════════════════════════════
  const insights = generateTextInsights(metrics, comparisonMetrics)
  if (insights.length > 0) {
    if (y > 250) { doc.addPage(); y = 15 }

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Insights Automáticos', margin, y)
    y += 6

    // Insights box
    const boxPadding = 4
    const lineH = 5.5
    const boxH = insights.length * lineH + boxPadding * 2

    doc.setFillColor(...COLORS.lightBg)
    doc.setDrawColor(...COLORS.border)
    doc.roundedRect(margin, y - 2, contentWidth, boxH, 2, 2, 'FD')

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.text)

    insights.forEach((insight, i) => {
      if (y + i * lineH + boxPadding > ph - 20) {
        doc.addPage()
        y = 15
      }
      doc.text(`›  ${insight}`, margin + boxPadding + 1, y + boxPadding + i * lineH + 2)
    })

    y += boxH + 6
  }

  // ════════════════════════════════════════════
  // Footer (all pages)
  // ════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...COLORS.border)
    doc.line(margin, ph - 12, pw - margin, ph - 12)

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textMuted)
    doc.text('ZmobCRM · Relatório de Prospecção', margin, ph - 7)
    doc.text(`${formatDate(range.start)} — ${formatDate(range.end)}`, pw / 2, ph - 7, { align: 'center' })
    doc.text(`${i} / ${totalPages}`, pw - margin, ph - 7, { align: 'right' })
  }

  // Save
  const filename = `prospeccao-${range.start}-a-${range.end}.pdf`
  doc.save(filename)
}

// ── Insights Generator ──────────────────────────────────────
function generateTextInsights(metrics: ProspectingMetrics, comparisonMetrics?: ProspectingMetrics): string[] {
  const insights: string[] = []

  // Comparison insights first
  if (comparisonMetrics && comparisonMetrics.totalCalls > 0) {
    const callsDelta = ((metrics.totalCalls - comparisonMetrics.totalCalls) / comparisonMetrics.totalCalls) * 100
    if (Math.abs(callsDelta) >= 10) {
      insights.push(
        callsDelta > 0
          ? `Volume de ligações aumentou ${callsDelta.toFixed(0)}% em relação ao período anterior.`
          : `Volume de ligações caiu ${Math.abs(callsDelta).toFixed(0)}% em relação ao período anterior.`,
      )
    }

    if (comparisonMetrics.connectionRate > 0) {
      const rateDiff = metrics.connectionRate - comparisonMetrics.connectionRate
      if (Math.abs(rateDiff) >= 5) {
        insights.push(
          rateDiff > 0
            ? `Taxa de conexão melhorou ${rateDiff.toFixed(1)}pp (de ${comparisonMetrics.connectionRate.toFixed(0)}% para ${metrics.connectionRate.toFixed(0)}%).`
            : `Taxa de conexão piorou ${Math.abs(rateDiff).toFixed(1)}pp (de ${comparisonMetrics.connectionRate.toFixed(0)}% para ${metrics.connectionRate.toFixed(0)}%).`,
        )
      }
    }
  }

  // Standard insights
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
