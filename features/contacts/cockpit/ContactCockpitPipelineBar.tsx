'use client';

import React from 'react';
import { Button } from '@/app/components/ui/Button';

const CONTACT_STAGES = [
  { id: 'LEAD', label: 'Lead', bg: 'bg-blue-500', ring: 'ring-blue-500/30' },
  { id: 'MQL', label: 'MQL', bg: 'bg-violet-500', ring: 'ring-violet-500/30' },
  { id: 'PROSPECT', label: 'Prospect', bg: 'bg-amber-500', ring: 'ring-amber-500/30' },
  { id: 'CUSTOMER', label: 'Cliente', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
] as const;

interface ContactCockpitPipelineBarProps {
  currentStage: string;
  onStageChange: (stageId: string) => void;
}

export function ContactCockpitPipelineBar({
  currentStage,
  onStageChange,
}: ContactCockpitPipelineBarProps) {
  const currentIndex = CONTACT_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex items-center gap-3 px-2 py-3">
      {CONTACT_STAGES.map((stage, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;

        return (
          <Button
            key={stage.id}
            type="button"
            className="flex-1 min-w-0 text-left group"
            onClick={() => onStageChange(stage.id)}
            title={`Mover para ${stage.label}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  isDone || isActive ? stage.bg : 'bg-slate-200 dark:bg-white/10'
                }`}
              />
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  isActive
                    ? `${stage.bg} ring-2 ${stage.ring}`
                    : isDone
                      ? 'bg-slate-300 dark:bg-white/30'
                      : 'bg-slate-200 dark:bg-white/10 group-hover:bg-slate-300 dark:group-hover:bg-white/20'
                }`}
              />
            </div>
            <div
              className={`mt-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
              }`}
            >
              {stage.label}
            </div>
          </Button>
        );
      })}
    </div>
  );
}
