import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  SkipForward,
  Phone,
  Clock,
  BarChart3,
  Voicemail,
  PhoneOff,
  Briefcase,
  CalendarClock,
  AlertTriangle,
  MessageCircle,
  Ban,
  Loader2,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateDealModal } from '@/features/boards/components/Modals/CreateDealModal'
import { DoNotContactModal } from '@/features/prospecting/components/DoNotContactModal'
import { supabase } from '@/lib/supabase/client'
import type { SessionStats, SessionContact } from '../ProspectingPage'

interface SessionSummaryProps {
  stats: SessionStats
  startTime: Date | null
  onClose: () => void
  sessionContacts?: SessionContact[]
}

interface ConnectedWithoutDeal {
  contactId: string
  contactName: string
  contactPhone: string
}

interface ScheduledReturn {
  contactId: string
  contactName: string
  date: string
}

interface ExhaustedContact {
  contactId: string
  contactName: string
  contactPhone: string
  attempts: number
}

const formatWhatsAppLink = (phone: string): string | null => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 10) return null
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  return `https://wa.me/${withCountry}`
}

function formatRelativeTime(dateStr: string): { text: string; isOverdue: boolean } {
  const target = new Date(dateStr)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (diffMs < 0) {
    return { text: 'Atrasado', isOverdue: true }
  }

  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) {
    return { text: `em ${diffMins}min`, isOverdue: false }
  }

  const diffHours = Math.floor(diffMins / 60)
  return { text: `em ${diffHours}h`, isOverdue: false }
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  stats,
  startTime,
  onClose,
  sessionContacts = [],
}) => {
  const elapsed = startTime
    ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
    : 0

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) return `${mins}min ${secs}s`
    return `${secs}s`
  }

  // --- Actionable blocks state ---
  const [connectedWithoutDeal, setConnectedWithoutDeal] = useState<ConnectedWithoutDeal[]>([])
  const [scheduledReturns, setScheduledReturns] = useState<ScheduledReturn[]>([])
  const [exhaustedContacts, setExhaustedContacts] = useState<ExhaustedContact[]>([])
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(sessionContacts.length > 0)

  // --- Modal state ---
  const [createDealContactId, setCreateDealContactId] = useState<string | null>(null)
  const [doNotContactId, setDoNotContactId] = useState<string | null>(null)

  // --- Fetch actionable data ---
  useEffect(() => {
    if (sessionContacts.length === 0) return

    let cancelled = false
    setIsLoadingBlocks(true)

    const fetchBlocks = async () => {
      // Block 1: Connected contacts without open deal
      const connectedContacts = sessionContacts.filter(c => c.outcome === 'connected')
      let withoutDeal: ConnectedWithoutDeal[] = []

      if (connectedContacts.length > 0 && supabase) {
        const connectedContactIds = connectedContacts.map(c => c.contactId)
        // Note: organization_id filtering enforced by RLS policy on deals table.
        // No explicit .eq('organization_id', ...) needed — the authenticated user's
        // JWT claims restrict visibility to their organization automatically.
        const { data: openDeals } = await supabase
          .from('deals')
          .select('contact_id')
          .in('contact_id', connectedContactIds)
          .eq('is_won', false)
          .eq('is_lost', false)
          .is('deleted_at', null)

        const contactsWithDeal = new Set((openDeals || []).map(d => d.contact_id))
        withoutDeal = connectedContacts
          .filter(c => !contactsWithDeal.has(c.contactId))
          .map(c => ({
            contactId: c.contactId,
            contactName: c.contactName,
            contactPhone: c.contactPhone,
          }))
      }

      // Block 2: Scheduled returns for today (from session contacts)
      const sessionContactIds = sessionContacts.map(c => c.contactId)
      let returns: ScheduledReturn[] = []

      if (supabase && sessionContactIds.length > 0) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        const { data: returnData } = await supabase
          .from('activities')
          .select('contact_id, date')
          .in('contact_id', sessionContactIds)
          .eq('type', 'CALL')
          .eq('metadata->>scheduled_return', 'true')
          .eq('completed', false)
          .gte('date', todayStart.toISOString())
          .lte('date', todayEnd.toISOString())
          .order('date', { ascending: true })

        if (returnData) {
          const contactNameMap = new Map(sessionContacts.map(c => [c.contactId, c.contactName]))
          returns = returnData.map(r => ({
            contactId: r.contact_id,
            contactName: contactNameMap.get(r.contact_id) || '',
            date: r.date,
          }))
        }
      }

      // Block 3: Exhausted attempts (3+ calls without success)
      const nonConnectedContacts = sessionContacts.filter(c => c.outcome !== 'connected')
      let exhausted: ExhaustedContact[] = []

      if (supabase && nonConnectedContacts.length > 0) {
        const nonConnectedIds = nonConnectedContacts.map(c => c.contactId)
        const { data: attemptData } = await supabase
          .from('activities')
          .select('contact_id')
          .in('contact_id', nonConnectedIds)
          .eq('type', 'CALL')

        if (attemptData) {
          const attemptCounts = new Map<string, number>()
          for (const row of attemptData) {
            attemptCounts.set(row.contact_id, (attemptCounts.get(row.contact_id) || 0) + 1)
          }

          const contactMap = new Map(nonConnectedContacts.map(c => [c.contactId, c]))
          exhausted = Array.from(attemptCounts.entries())
            .filter(([id, count]) => count >= 3 && contactMap.has(id))
            .map(([id, count]) => {
              const contact = contactMap.get(id)
              return {
                contactId: id,
                contactName: contact?.contactName || '',
                contactPhone: contact?.contactPhone || '',
                attempts: count,
              }
            })
            .sort((a, b) => b.attempts - a.attempts)
        }
      }

      if (!cancelled) {
        setConnectedWithoutDeal(withoutDeal)
        setScheduledReturns(returns)
        setExhaustedContacts(exhausted)
        setIsLoadingBlocks(false)
      }
    }

    fetchBlocks().catch(() => {
      if (!cancelled) setIsLoadingBlocks(false)
    })

    return () => { cancelled = true }
  }, [sessionContacts])

  const handleDealCreated = useCallback((contactId: string) => {
    setCreateDealContactId(null)
    setConnectedWithoutDeal(prev => prev.filter(c => c.contactId !== contactId))
  }, [])

  const handleDoNotContactBlocked = useCallback(() => {
    if (doNotContactId) {
      setExhaustedContacts(prev => prev.filter(c => c.contactId !== doNotContactId))
    }
    setDoNotContactId(null)
  }, [doNotContactId])

  const hasAnyPending = connectedWithoutDeal.length > 0 || scheduledReturns.length > 0 || exhaustedContacts.length > 0
  const showNoPendingMessage = !isLoadingBlocks && sessionContacts.length > 0 && !hasAnyPending

  const statItems = [
    {
      icon: <Phone size={16} className="text-muted-foreground" />,
      label: 'Total de ligações',
      value: stats.completed,
    },
    {
      icon: <CheckCircle size={16} className="text-green-500" />,
      label: 'Conectadas',
      value: stats.connected,
    },
    {
      icon: <XCircle size={16} className="text-red-500" />,
      label: 'Não atendeu',
      value: stats.noAnswer,
    },
    {
      icon: <Voicemail size={16} className="text-purple-500" />,
      label: 'Correio de voz',
      value: stats.voicemail,
    },
    {
      icon: <PhoneOff size={16} className="text-orange-500" />,
      label: 'Ocupado',
      value: stats.busy,
    },
    {
      icon: <SkipForward size={16} className="text-yellow-500" />,
      label: 'Puladas',
      value: stats.skipped,
    },
    {
      icon: <Clock size={16} className="text-blue-500" />,
      label: 'Tempo total',
      value: formatElapsedTime(elapsed),
    },
  ]

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white dark:bg-card border border-border dark:border-border/50 rounded-xl p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 bg-primary-500/10 rounded-xl">
            <BarChart3 size={24} className="text-primary-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Sessão Encerrada
          </h2>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            Resumo da sua sessão de prospecção
          </p>
        </div>

        {/* Stats grid */}
        <div className="space-y-3">
          {statItems.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 bg-background dark:bg-card/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span className="text-sm text-secondary-foreground dark:text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Separator */}
        {sessionContacts.length > 0 && (
          <div className="border-t border-border dark:border-border/50" />
        )}

        {/* Loading state */}
        {isLoadingBlocks && (
          <div className="flex items-center justify-center gap-2 py-3">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Verificando pendências...</span>
          </div>
        )}

        {/* Block 1: Atenderam sem deal */}
        {connectedWithoutDeal.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Atenderam sem deal
              </h3>
              <span className="text-xs text-muted-foreground">({connectedWithoutDeal.length})</span>
            </div>
            <div className="space-y-1.5">
              {connectedWithoutDeal.map(contact => (
                <div
                  key={contact.contactId}
                  className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{contact.contactName || 'Sem nome'}</p>
                    {contact.contactPhone && (
                      <p className="text-xs text-muted-foreground">{contact.contactPhone}</p>
                    )}
                  </div>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    onClick={() => setCreateDealContactId(contact.contactId)}
                    className="shrink-0 ml-2 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                  >
                    + Criar Deal
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block 2: Retornos agendados */}
        {scheduledReturns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-primary-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Retornos agendados
              </h3>
              <span className="text-xs text-muted-foreground">({scheduledReturns.length})</span>
            </div>
            <div className="space-y-1.5">
              {scheduledReturns.map((ret, idx) => {
                const { text, isOverdue } = formatRelativeTime(ret.date)
                const time = new Date(ret.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div
                    key={`${ret.contactId}-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-primary-50 dark:bg-primary-500/10 rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{ret.contactName || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{time}</p>
                    </div>
                    <span className={`shrink-0 ml-2 text-xs font-semibold px-2 py-1 rounded-full ${
                      isOverdue
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                    }`}>
                      {text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Block 3: Tentativas esgotadas */}
        {exhaustedContacts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">
                Tentativas esgotadas
              </h3>
              <span className="text-xs text-muted-foreground">({exhaustedContacts.length})</span>
            </div>
            <div className="space-y-1.5">
              {exhaustedContacts.map(contact => (
                <div
                  key={contact.contactId}
                  className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{contact.contactName || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      {contact.attempts} tentativas
                    </p>
                  </div>
                  <div className="shrink-0 ml-2 flex items-center gap-1.5">
                    {contact.contactPhone && formatWhatsAppLink(contact.contactPhone) && (
                      <a
                        href={formatWhatsAppLink(contact.contactPhone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Enviar WhatsApp para ${contact.contactName}`}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-green-500 hover:bg-green-600 text-white transition-colors inline-flex items-center gap-1"
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                    )}
                    {contact.attempts >= 5 && (
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        onClick={() => setDoNotContactId(contact.contactId)}
                        aria-label={`Não ligar mais para ${contact.contactName}`}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 transition-colors inline-flex items-center gap-1"
                      >
                        <Ban size={12} />
                        Não ligar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No pending actions message */}
        {showNoPendingMessage && (
          <div className="flex flex-col items-center gap-2 py-4">
            <PartyPopper size={24} className="text-green-500" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Sessão impecável — sem pendências!
            </p>
          </div>
        )}

        {/* Close button */}
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-sm font-semibold bg-primary-500 hover:bg-primary-600 text-white transition-colors text-center"
        >
          Voltar à Fila
        </Button>
      </div>

      {/* CreateDealModal */}
      {createDealContactId && (
        <CreateDealModal
          isOpen={!!createDealContactId}
          onClose={() => setCreateDealContactId(null)}
          onCreated={() => handleDealCreated(createDealContactId)}
          initialContactId={createDealContactId}
        />
      )}

      {/* DoNotContactModal (CP-7.1) */}
      {doNotContactId && (
        <DoNotContactModal
          isOpen={!!doNotContactId}
          onClose={() => setDoNotContactId(null)}
          contactId={doNotContactId}
          onBlocked={handleDoNotContactBlocked}
        />
      )}
    </div>
  )
}
