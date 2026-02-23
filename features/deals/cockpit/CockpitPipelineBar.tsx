'use client';

import React from 'react';
import type { DealView } from '@/types';
import type { Stage } from './cockpit-types';
import { formatCurrencyBRL, humanizeTestLabel, toneToBg } from './cockpit-utils';

interface CockpitPipelineBarProps {
  deal: DealView;
  boardName: string;
  sortedDeals: DealView[];
  stages: Stage[];
  stageIndex: number;
  activeStage: Stage | undefined;
  crmLoading: boolean;
  onDealChange: (dealId: string) => void;
  onStageChange: (stageId: string) => void;
}

export function CockpitPipelineBar({
  deal,
  boardName,
  sortedDeals,
  stages,
  stageIndex,
  activeStage,
  crmLoading,
  onDealChange,
  onStageChange,
}: CockpitPipelineBarProps) {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-white/5 bg-black/40 backdrop-blur">
      <div className="flex h-16 w-full items-center px-6 2xl:px-10">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <select
                className="max-w-90 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 outline-none hover:bg-white/8 focus:ring-2 focus:ring-cyan-400/30"
                value={deal.id}
                onChange={(e) => onDealChange(e.target.value)}
                aria-label="Selecionar deal"
              >
                {sortedDeals.map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-950">
                    {humanizeTestLabel(d.title) || d.title}
                  </option>
                ))}
              </select>
              {crmLoading ? <div className="ml-2 text-[11px] text-slate-600">Sincronizando…</div> : null}
            </div>
            <div className="mt-1 text-[11px] text-slate-600">{boardName}</div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold text-emerald-300">{formatCurrencyBRL(deal.value ?? 0)}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Etapa: <span className="font-semibold text-slate-300">{activeStage?.label ?? '—'}</span>
            </div>
          </div>
        </div>

        <div
          className="ml-8 grid flex-1 gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(0, 1fr))` }}
        >
          {stages.map((s, idx) => {
            const isActive = idx === stageIndex;
            const isDone = idx < stageIndex;
            return (
              <button
                key={s.id}
                type="button"
                className="min-w-0 text-left"
                onClick={() => onStageChange(s.id)}
                title={`Mover para ${s.label}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 flex-1 rounded-full ${isDone || isActive ? toneToBg(s.tone) : 'bg-white/10'}`} />
                  <div className={`h-2 w-2 rounded-full ${isActive ? toneToBg(s.tone) : isDone ? 'bg-white/30' : 'bg-white/10'}`} />
                </div>
                <div className={`mt-1 text-[11px] ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{s.label}</div>
              </button>
            );
          })}
        </div>

        <div className="ml-8 hidden text-[11px] text-slate-600 xl:block">Clique nas etapas para mover o deal (real)</div>
      </div>
    </div>
  );
}
