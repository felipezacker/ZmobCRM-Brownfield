import React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Alert, AlertSeverity } from '@/features/command-center/hooks'

export interface AlertDisplay {
  id: string
  severity: AlertSeverity
  label: string
  description: string
  href: string
}

export interface AlertsBlockProps {
  alerts: Alert[]
  className?: string
}

const severityConfig: Record<string, { bg: string; icon: React.ElementType; text: string }> = {
  critical: { bg: 'bg-red-500', icon: AlertTriangle, text: 'text-red-500' },
  high: { bg: 'bg-red-500', icon: AlertTriangle, text: 'text-red-500' },
  medium: { bg: 'bg-amber-500', icon: AlertCircle, text: 'text-amber-500' },
  low: { bg: 'bg-green-500', icon: Info, text: 'text-green-500' },
}

function getAlertHref(type: string): string {
  switch (type) {
    case 'stagnant_deals': return '/boards'
    case 'hot_leads_inactive': return '/contacts'
    case 'underperforming_brokers': return '/reports'
    case 'high_churn': return '/contacts'
    default: return '/dashboard'
  }
}

function getAlertLabel(type: string): string {
  switch (type) {
    case 'stagnant_deals': return 'Propostas Paradas'
    case 'hot_leads_inactive': return 'Leads HOT Inativos'
    case 'underperforming_brokers': return 'Corretores Abaixo da Meta'
    case 'high_churn': return 'Churn Elevado'
    default: return 'Alerta'
  }
}

export const AlertsBlock: React.FC<AlertsBlockProps> = ({ alerts, className = '' }) => {
  const router = useRouter()
  const criticalCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length

  return (
    <div className={`glass p-5 rounded-xl border border-border shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground font-display">Alertas Ativos</h3>
        {criticalCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Info size={32} className="mb-2 opacity-50" />
          <p className="text-sm">Nenhum alerta ativo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, index) => {
            const config = severityConfig[alert.severity] || severityConfig.low
            const Icon = config.icon
            const href = getAlertHref(alert.type)
            const label = getAlertLabel(alert.type)

            return (
              <Button
                key={`${alert.type}-${index}`}
                variant="ghost"
                onClick={() => router.push(href)}
                className="w-full flex items-center gap-3 p-3 h-auto rounded-lg hover:bg-background/50 dark:hover:bg-white/5 transition-colors group text-left justify-start"
              >
                <div className={`p-1.5 rounded-lg ${config.bg}/10`}>
                  <Icon size={16} className={config.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full text-white ${config.bg}`}>
                  {alert.affectedCount}
                </span>
                <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AlertsBlock
