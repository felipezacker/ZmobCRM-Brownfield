'use client'

import React, { useState, useRef } from 'react'
import { BookmarkPlus, ChevronDown, Trash2, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SavedQueue } from '@/lib/supabase/prospecting-saved-queues'

interface SavedQueuesListProps {
  savedQueues: SavedQueue[]
  isLoading: boolean
  isDeleting: boolean
  currentUserId: string
  onLoad: (queue: SavedQueue) => void
  onDelete: (id: string) => void
}

export function SavedQueuesList({
  savedQueues,
  isLoading,
  isDeleting,
  currentUserId,
  onLoad,
  onDelete,
}: SavedQueuesListProps) {
  const [open, setOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
        <Loader2 size={14} className="animate-spin" />
        Carregando filas...
      </div>
    )
  }

  if (savedQueues.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
        <BookmarkPlus size={14} />
        Nenhuma fila salva
      </div>
    )
  }

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(id)
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <Button
        variant="unstyled"
        size="unstyled"
        onClick={() => setOpen(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          open
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/15'
        }`}
      >
        <BookmarkPlus size={14} />
        Minhas Filas
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => { setOpen(false); setConfirmDeleteId(null) }}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-72 max-h-80 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1">
            {savedQueues.map((queue) => (
              <div
                key={queue.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 group"
              >
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => { onLoad(queue); setOpen(false) }}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                      {queue.name}
                    </span>
                    {queue.isShared && (
                      <Share2 size={10} className="text-blue-400 shrink-0" />
                    )}
                  </div>
                  {queue.ownerId !== currentUserId && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      compartilhada
                    </span>
                  )}
                </Button>

                {(queue.ownerId === currentUserId || confirmDeleteId === queue.id) && (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={(e) => { e.stopPropagation(); handleDelete(queue.id) }}
                    disabled={isDeleting}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ml-1 ${
                      confirmDeleteId === queue.id
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={confirmDeleteId === queue.id ? 'Confirmar exclusão' : 'Excluir'}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
