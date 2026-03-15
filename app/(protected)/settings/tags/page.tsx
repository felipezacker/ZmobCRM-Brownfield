'use client'

import { TagsManager } from '@/features/settings/components/TagsManager'
import { useAuth } from '@/context/AuthContext'
import { redirect } from 'next/navigation'

export default function TagsPage() {
  const { profile } = useAuth()

  if (profile && profile.role !== 'admin') {
    redirect('/settings/empresa')
  }

  return (
    <div className="pb-10">
      <TagsManager />
    </div>
  )
}
