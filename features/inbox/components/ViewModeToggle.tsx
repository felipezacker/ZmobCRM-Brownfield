import React from 'react';
import { LayoutDashboard, List, Target } from 'lucide-react';
import { ViewMode } from '../hooks/useInboxController';
import { Button } from '@/components/ui/button';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/**
 * Componente React `ViewModeToggle`.
 *
 * @param {ViewModeToggleProps} { mode, onChange } - Parâmetro `{ mode, onChange }`.
 * @returns {Element} Retorna um valor do tipo `Element`.
 */
export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="inline-flex items-center bg-muted dark:bg-white/5 rounded-lg p-1 border border-border" role="group" aria-label="Modo de visualização">
      <Button
        onClick={() => onChange('overview')}
        aria-pressed={mode === 'overview'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'overview'
            ? 'bg-white dark:bg-dark-card text-foreground  shadow-sm'
            : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
          }`}
      >
        <LayoutDashboard size={16} aria-hidden="true" />
        Visão Geral
      </Button>
      <Button
        onClick={() => onChange('list')}
        aria-pressed={mode === 'list'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'list'
            ? 'bg-white dark:bg-dark-card text-foreground  shadow-sm'
            : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
          }`}
      >
        <List size={16} aria-hidden="true" />
        Lista
      </Button>
      <Button
        onClick={() => onChange('focus')}
        aria-pressed={mode === 'focus'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'focus'
            ? 'bg-white dark:bg-dark-card text-foreground  shadow-sm'
            : 'text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground'
          }`}
      >
        <Target size={16} aria-hidden="true" />
        Foco
      </Button>
    </div>
  );
};
