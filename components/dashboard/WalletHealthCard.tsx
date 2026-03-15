import React from 'react'
import { Users } from 'lucide-react'

export interface WalletHealthData {
  activeCount: number
  inactiveCount: number
  churnedCount: number
  activePercent: number
  inactivePercent: number
  churnedPercent: number
  hot: number
  warm: number
  cold: number
  avgLTV: number
  stagnantDealsCount: number
  stagnantDealsValue: number
}

export interface WalletHealthCardProps {
  data: WalletHealthData
  className?: string
  onContactsClick?: () => void
  onAlertsClick?: () => void
}

export const WalletHealthCard: React.FC<WalletHealthCardProps> = ({
  data,
  className = '',
  onContactsClick,
  onAlertsClick,
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2">
        <Users className="text-primary-500" size={20} />
        Saúde da Carteira
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="glass p-5 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary-500/50 transition-colors"
          onClick={onContactsClick}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Distribuição da Carteira
          </h3>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-foreground">
              {data.activePercent}%
            </span>
            <span className="text-xs text-green-500 font-bold mb-1">Ativos</span>
          </div>
          <div className="w-full bg-muted dark:bg-white/10 rounded-full h-2 overflow-hidden flex">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${data.activePercent}%` }}
              title="Ativos"
            />
            <div
              className="bg-yellow-500 h-full"
              style={{ width: `${data.inactivePercent}%` }}
              title="Inativos"
            />
            <div
              className="bg-red-500 h-full"
              style={{ width: `${data.churnedPercent}%` }}
              title="Churn"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" /> Ativos ({data.activeCount})
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" /> Inativos ({data.inactiveCount})
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Churn ({data.churnedCount})
            </div>
          </div>
        </div>

        <div
          className="glass p-5 rounded-xl border border-border shadow-sm cursor-pointer hover:border-amber-500/50 transition-colors"
          onClick={onAlertsClick}
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Negócios Parados
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">
              {data.stagnantDealsCount} Deals
            </span>
            <span className={`text-xs font-bold mb-1 ${data.stagnantDealsCount > 0 ? 'text-amber-500' : 'text-green-500'}`}>
              {data.stagnantDealsCount > 0 ? 'Atenção' : 'OK'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Sem mudança de estágio há +10 dias.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            R${data.stagnantDealsValue.toLocaleString()} em risco
          </p>
        </div>

        <div className="glass p-5 rounded-xl border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            LTV Médio
          </h3>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-foreground">
              R${(data.avgLTV / 1000).toFixed(1)}k
            </span>
            <span className="text-xs text-green-500 font-bold mb-1">Médio</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Valor médio vitalício por cliente ativo.</p>
        </div>
      </div>
    </div>
  )
}

export default WalletHealthCard
