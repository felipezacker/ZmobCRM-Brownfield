'use client';

import React from 'react';
import { ArrowLeft, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { DealView } from '@/types';
import type { Stage } from './cockpit-types';
import { formatCurrencyBRL, humanizeTestLabel, toneToBg } from './cockpit-utils';
import { Button } from '@/app/components/ui/Button';

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
  onBack: () => void;
  onWin: () => void;
  onLoss: () => void;
  isWon: boolean;
  isLost: boolean;
  onReopen?: () => void;
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
  onBack,
  onWin,
  onLoss,
  isWon,
  isLost,
  onReopen,
}: CockpitPipelineBarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-white/5 bg-black/40 backdrop-blur">
      <div className="flex w-full items-center px-6 py-3 2xl:px-10">
        <Button
          type="button"
          className="mr-3 flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/8"
          onClick={onBack}
          title="Voltar ao Kanban"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Kanban
        </Button>

        <div className="flex shrink-0 items-center justify-between gap-4">
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

        {/* GANHOU/PERDEU or Status Badge */}
        <div className="ml-4 flex shrink-0 items-center gap-2">
          {isWon || isLost ? (
            <>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                  isWon
                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/20'
                }`}
              >
                {isWon ? <Trophy className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {isWon ? 'GANHO' : 'PERDIDO'}
              </span>
              {onReopen ? (
                <Button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/8"
                  onClick={onReopen}
                  title="Reabrir deal"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reabrir
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500"
                onClick={onWin}
              >
                <Trophy className="h-3.5 w-3.5" />
                GANHOU
              </Button>
              <Button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500"
                onClick={onLoss}
              >
                <XCircle className="h-3.5 w-3.5" />
                PERDEU
              </Button>
            </>
          )}
        </div>

        <div
          className="ml-6 grid min-w-0 flex-1 gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, stages.length)}, minmax(0, 1fr))` }}
        >
          {stages.map((s, idx) => {
            const isActive = idx === stageIndex;
            const isDone = idx < stageIndex;
            return (
              <Button
                key={s.id}
                type="button"
                className="min-w-0 overflow-hidden text-left"
                onClick={() => onStageChange(s.id)}
                title={s.label}
              >
                <div className="flex items-center gap-1">
                  <div className={`h-1.5 flex-1 rounded-full ${isDone || isActive ? toneToBg(s.tone) : 'bg-white/10'}`} />
                  <div className={`h-2 w-2 shrink-0 rounded-full ${isActive ? toneToBg(s.tone) : isDone ? 'bg-white/30' : 'bg-white/10'}`} />
                </div>
                <div className={`mt-1 truncate text-[10px] leading-tight ${isActive ? 'font-medium text-slate-200' : 'text-slate-500'}`}>{s.label}</div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
