'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EditableSectionWrapperProps {
  id: string
  isEditing: boolean
  isHidden: boolean
  canHideMore: boolean
  onToggleVisibility: (id: string) => void
  children: React.ReactNode
}

export function EditableSectionWrapper({
  id,
  isEditing,
  isHidden,
  canHideMore,
  onToggleVisibility,
  children,
}: EditableSectionWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  // Normal mode: hidden sections render empty container (no children = no active queries)
  if (!isEditing && isHidden) {
    return <div ref={setNodeRef} hidden />
  }

  // Normal mode: render children without wrapper overhead
  if (!isEditing) {
    return <div ref={setNodeRef}>{children}</div>
  }

  // Edit mode
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const canToggle = isHidden || canHideMore

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
        isHidden
          ? 'border-muted-foreground/20 opacity-40'
          : isDragging
            ? 'border-primary-500 bg-primary-500/5'
            : 'border-border dark:border-border/50 hover:border-primary-500/50'
      }`}
    >
      {/* Full-width drag handle bar */}
      <div className="flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 flex items-center gap-2 px-3 py-1.5 cursor-grab active:cursor-grabbing select-none bg-muted/50 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition-colors"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 h-px bg-border/50 dark:bg-border/30" />
        </div>

        {/* Visibility toggle — outside drag listeners */}
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => onToggleVisibility(id)}
          disabled={!canToggle}
          className={`shrink-0 px-2.5 py-1.5 transition-colors ${
            isHidden
              ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'
              : !canToggle
                ? 'bg-muted/50 text-muted-foreground/30 cursor-not-allowed dark:bg-white/5 dark:text-muted-foreground/30'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-white/5 dark:text-muted-foreground dark:hover:bg-white/10'
          }`}
          aria-label={isHidden ? 'Mostrar seção' : 'Esconder seção'}
          aria-pressed={!isHidden}
        >
          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </Button>
      </div>

      {/* Section content */}
      <div>{children}</div>
    </div>
  )
}
