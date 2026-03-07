import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { Deal, Board } from '@/types';
import { Button } from '@/components/ui/button';
import { TAILWIND_TO_HEX } from './constants';

interface PipelineHeaderProps {
    deal: Deal;
    board?: Board;
    currentIdx: number;
    onMoveStage: (stageId: string) => void;
}

export const PipelineHeader: React.FC<PipelineHeaderProps> = ({
    deal,
    board,
    currentIdx,
    onMoveStage,
}) => {
    return (
        <header className="shrink-0 border-b border-dark-border">
            {/* Top Row: Title + Board Name (center) + Value */}
            <div className="flex items-center justify-between px-6 py-3">
                <div>
                    <h1 className="text-lg font-semibold text-white tracking-tight">
                        {deal.title}
                    </h1>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                        {board?.name || 'Board'}
                    </span>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400 font-mono tracking-tight">
                        R$ {deal.value?.toLocaleString('pt-BR') || '0'}
                    </p>
                </div>
            </div>

            {/* Pipeline Progress */}
            <div className="px-6 pb-4 pt-1">
                <div className="flex items-center">
                    {board?.stages.map((stage, idx) => {
                        const isActive = idx === currentIdx;
                        const isPassed = idx < currentIdx;
                        const isLast = idx === (board?.stages?.length || 0) - 1;
                        const hexColor = TAILWIND_TO_HEX[stage.color] || '#64748b';

                        return (
                            <React.Fragment key={stage.id}>
                                <Button
                                    onClick={() => onMoveStage(stage.id)}
                                    className="flex flex-col items-center gap-2 group relative"
                                >
                                    <div
                                        className={`relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300
                                        ${isActive ? 'ring-4' : isPassed ? 'hover:scale-110 opacity-80' : 'hover:scale-110'}
                                        ${!isActive && !isPassed ? 'bg-slate-700/80 hover:bg-slate-600' : ''}`}
                                        style={{
                                            backgroundColor: (isActive || isPassed) ? hexColor : undefined,
                                            boxShadow: isActive ? `0 0 15px ${hexColor}80` : undefined,
                                            ['--tw-ring-color' as string]: isActive ? `${hexColor}50` : undefined,
                                        }}
                                    >
                                        {isPassed && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                                        {isActive && (
                                            <>
                                                <span
                                                    className="absolute inset-0 rounded-full animate-ping opacity-40"
                                                    style={{ backgroundColor: hexColor }}
                                                />
                                                <div className="w-2 h-2 rounded-full bg-white" />
                                            </>
                                        )}
                                    </div>
                                    <span
                                        className={`text-[10px] font-medium whitespace-nowrap transition-all duration-200
                                        ${isActive ? 'font-bold' : isPassed ? 'opacity-70' : 'text-slate-500 group-hover:text-slate-300'}`}
                                        style={{
                                            color: (isActive || isPassed) ? hexColor : undefined,
                                        }}
                                    >
                                        {stage.label}
                                    </span>
                                </Button>

                                {!isLast && (
                                    <div className="flex-1 mx-3 relative h-0.5 -mt-6">
                                        <div className="absolute inset-0 bg-slate-800 rounded-full" />
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                                            style={{
                                                backgroundColor: isPassed ? hexColor : 'transparent',
                                                width: isPassed ? '100%' : 0,
                                                opacity: isPassed ? 0.7 : 1,
                                            }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </header>
    );
};
