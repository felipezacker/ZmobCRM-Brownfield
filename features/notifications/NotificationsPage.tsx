'use client'

import React, { useState, useCallback, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import {
  fetchNotifications,
  generateNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'
import type { CrmNotification, NotificationType } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Bell,
  Cake,
  UserMinus,
  Clock,
  TrendingDown,
  CheckCheck,
  RefreshCw,
  Filter,
  Eye,
} from 'lucide-react'

// ============================================
// HELPERS
// ============================================

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  BIRTHDAY: Cake,
  CHURN_ALERT: UserMinus,
  DEAL_STAGNANT: Clock,
  SCORE_DROP: TrendingDown,
}

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  BIRTHDAY: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20',
  CHURN_ALERT: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  DEAL_STAGNANT: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  SCORE_DROP: 'text-red-500 bg-red-50 dark:bg-red-900/20',
}

const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  BIRTHDAY: 'Aniversario',
  CHURN_ALERT: 'Risco de Churn',
  DEAL_STAGNANT: 'Deal Estagnado',
  SCORE_DROP: 'Score Baixo',
}

const TYPE_FILTERS: { label: string; value: NotificationType | 'ALL' }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Aniversario', value: 'BIRTHDAY' },
  { label: 'Churn', value: 'CHURN_ALERT' },
  { label: 'Deal Estagnado', value: 'DEAL_STAGNANT' },
  { label: 'Score', value: 'SCORE_DROP' },
]

function getTimeGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  if (date >= today) return 'Hoje'
  if (date >= yesterday) return 'Ontem'
  if (date >= weekAgo) return 'Esta semana'
  return 'Anteriores'
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}min atras`
  if (diffHours < 24) return `${diffHours}h atras`
  if (diffDays < 7) return `${diffDays}d atras`
  return date.toLocaleDateString('pt-BR')
}

// ============================================
// NOTIFICATION CARD
// ============================================

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: CrmNotification
  onMarkRead: (id: string) => void
}) {
  const router = useRouter()
  const Icon = NOTIFICATION_ICONS[notification.type]
  const colorClass = NOTIFICATION_COLORS[notification.type]

  const handleClick = () => {
    if (!notification.isRead) onMarkRead(notification.id)
    if (notification.contactId) {
      router.push(`/contacts?cockpit=${notification.contactId}`)
    } else if (notification.dealId) {
      router.push(`/boards?deal=${notification.dealId}`)
    }
  }

  return (
    <Button
      onClick={handleClick}
      className={`w-full text-left flex gap-3 p-4 rounded-lg border transition-colors hover:bg-background dark:hover:bg-white/5 ${
        notification.isRead
          ? 'opacity-60 border-border '
          : 'border-border  bg-white dark:bg-card/50'
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${notification.isRead ? 'text-muted-foreground dark:text-muted-foreground' : 'text-foreground '}`}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
          )}
        </div>
        {notification.description && (
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
            <Clock size={12} />
            {getRelativeTime(notification.createdAt)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${colorClass}`}>
            {NOTIFICATION_LABELS[notification.type]}
          </span>
        </div>
      </div>
    </Button>
  )
}

// ============================================
// NOTIFICATIONS PAGE
// ============================================

export function NotificationsPage() {
  const { profile, organizationId } = useAuth()
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'ALL'>('ALL')
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all')
  const [isPending, startTransition] = useTransition()

  const orgId = organizationId || ''
  const ownerId = profile?.id || null

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['crm_notifications', orgId, ownerId, typeFilter, readFilter],
    queryFn: async () => {
      const filters: { isRead?: boolean; type?: NotificationType; limit?: number } = { limit: 200 }
      if (readFilter === 'unread') filters.isRead = false
      if (typeFilter !== 'ALL') filters.type = typeFilter
      const { data } = await fetchNotifications(orgId, ownerId, filters)
      return data
    },
    enabled: !!orgId,
    staleTime: 1000 * 30,
  })

  // Generate notifications
  const handleGenerate = useCallback(() => {
    startTransition(async () => {
      await generateNotifications(orgId)
      refetch()
      queryClient.invalidateQueries({ queryKey: ['crm_notification_count'] })
    })
  }, [orgId, refetch, queryClient])

  // Mark as read
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await markNotificationRead(id)
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['crm_notification_count'] })
    },
  })

  // Mark all as read
  const markAllMutation = useMutation({
    mutationFn: async () => {
      await markAllNotificationsRead(orgId, ownerId)
    },
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: ['crm_notification_count'] })
    },
  })

  // Group by date
  const grouped = notifications.reduce<Record<string, CrmNotification[]>>((acc, n) => {
    const group = getTimeGroup(n.createdAt)
    if (!acc[group]) acc[group] = []
    acc[group].push(n)
    return acc
  }, {})

  const groupOrder = ['Hoje', 'Ontem', 'Esta semana', 'Anteriores']
  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell size={24} />
            Notificacoes
          </h1>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
            Alertas proativos sobre seus contatos e deals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isPending ?'animate-spin' : ''} />
            Gerar alertas
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-muted-foreground" />
          {TYPE_FILTERS.map(f => (
            <Button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                typeFilter === f.value
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-muted-foreground hover:bg-muted dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => setReadFilter(readFilter === 'all' ? 'unread' : 'all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              readFilter === 'unread'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-muted-foreground hover:bg-muted dark:hover:bg-white/10'
            }`}
          >
            <Eye size={14} />
            {readFilter === 'unread' ? 'Nao lidas' : 'Todas'}
          </Button>

          {unreadCount > 0 && (
            <Button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-secondary-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <CheckCheck size={14} />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-card/30 rounded-xl border border-border">
          <Bell size={48} className="mx-auto text-muted-foreground dark:text-secondary-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">
            Nenhuma notificacao
          </p>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
            Clique em &quot;Gerar alertas&quot; para verificar aniversarios, churn e deals estagnados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupOrder.map(group => {
            const items = grouped[group]
            if (!items || items.length === 0) return null
            return (
              <div key={group}>
                <h2 className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider mb-2">
                  {group}
                </h2>
                <div className="space-y-2">
                  {items.map(n => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkRead={(id) => markReadMutation.mutate(id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
