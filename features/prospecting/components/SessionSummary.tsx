import React from 'react'
import { CheckCircle, XCircle, SkipForward, Phone, Clock, BarChart3 } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import type { SessionStats } from '../ProspectingPage'

interface SessionSummaryProps {
  stats: SessionStats
  startTime: Date | null
  onClose: () => void
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  stats,
  startTime,
  onClose,
}) => {
  const elapsed = startTime
    ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
    : 0

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) return `${mins}min ${secs}s`
    return `${secs}s`
  }

  const items = [
    {
      icon: <Phone size={16} className="text-slate-500" />,
      label: 'Total de ligações',
      value: stats.completed,
    },
    {
      icon: <CheckCircle size={16} className="text-green-500" />,
      label: 'Conectadas',
      value: stats.connected,
    },
    {
      icon: <XCircle size={16} className="text-red-500" />,
      label: 'Não atendeu',
      value: stats.noAnswer,
    },
    {
      icon: <SkipForward size={16} className="text-yellow-500" />,
      label: 'Puladas',
      value: stats.skipped,
    },
    {
      icon: <Clock size={16} className="text-blue-500" />,
      label: 'Tempo total',
      value: formatDuration(elapsed),
    },
  ]

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-teal-500/10 rounded-xl">
            <BarChart3 size={24} className="text-teal-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Sessão Encerrada
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Resumo da sua sessão de prospecção
          </p>
        </div>

        {/* Stats grid */}
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Close button */}
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white transition-colors text-center"
        >
          Voltar à Fila
        </Button>
      </div>
    </div>
  )
}
