/**
 * CP-6.4: Reusable delta percentage indicator for metrics comparison.
 *
 * Displays ↑/↓ with color coding (green = improvement, red = worsening),
 * "Novo" badge when previous was 0, or nothing when both are 0.
 */

interface DeltaIndicatorProps {
  current: number
  previous: number
  invertDirection?: boolean
  isLoading?: boolean
}

export function DeltaIndicator({ current, previous, invertDirection, isLoading }: DeltaIndicatorProps) {
  if (isLoading) {
    return <div className="h-3 w-10 bg-muted animate-pulse rounded" />
  }

  if (previous === 0 && current === 0) return null
  if (previous === 0) return <span className="text-xs text-blue-500">Novo</span>

  const delta = ((current - previous) / previous) * 100

  if (delta === 0) return <span className="text-xs text-muted-foreground">= 0%</span>

  const isPositive = invertDirection ? delta < 0 : delta > 0

  return (
    <span
      className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}
      aria-label={`${delta > 0 ? 'Aumento' : 'Reducao'} de ${Math.abs(delta).toFixed(1)} por cento em relacao ao periodo anterior`}
    >
      {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
    </span>
  )
}
