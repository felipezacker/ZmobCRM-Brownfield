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
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'open' | 'won' | 'lost' | 'all'>('open');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dealSortBy, setDealSortBy] = useState<DealSortableColumn>('createdAt');
  const [dealSortOrder, setDealSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAllRecent, setShowAllRecent] = useState(false);

  // Advanced filters (BUX-7)
  const [dealTypeFilter, setDealTypeFilter] = useState<string[]>([]);
  const [valueRange, setValueRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [closeDateFilter, setCloseDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [probabilityRange, setProbabilityRange] = useState<{ min: number; max: number }>({ min: 0, max: 100 });

  // Initialize filters from URL
  useEffect(() => {
    if (!searchParams) return;
    const statusParam = searchParams.get('status');
    if (statusParam === 'open' || statusParam === 'won' || statusParam === 'lost' || statusParam === 'all') {
      setStatusFilter(statusParam);
    }
    const priorityParam = searchParams.get('priority');
    if (priorityParam === 'high' || priorityParam === 'medium' || priorityParam === 'low') {
      setPriorityFilter(priorityParam);
    }
    const ownerParam = searchParams.get('owner');
    if (ownerParam) setOwnerFilter(ownerParam);
    const dateStart = searchParams.get('dateStart');
    const dateEnd = searchParams.get('dateEnd');
    if (dateStart || dateEnd) setDateRange({ start: dateStart || '', end: dateEnd || '' });
    // Advanced filters from URL (BUX-7)
    const dealTypeParam = searchParams.get('dealType');
    if (dealTypeParam) setDealTypeFilter(dealTypeParam.split(','));
    const valueMinParam = searchParams.get('valueMin');
    const valueMaxParam = searchParams.get('valueMax');
    if (valueMinParam || valueMaxParam) setValueRange({
      min: valueMinParam ? Number(valueMinParam) : null,
      max: valueMaxParam ? Number(valueMaxParam) : null,
    });
    const closeDateStartParam = searchParams.get('closeDateStart');
    const closeDateEndParam = searchParams.get('closeDateEnd');
    if (closeDateStartParam || closeDateEndParam) setCloseDateFilter({
      start: closeDateStartParam || '', end: closeDateEndParam || '',
    });
    const productParam = searchParams.get('product');
    if (productParam) setProductFilter(productParam.split(','));
    const tagsParam = searchParams.get('tags');
    if (tagsParam) setTagFilter(tagsParam.split(','));
    const probMinParam = searchParams.get('probMin');
    const probMaxParam = searchParams.get('probMax');
    if (probMinParam || probMaxParam) setProbabilityRange({
      min: probMinParam ? Number(probMinParam) : 0,
      max: probMaxParam ? Number(probMaxParam) : 100,
    });
  }, [searchParams]);

  // Sync active filters to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (priorityFilter !== 'all') params.set('priority', priorityFilter); else params.delete('priority');
    if (ownerFilter !== 'all') params.set('owner', ownerFilter); else params.delete('owner');
    if (dateRange.start) params.set('dateStart', dateRange.start); else params.delete('dateStart');
    if (dateRange.end) params.set('dateEnd', dateRange.end); else params.delete('dateEnd');
    if (statusFilter !== 'open') params.set('status', statusFilter); else params.delete('status');
    // Advanced filters URL sync (BUX-7)
    if (dealTypeFilter.length > 0) params.set('dealType', dealTypeFilter.join(',')); else params.delete('dealType');
    if (valueRange.min !== null) params.set('valueMin', String(valueRange.min)); else params.delete('valueMin');
    if (valueRange.max !== null) params.set('valueMax', String(valueRange.max)); else params.delete('valueMax');
    if (closeDateFilter.start) params.set('closeDateStart', closeDateFilter.start); else params.delete('closeDateStart');
    if (closeDateFilter.end) params.set('closeDateEnd', closeDateFilter.end); else params.delete('closeDateEnd');
    if (productFilter.length > 0) params.set('product', productFilter.join(',')); else params.delete('product');
    if (tagFilter.length > 0) params.set('tags', tagFilter.join(',')); else params.delete('tags');
    if (probabilityRange.min > 0) params.set('probMin', String(probabilityRange.min)); else params.delete('probMin');
    if (probabilityRange.max < 100) params.set('probMax', String(probabilityRange.max)); else params.delete('probMax');
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
  }, [priorityFilter, ownerFilter, dateRange.start, dateRange.end, statusFilter,
      dealTypeFilter, valueRange, closeDateFilter, productFilter, tagFilter, probabilityRange]);

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
    const searchNormalized = searchLower.replace(/-/g, ' ');
    const startTime = dateRange.start ? new Date(dateRange.start).getTime() : null;
    let endTime: number | null = null;
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      endTime = endDate.getTime();
    }

    return deals.filter(l => {
      const matchesSearch = !searchLower || [l.title, l.contactName, l.contactPhone, l.propertyRef, ...(l.items || []).map(i => i.name)]
        .some(field => {
          const normalized = (field || '').toLowerCase().replace(/-/g, ' ');
          return normalized.includes(searchNormalized);
        });
      const matchesOwner = !ownerFilter || ownerFilter === 'all'
        ? true
        : ownerFilter === 'mine'
          ? l.ownerId === profileId
          : l.ownerId === ownerFilter;
      const matchesPriority = priorityFilter === 'all' || l.priority === priorityFilter;
      let matchesDate = true;
      if (startTime !== null) matchesDate = new Date(l.createdAt).getTime() >= startTime;
      if (matchesDate && endTime !== null) matchesDate = new Date(l.createdAt).getTime() <= endTime;

      let matchesStatus = true;
      if (statusFilter === 'open') matchesStatus = !l.isWon && !l.isLost;
      else if (statusFilter === 'won') matchesStatus = l.isWon;
      else if (statusFilter === 'lost') matchesStatus = l.isLost;

      let matchesRecent = true;
      if (!showAllRecent && (statusFilter === 'open' || statusFilter === 'all')) {
        if (l.isWon || l.isLost) {
          if (new Date(l.updatedAt).getTime() < cutoffTime) matchesRecent = false;
        }
      }

      // Advanced filters (BUX-7)
      const matchesDealType = dealTypeFilter.length === 0 || dealTypeFilter.includes(l.dealType || '');
      const matchesValueRange = (valueRange.min === null || (l.value ?? 0) >= valueRange.min) &&
                                (valueRange.max === null || (l.value ?? 0) <= valueRange.max);
      let matchesCloseDate = true;
      if (closeDateFilter.start || closeDateFilter.end) {
        if (!l.expectedCloseDate) { matchesCloseDate = false; }
        else {
          const closeTime = new Date(l.expectedCloseDate).getTime();
          if (closeDateFilter.start) matchesCloseDate = closeTime >= new Date(closeDateFilter.start).getTime();
          if (matchesCloseDate && closeDateFilter.end) {
            const endOfDay = new Date(closeDateFilter.end);
            endOfDay.setHours(23, 59, 59, 999);
            matchesCloseDate = closeTime <= endOfDay.getTime();
          }
        }
      }
      const matchesProduct = productFilter.length === 0 || (l.items || []).some(i => productFilter.includes(i.name));
      const matchesTags = tagFilter.length === 0 || (l.contactTags || []).some(t => tagFilter.includes(t));
      const matchesProbability = (l.probability ?? 0) >= probabilityRange.min && (l.probability ?? 0) <= probabilityRange.max;

      return matchesSearch && matchesOwner && matchesPriority && matchesDate && matchesStatus && matchesRecent
        && matchesDealType && matchesValueRange && matchesCloseDate && matchesProduct && matchesTags && matchesProbability;
    }).map(deal => {
      if (deal.ownerId === profileId) {
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
  }, [deals, searchTerm, ownerFilter, priorityFilter, dateRange.start, dateRange.end, statusFilter,
      profileId, profileNickname, profileFirstName, profileAvatarUrl, orgMembersById, showAllRecent,
      dealTypeFilter, valueRange, closeDateFilter, productFilter, tagFilter, probabilityRange]);

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

  // Advanced filter helpers (BUX-7)
  const clearAdvancedFilters = useCallback(() => {
    setDealTypeFilter([]);
    setValueRange({ min: null, max: null });
    setCloseDateFilter({ start: '', end: '' });
    setProductFilter([]);
    setTagFilter([]);
    setProbabilityRange({ min: 0, max: 100 });
  }, []);

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (dealTypeFilter.length > 0) count++;
    if (valueRange.min !== null || valueRange.max !== null) count++;
    if (closeDateFilter.start || closeDateFilter.end) count++;
    if (productFilter.length > 0) count++;
    if (tagFilter.length > 0) count++;
    if (probabilityRange.min > 0 || probabilityRange.max < 100) count++;
    return count;
  }, [dealTypeFilter, valueRange, closeDateFilter, productFilter, tagFilter, probabilityRange]);

  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    deals.forEach(d => (d.items || []).forEach(i => { if (i.name) set.add(i.name); }));
    return Array.from(set).sort();
  }, [deals]);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    deals.forEach(d => (d.contactTags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [deals]);

  return {
    searchTerm, setSearchTerm,
    ownerFilter, setOwnerFilter,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    dateRange, setDateRange,
    dealSortBy, dealSortOrder, handleDealSort,
    filteredDeals, hiddenByRecentCount, sortedDeals,
    showAllRecent, setShowAllRecent,
    // Advanced filters (BUX-7)
    dealTypeFilter, setDealTypeFilter,
    valueRange, setValueRange,
    closeDateFilter, setCloseDateFilter,
    productFilter, setProductFilter,
    tagFilter, setTagFilter,
    probabilityRange, setProbabilityRange,
    clearAdvancedFilters, activeAdvancedFilterCount,
    uniqueProducts, uniqueTags,
  };
};
