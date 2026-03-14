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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye, EyeOff } from 'lucide-react'

export interface ItemDef {
  id: string
  label: string
}

interface SortableItemEditorProps {
  items: ItemDef[]
  hiddenItems: Set<string>
  onToggleItem: (itemId: string) => void
  onReorderItems: (activeId: string, overId: string) => void
}

function SortableItemPill({ item, isHidden, onToggle }: {
  item: ItemDef
  isHidden: boolean
  onToggle: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-colors ${
        isHidden
          ? 'bg-muted/30 text-muted-foreground/40 line-through dark:bg-white/5'
          : 'bg-white text-secondary-foreground shadow-sm border border-border dark:bg-white/10 dark:text-muted-foreground dark:border-border/50'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0"
        aria-label={`Arrastar ${item.label}`}
      >
        <GripVertical size={12} className="text-muted-foreground/50" />
      </div>
      <span className="truncate">{item.label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(item.id) }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`shrink-0 p-0.5 rounded transition-colors ${
          isHidden
            ? 'text-red-400 hover:text-red-500'
            : 'text-muted-foreground/40 hover:text-muted-foreground'
        }`}
        aria-label={isHidden ? `Mostrar ${item.label}` : `Esconder ${item.label}`}
      >
        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  )
}

export function SortableItemEditor({ items, hiddenItems, onToggleItem, onReorderItems }: SortableItemEditorProps) {
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
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-wrap gap-1.5 px-2 py-2">
          {items.map(item => (
            <SortableItemPill
              key={item.id}
              item={item}
              isHidden={hiddenItems.has(item.id)}
              onToggle={onToggleItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
