import React from 'react'
import Image from 'next/image'
import { Trophy, Users, Phone } from 'lucide-react'

export interface BrokerRow {
  id: string
  name: string
  avatar?: string
  deals: number
  revenue: number
  winRate: number
  calls?: number
  isUnderperforming?: boolean
}

export interface BrokerLeaderboardProps {
  data: BrokerRow[]
  showCalls?: boolean
  className?: string
  formatCurrency?: (value: number) => string
}

const defaultFormatCurrency = (value: number) => {
  if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`
  return `R$${value.toLocaleString()}`
}

export const BrokerLeaderboard: React.FC<BrokerLeaderboardProps> = ({
  data,
  showCalls = false,
  className = '',
  formatCurrency = defaultFormatCurrency,
}) => {
  return (
    <div className={`glass p-5 rounded-xl border border-border shadow-sm flex flex-col h-full overflow-hidden ${className}`}>
      <div className="flex justify-between items-center mb-3 shrink-0">
        <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
          <Trophy className="text-amber-500" size={20} />
          Top Corretores
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {data.length > 0 ? (
          data.map((rep, index) => (
            <div
              key={rep.id}
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 dark:hover:bg-white/5 transition-colors ${
                rep.isUnderperforming ? 'bg-red-500/10 border-l-2 border-red-500' : ''
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-amber-100 text-amber-600' :
                index === 1 ? 'bg-muted text-secondary-foreground' :
                index === 2 ? 'bg-orange-100 text-orange-600' :
                  'bg-background text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <Image
                src={rep.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${rep.name}`}
                alt={rep.name}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{rep.name}</p>
                <p className="text-xs text-muted-foreground">{rep.deals} deals • {rep.winRate}% conv.</p>
              </div>
              {showCalls && rep.calls !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone size={12} />
                  <span>{rep.calls}</span>
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-500">{formatCurrency(rep.revenue)}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
            <Users size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Nenhum deal fechado no período.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BrokerLeaderboard
