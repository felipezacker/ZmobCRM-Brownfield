import React from 'react';
import type { Deal, Activity } from '@/types';

interface DealStatsBarProps {
    daysInStage: number;
    deal: Deal;
    activitiesCount: number;
}

export const DealStatsBar: React.FC<DealStatsBarProps> = ({
    daysInStage,
    deal,
    activitiesCount,
}) => {
    return (
        <div className="p-4 border-b border-dark-border">
            <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                    <span className="text-2xs text-secondary-foreground uppercase tracking-wider font-semibold block">Dias</span>
                    <p className={`text-lg font-mono font-bold ${daysInStage > 7 ? 'text-orange-400' : 'text-muted-foreground'}`}>{daysInStage}</p>
                </div>
                <div className="text-center">
                    <span className="text-2xs text-secondary-foreground uppercase tracking-wider font-semibold block">Prob</span>
                    <p className="text-lg font-mono font-bold text-emerald-400">{deal.probability || 50}%</p>
                </div>
                <div className="text-center">
                    <span className="text-2xs text-secondary-foreground uppercase tracking-wider font-semibold block">Ativ</span>
                    <p className="text-lg font-mono font-bold text-blue-400">{activitiesCount}</p>
                </div>
            </div>
        </div>
    );
};
