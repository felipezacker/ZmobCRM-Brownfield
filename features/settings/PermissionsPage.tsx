'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAllOrgPermissions } from '@/lib/auth/usePermission'
import { useQueryClient } from '@tanstack/react-query'
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
  type Role,
  type PermissionKey,
} from '@/lib/auth/roles'
import { Shield, Crown, Briefcase, Users, Loader2, Save, RotateCcw, AlertTriangle, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ROLES: { key: Role; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'admin', label: 'Administrador', icon: Crown, color: 'amber' },
  { key: 'diretor', label: 'Diretor', icon: Shield, color: 'blue' },
  { key: 'corretor', label: 'Corretor', icon: Briefcase, color: 'emerald' },
]

const PERMISSIONS = Object.keys(PERMISSION_LABELS) as PermissionKey[]

interface PermissionChange {
  role: string
  roleLabel: string
  permission: string
  permissionLabel: string
  from: boolean
  to: boolean
}

export function PermissionsPage() {
  const { profile } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const currentPermissions = useAllOrgPermissions()

  const [localState, setLocalState] = useState<Record<Role, Record<PermissionKey, boolean>>>(currentPermissions)
  const [saving, setSaving] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [usersPerRole, setUsersPerRole] = useState<Record<string, number>>({})

  // Sync from server when data loads
  useEffect(() => {
    setLocalState(currentPermissions)
  }, [currentPermissions])

  // Fetch users per role count
  useEffect(() => {
    let cancelled = false
    async function fetchUsersPerRole() {
      try {
        const res = await fetch('/api/admin/users')
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setUsersPerRole(data.usersPerRole || {})
      } catch {
        // silently ignore — count is optional UX enhancement
      }
    }
    fetchUsersPerRole()
    return () => { cancelled = true }
  }, [])

  // Compute changes list
  const changes = useMemo<PermissionChange[]>(() => {
    return ROLES.flatMap(({ key: role, label: roleLabel }) =>
      PERMISSIONS
        .filter(perm => localState[role][perm] !== currentPermissions[role][perm])
        .map(perm => ({
          role,
          roleLabel,
          permission: perm,
          permissionLabel: PERMISSION_LABELS[perm],
          from: currentPermissions[role][perm],
          to: localState[role][perm],
        }))
    )
  }, [localState, currentPermissions])

  const hasChanges = changes.length > 0

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

  const handleSaveClick = useCallback(() => {
    if (hasChanges) {
      setShowConfirmModal(true)
    }
  }, [hasChanges])

  const handleConfirmSave = useCallback(async () => {
    setShowConfirmModal(false)
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

  const isModified = useCallback((role: Role, perm: PermissionKey) => {
    return localState[role][perm] !== currentPermissions[role][perm]
  }, [localState, currentPermissions])

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
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400 mr-2">
                {changes.length} {changes.length === 1 ? 'alteracao nao salva' : 'alteracoes nao salvas'}
              </span>
            )}
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
              onClick={handleSaveClick}
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
              {usersPerRole[key] !== undefined && (
                <span className="text-xs text-muted-foreground mt-0.5 block">
                  ({usersPerRole[key]} {usersPerRole[key] === 1 ? 'usuario' : 'usuarios'})
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Permission rows */}
        {PERMISSIONS.map((perm, i) => (
          <div
            key={perm}
            className={`grid grid-cols-4 ${i < PERMISSIONS.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/50 dark:hover:bg-white/[0.02] transition-colors`}
          >
            <div className="px-6 py-4 flex flex-col justify-center">
              <span className="text-sm font-medium text-foreground">
                {PERMISSION_LABELS[perm]}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {PERMISSION_DESCRIPTIONS[perm]}
              </p>
            </div>
            {ROLES.map(({ key: role }) => {
              const enabled = localState[role]?.[perm] ?? DEFAULT_PERMISSIONS[role][perm]
              const modified = isModified(role, perm)
              const isDefaultValue = isDefault(role, perm)

              return (
                <div key={role} className="px-6 py-4 flex items-center justify-center border-l border-border">
                  <div className="flex items-center gap-2">
                    <label
                      className={`relative inline-flex items-center cursor-pointer rounded-full ${modified ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleToggle(role, perm)}
                        className="sr-only peer"
                        aria-label={`${PERMISSION_LABELS[perm]} para ${role}`}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300/50 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 dark:peer-checked:bg-primary-600" />
                    </label>
                    {modified && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Alterado" />
                    )}
                    {!modified && isDefaultValue && (
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowConfirmModal(false) }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 id="confirm-modal-title" className="text-lg font-semibold text-foreground">Confirmar alteracoes</h3>
              </div>
              <Button
                onClick={() => setShowConfirmModal(false)}
                aria-label="Fechar"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {changes.length} {changes.length === 1 ? 'permissao sera alterada' : 'permissoes serao alteradas'}:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
              {changes.map((change) => (
                <div
                  key={`${change.role}-${change.permission}`}
                  className="flex items-center justify-between p-3 bg-muted/50 dark:bg-white/[0.03] rounded-lg border border-border"
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">{change.roleLabel}</span>
                    <span className="text-muted-foreground mx-1.5">·</span>
                    <span className="text-sm text-muted-foreground">{change.permissionLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium shrink-0 ml-3">
                    <span className={change.from ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                      {change.from ? 'ON' : 'OFF'}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className={change.to ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>
                      {change.to ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/25 font-medium"
              >
                <Check className="h-4 w-4" />
                Confirmar e Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
