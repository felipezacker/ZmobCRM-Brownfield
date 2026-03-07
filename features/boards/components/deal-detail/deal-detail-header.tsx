import React from 'react';
import {
  Check,
  X,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorretorSelect } from '@/components/ui/CorretorSelect';
import { StageProgressBar } from '@/features/boards/components/StageProgressBar';
import { BRL_CURRENCY } from '@/features/boards/components/deal-detail/constants';
import type { DealDetailHeaderProps } from '@/features/boards/components/deal-detail/types';

export const DealDetailHeader: React.FC<DealDetailHeaderProps> = ({
  deal,
  dealBoard,
  resolvedContactName,
  headingId,
  isEditingValue,
  editValue,
  onClose,
  onDelete,
  onOpenCockpit,
  onEditValueStart,
  onEditValueChange,
  onSaveValue,
  onOwnerChange,
  onWin,
  onLose,
  onReopen,
  onStageClick,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-[#0b1222] border-b border-slate-200 dark:border-white/[0.06] px-6 pt-5 pb-4 shrink-0">
      {/* Row 1: Lead name + product + action icons */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-400/20 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300 shrink-0">
          {(resolvedContactName || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-base font-semibold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
            {resolvedContactName}
          </h2>
          {deal.items && deal.items.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={deal.items[0].name}>
              {deal.items[0].name}
              {deal.items.length > 1 && (
                <span className="text-slate-400 dark:text-slate-500 ml-1">+{deal.items.length - 1}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-0.5 items-center shrink-0">
          <Button
            onClick={onOpenCockpit}
            className="text-slate-400 hover:text-primary-500 dark:text-slate-500 dark:hover:text-primary-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
            title="Abrir Cockpit"
          >
            <Maximize2 size={18} />
          </Button>
          <Button
            onClick={onDelete}
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
            title="Excluir Negocio"
          >
            <Trash2 size={18} />
          </Button>
          <Button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Row 2: Value + Corretor + Win/Loss */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Valor editavel */}
        <div className="shrink-0">
          {isEditingValue ? (
            <div className="flex gap-2 items-center">
              <span className="text-lg font-mono font-bold text-slate-500">R$</span>
              <input
                autoFocus
                type="number"
                className="text-lg font-mono font-bold text-primary-600 dark:text-primary-400 bg-white dark:bg-black/30 border border-slate-300 dark:border-primary-500/20 rounded-lg px-2.5 py-1 w-36 outline-none focus:ring-2 focus:ring-primary-500/40"
                value={editValue}
                onChange={e => onEditValueChange(e.target.value)}
                onBlur={onSaveValue}
                onKeyDown={e => e.key === 'Enter' && onSaveValue()}
              />
              <Button onClick={onSaveValue} className="text-green-500 hover:text-green-400">
                <Check size={18} />
              </Button>
            </div>
          ) : (
            <Button
              onClick={onEditValueStart}
              className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="Clique para editar valor"
            >
              {BRL_CURRENCY.format(deal.value)}
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-white/[0.06] shrink-0" />

        {/* Corretor Select */}
        <div className="w-44 shrink-0">
          <CorretorSelect
            value={deal.ownerId || undefined}
            onChange={onOwnerChange}
          />
        </div>

        <div className="flex-1" />

        {/* GANHO / PERDIDO / Reabrir */}
        <div className="flex gap-2 items-center shrink-0">
          {(deal.isWon || deal.isLost) ? (
            <>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                deal.isWon
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 dark:shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 dark:shadow-[0_0_12px_rgba(239,68,68,0.15)]'
              }`}>
                {deal.isWon ? 'GANHO' : 'PERDIDO'}
              </span>
              <Button
                onClick={onReopen}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all border border-transparent dark:border-white/[0.06]"
              >
                Reabrir
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={onWin}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-500 dark:bg-green-600/90 dark:hover:bg-green-500 text-white rounded-lg font-bold text-sm shadow-sm dark:shadow-[0_0_16px_rgba(34,197,94,0.2)] flex items-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <ThumbsUp size={14} /> GANHO
              </Button>
              <Button
                onClick={onLose}
                className="px-4 py-1.5 bg-transparent border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg font-bold text-sm flex items-center gap-1.5 transition-all hover:scale-[1.02]"
              >
                <ThumbsDown size={14} /> PERDIDO
              </Button>
            </>
          )}
        </div>
      </div>

      {dealBoard ? (
        <StageProgressBar
          stages={dealBoard.stages}
          currentStatus={deal.status}
          variant="timeline"
          onStageClick={onStageClick}
        />
      ) : (
        <div className="mt-4 rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Board nao encontrado para este negocio. Algumas acoes (mover estagio) podem ficar indisponiveis.
        </div>
      )}
    </div>
  );
};
