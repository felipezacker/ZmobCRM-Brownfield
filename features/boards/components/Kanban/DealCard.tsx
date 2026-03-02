import React, { useMemo, useState } from 'react';
import { DealView, Product } from '@/types';
import type { OrgMember } from '@/hooks/useOrganizationMembers';
import { Hourglass, Search, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ActivityStatusIcon } from './ActivityStatusIcon';
import { priorityAriaLabelPtBr } from '@/lib/utils/priority';

interface DealCardProps {
  deal: DealView;
  isRotting: boolean;
  activityStatus: string;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string, title: string) => void;
  /** Callback de seleção do deal (mantido estável via useCallback no pai para permitir memoização) */
  onSelect: (dealId: string) => void;
  /**
   * Performance: boolean derivado por-card evita prop global mutável.
   * Isso reduz re-render em listas grandes quando o usuário abre/fecha o menu.
   */
  isMenuOpen: boolean;
  setOpenMenuId: (id: string | null) => void;
  onQuickAddActivity: (
    dealId: string,
    type: 'CALL' | 'MEETING' | 'EMAIL',
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

const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const [productSearch, setProductSearch] = useState('');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const isClosed = isDealClosed(deal);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(isMenuOpen ? null : deal.id);
  };

  const handleQuickAdd = (type: 'CALL' | 'MEETING' | 'EMAIL') => {
    onQuickAddActivity(deal.id, type, deal.title);
  };

  const handleDragStart = (e: React.DragEvent) => {
    setLocalDragging(true);
    e.dataTransfer.setData('dealId', deal.id);
    // Fallback mapping when optimistic temp id gets replaced mid-drag by a refetch.
    // Do not log title; it can contain PII.
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

    return `${baseClasses}
      border-slate-200 dark:border-white/5
      ${localDragging || isDragging ? 'bg-green-100 dark:bg-green-900 opacity-50 rotate-2 scale-95' : 'bg-white dark:bg-slate-800/80'}
      ${isRotting ? 'opacity-80 saturate-50 border-dashed' : ''}
    `;
  };

  // Get border-left color class based on status
  const getBorderLeftClass = () => {
    if (deal.isWon) return '!border-l-green-500';
    if (deal.isLost) return '!border-l-red-500';
    // Priority-based colors for open deals
    if (deal.priority === 'high') return '!border-l-red-500';
    if (deal.priority === 'medium') return '!border-l-amber-500';
    return '!border-l-blue-500';
  };

  // Build accessible label including visible text (tags)
  const getAriaLabel = () => {
    const parts: string[] = [];

    // Status badges (visible text)
    if (deal.isWon) parts.push('ganho');
    if (deal.isLost) parts.push('perdido');

    // Tags (visible text) - include all shown tags from contact
    const shownTags = (deal.contactTags || []).slice(0, isClosed ? 1 : 2);
    if (shownTags.length > 0) {
      parts.push(...shownTags);
    }

    // Main content
    parts.push(deal.title);
    parts.push(BRL_CURRENCY.format(deal.value));

    // Additional context
    const priority = getPriorityLabel(deal.priority);
    if (priority) parts.push(priority);
    if (isRotting && !isClosed) parts.push('estagnado');

    if (isGrabbed) parts.push('segurado para mover');

    return parts.join(', ');
  };

  const productName = deal.items && deal.items.length > 0 ? deal.items[0].name : null;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const filteredMembers = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q));
  }, [members, ownerSearch]);

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
        // Delegate Arrow keys, G, and Escape to the keyboard-move handler when provided
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
      aria-roledescription="cartão movível"
      aria-label={getAriaLabel()}
      className={`${getCardClasses()} ${getBorderLeftClass()}`}
    >
      {/* Won Badge */}
      {deal.isWon && (
        <div className="absolute -top-2 -right-2 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 p-1 rounded-full shadow-sm z-10" aria-label="Negócio ganho">
          <Trophy size={12} aria-hidden="true" />
        </div>
      )}

      {/* Lost Badge */}
      {deal.isLost && (
        <div className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 p-1 rounded-full shadow-sm z-10" aria-label={deal.lossReason ? `Perdido: ${deal.lossReason}` : 'Negócio perdido'}>
          <XCircle size={12} aria-hidden="true" />
        </div>
      )}

      {/* Rotting indicator */}
      {isRotting && !isClosed && (
        <div className="absolute -top-2 -right-2 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 p-1 rounded-full shadow-sm z-10" aria-label="Negócio estagnado, mais de 10 dias sem atualização">
          <Hourglass size={12} aria-hidden="true" />
        </div>
      )}

      {/* Row 1: Avatar + Contact Name + Value */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
          {getInitials(deal.contactName || deal.title || 'SN')}
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate flex-1">
          {deal.contactName || 'Sem Nome'}
        </span>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 tabular-nums">
          {BRL_CURRENCY.format(deal.value)}
        </span>
      </div>

      {/* Row 2: Product · Owner */}
      <div className="flex items-center gap-1 mt-1 ml-8 text-xs truncate">
        <Popover open={productPickerOpen} onOpenChange={(open) => { setProductPickerOpen(open); if (!open) setProductSearch(''); }}>
          <PopoverTrigger asChild>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={`truncate hover:underline cursor-pointer ${productName ? 'text-green-600 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}
            >
              {productName || 'Sem produto'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-56 p-0 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 dark:border-white/10">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar produto..."
                aria-label="Buscar produto"
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-200 outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-auto py-1">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={(e) => { e.stopPropagation(); onProductChange(deal.id, null); setProductPickerOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${!productName ? 'text-amber-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sem produto
              </Button>
              {filteredProducts.map((p) => (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  key={p.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onProductChange(deal.id, p); setProductPickerOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-2 ${deal.items?.[0]?.productId === p.id ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                    {BRL_CURRENCY.format(p.price)}
                  </span>
                </Button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">Nenhum produto encontrado</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <Popover open={ownerPickerOpen} onOpenChange={(open) => { setOwnerPickerOpen(open); if (!open) setOwnerSearch(''); }}>
          <PopoverTrigger asChild>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={`truncate hover:underline cursor-pointer ${
                deal.owner?.name && deal.owner.name !== 'Sem Dono'
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-amber-500 dark:text-amber-400'
              }`}
            >
              {deal.owner?.name && deal.owner.name !== 'Sem Dono' ? deal.owner.name : 'Sem dono'}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-56 p-0 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-2.5 py-2 border-b border-slate-100 dark:border-white/10">
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                placeholder="Buscar corretor..."
                aria-label="Buscar corretor"
                className="flex-1 bg-transparent text-xs text-slate-900 dark:text-slate-200 outline-none placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-auto py-1">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={(e) => { e.stopPropagation(); onOwnerChange(deal.id, null); setOwnerPickerOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${!deal.ownerId ? 'text-amber-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
              >
                Sem dono
              </Button>
              {filteredMembers.map((m) => (
                <Button
                  variant="unstyled"
                  size="unstyled"
                  key={m.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOwnerChange(deal.id, m); setOwnerPickerOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors ${deal.ownerId === m.id ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                >
                  {m.name}
                </Button>
              ))}
              {filteredMembers.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">Nenhum corretor encontrado</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 3: Tags + Date + Activity Icon */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <div className="flex gap-1 flex-1 min-w-0 items-center overflow-hidden">
          {deal.isWon && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300 shrink-0">GANHO</span>
          )}
          {deal.isLost && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 shrink-0">PERDIDO</span>
          )}
          {visibleTags.map((tag, index) => (
            <span key={`${deal.id}-tag-${index}`} className="text-[9px] font-medium px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 truncate max-w-[60px]">{tag}</span>
          ))}
          {extraTagCount > 0 && (
            <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">+{extraTagCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{formatDate(deal.createdAt)}</span>
          <ActivityStatusIcon
            status={activityStatus}
            type={deal.nextActivity?.type}
            dealId={deal.id}
            dealTitle={deal.title}
            isOpen={isMenuOpen}
            onToggle={handleToggleMenu}
            onQuickAdd={handleQuickAdd}
            onRequestClose={() => setOpenMenuId(null)}
            onMoveToStage={onMoveToStage ? () => onMoveToStage(deal.id) : undefined}
            onWinDeal={onWinDeal ? () => onWinDeal(deal.id) : undefined}
            onLoseDeal={onLoseDeal ? () => onLoseDeal(deal.id, deal.title) : undefined}
            onDeleteDeal={onDeleteDeal ? () => onDeleteDeal(deal.id) : undefined}
            isClosed={isClosed}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Performance: `DealCard` fica em lista grande (Kanban).
 * Usamos `React.memo` para evitar re-render de TODOS os cards quando apenas o menu de 1 deal muda.
 * Isso depende de props estáveis do pai (ex.: `onSelect` via useCallback e `isMenuOpen` por-card).
 */
export const DealCard = React.memo(DealCardComponent);
