import React, { useMemo, useState } from 'react';
import { DealView, Product } from '@/types';
import type { OrgMember } from '@/hooks/useOrganizationMembers';
import { Check, Hourglass, Loader2, Plus, Search, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { productsService } from '@/lib/supabase/products';
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
  const [creatingProduct, setCreatingProduct] = useState(false);
  const isClosed = isDealClosed(deal);

  const handleCreateProduct = async () => {
    if (!productSearch.trim() || creatingProduct) return;
    setCreatingProduct(true);
    try {
      const { data: newProduct, error } = await productsService.create({
        name: productSearch.trim(),
        price: 0,
      });
      if (error || !newProduct) {
        console.error('Falha ao criar produto:', error);
        return;
      }
      window.dispatchEvent(new CustomEvent('crm:products-updated'));
      onProductChange(deal.id, newProduct);
      setProductPickerOpen(false);
      setProductSearch('');
    } finally {
      setCreatingProduct(false);
    }
  };

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

    // Cards com ID temporário (ainda salvando) ficam levemente opacos e sem cursor de drag
    if (deal.id.startsWith('temp-')) {
      return `${baseClasses}
        border-slate-200 dark:border-white/5
        bg-white dark:bg-slate-800/80
        opacity-60 cursor-default pointer-events-none
      `;
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
      {/* Saving Badge — card ainda com ID temporário */}
      {deal.id.startsWith('temp-') && (
        <div className="absolute -top-2 -right-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 p-1 rounded-full shadow-sm z-10" aria-label="Salvando...">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        </div>
      )}

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

      {/* Row 2: Product */}
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
                productSearch.trim() ? (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    disabled={creatingProduct}
                    onClick={(e) => { e.stopPropagation(); handleCreateProduct(); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-primary-500 dark:text-primary-400 flex items-center gap-1.5"
                  >
                    {creatingProduct ? <Loader2 className="h-3 w-3 animate-spin shrink-0" /> : <Plus className="h-3 w-3 shrink-0" />}
                    <span className="truncate">Criar &quot;{productSearch.trim()}&quot;</span>
                  </Button>
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">Nenhum produto encontrado</div>
                )
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 3: Owner */}
      <div className="flex items-center mt-1 ml-1 text-xs">
        <Popover open={ownerPickerOpen} onOpenChange={(open) => { setOwnerPickerOpen(open); if (!open) setOwnerSearch(''); }}>
          <PopoverTrigger asChild>
            <Button
              variant="unstyled"
              size="unstyled"
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 truncate cursor-pointer group/owner"
            >
              {deal.owner?.name && deal.owner.name !== 'Sem Dono' ? (
                <>
                  <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[8px] font-bold shrink-0 ring-1 ring-blue-200/50 dark:ring-blue-700/30">
                    {getInitials(deal.owner.name)}
                  </span>
                  <span className="truncate text-slate-500 dark:text-slate-400 group-hover/owner:text-slate-800 dark:group-hover/owner:text-slate-200 transition-colors">
                    {deal.owner.name}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center text-[8px] shrink-0">
                    ?
                  </span>
                  <span className="text-amber-500 dark:text-amber-400 group-hover/owner:text-amber-600 dark:group-hover/owner:text-amber-300 transition-colors">
                    Sem dono
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-60 p-0 border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 rounded-lg shadow-xl"
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
            <div className="max-h-52 overflow-auto py-1">
              <Button
                variant="unstyled"
                size="unstyled"
                type="button"
                onClick={(e) => { e.stopPropagation(); onOwnerChange(deal.id, null); setOwnerPickerOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${!deal.ownerId ? 'bg-slate-50 dark:bg-white/5' : ''}`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center text-[9px] shrink-0">
                  —
                </span>
                <span className={`flex-1 ${!deal.ownerId ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                  Sem dono
                </span>
                {!deal.ownerId && <Check className="h-3 w-3 text-amber-500 shrink-0" />}
              </Button>
              {filteredMembers.map((m) => {
                const isSelected = deal.ownerId === m.id;
                return (
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    key={m.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOwnerChange(deal.id, m); setOwnerPickerOpen(false); }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isSelected
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 ring-1 ring-blue-300/50 dark:ring-blue-600/30'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      }`}>
                      {getInitials(m.name)}
                    </span>
                    <span className={`flex-1 truncate ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-700 dark:text-slate-300'}`}>
                      {m.name}
                    </span>
                    <span className={`text-[9px] px-1 py-0.5 rounded ${m.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400' :
                        m.role === 'diretor' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500 dark:text-sky-400' :
                          'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500'
                      }`}>
                      {m.role}
                    </span>
                    {isSelected && <Check className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />}
                  </Button>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="px-3 py-3 text-xs text-slate-400 text-center">Nenhum corretor encontrado</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 4: Tags + Date + Activity Icon */}
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
