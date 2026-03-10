import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Board } from '@/types';
import { AIProcessingModal } from '@/features/boards/components/Modals/AIProcessingModal';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';
import { Button } from '@/components/ui/button';
import { InstallingOverlay } from '@/features/boards/components/board-wizard/InstallingOverlay';
import { SelectHomeStep } from '@/features/boards/components/board-wizard/SelectHomeStep';
import { SelectBrowseStep } from '@/features/boards/components/board-wizard/SelectBrowseStep';
import { PlaybookPreviewStep } from '@/features/boards/components/board-wizard/PlaybookPreviewStep';
import { AIInputStep } from '@/features/boards/components/board-wizard/AIInputStep';
import { AIPreviewStep } from '@/features/boards/components/board-wizard/AIPreviewStep';
import { ChatPanel } from '@/features/boards/components/board-wizard/ChatPanel';
import { WizardFooter } from '@/features/boards/components/board-wizard/WizardFooter';
import { useWizardState } from '@/features/boards/components/board-wizard/useWizardState';
import { useWizardHandlers, buildPanelMaxWidthClass } from '@/features/boards/components/board-wizard/useWizardHandlers';

interface BoardCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => void;
  onCreateBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
  onUpdateBoardAsync?: (id: string, updates: Partial<Board>) => Promise<void>;
  onOpenCustomModal: () => void;
}

export const BoardCreationWizard: React.FC<BoardCreationWizardProps> = ({
  isOpen, onClose, onCreate, onCreateBoardAsync, onUpdateBoardAsync, onOpenCustomModal,
}) => {
  const st = useWizardState(isOpen);
  const handlers = useWizardHandlers({
    ...st, onCreate, onCreateBoardAsync, onUpdateBoardAsync, onClose, onOpenCustomModal,
  });

  const displayBoard = st.previewBoard || st.generatedBoard;
  const panelMaxWidthClass = buildPanelMaxWidthClass(st.step, st.selectMode, st.isChatMode);
  const isSelectHome = st.step === 'select' && st.selectMode === 'home';

  if (!isOpen) return null;

  return (
    <div className={MODAL_OVERLAY_CLASS}>
      {st.isInstalling && <InstallingOverlay installProgress={st.installProgress} />}
      <AIProcessingModal isOpen={st.isProcessingModalOpen} currentStep={st.processingStep} phase={st.processingPhase} />
      <div className="absolute inset-0" onClick={st.isInstalling ? undefined : onClose} />

      <div className={`relative z-10 w-full h-full sm:h-auto ${panelMaxWidthClass} bg-white dark:bg-dark-card rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(90dvh-1rem)] sm:max-h-[calc(90dvh-2rem)] transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            {st.isChatMode ? (<><MessageSquare size={24} className="text-primary-500" /> Refinar com IA</>) : 'Criar Novo Board'}
          </h2>
          <Button variant="ghost" size="unstyled" onClick={onClose} className="p-2 rounded-lg transition-colors">
            <X size={20} className="text-muted-foreground" />
          </Button>
        </div>

        {/* Content Body */}
        <div className={`flex flex-1 overflow-hidden ${st.isChatMode ? 'flex-col lg:flex-row' : 'flex-col'}`}>
          {st.isChatMode && (
            <ChatPanel
              chatMessages={st.chatMessages} chatInput={st.chatInput} isRefining={st.isRefining}
              previewBoard={st.previewBoard} chatEndRef={st.chatEndRef}
              onChatInputChange={st.setChatInput} onRefine={handlers.handleRefineBoard}
              onPreviewToggle={handlers.handlePreviewToggle} onApplyProposal={handlers.handleApplyProposal}
            />
          )}

          <div className={`flex-1 overflow-y-auto custom-scrollbar ${isSelectHome ? 'p-4 sm:p-4' : 'p-4 sm:p-6'} ${st.isChatMode ? 'bg-muted dark:bg-black/20' : ''}`}>
            {st.step === 'select' && (
              <div className="space-y-6">
                {st.selectMode === 'home' ? (
                  <SelectHomeStep onGoToAI={() => st.setStep('ai-input')} onBrowse={handlers.handleBrowse} onStartFromScratch={handlers.handleStartFromScratch} />
                ) : (
                  <SelectBrowseStep
                    selectBrowseFocus={st.selectBrowseFocus} registryIndex={st.registryIndex}
                    isLoadingRegistry={st.isLoadingRegistry} isInstalling={st.isInstalling}
                    onBack={() => st.setSelectMode('home')} onChangeFocus={handlers.handleBrowse}
                    onSelectPlaybook={handlers.handleSelectPlaybook} onSelectTemplate={handlers.handleTemplateSelect}
                    onInstallJourney={handlers.handleInstallJourney}
                  />
                )}
              </div>
            )}
            {st.step === 'playbook-preview' && st.selectedPlaybookId && (
              <PlaybookPreviewStep
                selectedPlaybookId={st.selectedPlaybookId} includeSubscriptionRenewals={st.includeSubscriptionRenewals}
                onToggleRenewals={st.setIncludeSubscriptionRenewals} getJourneyForInstall={handlers.getJourneyForInstall}
              />
            )}
            {st.step === 'ai-input' && (
              <AIInputStep aiInput={st.aiInput} error={st.error} onAiInputChange={st.setAiInput} onGenerate={handlers.handleAIGenerate} onClose={onClose} />
            )}
            {st.step === 'ai-preview' && displayBoard && (
              <AIPreviewStep displayBoard={displayBoard} isChatMode={st.isChatMode} isPreview={!!st.previewBoard} />
            )}
          </div>
        </div>

        <WizardFooter
          step={st.step} selectedPlaybookId={st.selectedPlaybookId} aiInput={st.aiInput}
          isGenerating={st.isGenerating} isChatMode={st.isChatMode}
          onGoBackToSelect={() => { st.setStep('select'); st.setSelectedPlaybookId(null); st.setError(null); }}
          onGoBackToAIInput={() => { st.setStep('ai-input'); st.setGeneratedBoard(null); }}
          onAIGenerate={handlers.handleAIGenerate} onStartChatMode={handlers.startChatMode}
          onCreateFromAI={handlers.handleCreateFromAI} onInstallOfficialJourney={handlers.handleInstallOfficialJourney}
        />
      </div>
    </div>
  );
};
