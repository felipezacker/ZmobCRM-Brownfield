'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, ChevronDown, RotateCcw, Search, Trophy, XCircle } from 'lucide-react';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [pickerOpen]);

  // Focus search on open
  useEffect(() => {
    if (pickerOpen) searchRef.current?.focus();
  }, [pickerOpen]);

  const handlePickDeal = useCallback((id: string) => {
    onDealChange(id);
    setPickerOpen(false);
    setSearch('');
  }, [onDealChange]);

  const filtered = sortedDeals.filter((d) => {
    if (!search.trim()) return true;
    const title = (humanizeTestLabel(d.title) || d.title).toLowerCase();
    return title.includes(search.toLowerCase());
  });

  const dealLabel = humanizeTestLabel(deal.title) || deal.title;

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-black/60 backdrop-blur-xl">
      {/* Row 1: nav + deal info + value + actions */}
      <div className="flex w-full items-center gap-3 px-4 pt-2.5 pb-2 2xl:px-8">
        <Button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/3 px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/6 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          onClick={onBack}
          title="Voltar ao board"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Button>

        <div className="h-4 w-px bg-slate-200 dark:bg-white/8 shrink-0" />

        {/* Deal picker — custom combobox */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative" ref={pickerRef}>
            <Button
              type="button"
              className="flex items-center gap-1.5 max-w-80 rounded-lg border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/3 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none hover:bg-slate-200/60 dark:hover:bg-white/6 transition-colors"
              onClick={() => setPickerOpen(!pickerOpen)}
              aria-label="Selecionar deal"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
            >
              <span className="truncate">{dealLabel}</span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-slate-500 transition-transform duration-200 ${pickerOpen ? 'rotate-180' : ''}`} />
            </Button>

            {pickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-96 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl shadow-slate-300/50 dark:shadow-black/50">
                {/* Search */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/8 px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setPickerOpen(false); setSearch(''); }
                    }}
                    placeholder="Buscar negocio..."
                    className="flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  />
                  {search && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-600">{filtered.length}</span>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-auto py-1" role="listbox">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-600">Nenhum negocio encontrado</div>
                  ) : (
                    filtered.map((d) => {
                      const isCurrent = d.id === deal.id;
                      const label = humanizeTestLabel(d.title) || d.title;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          role="option"
                          aria-selected={isCurrent}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            isCurrent
                              ? 'bg-slate-200/60 dark:bg-white/6'
                              : 'hover:bg-slate-100 dark:hover:bg-white/4'
                          }`}
                          onClick={() => handlePickDeal(d.id)}
                        >
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${isCurrent ? 'text-cyan-600 dark:text-cyan-400' : 'text-transparent'}`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-xs ${isCurrent ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                              {label}
                            </div>
                          </div>
                          <div className="shrink-0 text-[10px] font-medium text-emerald-600 dark:text-emerald-400/70">
                            {formatCurrencyBRL(d.value ?? 0)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 dark:border-white/8 px-3 py-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">{sortedDeals.length} negocios no board</span>
                </div>
              </div>
            )}
          </div>

          <span className="text-[10px] text-slate-400 dark:text-slate-600 shrink-0">
            {boardName}
            {crmLoading ? ' · Sync...' : ''}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right shrink-0">
            <div className="text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-300">{formatCurrencyBRL(deal.value ?? 0)}</div>
            <div className="text-[10px] text-slate-500">
              {activeStage?.label ?? '—'}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-white/8 shrink-0" />

          {/* GANHOU/PERDEU */}
          {isWon || isLost ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  isWon
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-200 ring-1 ring-rose-500/20'
                }`}
              >
                {isWon ? <Trophy className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {isWon ? 'GANHO' : 'PERDIDO'}
              </span>
              {onReopen ? (
                <Button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/8 bg-slate-100 dark:bg-white/3 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/6 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
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
              <div className="h-4 w-px bg-slate-200 dark:bg-white/8 shrink-0" />
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
                    ? 'bg-slate-200/60 dark:bg-white/6 ring-1 ring-slate-300 dark:ring-white/10'
                    : 'hover:bg-slate-100 dark:hover:bg-white/3'
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
                        : 'bg-slate-200 dark:bg-white/8 group-hover:bg-slate-300 dark:group-hover:bg-white/15'
                  }`}
                />
                {/* Stage dot + label */}
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  <span
                    className={`shrink-0 h-[6px] w-[6px] rounded-full transition-all duration-200 ${
                      isActive
                        ? `${toneToBg(s.tone)} ring-2 ring-slate-400 dark:ring-white/20`
                        : isDone
                          ? `${toneToBg(s.tone)} opacity-50`
                          : 'bg-slate-200 dark:bg-white/10'
                    }`}
                  />
                  <span
                    className={`truncate text-[10px] leading-tight transition-colors ${
                      isActive
                        ? 'font-semibold text-slate-900 dark:text-slate-100'
                        : isDone
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'
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
