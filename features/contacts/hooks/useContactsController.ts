import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ContactSortableColumn } from '@/types';
import { useToast } from '@/context/ToastContext';
import { useBoards } from '@/lib/query/hooks/useBoardsQuery';
import { useContactLists } from '@/lib/query/hooks/useContactListsQuery';
import { useContactCRUD } from '@/features/contacts/hooks/useContactCRUD';
import { useContactSearch } from '@/features/contacts/hooks/useContactSearch';
import { useContactFilters } from '@/features/contacts/hooks/useContactFilters';
import { useContactImport } from '@/features/contacts/hooks/useContactImport';
import type { ListFilterValue } from '@/features/contacts/components/ContactListsSidebar';

// Re-export for backward compatibility
export type { ContactFormData } from '@/features/contacts/components/ContactFormModal';

/**
 * Composition hook that orchestrates all contact sub-hooks.
 * Returns the exact same API shape as the original monolithic hook.
 */
export const useContactsController = () => {
  const { addToast, showToast } = useToast();
  const toast = addToast || showToast;
  const { data: boards = [] } = useBoards();
  const searchParams = useSearchParams();

  // Detail modal state (query param ?cockpit=<id>)
  const [detailContactId, setDetailContactId] = useState<string | null>(
    () => searchParams?.get('cockpit') || null
  );

  const openDetailModal = useCallback((contactId: string) => {
    setDetailContactId(contactId);
    const params = new URLSearchParams(window.location.search);
    params.set('cockpit', contactId);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailContactId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('cockpit');
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // CL-1: List filter state
  const [selectedListId, setSelectedListId] = useState<ListFilterValue>(null);
  const [listsSidebarCollapsed, setListsSidebarCollapsed] = useState(false);
  const { data: contactLists = [], isLoading: listsLoading } = useContactLists();

  // --- Sub-hooks (no circular deps) ---

  const filters = useContactFilters();

  const search = useContactSearch({
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    classificationFilter: filters.classificationFilter,
    temperatureFilter: filters.temperatureFilter,
    contactTypeFilter: filters.contactTypeFilter,
    ownerFilter: filters.ownerFilter,
    sourceFilter: filters.sourceFilter,
    selectedListId,
  });

  const crud = useContactCRUD({ toast });

  const imports = useContactImport({
    toast,
    contacts: search.contacts,
    boards,
  });

  // handleSort bridges filters + search (resets pagination on sort change)
  const { sortBy, setSortBy, setSortOrder } = filters;
  const { setPagination } = search;
  const handleSort = useCallback((column: ContactSortableColumn) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [sortBy, setSortBy, setSortOrder, setPagination]);

  return {
    // Detail modal
    detailContactId,
    openDetailModal,
    closeDetailModal,

    // Search state
    search: search.search,
    setSearch: search.setSearch,
    statusFilter: search.statusFilter,
    setStatusFilter: search.setStatusFilter,
    stageFilter: search.stageFilter,
    setStageFilter: search.setStageFilter,
    stageCounts: search.stageCounts,
    dateRange: search.dateRange,
    setDateRange: search.setDateRange,
    isLoading: search.isLoading,

    // Pagination
    pagination: search.pagination,
    setPagination: search.setPagination,
    totalCount: search.totalCount,
    isFetching: search.isFetching,
    isPlaceholderData: search.isPlaceholderData,

    // Data
    contacts: search.contacts,
    filteredContacts: search.filteredContacts,

    // Filters
    viewMode: filters.viewMode,
    setViewMode: filters.setViewMode,
    isFilterOpen: filters.isFilterOpen,
    setIsFilterOpen: filters.setIsFilterOpen,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSort,
    classificationFilter: filters.classificationFilter,
    setClassificationFilter: filters.setClassificationFilter,
    temperatureFilter: filters.temperatureFilter,
    setTemperatureFilter: filters.setTemperatureFilter,
    contactTypeFilter: filters.contactTypeFilter,
    setContactTypeFilter: filters.setContactTypeFilter,
    ownerFilter: filters.ownerFilter,
    setOwnerFilter: filters.setOwnerFilter,
    sourceFilter: filters.sourceFilter,
    setSourceFilter: filters.setSourceFilter,
    profiles: filters.profiles,

    // CRUD
    isModalOpen: crud.isModalOpen,
    setIsModalOpen: crud.setIsModalOpen,
    editingContact: crud.editingContact,
    formData: crud.formData,
    setFormData: crud.setFormData,
    isSubmittingContact: crud.isSubmittingContact,
    deleteId: crud.deleteId,
    setDeleteId: crud.setDeleteId,
    deleteWithDeals: crud.deleteWithDeals,
    setDeleteWithDeals: crud.setDeleteWithDeals,
    bufferedPrefRef: crud.bufferedPrefsRef,
    openCreateModal: crud.openCreateModal,
    openEditModal: crud.openEditModal,
    confirmDelete: crud.confirmDelete,
    confirmDeleteWithDeals: crud.confirmDeleteWithDeals,
    handleSubmit: crud.handleSubmit,

    // Selection + bulk + deal creation
    selectedIds: imports.selectedIds,
    toggleSelect: imports.toggleSelect,
    toggleSelectAll: imports.toggleSelectAll,
    clearSelection: imports.clearSelection,
    bulkDeleteConfirm: imports.bulkDeleteConfirm,
    setBulkDeleteConfirm: imports.setBulkDeleteConfirm,
    confirmBulkDelete: imports.confirmBulkDelete,
    bulkReassignOwner: imports.bulkReassignOwner,
    convertContactToDeal: imports.convertContactToDeal,
    createDealForContact: imports.createDealForContact,
    createDealContactId: imports.createDealContactId,
    setCreateDealContactId: imports.setCreateDealContactId,
    contactForDeal: imports.contactForDeal,
    createFakeContactsBatch: imports.createFakeContactsBatch,
    updateContact: imports.updateContact,

    // CL-1: Contact lists
    selectedListId,
    setSelectedListId,
    contactLists,
    listsLoading,
    listsSidebarCollapsed,
    toggleListsSidebar: useCallback(() => setListsSidebarCollapsed(prev => !prev), []),

    // Shared
    boards,
    addToast: toast,
  };
};
