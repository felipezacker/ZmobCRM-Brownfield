import React, { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useContactsController } from './hooks/useContactsController';
import { ContactsHeader } from './components/ContactsHeader';
import { ContactsFilters } from './components/ContactsFilters';
import { ContactsTabs } from './components/ContactsTabs';
import { ContactsStageTabs } from './components/ContactsStageTabs';
import { ContactsList } from './components/ContactsList';
import { ContactFormModal } from './components/ContactFormModal';
import { ContactDetailModal } from './components/ContactDetailModal';
import { SelectBoardModal } from './components/SelectBoardModal';
import { PaginationControls } from './components/PaginationControls';
import { ContactsImportExportModal } from './components/ContactsImportExportModal';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import { ContactListsSidebar, NO_LIST_FILTER } from './components/ContactListsSidebar';
import { ContactListModal } from './components/ContactListModal';
import { exportContactsCsv } from './utils/exportCsv';
import ConfirmModal from '@/components/ConfirmModal';
import { Button } from '@/components/ui/button';
import {
    useCreateContactList,
    useUpdateContactList,
    useDeleteContactList,
    useAddContactsToList,
    useRemoveContactsFromList,
    useNoListCount,
} from '@/lib/query/hooks/useContactListsQuery';
import { useToast } from '@/context/ToastContext';
import type { ContactList } from '@/types';

/**
 * Componente React `ContactsPage`.
 * Story 3.5 — Lista de Contatos Enriquecida.
 * Story CL-1 — Sidebar de Listas de Contatos.
 */
export const ContactsPage: React.FC = () => {
    const controller = useContactsController();
    const router = useRouter();
    const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);
    const { addToast, showToast } = useToast();
    const toast = addToast || showToast;

    // CL-1: List modal state
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [editingList, setEditingList] = useState<ContactList | null>(null);

    // CL-1: List mutations
    const createList = useCreateContactList();
    const updateList = useUpdateContactList();
    const deleteList = useDeleteContactList();
    const addToList = useAddContactsToList();
    const removeFromList = useRemoveContactsFromList();

    const goToDeal = (dealId: string) => {
        controller.setDeleteWithDeals(null);
        router.push(`/boards?deal=${dealId}`);
    };

    // Count active advanced filters for badge
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (controller.classificationFilter.length > 0) count++;
        if (controller.temperatureFilter !== 'ALL') count++;
        if (controller.contactTypeFilter !== 'ALL') count++;
        if (controller.ownerFilter) count++;
        if (controller.sourceFilter !== 'ALL') count++;
        if (controller.dateRange.start || controller.dateRange.end) count++;
        return count;
    }, [controller.classificationFilter, controller.temperatureFilter, controller.contactTypeFilter, controller.ownerFilter, controller.sourceFilter, controller.dateRange]);

    // Story 3.5 — Build profiles map for CSV export
    const profilesNameMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of controller.profiles) {
            map.set(p.id, p.name);
        }
        return map;
    }, [controller.profiles]);

    // Story 3.5 — Export selected contacts as CSV
    const handleExportCsv = useCallback(() => {
        const selectedContacts = controller.selectedIds.size > 0
            ? controller.filteredContacts.filter(c => controller.selectedIds.has(c.id))
            : controller.filteredContacts;
        exportContactsCsv(selectedContacts, profilesNameMap);
    }, [controller.filteredContacts, controller.selectedIds, profilesNameMap]);

    // CL-1: "Sem Lista" count — server-side via RPC (accurate, handles overlap)
    const { data: noListCount = 0 } = useNoListCount();

    // CL-1: List CRUD handlers
    const handleSaveList = useCallback(async (data: { name: string; color: string; description?: string }) => {
        try {
            if (editingList) {
                await updateList.mutateAsync({ id: editingList.id, updates: data });
                toast?.('Lista atualizada.', 'success');
            } else {
                await createList.mutateAsync(data);
                toast?.('Lista criada.', 'success');
            }
            setIsListModalOpen(false);
            setEditingList(null);
        } catch {
            toast?.('Erro ao salvar lista.', 'error');
        }
    }, [editingList, updateList, createList, toast]);

    const handleDeleteList = useCallback(async (id: string) => {
        try {
            // If deleting the currently selected list, reset to "Todas"
            if (controller.selectedListId === id) {
                controller.setSelectedListId(null);
            }
            await deleteList.mutateAsync(id);
            toast?.('Lista excluida.', 'success');
            setIsListModalOpen(false);
            setEditingList(null);
        } catch {
            toast?.('Erro ao excluir lista.', 'error');
        }
    }, [deleteList, toast, controller]);

    // CL-1: Add selected contacts to list
    const handleAddToList = useCallback(async (listId: string) => {
        const ids = Array.from(controller.selectedIds);
        try {
            await addToList.mutateAsync({ listId, contactIds: ids });
            toast?.(`${ids.length} contato(s) adicionado(s) a lista.`, 'success');
            controller.clearSelection();
        } catch {
            toast?.('Erro ao adicionar contatos a lista.', 'error');
        }
    }, [controller, addToList, toast]);

    // CL-1: Remove selected contacts from current list
    const handleRemoveFromList = useCallback(async () => {
        if (!controller.selectedListId || controller.selectedListId === NO_LIST_FILTER) return;
        const ids = Array.from(controller.selectedIds);
        try {
            await removeFromList.mutateAsync({ listId: controller.selectedListId, contactIds: ids });
            toast?.(`${ids.length} contato(s) removido(s) da lista.`, 'success');
            controller.clearSelection();
        } catch {
            toast?.('Erro ao remover contatos da lista.', 'error');
        }
    }, [controller, removeFromList, toast]);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <ContactsHeader
                viewMode={controller.viewMode}
                search={controller.search}
                setSearch={controller.setSearch}
                statusFilter={controller.statusFilter}
                setStatusFilter={controller.setStatusFilter}
                isFilterOpen={controller.isFilterOpen}
                setIsFilterOpen={controller.setIsFilterOpen}
                openCreateModal={controller.openCreateModal}
                openImportExportModal={() => setIsImportExportOpen(true)}
                activeFilterCount={activeFilterCount}
            />

            <ContactsImportExportModal
                isOpen={isImportExportOpen}
                onClose={() => setIsImportExportOpen(false)}
                exportParams={{
                    search: controller.search?.trim() ? controller.search.trim() : undefined,
                    stage: controller.stageFilter,
                    status: controller.statusFilter,
                    dateStart: controller.dateRange?.start || undefined,
                    dateEnd: controller.dateRange?.end || undefined,
                    sortBy: controller.sortBy,
                    sortOrder: controller.sortOrder,
                }}
            />

            {controller.isFilterOpen && (
                <ContactsFilters
                    dateRange={controller.dateRange}
                    setDateRange={controller.setDateRange}
                    classification={controller.classificationFilter}
                    setClassification={controller.setClassificationFilter}
                    temperature={controller.temperatureFilter}
                    setTemperature={controller.setTemperatureFilter}
                    contactType={controller.contactTypeFilter}
                    setContactType={controller.setContactTypeFilter}
                    ownerId={controller.ownerFilter}
                    setOwnerId={controller.setOwnerFilter}
                    source={controller.sourceFilter}
                    setSource={controller.setSourceFilter}
                    profiles={controller.profiles}
                />
            )}

            {/* Stage Tabs - Funil de Contatos */}
            <ContactsStageTabs
                activeStage={controller.stageFilter}
                onStageChange={controller.setStageFilter}
                counts={controller.stageCounts}
            />

            <ContactsTabs
                viewMode={controller.viewMode}
                setViewMode={controller.setViewMode}
                contactsCount={controller.totalCount}
            />

            {/* Bulk Actions Bar (top, inline) */}
            {controller.selectedIds.size > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-white/95 dark:bg-card/95 backdrop-blur-sm px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {controller.selectedIds.size} contato{controller.selectedIds.size !== 1 ? 's' : ''} selecionado{controller.selectedIds.size !== 1 ? 's' : ''}
                        </span>
                        <Button
                            onClick={controller.clearSelection}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                        >
                            Limpar
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <BulkActionsToolbar
                            selectedCount={controller.selectedIds.size}
                            onClearSelection={controller.clearSelection}
                            onReassign={controller.bulkReassignOwner}
                            onExportCsv={handleExportCsv}
                            profiles={controller.profiles}
                            contactLists={controller.contactLists}
                            onAddToList={handleAddToList}
                            onRemoveFromList={controller.selectedListId && controller.selectedListId !== NO_LIST_FILTER ? handleRemoveFromList : undefined}
                        />
                        <Button
                            onClick={() => controller.setBulkDeleteConfirm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Trash2 size={14} />
                            Excluir
                        </Button>
                    </div>
                </div>
            )}

            {/* CL-1: Sidebar + Table layout */}
            <div className="flex gap-0 rounded-xl border border-border overflow-hidden">
                <ContactListsSidebar
                    lists={controller.contactLists}
                    selectedListId={controller.selectedListId}
                    onSelectList={controller.setSelectedListId}
                    onCreateList={() => { setEditingList(null); setIsListModalOpen(true); }}
                    onEditList={(list) => { setEditingList(list); setIsListModalOpen(true); }}
                    totalContactsCount={controller.totalCount}
                    noListCount={noListCount}
                    isLoading={controller.listsLoading}
                    collapsed={controller.listsSidebarCollapsed}
                    onToggleCollapse={controller.toggleListsSidebar}
                />

                <div className="flex-1 min-w-0">
                    <ContactsList
                        filteredContacts={controller.filteredContacts}
                        selectedIds={controller.selectedIds}
                        toggleSelect={controller.toggleSelect}
                        toggleSelectAll={controller.toggleSelectAll}
                        updateContact={controller.updateContact}
                        convertContactToDeal={controller.convertContactToDeal}
                        openEditModal={controller.openEditModal}
                        setDeleteId={controller.setDeleteId}
                        sortBy={controller.sortBy}
                        sortOrder={controller.sortOrder}
                        onSort={controller.handleSort}
                        profiles={controller.profiles}
                        totalCount={controller.totalCount}
                        openDetailModal={controller.openDetailModal}
                    />
                </div>
            </div>

            {/* T021: Pagination Controls */}
            {controller.viewMode === 'people' && controller.totalCount > 0 && (
                <PaginationControls
                    pagination={controller.pagination}
                    setPagination={controller.setPagination}
                    totalCount={controller.totalCount}
                    isFetching={controller.isFetching}
                    isPlaceholderData={controller.isPlaceholderData}
                />
            )}

            <ContactDetailModal
                contactId={controller.detailContactId}
                isOpen={!!controller.detailContactId}
                onClose={controller.closeDetailModal}
            />

            <ContactFormModal
                isOpen={controller.isModalOpen}
                onClose={() => controller.setIsModalOpen(false)}
                onSubmit={controller.handleSubmit}
                formData={controller.formData}
                setFormData={controller.setFormData}
                editingContact={controller.editingContact}
                createFakeContactsBatch={controller.createFakeContactsBatch}
                isSubmitting={controller.isSubmittingContact}
                bufferedPrefRef={controller.bufferedPrefRef}
                onOpenDetail={controller.openDetailModal}
            />

            <SelectBoardModal
                isOpen={!!controller.createDealContactId}
                onClose={() => controller.setCreateDealContactId(null)}
                onSelect={controller.createDealForContact}
                boards={controller.boards}
                contactName={controller.contactForDeal?.name || ''}
            />

            {/* CL-1: List CRUD modal */}
            <ContactListModal
                isOpen={isListModalOpen}
                onClose={() => { setIsListModalOpen(false); setEditingList(null); }}
                onSave={handleSaveList}
                onDelete={handleDeleteList}
                editingList={editingList}
                isSaving={createList.isPending || updateList.isPending}
            />

            <ConfirmModal
                isOpen={!!controller.deleteId}
                onClose={() => controller.setDeleteId(null)}
                onConfirm={controller.confirmDelete}
                title="Excluir Contato"
                message="Tem certeza que deseja excluir este contato? Esta acao nao pode ser desfeita."
                confirmText="Excluir"
                variant="danger"
            />

            {/* Modal for contacts with deals */}
            <ConfirmModal
                isOpen={!!controller.deleteWithDeals}
                onClose={() => controller.setDeleteWithDeals(null)}
                onConfirm={controller.confirmDeleteWithDeals}
                title="Contato com Negocios"
                message={
                    <div className="space-y-3">
                        <p>Este contato possui {controller.deleteWithDeals?.dealCount || 0} negocio(s) vinculado(s):</p>
                        <ul className="text-left bg-muted dark:bg-card/50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                            {controller.deleteWithDeals?.deals.map((deal) => (
                                <li key={deal.id} className="text-sm">
                                    <Button
                                        onClick={() => goToDeal(deal.id)}
                                        className="text-primary-600 dark:text-primary-400 hover:underline font-medium text-left"
                                    >
                                        {deal.title}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                        <p className="text-red-500 dark:text-red-400 font-medium">Ao excluir, todos os negocios tambem serao excluidos.</p>
                    </div>
                }
                confirmText="Excluir Tudo"
                variant="danger"
            />

            {/* Modal for bulk delete */}
            <ConfirmModal
                isOpen={controller.bulkDeleteConfirm}
                onClose={() => controller.setBulkDeleteConfirm(false)}
                onConfirm={controller.confirmBulkDelete}
                title="Excluir Contatos em Massa"
                message={
                    <div className="space-y-2">
                        <p>
                            Tem certeza que deseja excluir <strong>{controller.selectedIds.size}</strong> contato(s)?
                        </p>
                        <p className="text-red-500 dark:text-red-400 text-sm">
                            Todos os negocios vinculados tambem serao excluidos. Esta acao nao pode ser desfeita.
                        </p>
                    </div>
                }
                confirmText={`Excluir ${controller.selectedIds.size} contato(s)`}
                variant="danger"
            />

        </div>
    );
};
