import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';

export interface OrphanDeal {
  id: string;
  title: string;
  value: number | null;
  status: string | null;
  board_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseOrphanDealsParams {
  sb: SupabaseClient | null;
  addToast: (message: string, type: 'success' | 'error') => void;
  queryClient: QueryClient;
}

export function useOrphanDeals({ sb, addToast, queryClient }: UseOrphanDealsParams) {
  const [count, setCount] = useState<number | null>(null);
  const [orphans, setOrphans] = useState<OrphanDeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignContactId, setAssignContactId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!sb) return;
    const { data, error } = await sb.rpc('get_orphan_deals_count');
    if (!error && typeof data === 'number') setCount(data);
  }, [sb]);

  useEffect(() => { fetchCount(); }, [fetchCount]);

  const fetchOrphans = async () => {
    if (!sb) return;
    setLoading(true);
    const { data, error } = await sb.rpc('list_orphan_deals', { p_limit: 50, p_offset: 0 });
    if (error) {
      addToast('Erro ao carregar deals órfãos', 'error');
    } else {
      setOrphans((data ?? []) as OrphanDeal[]);
    }
    setLoading(false);
  };

  const toggleExpand = () => {
    if (!expanded) fetchOrphans();
    setExpanded(!expanded);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === orphans.length) setSelected(new Set());
    else setSelected(new Set(orphans.map(o => o.id)));
  };

  const handleAssign = async () => {
    if (!sb || !assignContactId || selected.size === 0) return;
    setActionLoading(true);
    const { data, error } = await sb.rpc('assign_orphan_deals_to_contact', {
      p_deal_ids: Array.from(selected),
      p_contact_id: assignContactId,
    });
    if (error) {
      addToast(error.message || 'Erro ao atribuir deals', 'error');
    } else {
      addToast(`${data} deal(s) atribuído(s) ao contato`, 'success');
      setSelected(new Set());
      setAssignContactId('');
      await fetchCount();
      await fetchOrphans();
      await queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!sb || selected.size === 0) return;
    setActionLoading(true);
    const { data, error } = await sb.rpc('delete_orphan_deals', {
      p_deal_ids: Array.from(selected),
    });
    if (error) {
      addToast(error.message || 'Erro ao excluir deals', 'error');
    } else {
      addToast(`${data} deal(s) excluído(s)`, 'success');
      setSelected(new Set());
      await fetchCount();
      await fetchOrphans();
      await queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    }
    setActionLoading(false);
  };

  return {
    count,
    orphans,
    loading,
    expanded,
    selected,
    assignContactId,
    setAssignContactId,
    actionLoading,
    showDeleteConfirm,
    setShowDeleteConfirm,
    toggleExpand,
    toggleSelect,
    selectAll,
    handleAssign,
    handleDelete,
  };
}
