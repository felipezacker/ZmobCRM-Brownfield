import { BOARD_TEMPLATES, BoardTemplateType } from '@/lib/templates/board-templates';
import {
  generateBoardStructure,
  generateBoardStrategy,
  refineBoardWithAI,
  GeneratedBoard,
} from '@/lib/ai/tasksClient';
import { Board, BoardStage, JourneyDefinition } from '@/types';
import { ProcessingStep, SimulatorPhase } from '@/features/boards/components/Modals/AIProcessingModal';
import {
  WizardStep, SelectMode, SelectBrowseFocus, ChatMessage, InstallProgress,
  normalizeGeneratedBoardColors, guessWonLostStageIds, randomAgentName,
} from '@/features/boards/components/board-wizard/types';
import {
  getJourneyForInstall as getJourney,
  installCommunityJourney,
  installOfficialJourney,
} from '@/features/boards/components/board-wizard/journeyInstallHandlers';

export function buildPanelMaxWidthClass(step: WizardStep, selectMode: SelectMode, isChatMode: boolean): string {
  if (isChatMode) return 'lg:max-w-5xl';
  if (step === 'select' && selectMode === 'home') return 'sm:max-w-xl lg:max-w-xl';
  if (step === 'select' && selectMode === 'browse') return 'sm:max-w-3xl lg:max-w-3xl';
  if (step === 'ai-input') return 'sm:max-w-2xl lg:max-w-2xl';
  if (step === 'ai-preview' || step === 'playbook-preview') return 'sm:max-w-4xl lg:max-w-4xl';
  return 'lg:max-w-5xl';
}

export interface WizardStateBag {
  step: WizardStep; setStep: (s: WizardStep) => void;
  aiInput: string; setAiInput: (v: string) => void;
  generatedBoard: GeneratedBoard | null; setGeneratedBoard: (b: GeneratedBoard | null) => void;
  previewBoard: GeneratedBoard | null; setPreviewBoard: (b: GeneratedBoard | null) => void;
  error: string | null; setError: (e: string | null) => void;
  isChatMode: boolean; setIsChatMode: (v: boolean) => void;
  chatInput: string; setChatInput: (v: string) => void;
  chatMessages: ChatMessage[]; setChatMessages: (fn: ChatMessage[] | ((p: ChatMessage[]) => ChatMessage[])) => void;
  isRefining: boolean; setIsRefining: (v: boolean) => void;
  isGenerating: boolean; setIsGenerating: (v: boolean) => void;
  processingStep: ProcessingStep; setProcessingStep: (s: ProcessingStep) => void;
  processingPhase: SimulatorPhase; setProcessingPhase: (p: SimulatorPhase) => void;
  isProcessingModalOpen: boolean; setIsProcessingModalOpen: (v: boolean) => void;
  selectedPlaybookId: string | null; setSelectedPlaybookId: (id: string | null) => void;
  includeSubscriptionRenewals: boolean; setIncludeSubscriptionRenewals: (v: boolean) => void;
  selectMode: SelectMode; setSelectMode: (m: SelectMode) => void;
  selectBrowseFocus: SelectBrowseFocus; setSelectBrowseFocus: (f: SelectBrowseFocus) => void;
  activeTab: 'official' | 'community'; setActiveTab: (t: 'official' | 'community') => void;
  isInstalling: boolean; setIsInstalling: (v: boolean) => void;
  installProgress: InstallProgress | null; setInstallProgress: (p: InstallProgress | null) => void;
  onCreate: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => void;
  onCreateBoardAsync?: (board: Omit<Board, 'id' | 'createdAt'>, order?: number) => Promise<Board>;
  onUpdateBoardAsync?: (id: string, updates: Partial<Board>) => Promise<void>;
  onClose: () => void;
  onOpenCustomModal: () => void;
}

export function useWizardHandlers(s: WizardStateBag) {
  const handleReset = () => {
    s.setStep('select'); s.setAiInput(''); s.setGeneratedBoard(null); s.setPreviewBoard(null);
    s.setError(null); s.setIsChatMode(false); s.setChatMessages([]); s.setChatInput('');
    s.setSelectedPlaybookId(null); s.setIncludeSubscriptionRenewals(false);
    s.setSelectMode('home'); s.setSelectBrowseFocus('playbooks'); s.setActiveTab('official');
  };

  const journeyDeps = {
    includeSubscriptionRenewals: s.includeSubscriptionRenewals,
    setIsInstalling: s.setIsInstalling, setInstallProgress: s.setInstallProgress,
    setError: s.setError, onCreate: s.onCreate, onCreateBoardAsync: s.onCreateBoardAsync,
    onUpdateBoardAsync: s.onUpdateBoardAsync, onClose: s.onClose, handleReset,
  };

  const handleBrowse = (focus: SelectBrowseFocus, tab: 'official' | 'community') => {
    s.setSelectMode('browse'); s.setSelectBrowseFocus(focus); s.setActiveTab(tab);
  };

  const handleStartFromScratch = () => { s.onClose(); s.onOpenCustomModal(); handleReset(); };
  const handleSelectPlaybook = (id: string) => { s.setSelectedPlaybookId(id); s.setStep('playbook-preview'); };

  const handleTemplateSelect = (templateType: BoardTemplateType) => {
    const tpl = BOARD_TEMPLATES[templateType];
    if (!Array.isArray(tpl?.stages) || tpl.stages.length === 0) {
      s.onClose(); s.onOpenCustomModal(); handleReset(); return;
    }
    if (s.onCreateBoardAsync) { s.setIsInstalling(true); s.setInstallProgress({ total: 1, current: 1, currentBoardName: tpl.name }); }
    const stages: BoardStage[] = tpl.stages.map((st) => ({ id: crypto.randomUUID(), ...st }));
    const g = guessWonLostStageIds(stages, { wonLabel: tpl.defaultWonStageLabel, lostLabel: tpl.defaultLostStageLabel });
    const payload: Omit<Board, 'id' | 'createdAt'> = {
      name: tpl.name, description: tpl.description, linkedLifecycleStage: tpl.linkedLifecycleStage,
      template: templateType, stages, isDefault: false,
      wonStageId: g.wonStageId, lostStageId: g.lostStageId,
      agentPersona: { ...tpl.agentPersona!, name: randomAgentName() }, goal: tpl.goal, entryTrigger: tpl.entryTrigger,
    };
    if (s.onCreateBoardAsync) {
      s.onCreateBoardAsync(payload)
        .then(() => { s.onClose(); handleReset(); })
        .catch((err) => { console.error('[Wizard] Failed:', err); s.setError('Erro ao criar board do template.'); })
        .finally(() => { s.setIsInstalling(false); s.setInstallProgress(null); });
    } else { s.onCreate(payload); s.onClose(); handleReset(); }
  };

  const handleAIGenerate = async () => {
    if (!s.aiInput.trim()) return;
    s.setIsGenerating(true); s.setIsProcessingModalOpen(true);
    s.setProcessingPhase('structure'); s.setProcessingStep('analyzing'); s.setError(null);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      s.setProcessingStep('structure');
      const bd = await generateBoardStructure(s.aiInput, []);
      const ph = { goal: { description: '', kpi: '...', targetValue: '...' }, agentPersona: { name: '...', role: '...', behavior: '...' }, entryTrigger: '...' };
      const fb: GeneratedBoard = {
        name: bd.boardName, description: bd.description,
        stages: normalizeGeneratedBoardColors({ name: bd.boardName, description: bd.description, stages: bd.stages, automationSuggestions: bd.automationSuggestions, ...ph, confidence: 0.9 }).stages,
        automationSuggestions: bd.automationSuggestions, ...ph, confidence: 0.9,
      };
      if (fb.confidence < 0.6) { s.setError('Nao consegui entender. Tente de novo.'); s.setIsGenerating(false); s.setIsProcessingModalOpen(false); return; }
      s.setProcessingStep('finalizing'); await new Promise((r) => setTimeout(r, 800));
      s.setProcessingStep('complete'); await new Promise((r) => setTimeout(r, 500));
      s.setGeneratedBoard(fb); s.setStep('ai-preview');
    } catch (err) { console.error(err); s.setError(err instanceof Error ? err.message : 'Erro ao gerar board.'); }
    finally { s.setIsGenerating(false); s.setIsProcessingModalOpen(false); }
  };

  const handleRefineBoard = async () => {
    if (!s.chatInput.trim() || !s.generatedBoard) return;
    const msg = s.chatInput; s.setChatInput('');
    s.setChatMessages((p) => [...p, { role: 'user', content: msg }]); s.setIsRefining(true);
    try {
      const base = s.previewBoard || s.generatedBoard;
      const res = await refineBoardWithAI(base, msg, s.chatMessages.map((m) => ({ role: m.role, content: m.content })));
      const changed = res.board && JSON.stringify(res.board) !== JSON.stringify(base);
      const proposal = changed && res.board ? normalizeGeneratedBoardColors(res.board) : undefined;
      s.setChatMessages((p) => [...p, { role: 'ai', content: res.message + (!changed && res.board ? '\n\n*(Sem alteracoes visuais)*' : ''), proposalData: proposal }]);
    } catch (err) { console.error(err); s.setChatMessages((p) => [...p, { role: 'ai', content: 'Problema ao ajustar. Tente de novo.' }]); }
    finally { s.setIsRefining(false); }
  };

  const handleApplyProposal = (p: GeneratedBoard) => {
    s.setGeneratedBoard(normalizeGeneratedBoardColors(p)); s.setPreviewBoard(null);
    s.setChatMessages((prev) => [...prev, { role: 'ai', content: 'Alteracoes aplicadas!' }]);
  };

  const handlePreviewToggle = (p: GeneratedBoard) => {
    s.setPreviewBoard(s.previewBoard === p ? null : normalizeGeneratedBoardColors(p));
  };

  const handleCreateFromAI = async () => {
    const raw = s.previewBoard || s.generatedBoard;
    const board = raw ? normalizeGeneratedBoardColors(raw) : null;
    if (!board) return;
    s.setIsProcessingModalOpen(true); s.setProcessingPhase('strategy'); s.setProcessingStep('analyzing');
    await new Promise((r) => setTimeout(r, 1500)); s.setProcessingStep('strategy');
    let strat = { goal: board.goal, agentPersona: board.agentPersona, entryTrigger: board.entryTrigger };
    try {
      strat = await generateBoardStrategy({ boardName: board.name, description: board.description, stages: board.stages, automationSuggestions: board.automationSuggestions });
      s.setProcessingStep('finalizing'); await new Promise((r) => setTimeout(r, 800));
    } catch (err) { console.error('Strategy error:', err); }
    s.setProcessingStep('complete'); await new Promise((r) => setTimeout(r, 500)); s.setIsProcessingModalOpen(false);
    const stgs = Array.isArray(board.stages) ? board.stages : [];
    if (!stgs.length) { s.setError('Board sem estagios validos.'); return; }
    const bs: BoardStage[] = stgs.map((st) => ({ id: crypto.randomUUID(), label: st.name || 'Nova Etapa', color: st.color || 'bg-accent', linkedLifecycleStage: st.linkedLifecycleStage }));
    const nm = randomAgentName();
    const persona = strat.agentPersona ? { ...strat.agentPersona, name: nm, behavior: strat.agentPersona.behavior.replace(new RegExp(strat.agentPersona.name, 'g'), nm), role: strat.agentPersona.role.replace(new RegExp(strat.agentPersona.name, 'g'), nm) } : undefined;
    s.onCreate({ name: board.name, description: board.description, linkedLifecycleStage: board.linkedLifecycleStage, template: 'CUSTOM', stages: bs, isDefault: false, automationSuggestions: board.automationSuggestions, agentPersona: persona, goal: strat.goal, entryTrigger: strat.entryTrigger });
    s.onClose(); handleReset();
  };

  const startChatMode = () => {
    s.setIsChatMode(true);
    s.setChatMessages([{ role: 'ai', content: 'O que voce gostaria de ajustar neste board?' }]);
  };

  return {
    handleReset, handleBrowse, handleStartFromScratch, handleSelectPlaybook, handleTemplateSelect,
    handleInstallJourney: (path: string) => installCommunityJourney(path, journeyDeps),
    handleInstallOfficialJourney: (id: string) => installOfficialJourney(id, journeyDeps),
    getJourneyForInstall: (id: string) => getJourney(id, s.includeSubscriptionRenewals),
    handleAIGenerate, handleRefineBoard, handleApplyProposal, handlePreviewToggle, handleCreateFromAI, startChatMode,
  };
}
