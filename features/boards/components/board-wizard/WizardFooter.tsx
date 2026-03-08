import React from 'react';
import { Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardStep } from '@/features/boards/components/board-wizard/types';

interface WizardFooterProps {
  step: WizardStep;
  selectedPlaybookId: string | null;
  aiInput: string;
  isGenerating: boolean;
  isChatMode: boolean;
  onGoBackToSelect: () => void;
  onGoBackToAIInput: () => void;
  onAIGenerate: () => void;
  onStartChatMode: () => void;
  onCreateFromAI: () => void;
  onInstallOfficialJourney: (id: string) => void;
}

export const WizardFooter: React.FC<WizardFooterProps> = ({
  step,
  selectedPlaybookId,
  aiInput,
  isGenerating,
  isChatMode,
  onGoBackToSelect,
  onGoBackToAIInput,
  onAIGenerate,
  onStartChatMode,
  onCreateFromAI,
  onInstallOfficialJourney,
}) => {
  if (step === 'select') return null;

  return (
    <div className="p-6 border-t border-border bg-white dark:bg-dark-card shrink-0">
      {step === 'playbook-preview' && selectedPlaybookId && (
        <div className="flex gap-3 justify-between items-center w-full">
          <Button
            onClick={onGoBackToSelect}
            className="px-4 py-2 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors font-medium"
          >
            &larr; Voltar
          </Button>
          <Button
            onClick={() => onInstallOfficialJourney(selectedPlaybookId)}
            className="px-8 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl transition-all shadow-lg hover:shadow-primary-500/25 font-bold flex items-center gap-2"
          >
            Instalar Playbook Completo
          </Button>
        </div>
      )}

      {step === 'ai-input' && (
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onGoBackToSelect}
            className="px-4 py-2 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Voltar
          </Button>
          <Button
            onClick={onAIGenerate}
            disabled={!aiInput.trim() || isGenerating}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Gerar Board
              </>
            )}
          </Button>
        </div>
      )}

      {step === 'ai-preview' && (
        <div className="flex gap-3 justify-between items-center">
          {isChatMode ? (
            <div className="text-sm text-muted-foreground">Modo de refinamento ativo</div>
          ) : (
            <Button
              onClick={onGoBackToAIInput}
              className="px-4 py-2 text-secondary-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Nao e isso
            </Button>
          )}

          <div className="flex gap-3">
            {!isChatMode && (
              <Button
                onClick={onStartChatMode}
                className="px-4 py-2 bg-muted dark:bg-white/10 text-secondary-foreground hover:bg-accent dark:hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <MessageSquare size={18} />
                Refinar com IA
              </Button>
            )}
            <Button
              onClick={onCreateFromAI}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors shadow-lg flex items-center gap-2"
            >
              Perfeito! Criar Board
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
