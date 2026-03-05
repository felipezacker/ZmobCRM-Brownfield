'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Phone, PhoneOff, UserPlus, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { STAGE_LABELS, TEMPERATURE_CONFIG } from '@/features/contacts/constants'
import type { ProspectingFilteredContact } from '@/lib/supabase/prospecting-filtered-contacts'

const QUEUE_LIMIT = 100

interface FilteredContactsListProps {
  contacts: ProspectingFilteredContact[]
  totalCount: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading: boolean
  isFetching: boolean
  existingQueueContactIds: Set<string>
  currentQueueSize: number
  onAddToQueue: (contactIds: string[]) => Promise<void>
  onSelectAllFiltered?: () => Promise<string[]>
}

export const FilteredContactsList: React.FC<FilteredContactsListProps> = ({
  contacts,
  totalCount,
  page,
  totalPages,
  onPageChange,
  isLoading,
  isFetching,
  existingQueueContactIds,
  currentQueueSize,
  onAddToQueue,
  onSelectAllFiltered,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [isLoadingAllIds, setIsLoadingAllIds] = useState(false)
  const [allFilteredSelected, setAllFilteredSelected] = useState(false)

  // Only selectable contacts (have phone and not already in queue)
  const selectableContacts = useMemo(
    () => contacts.filter(c => c.hasPhone && !existingQueueContactIds.has(c.id)),
    [contacts, existingQueueContactIds]
  )

  const allSelectableSelected = selectableContacts.length > 0 &&
    selectableContacts.every(c => selectedIds.has(c.id))

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (allSelectableSelected) {
      setSelectedIds(new Set())
      setAllFilteredSelected(false)
    } else {
      setSelectedIds(new Set(selectableContacts.map(c => c.id)))
    }
  }, [allSelectableSelected, selectableContacts])

  const handleSelectAllFiltered = useCallback(async () => {
    if (!onSelectAllFiltered) return
    setIsLoadingAllIds(true)
    try {
      const allIds = await onSelectAllFiltered()
      const filtered = allIds.filter(id => !existingQueueContactIds.has(id))
      setSelectedIds(new Set(filtered))
      setAllFilteredSelected(true)
    } finally {
      setIsLoadingAllIds(false)
    }
  }, [onSelectAllFiltered, existingQueueContactIds])

  const selectedCount = selectedIds.size
  const wouldExceedLimit = currentQueueSize + selectedCount > QUEUE_LIMIT
  const maxAddable = Math.max(0, QUEUE_LIMIT - currentQueueSize)

  const handleAddToQueue = useCallback(async () => {
    if (selectedCount === 0) return

    const ids = Array.from(selectedIds)
    const toAdd = wouldExceedLimit ? ids.slice(0, maxAddable) : ids

    if (toAdd.length === 0) return

    setIsAdding(true)
    try {
      await onAddToQueue(toAdd)
      setSelectedIds(new Set())
    } finally {
      setIsAdding(false)
    }
  }, [selectedIds, selectedCount, wouldExceedLimit, maxAddable, onAddToQueue])

  // Reset selection on page change (but not if all filtered are selected)
  React.useEffect(() => {
    if (!allFilteredSelected) {
      setSelectedIds(new Set())
    }
  }, [page, allFilteredSelected])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
        Nenhum contato encontrado com os filtros selecionados.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with select all + counter + action */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={allSelectableSelected}
              onChange={toggleSelectAll}
              className="rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
            />
            Selecionar todos
          </label>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''} de {totalCount} contato{totalCount !== 1 ? 's' : ''}
          </span>
          {onSelectAllFiltered && totalCount > contacts.length && allSelectableSelected && !allFilteredSelected && (
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={handleSelectAllFiltered}
              disabled={isLoadingAllIds}
              className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
            >
              {isLoadingAllIds ? 'Carregando...' : `Selecionar todos os ${totalCount} contatos`}
            </Button>
          )}
          {allFilteredSelected && (
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Todos os {selectedCount} contatos selecionados
            </span>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            {wouldExceedLimit && (
              <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle size={12} />
                Limite de {QUEUE_LIMIT}. Apenas {maxAddable} serão adicionados.
              </span>
            )}
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={handleAddToQueue}
              disabled={isAdding || maxAddable === 0}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus size={14} />
              {isAdding ? 'Adicionando...' : `Adicionar à Fila (${wouldExceedLimit ? maxAddable : selectedCount})`}
            </Button>
          </div>
        )}
      </div>

      {/* Contact list */}
      <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
        {contacts.map(contact => {
          const inQueue = existingQueueContactIds.has(contact.id)
          const disabled = !contact.hasPhone || inQueue
          const isSelected = selectedIds.has(contact.id)

          return (
            <div
              key={contact.id}
              className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-500/10'
                  : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
              } ${disabled ? 'opacity-60' : ''}`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggleSelect(contact.id)}
                className="rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500 disabled:opacity-40"
              />

              {/* Name + Email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {contact.name}
                  </span>
                  {inQueue && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                      Na fila
                    </span>
                  )}
                </div>
                {contact.email && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center gap-1.5 min-w-[120px]">
                {contact.hasPhone ? (
                  <>
                    <Phone size={12} className="text-slate-400" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      {contact.primaryPhone}
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                    <PhoneOff size={10} />
                    Sem telefone
                  </span>
                )}
              </div>

              {/* Stage badge */}
              {contact.stage && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {STAGE_LABELS[contact.stage] || contact.stage}
                </span>
              )}

              {/* Temperature badge */}
              {contact.temperature && TEMPERATURE_CONFIG[contact.temperature] && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TEMPERATURE_CONFIG[contact.temperature].cls}`}>
                  {TEMPERATURE_CONFIG[contact.temperature].label}
                </span>
              )}

              {/* Days since last activity */}
              <span className="text-xs text-slate-500 dark:text-slate-400 min-w-[60px] text-right">
                {contact.daysSinceLastActivity !== null
                  ? `${contact.daysSinceLastActivity}d`
                  : 'Nunca'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0 || isFetching}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 text-slate-600 dark:text-slate-400"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1 || isFetching}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 text-slate-600 dark:text-slate-400"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="text-center text-xs text-slate-400">Atualizando...</div>
      )}
    </div>
  )
}
