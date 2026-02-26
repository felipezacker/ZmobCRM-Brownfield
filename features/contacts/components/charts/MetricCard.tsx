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
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-lg">
          <Icon size={20} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
