import React from 'react';
import { CheckCircle2, Target } from 'lucide-react';
import type { Board } from '@/types';
import { Button } from '@/components/ui/button';
import { TAILWIND_TO_HEX } from './constants';
import { DEFAULT_STAGE_COLOR } from '@/lib/design-tokens';

interface PipelineStagesProps {
    board?: Board;
    currentIdx: number;
    daysInStage: number;
    onMoveStage: (stageId: string) => void;
}

export const PipelineStages: React.FC<PipelineStagesProps> = ({
    board,
    currentIdx,
    daysInStage,
    onMoveStage,
}) => {
    return (
        <div className="p-4 border-t border-white/5">
            <p className="text-[9px] uppercase tracking-[0.1em] text-secondary-foreground font-medium mb-3">Pipeline</p>
            <div className="space-y-2">
                {board?.stages.map((stage, idx) => {
                    const isActive = idx === currentIdx;
                    const isPassed = idx < currentIdx;
                    const hexColor = TAILWIND_TO_HEX[stage.color] || DEFAULT_STAGE_COLOR;

                    const mockDaysPerStage = [3, 12, 38, 0];
                    const daysInThisStage = isActive ? daysInStage : (isPassed ? mockDaysPerStage[idx] || Math.floor(Math.random() * 15) + 1 : 0);

                    return (
                        <Button
                            key={stage.id}
                            onClick={() => onMoveStage(stage.id)}
                            className={`w-full px-3 py-2 rounded-lg flex items-center justify-between transition-all duration-200 group
                                ${!isActive && !isPassed ? 'bg-card/30 text-muted-foreground border border-transparent hover:bg-card/50 hover:text-muted-foreground' : ''}`}
                            style={{
                                backgroundColor: isActive ? `${hexColor}15` : isPassed ? `${hexColor}10` : undefined,
                                color: (isActive || isPassed) ? hexColor : undefined,
                                borderWidth: isActive ? '1px' : undefined,
                                borderColor: isActive ? `${hexColor}40` : undefined,
                                boxShadow: isActive ? `0 0 12px ${hexColor}50` : undefined,
                                opacity: isPassed ? 0.7 : 1,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                        backgroundColor: (isActive || isPassed) ? hexColor : '#334155',
                                        opacity: isPassed ? 0.5 : 1,
                                    }}
                                />
                                <span className="text-xs font-medium">
                                    {stage.label}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                {(isActive || isPassed) && (
                                    <span
                                        className="text-[10px] font-mono"
                                        style={{
                                            color: isActive && daysInThisStage > 7 ? '#fb923c' : (isActive || isPassed) ? hexColor : DEFAULT_STAGE_COLOR,
                                        }}
                                    >
                                        {daysInThisStage}d
                                    </span>
                                )}
                                {isPassed && <CheckCircle2 size={12} style={{ color: hexColor, opacity: 0.7 }} />}
                                {isActive && <Target size={12} className="animate-pulse" style={{ color: hexColor }} />}
                            </div>
                        </Button>
                    );
                })}
            </div>

            {/* Journey Summary */}
            <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px]">
                    <span className="text-secondary-foreground uppercase tracking-wider">Tempo no funil</span>
                    <span className="text-muted-foreground font-mono font-medium">
                        {(() => {
                            const totalDays = board?.stages.reduce((acc, _, idx) => {
                                if (idx < currentIdx) return acc + ([3, 12, 38][idx] || 5);
                                if (idx === currentIdx) return acc + daysInStage;
                                return acc;
                            }, 0) || 0;
                            return `${totalDays}d total`;
                        })()}
                    </span>
                </div>
            </div>
        </div>
    );
};
