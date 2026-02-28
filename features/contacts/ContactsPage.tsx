import React, { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useContactsController } from './hooks/useContactsController';
import { ContactsHeader } from './components/ContactsHeader';
import { ContactsFilters } from './components/ContactsFilters';
import { ContactsTabs } from './components/ContactsTabs';
import { ContactsStageTabs } from './components/ContactsStageTabs';
import { ContactsList } from './components/ContactsList';
import { ContactFormModal } from './components/ContactFormModal';
import { SelectBoardModal } from './components/SelectBoardModal';
import { PaginationControls } from './components/PaginationControls';
import { ContactsImportExportModal } from './components/ContactsImportExportModal';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import { exportContactsCsv } from './utils/exportCsv';
import ConfirmModal from '@/components/ConfirmModal';
import { Button } from '@/app/components/ui/Button';

/**
 * Componente React `ContactsPage`.
 * Story 3.5 — Lista de Contatos Enriquecida.
 */
export const ContactsPage: React.FC = () => {
    const controller = useContactsController();
    const router = useRouter();
    const [isImportExportOpen, setIsImportExportOpen] = React.useState(false);

    const goToDeal = (dealId: string) => {
        controller.setDeleteWithDeals(null);
        router.push(`/boards?deal=${dealId}`);
    };

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

    return (
        <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
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

            {/* Story 3.5 — Bulk Actions Toolbar (reassign + export + delete) */}
            {controller.selectedIds.size > 0 && (
                <div className="space-y-2">
                    <BulkActionsToolbar
                        selectedCount={controller.selectedIds.size}
                        onClearSelection={controller.clearSelection}
                        onReassign={controller.bulkReassignOwner}
                        onExportCsv={handleExportCsv}
                        profiles={controller.profiles}
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={() => controller.setBulkDeleteConfirm(true)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            <Trash2 size={14} />
                            Excluir selecionados
                        </Button>
                    </div>
                </div>
            )}

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
            />

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

            <ContactFormModal
                isOpen={controller.isModalOpen}
                onClose={() => controller.setIsModalOpen(false)}
                onSubmit={controller.handleSubmit}
                formData={controller.formData}
                setFormData={controller.setFormData}
                editingContact={controller.editingContact}
                createFakeContactsBatch={controller.createFakeContactsBatch}
                isSubmitting={controller.isSubmittingContact}
                bufferedPrefsRef={controller.bufferedPrefsRef}
            />

            <SelectBoardModal
                isOpen={!!controller.createDealContactId}
                onClose={() => controller.setCreateDealContactId(null)}
                onSelect={controller.createDealForContact}
                boards={controller.boards}
                contactName={controller.contactForDeal?.name || ''}
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
                        <ul className="text-left bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
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
