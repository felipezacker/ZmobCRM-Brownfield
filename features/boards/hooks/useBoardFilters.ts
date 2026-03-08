import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DealView, DealSortableColumn } from '@/types';

interface UseBoardFiltersParams {
  deals: DealView[];
  profileId: string | null | undefined;
  profileNickname: string | null | undefined;
  profileFirstName: string | null | undefined;
  profileAvatarUrl: string | null | undefined;
  orgMembersById: Map<string, { name: string; avatar: string }>;
  viewMode: 'kanban' | 'list';
}

export const useBoardFilters = ({
  deals, profileId, profileNickname, profileFirstName, profileAvatarUrl,
  orgMembersById, viewMode,
}: UseBoardFiltersParams) => {
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'won' | 'lost' | 'all'>('open');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [dealSortBy, setDealSortBy] = useState<DealSortableColumn>('createdAt');
  const [dealSortOrder, setDealSortOrder] = useState<'asc' | 'desc'>('desc');

  // Initialize filters from URL
  useEffect(() => {
    if (!searchParams) return;
    const statusParam = searchParams.get('status');
    if (statusParam === 'open' || statusParam === 'won' || statusParam === 'lost' || statusParam === 'all') {
      setStatusFilter(statusParam);
    }
  }, [searchParams]);

  const handleDealSort = useCallback((column: DealSortableColumn) => {
    setDealSortBy(prev => {
      if (prev === column) {
        setDealSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setDealSortOrder('desc');
      return column;
    });
  }, []);

  const filteredDeals = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffTime = cutoffDate.getTime();
    const searchLower = searchTerm.toLowerCase();
    const startTime = dateRange.start ? new Date(dateRange.start).getTime() : null;
    let endTime: number | null = null;
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      endTime = endDate.getTime();
    }

    return deals.filter(l => {
      const matchesSearch = (l.title || '').toLowerCase().includes(searchLower);
      const matchesOwner = ownerFilter === 'all' || l.ownerId === profileId;
      let matchesDate = true;
      if (startTime !== null) matchesDate = new Date(l.createdAt).getTime() >= startTime;
      if (matchesDate && endTime !== null) matchesDate = new Date(l.createdAt).getTime() <= endTime;

      let matchesStatus = true;
      if (statusFilter === 'open') matchesStatus = !l.isWon && !l.isLost;
      else if (statusFilter === 'won') matchesStatus = l.isWon;
      else if (statusFilter === 'lost') matchesStatus = l.isLost;

      let matchesRecent = true;
      if (statusFilter === 'open' || statusFilter === 'all') {
        if (l.isWon || l.isLost) {
          if (new Date(l.updatedAt).getTime() < cutoffTime) matchesRecent = false;
        }
      }
      return matchesSearch && matchesOwner && matchesDate && matchesStatus && matchesRecent;
    }).map(deal => {
      if (deal.ownerId === profileId || deal.ownerId === (profileId as any)) {
        return {
          ...deal,
          owner: {
            name: profileNickname || profileFirstName || 'Eu',
            avatar: profileAvatarUrl || '',
          },
        };
      }
      const liveMember = deal.ownerId ? orgMembersById.get(deal.ownerId) : undefined;
      if (liveMember) return { ...deal, owner: { name: liveMember.name, avatar: liveMember.avatar } };
      return deal;
    });
  }, [deals, searchTerm, ownerFilter, dateRange.start, dateRange.end, statusFilter,
      profileId, profileNickname, profileFirstName, profileAvatarUrl, orgMembersById]);

  const hiddenByRecentCount = useMemo(() => {
    if (statusFilter !== 'open' && statusFilter !== 'all') return 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffTime = cutoffDate.getTime();
    return deals.filter(
      d => (d.isWon || d.isLost) && new Date(d.closedAt || d.updatedAt).getTime() < cutoffTime
    ).length;
  }, [deals, statusFilter]);

  const sortedDeals = useMemo(() => {
    if (viewMode !== 'list') return filteredDeals;
    const sorted = [...filteredDeals];
    const dir = dealSortOrder === 'asc' ? 1 : -1;
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    sorted.sort((a, b) => {
      switch (dealSortBy) {
        case 'title': return dir * collator.compare(a.title || '', b.title || '');
        case 'stageLabel': return dir * collator.compare(a.stageLabel || '', b.stageLabel || '');
        case 'value': return dir * ((a.value ?? 0) - (b.value ?? 0));
        case 'owner': {
          const aName = (a.ownerId ? orgMembersById.get(a.ownerId)?.name : undefined) || a.owner?.name || '';
          const bName = (b.ownerId ? orgMembersById.get(b.ownerId)?.name : undefined) || b.owner?.name || '';
          return dir * collator.compare(aName, bName);
        }
        case 'nextActivity': {
          const aDate = a.nextActivity?.date ? new Date(a.nextActivity.date).getTime() : 0;
          const bDate = b.nextActivity?.date ? new Date(b.nextActivity.date).getTime() : 0;
          return dir * (aDate - bDate);
        }
        case 'createdAt':
        default:
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    });
    return sorted;
  }, [filteredDeals, viewMode, dealSortBy, dealSortOrder, orgMembersById]);

  return {
    searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter,
    statusFilter, setStatusFilter,
    dateRange, setDateRange,
    dealSortBy, dealSortOrder, handleDealSort,
    filteredDeals, hiddenByRecentCount, sortedDeals,
  };
};
