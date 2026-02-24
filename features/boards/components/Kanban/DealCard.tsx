import React, { useState } from 'react';
import { DealView } from '@/types';
import { Hourglass, Trophy, XCircle, Calendar, Package } from 'lucide-react';
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

const activityTypeLabels: Record<string, string> = { CALL: 'Ligação', MEETING: 'Reunião', EMAIL: 'E-mail', TASK: 'Tarefa' };

const getActivityLabel = (nextActivity?: { type: string }) => {
  if (!nextActivity) return 'Sem atividades';
  return activityTypeLabels[nextActivity.type] || nextActivity.type;
};

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
}) => {
  const [localDragging, setLocalDragging] = useState(false);
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

  // Determine card styling based on won/lost status
  const getCardClasses = () => {
    const baseClasses = `
      p-3 rounded-lg border-l-4 border-y border-r
      shadow-sm cursor-grab active:cursor-grabbing group hover:shadow-md transition-all relative select-none
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

    // Default - open deal
    return `${baseClasses}
      border-slate-200 dark:border-slate-700/50
      ${localDragging || isDragging ? 'bg-green-100 dark:bg-green-900 opacity-50 rotate-2 scale-95' : 'bg-white dark:bg-slate-800 opacity-100'}
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

    // Tags (visible text) - include all shown tags
    const shownTags = deal.tags.slice(0, isClosed ? 1 : 2);
    if (shownTags.length > 0) {
      parts.push(...shownTags);
    }

    // Main content
    parts.push(deal.title);
    parts.push(`$${deal.value.toLocaleString()}`);

    // Additional context
    const priority = getPriorityLabel(deal.priority);
    if (priority) parts.push(priority);
    if (isRotting && !isClosed) parts.push('estagnado');

    if (isGrabbed) parts.push('segurado para mover');

    return parts.join(', ');
  };

  const productName = deal.items && deal.items.length > 0 ? deal.items[0].name : null;
  const customFieldCount = deal.customFields && typeof deal.customFields === 'object' ? Object.keys(deal.customFields).length : 0;
  const maxVisibleTags = 4;
  const visibleTags = deal.tags.slice(0, maxVisibleTags);
  const extraTagCount = deal.tags.length - maxVisibleTags;

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

      {/* Row 1: Avatar + Contact Name + #ID */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold shrink-0">
          {getInitials(deal.contactName || deal.title || 'SN')}
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white truncate flex-1">
          {deal.contactName || 'Sem Nome'}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          #{deal.id.slice(-5)}
        </span>
      </div>

      {/* Row 2: Product */}
      <div className="text-xs text-green-600 dark:text-green-400 mb-1.5 ml-9">
        {productName || 'Sem produto'}
      </div>

      {/* Row 3: Owner */}
      {deal.owner && deal.owner.name !== 'Sem Dono' && (
        <div className="flex items-center gap-2 mb-1 ml-9">
          <span className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 flex items-center justify-center text-[9px] font-bold shrink-0">
            {deal.owner.name.charAt(0).toUpperCase()}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {deal.owner.name}
          </span>
        </div>
      )}

      {/* Row 4: Value */}
      <div className="flex items-center gap-2 mb-1 ml-9">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          ${deal.value.toLocaleString()}
        </span>
      </div>

      {/* Row 5: Creation date */}
      <div className="flex items-center gap-2 mb-1 ml-9">
        <Calendar size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatDate(deal.createdAt)}
        </span>
      </div>

      {/* Row 6: Activity label */}
      <div className="flex items-center gap-2 mb-1 ml-9">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {getActivityLabel(deal.nextActivity)}
        </span>
      </div>

      {/* Row 7: Custom fields count */}
      {customFieldCount > 0 && (
        <div className="flex items-center gap-2 mb-2 ml-9">
          <Package size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {customFieldCount} campo{customFieldCount > 1 ? 's' : ''} adicional{customFieldCount > 1 ? 'is' : ''}
          </span>
        </div>
      )}

      {/* Row 8: Tags */}
      {deal.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
          {deal.isWon && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">
              GANHO
            </span>
          )}
          {deal.isLost && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
              PERDIDO
            </span>
          )}
          {visibleTags.map((tag, index) => (
            <span
              key={`${deal.id}-tag-${index}`}
              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5"
            >
              {tag}
            </span>
          ))}
          {extraTagCount > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 text-slate-400 dark:text-slate-500">
              +{extraTagCount}
            </span>
          )}
        </div>
      )}

      {/* Bottom-right: Activity status icon */}
      <div className="flex justify-end mt-1">
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
        />
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
