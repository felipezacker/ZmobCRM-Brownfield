import React, { useEffect, useRef } from 'react'
import { ArrowLeft, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  MODAL_OVERLAY_CLASS,
  MODAL_PANEL_BASE_CLASS,
  MODAL_VIEWPORT_CAP_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_TITLE_CLASS,
  MODAL_BODY_CLASS,
  MODAL_FOOTER_CLASS,
} from '@/components/ui/modalStyles'

interface SessionBriefingProps {
  pendingCount: number
  skippedCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function SessionBriefing({ pendingCount, skippedCount, onConfirm, onCancel }: SessionBriefingProps) {
  const totalCount = pendingCount + skippedCount
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Focus "Comecar" button on mount + Escape to close
  useEffect(() => {
    confirmRef.current?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className={MODAL_OVERLAY_CLASS} onClick={onCancel} role="dialog" aria-modal="true" aria-label="Briefing da sessao">
      <div
        className={`${MODAL_PANEL_BASE_CLASS} ${MODAL_VIEWPORT_CAP_CLASS} max-w-md`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={MODAL_HEADER_CLASS}>
          <h2 className={MODAL_TITLE_CLASS}>Sua sessao esta pronta</h2>
        </div>

        <div className={MODAL_BODY_CLASS}>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted dark:bg-white/5 rounded-lg">
              <span className="text-sm text-muted-foreground">Pendentes</span>
              <span className="text-sm font-semibold text-foreground">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted dark:bg-white/5 rounded-lg">
              <span className="text-sm text-muted-foreground">Pulados (retorno)</span>
              <span className="text-sm font-semibold text-foreground">{skippedCount}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-primary-50 dark:bg-primary-500/10 rounded-lg border border-primary-200 dark:border-primary-500/20">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">Total na fila</span>
              <span className="text-sm font-bold text-primary-700 dark:text-primary-300">{totalCount}</span>
            </div>
          </div>
        </div>

        <div className={`${MODAL_FOOTER_CLASS} flex items-center gap-3`}>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-muted hover:bg-accent text-secondary-foreground dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <Button
            ref={confirmRef}
            variant="unstyled"
            size="unstyled"
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors"
          >
            <Play size={16} />
            Comecar
          </Button>
        </div>
      </div>
    </div>
  )
}
