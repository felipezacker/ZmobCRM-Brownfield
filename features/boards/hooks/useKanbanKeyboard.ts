import { useCallback, useRef, useState } from 'react';
import { DealView, BoardStage } from '@/types';

export interface KanbanKeyboardState {
  grabbedDealId: string | null;
  announce: string;
}

export interface UseKanbanKeyboardReturn {
  grabbedDealId: string | null;
  announcement: string;
  handleCardKeyDown: (
    e: React.KeyboardEvent,
    deal: DealView,
    stageId: string,
    stages: BoardStage[],
    dealsByStageId: Map<string, DealView[]>,
    onMoveDealToStage?: (dealId: string, newStageId: string) => void,
    onSelect?: (dealId: string) => void
  ) => void;
  clearAnnouncement: () => void;
}

/**
 * useKanbanKeyboard — manages keyboard-driven card movement in the Kanban board.
 *
 * Keyboard shortcuts:
 *   Space / Enter  : pick up or drop the focused card
 *   ArrowLeft      : move card to the previous column (adjacent stage)
 *   ArrowRight     : move card to the next column (adjacent stage)
 *   ArrowUp        : move card one position up within its column (reorder)
 *   ArrowDown      : move card one position down within its column (reorder)
 *   Escape         : cancel grab mode
 */
export function useKanbanKeyboard(): UseKanbanKeyboardReturn {
  const [grabbedDealId, setGrabbedDealId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  // Keep a ref so event handlers always see the latest value without stale closures
  const grabbedRef = useRef<string | null>(null);

  const announce = useCallback((msg: string) => {
    setAnnouncement('');
    // Double RAF to force the live-region to re-read even if same text is repeated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnnouncement(msg);
      });
    });
  }, []);

  const clearAnnouncement = useCallback(() => setAnnouncement(''), []);

  const handleCardKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      deal: DealView,
      stageId: string,
      stages: BoardStage[],
      dealsByStageId: Map<string, DealView[]>,
      onMoveDealToStage?: (dealId: string, newStageId: string) => void,
      onSelect?: (dealId: string) => void
    ) => {
      const isGrabbed = grabbedRef.current === deal.id;
      const stageIndex = stages.findIndex(s => s.id === stageId);
      const stageDeals = dealsByStageId.get(stageId) ?? [];
      const cardIndex = stageDeals.findIndex(d => d.id === deal.id);
      const currentStageLabel = stages[stageIndex]?.label ?? stageId;

      switch (e.key) {
        case ' ':
        case 'Enter': {
          // If a different card is grabbed, drop it here; otherwise toggle grab on this card
          if (grabbedRef.current && grabbedRef.current !== deal.id) {
            // Ignore – only the grabbed card itself should handle drop
            break;
          }
          e.preventDefault();
          // If this card is currently grabbed → drop it
          if (isGrabbed) {
            grabbedRef.current = null;
            setGrabbedDealId(null);
            announce(
              `Negócio "${deal.title}" solto em "${currentStageLabel}". Posição ${cardIndex + 1} de ${stageDeals.length}.`
            );
          } else {
            // Check if the target is a button inside the card; let it bubble naturally
            if ((e.target as HTMLElement).closest('button')) break;
            // Open detail view (same as click) when not in grab mode
            onSelect?.(deal.id);
          }
          break;
        }

        case 'g':
        case 'G': {
          // Press "g" to grab / release without selecting (alternative to Space)
          e.preventDefault();
          if (isGrabbed) {
            grabbedRef.current = null;
            setGrabbedDealId(null);
            announce(
              `Negócio "${deal.title}" solto em "${currentStageLabel}". Posição ${cardIndex + 1} de ${stageDeals.length}.`
            );
          } else {
            grabbedRef.current = deal.id;
            setGrabbedDealId(deal.id);
            announce(
              `Negócio "${deal.title}" selecionado em "${currentStageLabel}". Posição ${cardIndex + 1} de ${stageDeals.length}. Use as setas para mover. Pressione G para soltar ou Escape para cancelar.`
            );
          }
          break;
        }

        case 'ArrowLeft': {
          if (!isGrabbed) break;
          e.preventDefault();
          if (!onMoveDealToStage) {
            announce('Mover entre colunas não está disponível.');
            break;
          }
          if (stageIndex <= 0) {
            announce(`"${deal.title}" já está na primeira coluna.`);
            break;
          }
          const targetStage = stages[stageIndex - 1];
          const targetDeals = dealsByStageId.get(targetStage.id) ?? [];
          onMoveDealToStage(deal.id, targetStage.id);
          announce(
            `Negócio "${deal.title}" movido para "${targetStage.label}". Posição ${targetDeals.length + 1} de ${targetDeals.length + 1}.`
          );
          break;
        }

        case 'ArrowRight': {
          if (!isGrabbed) break;
          e.preventDefault();
          if (!onMoveDealToStage) {
            announce('Mover entre colunas não está disponível.');
            break;
          }
          if (stageIndex >= stages.length - 1) {
            announce(`"${deal.title}" já está na última coluna.`);
            break;
          }
          const targetStage = stages[stageIndex + 1];
          const targetDeals = dealsByStageId.get(targetStage.id) ?? [];
          onMoveDealToStage(deal.id, targetStage.id);
          announce(
            `Negócio "${deal.title}" movido para "${targetStage.label}". Posição ${targetDeals.length + 1} de ${targetDeals.length + 1}.`
          );
          break;
        }

        case 'ArrowUp': {
          if (!isGrabbed) break;
          e.preventDefault();
          if (cardIndex <= 0) {
            announce(`"${deal.title}" já está na primeira posição de "${currentStageLabel}".`);
            break;
          }
          // Visual reorder within column is an optimistic UI concern;
          // we announce the intent and allow parent to handle if needed.
          announce(`Reordenação dentro da coluna ainda não disponível.`);
          break;
        }

        case 'ArrowDown': {
          if (!isGrabbed) break;
          e.preventDefault();
          if (cardIndex >= stageDeals.length - 1) {
            announce(`"${deal.title}" já está na última posição de "${currentStageLabel}".`);
            break;
          }
          announce(`Reordenação dentro da coluna ainda não disponível.`);
          break;
        }

        case 'Escape': {
          if (!isGrabbed) break;
          e.preventDefault();
          grabbedRef.current = null;
          setGrabbedDealId(null);
          announce(`Movimento cancelado. Negócio "${deal.title}" permanece em "${currentStageLabel}".`);
          break;
        }

        default:
          break;
      }
    },
    [announce]
  );

  return { grabbedDealId, announcement, handleCardKeyDown, clearAnnouncement };
}
