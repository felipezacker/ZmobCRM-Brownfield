import React from 'react';
import { Heart, Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HealthScore } from './types';

interface HealthSectionProps {
    healthScore: HealthScore;
    isAILoading: boolean;
    hasAIAnalysis: boolean;
    onRefresh: () => void;
}

export const HealthSection: React.FC<HealthSectionProps> = ({
    healthScore,
    isAILoading,
    hasAIAnalysis,
    onRefresh,
}) => {
    return (
        <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isAILoading ? (
                        <Loader2 size={16} className="text-primary-400 animate-spin" />
                    ) : (
                        <Heart size={16} className={healthScore.color} />
                    )}
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Health</span>
                    {hasAIAnalysis && (
                        <span className="text-3xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles size={10} /> AI
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold text-2xl ${healthScore.color}`}>{healthScore.score}%</span>
                    <Button
                        onClick={onRefresh}
                        className="p-1 hover:bg-white/5 rounded text-muted-foreground hover:text-muted-foreground transition-colors"
                        title="Reanalisar com IA"
                    >
                        <RefreshCw size={12} />
                    </Button>
                </div>
            </div>
            <div className="h-1.5 bg-card/50 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${healthScore.status === 'excellent' ? 'bg-emerald-500' :
                        healthScore.status === 'good' ? 'bg-green-500' :
                            healthScore.status === 'warning' ? 'bg-yellow-500' :
                                'bg-red-500'
                        }`}
                    style={{ width: `${healthScore.score}%` }}
                />
            </div>
        </div>
    );
};
