import React, { useState } from 'react';
import { DealView, Product } from '@/types';
import type { OrgMember } from '@/hooks/useOrganizationMembers';
import { Hourglass, Loader2, Trophy, XCircle, Phone, Calendar, Mail, MessageCircle, MoreHorizontal } from 'lucide-react';
import { priorityAriaLabelPtBr } from '@/lib/utils/priority';
import { useDealCardPopovers } from './hooks/useDealCardPopovers';
import { ProductPicker, OwnerPicker } from './DealCardPopovers';
import { DealCardActions } from './DealCardActions';
import { Button } from '@/components/ui/button';
import { formatRelativeActivityDate, formatStageAge } from '@/features/boards/hooks/boardUtils';

interface DealCardProps {
  deal: DealView;
  isRotting: boolean;
  activityStatus: string;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string, title: string) => void;
  /** Callback de selecao do deal (mantido estavel via useCallback no pai para permitir memoizacao) */
  onSelect: (dealId: string) => void;
  /**
   * Performance: boolean derivado por-card evita prop global mutavel.
   * Isso reduz re-render em listas grandes quando o usuario abre/fecha o menu.
   */
  isMenuOpen: boolean;
  setOpenMenuId: (id: string | null) => void;
  onQuickAddActivity: (
    dealId: string,
    type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP',
    dealTitle: string
  ) => void;
  setLastMouseDownDealId: (id: string | null) => void;
  /** Callback to open move-to-stage modal for keyboard accessibility */
  onMoveToStage?: (dealId: string) => void;
  /** Whether this card is currently in keyboard "grab" mode */
  isGrabbed?: boolean;
  /** Keyboard handler for Arrow-key movement (provided by useKanbanKeyboard) */
  onKeyboardMove?: (e: React.KeyboardEvent) => void;
  products: Product[];
  onProductChange: (dealId: string, product: Product | null) => void;
  members: OrgMember[];
  onOwnerChange: (dealId: string, member: OrgMember | null) => void;
  onWinDeal?: (dealId: string) => void;
  onLoseDeal?: (dealId: string, dealTitle: string) => void;
  onDeleteDeal?: (dealId: string) => void;
}

// Check if deal is closed (won or lost)
const isDealClosed = (deal: DealView) => deal.isWon || deal.isLost;

// Get priority label for accessibility (PT-BR)
const getPriorityLabel = (priority: string | undefined) => priorityAriaLabelPtBr(priority);

// Get initials from name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Performance: reuse currency formatter instance.
const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });


const DealCardComponent: React.FC<DealCardProps> = ({
  deal,
  isRotting,
  activityStatus,
  isDragging,
  onDragStart,
  onSelect,
  isMenuOpen,
  setOpenMenuId,
  onQuickAddActivity,
  setLastMouseDownDealId,
  onMoveToStage,
  isGrabbed = false,
  onKeyboardMove,
  products,
  onProductChange,
  members,
  onOwnerChange,
  onWinDeal,
  onLoseDeal,
  onDeleteDeal,
}) => {
  const [localDragging, setLocalDragging] = useState(false);
  const isClosed = isDealClosed(deal);

  const popovers = useDealCardPopovers({
    dealId: deal.id,
    products,
    members,
    onProductChange,
    onOwnerChange,
  });

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(isMenuOpen ? null : deal.id);
  };

  const handleQuickAdd = (type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP') => {
    onQuickAddActivity(deal.id, type, deal.title);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setLocalDragging(true);
    e.dataTransfer.setData('dealId', deal.id);
    e.dataTransfer.setData('dealTitle', deal.title || '');
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(e, deal.id, deal.title || '');
  };

  const handleDragEnd = () => {
    setLocalDragging(false);
  };

  const getCardClasses = () => {
    const baseClasses = `
      p-2.5 rounded-lg border-l-[3px] border-y border-r
      shadow-sm cursor-grab active:cursor-grabbing group
      hover:shadow-md hover:-translate-y-0.5
      transition-all duration-200 ease-out relative select-none
    `;

    if (deal.isWon) {
      return `${baseClasses}
        bg-green-50 dark:bg-green-900/20
        border-green-200 dark:border-green-700/50
        ${localDragging || isDragging ? 'opacity-50 rotate-2 scale-95' : ''}`;
    }

    if (deal.isLost) {
      return `${baseClasses}
        bg-red-50 dark:bg-red-900/20
        border-red-200 dark:border-red-700/50
        ${localDragging || isDragging ? 'opacity-50 rotate-2 scale-95' : 'opacity-70'}`;
    }

    if (deal.id.startsWith('temp-')) {
      return `${baseClasses}
        border-border
        bg-white dark:bg-card/80
        opacity-60 cursor-default pointer-events-none
      `;
    }

    return `${baseClasses}
      border-border
      ${localDragging || isDragging ? 'bg-green-100 dark:bg-green-900 opacity-50 rotate-2 scale-95' : 'bg-white dark:bg-card/80'}
      ${isRotting ? 'opacity-80 saturate-50 border-dashed' : ''}
    `;
  };

  const getBorderLeftClass = () => {
    if (deal.isWon) return '!border-l-green-500';
    if (deal.isLost) return '!border-l-red-500';
    if (deal.priority === 'high') return '!border-l-red-500';
    if (deal.priority === 'medium') return '!border-l-amber-500';
    return '!border-l-blue-500';
  };

  const getAriaLabel = () => {
    const parts: string[] = [];
    if (deal.isWon) parts.push('ganho');
    if (deal.isLost) parts.push('perdido');
    const shownTags = (deal.contactTags || []).slice(0, isClosed ? 1 : 2);
    if (shownTags.length > 0) parts.push(...shownTags);
    parts.push(deal.title);
    parts.push(BRL_CURRENCY.format(deal.value));
    const priority = getPriorityLabel(deal.priority);
    if (priority) parts.push(priority);
    if (deal.nextActivity) {
      const relDate = formatRelativeActivityDate(deal.nextActivity.date);
      parts.push(`proxima atividade: ${deal.nextActivity.type} ${relDate}`);
    }
    if (!isClosed) {
      const stageAge = formatStageAge(deal.lastStageChangeDate);
      if (stageAge) parts.push(stageAge);
    }
    if (isRotting && !isClosed) parts.push('estagnado');
    if (isGrabbed) parts.push('segurado para mover');
    return parts.join(', ');
  };

  const productName = deal.items && deal.items.length > 0 ? deal.items[0].name : null;

  const contactTags = deal.contactTags || [];
  const maxVisibleTags = 2;
  const visibleTags = contactTags.slice(0, maxVisibleTags);
  const extraTagCount = contactTags.length - maxVisibleTags;

  return (
    <div
      data-deal-id={deal.id}
      draggable={!deal.id.startsWith('temp-')}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={() => setLastMouseDownDealId(deal.id)}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) return;
        onSelect(deal.id);
      }}
      onKeyDown={e => {
        if (onKeyboardMove && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'g', 'G', 'Escape'].includes(e.key)) {
          onKeyboardMove(e);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!(e.target as HTMLElement).closest('button')) {
            onSelect(deal.id);
          }
        }
      }}
      tabIndex={0}
      role="article"
      aria-roledescription="cartao movivel"
      aria-label={getAriaLabel()}
      className={`${getCardClasses()} ${getBorderLeftClass()}`}
    >
      {/* Saving Badge */}
      {deal.id.startsWith('temp-') && (
        <div className="absolute -top-2 -right-2 bg-muted dark:bg-accent text-muted-foreground dark:text-muted-foreground p-1 rounded-full shadow-sm z-10" aria-label="Salvando...">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        </div>
      )}

      {/* Won Badge */}
      {deal.isWon && (
        <div className="absolute -top-2 -right-2 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 p-1 rounded-full shadow-sm z-10" aria-label="Negocio ganho">
          <Trophy size={12} aria-hidden="true" />
        </div>
      )}

      {/* Lost Badge */}
      {deal.isLost && (
        <div className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 p-1 rounded-full shadow-sm z-10" aria-label={deal.lossReason ? `Perdido: ${deal.lossReason}` : 'Negocio perdido'}>
          <XCircle size={12} aria-hidden="true" />
        </div>
      )}

      {/* Rotting indicator */}
      {isRotting && !isClosed && (
        <div className="absolute -top-2 -right-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 p-1 rounded-full shadow-sm z-10" aria-label="Negocio estagnado, mais de 10 dias sem atualizacao">
          <Hourglass size={12} aria-hidden="true" />
        </div>
      )}

      {/* 3 Dots Menu Button — mobile-first: always visible; desktop: on hover */}
      {!deal.id.startsWith('temp-') && (
        <Button
          type="button"
          onClick={handleToggleMenu}
          aria-label="Menu de acoes"
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          className="absolute top-1 right-1 p-1 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted focus-visible-ring z-20"
        >
          <MoreHorizontal size={14} aria-hidden="true" />
        </Button>
      )}

      {/* Row 1: Avatar + Contact Name + Value */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
          {getInitials(deal.contactName || deal.title || 'SN')}
        </div>
        <span className="text-sm font-semibold text-foreground truncate flex-1">
          {deal.contactName || 'Sem Nome'}
        </span>
        <span className="text-xs font-semibold text-secondary-foreground dark:text-muted-foreground shrink-0 tabular-nums">
          {BRL_CURRENCY.format(deal.value)}
        </span>
        {!isClosed && (() => {
          const stageAge = formatStageAge(deal.lastStageChangeDate);
          if (!stageAge) return null;
          const days = parseInt(stageAge.replace(/\D/g, ''), 10);
          return (
            <span
              className={`text-[9px] font-medium shrink-0 ${days > 10 ? 'text-amber-500' : 'text-muted-foreground'}`}
              aria-label={`${stageAge} neste estagio`}
            >
              {stageAge}
            </span>
          );
        })()}
      </div>

      {/* Row 2: Product */}
      <ProductPicker
        deal={deal}
        productName={productName}
        productSearch={popovers.productSearch}
        onProductSearchChange={popovers.setProductSearch}
        productPickerOpen={popovers.productPickerOpen}
        onProductPickerOpenChange={popovers.handleProductPickerOpenChange}
        filteredProducts={popovers.filteredProducts}
        creatingProduct={popovers.creatingProduct}
        onCreateProduct={popovers.handleCreateProduct}
        onSelectProduct={popovers.handleSelectProduct}
      />

      {/* Row 3: Owner */}
      <OwnerPicker
        deal={deal}
        ownerSearch={popovers.ownerSearch}
        onOwnerSearchChange={popovers.setOwnerSearch}
        ownerPickerOpen={popovers.ownerPickerOpen}
        onOwnerPickerOpenChange={popovers.handleOwnerPickerOpenChange}
        filteredMembers={popovers.filteredMembers}
        onSelectOwner={popovers.handleSelectOwner}
      />

      {/* Row 3.5: Next Activity (conditional) */}
      {deal.nextActivity && (() => {
        const relDate = formatRelativeActivityDate(deal.nextActivity.date);
        const isOverdue = deal.nextActivity.isOverdue;
        const isToday = relDate === 'Hoje';
        const colorClass = isOverdue ? 'text-red-500' : isToday ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground';
        const ActivityIcon = deal.nextActivity.type === 'CALL' ? Phone : deal.nextActivity.type === 'EMAIL' ? Mail : deal.nextActivity.type === 'MEETING' ? Calendar : deal.nextActivity.type === 'WHATSAPP' ? MessageCircle : Mail;
        return (
          <div
            className={`flex items-center gap-1.5 text-xs ${colorClass}`}
            aria-label={`Proxima atividade: ${deal.nextActivity.type} ${relDate}`}
          >
            <ActivityIcon size={12} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{relDate}</span>
          </div>
        );
      })()}

      {/* Row 4: Tags + Date + Activity Icon */}
      <DealCardActions
        deal={deal}
        isClosed={isClosed}
        visibleTags={visibleTags}
        extraTagCount={extraTagCount}
        activityStatus={activityStatus}
        isMenuOpen={isMenuOpen}
        onToggleMenu={handleToggleMenu}
        onQuickAdd={handleQuickAdd}
        onRequestClose={() => setOpenMenuId(null)}
        onMoveToStage={onMoveToStage}
        onWinDeal={onWinDeal}
        onLoseDeal={onLoseDeal}
        onDeleteDeal={onDeleteDeal}
      />
    </div>
  );
};

/**
 * Performance: `DealCard` fica em lista grande (Kanban).
 * Usamos `React.memo` para evitar re-render de TODOS os cards quando apenas o menu de 1 deal muda.
 * Isso depende de props estaveis do pai (ex.: `onSelect` via useCallback e `isMenuOpen` por-card).
 */
export const DealCard = React.memo(DealCardComponent);
