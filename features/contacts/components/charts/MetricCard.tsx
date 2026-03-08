'use client'

import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  children?: React.ReactNode
}

export function MetricCard({ title, value, icon: Icon, children }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-white/5 border border-border dark:border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
          <Icon size={20} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
