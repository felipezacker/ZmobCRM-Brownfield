import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActivitiesController } from './hooks/useActivitiesController';
import { ActivitiesHeader } from './components/ActivitiesHeader';
import { ActivitiesFilters } from './components/ActivitiesFilters';
import { ActivitiesList } from './components/ActivitiesList';
import { ActivitiesCalendar } from './components/ActivitiesCalendar';
import { ActivitiesMonthlyCalendar } from './components/ActivitiesMonthlyCalendar';
import { ActivityFormModal } from './components/ActivityFormModal';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import ConfirmModal from '@/components/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRangeSelection } from '@/hooks/useRangeSelection';

export const ActivitiesPage: React.FC = () => {
    const {
        activeTab,
        setActiveTab,
        viewMode,
        setViewMode,
        searchTerm,
        setSearchTerm,
        filterType,
        setFilterType,
        statusFilter,
        setStatusFilter,
        dateFilter,
        datePreset,
        setDatePreset,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        sortOrder,
        setSortOrder,
        currentDate,
        setCurrentDate,
        isModalOpen,
        setIsModalOpen,
        editingActivity,
        formData,
        setFormData,
        filteredActivities,
        deals,
        contacts,
        isLoading,
        tabCounts,
        overdueCount,
        deletingActivityId,
        showToast,
        handleNewActivity,
        handleEditActivity,
        handleDeleteActivity,
        confirmDeleteActivity,
        cancelDeleteActivity,
        handleToggleComplete,
        handleSnoozeActivity,
        handleDuplicateActivity,
        handleBulkComplete,
        handleBulkDelete,
        handleCreateFromProjected,
        handleSubmit
    } = useActivitiesController();

    const router = useRouter();
    const searchParams = useSearchParams();
    const editProcessedRef = useRef<string | null>(null);
    const { selectedIds: selectedActivities, toggle: toggleActivity, clear: clearActivitySelection } = useRangeSelection({ items: filteredActivities });
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Open edit modal from URL param (e.g., from Inbox)
    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId && editId !== editProcessedRef.current && filteredActivities.length > 0) {
            const activity = filteredActivities.find(a => a.id === editId);
            if (activity) {
                editProcessedRef.current = editId;
                handleEditActivity(activity);
                router.replace('/activities', { scroll: false });
            }
        }
    }, [searchParams, filteredActivities, handleEditActivity, router]);

    const handleSelectActivity = useCallback((id: string, _selected: boolean, event?: React.MouseEvent) => {
        toggleActivity(id, event);
    }, [toggleActivity]);

    // Limpa seleção ao trocar de tab
    const handleTabChange = useCallback((tab: 'activities' | 'history') => {
        setActiveTab(tab);
        clearActivitySelection();
    }, [setActiveTab, clearActivitySelection]);

    const handleCompleteAll = useCallback(() => {
        handleBulkComplete(Array.from(selectedActivities));
        showToast(`${selectedActivities.size} atividade(s) sendo concluída(s)...`, 'success');
        clearActivitySelection();
    }, [selectedActivities, handleBulkComplete, showToast, clearActivitySelection]);

    const handleSnoozeAll = useCallback(() => {
        const ids = Array.from(selectedActivities);
        for (const id of ids) {
            handleSnoozeActivity(id);
        }
        showToast(`${ids.length} atividade(s) sendo adiada(s) para amanhã...`, 'success');
        clearActivitySelection();
    }, [selectedActivities, handleSnoozeActivity, showToast, clearActivitySelection]);

    const handleDeleteAll = useCallback(() => {
        setShowBulkDeleteConfirm(true);
    }, []);

    const confirmBulkDelete = useCallback(async () => {
        const count = selectedActivities.size;
        const { succeeded, failed } = await handleBulkDelete(Array.from(selectedActivities));
        if (failed > 0) {
            showToast(`${succeeded} excluída(s), ${failed} falharam`, 'error');
        } else {
            showToast(`${count} atividade(s) excluída(s)`, 'success');
        }
        clearActivitySelection();
        setShowBulkDeleteConfirm(false);
    }, [selectedActivities, handleBulkDelete, showToast, clearActivitySelection]);

    if (isLoading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-sm font-medium">Carregando atividades...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <ActivitiesHeader
                viewMode={viewMode}
                setViewMode={setViewMode}
                onNewActivity={activeTab === 'activities' ? handleNewActivity : undefined}
                dateFilter={dateFilter}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                overdueCount={overdueCount}
            />

            {/* Abas com contadores */}
            <div className="flex gap-1 mb-6 border-b border-border">
                <Button
                    onClick={() => handleTabChange('activities')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                        activeTab === 'activities'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-muted-foreground'
                    }`}
                >
                    Atividades
                    {tabCounts.activities > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            activeTab === 'activities'
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                                : 'bg-muted text-muted-foreground dark:bg-white/10 dark:text-muted-foreground'
                        }`}>
                            {tabCounts.activities}
                        </span>
                    )}
                </Button>
                <Button
                    onClick={() => handleTabChange('history')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                        activeTab === 'history'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-muted-foreground'
                    }`}
                >
                    Histórico
                    {tabCounts.history > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                            activeTab === 'history'
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
                                : 'bg-muted text-muted-foreground dark:bg-white/10 dark:text-muted-foreground'
                        }`}>
                            {tabCounts.history}
                        </span>
                    )}
                </Button>
            </div>

            {viewMode === 'list' ? (
                <>
                    <ActivitiesFilters
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterType={filterType}
                        setFilterType={setFilterType}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        datePreset={datePreset}
                        setDatePreset={setDatePreset}
                        dateFrom={dateFrom}
                        setDateFrom={setDateFrom}
                        dateTo={dateTo}
                        setDateTo={setDateTo}
                        showTypeFilter={activeTab === 'activities'}
                    />
                    <ActivitiesList
                        activities={filteredActivities}
                        deals={deals}
                        contacts={contacts}
                        onToggleComplete={handleToggleComplete}
                        onEdit={handleEditActivity}
                        onDelete={handleDeleteActivity}
                        onDuplicate={activeTab === 'activities' ? handleDuplicateActivity : undefined}
                        selectedActivities={selectedActivities}
                        onSelectActivity={handleSelectActivity}
                        onNewActivity={activeTab === 'activities' ? handleNewActivity : undefined}
                    />
                </>
            ) : viewMode === 'month' ? (
                <ActivitiesMonthlyCalendar
                    activities={filteredActivities}
                    deals={deals}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onEdit={handleEditActivity}
                    onCreateFromProjected={handleCreateFromProjected}
                />
            ) : (
                <ActivitiesCalendar
                    activities={filteredActivities}
                    deals={deals}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onEdit={handleEditActivity}
                    onCreateFromProjected={handleCreateFromProjected}
                />
            )}

            <ActivityFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                formData={formData}
                setFormData={setFormData}
                editingActivity={editingActivity}
                deals={deals}
            />

            {activeTab === 'activities' && (
                <BulkActionsToolbar
                    selectedCount={selectedActivities.size}
                    onCompleteAll={handleCompleteAll}
                    onSnoozeAll={handleSnoozeAll}
                    onDeleteAll={handleDeleteAll}
                    onClearSelection={clearActivitySelection}
                />
            )}

            <ConfirmModal
                isOpen={deletingActivityId !== null}
                onClose={cancelDeleteActivity}
                onConfirm={confirmDeleteActivity}
                title="Excluir atividade"
                message="Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="danger"
            />

            <ConfirmModal
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={confirmBulkDelete}
                title="Excluir atividades selecionadas"
                message={`Tem certeza que deseja excluir ${selectedActivities.size} atividades? Esta ação não pode ser desfeita.`}
                confirmText="Excluir todas"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};
