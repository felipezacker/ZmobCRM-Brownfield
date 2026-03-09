'use client'

import React, { useState, useEffect } from 'react'
import { Save, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
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
      for (const p of profiles) {
        const existing = teamGoals.find(g => g.owner_id === p.id)
        edits[p.id] = existing?.calls_target ?? 30
      }
      setTeamEdits(edits)
    }
  }, [isOpen, currentTarget, teamGoals, profiles])

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdminOrDirector ? 'Metas da Equipe' : 'Minha Meta Diaria'}
      size="md"
    >
      <div className="space-y-4">
        {/* My goal */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">
            Minha meta de ligacoes/dia
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={200}
              value={myTarget}
              onChange={e => setMyTarget(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 px-3 py-2 border border-border dark:border-border rounded-lg bg-white dark:bg-white/5 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary-500"
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
          <div className="space-y-3 pt-2 border-t border-border dark:border-border">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">Metas dos Corretores</span>
            </div>

            {profiles
              .filter(p => p.id !== currentUserId)
              .map(p => {
                const currentVal = teamEdits[p.id] ?? 30
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-accent dark:bg-accent text-muted-foreground dark:text-muted-foreground shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm text-secondary-foreground dark:text-muted-foreground flex-1 truncate">
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
                      className="w-20 px-2 py-1.5 border border-border dark:border-border rounded-lg bg-white dark:bg-white/5 text-foreground text-sm text-center outline-none focus:ring-2 focus:ring-primary-500"
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
    </Modal>
  )
}
