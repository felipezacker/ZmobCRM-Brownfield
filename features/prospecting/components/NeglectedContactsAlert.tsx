'use client'

import React, { useCallback, useState } from 'react'
import { AlertTriangle, Plus, Flame, Sun } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { LeadScoreBadge } from '@/features/prospecting/components/LeadScoreBadge'
import { prospectingFilteredContactsService } from '@/lib/supabase/prospecting-filtered-contacts'

interface NeglectedContactsAlertProps {
  onAddAllToQueue: (contactIds: string[]) => void
  onError?: () => void
}

const NEGLECTED_FILTERS = {
  temperatures: ['HOT', 'WARM'] as string[],
  inactiveDays: 7,
  onlyWithPhone: true,
}

export function NeglectedContactsAlert({ onAddAllToQueue, onError }: NeglectedContactsAlertProps) {
  const [isAdding, setIsAdding] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['neglected-contacts'],
    queryFn: async () => {
      const result = await prospectingFilteredContactsService.getFilteredContacts({
        ...NEGLECTED_FILTERS,
        pageSize: 5,
      })
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const handleAddAll = useCallback(async () => {
    setIsAdding(true)
    try {
      const result = await prospectingFilteredContactsService.getAllFilteredIds(NEGLECTED_FILTERS)
      if (result.error) throw result.error
      if (result.data && result.data.length > 0) {
        onAddAllToQueue(result.data)
      }
    } catch {
      onError?.()
    } finally {
      setIsAdding(false)
    }
  }, [onAddAllToQueue, onError])

  // AC4: Se 0 contatos negligenciados, nao renderizar
  if (isLoading || !data || data.totalCount === 0) return null

  const contacts = data.data

  return (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {data.totalCount} lead{data.totalCount !== 1 ? 's' : ''} quente{data.totalCount !== 1 ? 's' : ''} sem contato há mais de 7 dias
          </span>
        </div>
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={handleAddAll}
          disabled={isAdding}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
        >
          <Plus size={12} />
          {isAdding ? 'Adicionando...' : 'Adicionar todos à fila'}
        </Button>
      </div>

      <div className="space-y-2">
        {contacts.map(contact => (
          <div key={contact.id} className="flex items-center justify-between py-1.5 px-2 bg-white/50 dark:bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{contact.name}</span>
              <LeadScoreBadge score={contact.leadScore} size="sm" />
              {contact.temperature === 'HOT'
                ? <Flame size={12} className="text-red-500 shrink-0" />
                : <Sun size={12} className="text-yellow-500 shrink-0" />
              }
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0 ml-2">
              {contact.daysSinceLastActivity} dias sem contato
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
