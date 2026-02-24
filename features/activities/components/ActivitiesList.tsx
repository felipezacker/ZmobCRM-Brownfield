import React, { useMemo } from 'react';
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
    selectedActivities?: Set<string>;
    onSelectActivity?: (id: string, selected: boolean) => void;
}

/**
 * Componente React `ActivitiesList`.
 *
 * @param {ActivitiesListProps} {
    activities,
    deals,
    onToggleComplete,
    onEdit,
    onDelete,
    selectedActivities = new Set(),
    onSelectActivity
} - Parâmetro `{
    activities,
    deals,
    onToggleComplete,
    onEdit,
    onDelete,
    selectedActivities = new Set(),
    onSelectActivity
}`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const ActivitiesList: React.FC<ActivitiesListProps> = ({
    activities,
    deals,
    contacts,
    onToggleComplete,
    onEdit,
    onDelete,
    selectedActivities = new Set(),
    onSelectActivity
}) => {
    // Performance: Activities pode ser uma lista grande; evitamos `find` por linha (O(N*M)).
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

    if (activities.length === 0) {
        return (
            <EmptyState title="Nenhuma atividade encontrada" size="md" />
        );
    }

    return (
        <div className="space-y-3">
            {activities.map(activity => (
                <ActivityRow
                    key={activity.id}
                    activity={activity}
                    deal={activity.dealId ? dealById.get(activity.dealId) : undefined}
                    contact={activity.contactId ? contactById.get(activity.contactId) : undefined}
                    onToggleComplete={onToggleComplete}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isSelected={selectedActivities.has(activity.id)}
                    onSelect={onSelectActivity}
                />
            ))}
        </div>
    );
};
