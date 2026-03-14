import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Phone, SkipForward, Square, Flame, Snowflake, Sun, User, Mail, FileText, ChevronDown, Check, Ban, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CallModal, CallLogData } from '@/features/inbox/components/CallModal'
import { ProspectingScriptGuide } from '@/features/prospecting/components/ProspectingScriptGuide'
import { ContactHistory } from '@/features/prospecting/components/ContactHistory'
import { QuickActionsPanel } from '@/features/prospecting/components/QuickActionsPanel'
import { DoNotContactModal } from '@/features/prospecting/components/DoNotContactModal'
import { useQuickScripts } from '@/features/inbox/hooks/useQuickScripts'
import { useCreateActivity } from '@/lib/query/hooks/useActivitiesQuery'
import { getOpenDealsByContact } from '@/lib/supabase/deals'
import { substituteVariables } from '@/features/prospecting/utils/scriptParser'
import type { ProspectingQueueItem } from '@/types'
import { LeadScoreBadge } from '@/features/prospecting/components/LeadScoreBadge'
import type { QuickScript } from '@/lib/supabase/quickScripts'
import type { SessionStats } from '@/features/prospecting/ProspectingPage'
import type { GoalProgress } from '@/features/prospecting/hooks/useProspectingGoals'
import { useOptionalToast } from '@/context/ToastContext'
import type { SuggestedTime } from '@/features/prospecting/utils/suggestBestTime'
import { useContactAttempts, formatRelativeDate, OUTCOME_LABELS, getAttemptColorClass } from '@/features/prospecting/hooks/useContactAttempts'


interface PowerDialerProps {
  contact: ProspectingQueueItem
  currentIndex: number
  totalCount: number
  onCallComplete: (outcome: string) => void
  onSkip: (reason?: string) => void
  onAdvance?: () => void
  onEnd: () => void
  pendingCount?: number
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
  onAdvance,
  onEnd,
  pendingCount = 0,
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
  const [showSkipDropdown, setShowSkipDropdown] = useState(false)
  const [showDoNotContactModal, setShowDoNotContactModal] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [lastCallData, setLastCallData] = useState<CallLogData | null>(null)
  const [calledContact, setCalledContact] = useState<{ id: string; name: string; phone?: string; stage?: string } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const skipDropdownRef = useRef<HTMLDivElement>(null)
  const goalCelebratedRef = useRef(false)
  const lastActivityIdRef = useRef<string | null>(null)
  const createActivity = useCreateActivity()
  const { scripts } = useQuickScripts()
  const { addToast } = useOptionalToast()
  const attempts = useContactAttempts(contact.contactId)

  // CP-4.3: Celebrate when daily goal is reached (once per mount)
  useEffect(() => {
    if (goalProgress?.isComplete && !goalCelebratedRef.current) {
      goalCelebratedRef.current = true
      addToast(`Meta atingida! Você completou ${goalProgress.target} ligações hoje.`, 'success')
    }
  }, [goalProgress?.isComplete, goalProgress?.target, addToast])

  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0
  const temp = contact.contactTemperature ? TEMP_DISPLAY[contact.contactTemperature] : null

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showScriptDropdown && !showSkipDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (showScriptDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowScriptDropdown(false)
      }
      if (showSkipDropdown && skipDropdownRef.current && !skipDropdownRef.current.contains(e.target as Node)) {
        setShowSkipDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showScriptDropdown, showSkipDropdown])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes dropdowns
      if (e.key === 'Escape' && (showScriptDropdown || showSkipDropdown)) {
        e.preventDefault()
        setShowScriptDropdown(false)
        setShowSkipDropdown(false)
        return
      }

      // Other shortcuts disabled when modal/dropdown/quickactions open
      if (showCallModal || showScriptDropdown || showSkipDropdown || showQuickActions) return

      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key.toLowerCase()) {
        case 'l':
          e.preventDefault()
          setShowCallModal(true)
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
  }, [showCallModal, showScriptDropdown, showSkipDropdown, showQuickActions, onEnd])

  const handleCallSave = useCallback(async (data: CallLogData) => {
    // CP-5.1: Best-effort deal auto-linking
    let linkedDealId: string | undefined
    let linkedDealTitle = ''
    try {
      const deal = await getOpenDealsByContact(contact.contactId)
      if (deal) {
        linkedDealId = deal.id
        linkedDealTitle = deal.title
      }
    } catch {
      // Best-effort: if lookup fails, create activity without deal
    }

    try {
      const result = await createActivity.mutateAsync({
        activity: {
          title: data.title,
          description: data.notes || undefined,
          type: 'CALL',
          date: new Date().toISOString(),
          completed: true,
          contactId: contact.contactId,
          dealId: linkedDealId,
          dealTitle: linkedDealTitle,
          user: { name: 'Você', avatar: '' },
          metadata: {
            outcome: data.outcome,
            duration_seconds: data.duration,
            source: 'prospecting',
            ...(markedObjections.length > 0 && { objections: markedObjections }),
          },
        },
      })

      // CP-5.1: Store activity ID for retroactive deal linking via QuickActionsPanel
      lastActivityIdRef.current = result.id
    } catch {
      // Activity creation failed — proceed to avoid user stuck in modal
    }

    setShowCallModal(false)
    setMarkedObjections([])
    setLastCallData(data)
    // Snapshot contact data before queue advances to next
    setCalledContact({
      id: contact.contactId,
      name: contact.contactName || 'Sem nome',
      phone: contact.contactPhone,
      stage: contact.contactStage,
    })
    setShowQuickActions(true)

    // Mark queue item immediately — don't wait for QuickActions dismiss.
    // This ensures the queue advances even if the user closes the page,
    // ends the session, or navigates away before clicking "Avançar".
    onCallComplete(data.outcome)
  }, [contact.contactId, contact.contactName, contact.contactPhone, contact.contactStage, createActivity, markedObjections, onCallComplete])

  const handleQuickActionsDismiss = useCallback(() => {
    setShowQuickActions(false)
    setLastCallData(null)
    setCalledContact(null)
    // CP-7.4: If no more pending contacts, end session → show summary
    if (pendingCount === 0) {
      onEnd()
    }
  }, [pendingCount, onEnd])

  // CP-7.1: Skip with reason
  const handleSkipWithReason = useCallback((reason: string) => {
    setShowSkipDropdown(false)
    onSkip(reason)
  }, [onSkip])

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
              <span key={label} className={`inline-flex items-center gap-1 text-1xs font-medium px-2 py-0.5 rounded-full ${color}`}>
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
            {/* CP-7.2: Call attempts badge */}
            {attempts.count > 0 && (
              <p
                className={`flex items-center gap-1 text-xs mt-1.5 ${getAttemptColorClass(attempts.count)}`}
                aria-label={`${attempts.count} tentativas de ligação anteriores`}
              >
                <PhoneCall size={12} />
                <span>
                  {attempts.count}a tentativa
                  {attempts.lastAttempt && (
                    <> — ultima: {formatRelativeDate(attempts.lastAttempt.date)} ({OUTCOME_LABELS[attempts.lastAttempt.outcome] ?? attempts.lastAttempt.outcome})</>
                  )}
                </span>
              </p>
            )}
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

          {/* CP-7.1: Skip dropdown with reasons */}
          <div className="relative" ref={skipDropdownRef}>
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => !showQuickActions && setShowSkipDropdown(prev => !prev)}
              disabled={showQuickActions}
              title={showQuickActions ? 'Registre ou avance pelo painel abaixo' : undefined}
              className={`w-full flex flex-col items-center gap-1.5 py-3 rounded-lg transition-colors ${
                showQuickActions
                  ? 'opacity-50 cursor-not-allowed bg-muted dark:bg-card text-secondary-foreground dark:text-muted-foreground'
                  : 'bg-muted dark:bg-card hover:bg-accent dark:hover:bg-accent text-secondary-foreground dark:text-muted-foreground'
              }`}
            >
              <SkipForward size={20} />
              <span className="text-xs font-medium">Pular</span>
            </Button>
            {showSkipDropdown && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 w-48 bg-white dark:bg-card border border-border dark:border-border/50 rounded-lg shadow-xl overflow-hidden">
                {[
                  { label: 'Número errado', value: 'Numero errado' },
                  { label: 'Já tentei hoje', value: 'Ja tentei hoje' },
                  { label: 'Não é hora boa', value: 'Nao e hora boa' },
                  { label: 'Sem interesse', value: 'Sem interesse' },
                  { label: 'Outro', value: 'Outro' },
                ].map(({ label, value }) => (
                  <Button
                    key={value}
                    variant="unstyled"
                    size="unstyled"
                    onClick={() => handleSkipWithReason(value)}
                    className="w-full px-3 py-2 text-left text-sm text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-card/50 transition-colors"
                  >
                    {label}
                  </Button>
                ))}
                <div className="border-t border-border dark:border-border/50">
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={() => { setShowSkipDropdown(false); setShowDoNotContactModal(true) }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                  >
                    <Ban size={14} />
                    Não ligar mais
                  </Button>
                </div>
              </div>
            )}
          </div>

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
      {showQuickActions && lastCallData && calledContact && (
        <QuickActionsPanel
          contactId={calledContact.id}
          contactName={calledContact.name}
          contactPhone={calledContact.phone}
          contactStage={calledContact.stage}
          outcome={lastCallData.outcome}
          callNotes={lastCallData.notes}
          onDismiss={handleQuickActionsDismiss}
          suggestedReturnTime={suggestedReturnTime}
          lastActivityId={lastActivityIdRef.current}
        />
      )}

      {/* CP-2.1: Contact History panel */}
      {!showQuickActions && (
        <div className="max-w-lg mx-auto">
          <ContactHistory
            contactId={contact.contactId}
            defaultOpen={typeof window !== 'undefined' && window.innerWidth >= 768}
            doNotContact={contact.doNotContact}
          />
        </div>
      )}

      {/* CP-7.1: Do Not Contact modal (reused from skip dropdown) */}
      <DoNotContactModal
        isOpen={showDoNotContactModal}
        onClose={() => setShowDoNotContactModal(false)}
        contactId={contact.contactId}
        onBlocked={() => { setShowDoNotContactModal(false); onAdvance ? onAdvance() : onSkip('do_not_contact') }}
      />

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
