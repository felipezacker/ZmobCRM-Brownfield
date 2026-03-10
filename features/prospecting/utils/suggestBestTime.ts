/**
 * Suggests the best time for a return call based on heatmap data (CP-3.4)
 */
import type { CallActivity } from '@/features/prospecting/hooks/useProspectingMetrics'
import { PROSPECTING_CONFIG } from '@/features/prospecting/prospecting-config'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const DAY_NAMES: Record<string, string> = {
  Dom: 'Domingo',
  Seg: 'Segunda',
  Ter: 'Terca',
  Qua: 'Quarta',
  Qui: 'Quinta',
  Sex: 'Sexta',
  Sab: 'Sabado',
}
const TIME_SLOTS = PROSPECTING_CONFIG.HEATMAP_TIME_SLOTS
const MIN_CALLS = PROSPECTING_CONFIG.HEATMAP_MIN_CALLS

export interface SuggestedTime {
  suggestedDate: Date
  suggestedDay: string
  suggestedHour: number
  connectionRate: number
}

interface HeatmapCell {
  total: number
  connected: number
  rate: number
}

function getTimeSlot(hour: number): string | null {
  if (hour >= 8 && hour < 10) return '08-10'
  if (hour >= 10 && hour < 12) return '10-12'
  if (hour >= 12 && hour < 14) return '12-14'
  if (hour >= 14 && hour < 16) return '14-16'
  if (hour >= 16 && hour < 18) return '16-18'
  if (hour >= 18 && hour < 20) return '18-20'
  return null
}

function slotToHour(slot: string): number {
  return parseInt(slot.split('-')[0], 10)
}

function buildHeatmapFromActivities(
  activities: CallActivity[],
  days: number,
): Record<string, Record<string, HeatmapCell>> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()
  const filtered = activities.filter(a => a.date >= cutoffStr)

  const data: Record<string, Record<string, HeatmapCell>> = {}
  for (const day of DAYS) {
    data[day] = {}
    for (const slot of TIME_SLOTS) {
      data[day][slot] = { total: 0, connected: 0, rate: 0 }
    }
  }

  for (const a of filtered) {
    const dt = new Date(a.date)
    const dayName = DAYS[dt.getDay()]
    const slot = getTimeSlot(dt.getHours())
    if (!slot) continue
    const cell = data[dayName][slot]
    cell.total++
    if (a.metadata?.outcome === 'connected') cell.connected++
  }

  for (const day of DAYS) {
    for (const slot of TIME_SLOTS) {
      const cell = data[day][slot]
      cell.rate = cell.total > 0 ? cell.connected / cell.total : 0
    }
  }

  return data
}

/**
 * Finds the best time slot in the next 7 days based on heatmap connection rates.
 * Returns null if there isn't enough data (MIN_CALLS not met in any slot).
 */
export function suggestBestTime(activities: CallActivity[]): SuggestedTime | null {
  const heatmap = buildHeatmapFromActivities(activities, 90)

  // Find the best slot across all days (highest connection rate with enough data)
  let bestDay = ''
  let bestSlot = ''
  let bestRate = 0

  for (const day of DAYS) {
    // Skip weekends for suggestions
    if (day === 'Dom' || day === 'Sab') continue
    for (const slot of TIME_SLOTS) {
      const cell = heatmap[day][slot]
      if (cell.total >= MIN_CALLS && cell.rate > bestRate) {
        bestRate = cell.rate
        bestDay = day
        bestSlot = slot
      }
    }
  }

  if (!bestDay || !bestSlot) return null

  // Find the next occurrence of bestDay from today
  const now = new Date()
  const targetDayIndex = DAYS.indexOf(bestDay)
  const suggestedDate = new Date(now)

  // Advance to next occurrence of the target day
  let daysToAdd = targetDayIndex - now.getDay()
  if (daysToAdd <= 0) daysToAdd += 7
  // If today is the target day and the slot hasn't passed yet, use today
  if (daysToAdd === 7) {
    const slotHour = slotToHour(bestSlot)
    if (now.getHours() < slotHour) {
      daysToAdd = 0
    }
  }

  suggestedDate.setDate(now.getDate() + daysToAdd)
  const suggestedHour = slotToHour(bestSlot)
  suggestedDate.setHours(suggestedHour, 0, 0, 0)

  return {
    suggestedDate,
    suggestedDay: DAY_NAMES[bestDay] || bestDay,
    suggestedHour,
    connectionRate: Math.round(bestRate * 100),
  }
}
