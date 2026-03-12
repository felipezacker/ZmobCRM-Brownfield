import React from 'react'
import { ExternalLink, Phone, Mail, Clock, FileText, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useContactActivities } from '@/lib/query/hooks/useActivitiesQuery'

interface QueueItemDetailsProps {
  contactId: string
  contactEmail?: string
  contactStage?: string
  leadScore?: number | null
  isExpanded: boolean
  onOpenContact?: (contactId: string) => void
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score > 60) return { label: 'Quente', color: 'text-green-700 dark:text-green-400' }
  if (score >= 30) return { label: 'Morno', color: 'text-yellow-700 dark:text-yellow-400' }
  return { label: 'Frio', color: 'text-red-700 dark:text-red-400' }
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays === 1) return 'ontem'
  if (diffDays < 30) return `${diffDays}d atrás`
  return date.toLocaleDateString('pt-BR')
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  CALL: <Phone size={12} className="text-blue-500" />,
  EMAIL: <Mail size={12} className="text-purple-500" />,
  NOTE: <FileText size={12} className="text-amber-500" />,
  TASK: <Clock size={12} className="text-green-500" />,
}

export function QueueItemDetails({ contactId, contactEmail, contactStage, leadScore, isExpanded, onOpenContact }: QueueItemDetailsProps) {
  // Fetch last activity on demand (only when expanded)
  const { data: activities, isLoading } = useContactActivities(
    isExpanded ? contactId : undefined,
    10
  )

  const lastActivity = activities?.[0]
  const lastNote = activities?.find(a => a.type === 'NOTE')

  if (isLoading) {
    return (
      <div className="px-3 pb-3 space-y-2">
        <div className="h-3 w-3/4 bg-muted dark:bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-muted dark:bg-white/10 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-muted dark:bg-white/10 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50 dark:border-border/30">
      {/* Email */}
      {contactEmail && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail size={11} />
          <span className="truncate">{contactEmail}</span>
        </div>
      )}

      {/* Last activity */}
      {lastActivity ? (
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenContact?.(contactId) }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left cursor-pointer"
        >
          {ACTIVITY_ICONS[lastActivity.type] || <Clock size={12} />}
          <span className="truncate">
            {lastActivity.title || lastActivity.type}
          </span>
          <span className="text-[10px] shrink-0">
            {formatRelativeDate(lastActivity.date)}
          </span>
        </Button>
      ) : (
        <div className="text-xs text-muted-foreground/60">Sem atividades registradas</div>
      )}

      {/* Last note (if different from last activity) */}
      {lastNote && lastNote.id !== lastActivity?.id && lastNote.title && (
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenContact?.(contactId) }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left cursor-pointer"
        >
          <FileText size={11} className="text-amber-500 shrink-0" />
          <span className="truncate">
            {lastNote.title.length > 100 ? lastNote.title.slice(0, 100) + '...' : lastNote.title}
          </span>
        </Button>
      )}

      {/* Lead score with label */}
      {leadScore != null && (
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingUp size={11} className="text-muted-foreground" />
          <span className={`font-medium ${getScoreLabel(leadScore).color}`}>
            {leadScore}/100 — {getScoreLabel(leadScore).label}
          </span>
        </div>
      )}

      {/* View profile button — opens modal instead of navigating */}
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenContact?.(contactId) }}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1 cursor-pointer"
      >
        <ExternalLink size={11} />
        Ver perfil
      </Button>
    </div>
  )
}
