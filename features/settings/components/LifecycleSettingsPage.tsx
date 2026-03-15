'use client'

import React, { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/context/settings/SettingsContext'
import { useContacts } from '@/context/contacts/ContactsContext'
import { STAGE_COLORS } from '@/features/settings/constants'

export default function LifecycleSettingsPage() {
  const {
    lifecycleStages,
    addLifecycleStage,
    updateLifecycleStage,
    deleteLifecycleStage,
    reorderLifecycleStages,
  } = useSettings()
  const { contacts } = useContacts()
  const [newStageName, setNewStageName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const stageCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    contacts.forEach((contact) => {
      if (contact.stage) {
        counts[contact.stage] = (counts[contact.stage] || 0) + 1
      }
    })
    return counts
  }, [contacts])

  const handleAdd = () => {
    if (!newStageName.trim()) return
    addLifecycleStage({
      name: newStageName.trim(),
      color: STAGE_COLORS[lifecycleStages.length % STAGE_COLORS.length],
      isDefault: false,
    })
    setNewStageName('')
    setIsAdding(false)
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newStages = [...lifecycleStages]
    if (direction === 'up' && index > 0) {
      ;[newStages[index], newStages[index - 1]] = [newStages[index - 1], newStages[index]]
    } else if (direction === 'down' && index < newStages.length - 1) {
      ;[newStages[index], newStages[index + 1]] = [newStages[index + 1], newStages[index]]
    }
    reorderLifecycleStages(newStages)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">Ciclos de Vida</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Defina os estagios de maturidade dos seus contatos (ex: Lead, Cliente). A ordem aqui
          define a progressao no funil.
        </p>

        <div className="space-y-3">
          {lifecycleStages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-2 bg-background dark:bg-card/50 rounded-2xl border border-border"
            >
              {/* Color */}
              <div className="relative flex-shrink-0 group">
                <div
                  className={`w-6 h-6 rounded-full ${stage.color} cursor-pointer ring-2 ring-transparent hover:ring-ring transition-all`}
                />
                <select
                  value={stage.color}
                  onChange={(e) => updateLifecycleStage(stage.id, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label={`Cor do estagio ${stage.name}`}
                >
                  {STAGE_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c.replace('bg-', '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <input
                type="text"
                value={stage.name}
                onChange={(e) => updateLifecycleStage(stage.id, { name: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none border-b border-transparent focus:border-primary-500 px-1"
                aria-label={`Nome do estagio ${stage.name}`}
              />

              {/* Count Badge */}
              <span
                className="text-2xs font-medium text-muted-foreground bg-white dark:bg-card px-2 py-0.5 rounded-full border border-border"
                title={`${stageCounts[stage.id] || 0} contatos neste estagio`}
              >
                {stageCounts[stage.id] || 0}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <div className="flex flex-col">
                  <Button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-0.5 text-muted-foreground hover:text-primary-500 disabled:opacity-30"
                    aria-label={`Mover ${stage.name} para cima`}
                  >
                    <ArrowUp size={12} />
                  </Button>
                  <Button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === lifecycleStages.length - 1}
                    className="p-0.5 text-muted-foreground hover:text-primary-500 disabled:opacity-30"
                    aria-label={`Mover ${stage.name} para baixo`}
                  >
                    <ArrowDown size={12} />
                  </Button>
                </div>

                <Button
                  onClick={() => deleteLifecycleStage(stage.id, contacts)}
                  disabled={stage.isDefault || (stageCounts[stage.id] || 0) > 0}
                  className="p-1.5 text-muted-foreground hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed ml-1"
                  title={
                    stage.isDefault
                      ? 'Estagio padrao nao pode ser removido'
                      : (stageCounts[stage.id] || 0) > 0
                        ? 'Nao e possivel remover estagio com contatos vinculados'
                        : 'Remover estagio'
                  }
                  aria-label={`Remover estagio ${stage.name}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}

          {/* Add New */}
          {isAdding ? (
            <div className="flex items-center gap-3 p-2 border border-primary-200 dark:border-primary-800 rounded-2xl bg-primary-50 dark:bg-primary-900/10 animate-in fade-in slide-in-from-top-2">
              <div className="w-6 h-6 rounded-full bg-accent" />
              <input
                autoFocus
                type="text"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Nome do novo estagio..."
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                aria-label="Nome do novo estagio"
              />
              <Button
                onClick={handleAdd}
                disabled={!newStageName.trim()}
                className="p-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
                aria-label="Confirmar novo estagio"
              >
                <Check size={14} />
              </Button>
              <Button
                onClick={() => setIsAdding(false)}
                className="p-1.5 text-muted-foreground hover:text-secondary-foreground"
                aria-label="Cancelar novo estagio"
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsAdding(true)}
              className="w-full py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary-600 hover:bg-background dark:hover:bg-card rounded-lg border border-dashed border-border transition-all"
            >
              <Plus size={16} />
              Adicionar Estagio
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
