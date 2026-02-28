import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { Contact, ContactStage, PaginationState, ContactsServerFilters, DEFAULT_PAGE_SIZE, ContactSortableColumn } from '@/types';
import {
  useContactsPaginated,
  useContactStageCounts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useBulkDeleteContacts,
  useContactHasDeals,
} from '@/lib/query/hooks/useContactsQuery';
import { useCreateDeal } from '@/lib/query/hooks/useDealsQuery';
import { useBoards } from '@/lib/query/hooks/useBoardsQuery';
import { useRealtimeSync } from '@/lib/realtime/useRealtimeSync';
import { normalizePhoneE164 } from '@/lib/phone';
import { contactPhonesService } from '@/lib/supabase/contacts';
import { supabase } from '@/lib/supabase/client';
import { generateFakeContacts } from '@/lib/debug';
import { useReassignContactWithDeals } from '@/hooks/useReassignContactWithDeals';
import type { ContactFormData, PhoneFormEntry } from '@/features/contacts/components/ContactFormModal';
import { unformatCPF, formatCPF, formatCEP } from '@/lib/validations/cpf-cep';

/**
 * Sincroniza telefones do formulário com a tabela contact_phones.
 * Cria novos (temp-*), atualiza existentes, deleta removidos.
 */
async function syncPhones(contactId: string, phones: PhoneFormEntry[]) {
  const { data: existingPhones } = await contactPhonesService.getByContactId(contactId);
  const existing = existingPhones || [];

  if (phones.length === 0 && existing.length === 0) return;

  const formIds = new Set(phones.map(p => p.id));
  const existingIds = new Set(existing.map(p => p.id));

  // Delete phones removed from form
  for (const ph of existing) {
    if (!formIds.has(ph.id)) {
      await contactPhonesService.delete(ph.id);
    }
  }

  // Create new phones (temp-* ids)
  for (const ph of phones) {
    if (ph.id.startsWith('temp-')) {
      await contactPhonesService.create({
        contactId,
        phoneNumber: ph.phoneNumber,
        phoneType: ph.phoneType,
        isWhatsapp: ph.isWhatsapp,
        isPrimary: ph.isPrimary,
      });
    }
  }

  // Update existing phones that changed
  for (const ph of phones) {
    if (!ph.id.startsWith('temp-') && existingIds.has(ph.id)) {
      const old = existing.find(p => p.id === ph.id);
      if (old && (
        old.phoneNumber !== ph.phoneNumber ||
        old.phoneType !== ph.phoneType ||
        old.isWhatsapp !== ph.isWhatsapp ||
        old.isPrimary !== ph.isPrimary
      )) {
        await contactPhonesService.update(ph.id, {
          phoneNumber: ph.phoneNumber,
          phoneType: ph.phoneType,
          isWhatsapp: ph.isWhatsapp,
          isPrimary: ph.isPrimary,
        });
      }
    }
  }
}

/**
 * Hook React `useContactsController` que encapsula uma lógica reutilizável.
 * @returns {{ search: string; setSearch: Dispatch<SetStateAction<string>>; statusFilter: "ALL" | "ACTIVE" | "INACTIVE" | "CHURNED" | "RISK"; setStatusFilter: Dispatch<SetStateAction<"ALL" | ... 3 more ... | "RISK">>; ... 51 more ...; addToast: (message: string, type?: ToastType | undefined) => void; }} Retorna um valor do tipo `{ search: string; setSearch: Dispatch<SetStateAction<string>>; statusFilter: "ALL" | "ACTIVE" | "INACTIVE" | "CHURNED" | "RISK"; setStatusFilter: Dispatch<SetStateAction<"ALL" | ... 3 more ... | "RISK">>; ... 51 more ...; addToast: (message: string, type?: ToastType | undefined) => void; }`.
 */
export const useContactsController = () => {
  // T017: Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // TanStack Query hooks
  const queryClient = useQueryClient();
  const { data: boards = [] } = useBoards();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const deleteContactMutation = useDeleteContact();
  const reassignMutation = useReassignContactWithDeals();
  const bulkDeleteContactsMutation = useBulkDeleteContacts();
  const checkHasDealsMutation = useContactHasDeals();
  const createDealMutation = useCreateDeal();

  // Enable realtime sync
  useRealtimeSync('contacts');

  const { addToast, showToast } = useToast();
  const searchParams = useSearchParams();

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
  const [viewMode, setViewMode] = useState<'people' | 'companies'>('people'); // kept for ContactsTabs compatibility
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Sorting state
  const [sortBy, setSortBy] = useState<ContactSortableColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Story 3.5 — Filter state
  const [classificationFilter, setClassificationFilter] = useState<string[]>(() => {
    const param = searchParams?.get('classification');
    return param ? param.split(',').filter(Boolean) : [];
  });
  const [temperatureFilter, setTemperatureFilter] = useState<string>(() => {
    return searchParams?.get('temperature') || 'ALL';
  });
  const [contactTypeFilter, setContactTypeFilter] = useState<string>(() => {
    return searchParams?.get('contactType') || 'ALL';
  });
  const [ownerFilter, setOwnerFilter] = useState<string>(() => {
    return searchParams?.get('ownerId') || '';
  });
  const [sourceFilter, setSourceFilter] = useState<string>(() => {
    return searchParams?.get('source') || 'ALL';
  });

  // Story 3.5 — Sync filters to URL (AC8: write-back)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, val: string, defaultVal: string) => {
      if (val && val !== defaultVal) params.set(key, val);
      else params.delete(key);
    };
    set('temperature', temperatureFilter, 'ALL');
    set('contactType', contactTypeFilter, 'ALL');
    set('ownerId', ownerFilter, '');
    set('source', sourceFilter, 'ALL');
    if (classificationFilter.length > 0) params.set('classification', classificationFilter.join(','));
    else params.delete('classification');

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [classificationFilter, temperatureFilter, contactTypeFilter, ownerFilter, sourceFilter]);

  // Story 3.5 — Fetch org profiles for owner filter/column
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      return (data || []).map(p => ({
        id: p.id,
        name: p.full_name || 'Sem nome',
        avatar: p.avatar_url || undefined,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Toggle sort handler
  const handleSort = useCallback((column: ContactSortableColumn) => {
    if (sortBy === column) {
      // Toggle direction if same column
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to desc
      setSortBy(column);
      setSortOrder('desc');
    }
    // Reset to first page when sorting changes
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [sortBy]);

  // T027-T028: Build server filters from state
  const serverFilters = useMemo<ContactsServerFilters | undefined>(() => {
    const filters: ContactsServerFilters = {};

    if (search.trim()) {
      filters.search = search.trim();
    }
    if (stageFilter !== 'ALL') {
      filters.stage = stageFilter;
    }
    if (statusFilter !== 'ALL') {
      filters.status = statusFilter;
    }
    if (dateRange.start) {
      filters.dateStart = dateRange.start;
    }
    if (dateRange.end) {
      filters.dateEnd = dateRange.end;
    }

    // Story 3.5 filters
    if (classificationFilter.length > 0) filters.classification = classificationFilter;
    if (temperatureFilter !== 'ALL') filters.temperature = temperatureFilter;
    if (contactTypeFilter !== 'ALL') filters.contactType = contactTypeFilter;
    if (ownerFilter) filters.ownerId = ownerFilter;
    if (sourceFilter !== 'ALL') filters.source = sourceFilter;

    // Always include sorting
    filters.sortBy = sortBy;
    filters.sortOrder = sortOrder;

    // Return filters (always has at least sorting)
    return filters;
  }, [search, stageFilter, statusFilter, dateRange, sortBy, sortOrder, classificationFilter, temperatureFilter, contactTypeFilter, ownerFilter, sourceFilter]);

  // T029: Track filter changes to reset pagination synchronously
  // This prevents 416 errors when filters change while on a high page number
  const filterKey = `${search}-${stageFilter}-${statusFilter}-${dateRange.start}-${dateRange.end}-${classificationFilter.join(',')}-${temperatureFilter}-${contactTypeFilter}-${ownerFilter}-${sourceFilter}`;
  const prevFilterKeyRef = React.useRef<string>(filterKey);

  // Reset to first page when filters change (safe: inside effect)
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPagination(prev => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
    }
  }, [filterKey]);

  // T018-T019: Use paginated query instead of getAll
  const {
    data: paginatedData,
    isLoading: contactsLoading,
    isFetching,
    isPlaceholderData,
  } = useContactsPaginated(pagination, serverFilters);

  // T019: Extract contacts and totalCount from paginated response
  const contacts = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteWithDeals, setDeleteWithDeals] = useState<{ id: string; dealCount: number; deals: Array<{ id: string; title: string }> } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const emptyFormData: ContactFormData = {
    name: '',
    email: '',
    phone: '',
    ownerId: undefined,
    cascadeDeals: false,
    birthDate: '',
    source: '',
    notes: '',
    // Story 3.1
    cpf: '',
    contactType: 'PF',
    classification: '',
    temperature: 'WARM',
    addressCep: '',
    addressCity: '',
    addressState: '',
    phones: [],
  };
  const [formData, setFormData] = useState<ContactFormData>(emptyFormData);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Create Deal State
  const [createDealContactId, setCreateDealContactId] = useState<string | null>(null);
  const contactForDeal = contacts.find(c => c.id === createDealContactId);

  const isLoading = contactsLoading;

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData(emptyFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      ownerId: contact.ownerId,
      cascadeDeals: false,
      birthDate: contact.birthDate || '',
      source: contact.source || '',
      notes: contact.notes || '',
      // Story 3.1
      cpf: contact.cpf ? formatCPF(contact.cpf) : '',
      contactType: contact.contactType || 'PF',
      classification: contact.classification || '',
      temperature: contact.temperature || 'WARM',
      addressCep: contact.addressCep ? formatCEP(contact.addressCep) : '',
      addressCity: contact.addressCity || '',
      addressState: contact.addressState || '',
      phones: [],
    });
    setIsModalOpen(true);

    // Load phones asynchronously from contact_phones table
    contactPhonesService.getByContactId(contact.id).then(({ data }) => {
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          phones: data.map(p => ({
            id: p.id,
            phoneNumber: p.phoneNumber,
            phoneType: p.phoneType as PhoneFormEntry['phoneType'],
            isWhatsapp: p.isWhatsapp,
            isPrimary: p.isPrimary,
          })),
        }));
      }
    });
  };

  const confirmDelete = async () => {
    if (deleteId) {
      // First check if contact has deals
      try {
        const result = await checkHasDealsMutation.mutateAsync(deleteId);

        if (result.hasDeals) {
          // Show confirmation for deleting with deals
          setDeleteWithDeals({ id: deleteId, dealCount: result.dealCount, deals: result.deals });
          setDeleteId(null);
          return;
        }

        // No deals, delete normally
        deleteContactMutation.mutate(
          { id: deleteId },
          {
            onSuccess: () => {
              (addToast || showToast)('Contato excluído com sucesso', 'success');
              setDeleteId(null);
            },
            onError: (error: Error) => {
              (addToast || showToast)(`Erro ao excluir: ${error.message}`, 'error');
            },
          }
        );
      } catch (error) {
        (addToast || showToast)('Erro ao verificar negócios do contato', 'error');
      }
    }
  };

  const confirmDeleteWithDeals = () => {
    if (deleteWithDeals) {
      deleteContactMutation.mutate(
        { id: deleteWithDeals.id, forceDeleteDeals: true },
        {
          onSuccess: () => {
            (addToast || showToast)(`Contato e ${deleteWithDeals.dealCount} negócio(s) excluídos`, 'success');
            setDeleteWithDeals(null);
          },
          onError: (error: Error) => {
            (addToast || showToast)(`Erro ao excluir: ${error.message}`, 'error');
          },
        }
      );
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const ids = filteredContacts.map(c => c.id);
    if (selectedIds.size === ids.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete
  const confirmBulkDelete = async () => {
    const ids: string[] = Array.from(selectedIds);
    let successCount = 0;
    let errorCount = 0;

      try {
        const result = await bulkDeleteContactsMutation.mutateAsync({
          ids,
          forceDeleteDeals: true,
          concurrency: 3,
        });
        successCount = result.successCount;
        errorCount = result.errorCount;
    } catch {
      // If bulk fails unexpectedly, count everything as error (keeps UX predictable)
      errorCount = ids.length;
    }

    if (successCount > 0) {
      (addToast || showToast)(
        `${successCount} contato(s) excluído(s)`,
        'success'
      );
    }
    if (errorCount > 0) {
      (addToast || showToast)(
        `Falha ao excluir ${errorCount} contato(s)`,
        'error'
      );
    }

    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const t0 = Date.now();
    setIsSubmittingContact(true);
    const normalizedPhone = normalizePhoneE164(formData.phone);
    const phonesToSync = [...formData.phones];

    // Close immediately to avoid "modal close lag" while we wait for Supabase.
    // (TanStack Query does not support onMutate in mutate() call options.)
    if (!editingContact) {
      setIsModalOpen(false);
      (addToast || showToast)('Criando contato...', 'info');
    }

    if (editingContact) {
      const ownerChanged = formData.ownerId && formData.ownerId !== editingContact.ownerId;

      if (ownerChanged && formData.cascadeDeals && formData.ownerId) {
        // Use RPC for atomic cascade reassignment (includes contact field updates)
        reassignMutation.mutate(
          {
            contactId: editingContact.id,
            newOwnerId: formData.ownerId,
            cascadeDeals: true,
            name: formData.name,
            email: formData.email,
            phone: normalizedPhone,
          },
          {
            onSuccess: async (result) => {
              // Update extra fields separately (RPC only handles name/email/phone)
              try {
                await updateContactMutation.mutateAsync({
                  id: editingContact.id,
                  updates: {
                    birthDate: formData.birthDate || undefined,
                    source: formData.source || undefined,
                    notes: formData.notes || undefined,
                    // Story 3.1
                    cpf: formData.cpf ? unformatCPF(formData.cpf) : undefined,
                    contactType: formData.contactType || undefined,
                    classification: formData.classification || undefined,
                    temperature: formData.temperature || undefined,
                    addressCep: formData.addressCep?.replace(/\D/g, '') || undefined,
                    addressCity: formData.addressCity || undefined,
                    addressState: formData.addressState || undefined,
                  },
                });
              } catch {
                (addToast || showToast)('Campos extras não salvos, edite o contato novamente', 'warning');
              }
              // Sync phones
              await syncPhones(editingContact.id, phonesToSync).catch(() => {});
              const msg = result?.deals_updated
                ? `Contato e ${result.deals_updated} deals reatribuídos!`
                : 'Contato reatribuído!';
              (addToast || showToast)(msg, 'success');
              setIsModalOpen(false);
            },
            onError: (error: Error) => {
              (addToast || showToast)(`Erro ao reatribuir: ${error.message}`, 'error');
            },
            onSettled: () => setIsSubmittingContact(false),
          }
        );
      } else {
        updateContactMutation.mutate(
          {
            id: editingContact.id,
            updates: {
              name: formData.name,
              email: formData.email,
              phone: normalizedPhone,
              ownerId: formData.ownerId,
              birthDate: formData.birthDate || undefined,
              source: formData.source || undefined,
              notes: formData.notes || undefined,
              // Story 3.1
              cpf: formData.cpf ? unformatCPF(formData.cpf) : undefined,
              contactType: formData.contactType || undefined,
              classification: formData.classification || undefined,
              temperature: formData.temperature || undefined,
              addressCep: formData.addressCep?.replace(/\D/g, '') || undefined,
              addressCity: formData.addressCity || undefined,
              addressState: formData.addressState || undefined,
            },
          },
          {
            onSuccess: async () => {
              await syncPhones(editingContact.id, phonesToSync).catch(() => {});
              (addToast || showToast)('Contato atualizado!', 'success');
              setIsModalOpen(false);
            },
            onSettled: () => setIsSubmittingContact(false),
          }
        );
      }
    } else {
      createContactMutation.mutate(
        {
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone,
          status: 'ACTIVE',
          stage: ContactStage.LEAD,
          totalValue: 0,
          birthDate: formData.birthDate || undefined,
          source: formData.source || undefined,
          notes: formData.notes || undefined,
          // Story 3.1
          cpf: formData.cpf ? unformatCPF(formData.cpf) : undefined,
          contactType: formData.contactType || 'PF',
          classification: formData.classification || undefined,
          temperature: formData.temperature || 'WARM',
          addressCep: formData.addressCep?.replace(/\D/g, '') || undefined,
          addressCity: formData.addressCity || undefined,
          addressState: formData.addressState || undefined,
        },
        {
          onSuccess: async (data) => {
            if (phonesToSync.length > 0) {
              await syncPhones(data.id, phonesToSync).catch(() => {});
            }
            (addToast || showToast)('Contato criado!', 'success');
          },
          onError: (error: Error) => {
            (addToast || showToast)(`Erro ao criar contato: ${error.message}`, 'error');
            // Re-open modal so user can adjust and retry
            setIsModalOpen(true);
          },
          onSettled: () => setIsSubmittingContact(false),
        }
      );
    }
  };

  const createFakeContactsBatch = useCallback(async (count: number) => {
    const fakeContacts = generateFakeContacts(count);
    let createdCount = 0;

    for (const fake of fakeContacts) {
      await createContactMutation.mutateAsync({
        name: fake.name,
        email: fake.email,
        phone: normalizePhoneE164(fake.phone),
        status: 'ACTIVE',
        stage: ContactStage.LEAD,
        totalValue: 0,
      });

      createdCount++;
    }

    (addToast || showToast)(`${createdCount} contatos fake criados!`, 'success');
  }, [addToast, showToast, createContactMutation]);

  // Open modal to select board for deal creation (or create directly if only 1 board)
  const convertContactToDeal = (contactId: string) => {
    if (boards.length === 0) {
      addToast('Nenhum board disponível. Crie um board primeiro.', 'error');
      return;
    }

    // Se só tem 1 board, cria direto sem abrir modal
    if (boards.length === 1) {
      createDealDirectly(contactId, boards[0]);
      return;
    }

    // Se tem mais de 1 board, abre modal para escolher
    setCreateDealContactId(contactId);
  };

  // Create deal directly (used when only 1 board or from modal)
  const createDealDirectly = (contactId: string, board: typeof boards[0]) => {
    const contact = contacts.find(c => c.id === contactId);

    if (!contact) {
      addToast('Contato não encontrado', 'error');
      return;
    }

    if (!board.stages?.length) {
      addToast('Board não tem estágios configurados', 'error');
      console.error('Board sem stages:', board);
      return;
    }

    const firstStage = board.stages[0];



    createDealMutation.mutate(
      {
        title: `Deal - ${contact.name}`,
        contactId: contact.id,
        boardId: board.id,
        status: firstStage.id, // status = stageId (UUID do stage)
        value: 0,
        probability: 0,
        priority: 'medium',
        items: [],
        owner: { name: 'Eu', avatar: '' },
        isWon: false,
        isLost: false,
      },
      {
        onSuccess: () => {
          addToast(`Deal criado no board "${board.name}"`, 'success');
        },
        onError: (error: Error) => {
          addToast(`Erro ao criar deal: ${error.message}`, 'error');
        },
      }
    );
  };

  // Called from modal after board selection
  const createDealForContact = (boardId: string) => {
    const contact = contacts.find(c => c.id === createDealContactId);
    const board = boards.find(b => b.id === boardId);

    if (!contact || !board) {
      addToast('Erro ao criar deal', 'error');
      setCreateDealContactId(null);
      return;
    }

    createDealDirectly(contact.id, board);
    setCreateDealContactId(null);
  };

  // Update contact wrapper
  const updateContact = (contactId: string, data: Partial<Contact>) => {
    updateContactMutation.mutate({
      id: contactId,
      updates: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        stage: data.stage,
      },
    });
  };

  // Story 3.5 — Bulk reassign owner
  const bulkReassignOwner = useCallback(async (newOwnerId: string) => {
    if (!supabase || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('contacts')
      .update({ owner_id: newOwnerId, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      (addToast || showToast)(`Erro ao reatribuir: ${error.message}`, 'error');
    } else {
      (addToast || showToast)(`${ids.length} contato(s) reatribuido(s)`, 'success');
      setSelectedIds(new Set());
      // Invalidate contacts query to refresh data
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  }, [selectedIds, addToast, showToast, queryClient]);

  // T030: Removed client-side filtering - now using server-side filters
  // contacts already comes filtered from the server
  const filteredContacts = contacts;

  // T031: Stage counts from server (RPC)
  // Uses dedicated query for accurate totals across all contacts
  const { data: serverStageCounts = {} } = useContactStageCounts();

  // Transform to expected format with fallbacks
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

  return {
    // State
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    stageFilter,
    setStageFilter,
    stageCounts,
    viewMode,
    setViewMode,
    isFilterOpen,
    setIsFilterOpen,
    dateRange,
    setDateRange,
    isModalOpen,
    setIsModalOpen,
    editingContact,
    deleteId,
    setDeleteId,
    deleteWithDeals,
    setDeleteWithDeals,
    bulkDeleteConfirm,
    setBulkDeleteConfirm,
    formData,
    setFormData,
    isSubmittingContact,
    isLoading,

    // T017-T020: Pagination state and handlers
    pagination,
    setPagination,
    totalCount,
    isFetching,
    isPlaceholderData,

    // Selection
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection,

    // Sorting
    sortBy,
    sortOrder,
    handleSort,

    // Story 3.5 — Filters
    classificationFilter,
    setClassificationFilter,
    temperatureFilter,
    setTemperatureFilter,
    contactTypeFilter,
    setContactTypeFilter,
    ownerFilter,
    setOwnerFilter,
    sourceFilter,
    setSourceFilter,
    profiles,
    bulkReassignOwner,

    // Create Deal State
    createDealContactId,
    setCreateDealContactId,
    contactForDeal,
    boards,

    // Data
    contacts,
    filteredContacts,

    // Actions
    openCreateModal,
    openEditModal,
    confirmDelete,
    confirmDeleteWithDeals,
    handleSubmit,
    createFakeContactsBatch,
    updateContact,
    convertContactToDeal,
    createDealForContact,
    confirmBulkDelete,
    addToast: addToast || showToast,
  };
};
