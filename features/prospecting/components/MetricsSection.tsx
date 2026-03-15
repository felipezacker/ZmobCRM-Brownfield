'use client'

import React, { useState } from 'react'
import { ChevronDown, GripVertical, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ItemDef } from './SortableItemEditor'

export interface MetricsSectionEditMode {
  dragAttributes: React.HTMLAttributes<HTMLElement>
  dragListeners: Record<string, unknown> | undefined
  isHidden: boolean
  canHideMore: boolean
  onToggleVisibility: () => void
  items?: ItemDef[]
  hiddenItems?: Set<string>
  onToggleItem?: (itemId: string) => void
  onReorderItems?: (activeId: string, overId: string) => void
}

interface MetricsSectionProps {
  title: string
  icon: React.ElementType
  iconColor?: string
  defaultOpen?: boolean
  children: React.ReactNode
  editMode?: MetricsSectionEditMode
}

export function MetricsSection({
  title,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  defaultOpen = true,
  children,
  editMode,
}: MetricsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Edit mode: header = drag handle, content = inert preview
  if (editMode) {
    const canToggle = editMode.isHidden || editMode.canHideMore
    return (
      <div>
        <div
          {...editMode.dragAttributes}
          {...editMode.dragListeners}
          className="flex items-center gap-2 w-full py-2 cursor-grab active:cursor-grabbing select-none"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical size={14} className="text-muted-foreground shrink-0" />
          <Icon size={14} className={iconColor} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className="flex-1 h-px bg-border dark:bg-border/50 mx-2" />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); editMode.onToggleVisibility() }}
            onPointerDown={(e) => e.stopPropagation()}
            disabled={!canToggle}
            className={`p-1 rounded-md shrink-0 transition-colors ${
              editMode.isHidden
                ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'
                : !canToggle
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-accent dark:hover:bg-white/10'
            }`}
            aria-label={editMode.isHidden ? 'Mostrar seção' : 'Esconder seção'}
            aria-pressed={!editMode.isHidden}
          >
            {editMode.isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {/* Content: items with own edit controls, or inert preview for single-item sections */}
        {editMode.items && editMode.items.length > 0 ? (
          <div className="mt-1 space-y-4">{children}</div>
        ) : (
          <div className="pointer-events-none opacity-50 mt-1 space-y-4">
            {children}
          </div>
        )}
      </div>
    )
  }

  // Normal mode
  return (
    <div>
      <Button
        variant="unstyled"
        size="unstyled"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 w-full py-2 group"
      >
        <Icon size={14} className={iconColor} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className="flex-1 h-px bg-border dark:bg-border/50 mx-2" />
        <ChevronDown
          size={14}
          className={`text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </Button>
      {isOpen && (
        <div className="space-y-4 mt-1">
          {children}
        </div>
      )}
    </div>
  )
}
