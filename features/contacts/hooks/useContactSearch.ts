import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ContactStage,
  PaginationState,
  ContactsServerFilters,
  DEFAULT_PAGE_SIZE,
  ContactSortableColumn,
} from '@/types';
import {
  useContactsPaginated,
  useContactStageCounts,
} from '@/lib/query/hooks/useContactsQuery';

interface UseContactSearchParams {
  sortBy: ContactSortableColumn;
  sortOrder: 'asc' | 'desc';
  classificationFilter: string[];
  temperatureFilter: string;
  contactTypeFilter: string;
  ownerFilter: string;
  sourceFilter: string;
  selectedListId?: string | null;
}

export const useContactSearch = ({
  sortBy,
  sortOrder,
  classificationFilter,
  temperatureFilter,
  contactTypeFilter,
  ownerFilter,
  sourceFilter,
  selectedListId,
}: UseContactSearchParams) => {
  const searchParams = useSearchParams();

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // Basic search/filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'RISK'
  >(() => {
    const filter = searchParams?.get('filter');
    const validFilters = ['ALL', 'ACTIVE', 'INACTIVE', 'CHURNED', 'RISK'] as const;
    return validFilters.includes(filter as (typeof validFilters)[number])
      ? (filter as (typeof validFilters)[number])
      : 'ALL';
  });
  const [stageFilter, setStageFilter] = useState<ContactStage | 'ALL'>(
    (searchParams?.get('stage') as ContactStage) || 'ALL'
  );
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Build server filters from state
  const serverFilters = useMemo<ContactsServerFilters | undefined>(() => {
    const filters: ContactsServerFilters = {};
    if (search.trim()) filters.search = search.trim();
    if (stageFilter !== 'ALL') filters.stage = stageFilter;
    if (statusFilter !== 'ALL') filters.status = statusFilter;
    if (dateRange.start) filters.dateStart = dateRange.start;
    if (dateRange.end) filters.dateEnd = dateRange.end;
    if (classificationFilter.length > 0) filters.classification = classificationFilter;
    if (temperatureFilter !== 'ALL') filters.temperature = temperatureFilter;
    if (contactTypeFilter !== 'ALL') filters.contactType = contactTypeFilter;
    if (ownerFilter) filters.ownerId = ownerFilter;
    if (sourceFilter !== 'ALL') filters.source = sourceFilter;
    // CL-1: List filter
    if (selectedListId === '__no_list__') {
      filters.noList = true;
    } else if (selectedListId) {
      filters.contactListId = selectedListId;
    }
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;
    return filters;
  }, [search, stageFilter, statusFilter, dateRange, sortBy, sortOrder, classificationFilter, temperatureFilter, contactTypeFilter, ownerFilter, sourceFilter, selectedListId]);

  // Track filter changes to reset pagination
  const filterKey = `${search}-${stageFilter}-${statusFilter}-${dateRange.start}-${dateRange.end}-${classificationFilter.join(',')}-${temperatureFilter}-${contactTypeFilter}-${ownerFilter}-${sourceFilter}-${selectedListId || ''}`;
  const prevFilterKeyRef = React.useRef<string>(filterKey);

  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    }
  }, [filterKey]);

  // Paginated query
  const {
    data: paginatedData,
    isLoading: contactsLoading,
    isFetching,
    isPlaceholderData,
  } = useContactsPaginated(pagination, serverFilters);

  const contacts = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;

  // Stage counts from server (RPC)
  const { data: serverStageCounts = {} } = useContactStageCounts();

  const stageCounts = useMemo(
    () => ({
      LEAD: serverStageCounts.LEAD || 0,
      MQL: serverStageCounts.MQL || 0,
      PROSPECT: serverStageCounts.PROSPECT || 0,
      CUSTOMER: serverStageCounts.CUSTOMER || 0,
      OTHER: serverStageCounts.OTHER || 0,
    }),
    [serverStageCounts]
  );

  const filteredContacts = contacts;

  return {
    search, setSearch,
    statusFilter, setStatusFilter,
    stageFilter, setStageFilter,
    dateRange, setDateRange,
    pagination, setPagination,
    contacts, filteredContacts, totalCount,
    isFetching, isPlaceholderData,
    isLoading: contactsLoading,
    stageCounts,
  };
};
