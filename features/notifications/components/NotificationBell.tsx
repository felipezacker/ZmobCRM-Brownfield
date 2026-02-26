'use client'

import React from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { fetchUnreadCount } from '@/app/actions/notifications'

export function NotificationBell() {
  const { organizationId, profile } = useAuth()

  const { data: count = 0 } = useQuery({
    queryKey: ['crm_notification_count', organizationId, profile?.id],
    queryFn: async () => {
      if (!organizationId) return 0
      const { count } = await fetchUnreadCount(organizationId, profile?.id)
      return count
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60, // 1 min
    refetchInterval: 1000 * 60 * 2, // refetch every 2 min
  })

  return (
    <Link
      href="/notifications"
      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full relative transition-colors focus-visible-ring"
      aria-label={`Notificacoes CRM: ${count} nao lidas`}
    >
      <Bell size={20} aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
