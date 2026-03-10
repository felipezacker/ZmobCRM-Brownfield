import { useState, useEffect } from 'react';

interface UseModelSelectionParams {
  aiProvider: string;
  aiModel: string;
  isCatalogModel: boolean;
  setAiModel: (model: string) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
  currentProviderModels: ReadonlyArray<{ id: string }> | undefined;
}

export function useModelSelection({
  aiProvider, aiModel, isCatalogModel, setAiModel, showToast, currentProviderModels,
}: UseModelSelectionParams) {
  const [modelSelectValue, setModelSelectValue] = useState<string>(isCatalogModel ? aiModel : 'custom');
  const [customModelDraft, setCustomModelDraft] = useState('');
  const [customModelDirty, setCustomModelDirty] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);

  useEffect(() => {
    setModelSelectValue(isCatalogModel ? aiModel : 'custom');
  }, [aiProvider, aiModel, isCatalogModel]);

  useEffect(() => {
    if (modelSelectValue !== 'custom') {
      setCustomModelDraft('');
      setCustomModelDirty(false);
      return;
    }
    if (!customModelDirty) {
      setCustomModelDraft(!isCatalogModel ? aiModel : '');
    }
  }, [modelSelectValue, aiModel, customModelDirty, isCatalogModel]);

  const handleModelSelectChange = async (next: string) => {
    if (next === 'custom') {
      setModelSelectValue('custom');
      setCustomModelDraft(!isCatalogModel ? aiModel : '');
      setCustomModelDirty(false);
      return;
    }
    setModelSelectValue(next);
    try {
      await setAiModel(next);
      setCustomModelDraft('');
      setCustomModelDirty(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao atualizar modelo', 'error');
    }
  };

  const handleSaveCustomModel = async () => {
    const trimmed = customModelDraft.trim();
    if (!trimmed) {
      showToast('Digite o ID do modelo', 'error');
      return;
    }
    setIsSavingModel(true);
    try {
      await setAiModel(trimmed);
      const matchesCatalog = !!currentProviderModels?.some(m => m.id === trimmed);
      setModelSelectValue(matchesCatalog ? trimmed : 'custom');
      setCustomModelDirty(false);
      showToast('Modelo salvo!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao salvar modelo', 'error');
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleResetCustomModel = () => {
    setCustomModelDraft(aiModel);
    setCustomModelDirty(false);
  };

  return {
    modelSelectValue,
    customModelDraft,
    setCustomModelDraft,
    customModelDirty,
    setCustomModelDirty,
    isSavingModel,
    handleModelSelectChange,
    handleSaveCustomModel,
    handleResetCustomModel,
  };
}
