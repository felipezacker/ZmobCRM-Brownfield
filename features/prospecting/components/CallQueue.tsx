import React, { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { ListOrdered, Trash2, RotateCcw, ArrowDownWideNarrow, ArrowUpToLine, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QueueItem } from './QueueItem'
import { useRangeSelection } from '@/hooks/useRangeSelection'
import type { ProspectingQueueItem } from '@/types'

interface CallQueueProps {
  items: ProspectingQueueItem[]
  exhaustedItems?: ProspectingQueueItem[]
  isLoading: boolean
  onRemove: (id: string) => void
  onClearAll?: () => void
  onResetExhausted?: (id: string) => void
  isClearing?: boolean
  removingId?: string
  ownerName?: string
  isSessionActive?: boolean
  onBatchRemove?: (ids: string[]) => Promise<void>
  onBatchMoveToTop?: (ids: string[]) => Promise<void>
  onReorder?: (items: ProspectingQueueItem[]) => void
  isReordering?: boolean
  onOpenContact?: (contactId: string) => void
}

export const CallQueue: React.FC<CallQueueProps> = ({ items, exhaustedItems = [], isLoading, onRemove, onClearAll, onResetExhausted, isClearing, removingId, ownerName, isSessionActive, onBatchRemove, onBatchMoveToTop, onReorder, isReordering, onOpenContact }) => {
  const [confirmClear, setConfirmClear] = useState(false)
  const [sortBy, setSortBy] = useState<'position' | 'score'>('position')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmBatchRemove, setConfirmBatchRemove] = useState(false)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const sortedItems = useMemo(() => {
    if (sortBy === 'score') {
      return [...items].sort((a, b) => (b.leadScore ?? -1) - (a.leadScore ?? -1))
    }
    return items
  }, [items, sortBy])

  const { selectedIds, toggle: handleToggle, toggleAll: handleSelectAll, clear: clearSelection, allSelected } = useRangeSelection({ items: sortedItems })

  // CP-4.7: DnD sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  const isDragDisabled = sortBy === 'score' || !!isSessionActive

  // CP-4.7: Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return

    const oldIndex = sortedItems.findIndex(i => i.id === active.id)
    const newIndex = sortedItems.findIndex(i => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(sortedItems, oldIndex, newIndex)
    onReorder(reordered)
  }, [sortedItems, onReorder])

  const handleBatchRemove = useCallback(async () => {
    if (!onBatchRemove || selectedIds.size === 0) return
    setIsBatchProcessing(true)
    try {
      await onBatchRemove(Array.from(selectedIds))
      clearSelection()
      setConfirmBatchRemove(false)
    } finally {
      setIsBatchProcessing(false)
    }
  }, [onBatchRemove, selectedIds, clearSelection])

  const handleBatchMoveToTop = useCallback(async () => {
    if (!onBatchMoveToTop || selectedIds.size === 0) return
    setIsBatchProcessing(true)
    try {
      await onBatchMoveToTop(Array.from(selectedIds))
      clearSelection()
    } finally {
      setIsBatchProcessing(false)
    }
  }, [onBatchMoveToTop, selectedIds, clearSelection])

  const showBatchActions = !isSessionActive && selectedIds.size > 0

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted dark:bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-3 bg-muted dark:bg-card rounded-xl mb-3">
          <ListOrdered size={24} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">Fila vazia</p>
        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
          Use a busca acima para adicionar contatos à fila de prospecção
        </p>
      </div>
    )
  }

  const pendingCount = items.filter(i => i.status === 'pending').length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {/* CP-4.5: Select all checkbox */}
          {!isSessionActive && (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && !allSelected }}
              onChange={handleSelectAll}
              aria-label={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              className="w-4 h-4 rounded border-border text-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer"
            />
          )}
          <h2 className="text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
            {ownerName ? `Fila de ${ownerName}` : 'Fila de Prospecção'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </span>
          <div className="relative group">
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setSortBy(prev => prev === 'position' ? 'score' : 'position')}
              className={`flex items-center gap-1 text-xs transition-colors ${
                sortBy === 'score'
                  ? 'text-primary-500 font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownWideNarrow size={12} />
              {sortBy === 'score' ? 'Score' : 'Ordem'}
            </Button>
            {/* CP-4.7: Tooltip when drag disabled due to sort=score */}
            {sortBy === 'score' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-foreground text-background text-2xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Arraste requer ordenação por posição
              </div>
            )}
          </div>
          {onClearAll && !confirmClear && (
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={isClearing}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {confirmClear && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
          <span className="text-xs text-red-600 dark:text-red-400 flex-1">
            Remover todos os {items.length} contatos da fila?
          </span>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => {
              onClearAll?.()
              setConfirmClear(false)
            }}
            disabled={isClearing}
            className="px-3 py-1 rounded-md text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
          >
            {isClearing ? 'Limpando...' : 'Confirmar'}
          </Button>
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setConfirmClear(false)}
            className="px-3 py-1 rounded-md text-xs font-medium bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent transition-colors"
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* CP-4.5: Batch actions bar */}
      {showBatchActions && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 rounded-lg">
          <CheckSquare size={14} className="text-primary-500 shrink-0" />
          <span className="text-xs font-medium text-primary-700 dark:text-primary-300 flex-1">
            {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </span>
          {onBatchMoveToTop && !confirmBatchRemove && (
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={handleBatchMoveToTop}
              disabled={isBatchProcessing}
              className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
            >
              <ArrowUpToLine size={12} />
              Mover para o topo
            </Button>
          )}
          {onBatchRemove && !confirmBatchRemove && (
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={() => setConfirmBatchRemove(true)}
              disabled={isBatchProcessing}
              className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              Remover selecionados
            </Button>
          )}
          {confirmBatchRemove && (
            <>
              <span className="text-xs text-red-600 dark:text-red-400">
                Remover {selectedIds.size} contato{selectedIds.size !== 1 ? 's' : ''}?
              </span>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={handleBatchRemove}
                disabled={isBatchProcessing}
                className="px-3 py-1 rounded-md text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {isBatchProcessing ? 'Removendo...' : 'Confirmar'}
              </Button>
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={() => setConfirmBatchRemove(false)}
                className="px-3 py-1 rounded-md text-xs font-medium bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent transition-colors"
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      )}

      {/* CP-4.7: DnD wrapper */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {sortedItems.map(item => (
            <QueueItem
              key={item.id}
              item={item}
              onRemove={onRemove}
              isRemoving={item.id === removingId}
              isExpanded={expandedId === item.id}
              onToggleExpand={handleToggleExpand}
              selected={selectedIds.has(item.id)}
              onToggle={!isSessionActive ? handleToggle : undefined}
              isSessionActive={isSessionActive}
              isDragDisabled={isDragDisabled}
              onOpenContact={onOpenContact}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* CP-2.1: Exhausted items section */}
      {exhaustedItems.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-4 px-1">
            <h3 className="text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">
              Esgotados
            </h3>
            <span className="text-2xs text-muted-foreground dark:text-muted-foreground">
              ({exhaustedItems.length})
            </span>
          </div>
          {exhaustedItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-red-50/50 dark:bg-red-500/5 rounded-lg border border-red-200/50 dark:border-red-500/10">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                <span className="text-xs font-bold text-red-500 dark:text-red-400">{item.retryCount}x</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
                  {item.contactName || 'Sem nome'}
                </span>
                {item.contactPhone && (
                  <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {item.contactPhone}
                  </span>
                )}
              </div>
              {onResetExhausted && (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => onResetExhausted(item.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground hover:bg-accent dark:hover:bg-accent transition-colors"
                >
                  <RotateCcw size={12} />
                  Resetar
                </Button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
