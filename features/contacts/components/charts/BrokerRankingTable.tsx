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
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">Sem dados</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">#</th>
            <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Corretor</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Contatos</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">Ganhos</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">LTV</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((broker, idx) => (
            <tr key={broker.ownerId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <td className="py-2 px-2 text-xs text-slate-400">{idx + 1}</td>
              <td className="py-2 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 truncate">{broker.ownerName}</span>
                </div>
              </td>
              <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{broker.contactCount}</td>
              <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">{broker.dealsWon}</td>
              <td className="py-2 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(broker.ltvGenerated)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
