import React from 'react'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { PulseColor } from '@/features/command-center/utils/pulse-rules'

export interface PulseRule {
  label: string
  status: PulseColor
  detail?: string
}

export interface PulseBarProps {
  rules: PulseRule[]
  className?: string
}

const statusConfig: Record<PulseColor, { bg: string; icon: React.ElementType; ring: string }> = {
  green: { bg: 'bg-green-500', icon: CheckCircle, ring: 'ring-green-500/20' },
  yellow: { bg: 'bg-amber-500', icon: AlertCircle, ring: 'ring-amber-500/20' },
  red: { bg: 'bg-red-500', icon: XCircle, ring: 'ring-red-500/20' },
}

export const PulseBar: React.FC<PulseBarProps> = ({ rules, className = '' }) => {
  return (
    <div className={`glass p-4 rounded-xl border border-border shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold text-foreground">Pulso do Negócio</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {rules.map((rule) => {
          const config = statusConfig[rule.status]
          const Icon = config.icon
          return (
            <div
              key={rule.label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ring-1 ${config.ring} bg-background/50`}
              title={rule.detail}
            >
              <Icon size={14} className={`${config.bg.replace('bg-', 'text-')}`} />
              <span className="text-xs font-medium text-foreground">{rule.label}</span>
              <div className={`w-2 h-2 rounded-full ${config.bg}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PulseBar
