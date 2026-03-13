import React from 'react';
import { Sparkles, LayoutTemplate, Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SelectBrowseFocus } from '@/features/boards/components/board-wizard/types';

interface SelectHomeStepProps {
  onGoToAI: () => void;
  onBrowse: (focus: SelectBrowseFocus, tab: 'official' | 'community') => void;
  onStartFromScratch: () => void;
}

export const SelectHomeStep: React.FC<SelectHomeStepProps> = ({
  onGoToAI,
  onBrowse,
  onStartFromScratch,
}) => {
  return (
    <div className="mx-auto w-full">
      <h3 className="text-base font-bold text-foreground text-center">
        Como voce quer comecar?
      </h3>
      <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground text-center">
        Escolha um caminho. O resto aparece depois.
      </p>

      {/* Primary CTA: AI */}
      <Button
        variant="unstyled"
        size="unstyled"
        onClick={onGoToAI}
        className="mt-4 w-full relative overflow-hidden p-1 rounded-2xl group transition-all hover:shadow-lg hover:shadow-primary-500/20"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-95 group-hover:opacity-100 transition-opacity" />
        <div className="relative bg-white dark:bg-card rounded-[14px] px-4 py-3 flex items-center gap-3 transition-colors group-hover:bg-opacity-90 dark:group-hover:bg-opacity-90">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400">
              Criar com IA
            </span>
            <span className="text-1xs text-muted-foreground dark:text-muted-foreground">
              Em 1 frase, eu monto o board pra voce.
            </span>
          </div>
        </div>
      </Button>

      {/* Compact chooser list */}
      <div className="mt-3 space-y-2">
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={() => onBrowse('playbooks', 'official')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-white dark:bg-dark-card hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
              <LayoutTemplate className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">
                Usar um playbook (recomendado)
              </div>
              <div className="text-1xs text-muted-foreground dark:text-muted-foreground">
                Jornada completa pronta para usar.
              </div>
            </div>
          </div>
        </Button>

        <Button
          variant="unstyled"
          size="unstyled"
          onClick={() => onBrowse('templates', 'official')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-white dark:bg-dark-card hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted dark:bg-white/5 flex items-center justify-center">
              <Settings className="w-4 h-4 text-secondary-foreground dark:text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">
                Usar template individual
              </div>
              <div className="text-1xs text-muted-foreground dark:text-muted-foreground">
                Um board pronto (Pre-venda, Vendas, CS...).
              </div>
            </div>
          </div>
        </Button>

        <Button
          variant="unstyled"
          size="unstyled"
          onClick={onStartFromScratch}
          className="w-full px-4 py-3 rounded-xl border border-border bg-white dark:bg-dark-card hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted dark:bg-white/5 flex items-center justify-center">
              <Plus className="w-4 h-4 text-secondary-foreground dark:text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">Comecar do zero</div>
              <div className="text-1xs text-muted-foreground dark:text-muted-foreground">
                Um board em branco.
              </div>
            </div>
          </div>
        </Button>
      </div>

      <div className="mt-3 text-center">
        <Button
          variant="unstyled"
          size="unstyled"
          onClick={() => onBrowse('community', 'community')}
          className="text-xs font-medium text-muted-foreground dark:text-muted-foreground hover:text-secondary-foreground dark:hover:text-muted-foreground transition-colors"
        >
          Ver templates da comunidade &rarr;
        </Button>
      </div>
    </div>
  );
};
