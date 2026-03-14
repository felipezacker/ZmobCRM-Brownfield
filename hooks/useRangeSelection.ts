import { useState, useCallback, useEffect, useMemo } from 'react';

interface UseRangeSelectionOptions<T extends { id: string }> {
  /** The current list of items (in display order) */
  items: T[];
}

interface UseRangeSelectionReturn {
  selectedIds: Set<string>;
  lastClickedIndex: number | null;
  /** Toggle a single item, or shift+click for range select */
  toggle: (id: string, event?: React.MouseEvent | { shiftKey: boolean }) => void;
  /** Toggle all items (select all / deselect all) */
  toggleAll: () => void;
  /** Clear all selections */
  clear: () => void;
  /** Whether all items are selected */
  allSelected: boolean;
  /** Whether some (but not all) items are selected */
  someSelected: boolean;
}

/**
 * Generic hook for list selection with shift+click range support.
 * Extracted from CallQueue pattern — used across Contacts, Activities, Deals, etc.
 */
export function useRangeSelection<T extends { id: string }>({
  items,
}: UseRangeSelectionOptions<T>): UseRangeSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  // Clean stale selections when items change
  const itemIds = useMemo(() => new Set(items.map(i => i.id)), [items]);
  useEffect(() => {
    setSelectedIds(prev => {
      if (prev.size === 0) return prev;
      const cleaned = new Set([...prev].filter(id => itemIds.has(id)));
      return cleaned.size === prev.size ? prev : cleaned;
    });
  }, [itemIds]);

  const toggle = useCallback(
    (id: string, event?: React.MouseEvent | { shiftKey: boolean }) => {
      const clickedIndex = items.findIndex(i => i.id === id);

      if (event?.shiftKey && lastClickedIndex !== null && clickedIndex !== -1) {
        const start = Math.min(lastClickedIndex, clickedIndex);
        const end = Math.max(lastClickedIndex, clickedIndex);
        const rangeIds = items.slice(start, end + 1).map(i => i.id);
        setSelectedIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(rid => next.add(rid));
          return next;
        });
      } else {
        setSelectedIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
      setLastClickedIndex(clickedIndex);
    },
    [items, lastClickedIndex],
  );

  const toggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === items.length ? new Set() : new Set(items.map(i => i.id)),
    );
  }, [items]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return { selectedIds, lastClickedIndex, toggle, toggleAll, clear, allSelected, someSelected };
}
