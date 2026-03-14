import React, { useState, useEffect, useMemo } from 'react'
import { Phone, Mail, Calendar, FileText, ChevronDown, ChevronUp, Clock, Landmark, Home, Ban } from 'lucide-react'
import { useContactActivities } from '@/lib/query/hooks/useActivitiesQuery'
import { getOpenDealsByContact } from '@/lib/supabase/deals'
import { Button } from '@/components/ui/button'
import type { Activity } from '@/types'
import type { OpenDeal } from '@/lib/supabase/deals'

interface ContactHistoryProps {
  contactId: string
  defaultOpen?: boolean
  doNotContact?: boolean
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CALL: <Phone size={14} className="text-blue-500" />,
  EMAIL: <Mail size={14} className="text-green-500" />,
  MEETING: <Calendar size={14} className="text-purple-500" />,
  NOTE: <FileText size={14} className="text-amber-500" />,
  TASK: <Clock size={14} className="text-muted-foreground" />,
}

const formatBRL = (value: number | null): string => {
  if (value === null) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function useContactDeal(contactId: string) {
  const [deal, setDeal] = useState<OpenDeal | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    getOpenDealsByContact(contactId)
      .then((result) => { if (!cancelled) setDeal(result) })
      .catch((err) => {
        console.error('[ContactHistory] Failed to fetch deal:', err)
        if (!cancelled) setDeal(null)
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [contactId])

  return { deal, isLoading }
}

const OUTCOME_BADGES: Record<string, { label: string; className: string }> = {
  connected: { label: 'Atendeu', className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  no_answer: { label: 'Não atendeu', className: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  voicemail: { label: 'Caixa postal', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
  busy: { label: 'Ocupado', className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

const ActivityItem: React.FC<{ activity: Activity; isExpanded: boolean; onToggle: () => void }> = ({ activity, isExpanded, onToggle }) => {
  const icon = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.TASK
  const outcome = activity.type === 'CALL' && activity.metadata?.outcome
    ? OUTCOME_BADGES[activity.metadata.outcome as string]
    : null

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border dark:border-border last:border-0">
      <div className="mt-0.5 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-secondary-foreground dark:text-muted-foreground truncate">
            {activity.title}
          </span>
          {outcome && (
            <span className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${outcome.className}`}>
              {outcome.label}
            </span>
          )}
        </div>
        {activity.description && (
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onToggle}
            className="text-left mt-0.5 group block"
            aria-label={isExpanded ? 'Recolher nota' : 'Expandir nota'}
          >
            <p className={`text-1xs text-muted-foreground dark:text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
              {activity.description}
            </p>
            <span className="text-2xs text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
              {isExpanded ? 'ver menos' : 'ver mais'}
            </span>
          </Button>
        )}
        <span className="text-2xs text-muted-foreground dark:text-muted-foreground mt-0.5 block">
          {formatDate(activity.date)}
        </span>
      </div>
    </div>
  )
}

export const ContactHistory: React.FC<ContactHistoryProps> = ({ contactId, defaultOpen = true, doNotContact }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: activities = [], isLoading } = useContactActivities(contactId)
  const { deal, isLoading: isDealLoading } = useContactDeal(contactId)

  const lastNote = useMemo(() => {
    const notes = activities.filter(a => a.type === 'NOTE')
    if (notes.length === 0) return undefined
    return notes.reduce((latest, note) =>
      new Date(note.date).getTime() > new Date(latest.date).getTime() ? note : latest
    )
  }, [activities])

  return (
    <div className="bg-white dark:bg-card border border-border dark:border-border/50 rounded-xl overflow-hidden">
      <Button
        variant="unstyled"
        size="unstyled"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-secondary-foreground dark:text-muted-foreground hover:bg-background dark:hover:bg-card/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Clock size={14} />
          Histórico
          {activities.length > 0 && (
            <span className="text-2xs bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground px-1.5 py-0.5 rounded-full">
              {activities.length}
            </span>
          )}
          {doNotContact && (
            <span className="inline-flex items-center gap-0.5 text-2xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
              <Ban size={9} />
              Bloqueado
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </Button>

      {isOpen && (
        <div className="px-4 pb-3">
          {/* Deal Context Block (AC1, AC2, AC6, AC8, AC9) */}
          {isDealLoading ? (
            <div className="animate-pulse mb-3">
              <div className="h-14 bg-muted dark:bg-muted/50 rounded-lg" />
            </div>
          ) : deal ? (
            <section aria-label="Deal em andamento" className="mb-3 rounded-lg border border-border/60 dark:border-border/30 bg-card dark:bg-card/50 overflow-hidden">
              <div className="px-3 py-2 bg-primary/5 dark:bg-primary/10 border-b border-border/40 dark:border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Landmark size={12} className="text-primary" />
                  <span className="text-2xs font-medium text-primary">Deal em andamento</span>
                </div>
                {deal.stage_name && (
                  <span className="text-2xs font-medium bg-primary/10 dark:bg-primary/20 text-primary px-2 py-0.5 rounded-full">{deal.stage_name}</span>
                )}
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <p className="text-sm font-medium text-foreground truncate">{deal.title}</p>
                {deal.value !== null && (
                  <p className="text-base font-bold text-primary tracking-tight">{formatBRL(deal.value)}</p>
                )}
                {(deal.product_name || deal.property_ref) && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Home size={11} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{deal.product_name || deal.property_ref}</span>
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {/* Last Note Highlight Block (AC3, AC4) */}
          {lastNote && (
            <section aria-label="Última nota" className="mb-3 rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/15 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-amber-200/40 dark:border-amber-800/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <FileText size={11} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-2xs font-medium text-amber-700 dark:text-amber-400">Última nota</span>
                </div>
                <span className="text-2xs text-amber-600/70 dark:text-amber-500/60">{formatDate(lastNote.date)}</span>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs text-foreground/90 line-clamp-3 leading-relaxed">{lastNote.description || lastNote.title}</p>
              </div>
            </section>
          )}

          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-4 h-4 rounded bg-accent dark:bg-accent mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-accent dark:bg-accent rounded w-3/4" />
                    <div className="h-2 bg-muted dark:bg-card rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground py-3 text-center">
              Nenhuma interação registrada
            </p>
          ) : (
            <div>
              {activities.filter(a => !lastNote || a.id !== lastNote.id).map(activity => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  isExpanded={expandedId === activity.id}
                  onToggle={() => setExpandedId(prev => prev === activity.id ? null : activity.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
