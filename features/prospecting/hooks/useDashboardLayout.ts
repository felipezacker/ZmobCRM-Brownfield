import { useState, useCallback, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'

interface StoredItemConfig {
  order: string[]
  hidden: string[]
}

interface DashboardLayoutV2 {
  version: 2
  sectionOrder: string[]
  hiddenSections: string[]
  itemConfig: Record<string, StoredItemConfig>
}

export interface ItemConfig {
  order: string[]
  hidden: Set<string>
}

const STORAGE_KEY_PREFIX = 'prospecting_dashboard_layout_'

interface LoadedLayout {
  sectionOrder: string[]
  hiddenSections: Set<string>
  itemConfig: Record<string, ItemConfig>
}

function loadLayoutFromStorage(userId: string, defaultOrder: string[]): LoadedLayout {
  const fallback: LoadedLayout = { sectionOrder: defaultOrder, hiddenSections: new Set(), itemConfig: {} }
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`)
    if (!raw) return fallback

    const parsed = JSON.parse(raw)
    // Accept version 1 (no itemConfig) and version 2
    if ((!parsed.version && !parsed.sectionOrder) || (parsed.version > 2)) return fallback
    if (!Array.isArray(parsed.sectionOrder)) return fallback

    const mergedOrder = [
      ...parsed.sectionOrder.filter((id: string) => defaultOrder.includes(id)),
      ...defaultOrder.filter(id => !parsed.sectionOrder.includes(id)),
    ]

    const hiddenSections = new Set<string>(
      Array.isArray(parsed.hiddenSections)
        ? parsed.hiddenSections.filter((id: string) => defaultOrder.includes(id))
        : [],
    )

    // Migrate v1 (no itemConfig) to v2
    const itemConfig: Record<string, ItemConfig> = {}
    if (parsed.itemConfig && typeof parsed.itemConfig === 'object') {
      for (const [sectionId, conf] of Object.entries(parsed.itemConfig)) {
        const c = conf as StoredItemConfig
        if (Array.isArray(c.order)) {
          itemConfig[sectionId] = {
            order: c.order,
            hidden: new Set(Array.isArray(c.hidden) ? c.hidden : []),
          }
        }
      }
    }

    return { sectionOrder: mergedOrder, hiddenSections, itemConfig }
  } catch {
    return fallback
  }
}

function saveLayoutToStorage(
  userId: string,
  sectionOrder: string[],
  hiddenSections: Set<string>,
  itemConfig: Record<string, ItemConfig>,
): void {
  const storedItems: Record<string, StoredItemConfig> = {}
  for (const [sectionId, conf] of Object.entries(itemConfig)) {
    storedItems[sectionId] = { order: conf.order, hidden: Array.from(conf.hidden) }
  }
  const layout: DashboardLayoutV2 = {
    version: 2,
    sectionOrder,
    hiddenSections: Array.from(hiddenSections),
    itemConfig: storedItems,
  }
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(layout))
}

export function useDashboardLayout(userId: string | undefined, defaultOrder: string[]) {
  const initialLayoutRef = useRef<LoadedLayout | null>(null)
  if (!initialLayoutRef.current) {
    initialLayoutRef.current = userId
      ? loadLayoutFromStorage(userId, defaultOrder)
      : { sectionOrder: defaultOrder, hiddenSections: new Set<string>(), itemConfig: {} }
  }

  const [sectionOrder, setSectionOrder] = useState<string[]>(initialLayoutRef.current.sectionOrder)
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(initialLayoutRef.current.hiddenSections)
  const [itemConfig, setItemConfig] = useState<Record<string, ItemConfig>>(initialLayoutRef.current.itemConfig)

  const [isEditing, setIsEditing] = useState(false)
  const backupRef = useRef<{
    order: string[]
    hidden: Set<string>
    items: Record<string, ItemConfig>
  }>({ order: [], hidden: new Set(), items: {} })

  const startEditing = useCallback(() => {
    backupRef.current = {
      order: [...sectionOrder],
      hidden: new Set(hiddenSections),
      items: Object.fromEntries(
        Object.entries(itemConfig).map(([k, v]) => [k, { order: [...v.order], hidden: new Set(v.hidden) }]),
      ),
    }
    setIsEditing(true)
  }, [sectionOrder, hiddenSections, itemConfig])

  const saveLayout = useCallback(() => {
    if (userId) {
      saveLayoutToStorage(userId, sectionOrder, hiddenSections, itemConfig)
    }
    setIsEditing(false)
  }, [userId, sectionOrder, hiddenSections, itemConfig])

  const cancelEditing = useCallback(() => {
    setSectionOrder(backupRef.current.order)
    setHiddenSections(backupRef.current.hidden)
    setItemConfig(backupRef.current.items)
    setIsEditing(false)
  }, [])

  const toggleVisibility = useCallback((sectionId: string) => {
    setHiddenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
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

  // --- Item-level operations ---

  const getItemOrder = useCallback((sectionId: string, defaultItems: string[]): string[] => {
    const conf = itemConfig[sectionId]
    if (!conf) return defaultItems
    return [
      ...conf.order.filter(id => defaultItems.includes(id)),
      ...defaultItems.filter(id => !conf.order.includes(id)),
    ]
  }, [itemConfig])

  const getHiddenItems = useCallback((sectionId: string): Set<string> => {
    return itemConfig[sectionId]?.hidden || new Set()
  }, [itemConfig])

  const toggleItemVisibility = useCallback((sectionId: string, itemId: string) => {
    setItemConfig(prev => {
      const conf = prev[sectionId] || { order: [], hidden: new Set<string>() }
      const nextHidden = new Set(conf.hidden)
      if (nextHidden.has(itemId)) nextHidden.delete(itemId)
      else nextHidden.add(itemId)
      return { ...prev, [sectionId]: { ...conf, hidden: nextHidden } }
    })
  }, [])

  const reorderItems = useCallback((sectionId: string, activeId: string, overId: string) => {
    setItemConfig(prev => {
      const conf = prev[sectionId]
      if (!conf) return prev
      const oldIdx = conf.order.indexOf(activeId)
      const newIdx = conf.order.indexOf(overId)
      if (oldIdx === -1 || newIdx === -1) return prev
      return { ...prev, [sectionId]: { ...conf, order: arrayMove(conf.order, oldIdx, newIdx) } }
    })
  }, [])

  const initItemOrder = useCallback((sectionId: string, defaultItems: string[]) => {
    setItemConfig(prev => {
      if (prev[sectionId]) return prev
      return { ...prev, [sectionId]: { order: defaultItems, hidden: new Set() } }
    })
  }, [])

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
    // Item-level
    getItemOrder,
    getHiddenItems,
    toggleItemVisibility,
    reorderItems,
    initItemOrder,
  }
}
