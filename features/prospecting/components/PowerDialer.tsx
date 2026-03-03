import React, { useState, useCallback } from 'react'
import { Phone, SkipForward, Square, Flame, Snowflake, Sun, User, Mail } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { CallModal, CallLogData } from '@/features/inbox/components/CallModal'
import { useCreateActivity } from '@/lib/query/hooks/useActivitiesQuery'
import type { ProspectingQueueItem } from '@/types'

interface PowerDialerProps {
  contact: ProspectingQueueItem
  currentIndex: number
  totalCount: number
  onCallComplete: (outcome: string) => void
  onSkip: () => void
  onEnd: () => void
}

const TEMP_DISPLAY: Record<string, { icon: React.ReactNode; label: string }> = {
  HOT: { icon: <Flame size={14} className="text-red-500" />, label: 'Quente' },
  WARM: { icon: <Sun size={14} className="text-yellow-500" />, label: 'Morno' },
  COLD: { icon: <Snowflake size={14} className="text-blue-400" />, label: 'Frio' },
}

export const PowerDialer: React.FC<PowerDialerProps> = ({
  contact,
  currentIndex,
  totalCount,
  onCallComplete,
  onSkip,
  onEnd,
}) => {
  const [showCallModal, setShowCallModal] = useState(false)
  const createActivity = useCreateActivity()

  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0
  const temp = contact.contactTemperature ? TEMP_DISPLAY[contact.contactTemperature] : null

  const handleCallSave = useCallback((data: CallLogData) => {
    // Create activity with metadata
    createActivity.mutate({
      activity: {
        title: data.title,
        description: data.notes || undefined,
        type: 'CALL',
        date: new Date().toISOString(),
        completed: true,
        contactId: contact.contactId,
        dealTitle: '',
        user: { name: 'Você', avatar: '' },
        metadata: {
          outcome: data.outcome,
          duration_seconds: data.duration,
          source: 'prospecting',
        },
      },
    })

    setShowCallModal(false)
    onCallComplete(data.outcome)
  }, [contact.contactId, createActivity, onCallComplete])

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Progresso da sessão</span>
          <span>{currentIndex + 1} / {totalCount}</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Contact card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 space-y-4">
        {/* Contact info */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center">
            <User size={24} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate">
              {contact.contactName || 'Sem nome'}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              {contact.contactPhone && (
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Phone size={12} />
                  {contact.contactPhone}
                </span>
              )}
              {contact.contactEmail && (
                <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Mail size={12} />
                  {contact.contactEmail}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {contact.contactStage && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {contact.contactStage}
                </span>
              )}
              {temp && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  {temp.icon}
                  {temp.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => { console.log('[PowerDialer] Ligar clicked, opening CallModal'); setShowCallModal(true); }}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors"
          >
            <Phone size={20} />
            <span className="text-xs font-medium">Ligar</span>
          </button>

          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onSkip}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <SkipForward size={20} />
            <span className="text-xs font-medium">Pular</span>
          </Button>

          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onEnd}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
          >
            <Square size={20} />
            <span className="text-xs font-medium">Encerrar</span>
          </Button>
        </div>
      </div>

      {/* CallModal */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSave={handleCallSave}
        contactName={contact.contactName || 'Sem nome'}
        contactPhone={contact.contactPhone || ''}
        suggestedTitle={`Prospecção - ${contact.contactName || ''}`}
      />
    </div>
  )
}
