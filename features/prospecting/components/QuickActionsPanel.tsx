import React, { useState, useMemo } from 'react'
import {
  Briefcase,
  CalendarClock,
  ArrowRightLeft,
  X,
  Loader2,
  Check,
} from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import { CreateDealModal } from '@/features/boards/components/Modals/CreateDealModal'
import { NoteTemplatesManager } from '@/features/prospecting/components/NoteTemplatesManager'
import { useCreateActivity } from '@/lib/query/hooks/useActivitiesQuery'
import { contactsService } from '@/lib/supabase'
import { useSettings } from '@/context/settings/SettingsContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { CallLogData } from '@/features/inbox/components/CallModal'

type Outcome = CallLogData['outcome']

interface QuickActionsPanelProps {
  contactId: string
  contactName: string
  contactPhone?: string
  contactStage?: string
  outcome: Outcome
  callNotes?: string
  onDismiss: () => void
}

const ACTIONS_BY_OUTCOME: Record<Outcome, Array<'create_deal' | 'schedule_return' | 'move_stage'>> = {
  connected: ['create_deal', 'schedule_return', 'move_stage'],
  no_answer: ['schedule_return'],
  voicemail: ['schedule_return'],
  busy: ['schedule_return'],
}

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
}) => {
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showTemplatesManager, setShowTemplatesManager] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [isMovingStage, setIsMovingStage] = useState(false)
  const [selectedStage, setSelectedStage] = useState('')
  const [stageUpdated, setStageUpdated] = useState(false)
  const [returnScheduled, setReturnScheduled] = useState(false)
  const [dealCreated, setDealCreated] = useState(false)
  const [showReturnPicker, setShowReturnPicker] = useState(false)
  const [returnDate, setReturnDate] = useState(() => {
    const d = getNextBusinessDay()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T10:00`
  })

  const createActivity = useCreateActivity()
  const { lifecycleStages } = useSettings()
  const { profile } = useAuth()
  const { addToast, showToast } = useToast()
  const toast = addToast || showToast
  const isAdminOrDirector = profile?.role === 'admin' || profile?.role === 'diretor'

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
      toast(`Retorno agendado para ${scheduledDate.toLocaleDateString('pt-BR')} às ${scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 'success')
    } catch {
      toast('Erro ao agendar retorno', 'error')
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
      toast(`Stage atualizado para ${stage?.name || selectedStage}`, 'success')
    } catch {
      toast('Erro ao atualizar stage', 'error')
    } finally {
      setIsMovingStage(false)
    }
  }

  const handleDealCreated = () => {
    setShowCreateDeal(false)
    setDealCreated(true)
    toast('Negócio criado com sucesso', 'success')
  }

  return (
    <>
      <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Próximos Passos
          </h3>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Dispensar"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Criar Negócio */}
          {availableActions.includes('create_deal') && (
            <Button
              variant="unstyled"
              size="unstyled"
              onClick={() => setShowCreateDeal(true)}
              disabled={dealCreated}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                dealCreated
                  ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
              }`}
            >
              {dealCreated ? <Check size={18} /> : <Briefcase size={18} className="text-blue-500" />}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{dealCreated ? 'Negócio criado' : 'Criar Negócio'}</span>
                {!dealCreated && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">Abre formulário pré-preenchido</p>
                )}
              </div>
            </Button>
          )}

          {/* Agendar Retorno */}
          {availableActions.includes('schedule_return') && (
            <div className={`rounded-lg border transition-colors ${
              returnScheduled
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-slate-200 dark:border-slate-700/50'
            }`}>
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={() => setShowReturnPicker(true)}
                disabled={returnScheduled}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${
                  returnScheduled
                    ? 'text-green-600 dark:text-green-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
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
                    <p className="text-xs text-slate-400 dark:text-slate-500">Selecione data e hora</p>
                  )}
                </div>
              </Button>
              {showReturnPicker && !returnScheduled && (
                <div className="px-3 pb-2.5 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-md px-2 py-1.5 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary-500/50"
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
              )}
            </div>
          )}

          {/* Mover Stage */}
          {availableActions.includes('move_stage') && (
            <div className={`rounded-lg border transition-colors ${
              stageUpdated
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-slate-200 dark:border-slate-700/50'
            }`}>
              <div className="flex items-center gap-3 px-3 py-2.5">
                {stageUpdated ? (
                  <Check size={18} className="text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowRightLeft size={18} className="text-purple-500" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium ${stageUpdated ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {stageUpdated ? 'Stage atualizado' : 'Mover Stage'}
                  </span>
                </div>
              </div>
              {!stageUpdated && otherStages.length > 0 && (
                <div className="px-3 pb-2.5 flex items-center gap-2">
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-md px-2 py-1.5 text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="">Selecionar stage...</option>
                    {otherStages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={handleMoveStage}
                    disabled={!selectedStage || isMovingStage}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-500 hover:bg-purple-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isMovingStage ? <Loader2 size={12} className="animate-spin" /> : 'Mover'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin: manage templates */}
        {isAdminOrDirector && (
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setShowTemplatesManager(true)}
            className="w-full py-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors text-center"
          >
            Gerenciar templates de notas
          </Button>
        )}

        {/* Dismiss button */}
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={onDismiss}
          className="w-full py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-center"
        >
          Pular e avançar →
        </Button>
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
    </>
  )
}
