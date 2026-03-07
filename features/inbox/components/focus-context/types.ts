import type { Deal, Activity, Contact, Board } from '@/types';

export interface FocusContextPanelProps {
    deal: Deal;
    contact?: Contact;
    board?: Board;
    activities: Activity[];
    onMoveStage: (stageId: string) => void;
    onMarkWon: () => void;
    onMarkLost: () => void;
    onAddActivity: (activity: Partial<Activity>) => void | Promise<Activity | null>;
    onUpdateActivity: (id: string, updates: Partial<Activity>) => void;
    onClose: () => void;
    className?: string;
    isExpanded?: boolean;
}

export interface HealthScore {
    score: number;
    status: string;
    color: string;
}

export interface NextBestAction {
    action: string;
    reason: string;
    urgency: 'high' | 'medium' | 'low';
    actionType: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    isAI: boolean;
}

export type NBAActionMode = 'configure' | 'execute';
