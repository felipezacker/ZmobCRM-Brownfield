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

  // Edit mode: show drag handle + visibility toggle
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // QA#3: Disable hide toggle when this is the last visible section
  const canToggle = isHidden || canHideMore

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border-2 border-dashed transition-colors ${
        isHidden
          ? 'border-muted-foreground/20 opacity-40'
          : isDragging
            ? 'border-primary-500 bg-primary-500/5'
            : 'border-border dark:border-border/50 hover:border-primary-500/50'
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 rounded-lg cursor-grab active:cursor-grabbing bg-muted text-muted-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15 z-10 transition-colors"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical size={14} />
      </div>

      {/* Visibility toggle */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="unstyled"
          size="unstyled"
          type="button"
          onClick={() => onToggleVisibility(id)}
          disabled={!canToggle}
          className={`p-1.5 rounded-lg transition-colors ${
            isHidden
              ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'
              : !canToggle
                ? 'bg-muted text-muted-foreground/30 cursor-not-allowed dark:bg-white/5 dark:text-muted-foreground/30'
                : 'bg-muted text-muted-foreground hover:bg-accent dark:bg-white/10 dark:text-muted-foreground dark:hover:bg-white/15'
          }`}
          aria-label={isHidden ? 'Mostrar seção' : 'Esconder seção'}
          aria-pressed={!isHidden}
        >
          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </Button>
      </div>

      {/* Section content */}
      <div className="pt-1">{children}</div>
    </div>
  )
}
