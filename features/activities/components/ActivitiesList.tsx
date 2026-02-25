import React, { useMemo } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Activity, Deal, Contact } from '@/types';
import { ActivityRow } from './ActivityRow';
import { EmptyState } from '@/components/ui/EmptyState';

interface ActivitiesListProps {
    activities: Activity[];
    deals: Deal[];
    contacts: Contact[];
    onToggleComplete: (id: string) => void;
    onEdit: (activity: Activity) => void;
    onDelete: (id: string) => void;
    onDuplicate?: (activity: Activity) => void;
    selectedActivities?: Set<string>;
    onSelectActivity?: (id: string, selected: boolean) => void;
    onNewActivity?: () => void;
}

export const ActivitiesList: React.FC<ActivitiesListProps> = ({
    activities,
    deals,
    contacts,
    onToggleComplete,
    onEdit,
    onDelete,
    onDuplicate,
    selectedActivities = new Set(),
    onSelectActivity,
    onNewActivity
}) => {
    const dealById = useMemo(() => {
        const map = new Map<string, Deal>();
        for (const d of deals) map.set(d.id, d);
        return map;
    }, [deals]);

    const contactById = useMemo(() => {
        const map = new Map<string, Contact>();
        for (const c of contacts) map.set(c.id, c);
        return map;
    }, [contacts]);

    const allSelected = activities.length > 0 && activities.every(a => selectedActivities.has(a.id));
    const someSelected = activities.some(a => selectedActivities.has(a.id));

    const handleSelectAll = () => {
        if (!onSelectActivity) return;
        if (allSelected) {
            activities.forEach(a => onSelectActivity(a.id, false));
        } else {
            activities.forEach(a => onSelectActivity(a.id, true));
        }
    };

    if (activities.length === 0) {
        return (
            <EmptyState
                icon={<CalendarPlus size={28} className="text-slate-400" />}
                title="Nenhuma atividade encontrada"
                description={onNewActivity ? 'Crie sua primeira atividade para começar a organizar suas tarefas.' : undefined}
                action={onNewActivity ? { label: 'Criar Atividade', onClick: onNewActivity } : undefined}
                size="lg"
            />
        );
    }

    return (
        <div className="space-y-3">
            {onSelectActivity && (
                <label className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                    Selecionar todas ({activities.length})
                </label>
            )}
            {activities.map(activity => (
                <ActivityRow
                    key={activity.id}
                    activity={activity}
                    deal={activity.dealId ? dealById.get(activity.dealId) : undefined}
                    contact={activity.contactId ? contactById.get(activity.contactId) : undefined}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    isSelected={selectedActivities.has(activity.id)}
                    onSelect={onSelectActivity}
                />
            ))}
        </div>
    );
};
