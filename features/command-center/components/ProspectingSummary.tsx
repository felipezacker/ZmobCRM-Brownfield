import React from 'react'
import { Phone, Users, Zap, Clock } from 'lucide-react'

export interface ProspectingMetrics {
  totalCalls: number
  connectionRate: number
  scheduledMeetings: number
  bestHour?: string
}

export interface ProspectingSummaryProps {
  data: ProspectingMetrics
  className?: string
}

export const ProspectingSummary: React.FC<ProspectingSummaryProps> = ({
  data,
  className = '',
}) => {
  const cards = [
    { label: 'Total Ligações', value: data.totalCalls.toString(), icon: Phone, color: 'text-blue-500' },
    { label: 'Taxa de Conexão', value: `${data.connectionRate.toFixed(1)}%`, icon: Zap, color: 'text-emerald-500' },
    { label: 'Agendamentos', value: data.scheduledMeetings.toString(), icon: Users, color: 'text-violet-500' },
    { label: 'Melhor Horário', value: data.bestHour || '--', icon: Clock, color: 'text-amber-500' },
  ]

  return (
    <div className={`glass p-5 rounded-xl border border-border shadow-sm ${className}`}>
      <h3 className="text-lg font-bold text-foreground font-display mb-4">Prospecção</h3>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="flex flex-col gap-1 p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-1.5">
                <Icon size={14} className={card.color} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <span className="text-xl font-bold text-foreground font-display">{card.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProspectingSummary
