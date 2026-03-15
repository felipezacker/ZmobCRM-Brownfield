'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { PermissionsPage } from '@/features/settings/PermissionsPage'

export default function SettingsPermissions() {
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

  return <PermissionsPage />
}
