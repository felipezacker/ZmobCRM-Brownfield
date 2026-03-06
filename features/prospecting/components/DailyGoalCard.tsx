'use client'

import React, { useState, useEffect } from 'react'
import { Target, Settings, Trophy } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import type { GoalProgress } from '../hooks/useProspectingGoals'

interface DailyGoalCardProps {
  progress: GoalProgress
  isLoading: boolean
  isAdminOrDirector: boolean
  onConfigureClick: () => void
}

const COLOR_MAP = {
  red: {
    stroke: 'stroke-red-500',
    bg: 'bg-red-50 dark:bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  },
  yellow: {
    stroke: 'stroke-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  },
  green: {
    stroke: 'stroke-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  },
}

function CircularProgress({ percentage, color }: { percentage: number; color: GoalProgress['color'] }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const cappedPct = Math.min(percentage, 100)
  const offset = circumference - (cappedPct / 100) * circumference

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="8"
        className="stroke-slate-200 dark:stroke-slate-700"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={`${COLOR_MAP[color].stroke} transition-all duration-700 ease-out`}
      />
    </svg>
  )
}

export function DailyGoalCard({ progress, isLoading, isAdminOrDirector, onConfigureClick }: DailyGoalCardProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [prevComplete, setPrevComplete] = useState(false)

  useEffect(() => {
    if (progress.isComplete && !prevComplete) {
      setShowCelebration(true)
      const timer = setTimeout(() => setShowCelebration(false), 3000)
      return () => clearTimeout(timer)
    }
    setPrevComplete(progress.isComplete)
  }, [progress.isComplete, prevComplete])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-[100px] h-[100px] bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  const colors = COLOR_MAP[progress.color]

  return (
    <div className={`relative bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm overflow-hidden ${showCelebration ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : ''}`}>
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-bounce">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-lg text-sm font-bold">
            <Trophy size={16} />
            Meta atingida!
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <CircularProgress percentage={progress.percentage} color={progress.color} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${colors.text}`}>{progress.percentage}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Meta do Dia</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {progress.current}<span className="text-sm font-normal text-slate-400 dark:text-slate-500">/{progress.target}</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">ligacoes hoje</p>

          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.badge}`}>
              {progress.isComplete ? 'Concluida' : progress.percentage >= 50 ? 'Em progresso' : 'Iniciar'}
            </span>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={onConfigureClick}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              title={isAdminOrDirector ? 'Configurar metas' : 'Alterar meta'}
            >
              <Settings size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
