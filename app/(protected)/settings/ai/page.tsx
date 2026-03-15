'use client'

import { AICenterSettings } from '@/features/settings/AICenterSettings'
import { PermissionGate } from '@/components/auth/PermissionGate'

export default function SettingsAI() {
  return (
    <PermissionGate permission="acessar_ia">
      <AICenterSettings />
    </PermissionGate>
  )
}
