import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Phone, SkipForward, Square, Flame, Snowflake, Sun, User, Mail, FileText, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CallModal, CallLogData } from '@/features/inbox/components/CallModal'
import { ProspectingScriptGuide } from '@/features/prospecting/components/ProspectingScriptGuide'
import { ContactHistory } from '@/features/prospecting/components/ContactHistory'
import { QuickActionsPanel } from '@/features/prospecting/components/QuickActionsPanel'
import { useQuickScripts } from '@/features/inbox/hooks/useQuickScripts'
import { useCreateActivity } from '@/lib/query/hooks/useActivitiesQuery'
import { substituteVariables } from '@/features/prospecting/utils/scriptParser'
import type { ProspectingQueueItem } from '@/types'
import { LeadScoreBadge } from '@/features/prospecting/components/LeadScoreBadge'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { SessionStats } from '@/features/prospecting/ProspectingPage'
import type { GoalProgress } from '@/features/prospecting/hooks/useProspectingGoals'
import { useOptionalToast } from '@/context/ToastContext'
import type { SuggestedTime } from '@/features/prospecting/utils/suggestBestTime'

interface PowerDialerProps {
  contact: ProspectingQueueItem
  currentIndex: number
  totalCount: number
  onCallComplete: (outcome: string) => void
  onSkip: () => void
  onEnd: () => void
  selectedScript?: QuickScript | null
  onScriptChange?: (script: QuickScript | null) => void
  sessionStats?: SessionStats
  isAdminOrDirector?: boolean
  onManageTemplates?: () => void
  suggestedReturnTime?: SuggestedTime | null
  goalProgress?: GoalProgress
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
  onScriptChange,
  sessionStats,
  isAdminOrDirector,
  onManageTemplates,
  suggestedReturnTime,
  goalProgress,
}) => {
  const [showCallModal, setShowCallModal] = useState(false)
  const [markedObjections, setMarkedObjections] = useState<string[]>([])
  const [showScriptDropdown, setShowScriptDropdown] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [lastCallData, setLastCallData] = useState<CallLogData | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const goalCelebratedRef = useRef(false)
  const createActivity = useCreateActivity()
  const { scripts } = useQuickScripts()
  const { addToast } = useOptionalToast()

  // CP-4.3: Celebrate when daily goal is reached (once per mount)
  useEffect(() => {
    if (goalProgress?.isComplete && !goalCelebratedRef.current) {
      goalCelebratedRef.current = true
      addToast(`Meta atingida! Você completou ${goalProgress.target} ligações hoje.`, 'success')
    }
  }, [goalProgress?.isComplete, goalProgress?.target, addToast])

  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0
  const temp = contact.contactTemperature ? TEMP_DISPLAY[contact.contactTemperature] : null

  // Close dropdown on outside click
  useEffect(() => {
    if (!showScriptDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowScriptDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showScriptDropdown])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes dropdown
      if (e.key === 'Escape' && showScriptDropdown) {
        e.preventDefault()
        setShowScriptDropdown(false)
        return
      }

      // Other shortcuts disabled when modal/dropdown/quickactions open
      if (showCallModal || showScriptDropdown || showQuickActions) return

      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key.toLowerCase()) {
        case 'l':
          e.preventDefault()
          setShowCallModal(true)
          break
        case 'p':
          e.preventDefault()
          onSkip()
          break
        case 'e':
          e.preventDefault()
          onEnd()
          break
        case 's':
          e.preventDefault()
          setShowScriptDropdown(prev => !prev)
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCallModal, showScriptDropdown, showQuickActions, onSkip, onEnd])

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
    setLastCallData(data)
    setShowQuickActions(true)
  }, [contact.contactId, createActivity, markedObjections])

  const handleQuickActionsDismiss = useCallback(() => {
    setShowQuickActions(false)
    if (lastCallData) {
      onCallComplete(lastCallData.outcome)
    }
    setLastCallData(null)
  }, [lastCallData, onCallComplete])

  const handleSelectScript = useCallback((script: QuickScript) => {
    if (onScriptChange) {
      onScriptChange(selectedScript?.id === script.id ? null : script)
    }
    setShowScriptDropdown(false)
  }, [onScriptChange, selectedScript])

  // Build script preview (first 2 lines, variables substituted)
  const scriptPreview = selectedScript ? (() => {
    const vars: Record<string, string> = {
      nome: contact.contactName || '',
      empresa: '',
      valor: '',
      produto: '',
    }
    const substituted = substituteVariables(selectedScript.template, vars)
    const lines = substituted.split('\n').filter(l => l.trim() && !l.startsWith('##'))
    return lines.slice(0, 2).join(' ').slice(0, 120) + (lines.length > 2 ? '...' : '')
  })() : null

  // Session stats chips
  const statsChips = sessionStats ? [
    { count: sessionStats.connected, label: 'Atenderam', color: 'text-green-400 bg-green-500/10' },
    { count: sessionStats.noAnswer, label: 'Não atenderam', color: 'text-red-400 bg-red-500/10' },
    { count: sessionStats.voicemail, label: 'Caixa postal', color: 'text-yellow-400 bg-yellow-500/10' },
    { count: sessionStats.busy, label: 'Ocupados', color: 'text-orange-400 bg-orange-500/10' },
    { count: sessionStats.skipped, label: 'Pulados', color: 'text-muted-foreground bg-accent/10' },
  ].filter(s => s.count > 0) : []

  return (
    <div className="space-y-4">
      {/* Progress bar with session stats */}
      <div className="max-w-lg mx-auto space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
          <span>Progresso da sessão</span>
          <span>{currentIndex + 1} / {totalCount}</span>
        </div>
        <div className="h-2 bg-muted dark:bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {statsChips.length > 0 && (
          <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
            {statsChips.map(({ count, label, color }) => (
              <span key={label} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${color}`}>
                {count} {label}
              </span>
            ))}
          </div>
        )}
        {/* CP-4.3: Daily goal mini-indicator */}
        {goalProgress && goalProgress.target > 0 && (
          <div className="flex items-center justify-center pt-0.5">
            <span className={`text-xs font-medium ${
              goalProgress.color === 'green' ? 'text-green-500' :
              goalProgress.color === 'yellow' ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {goalProgress.current}/{goalProgress.target} ligações hoje
            </span>
          </div>
        )}
      </div>

      {/* Contact card */}
      <div className="max-w-lg mx-auto bg-white dark:bg-card border border-border dark:border-border/50 rounded-xl p-5 space-y-4">
        {/* Contact info */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-500/10 flex items-center justify-center">
            <User size={22} className="text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              {contact.contactName || 'Sem nome'}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              {contact.contactPhone && (
                <span className="text-sm text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                  <Phone size={12} />
                  {contact.contactPhone}
                </span>
              )}
              {contact.contactEmail && (
                <span className="text-sm text-muted-foreground dark:text-muted-foreground flex items-center gap-1 truncate">
                  <Mail size={12} />
                  {contact.contactEmail}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {contact.contactStage && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground">
                  {contact.contactStage}
                </span>
              )}
              {temp && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground flex items-center gap-1">
                  {temp.icon}
                  {temp.label}
                </span>
              )}
              <LeadScoreBadge score={contact.leadScore} size="md" />
            </div>
          </div>
        </div>

        {/* Script dropdown selector */}
        {onScriptChange && scripts.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => setShowScriptDropdown(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                selectedScript
                  ? 'border-purple-500/30 bg-purple-500/5 text-purple-400'
                  : 'border-border dark:border-border/50 bg-background dark:bg-card/50 text-muted-foreground dark:text-muted-foreground hover:border-border dark:hover:border-border'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <FileText size={14} />
                {selectedScript ? selectedScript.title : 'Selecionar script de chamada'}
              </span>
              <ChevronDown size={14} className={`shrink-0 transition-transform ${showScriptDropdown ? 'rotate-180' : ''}`} />
            </Button>

            {/* Script preview */}
            {selectedScript && scriptPreview && !showScriptDropdown && (
              <p className="mt-1.5 text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed line-clamp-2 px-1">
                {scriptPreview}
              </p>
            )}

            {showScriptDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-card border border-border dark:border-border/50 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                {scripts.map((script) => {
                  const isSelected = selectedScript?.id === script.id
                  return (
                    <Button
                      key={script.id}
                      variant="unstyled"
                      size="unstyled"
                      onClick={() => handleSelectScript(script)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-card/50'
                      }`}
                    >
                      <span className="truncate">{script.title}</span>
                      {isSelected && <Check size={14} className="shrink-0 text-purple-400" />}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border dark:border-border/50">
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={() => setShowCallModal(true)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors relative"
          >
            <Phone size={20} />
            <span className="text-xs font-medium">Ligar</span>
            {selectedScript && (
              <span className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-white" />
            )}
          </Button>

          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onSkip}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg bg-muted dark:bg-card hover:bg-accent dark:hover:bg-accent text-secondary-foreground dark:text-muted-foreground transition-colors"
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

      {/* CP-2.2: Quick Actions Panel (shown after call log saved) */}
      {showQuickActions && lastCallData && (
        <QuickActionsPanel
          contactId={contact.contactId}
          contactName={contact.contactName || 'Sem nome'}
          contactPhone={contact.contactPhone}
          contactStage={contact.contactStage}
          outcome={lastCallData.outcome}
          callNotes={lastCallData.notes}
          onDismiss={handleQuickActionsDismiss}
          suggestedReturnTime={suggestedReturnTime}
        />
      )}

      {/* CP-2.1: Contact History panel */}
      {!showQuickActions && (
        <div className="max-w-lg mx-auto">
          <ContactHistory
            contactId={contact.contactId}
            defaultOpen={typeof window !== 'undefined' && window.innerWidth >= 768}
          />
        </div>
      )}

      {/* CallModal with script guide side panel */}
      <CallModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        onSave={handleCallSave}
        contactName={contact.contactName || 'Sem nome'}
        contactPhone={contact.contactPhone || ''}
        suggestedTitle={`Prospecção - ${contact.contactName || ''}`}
        isProspecting
        isAdminOrDirector={isAdminOrDirector}
        onManageTemplates={onManageTemplates}
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
