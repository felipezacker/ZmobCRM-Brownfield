import React, { useState } from 'react';
import { useActivitiesController } from './hooks/useActivitiesController';
import { ActivitiesHeader } from './components/ActivitiesHeader';
import { ActivitiesFilters } from './components/ActivitiesFilters';
import { ActivitiesList } from './components/ActivitiesList';
import { ActivitiesCalendar } from './components/ActivitiesCalendar';
import { ActivityFormModal } from './components/ActivityFormModal';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import { Button } from '@/app/components/ui/Button';
import { useToast } from '@/context/ToastContext';

/**
 * Componente React `ActivitiesPage`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
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
        handleNewActivity,
        handleEditActivity,
        handleDeleteActivity,
        handleToggleComplete,
        handleSubmit
    } = useActivitiesController();

    const { addToast } = useToast();
    const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());

    const handleSelectActivity = (id: string, selected: boolean) => {
        setSelectedActivities(prev => {
            const newSet = new Set(prev);
            if (selected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleClearSelection = () => {
        setSelectedActivities(new Set());
    };

    const handleCompleteAll = () => {
        selectedActivities.forEach(id => {
            handleToggleComplete(id);
        });
        addToast(`${selectedActivities.size} atividades concluídas!`, 'success');
        handleClearSelection();
    };

    const handleSnoozeAll = () => {
        // In a real app, this would update the date of each activity
        addToast(`${selectedActivities.size} atividades adiadas para amanhã!`, 'success');
        handleClearSelection();
    };

    return (
        <div className="p-8 max-w-400 mx-auto">
            <ActivitiesHeader
                viewMode={viewMode}
                setViewMode={setViewMode}
                onNewActivity={activeTab === 'activities' ? handleNewActivity : undefined}
                dateFilter={dateFilter}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
            />

            {/* Abas */}
            <div className="flex gap-1 mb-6 border-b border-slate-200 dark:border-white/10">
                <Button
                    onClick={() => setActiveTab('activities')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeTab === 'activities'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    Atividades
                </Button>
                <Button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        activeTab === 'history'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                >
                    Histórico
                </Button>
            </div>

            {viewMode === 'list' ? (
                <>
                    <ActivitiesFilters
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterType={filterType}
                        setFilterType={setFilterType}
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
                        selectedActivities={selectedActivities}
                        onSelectActivity={handleSelectActivity}
                    />
                </>
            ) : (
                <ActivitiesCalendar
                    activities={filteredActivities}
                    deals={deals}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
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

            <BulkActionsToolbar
                selectedCount={selectedActivities.size}
                onCompleteAll={handleCompleteAll}
                onSnoozeAll={handleSnoozeAll}
                onClearSelection={handleClearSelection}
            />
        </div>
    );
};
