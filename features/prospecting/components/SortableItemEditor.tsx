'use client'

import React, { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'

export interface ItemDef {
  id: string
  label: string
}

// --- Sortable wrapper for individual items (shows real content with controls) ---

function SortableItemBlock({ id, isHidden, onToggle, children }: {
  id: string
  isHidden: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isHidden ? 0.3 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Controls bar at top of each item */}
      <div className="absolute -top-0.5 left-0 right-0 flex items-center justify-between z-10 px-1">
        <div
          {...attributes}
          {...listeners}
          className="p-0.5 rounded cursor-grab active:cursor-grabbing bg-white/80 dark:bg-black/50 shadow-sm backdrop-blur-sm"
          aria-label="Arrastar item"
        >
          <GripVertical size={10} className="text-muted-foreground" />
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(id) }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-0.5 rounded shadow-sm backdrop-blur-sm transition-colors ${
            isHidden
              ? 'bg-red-100/90 text-red-500 dark:bg-red-500/30 dark:text-red-400'
              : 'bg-white/80 text-muted-foreground/60 hover:text-muted-foreground dark:bg-black/50'
          }`}
          aria-label={isHidden ? 'Mostrar item' : 'Esconder item'}
        >
          {isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
        </button>
      </div>
      {/* Content — non-interactive during edit */}
      <div className={`pointer-events-none ${isHidden ? 'grayscale' : ''}`}>
        {children}
      </div>
    </div>
  )
}

// --- Container for sortable items with DnD context ---

interface SortableItemContainerProps {
  itemIds: string[]
  hiddenItems: Set<string>
  onToggleItem: (itemId: string) => void
  onReorderItems: (activeId: string, overId: string) => void
  renderItem: (itemId: string) => React.ReactNode
  className?: string
}

export function SortableItemContainer({
  itemIds,
  hiddenItems,
  onToggleItem,
  onReorderItems,
  renderItem,
  className = 'space-y-4',
}: SortableItemContainerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      onReorderItems(active.id as string, over.id as string)
    }
  }, [onReorderItems])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={className}>
          {itemIds.map(id => (
            <SortableItemBlock key={id} id={id} isHidden={hiddenItems.has(id)} onToggle={onToggleItem}>
              {renderItem(id)}
            </SortableItemBlock>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
