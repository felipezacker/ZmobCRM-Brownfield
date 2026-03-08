import React, { useId } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { Board } from '@/types';
import { FocusTrap, useFocusReturn } from '@/lib/a11y';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';

interface SelectBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (boardId: string) => void;
  boards: Board[];
  contactName: string;
}

/**
 * Componente React `SelectBoardModal`.
 *
 * @param {SelectBoardModalProps} {
  isOpen,
  onClose,
  onSelect,
  boards,
  contactName,
} - Parâmetro `{
  isOpen,
  onClose,
  onSelect,
  boards,
  contactName,
}`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export const SelectBoardModal: React.FC<SelectBoardModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  boards,
  contactName,
}) => {
  const headingId = useId();
  const descriptionId = useId();
  useFocusReturn({ enabled: isOpen });
  
  if (!isOpen) return null;

  return (
    <FocusTrap active={isOpen} onEscape={onClose}>
      <div 
        className={MODAL_OVERLAY_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        onClick={(e) => {
          // Close only when clicking the backdrop (outside the panel).
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 id={headingId} className="text-xl font-bold text-foreground">
                Criar Deal
              </h2>
              <p id={descriptionId} className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                Selecione o board para <strong>{contactName}</strong>
              </p>
            </div>
            <Button
              onClick={onClose}
              aria-label="Fechar modal"
              className="p-2 hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors focus-visible-ring"
            >
              <X size={20} className="text-muted-foreground" aria-hidden="true" />
            </Button>
          </div>

        {/* Board List */}
        <div className="p-4 max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {boards.map(board => (
              <Button
                key={board.id}
                onClick={() => onSelect(board.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center group-hover:bg-primary-200 dark:group-hover:bg-primary-500/30 transition-colors">
                  <LayoutGrid size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">
                    {board.name}
                  </p>
                  {board.description && (
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground truncate">
                      {board.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    {board.stages?.length || 0} estágios
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background dark:bg-white/5">
          <p className="text-xs text-muted-foreground dark:text-muted-foreground text-center">
            O deal será criado no primeiro estágio do board selecionado
          </p>
        </div>
        </div>
      </div>
    </FocusTrap>
  );
};
