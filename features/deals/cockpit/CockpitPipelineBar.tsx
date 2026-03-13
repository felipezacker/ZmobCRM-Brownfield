'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, ChevronDown, RotateCcw, Search, Trophy, XCircle } from 'lucide-react';
import type { DealView } from '@/types';
import type { Stage } from './cockpit-types';
import { formatCurrencyBRL, humanizeTestLabel, toneToBg, toneToGlowColor, toneToText } from './cockpit-utils';
import { Button } from '@/components/ui/button';

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
    <div className="sticky top-0 z-40 border-b border-border bg-white/80 dark:bg-black/60 backdrop-blur-xl">
      {/* Row 1: nav + deal info + value + actions */}
      <div className="flex w-full items-center gap-3 px-4 pt-2.5 pb-2 2xl:px-8">
        <Button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted dark:bg-white/3 px-2.5 py-1.5 text-1xs font-semibold text-muted-foreground dark:text-muted-foreground hover:bg-accent/60 dark:hover:bg-white/6 hover:text-foreground dark:hover:text-muted-foreground transition-colors"
          onClick={onBack}
          title="Voltar ao board"
        >
          <ArrowLeft className="h-3 w-3" />
          Voltar
        </Button>

        <div className="h-4 w-px bg-accent dark:bg-white/8 shrink-0" />

        {/* Deal picker — custom combobox */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative" ref={pickerRef}>
            <Button
              type="button"
              className="flex items-center gap-1.5 max-w-80 rounded-lg border border-border bg-muted dark:bg-white/3 px-2.5 py-1.5 text-xs font-semibold text-foreground dark:text-muted-foreground outline-none hover:bg-accent/60 dark:hover:bg-white/6 transition-colors"
              onClick={() => setPickerOpen(!pickerOpen)}
              aria-label="Selecionar deal"
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
            >
              <span className="truncate">{dealLabel}</span>
              <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${pickerOpen ? 'rotate-180' : ''}`} />
            </Button>

            {pickerOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-96 rounded-xl border border-border bg-white dark:bg-background/95 backdrop-blur-xl shadow-2xl shadow-border/50 dark:shadow-black/50">
                {/* Search */}
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setPickerOpen(false); setSearch(''); }
                    }}
                    placeholder="Buscar negocio..."
                    className="flex-1 bg-transparent text-xs text-secondary-foreground dark:text-muted-foreground outline-none placeholder:text-muted-foreground dark:placeholder:text-secondary-foreground"
                  />
                  {search && (
                    <span className="text-2xs text-muted-foreground dark:text-secondary-foreground">{filtered.length}</span>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-auto py-1" role="listbox">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground dark:text-secondary-foreground">Nenhum negocio encontrado</div>
                  ) : (
                    filtered.map((d) => {
                      const isCurrent = d.id === deal.id;
                      const label = humanizeTestLabel(d.title) || d.title;
                      return (
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          key={d.id}
                          type="button"
                          role="option"
                          aria-selected={isCurrent}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            isCurrent
                              ? 'bg-accent/60 dark:bg-white/6'
                              : 'hover:bg-muted dark:hover:bg-white/4'
                          }`}
                          onClick={() => handlePickDeal(d.id)}
                        >
                          <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${isCurrent ? 'text-cyan-600 dark:text-cyan-400' : 'text-transparent'}`}>
                            <Check className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`truncate text-xs ${isCurrent ? 'font-semibold text-foreground dark:text-muted-foreground' : 'text-secondary-foreground dark:text-muted-foreground'}`}>
                              {label}
                            </div>
                          </div>
                          <div className="shrink-0 text-2xs font-medium text-emerald-600 dark:text-emerald-400/70">
                            {formatCurrencyBRL(d.value ?? 0)}
                          </div>
                        </Button>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-3 py-1.5">
                  <span className="text-2xs text-muted-foreground dark:text-secondary-foreground">{sortedDeals.length} negocios no board</span>
                </div>
              </div>
            )}
          </div>

          <span className="text-2xs text-muted-foreground dark:text-secondary-foreground shrink-0">
            {boardName}
            {crmLoading ? ' · Sync...' : ''}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right shrink-0">
            <div className="text-sm font-bold tracking-tight text-emerald-600 dark:text-emerald-300">{formatCurrencyBRL(deal.value ?? 0)}</div>
            <div className="text-2xs text-muted-foreground">
              {activeStage?.label ?? '—'}
            </div>
          </div>

          <div className="h-4 w-px bg-accent dark:bg-white/8 shrink-0" />

          {/* GANHOU/PERDEU */}
          {isWon || isLost ? (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-1xs font-bold ${
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
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted dark:bg-white/3 px-2.5 py-1 text-1xs font-semibold text-muted-foreground dark:text-muted-foreground hover:bg-accent/60 dark:hover:bg-white/6 hover:text-foreground dark:hover:text-muted-foreground transition-colors"
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
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-2.5 py-1.5 text-1xs font-bold text-white hover:bg-emerald-500 transition-colors"
                onClick={onWin}
              >
                <Trophy className="h-3 w-3" />
                GANHOU
              </Button>
              <Button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600/90 px-2.5 py-1.5 text-1xs font-bold text-white hover:bg-rose-500 transition-colors"
                onClick={onLoss}
              >
                <XCircle className="h-3 w-3" />
                PERDEU
              </Button>
            </div>
          )}

          {headerControls ? (
            <>
              <div className="h-4 w-px bg-accent dark:bg-white/8 shrink-0" />
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
                    ? 'bg-cyan-500/8 dark:bg-cyan-500/10 ring-1 ring-cyan-500/25 dark:ring-cyan-500/20'
                    : 'hover:bg-muted dark:hover:bg-white/3'
                }`}
                onClick={() => onStageChange(s.id)}
                title={s.label}
                style={isActive ? { boxShadow: `0 0 24px ${toneToGlowColor(s.tone)}` } : undefined}
              >
                {/* Progress segment */}
                <div
                  className={`h-[5px] rounded-full transition-all duration-300 ${
                    isActive
                      ? toneToBg(s.tone)
                      : isDone
                        ? `${toneToBg(s.tone)} opacity-60`
                        : 'bg-accent dark:bg-white/8 group-hover:bg-accent dark:group-hover:bg-white/15'
                  }`}
                />
                {/* Stage dot + label */}
                <div className="mt-1 flex items-center gap-1.5 min-w-0">
                  <span
                    className={`shrink-0 h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                      isActive
                        ? `${toneToBg(s.tone)} ring-2 ring-ring dark:ring-white/20`
                        : isDone
                          ? `${toneToBg(s.tone)} opacity-50`
                          : 'bg-accent dark:bg-white/10'
                    }`}
                  />
                  <span
                    className={`truncate text-2xs leading-tight transition-colors ${
                      isActive
                        ? 'font-bold text-foreground dark:text-muted-foreground'
                        : isDone
                          ? 'text-muted-foreground dark:text-muted-foreground'
                          : 'text-muted-foreground dark:text-secondary-foreground group-hover:text-secondary-foreground dark:group-hover:text-muted-foreground'
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
