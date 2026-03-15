import React, { useCallback, useMemo } from 'react'
import { Target, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type GoalType = 'currency' | 'percentage' | 'number'

export interface ForecastBarProps {
  currentValue: number
  goalTarget: number
  goalType?: GoalType
  goalKpi?: string
  className?: string
  onConfigureClick?: () => void
}

export const ForecastBar: React.FC<ForecastBarProps> = ({
  currentValue,
  goalTarget,
  goalType = 'currency',
  goalKpi = 'Receita',
  className = '',
  onConfigureClick,
}) => {
  const hasGoal = goalTarget > 0
  const forecastPercent = hasGoal ? Math.min((currentValue / goalTarget) * 100, 100) : 0
  const forecastGap = goalTarget - currentValue
  const isOnTrack = forecastPercent >= 75

  const formatGoalValue = useCallback((value: number) => {
    switch (goalType) {
      case 'currency':
        if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`
        if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`
        return `R$${value.toLocaleString()}`
      case 'number':
        return value.toFixed(0)
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toLocaleString()
    }
  }, [goalType])

  if (!hasGoal) {
    return (
      <div className={`glass p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 shadow-sm shrink-0 ${className}`}>
        <div className="flex items-center gap-3">
          <Settings className="text-amber-500" size={20} />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">Meta não configurada</h3>
            <p className="text-xs text-muted-foreground">Defina uma meta no board para acompanhar o forecast.</p>
          </div>
          {onConfigureClick && (
            <Button
              onClick={onConfigureClick}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Configurar
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`glass p-4 rounded-xl border border-border shadow-sm shrink-0 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className={`${isOnTrack ? 'text-emerald-500' : 'text-amber-500'}`} size={20} />
          <h3 className="text-sm font-bold text-foreground">
            {goalKpi}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Realizado</span>
            <p className="text-lg font-bold text-emerald-500">{formatGoalValue(currentValue)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Meta</span>
            <p className="text-lg font-bold text-foreground">{formatGoalValue(goalTarget)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Gap</span>
            <p className={`text-lg font-bold ${forecastGap > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {forecastGap > 0 ? `-${formatGoalValue(forecastGap)}` : '✓ Atingido'}
            </p>
          </div>
        </div>
      </div>
      <div className="relative">
        <div className="w-full bg-muted dark:bg-white/10 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isOnTrack ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
            style={{ width: `${forecastPercent}%` }}
          />
        </div>
        <div className="absolute top-0 right-0 h-4 flex items-center">
          <span className={`text-xs font-bold px-2 ${forecastPercent >= 50 ? 'text-white' : 'text-secondary-foreground'}`}>
            {forecastPercent.toFixed(0)}%
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isOnTrack
          ? `🎯 No ritmo! Faltam ${formatGoalValue(Math.abs(forecastGap))} para bater a meta.`
          : `⚠️ Atenção! Você está abaixo de 75% da meta. Faltam ${formatGoalValue(Math.abs(forecastGap))}.`
        }
      </p>
    </div>
  )
}

export default ForecastBar
