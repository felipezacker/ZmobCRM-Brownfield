'use client'

import { UsersPage } from '@/features/settings/UsersPage'
import { PermissionGate } from '@/components/auth/PermissionGate'

export default function SettingsEquipe() {
  return (
    <PermissionGate permission="gerenciar_equipe">
      <UsersPage />
    </PermissionGate>
  )
}
