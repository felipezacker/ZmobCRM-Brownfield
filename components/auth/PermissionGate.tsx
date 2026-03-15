'use client'

import React from 'react'
import { usePermission } from '@/lib/auth/usePermission'
import { Shield } from 'lucide-react'
import type { PermissionKey } from '@/lib/auth/roles'

interface PermissionGateProps {
  permission: PermissionKey
  children: React.ReactNode
  fallback?: React.ReactNode
}

const defaultFallback = (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <Shield className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
      <p className="text-muted-foreground max-w-sm">
        Voce nao tem permissao para acessar esta funcionalidade.
        Entre em contato com o administrador da sua organizacao.
      </p>
    </div>
  </div>
)

export function PermissionGate({ permission, children, fallback = defaultFallback }: PermissionGateProps) {
  const hasPermission = usePermission(permission)

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
