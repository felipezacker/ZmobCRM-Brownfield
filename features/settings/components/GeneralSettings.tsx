'use client'

import React, { useEffect } from 'react'
import { TagsManager } from '@/features/settings/components/TagsManager'
import { CustomFieldsManager } from '@/features/settings/components/CustomFieldsManager'
import { useAuth } from '@/context/AuthContext'

export function GeneralSettings() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  // Scroll to hash element (e.g., #ai-config)
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const elementId = hash.slice(1)
      setTimeout(() => {
        const element = document.getElementById(elementId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [])

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Geral</h2>
        <p className="text-muted-foreground text-sm mt-1">Preferências gerais do CRM e personalização de campos.</p>
      </div>
      {isAdmin && (
        <>
          <TagsManager />
          <CustomFieldsManager />
        </>
      )}
    </div>
  )
}

export default GeneralSettings
