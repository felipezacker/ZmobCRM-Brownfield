'use client'

import React from 'react'
import { User } from 'lucide-react'

interface BrokerPerformance {
  ownerId: string
  ownerName: string
  contactCount: number
  dealsWon: number
  ltvGenerated: number
}

interface BrokerRankingTableProps {
  brokers: BrokerPerformance[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

export function BrokerRankingTable({ brokers }: BrokerRankingTableProps) {
  if (brokers.length === 0) {
    return <p className="text-sm text-muted-foreground dark:text-muted-foreground py-4 text-center">Sem dados</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border dark:border-border">
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">#</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Corretor</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Contatos</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">Ganhos</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground dark:text-muted-foreground">LTV</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((broker, idx) => (
            <tr key={broker.ownerId} className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-white/5 transition-colors">
              <td className="py-2 px-2 text-xs text-muted-foreground">{idx + 1}</td>
              <td className="py-2 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-secondary-foreground dark:text-muted-foreground truncate">{broker.ownerName}</span>
                </div>
              </td>
              <td className="py-2 px-2 text-right text-secondary-foreground dark:text-muted-foreground">{broker.contactCount}</td>
              <td className="py-2 px-2 text-right text-secondary-foreground dark:text-muted-foreground">{broker.dealsWon}</td>
              <td className="py-2 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(broker.ltvGenerated)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
