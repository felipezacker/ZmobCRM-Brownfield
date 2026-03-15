'use client'

import React, { useState, useEffect } from 'react'
import { ApiKeysSection } from '@/features/settings/components/ApiKeysSection'
import { WebhooksSection } from '@/features/settings/components/WebhooksSection'
import { McpSection } from '@/features/settings/components/McpSection'
import { Button } from '@/components/ui/button'

type IntegrationsSubTab = 'api' | 'webhooks' | 'mcp'

export function IntegrationsSettings() {
  const [subTab, setSubTab] = useState<IntegrationsSubTab>('api')

  useEffect(() => {
    const syncFromHash = () => {
      const h = typeof window !== 'undefined' ? (window.location.hash || '').replace('#', '') : ''
      if (h === 'webhooks' || h === 'api' || h === 'mcp') setSubTab(h as IntegrationsSubTab)
    }

    syncFromHash()

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', syncFromHash)
      return () => window.removeEventListener('hashchange', syncFromHash)
    }
  }, [])

  const setSubTabAndHash = (t: IntegrationsSubTab) => {
    setSubTab(t)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.hash = `#${t}`
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <div className="pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Integrações</h2>
        <p className="text-muted-foreground text-sm mt-1">API, webhooks e conexões MCP para automações externas.</p>
      </div>
      <div className="flex items-center gap-2 mb-6">
        {([
          { id: 'webhooks' as const, label: 'Webhooks' },
          { id: 'api' as const, label: 'API' },
          { id: 'mcp' as const, label: 'MCP' },
        ] as const).map((t) => {
          const active = subTab === t.id
          return (
            <Button
              key={t.id}
              type="button"
              onClick={() => setSubTabAndHash(t.id)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                active
                  ? 'border-primary-500/50 bg-primary-500/10 text-primary-700 dark:text-primary-300'
                  : 'border-border  bg-white dark:bg-white/5 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/10'
              }`}
            >
              {t.label}
            </Button>
          )
        })}
      </div>

      {subTab === 'api' && <ApiKeysSection />}
      {subTab === 'webhooks' && <WebhooksSection />}
      {subTab === 'mcp' && <McpSection />}
    </div>
  )
}

export default IntegrationsSettings
