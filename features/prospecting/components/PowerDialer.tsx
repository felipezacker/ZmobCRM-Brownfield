import React, { useState, useCallback } from 'react'
import { Phone, SkipForward, Square, Flame, Snowflake, Sun, User, Mail, FileText } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { CallModal, CallLogData } from '@/features/inbox/components/CallModal'
import { ProspectingScriptGuide } from '@/features/prospecting/components/ProspectingScriptGuide'
import { Sheet } from '@/components/ui/Sheet'
import { useCreateActivity } from '@/lib/query/hooks/useActivitiesQuery'
import type { ProspectingQueueItem } from '@/types'
import type { QuickScript } from '@/lib/supabase/quickScripts'

interface PowerDialerProps {
  contact: ProspectingQueueItem
  currentIndex: number
  totalCount: number
  onCallComplete: (outcome: string) => void
  onSkip: () => void
  onEnd: () => void
  selectedScript?: QuickScript | null
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
  selectedScript,
}) => {
  const [showCallModal, setShowCallModal] = useState(false)
  const [showMobileScript, setShowMobileScript] = useState(false)
  const [markedObjections, setMarkedObjections] = useState<string[]>([])
  const createActivity = useCreateActivity()

  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0
  const temp = contact.contactTemperature ? TEMP_DISPLAY[contact.contactTemperature] : null

  const handleCallSave = useCallback((data: CallLogData) => {
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
          ...(markedObjections.length > 0 && { objections: markedObjections }),
        },
      },
    })

    setShowCallModal(false)
    setMarkedObjections([])
    onCallComplete(data.outcome)
  }, [contact.contactId, createActivity, onCallComplete, markedObjections])

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="max-w-lg mx-auto space-y-1">
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

      {/* Main content: Contact card + Script guide side-by-side on desktop */}
      <div className={`${selectedScript ? 'lg:flex lg:gap-4 lg:items-start' : ''}`}>
        {/* Contact card */}
        <div className={`${selectedScript ? 'lg:flex-1' : 'max-w-lg mx-auto'}`}>
          <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 space-y-4">
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
            <div className={`grid ${selectedScript ? 'grid-cols-4' : 'grid-cols-3'} gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50`}>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => setShowCallModal(true)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-teal-500 hover:bg-teal-600 text-white transition-colors"
              >
                <Phone size={20} />
                <span className="text-xs font-medium">Ligar</span>
              </Button>

              {/* Mobile-only: show script button */}
              {selectedScript && (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setShowMobileScript(true)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 transition-colors lg:hidden"
                >
                  <FileText size={20} />
                  <span className="text-xs font-medium">Script</span>
                </Button>
              )}

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
        </div>

        {/* Desktop script guide panel */}
        {selectedScript && (
          <div className="hidden lg:block lg:w-80 xl:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden max-h-[70vh]">
            <ProspectingScriptGuide
              script={selectedScript}
              contact={contact}
              markedObjections={markedObjections}
              onObjectionsChange={setMarkedObjections}
            />
          </div>
        )}
      </div>

      {/* Mobile script drawer */}
      {selectedScript && (
        <Sheet
          isOpen={showMobileScript}
          onClose={() => setShowMobileScript(false)}
          ariaLabel="Script de chamada"
          className="max-h-[80vh]"
        >
          <div className="h-[75vh]">
            <ProspectingScriptGuide
              script={selectedScript}
              contact={contact}
              markedObjections={markedObjections}
              onObjectionsChange={setMarkedObjections}
            />
          </div>
        </Sheet>
      )}

      {/* CallModal with script guide side panel */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSave={handleCallSave}
        contactName={contact.contactName || 'Sem nome'}
        contactPhone={contact.contactPhone || ''}
        suggestedTitle={`Prospecção - ${contact.contactName || ''}`}
        sideContent={selectedScript ? (
          <ProspectingScriptGuide
            script={selectedScript}
            contact={contact}
            markedObjections={markedObjections}
            onObjectionsChange={setMarkedObjections}
          />
        ) : undefined}
      />
    </div>
  )
}
