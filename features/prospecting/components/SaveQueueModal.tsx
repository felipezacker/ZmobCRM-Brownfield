'use client'

import React, { useState } from 'react'
import { X, Save, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SaveQueueModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, isShared: boolean) => Promise<void>
  isSaving: boolean
  isAdminOrDirector: boolean
}

export function SaveQueueModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  isAdminOrDirector,
}: SaveQueueModalProps) {
  const [name, setName] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Nome da fila é obrigatório')
      return
    }
    try {
      await onSave(trimmed, isShared)
      setName('')
      setIsShared(false)
      setError('')
      onClose()
    } catch {
      // Toast handled by hook
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSaving) {
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Salvar fila"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Salvar Fila
          </h2>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </Button>
        </div>

        <div>
          <label
            htmlFor="queue-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Nome da fila
          </label>
          <input
            id="queue-name"
            type="text"
            placeholder="Ex: Leads frios 30 dias"
            className={`w-full bg-white dark:bg-black/20 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:text-white transition-colors ${
              error
                ? 'border-red-300 dark:border-red-500/30'
                : 'border-slate-200 dark:border-white/10'
            }`}
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            autoFocus
            maxLength={100}
          />
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>

        {isAdminOrDirector && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-primary-500 focus:ring-primary-500"
            />
            <Share2 size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Compartilhar com equipe
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            Cancelar
          </Button>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
