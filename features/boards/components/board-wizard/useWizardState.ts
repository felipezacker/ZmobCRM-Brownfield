import { useState, useRef, useEffect } from 'react';
import { GeneratedBoard } from '@/lib/ai/tasksClient';
import { ProcessingStep, SimulatorPhase } from '@/features/boards/components/Modals/AIProcessingModal';
import { fetchRegistry } from '@/lib/templates/registryService';
import { RegistryIndex } from '@/types';
import {
  WizardStep,
  SelectMode,
  SelectBrowseFocus,
  ChatMessage,
  InstallProgress,
} from '@/features/boards/components/board-wizard/types';

export function useWizardState(isOpen?: boolean) {
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [includeSubscriptionRenewals, setIncludeSubscriptionRenewals] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBoard, setGeneratedBoard] = useState<GeneratedBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('analyzing');
  const [processingPhase, setProcessingPhase] = useState<SimulatorPhase>('structure');
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [previewBoard, setPreviewBoard] = useState<GeneratedBoard | null>(null);
  const [activeTab, setActiveTab] = useState<'official' | 'community'>('official');
  const [selectMode, setSelectMode] = useState<SelectMode>('home');
  const [selectBrowseFocus, setSelectBrowseFocus] = useState<SelectBrowseFocus>('playbooks');
  const [registryIndex, setRegistryIndex] = useState<RegistryIndex | null>(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectMode('home');
      setSelectedPlaybookId(null);
      setAiInput('');
      setGeneratedBoard(null);
      setPreviewBoard(null);
      setError(null);
      setIsChatMode(false);
      setChatMessages([]);
      setChatInput('');
      setIsProcessingModalOpen(false);
      setIncludeSubscriptionRenewals(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'community' && !registryIndex) {
      setIsLoadingRegistry(true);
      fetchRegistry()
        .then(setRegistryIndex)
        .catch(console.error)
        .finally(() => setIsLoadingRegistry(false));
    }
  }, [activeTab, registryIndex]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatMode]);

  return {
    step, setStep,
    selectedPlaybookId, setSelectedPlaybookId,
    includeSubscriptionRenewals, setIncludeSubscriptionRenewals,
    aiInput, setAiInput,
    isGenerating, setIsGenerating,
    generatedBoard, setGeneratedBoard,
    error, setError,
    processingStep, setProcessingStep,
    processingPhase, setProcessingPhase,
    isProcessingModalOpen, setIsProcessingModalOpen,
    isChatMode, setIsChatMode,
    chatInput, setChatInput,
    chatMessages, setChatMessages,
    isRefining, setIsRefining,
    chatEndRef,
    previewBoard, setPreviewBoard,
    activeTab, setActiveTab,
    selectMode, setSelectMode,
    selectBrowseFocus, setSelectBrowseFocus,
    registryIndex, isLoadingRegistry,
    isInstalling, setIsInstalling,
    installProgress, setInstallProgress,
  };
}
