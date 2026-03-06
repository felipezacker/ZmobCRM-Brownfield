'use client'

import React, { useState, useEffect } from 'react'
import { X, Target, Save, Users } from 'lucide-react'
import { Button } from '@/app/components/ui/Button'
import type { DbDailyGoal } from '@/lib/supabase/prospecting-goals'

interface GoalConfigModalProps {
  isOpen: boolean
  onClose: () => void
  currentTarget: number
  isAdminOrDirector: boolean
  teamGoals: DbDailyGoal[]
  profiles: { id: string; name: string }[]
  currentUserId: string
  onSave: (ownerId: string, callsTarget: number) => Promise<void>
  isSaving: boolean
}

export function GoalConfigModal({
  isOpen,
  onClose,
  currentTarget,
  isAdminOrDirector,
  teamGoals,
  profiles,
  currentUserId,
  onSave,
  isSaving,
}: GoalConfigModalProps) {
  const [myTarget, setMyTarget] = useState(currentTarget)
  const [teamEdits, setTeamEdits] = useState<Record<string, number>>({})

  useEffect(() => {
    if (isOpen) {
      setMyTarget(currentTarget)
      const edits: Record<string, number> = {}
      for (const g of teamGoals) {
        edits[g.owner_id] = g.calls_target
      }
      setTeamEdits(edits)
    }
  }, [isOpen, currentTarget, teamGoals])

  if (!isOpen) return null

  const handleSaveMy = async () => {
    await onSave(currentUserId, myTarget)
    onClose()
  }

  const handleSaveTeamMember = async (ownerId: string) => {
    const target = teamEdits[ownerId]
    if (target && target > 0) {
      await onSave(ownerId, target)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-primary-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {isAdminOrDirector ? 'Metas da Equipe' : 'Minha Meta Diaria'}
            </h2>
          </div>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* My goal */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Minha meta de ligacoes/dia
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={200}
                value={myTarget}
                onChange={e => setMyTarget(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button
                variant="unstyled"
                size="unstyled"
                onClick={handleSaveMy}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                Salvar
              </Button>
            </div>
          </div>

          {/* Team goals — director/admin only */}
          {isAdminOrDirector && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Metas dos Corretores</span>
              </div>

              {profiles
                .filter(p => p.id !== currentUserId)
                .map(p => {
                  const currentVal = teamEdits[p.id] ?? 30
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-300 flex-1 truncate">
                        {p.name.split(' ')[0]}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={currentVal}
                        onChange={e =>
                          setTeamEdits(prev => ({
                            ...prev,
                            [p.id]: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                        className="w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm text-center outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <Button
                        variant="unstyled"
                        size="unstyled"
                        onClick={() => handleSaveTeamMember(p.id)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors disabled:opacity-50"
                        title="Salvar meta"
                      >
                        <Save size={14} />
                      </Button>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
