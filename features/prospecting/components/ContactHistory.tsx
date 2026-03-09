import React, { useState } from 'react'
import { Phone, Mail, Calendar, FileText, ChevronDown, ChevronUp, Clock } from 'lucide-react'
import { useContactActivities } from '@/lib/query/hooks/useActivitiesQuery'
import { Button } from '@/components/ui/button'
import type { Activity } from '@/types'

interface ContactHistoryProps {
  contactId: string
  defaultOpen?: boolean
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CALL: <Phone size={14} className="text-blue-500" />,
  EMAIL: <Mail size={14} className="text-green-500" />,
  MEETING: <Calendar size={14} className="text-purple-500" />,
  NOTE: <FileText size={14} className="text-amber-500" />,
  TASK: <Clock size={14} className="text-muted-foreground" />,
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

const ActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
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
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${outcome.className}`}>
              {outcome.label}
            </span>
          )}
        </div>
        {activity.description && (
          <p className="text-[11px] text-muted-foreground dark:text-muted-foreground mt-0.5 line-clamp-1">
            {activity.description}
          </p>
        )}
        <span className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-0.5 block">
          {formatDate(activity.date)}
        </span>
      </div>
    </div>
  )
}

export const ContactHistory: React.FC<ContactHistoryProps> = ({ contactId, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const { data: activities = [], isLoading } = useContactActivities(contactId)

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
            <span className="text-[10px] bg-muted dark:bg-card text-muted-foreground dark:text-muted-foreground px-1.5 py-0.5 rounded-full">
              {activities.length}
            </span>
          )}
        </span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </Button>

      {isOpen && (
        <div className="px-4 pb-3">
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
              {activities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
