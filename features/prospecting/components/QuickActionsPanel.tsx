import React, { useState, useMemo, useCallback } from 'react'
import {
  Briefcase,
  CalendarClock,
  ArrowRightLeft,
  X,
  Loader2,
  Check,
  Ban,
  Pencil,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { CreateDealModal } from '@/features/boards/components/Modals/CreateDealModal'
import { DealDetailModal } from '@/features/boards/components/deal-detail/DealDetailModal'
import { DoNotContactModal } from '@/features/prospecting/components/DoNotContactModal'
import { NoteTemplatesManager } from '@/features/prospecting/components/NoteTemplatesManager'
import { useCreateActivity, useUpdateActivity } from '@/lib/query/hooks/useActivitiesQuery'
import { contactsService } from '@/lib/supabase'
import { getOpenDealsByContact, dealsService } from '@/lib/supabase/deals'
import type { OpenDeal } from '@/lib/supabase/deals'
import { useBoards } from '@/features/prospecting/hooks/useBoards'
import { useSettings } from '@/context/settings/SettingsContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { CallLogData } from '@/features/inbox/components/CallModal'
import type { SuggestedTime } from '@/features/prospecting/utils/suggestBestTime'

type Outcome = CallLogData['outcome']

interface QuickActionsPanelProps {
  contactId: string
  contactName: string
  contactPhone?: string
  contactStage?: string
  outcome: Outcome
  callNotes?: string
  onDismiss: () => void
  suggestedReturnTime?: SuggestedTime | null
  lastActivityId?: string | null
}

const ACTIONS_BY_OUTCOME: Record<Outcome, Array<'create_deal' | 'schedule_return' | 'move_stage'>> = {
  connected: ['create_deal', 'schedule_return', 'move_stage'],
  no_answer: ['schedule_return'],
  voicemail: ['schedule_return'],
  busy: ['schedule_return'],
}

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function getNextBusinessDay(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  // Skip weekends
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1)
  }
  date.setHours(10, 0, 0, 0)
  return date
}

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  contactId,
  contactName,
  contactPhone,
  contactStage,
  outcome,
  callNotes,
  onDismiss,
  suggestedReturnTime,
  lastActivityId,
}) => {
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showTemplatesManager, setShowTemplatesManager] = useState(false)
  const [showDoNotContactModal, setShowDoNotContactModal] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [isMovingStage, setIsMovingStage] = useState(false)
  const [selectedStage, setSelectedStage] = useState('')
  const [stageUpdated, setStageUpdated] = useState(false)
  const [returnScheduled, setReturnScheduled] = useState(false)
  const [dealCreated, setDealCreated] = useState(false)
  const [showReturnPicker, setShowReturnPicker] = useState(false)
  const [showFollowupPrompt, setShowFollowupPrompt] = useState(false)

  // CP-7.3: Deal state
  const queryClient = useQueryClient()
  const [showDealDetail, setShowDealDetail] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState('')
  const [selectedDealStage, setSelectedDealStage] = useState('')
  const [isMovingDealStage, setIsMovingDealStage] = useState(false)

  const { data: openDeal = null, isLoading: isDealLoading, isError: dealFetchError } = useQuery<OpenDeal | null>({
    queryKey: ['openDeal', contactId],
    queryFn: () => getOpenDealsByContact(contactId),
    enabled: !!contactId,
  })

  // Sync selectedBoardId when deal loads
  React.useEffect(() => {
    if (openDeal?.board_id && !selectedBoardId) {
      setSelectedBoardId(openDeal.board_id)
    }
  }, [openDeal, selectedBoardId])

  const { boards } = useBoards()
  const selectedBoardStages = useMemo(() => {
    const board = boards.find(b => b.id === selectedBoardId)
    return board?.stages ?? []
  }, [boards, selectedBoardId])

  // CP-7.3: Refetch deal helper
  const refetchDeal = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['openDeal', contactId] })
  }, [contactId, queryClient])

  const [returnDate, setReturnDate] = useState(() => {
    const d = suggestedReturnTime?.suggestedDate ?? getNextBusinessDay()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })

  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity()
  const { lifecycleStages } = useSettings()
  const { profile } = useAuth()
  const { addToast } = useToast()
  const isAdminOrDirector = profile?.role === 'admin' || profile?.role === 'diretor'

  // CP-7.3: Move deal stage handler
  const handleMoveDealStage = useCallback(async () => {
    if (!openDeal || !selectedDealStage || !selectedBoardId) return
    setIsMovingDealStage(true)
    try {
      const updates: Record<string, unknown> = { status: selectedDealStage }
      if (selectedBoardId !== openDeal.board_id) {
        updates.boardId = selectedBoardId
      }
      const { error } = await dealsService.update(openDeal.id, updates)
      if (error) throw error
      const newStageName = selectedBoardStages.find(s => s.id === selectedDealStage)?.name || ''
      const newBoardName = boards.find(b => b.id === selectedBoardId)?.name || ''
      // Update the query cache optimistically
      queryClient.setQueryData<OpenDeal | null>(['openDeal', contactId], (prev) =>
        prev ? { ...prev, stage_id: selectedDealStage, stage_name: newStageName, board_id: selectedBoardId } : null
      )
      setSelectedDealStage('')
      setStageUpdated(true)
      addToast(`Deal movido para ${newBoardName} → ${newStageName}`, 'success')
    } catch {
      addToast('Erro ao mover deal', 'error')
    } finally {
      setIsMovingDealStage(false)
    }
  }, [openDeal, selectedDealStage, selectedBoardId, selectedBoardStages, boards, addToast, queryClient, contactId])

  const availableActions = ACTIONS_BY_OUTCOME[outcome] || []

  const otherStages = useMemo(() => {
    return lifecycleStages.filter(s => s.id !== contactStage && s.name !== contactStage)
  }, [lifecycleStages, contactStage])

  const handleScheduleReturn = async () => {
    setIsScheduling(true)
    try {
      const scheduledDate = new Date(returnDate)
      await createActivity.mutateAsync({
        activity: {
          title: `Retorno - ${contactName}`,
          description: callNotes || undefined,
          type: 'CALL',
          date: scheduledDate.toISOString(),
          completed: false,
          contactId,
          dealTitle: '',
          user: { name: 'Você', avatar: '' },
          metadata: { source: 'prospecting', scheduled_return: true },
        },
      })
      setReturnScheduled(true)
      addToast(`Retorno agendado para ${scheduledDate.toLocaleDateString('pt-BR')} às ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 'success')
    } catch {
      addToast('Erro ao agendar retorno', 'error')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleMoveStage = async () => {
    if (!selectedStage) return
    setIsMovingStage(true)
    try {
      const stage = lifecycleStages.find(s => s.id === selectedStage)
      const { error } = await contactsService.update(contactId, { stage: selectedStage })
      if (error) throw error
      setStageUpdated(true)
      addToast(`Stage atualizado para ${stage?.name || selectedStage}`, 'success')
    } catch {
      addToast('Erro ao atualizar stage', 'error')
    } finally {
      setIsMovingStage(false)
    }
  }

  const handleDealCreated = (dealId: string) => {
    setShowCreateDeal(false)
    setDealCreated(true)
    addToast('Negócio criado com sucesso', 'success')

    // CP-7.3: Refetch deal to show the newly created deal card
    refetchDeal()

    // CP-5.1: Retroactively link the last call activity to the new deal
    if (lastActivityId && dealId) {
      updateActivity.mutate(
        { id: lastActivityId, updates: { dealId } },
        {
          onError: () => {
            addToast('Ligação criada, mas não foi possível vincular ao negócio', 'warning')
          },
        },
      )
    }
  }

  // CP-6.2: Show confirmation prompt when dismissing connected call with no action taken
  const handleDismiss = useCallback(() => {
    const noActionTaken = !dealCreated && !returnScheduled && !stageUpdated

    if (outcome === 'connected' && noActionTaken) {
      setShowFollowupPrompt(true)
      return
    }

    onDismiss()
  }, [dealCreated, returnScheduled, stageUpdated, outcome, onDismiss])

  // CP-6.2: Schedule return from confirmation prompt, then dismiss
  const handleConfirmSchedule = useCallback(async () => {
    const returnDateValue = suggestedReturnTime?.suggestedDate ?? getNextBusinessDay()

    try {
      await createActivity.mutateAsync({
        activity: {
          title: `Retorno - ${contactName}`,
          type: 'CALL',
          date: returnDateValue.toISOString(),
          completed: false,
          contactId,
          dealTitle: '',
          user: { name: 'Você', avatar: '' },
          metadata: { source: 'auto_followup', suggested_by: 'suggestBestTime', scheduled_return: true },
        },
      })

      const formattedDate = returnDateValue.toLocaleDateString('pt-BR')
      const formattedTime = returnDateValue.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      addToast(`Retorno agendado para ${formattedDate} às ${formattedTime}`, 'success')
    } catch {
      // Best-effort — if it fails, proceed without scheduling
    }

    onDismiss()
  }, [suggestedReturnTime, contactName, contactId, createActivity, addToast, onDismiss])

  return (
    <>
      <div className="max-w-lg mx-auto bg-white dark:bg-card border border-border dark:border-border/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Próximos Passos
          </h3>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onDismiss}
            className="p-1 rounded-md text-muted-foreground hover:text-secondary-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card transition-colors"
            aria-label="Dispensar"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* CP-7.3: Deal block */}
          {availableActions.includes('create_deal') && !dealFetchError && (
            <>
              {isDealLoading ? (
                <div className="rounded-lg border border-border dark:border-border/50 px-3 py-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-[18px] h-[18px] rounded bg-muted dark:bg-muted/50" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 rounded bg-muted dark:bg-muted/50" />
                      <div className="h-3 w-36 rounded bg-muted dark:bg-muted/50" />
                    </div>
                  </div>
                </div>
              ) : openDeal ? (
                <div className="rounded-lg border border-border dark:border-border/50">
                  {/* Deal card header */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Briefcase size={18} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground truncate" title={openDeal.title}>
                        {openDeal.title.length > 40 ? `${openDeal.title.slice(0, 40)}…` : openDeal.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {openDeal.value != null && (
                          <span>{brlFormatter.format(openDeal.value)}</span>
                        )}
                        {openDeal.stage_name && (
                          <>
                            <span>·</span>
                            <span>{openDeal.stage_name}</span>
                          </>
                        )}
                        {openDeal.product_name && (
                          <>
                            <span>·</span>
                            <span className="truncate">{openDeal.product_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      onClick={() => setShowDealDetail(true)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-secondary-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-card/50 transition-colors"
                      aria-label="Editar deal"
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>

                </div>
              ) : (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  onClick={() => setShowCreateDeal(true)}
                  disabled={dealCreated}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    dealCreated
                      ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'border-border dark:border-border/50 hover:bg-background dark:hover:bg-card/50 text-secondary-foreground dark:text-muted-foreground'
                  }`}
                >
                  {dealCreated ? <Check size={18} /> : <Briefcase size={18} className="text-blue-500" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{dealCreated ? 'Negócio criado' : '+ Criar Deal'}</span>
                    {!dealCreated && (
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground">Nenhum deal vinculado</p>
                    )}
                  </div>
                </Button>
              )}
            </>
          )}

          {/* Agendar Retorno */}
          {availableActions.includes('schedule_return') && (
            <div className={`rounded-lg border transition-colors ${
              returnScheduled
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-border dark:border-border/50'
            }`}>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => setShowReturnPicker(true)}
                disabled={returnScheduled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${
                  returnScheduled
                    ? 'text-green-600 dark:text-green-400'
                    : 'hover:bg-background dark:hover:bg-card/50 text-secondary-foreground dark:text-muted-foreground'
                }`}
              >
                {returnScheduled ? (
                  <Check size={18} />
                ) : (
                  <CalendarClock size={18} className="text-primary-500" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{returnScheduled ? 'Retorno agendado' : 'Agendar Retorno'}</span>
                  {!returnScheduled && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">Selecione data e hora</p>
                  )}
                </div>
              </Button>
              {showReturnPicker && !returnScheduled && (
                <div className="px-3 pb-2.5 space-y-2">
                  {suggestedReturnTime && (
                    <p className="text-xs text-primary-500 font-medium">
                      Sugerido: {suggestedReturnTime.suggestedDay} as {suggestedReturnTime.suggestedHour}:00 (taxa de conexao: {suggestedReturnTime.connectionRate}%)
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="flex-1 text-xs bg-background dark:bg-card/50 border border-border dark:border-border/50 rounded-md px-2 py-1.5 text-secondary-foreground dark:text-muted-foreground outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      onClick={handleScheduleReturn}
                      disabled={isScheduling}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-40"
                    >
                      {isScheduling ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mover Etapa — pipeline + stage do deal */}
          {availableActions.includes('move_stage') && openDeal && !isDealLoading && (
            <div className="rounded-lg border border-border dark:border-border/50">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <ArrowRightLeft size={18} className="text-purple-500" />
                <span className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">Mover Etapa</span>
              </div>
              <div className="px-3 pb-2.5 space-y-2">
                <select
                  value={selectedBoardId}
                  onChange={(e) => { setSelectedBoardId(e.target.value); setSelectedDealStage('') }}
                  className="w-full text-xs bg-background dark:bg-card/50 border border-border dark:border-border/50 rounded-md px-2 py-1.5 text-secondary-foreground dark:text-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50"
                  aria-label="Selecionar pipeline"
                >
                  <option value="">Selecionar pipeline...</option>
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {selectedBoardId && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDealStage}
                      onChange={(e) => setSelectedDealStage(e.target.value)}
                      className="flex-1 text-xs bg-background dark:bg-card/50 border border-border dark:border-border/50 rounded-md px-2 py-1.5 text-secondary-foreground dark:text-muted-foreground outline-none focus:ring-2 focus:ring-purple-500/50"
                      aria-label="Selecionar etapa"
                    >
                      <option value="">Selecionar etapa...</option>
                      {selectedBoardStages
                        .filter(s => !(s.id === openDeal.stage_id && selectedBoardId === openDeal.board_id))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <Button
                      variant="unstyled"
                      size="unstyled"
                      onClick={handleMoveDealStage}
                      disabled={!selectedDealStage || isMovingDealStage}
                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isMovingDealStage ? <Loader2 size={12} className="animate-spin" /> : 'Mover'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* CP-7.1: Nao ligar mais */}
          <div className="pt-1 border-t border-border dark:border-border/50">
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => setShowDoNotContactModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors text-left"
            >
              <Ban size={18} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">Não ligar mais</span>
                <p className="text-xs text-red-500/70 dark:text-red-400/60">Bloquear contato permanentemente</p>
              </div>
            </Button>
          </div>
        </div>

        {/* Admin: manage templates */}
        {isAdminOrDirector && (
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setShowTemplatesManager(true)}
            className="w-full py-1.5 text-xs text-muted-foreground dark:text-muted-foreground hover:text-primary-500 dark:hover:text-primary-400 transition-colors text-center"
          >
            Gerenciar templates de notas
          </Button>
        )}

        {/* Dismiss / Follow-up prompt */}
        {showFollowupPrompt ? (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-center text-muted-foreground">
              Nenhuma ação registrada para este lead conectado. Agendar retorno?
            </p>
            <div className="flex gap-2">
              <Button
                variant="unstyled"
                size="sm"
                onClick={handleConfirmSchedule}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Sim, agendar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
                className="flex-1"
              >
                Não, avançar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="unstyled"
            size="sm"
            onClick={handleDismiss}
            aria-label="Avançar para o próximo lead"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Avançar →
          </Button>
        )}
      </div>

      {/* CreateDealModal */}
      {showCreateDeal && (
        <CreateDealModal
          isOpen={showCreateDeal}
          onClose={() => setShowCreateDeal(false)}
          onCreated={handleDealCreated}
          initialContactId={contactId}
        />
      )}

      {/* NoteTemplatesManager modal (admin/director only) */}
      <NoteTemplatesManager
        isOpen={showTemplatesManager}
        onClose={() => setShowTemplatesManager(false)}
      />

      {/* CP-7.1: Do Not Contact confirmation modal */}
      <DoNotContactModal
        isOpen={showDoNotContactModal}
        onClose={() => setShowDoNotContactModal(false)}
        contactId={contactId}
        onBlocked={onDismiss}
      />

      {/* CP-7.3: Deal detail modal for editing */}
      {openDeal && (
        <DealDetailModal
          dealId={openDeal.id}
          isOpen={showDealDetail}
          onClose={() => { setShowDealDetail(false); refetchDeal() }}
        />
      )}
    </>
  )
}
