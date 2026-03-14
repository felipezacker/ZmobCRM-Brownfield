import { useState, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

interface DashboardLayout {
  version: 1
  sectionOrder: string[]
  hiddenSections: string[]
}

const STORAGE_KEY_PREFIX = 'prospecting_dashboard_layout_'

function loadLayoutFromStorage(
  userId: string,
  defaultOrder: string[],
): { sectionOrder: string[]; hiddenSections: Set<string> } {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    if (!raw) return { sectionOrder: defaultOrder, hiddenSections: new Set() }

    const parsed: DashboardLayout = JSON.parse(raw)
    if (parsed.version !== 1 || !Array.isArray(parsed.sectionOrder)) {
      return { sectionOrder: defaultOrder, hiddenSections: new Set() }
    }

    // Merge: keep saved order for existing sections, append new sections at end
    const mergedOrder = [
      ...parsed.sectionOrder.filter(id => defaultOrder.includes(id)),
      ...defaultOrder.filter(id => !parsed.sectionOrder.includes(id)),
    ]

    const hiddenSections = new Set(
      Array.isArray(parsed.hiddenSections)
        ? parsed.hiddenSections.filter(id => defaultOrder.includes(id))
        : [],
    )

    return { sectionOrder: mergedOrder, hiddenSections }
  } catch {
    return { sectionOrder: defaultOrder, hiddenSections: new Set() }
  }
}

function saveLayoutToStorage(
  userId: string,
  sectionOrder: string[],
  hiddenSections: Set<string>,
): void {
  const layout: DashboardLayout = {
    version: 1,
    sectionOrder,
    hiddenSections: Array.from(hiddenSections),
  }
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(layout))
}

export function useDashboardLayout(userId: string | undefined, defaultOrder: string[]) {
  // Fix QA#1: Single localStorage parse on init (avoid double call)
  const initialLayoutRef = useRef<{ sectionOrder: string[]; hiddenSections: Set<string> } | null>(null)
  if (!initialLayoutRef.current) {
    initialLayoutRef.current = userId
      ? loadLayoutFromStorage(userId, defaultOrder)
      : { sectionOrder: defaultOrder, hiddenSections: new Set<string>() }
  }

  const [sectionOrder, setSectionOrder] = useState<string[]>(initialLayoutRef.current.sectionOrder)
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(initialLayoutRef.current.hiddenSections)

  const [isEditing, setIsEditing] = useState(false)
  const backupRef = useRef<{ order: string[]; hidden: Set<string> }>({
    order: [],
    hidden: new Set(),
  })

  const startEditing = useCallback(() => {
    backupRef.current = { order: [...sectionOrder], hidden: new Set(hiddenSections) }
    setIsEditing(true)
  }, [sectionOrder, hiddenSections])

  const saveLayout = useCallback(() => {
    if (userId) {
      saveLayoutToStorage(userId, sectionOrder, hiddenSections)
    }
    setIsEditing(false)
  }, [userId, sectionOrder, hiddenSections])

  const cancelEditing = useCallback(() => {
    setSectionOrder(backupRef.current.order)
    setHiddenSections(backupRef.current.hidden)
    setIsEditing(false)
  }, [])

  // Fix QA#3: Prevent hiding all sections — at least 1 must remain visible
  const toggleVisibility = useCallback((sectionId: string) => {
    setHiddenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  const reorder = useCallback((activeId: string, overId: string) => {
    setSectionOrder(prev => {
      const oldIndex = prev.indexOf(activeId)
      const newIndex = prev.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }, [])

  // Fix QA#3: Computed property — number of visible (non-hidden) sections
  const visibleCount = defaultOrder.length - hiddenSections.size
  const canHideMore = visibleCount > 1

  return {
    sectionOrder,
    hiddenSections,
    isEditing,
    canHideMore,
    startEditing,
    saveLayout,
    cancelEditing,
    toggleVisibility,
    reorder,
  }
}
