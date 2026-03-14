'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

  // Edit mode: inject editMode prop into MetricsSection child
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const editModeProps = {
    editMode: {
      dragAttributes: attributes,
      dragListeners: listeners,
      isHidden,
      canHideMore,
      onToggleVisibility: () => onToggleVisibility(id),
    },
  }

  const child = React.Children.only(children)
  const editChild = React.isValidElement(child)
    ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, editModeProps)
    : child

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border-2 border-dashed px-1 transition-colors ${
        isHidden
          ? 'border-muted-foreground/20 opacity-40'
          : isDragging
            ? 'border-primary-500 bg-primary-500/5'
            : 'border-border dark:border-border/50 hover:border-primary-500/50'
      }`}
    >
      {editChild}
    </div>
  )
}
