'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AuditLogDashboard } from '@/features/settings/components/AuditLogDashboard'

export default function SettingsAudit() {
  const { profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.replace('/settings')
    }
  }, [profile, router])

  if (!profile || profile.role !== 'admin') {
    return null
  }

  return (
    <div className="pb-10">
      <AuditLogDashboard />
    </div>
  )
}
