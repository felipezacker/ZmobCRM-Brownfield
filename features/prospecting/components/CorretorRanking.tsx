'use client'

import React, { useState, useMemo } from 'react'
import { User, ChevronUp, ChevronDown, Trophy } from 'lucide-react'
import type { BrokerMetric } from '../hooks/useProspectingMetrics'
import { formatDuration } from '../utils/formatDuration'

interface CorretorRankingProps {
  brokers: BrokerMetric[]
  isLoading: boolean
}

type SortField = 'totalCalls' | 'connectionRate' | 'avgDuration' | 'uniqueContacts'
type SortDir = 'asc' | 'desc'

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string
  field: SortField
  currentField: SortField
  currentDir: SortDir
  onSort: (field: SortField) => void
}) {
  const isActive = currentField === field
  return (
    <th
      className="text-right py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-0.5">
        {label}
        {isActive && (
          currentDir === 'desc'
            ? <ChevronDown size={12} />
            : <ChevronUp size={12} />
        )}
      </span>
    </th>
  )
}

function RankingSkeleton() {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4 animate-pulse">
      <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded" />
        ))}
      </div>
    </div>
  )
}

export function CorretorRanking({ brokers, isLoading }: CorretorRankingProps) {
  const [sortField, setSortField] = useState<SortField>('totalCalls')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...brokers]
    arr.sort((a, b) => {
      const va = a[sortField]
      const vb = b[sortField]
      return sortDir === 'desc' ? vb - va : va - vb
    })
    return arr
  }, [brokers, sortField, sortDir])

  const topBrokerId = sorted.length > 0 ? sorted[0].ownerId : null

  if (isLoading) return <RankingSkeleton />

  if (brokers.length === 0) {
    return (
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          Ranking de Corretores
        </h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
          Sem dados no período
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
        <Trophy size={16} className="text-amber-500" />
        Ranking de Corretores
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                #
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Corretor
              </th>
              <SortHeader label="Ligações" field="totalCalls" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Conexão" field="connectionRate" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Tempo Médio" field="avgDuration" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Contatos" field="uniqueContacts" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((broker, idx) => {
              const isTop = broker.ownerId === topBrokerId
              return (
                <tr
                  key={broker.ownerId}
                  className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                    isTop
                      ? 'bg-amber-50 dark:bg-amber-500/5'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <td className="py-2 px-2 text-xs text-slate-400">
                    {isTop ? (
                      <Trophy size={14} className="text-amber-500" />
                    ) : (
                      idx + 1
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {broker.ownerName}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400 font-medium">
                    {broker.totalCalls}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                    {broker.connectionRate.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                    {formatDuration(broker.avgDuration)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                    {broker.uniqueContacts}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
