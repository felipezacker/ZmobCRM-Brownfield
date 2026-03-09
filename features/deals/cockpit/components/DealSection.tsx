'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import type { Deal, DealView } from '@/types';
import { formatAtISO, formatCurrencyBRL } from '@/features/deals/cockpit/cockpit-utils';
import { CorretorSelect } from '@/components/ui/CorretorSelect';
import { SectionHeader } from '@/features/deals/cockpit/components/SectionHeader';
import {
  INPUT_CLASS,
  SELECT_CLASS,
  DEAL_TYPE_LABELS,
  PRIORITY_CONFIG,
} from '@/features/deals/cockpit/components/cockpit-data-constants';

export interface DealSectionProps {
  deal: DealView;
  collapsed: boolean;
  onToggle: () => void;
  estimatedCommission?: { rate: number; estimated: number } | null;
  onUpdateDeal?: (updates: Partial<Deal>) => void;
}

/** Deal details section: value, type, probability, priority, dates, owner, commission. */
export function DealSection({
  deal,
  collapsed,
  onToggle,
  estimatedCommission,
  onUpdateDeal,
}: DealSectionProps) {
  const probability = deal.probability ?? 50;
  const priority = deal.priority as string | undefined;

  return (
    <div className="rounded-xl border border-border bg-background dark:bg-white/2 p-3">
      <SectionHeader
        label="Deal"
        icon={<FileText className="h-3.5 w-3.5" />}
        iconColor="text-amber-500 dark:text-amber-400"
        collapsed={collapsed}
        onToggle={onToggle}
      />
      {!collapsed && (
        <div className="mt-2 space-y-2 text-xs">
          {/* Valor */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Valor</span>
            <input
              type="number"
              className={`${INPUT_CLASS} text-lg font-bold text-emerald-600 dark:text-emerald-300 text-right w-32`}
              defaultValue={deal.value ?? 0}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v !== (deal.value ?? 0)) onUpdateDeal?.({ value: v });
              }}
            />
          </div>
          {/* Tipo */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Tipo</span>
            <select
              className={`${SELECT_CLASS} text-secondary-foreground dark:text-muted-foreground`}
              value={deal.dealType ?? 'VENDA'}
              onChange={(e) => onUpdateDeal?.({ dealType: e.target.value as Deal['dealType'] })}
            >
              {Object.entries(DEAL_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          {/* Probabilidade com barra visual */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Probabilidade</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-accent dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${
                    probability <= 30 ? 'bg-rose-500' :
                    probability <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, probability)}%` }}
                />
              </div>
              <input
                type="number"
                className={`${INPUT_CLASS} font-semibold text-secondary-foreground dark:text-muted-foreground text-right w-12`}
                defaultValue={probability}
                min={0}
                max={100}
                onBlur={(e) => {
                  const v = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                  if (v !== probability) onUpdateDeal?.({ probability: v });
                }}
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </div>
          {/* Prioridade */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Prioridade</span>
            <select
              className={`${SELECT_CLASS} text-xs font-bold rounded-full px-2 py-0.5 ring-1 ${
                priority && PRIORITY_CONFIG[priority]
                  ? PRIORITY_CONFIG[priority].color
                  : 'bg-muted dark:bg-white/5 text-muted-foreground ring-ring dark:ring-white/10'
              }`}
              value={priority ?? ''}
              onChange={(e) => onUpdateDeal?.({ priority: (e.target.value || undefined) as Deal['priority'] })}
            >
              <option value="">--</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          {/* Data prevista */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Prev. fechamento</span>
            <input
              type="date"
              className={`${INPUT_CLASS} text-secondary-foreground dark:text-muted-foreground`}
              defaultValue={deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : ''}
              onChange={(e) => {
                const v = e.target.value;
                onUpdateDeal?.({ expectedCloseDate: v || undefined });
              }}
            />
          </div>
          {/* Dono */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Dono</span>
            <div className="max-w-[160px]">
              <CorretorSelect
                value={deal.ownerId}
                onChange={(ownerId) => onUpdateDeal?.({ ownerId })}
              />
            </div>
          </div>
          {/* Comissao (read-only) */}
          {estimatedCommission ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Comissao</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-300" title={`Taxa: ${estimatedCommission.rate}%`}>
                {formatCurrencyBRL(estimatedCommission.estimated)} ({estimatedCommission.rate}%)
              </span>
            </div>
          ) : null}
          {/* Timestamps (read-only) */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Criado</span>
            <span className="text-secondary-foreground dark:text-muted-foreground">{formatAtISO(deal.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Ultima mudanca</span>
            <span className="text-secondary-foreground dark:text-muted-foreground">{formatAtISO(deal.updatedAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
