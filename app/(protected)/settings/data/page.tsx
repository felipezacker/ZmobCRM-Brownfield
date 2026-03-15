'use client'

import { DataStorageSettings } from '@/features/settings/components/DataStorageSettings'
import { PermissionGate } from '@/components/auth/PermissionGate'

export default function SettingsData() {
  return (
    <PermissionGate permission="exportar_dados">
      <DataStorageSettings />
    </PermissionGate>
  )
}
