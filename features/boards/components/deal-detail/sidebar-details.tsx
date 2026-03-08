import React from 'react';
import { formatPriorityPtBr } from '@/lib/utils/priority';
import { BRL_CURRENCY, PT_BR_DATE_FORMATTER } from '@/features/boards/components/deal-detail/constants';
import type { Deal } from '@/types';

export interface SidebarDetailsProps {
  deal: Deal;
  propertyRef: string;
  estimatedCommission: { estimated: number; rate: number } | null;
  onUpdateDeal: (id: string, data: Record<string, unknown>) => void;
  onPropertyRefChange: (value: string) => void;
}

export const SidebarDetails: React.FC<SidebarDetailsProps> = ({
  deal,
  propertyRef,
  estimatedCommission,
  onUpdateDeal,
  onPropertyRefChange,
}) => (
  <div className="pt-3 border-t border-border">
    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">Detalhes</h3>
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground text-xs">Tipo</span>
        <select
          value={deal.dealType || 'VENDA'}
          onChange={e => onUpdateDeal(deal.id, { dealType: e.target.value as 'VENDA' | 'LOCACAO' | 'PERMUTA' })}
          className="text-xs text-foreground bg-transparent border border-border dark:border-border rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
        >
          <option value="VENDA">Venda</option>
          <option value="LOCACAO">Locacao</option>
          <option value="PERMUTA">Permuta</option>
        </select>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground text-xs">Prev. Fech.</span>
        <input
          type="date"
          value={deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : ''}
          onChange={e => onUpdateDeal(deal.id, { expectedCloseDate: e.target.value || undefined })}
          className="text-xs text-foreground bg-transparent border border-border dark:border-border rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
        />
      </div>
      <div className="flex justify-between items-start text-sm gap-2">
        <span className="text-muted-foreground text-xs shrink-0 pt-1.5">Imovel</span>
        <input
          type="text"
          value={propertyRef}
          onChange={e => onPropertyRefChange(e.target.value)}
          onBlur={() => onUpdateDeal(deal.id, { propertyRef: propertyRef || undefined })}
          placeholder="Ref. do imovel..."
          className="text-xs text-foreground bg-transparent border border-border dark:border-border rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary-500 text-right w-full max-w-[160px]"
        />
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground text-xs">Prioridade</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          deal.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
          deal.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
          'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
        }`}>
          {formatPriorityPtBr(deal.priority)}
        </span>
      </div>
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground text-xs">Probabilidade</span>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-accent dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${
                (deal.probability ?? 0) <= 30 ? 'bg-red-500' :
                (deal.probability ?? 0) <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, deal.probability ?? 0)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground">{deal.probability ?? 0}%</span>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground text-xs">Criado em</span>
        <span className="text-foreground text-xs">
          {PT_BR_DATE_FORMATTER.format(new Date(deal.createdAt))}
        </span>
      </div>
      {estimatedCommission && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground text-xs">Comissao Est.</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs" title={`Taxa: ${estimatedCommission.rate}%`}>
            {BRL_CURRENCY.format(estimatedCommission.estimated)}
            <span className="text-[10px] text-muted-foreground ml-1">({estimatedCommission.rate}%)</span>
          </span>
        </div>
      )}
    </div>
  </div>
);
