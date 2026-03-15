export type PulseColor = 'green' | 'yellow' | 'red'

export interface PulseThresholds {
  greenAbove: number
  redBelow: number
}

const DEFAULT_THRESHOLDS: PulseThresholds = {
  greenAbove: 10,
  redBelow: -5,
}

/**
 * Determines the pulse status (semaphore) based on percentage change.
 *
 * - green:  change > +10%
 * - yellow: change between -5% and +10% (inclusive)
 * - red:    change < -5%
 */
export function getPulseStatus(
  changePercent: number,
  thresholds: PulseThresholds = DEFAULT_THRESHOLDS,
): PulseColor {
  if (changePercent > thresholds.greenAbove) return 'green'
  if (changePercent < thresholds.redBelow) return 'red'
  return 'yellow'
}

export function getPulseStatusForRevenue(
  changePercent: number,
  thresholds: PulseThresholds = DEFAULT_THRESHOLDS,
): PulseColor {
  return getPulseStatus(changePercent, thresholds)
}

export function getPulseStatusForWinRate(
  changePercent: number,
  thresholds: PulseThresholds = DEFAULT_THRESHOLDS,
): PulseColor {
  return getPulseStatus(changePercent, thresholds)
}

export function getPulseStatusForVolume(
  changePercent: number,
  thresholds: PulseThresholds = DEFAULT_THRESHOLDS,
): PulseColor {
  return getPulseStatus(changePercent, thresholds)
}
