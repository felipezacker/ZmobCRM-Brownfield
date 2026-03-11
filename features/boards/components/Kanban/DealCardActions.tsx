import React from 'react';
import { DealView } from '@/types';
import { ActivityStatusIcon } from './ActivityStatusIcon';

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface DealCardActionsProps {
  deal: DealView;
  isClosed: boolean;
  visibleTags: string[];
  extraTagCount: number;
  activityStatus: string;
  isMenuOpen: boolean;
  onToggleMenu: (e: React.MouseEvent) => void;
  onQuickAdd: (type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP') => void;
  onRequestClose: () => void;
  onMoveToStage?: (dealId: string) => void;
  onWinDeal?: (dealId: string) => void;
  onLoseDeal?: (dealId: string, dealTitle: string) => void;
  onDeleteDeal?: (dealId: string) => void;
}

export const DealCardActions: React.FC<DealCardActionsProps> = ({
  deal,
  isClosed,
  visibleTags,
  extraTagCount,
  activityStatus,
  isMenuOpen,
  onToggleMenu,
  onQuickAdd,
  onRequestClose,
  onMoveToStage,
  onWinDeal,
  onLoseDeal,
  onDeleteDeal,
}) => (
  <div className="flex items-center gap-1.5 mt-1.5">
    <div className="flex gap-1 flex-1 min-w-0 items-center overflow-hidden">
      {deal.isWon && (
        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300 shrink-0">GANHO</span>
      )}
      {deal.isLost && (
        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 shrink-0">PERDIDO</span>
      )}
      {visibleTags.map((tag, index) => (
        <span key={`${deal.id}-tag-${index}`} className="text-[9px] font-medium px-1 py-0.5 rounded bg-muted dark:bg-white/5 text-muted-foreground dark:text-muted-foreground truncate max-w-[80px]">{tag}</span>
      ))}
      {extraTagCount > 0 && (
        <span className="text-[9px] text-muted-foreground dark:text-muted-foreground shrink-0">+{extraTagCount}</span>
      )}
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[10px] text-muted-foreground dark:text-muted-foreground tabular-nums">{formatDate(deal.createdAt)}</span>
      <ActivityStatusIcon
        status={activityStatus}
        type={deal.nextActivity?.type}
        dealId={deal.id}
        dealTitle={deal.title}
        isOpen={isMenuOpen}
        onToggle={onToggleMenu}
        onQuickAdd={onQuickAdd}
        onRequestClose={onRequestClose}
        onMoveToStage={onMoveToStage ? () => onMoveToStage(deal.id) : undefined}
        onWinDeal={onWinDeal ? () => onWinDeal(deal.id) : undefined}
        onLoseDeal={onLoseDeal ? () => onLoseDeal(deal.id, deal.title) : undefined}
        onDeleteDeal={onDeleteDeal ? () => onDeleteDeal(deal.id) : undefined}
        isClosed={isClosed}
      />
    </div>
  </div>
);
