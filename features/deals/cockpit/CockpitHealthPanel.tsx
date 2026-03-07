'use client';

import React from 'react';
import { HeartPulse, Sparkles } from 'lucide-react';
import { Chip, Panel } from './cockpit-ui';
import { Button } from '@/components/ui/button';

interface CockpitHealthPanelProps {
  health: { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' };
  aiLoading: boolean;
  onRefetchAI: () => void;
}

export function CockpitHealthPanel({ health, aiLoading, onRefetchAI }: CockpitHealthPanelProps) {
  return (
    <Panel
      title="Health"
      icon={<HeartPulse className="h-4 w-4 text-emerald-300" />}
      right={<Chip tone={health.status === 'excellent' || health.status === 'good' ? 'success' : 'neutral'}>{health.score}%</Chip>}
      className="shrink-0"
    >
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${
            health.status === 'excellent'
              ? 'bg-emerald-500'
              : health.status === 'good'
                ? 'bg-green-500'
                : health.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
          }`}
          style={{ width: `${health.score}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-500">IA + probabilidade do deal.</div>
        <Button
          type="button"
          className="rounded-xl border border-white/10 bg-white/3 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
          onClick={onRefetchAI}
          title="Reanalisar com IA"
        >
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {aiLoading ? 'Analisando…' : 'Reanalisar'}
          </span>
        </Button>
      </div>
    </Panel>
  );
}
