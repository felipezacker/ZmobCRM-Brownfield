'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAllOrgPermissions } from '@/lib/auth/usePermission'
import { useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_LABELS,
  type Role,
  type PermissionKey,
} from '@/lib/auth/roles'
import { Shield, Crown, Briefcase, Users, Loader2, Save, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ROLES: { key: Role; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'admin', label: 'Administrador', icon: Crown, color: 'amber' },
  { key: 'diretor', label: 'Diretor', icon: Shield, color: 'blue' },
  { key: 'corretor', label: 'Corretor', icon: Briefcase, color: 'emerald' },
]

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as PermissionKey[]

export function PermissionsPage() {
  const { profile } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const currentPermissions = useAllOrgPermissions()

  const [localState, setLocalState] = useState<Record<Role, Record<PermissionKey, boolean>>>(currentPermissions)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Sync from server when data loads
  useEffect(() => {
    setLocalState(currentPermissions)
  }, [currentPermissions])

  // Track if there are unsaved changes
  useEffect(() => {
    const changed = ROLES.some(({ key: role }) =>
      PERMISSIONS.some((perm) => localState[role][perm] !== currentPermissions[role][perm])
    )
    setHasChanges(changed)
  }, [localState, currentPermissions])

  const handleToggle = useCallback((role: Role, permission: PermissionKey) => {
    setLocalState((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permission]: !prev[role][permission],
      },
    }))
  }, [])

  const handleReset = useCallback(() => {
    setLocalState(currentPermissions)
  }, [currentPermissions])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const permissions: { role: Role; permission: string; enabled: boolean }[] = []

      for (const { key: role } of ROLES) {
        for (const perm of PERMISSIONS) {
          permissions.push({
            role,
            permission: perm,
            enabled: localState[role][perm],
          })
        }
      }

      const res = await fetch('/api/settings/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao salvar permissoes')
      }

      await queryClient.invalidateQueries({ queryKey: ['role-permissions'] })
      addToast('Permissoes salvas com sucesso', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
  }, [localState, queryClient, addToast])

  const isDefault = (role: Role, permission: PermissionKey) => {
    return currentPermissions[role][permission] === DEFAULT_PERMISSIONS[role][permission]
      && localState[role][permission] === currentPermissions[role][permission]
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <Shield className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-sm">
            Apenas administradores podem configurar permissoes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Permissoes por Cargo</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Configure quais funcionalidades cada cargo pode acessar. Estas permissoes complementam a hierarquia existente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Descartar
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/25 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Permissions Grid */}
      <div className="bg-white dark:bg-white/[0.03] border border-border rounded-2xl overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-4 border-b border-border">
          <div className="px-6 py-4">
            <span className="text-sm font-medium text-muted-foreground">Capacidade</span>
          </div>
          {ROLES.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="px-6 py-4 text-center border-l border-border">
              <div className="flex items-center justify-center gap-2">
                <Icon className={`h-4 w-4 text-${color}-500`} />
                <span className="text-sm font-semibold text-foreground">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Permission rows */}
        {PERMISSIONS.map((perm, i) => (
          <div
            key={perm}
            className={`grid grid-cols-4 ${i < PERMISSIONS.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/50 dark:hover:bg-white/[0.02] transition-colors`}
          >
            <div className="px-6 py-4 flex items-center">
              <span className="text-sm font-medium text-foreground">
                {PERMISSION_LABELS[perm]}
              </span>
            </div>
            {ROLES.map(({ key: role }) => {
              const enabled = localState[role]?.[perm] ?? DEFAULT_PERMISSIONS[role][perm]
              const isDefaultValue = isDefault(role, perm)

              return (
                <div key={role} className="px-6 py-4 flex items-center justify-center border-l border-border">
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggle(role, perm)}
                        className="sr-only peer"
                        aria-label={`${PERMISSION_LABELS[perm]} para ${role}`}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300/50 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 dark:peer-checked:bg-primary-600" />
                    </label>
                    {isDefaultValue && (
                      <span className="text-2xs text-muted-foreground font-medium uppercase tracking-wider">
                        Padrao
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              Como funciona
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Permissoes granulares complementam a hierarquia de cargos (admin {'>'} diretor {'>'} corretor).
              Elas apenas restringem acesso — nunca expandem alem do que o cargo ja permite.
              Se nenhuma customizacao for salva, o sistema usa os valores padrao.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
