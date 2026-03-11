import React, { useCallback, useId, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DealView, BoardStage } from '@/types';
import { DealCard } from './DealCard';
import { isDealRotting, getActivityStatus } from '@/features/boards/hooks/boardUtils';
import { MoveToStageModal } from '../Modals/MoveToStageModal';
import ConfirmModal from '@/components/ConfirmModal';
import { useKanbanKeyboard } from '@/features/boards/hooks/useKanbanKeyboard';

import { useSettings } from '@/context/settings/SettingsContext';
import { useAddDealItem, useRemoveDealItem, useUpdateDeal } from '@/lib/query/hooks/useDealsQuery';
import { useOrganizationMembers, type OrgMember } from '@/hooks/useOrganizationMembers';
import type { Product } from '@/types';

// Performance: reuse currency formatter instance (same pattern as DealCard.tsx:62).
const BRL_CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * UI: Drop highlight should follow the stage color.
 *
 * Note on Tailwind: stage colors come from persisted values like `bg-blue-500`.
 * Tailwind only generates classes it can “see” in source, so we map to a finite set
 * of explicit `border-<color>-500`, `bg-<color>-100/20`, and `shadow-<color>-500/30` classes here.
 */
function dropHighlightClasses(stageBgClass?: string): string {
  const c = (stageBgClass ?? '').toLowerCase();

  if (c.includes('blue') || c.includes('sky') || c.includes('cyan')) {
    return 'border-blue-500 bg-blue-100/20 dark:bg-blue-900/30 shadow-xl shadow-blue-500/30';
  }
  if (c.includes('green') || c.includes('emerald')) {
    return 'border-emerald-500 bg-emerald-100/20 dark:bg-emerald-900/30 shadow-xl shadow-emerald-500/30';
  }
  if (c.includes('yellow') || c.includes('amber')) {
    return 'border-amber-500 bg-amber-100/20 dark:bg-amber-900/30 shadow-xl shadow-amber-500/30';
  }
  if (c.includes('orange')) {
    return 'border-orange-500 bg-orange-100/20 dark:bg-orange-900/30 shadow-xl shadow-orange-500/30';
  }
  if (c.includes('red')) {
    return 'border-red-500 bg-red-100/20 dark:bg-red-900/30 shadow-xl shadow-red-500/30';
  }
  if (c.includes('violet') || c.includes('purple')) {
    return 'border-violet-500 bg-violet-100/20 dark:bg-violet-900/30 shadow-xl shadow-violet-500/30';
  }
  if (c.includes('pink') || c.includes('rose')) {
    return 'border-pink-500 bg-pink-100/20 dark:bg-pink-900/30 shadow-xl shadow-pink-500/30';
  }
  if (c.includes('indigo')) {
    return 'border-indigo-500 bg-indigo-100/20 dark:bg-indigo-900/30 shadow-xl shadow-indigo-500/30';
  }
  if (c.includes('teal')) {
    return 'border-teal-500 bg-teal-100/20 dark:bg-teal-900/30 shadow-xl shadow-teal-500/30';
  }

  // Fallback: keep existing behavior-ish (green).
  return 'border-emerald-500 bg-emerald-100/20 dark:bg-emerald-900/30 shadow-xl shadow-emerald-500/30';
}

interface KanbanBoardProps {
  stages: BoardStage[];
  filteredDeals: DealView[];
  draggingId: string | null;
  handleDragStart: (e: React.DragEvent, id: string, title: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, stageId: string) => void;
  setSelectedDealId: (id: string | null) => void;
  openActivityMenuId: string | null;
  setOpenActivityMenuId: (id: string | null) => void;
  handleQuickAddActivity: (
    dealId: string,
    type: 'CALL' | 'MEETING' | 'EMAIL' | 'WHATSAPP',
    dealTitle: string
  ) => void;
  setLastMouseDownDealId: (id: string | null) => void;
  /** Callback to move a deal to a new stage (for keyboard accessibility) */
  onMoveDealToStage?: (dealId: string, newStageId: string) => void;
  /** Quick action: mark deal as won */
  onWinDeal?: (dealId: string) => void;
  /** Quick action: mark deal as lost (opens loss reason modal) */
  onLoseDeal?: (dealId: string, dealTitle: string) => void;
  /** Quick action: delete deal */
  onDeleteDeal?: (dealId: string) => void;
  /** ID do estágio de ganho (para ocultar botão +) */
  wonStageId?: string;
  /** ID do estágio de perda (para ocultar botão +) */
  lostStageId?: string;
  /** Callback para criar negócio nesta coluna específica */
  onAddDealToStage?: (stageId: string) => void;
}
/** Kanban board with drag-and-drop, quick actions (win/lose/delete), and keyboard accessibility. */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  filteredDeals,
  draggingId,
  handleDragStart,
  handleDragOver,
  handleDrop,
  setSelectedDealId,
  openActivityMenuId,
  setOpenActivityMenuId,
  handleQuickAddActivity,
  setLastMouseDownDealId,
  onMoveDealToStage,
  onWinDeal,
  onLoseDeal,
  onDeleteDeal,
  wonStageId,
  lostStageId,
  onAddDealToStage,
}) => {
  const { lifecycleStages, products } = useSettings();
  const addItem = useAddDealItem();
  const removeItem = useRemoveDealItem();
  const updateDeal = useUpdateDeal();
  const { members } = useOrganizationMembers();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const instructionsId = useId();

  // Keyboard accessibility hook for grab-and-move with Arrow keys
  const { grabbedDealId, announcement, handleCardKeyDown } = useKanbanKeyboard();

  // State for move-to-stage modal (keyboard accessibility alternative to drag-and-drop)
  const [moveToStageModal, setMoveToStageModal] = useState<{
    isOpen: boolean;
    deal: DealView;
    currentStageId: string;
  } | null>(null);

  // State for delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ dealId: string; dealTitle: string } | null>(null);

  /**
   * Performance: o Kanban renderiza listas grandes. Evitamos padrões O(S*N) no render:
   * - Antes: para cada stage, fazia `filteredDeals.filter(...)` + `reduce(...)`.
   * - Agora: agrupamos 1 vez (O(N)) e só lemos por stage (O(S)).
   */
  const dealsByStageId = useMemo(() => {
    const map = new Map<string, DealView[]>();
    const totals = new Map<string, number>();
    for (const deal of filteredDeals) {
      const list = map.get(deal.status);
      if (list) list.push(deal);
      else map.set(deal.status, [deal]);

      totals.set(deal.status, (totals.get(deal.status) ?? 0) + (deal.value ?? 0));
    }
    return { map, totals };
  }, [filteredDeals]);

  // Performance: evita `find` por stage (O(S*L)). Map é O(1) por lookup.
  const lifecycleStageNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ls of lifecycleStages ?? []) {
      if (ls?.id && ls?.name) map.set(ls.id, ls.name);
    }
    return map;
  }, [lifecycleStages]);

  // Performance: index deals by id once so callbacks can stay stable across menu toggles.
  const dealsById = useMemo(() => new Map(filteredDeals.map((d) => [d.id, d])), [filteredDeals]);

  // Performance: keep selection callback stable so DealCard can be memoized.
  const handleSelectDeal = useCallback(
    (dealId: string) => {
      setSelectedDealId(dealId);
    },
    [setSelectedDealId]
  );

  // Performance: stable keyboard handler map keyed by deal.id to avoid inline arrows defeating React.memo
  const keyboardHandlers = useMemo(() => {
    const map = new Map<string, (e: React.KeyboardEvent) => void>();
    for (const stage of stages) {
      const stageDeals = dealsByStageId.map.get(stage.id) ?? [];
      for (const deal of stageDeals) {
        map.set(deal.id, (e: React.KeyboardEvent) =>
          handleCardKeyDown(e, deal, stage.id, stages, dealsByStageId.map, onMoveDealToStage, handleSelectDeal)
        );
      }
    }
    return map;
  }, [stages, dealsByStageId.map, handleCardKeyDown, onMoveDealToStage, handleSelectDeal]);

  // Handler to open move-to-stage modal (stable across re-renders when only menu state changes)
  const handleOpenMoveToStage = useCallback(
    (dealId: string) => {
      const deal = dealsById.get(dealId);
      if (deal) {
        setMoveToStageModal({
          isOpen: true,
          deal,
          currentStageId: deal.status,
        });
      }
    },
    [dealsById]
  );

  // Handler to confirm move to a new stage
  const handleConfirmMoveToStage = (dealId: string, newStageId: string) => {
    if (onMoveDealToStage) {
      onMoveDealToStage(dealId, newStageId);
    }
    setMoveToStageModal(null);
  };

  const handleProductChange = useCallback(
    async (dealId: string, product: Product | null) => {
      const deal = dealsById.get(dealId);
      if (!deal) return;

      // Remove all existing items
      if (deal.items?.length) {
        for (const item of deal.items) {
          await removeItem.mutateAsync({ dealId, itemId: item.id });
        }
      }

      // Add new product if selected
      if (product) {
        await addItem.mutateAsync({
          dealId,
          item: { productId: product.id, name: product.name, quantity: 1, price: product.price },
        });
      }
    },
    [dealsById, addItem, removeItem]
  );

  const handleOwnerChange = useCallback(
    (dealId: string, member: OrgMember | null) => {
      updateDeal.mutate({
        id: dealId,
        updates: {
          ownerId: member?.id ?? '',
          owner: member
            ? { name: member.name, avatar: member.avatar_url || '' }
            : { name: 'Sem Dono', avatar: '' },
        },
      });
    },
    [updateDeal]
  );

  // Wrapper: open confirm modal before deleting
  const handleDeleteWithConfirm = useCallback(
    (dealId: string) => {
      const deal = dealsById.get(dealId);
      setDeleteConfirm({ dealId, dealTitle: deal?.title || deal?.contactName || 'este negócio' });
    },
    [dealsById]
  );

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-2 w-full">
      {/* Visually hidden keyboard instructions */}
      <p id={instructionsId} className="sr-only">
        Pressione G para segurar um cartão. Use as setas esquerda e direita para mover entre colunas. Pressione G novamente para soltar ou Escape para cancelar.
      </p>

      {/* ARIA live region for move announcements */}
      <div
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {stages.map(stage => {
        const stageDeals = dealsByStageId.map.get(stage.id) ?? [];
        const stageValue = dealsByStageId.totals.get(stage.id) ?? 0;
        const isOver = dragOverStage === stage.id && draggingId !== null;

        // Resolve linked stage name
        const linkedStageName =
          stage.linkedLifecycleStage
            ? lifecycleStageNameById.get(stage.linkedLifecycleStage) ?? null
            : null;

        return (
          <div
            key={stage.id}
            onDragOver={(e) => {
              handleDragOver(e);
              setDragOverStage(stage.id);
            }}
            onDrop={(e) => {
              handleDrop(e, stage.id);
              setDragOverStage(null);
            }}
            onDragEnter={() => setDragOverStage(stage.id)}
            onDragLeave={() => setDragOverStage(null)}
            className={`group/col min-w-[20rem] flex-1 flex flex-col rounded-xl border-2 overflow-visible h-full max-h-full transition-all duration-200
                            ${isOver
                ? `${dropHighlightClasses(stage.color)} scale-[1.02]`
                : 'border-border/50  glass'
              }
                        `}
          >
            <div className={`h-1.5 w-full ${stage.color}`}></div>

            <div
              className={`p-3 border-b border-border  bg-background/50 dark:bg-white/5 shrink-0`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-secondary-foreground dark:text-muted-foreground font-display text-sm tracking-wide uppercase">
                  {stage.label}
                </span>
                <div className="flex items-center gap-1">
                  {onAddDealToStage && stage.id !== wonStageId && stage.id !== lostStageId && (
                    <Button
                      type="button"
                      onClick={() => onAddDealToStage(stage.id)}
                      title={`Novo negócio em ${stage.label}`}
                      className="opacity-100 md:opacity-0 md:group-hover/col:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                    >
                      <Plus size={14} />
                    </Button>
                  )}
                  <span className="text-xs font-bold bg-white dark:bg-card border border-border dark:border-border px-2 py-0.5 rounded text-secondary-foreground dark:text-muted-foreground">
                    {stageDeals.length}
                  </span>
                </div>
              </div>

              {/* Automation Indicator - Always rendered for consistent height */}
              <div className="mb-2 flex items-center gap-1.5 min-h-[22px]">
                {linkedStageName ? (
                  <span className="text-[10px] uppercase font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded border border-primary-100 dark:border-primary-800/50 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary-500 animate-pulse"></span>
                    Promove para: {linkedStageName}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 opacity-0 select-none">
                    Placeholder
                  </span>
                )}
              </div>

              <div className="text-xs text-muted-foreground dark:text-muted-foreground font-medium text-right">
                Total:{' '}
                <span className="text-foreground font-mono">
                  {BRL_CURRENCY.format(stageValue)}
                </span>
              </div>
            </div>

            <div
              role="group"
              aria-label={`Coluna ${stage.label}, ${stageDeals.length} negócio${stageDeals.length !== 1 ? 's' : ''}`}
              aria-describedby={instructionsId}
              className={`flex-1 p-2 overflow-y-auto space-y-2 bg-muted/50 dark:bg-black/20 scrollbar-thin min-h-[100px]`}
            >
              {stageDeals.length === 0 && !draggingId && (
                <div className="h-full flex items-center justify-center text-muted-foreground dark:text-secondary-foreground text-sm py-8">
                  Sem negócios
                </div>
              )}
              {isOver && stageDeals.length === 0 && (
                <div className="h-full flex items-center justify-center text-green-500 dark:text-green-400 text-sm py-8 font-bold animate-pulse pointer-events-none">
                  ✓ Solte aqui!
                </div>
              )}
              {stageDeals.map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isRotting={
                    isDealRotting(deal) &&
                    !deal.isWon &&
                    !deal.isLost
                  }
                  activityStatus={getActivityStatus(deal)}
                  isDragging={draggingId === deal.id}
                  onDragStart={handleDragStart}
                  onSelect={handleSelectDeal}
                  // Performance: avoid passing openMenuId (string) to all cards.
                  // Only 1–2 cards will flip `isMenuOpen` when the menu is toggled.
                  isMenuOpen={openActivityMenuId === deal.id}
                  setOpenMenuId={setOpenActivityMenuId}
                  onQuickAddActivity={handleQuickAddActivity}
                  setLastMouseDownDealId={setLastMouseDownDealId}
                  onMoveToStage={onMoveDealToStage ? handleOpenMoveToStage : undefined}
                  isGrabbed={grabbedDealId === deal.id}
                  onKeyboardMove={keyboardHandlers.get(deal.id)}
                  products={products}
                  onProductChange={handleProductChange}
                  members={members}
                  onOwnerChange={handleOwnerChange}
                  onWinDeal={onWinDeal}
                  onLoseDeal={onLoseDeal}
                  onDeleteDeal={onDeleteDeal ? handleDeleteWithConfirm : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
      
      {/* Keyboard-accessible modal for moving deals between stages */}
      {moveToStageModal && (
        <MoveToStageModal
          isOpen={moveToStageModal.isOpen}
          onClose={() => setMoveToStageModal(null)}
          onMove={handleConfirmMoveToStage}
          deal={moveToStageModal.deal}
          stages={stages}
          currentStageId={moveToStageModal.currentStageId}
        />
      )}

      {/* Confirm delete modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm && onDeleteDeal) {
            onDeleteDeal(deleteConfirm.dealId);
          }
        }}
        title="Excluir negócio"
        message={<>Tem certeza que deseja excluir <strong>{deleteConfirm?.dealTitle}</strong>? Esta ação não pode ser desfeita.</>}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};
