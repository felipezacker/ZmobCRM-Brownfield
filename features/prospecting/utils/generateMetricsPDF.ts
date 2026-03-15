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
import type { ProspectingMetrics, BrokerMetric, PeriodRange, CallActivity } from '../hooks/useProspectingMetrics'
import type { RetryEffectivenessData } from '../hooks/useRetryEffectiveness'
import type { ProspectingImpact } from '../hooks/useProspectingImpact'
import type { GoalProgress } from '../hooks/useProspectingGoals'
import { formatDuration } from './formatDuration'

interface GeneratePdfOptions {
  metrics: ProspectingMetrics | null
  activities: CallActivity[]
  brokers: BrokerMetric[]
  range: PeriodRange
  isAdminOrDirector: boolean
  organizationName: string
  comparisonMetrics?: ProspectingMetrics
  retryData?: RetryEffectivenessData
  impact?: ProspectingImpact | null
  goalProgress?: GoalProgress
  userMetrics?: BrokerMetric | null
  teamAverage?: BrokerMetric | null
  periodDays?: number
  queueStats?: {
    total: number
    completed: number
    pending: number
    skipped: number
    retryPending: number
    exhausted: number
  }
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
  orange: [249, 115, 22],      // orange-500
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

function formatDeltaText(current: number, previous: number): string {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const HEATMAP_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const TIME_SLOTS = ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20']

function getTimeSlot(hour: number): string | null {
  if (hour >= 8 && hour < 10) return '08-10'
  if (hour >= 10 && hour < 12) return '10-12'
  if (hour >= 12 && hour < 14) return '12-14'
  if (hour >= 14 && hour < 16) return '14-16'
  if (hour >= 16 && hour < 18) return '16-18'
  if (hour >= 18 && hour < 20) return '18-20'
  return null
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage()
    return 15
  }
  return y
}

function sectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  y = ensureSpace(doc, y, 20)
  doc.setTextColor(...COLORS.text)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y)
  return y + 2
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const sqDiffs = values.map(v => (v - mean) ** 2)
  return Math.sqrt(sqDiffs.reduce((s, v) => s + v, 0) / values.length)
}

// ── Main ────────────────────────────────────────────────────
export async function generateMetricsPDF(options: GeneratePdfOptions) {
  const { metrics, activities, brokers, range, isAdminOrDirector, organizationName, comparisonMetrics,
    retryData, impact, goalProgress, userMetrics, teamAverage, periodDays, queueStats } = options

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
      const deltaText = formatDeltaText(kpi.curr, kpi.prev)
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
  // Daily Goal Progress
  // ════════════════════════════════════════════
  if (goalProgress) {
    y = ensureSpace(doc, y, 30)
    doc.setTextColor(...COLORS.text)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Meta do Dia', margin, y)
    y += 6

    // Goal progress box
    const boxW = contentWidth / 3
    doc.setFillColor(...COLORS.cardBg)
    doc.roundedRect(margin, y - 2, boxW, 22, 2, 2, 'F')

    // Colored left border based on status
    const goalColor = goalProgress.color === 'green' ? COLORS.emerald
      : goalProgress.color === 'yellow' ? COLORS.amber : COLORS.red
    doc.setFillColor(...goalColor)
    doc.rect(margin, y, 2.5, 18, 'F')

    // Progress text
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(`${goalProgress.current}/${goalProgress.target}`, margin + 7, y + 10)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.textMuted)
    doc.text(`${goalProgress.percentage}% concluído`, margin + 7, y + 16)

    // Status badge
    const statusText = goalProgress.isComplete ? 'Concluída' : goalProgress.percentage >= 50 ? 'Em progresso' : 'Iniciar'
    doc.setFillColor(...goalColor)
    const badgeX = margin + boxW + 8
    doc.roundedRect(badgeX, y + 2, doc.getTextWidth(statusText) + 8, 8, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text(statusText, badgeX + 4, y + 7.5)

    y += 28
  }

  // ════════════════════════════════════════════
  // Performance Comparison (non-admin only)
  // ════════════════════════════════════════════
  if (!isAdminOrDirector && userMetrics && teamAverage && periodDays && periodDays > 0) {
    y = ensureSpace(doc, y, 30)
    y = sectionTitle(doc, 'Você vs. Média do Time', y, margin)

    const days = Math.max(1, periodDays)
    const compRows = [
      ['Ligações/dia', (userMetrics.totalCalls / days).toFixed(1), (teamAverage.totalCalls / days).toFixed(1)],
      ['Taxa de Conexão', `${userMetrics.connectionRate.toFixed(0)}%`, `${teamAverage.connectionRate.toFixed(0)}%`],
      ['Duração Média', formatDuration(userMetrics.avgDuration), formatDuration(teamAverage.avgDuration)],
      ['Contatos Únicos', String(userMetrics.uniqueContacts), String(Math.round(teamAverage.uniqueContacts))],
    ]

    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Você', 'Time']],
      body: compRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [...COLORS.primary], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' },
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
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
      const deltaText = formatDeltaText(kpi.curr, kpi.prev)
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
  // Connection Heatmap (computed from activities)
  // ════════════════════════════════════════════
  if (activities.length >= 10) {
    y = sectionTitle(doc, 'Melhor Horário para Ligar', y, margin)

    // Build heatmap data from activities
    const heatmap: Record<string, Record<string, { total: number; connected: number }>> = {}
    for (const day of HEATMAP_DAYS) {
      heatmap[day] = {}
      for (const slot of TIME_SLOTS) {
        heatmap[day][slot] = { total: 0, connected: 0 }
      }
    }
    for (const a of activities) {
      const dt = new Date(a.date)
      const dayName = HEATMAP_DAYS[dt.getDay()]
      const slot = getTimeSlot(dt.getHours())
      if (!slot) continue
      const cell = heatmap[dayName][slot]
      cell.total++
      if (a.metadata?.outcome === 'connected') cell.connected++
    }

    // Build table: rows = days, cols = time slots
    const heatmapBody = HEATMAP_DAYS.map(day => {
      const row: string[] = [day]
      for (const slot of TIME_SLOTS) {
        const cell = heatmap[day][slot]
        if (cell.total === 0) {
          row.push('—')
        } else {
          const rate = ((cell.connected / cell.total) * 100).toFixed(0)
          row.push(`${rate}% (${cell.total})`)
        }
      }
      return row
    })

    autoTable(doc, {
      startY: y,
      head: [['Dia', '8-10h', '10-12h', '12-14h', '14-16h', '16-18h', '18-20h']],
      body: heatmapBody,
      styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
      headStyles: { fillColor: [...COLORS.orange], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const text = String(data.cell.raw)
          if (text === '—') {
            data.cell.styles.textColor = COLORS.gray
          } else {
            const pctMatch = text.match(/^(\d+)%/)
            if (pctMatch) {
              const pct = parseInt(pctMatch[1])
              if (pct >= 40) data.cell.styles.textColor = COLORS.emerald
              else if (pct >= 20) data.cell.styles.textColor = COLORS.amber
              else data.cell.styles.textColor = COLORS.red
            }
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
  // Top Objections (computed from activities)
  // ════════════════════════════════════════════
  {
    const objCounts = new Map<string, number>()
    for (const a of activities) {
      const meta = a.metadata as Record<string, unknown> | null
      const objections = meta?.objections as string[] | undefined
      if (!objections || !Array.isArray(objections)) continue
      for (const obj of objections) {
        objCounts.set(obj, (objCounts.get(obj) || 0) + 1)
      }
    }
    const topObjections = Array.from(objCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

    if (topObjections.length > 0) {
      y = sectionTitle(doc, 'Top 5 Objeções', y, margin)

      autoTable(doc, {
        startY: y,
        head: [['#', 'Objeção', 'Ocorrências']],
        body: topObjections.map(([obj, count], i) => [String(i + 1), obj, `${count}x`]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [...COLORS.orange], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [...COLORS.lightBg] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          2: { halign: 'center', cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      })

      y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
    }
  }

  // ════════════════════════════════════════════
  // Retry Effectiveness
  // ════════════════════════════════════════════
  if (retryData?.hasData) {
    y = sectionTitle(doc, 'Efetividade de Retentativas', y, margin)

    const retryRows = [
      [retryData.firstAttempt.label, String(retryData.firstAttempt.total), String(retryData.firstAttempt.completed), `${Math.round(retryData.firstAttempt.rate)}%`],
      [retryData.secondAttempt.label, String(retryData.secondAttempt.total), String(retryData.secondAttempt.completed), `${Math.round(retryData.secondAttempt.rate)}%`],
      [retryData.thirdPlus.label, String(retryData.thirdPlus.total), String(retryData.thirdPlus.completed), `${Math.round(retryData.thirdPlus.rate)}%`],
    ]

    autoTable(doc, {
      startY: y,
      head: [['Tentativa', 'Total', 'Conectaram', 'Taxa']],
      body: retryRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [...COLORS.primary], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
  }

  // ════════════════════════════════════════════
  // Pipeline Impact
  // ════════════════════════════════════════════
  if (impact && impact.totalProspectingCalls > 0) {
    y = sectionTitle(doc, 'Impacto no Pipeline', y, margin)

    // KPI row
    const impactKpis = [
      { label: 'Ligações com Deal', value: `${impact.callsWithDeal} / ${impact.totalProspectingCalls}` },
      { label: 'Taxa de Vinculação', value: `${impact.linkageRate.toFixed(1)}%` },
      { label: 'Pipeline Gerado', value: formatCurrency(impact.pipelineValue) },
      { label: 'Deals Ganhos', value: String(impact.dealsWon) + (impact.dealsWonValue > 0 ? ` (${formatCurrency(impact.dealsWonValue)})` : '') },
    ]

    const impactColW = (contentWidth - 12) / 4
    impactKpis.forEach((kpi, i) => {
      const x = margin + i * (impactColW + 4)
      doc.setFillColor(...COLORS.cardBg)
      doc.roundedRect(x, y, impactColW, 18, 2, 2, 'F')

      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...COLORS.textMuted)
      doc.text(kpi.label.toUpperCase(), x + 4, y + 5)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text(kpi.value, x + 4, y + 13)
    })

    y += 24

    // Daily breakdown table
    if (impact.byDay.length > 0) {
      const impactDays = impact.byDay.filter(d => d.linked > 0 || d.unlinked > 0)
      if (impactDays.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Data', 'Com Deal', 'Sem Deal', 'Total']],
          body: impactDays.map(d => [
            formatDate(d.date),
            String(d.linked),
            String(d.unlinked),
            String(d.linked + d.unlinked),
          ]),
          styles: { fontSize: 7.5, cellPadding: 2.5 },
          headStyles: { fillColor: [...COLORS.violet], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          alternateRowStyles: { fillColor: [...COLORS.lightBg] },
          columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
          },
          margin: { left: margin, right: margin },
        })
        y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 10
      }
    }
  }

  // ════════════════════════════════════════════
  // Queue Health
  // ════════════════════════════════════════════
  if (queueStats && queueStats.total > 0) {
    y = sectionTitle(doc, 'Saúde da Fila', y, margin)

    const queueRows = [
      ['Total na Fila', String(queueStats.total)],
      ['Concluídos', String(queueStats.completed)],
      ['Pendentes', String(queueStats.pending)],
      ['Pulados', String(queueStats.skipped)],
      ['Em Retry', String(queueStats.retryPending)],
      ['Esgotados', String(queueStats.exhausted)],
    ].filter(r => parseInt(r[1]) > 0)

    autoTable(doc, {
      startY: y,
      head: [['Status', 'Quantidade', '% do Total']],
      body: queueRows.map(r => [...r, `${((parseInt(r[1]) / queueStats.total) * 100).toFixed(0)}%`]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [...COLORS.gray], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [...COLORS.lightBg] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' },
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

// ── Insights Generator (12 rules — matches AutoInsights UI) ─
function generateTextInsights(metrics: ProspectingMetrics, comparisonMetrics?: ProspectingMetrics): string[] {
  const insights: { text: string; severity: number }[] = []

  // Comparison insights first
  if (comparisonMetrics && comparisonMetrics.totalCalls > 0) {
    const callsDelta = ((metrics.totalCalls - comparisonMetrics.totalCalls) / comparisonMetrics.totalCalls) * 100
    if (Math.abs(callsDelta) >= 10) {
      insights.push({
        text: callsDelta > 0
          ? `Volume de ligações aumentou ${callsDelta.toFixed(0)}% em relação ao período anterior.`
          : `Volume de ligações caiu ${Math.abs(callsDelta).toFixed(0)}% em relação ao período anterior.`,
        severity: callsDelta > 0 ? 3 : 1,
      })
    }

    if (comparisonMetrics.connectionRate > 0) {
      const rateDiff = metrics.connectionRate - comparisonMetrics.connectionRate
      if (Math.abs(rateDiff) >= 5) {
        insights.push({
          text: rateDiff > 0
            ? `Taxa de conexão melhorou ${rateDiff.toFixed(1)}pp (de ${comparisonMetrics.connectionRate.toFixed(0)}% para ${metrics.connectionRate.toFixed(0)}%).`
            : `Taxa de conexão piorou ${Math.abs(rateDiff).toFixed(1)}pp (de ${comparisonMetrics.connectionRate.toFixed(0)}% para ${metrics.connectionRate.toFixed(0)}%).`,
          severity: rateDiff > 0 ? 3 : 0,
        })
      }
    }
  }

  // 1. Low connection rate
  if (metrics.totalCalls >= 10 && metrics.connectionRate < 20) {
    insights.push({
      text: `Baixa taxa de resposta (${metrics.connectionRate.toFixed(0)}%). Considere revisar horários de ligação.`,
      severity: 1,
    })
  }

  // 2. Good connection rate
  if (metrics.totalCalls >= 10 && metrics.connectionRate >= 30) {
    insights.push({
      text: `Boa taxa de conexão (${metrics.connectionRate.toFixed(0)}%). Continue com essa estratégia.`,
      severity: 3,
    })
  }

  // 3. High no-answer rate
  const noAnswer = metrics.byOutcome.find(o => o.outcome === 'no_answer')?.count || 0
  const noAnswerRate = metrics.totalCalls > 0 ? (noAnswer / metrics.totalCalls) * 100 : 0
  if (metrics.totalCalls >= 10 && noAnswerRate > 60) {
    insights.push({
      text: `Alto volume sem resposta (${noAnswerRate.toFixed(0)}%). Tente ligar em horários diferentes.`,
      severity: 0,
    })
  }

  // 4. Top performer
  if (metrics.byBroker.length >= 2) {
    const top = metrics.byBroker[0]
    if (top.totalCalls > 0) {
      insights.push({
        text: `${top.ownerName} lidera com ${top.totalCalls} ligações e ${top.connectionRate.toFixed(0)}% de conexão.`,
        severity: 2,
      })
    }
  }

  // 5. Short avg duration
  if (metrics.avgDuration > 0 && metrics.avgDuration < 30 && metrics.connectedCalls >= 5) {
    insights.push({
      text: `Tempo médio de ${Math.round(metrics.avgDuration)}s por ligação. Tente manter conversas mais longas.`,
      severity: 1,
    })
  }

  // 6. Low volume
  if (metrics.totalCalls < 10 && metrics.totalCalls > 0) {
    insights.push({
      text: `Apenas ${metrics.totalCalls} ligações no período. Aumente o volume para resultados consistentes.`,
      severity: 1,
    })
  }

  // 7. High voicemail rate
  const voicemailCount = metrics.byOutcome.find(o => o.outcome === 'voicemail')?.count || 0
  const voicemailRate = metrics.totalCalls > 0 ? (voicemailCount / metrics.totalCalls) * 100 : 0
  if (voicemailRate > 15 && metrics.totalCalls >= 10) {
    insights.push({
      text: `Alto índice de correio de voz (${voicemailRate.toFixed(0)}%). Considere ligar em horários alternativos.`,
      severity: 1,
    })
  }

  // 8. Productivity by day of week
  if (metrics.byDay.length >= 3) {
    const dailyTotals = metrics.byDay.map(d => d.total)
    const avgDaily = dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length
    if (avgDaily > 0) {
      const bestDay = metrics.byDay.reduce((best, d) => (d.total > best.total ? d : best), metrics.byDay[0])
      if (bestDay.total >= avgDaily * 2) {
        const dayOfWeek = new Date(bestDay.date + 'T12:00:00').getDay()
        const dayName = DAY_NAMES_FULL[dayOfWeek]
        insights.push({
          text: `Suas ${dayName}s são mais produtivas (${bestDay.total} ligações vs média de ${Math.round(avgDaily)}).`,
          severity: 2,
        })
      }
    }
  }

  // 9. Contact diversification
  if (metrics.totalCalls >= 20 && metrics.uniqueContacts > 0) {
    const diversificationRate = (metrics.uniqueContacts / metrics.totalCalls) * 100
    if (diversificationRate < 50) {
      insights.push({
        text: `Você está ligando repetidamente para os mesmos contatos. ${diversificationRate.toFixed(0)}% das ligações são para contatos únicos.`,
        severity: 1,
      })
    }
  }

  // 10. No recent activity
  if (metrics.byDay.length >= 3) {
    const sortedDays = [...metrics.byDay].sort((a, b) => a.date.localeCompare(b.date))
    const firstDate = new Date(sortedDays[0].date + 'T12:00:00')
    const lastDate = new Date(sortedDays[sortedDays.length - 1].date + 'T12:00:00')
    const spanDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (spanDays >= 5) {
      const today = new Date()
      today.setHours(12, 0, 0, 0)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      const recentDays = sortedDays.filter(d => new Date(d.date + 'T12:00:00') >= twoDaysAgo)
      if (recentDays.length === 0) {
        insights.push({
          text: 'Nenhuma ligação nos últimos 2 dias. Retome a prospecção para manter o ritmo.',
          severity: 0,
        })
      }
    }
  }

  // 11. Connection rate improvement (first half vs second half)
  if (metrics.byDay.length >= 7) {
    const sortedDays = [...metrics.byDay].sort((a, b) => a.date.localeCompare(b.date))
    const mid = Math.floor(sortedDays.length / 2)
    const firstHalf = sortedDays.slice(0, mid)
    const secondHalf = sortedDays.slice(mid)

    const calcRate = (days: typeof sortedDays) => {
      const totalCalls = days.reduce((s, d) => s + d.total, 0)
      const connected = days.reduce((s, d) => s + d.connected, 0)
      return totalCalls > 0 ? (connected / totalCalls) * 100 : 0
    }

    const firstRate = calcRate(firstHalf)
    const secondRate = calcRate(secondHalf)
    const improvement = secondRate - firstRate

    if (improvement > 10) {
      insights.push({
        text: `Sua taxa de conexão melhorou ${Math.round(improvement)}pp na segunda metade do período. Continue assim!`,
        severity: 3,
      })
    }
  }

  // 12. Consistent volume
  if (metrics.byDay.length >= 5) {
    const dailyTotals = metrics.byDay.map(d => d.total)
    const avg = dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length
    if (avg > 0) {
      const sd = stddev(dailyTotals)
      const cv = sd / avg
      if (cv < 0.3) {
        insights.push({
          text: 'Volume de ligações consistente. Boa disciplina de prospecção!',
          severity: 3,
        })
      }
    }
  }

  // Sort by severity: alerts (0) first, then warnings (1), info (2), positives (3) last
  insights.sort((a, b) => a.severity - b.severity)

  return insights.map(i => i.text)
}
