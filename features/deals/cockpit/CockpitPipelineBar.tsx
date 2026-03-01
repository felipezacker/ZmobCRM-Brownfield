'use client';

import React from 'react';
import { ArrowLeft, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { DealView } from '@/types';
import type { Stage } from './cockpit-types';
import { formatCurrencyBRL, humanizeTestLabel, toneToBg, toneToGlowColor, toneToText } from './cockpit-utils';
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
  headerControls?: React.ReactNode;
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
  headerControls,
}: CockpitPipelineBarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
      {/* Row 1: nav + deal info + value + actions */}
      <div className="flex w-full items-center gap-3 px-4 pt-2.5 pb-2 2xl:px-8">
        <Button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-white/6 hover:text-slate-200 transition-colors"
          onClick={onBack}
          title="Voltar ao board"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Button>

        <div className="h-4 w-px bg-white/8 shrink-0" />

        <div className="flex items-center gap-3 min-w-0">
          <select
            className="max-w-80 truncate rounded-lg border border-white/8 bg-white/3 px-2.5 py-1.5 text-xs font-semibold text-slate-100 outline-none hover:bg-white/6 focus:ring-1 focus:ring-cyan-400/30 transition-colors"
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
          <span className="text-[10px] text-slate-600 shrink-0">
            {boardName}
            {crmLoading ? ' · Sync...' : ''}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right shrink-0">
            <div className="text-sm font-bold tracking-tight text-emerald-300">{formatCurrencyBRL(deal.value ?? 0)}</div>
            <div className="text-[10px] text-slate-500">
              {activeStage?.label ?? '—'}
            </div>
          </div>

          <div className="h-4 w-px bg-white/8 shrink-0" />

          {/* GANHOU/PERDEU */}
          {isWon || isLost ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  isWon
                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/20'
                }`}
              >
                {isWon ? <Trophy className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {isWon ? 'GANHO' : 'PERDIDO'}
              </span>
              {onReopen ? (
                <Button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/8 bg-white/3 px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:bg-white/6 hover:text-slate-200 transition-colors"
                  onClick={onReopen}
                  title="Reabrir deal"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reabrir
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 transition-colors"
                onClick={onWin}
              >
                <Trophy className="h-3 w-3" />
                GANHOU
              </Button>
              <Button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600/90 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-rose-500 transition-colors"
                onClick={onLoss}
              >
                <XCircle className="h-3 w-3" />
                PERDEU
              </Button>
            </div>
          )}

          {headerControls ? (
            <>
              <div className="h-4 w-px bg-white/8 shrink-0" />
              {headerControls}
            </>
          ) : null}
        </div>
      </div>

      {/* Row 2: pipeline stages — premium segmented tracker */}
      <div className="px-4 pb-3 2xl:px-8">
        <div className="flex gap-0.5">
          {stages.map((s, idx) => {
            const isActive = idx === stageIndex;
            const isDone = idx < stageIndex;
            return (
              <Button
                key={s.id}
                type="button"
                className={`group relative flex-1 min-w-0 rounded-lg px-1.5 py-1.5 text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-white/6 ring-1 ring-white/10'
                    : 'hover:bg-white/3'
                }`}
                onClick={() => onStageChange(s.id)}
                title={s.label}
                style={isActive ? { boxShadow: `0 0 24px ${toneToGlowColor(s.tone)}` } : undefined}
              >
                {/* Progress segment */}
                <div
                  className={`h-[3px] rounded-full transition-all duration-300 ${
                    isActive
                      ? toneToBg(s.tone)
                      : isDone
                        ? `${toneToBg(s.tone)} opacity-60`
                        : 'bg-white/8 group-hover:bg-white/15'
                  }`}
                />
                {/* Stage dot + label */}
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  <span
                    className={`shrink-0 h-[6px] w-[6px] rounded-full transition-all duration-200 ${
                      isActive
                        ? `${toneToBg(s.tone)} ring-2 ring-white/20`
                        : isDone
                          ? `${toneToBg(s.tone)} opacity-50`
                          : 'bg-white/10'
                    }`}
                  />
                  <span
                    className={`truncate text-[10px] leading-tight transition-colors ${
                      isActive
                        ? 'font-semibold text-slate-100'
                        : isDone
                          ? 'text-slate-400'
                          : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
