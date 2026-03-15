'use client'

import { CustomFieldsManager } from '@/features/settings/components/CustomFieldsManager'
import { useAuth } from '@/context/AuthContext'
import { redirect } from 'next/navigation'

export default function CamposPage() {
  const { profile } = useAuth()

  if (profile && profile.role !== 'admin') {
    redirect('/settings/empresa')
  }

  return (
    <div className="pb-10">
      <CustomFieldsManager />
    </div>
  )
}
