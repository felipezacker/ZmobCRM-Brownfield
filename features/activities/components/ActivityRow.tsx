import React from 'react';
import Link from 'next/link';
import { Clock, Trash2, Edit2, CheckCircle2, Circle, Users, Copy, Repeat } from 'lucide-react';
import { useBoards } from '@/context/boards/BoardsContext';
import { Activity, Deal, Contact } from '@/types';
import { Button } from '@/components/ui/button';
import { getActivityIconList } from '../utils';

interface ActivityRowProps {
    activity: Activity;
    deal?: Deal;
    contact?: Contact;
    onToggleComplete: (id: string) => void;
    onEdit: (activity: Activity) => void;
    onDelete: (id: string) => void;
    onDuplicate?: (activity: Activity) => void;
    isSelected?: boolean;
    onSelect?: (id: string, selected: boolean, event?: React.MouseEvent) => void;
}

/**
 * Performance: essa linha aparece em listas grandes (activities).
 * `React.memo` ajuda a evitar re-render de todas as linhas quando apenas seleção/1 item muda.
 */
const ActivityRowComponent: React.FC<ActivityRowProps> = ({
    activity,
    deal,
    contact,
    onToggleComplete,
    onEdit,
    onDelete,
    onDuplicate,
    isSelected = false,
    onSelect
}) => {

    const { activeBoard, boards } = useBoards();

    const translateStatus = (status: string) => {
        // Se não parece ser um UUID, retorna direto (já é um label legível)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(status)) {
            return status;
        }

        // Procura em TODOS os boards, não só no ativo
        for (const board of boards) {
            const stage = board.stages.find(s => s.id === status);
            if (stage) return stage.label;
        }

        // Fallback para mapeamento legado
        const map: Record<string, string> = {
            'NEW': 'Novas Oportunidades',
            'CONTACTED': 'Contatado',
            'PROPOSAL': 'Proposta',
            'NEGOTIATION': 'Negociação',
            'CLOSED_WON': 'Ganho',
            'CLOSED_LOST': 'Perdido',
            'LEAD': 'Lead',
            'MQL': 'Lead Qualificado',
            'PROSPECT': 'Oportunidade',
            'CUSTOMER': 'Cliente'
        };
        
        // Se ainda é UUID e não encontrou, mostra fallback amigável
        return map[status] || 'Estágio não identificado';
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'agora mesmo';
        if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} h`;
        if (diffInSeconds < 172800) return 'ontem';
        return date.toLocaleDateString('pt-BR');
    };

    const formatTitle = (title: string) => {
        if (title.includes('Moveu para')) {
            const status = title.replace('Moveu para ', '');
            return (
                <span>
                    Movido para <span className="font-bold text-secondary-foreground dark:text-muted-foreground">{translateStatus(status)}</span>
                </span>
            );
        }
        if (title === 'Negócio Criado') return 'Negócio criado';
        return title;
    };

    const isSystemActivity = activity.type === 'STATUS_CHANGE';
    const isOverdue = new Date(activity.date) < new Date() && !activity.completed;

    if (isSystemActivity) {
        return (
            <div className="group flex gap-4 px-4 py-2 items-center">
                {/* Timeline Line/Dot */}
                <div className="flex-shrink-0 w-6 flex justify-center">
                    <div className="w-2 h-2 rounded-full bg-accent dark:bg-accent ring-4 ring-white dark:ring-dark-card" />
                </div>

                <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-secondary-foreground dark:text-muted-foreground">
                            {formatTitle(activity.title)}
                        </span>
                    </div>

                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {formatRelativeTime(activity.date)}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`group flex items-center gap-4 p-4 bg-white dark:bg-dark-card border border-border  rounded-xl hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all ${activity.completed ? 'opacity-60' : ''} ${isSelected ? 'border-primary-500 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-500/10' : ''}`}>
            {onSelect && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                        const mouseEvent = e.nativeEvent as MouseEvent;
                        // Construct a minimal MouseEvent-like object with shiftKey for range selection
                        onSelect(activity.id, e.target.checked, { shiftKey: mouseEvent.shiftKey } as React.MouseEvent);
                    }}
                    className="w-4 h-4 text-primary-600 bg-muted border-border rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-accent dark:border-border cursor-pointer"
                />
            )}

            <Button
                onClick={() => onToggleComplete(activity.id)}
                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${activity.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-border dark:border-border hover:border-green-500 text-transparent hover:text-green-500'
                    }`}
            >
                <CheckCircle2 size={14} fill="currentColor" />
            </Button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 bg-muted dark:bg-white/5 rounded-lg">
                        {getActivityIconList(activity.type)}
                    </span>
                    <h3 className={`font-medium text-foreground  truncate ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {formatTitle(activity.title)}
                    </h3>
                    {activity.recurrenceType && (
                        <span className="text-2xs font-bold px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-full flex items-center gap-1">
                            <Repeat size={10} />
                            {activity.recurrenceType === 'daily' ? 'Diário' : activity.recurrenceType === 'weekly' ? 'Semanal' : 'Mensal'}
                        </span>
                    )}
                    {isOverdue && (
                        <span className="text-2xs font-bold px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 rounded-full">
                            ATRASADO
                        </span>
                    )}
                </div>
                {activity.description && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5 mb-1">{activity.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground dark:text-muted-foreground">
                    {deal && (
                        <Link
                            href={`/deals/${deal.id}/cockpit`}
                            className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-medium hover:underline"
                            title={`Abrir negócio: ${deal.title}`}
                        >
                            <Circle size={8} fill="currentColor" />
                            <span className="truncate max-w-[200px]">{deal.title}</span>
                        </Link>
                    )}
                    {contact && (
                        <Link
                            href={`/contacts?contactId=${contact.id}`}
                            className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 font-medium hover:underline"
                            title={`Abrir contato: ${contact.name}`}
                        >
                            <Users size={14} />
                            <span className="truncate max-w-[200px]">{contact.name}</span>
                        </Link>
                    )}
                    <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {formatRelativeTime(activity.date)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <Button
                    onClick={() => onEdit(activity)}
                    className="p-2 text-muted-foreground hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Edit2 size={16} />
                </Button>
                {onDuplicate && (
                    <Button
                        onClick={() => onDuplicate(activity)}
                        className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Duplicar"
                        aria-label="Duplicar atividade"
                    >
                        <Copy size={16} />
                    </Button>
                )}
                <Button
                    onClick={() => onDelete(activity.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir"
                >
                    <Trash2 size={16} />
                </Button>
            </div>
        </div>
    );
};

export const ActivityRow = React.memo(ActivityRowComponent);
