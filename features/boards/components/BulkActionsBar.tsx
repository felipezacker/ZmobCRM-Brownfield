import React from 'react';
import { Trash2, ArrowRightCircle, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_STAGE_COLOR } from '@/lib/constants/chart-colors';
import { BoardStage } from '@/types';

interface BulkActionsBarProps {
  selectedDealIds: Set<string>;
  clearDealSelection: () => void;
  stages: BoardStage[];
  handleBulkMoveDealToStage: (targetStageId: string) => void;
  isBulkMoveOpen: boolean;
  setIsBulkMoveOpen: (open: boolean) => void;
  bulkMoveRef: React.RefObject<HTMLDivElement | null>;
  setIsBulkDeleteOpen: (open: boolean) => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedDealIds,
  clearDealSelection,
  stages,
  handleBulkMoveDealToStage,
  isBulkMoveOpen,
  setIsBulkMoveOpen,
  bulkMoveRef,
  setIsBulkDeleteOpen,
}) => (
  <>
    {/* Spacer to prevent content from being hidden behind fixed bar */}
    <div className="h-16" />
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-card border-t border-border shadow-lg px-6 py-3">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-secondary-foreground dark:text-muted-foreground">
            {selectedDealIds.size} negocio{selectedDealIds.size !== 1 ? 's' : ''} selecionado{selectedDealIds.size !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={clearDealSelection}
            className="text-xs text-muted-foreground hover:text-secondary-foreground dark:text-muted-foreground dark:hover:text-muted-foreground flex items-center gap-1"
          >
            <X size={14} /> Limpar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Move to stage dropdown */}
          <div className="relative" ref={bulkMoveRef}>
            <Button
              onClick={() => setIsBulkMoveOpen(!isBulkMoveOpen)}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border bg-white dark:bg-card hover:bg-background dark:hover:bg-accent text-secondary-foreground dark:text-muted-foreground flex items-center gap-2 transition-colors"
            >
              <ArrowRightCircle size={16} />
              Mover para Estagio
              <ChevronDown size={14} className={`transition-transform ${isBulkMoveOpen ? 'rotate-180' : ''}`} />
            </Button>
            {isBulkMoveOpen && (
              <div className="absolute bottom-full mb-1 right-0 min-w-[200px] rounded-lg border border-border bg-white dark:bg-card shadow-lg py-1 z-50">
                {stages.map(stage => (
                  <Button
                    key={stage.id}
                    variant="ghost"
                    onClick={() => {
                      handleBulkMoveDealToStage(stage.id);
                      setIsBulkMoveOpen(false);
                    }}
                    className="w-full justify-start px-3 py-2 text-sm hover:bg-background dark:hover:bg-white/5 flex items-center gap-2 transition-colors h-auto rounded-none"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color || DEFAULT_STAGE_COLOR }}
                    />
                    <span className="text-secondary-foreground dark:text-muted-foreground">{stage.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Delete button */}
          <Button
            onClick={() => setIsBulkDeleteOpen(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Excluir
          </Button>
        </div>
      </div>
    </div>
  </>
);
