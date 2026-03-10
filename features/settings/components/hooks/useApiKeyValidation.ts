import { useState, useEffect } from 'react';

type ValidationStatus = 'idle' | 'valid' | 'invalid';

interface UseApiKeyValidationParams {
  aiApiKey: string;
  aiProvider: string;
  aiModel: string;
  setAiApiKey: (key: string) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
  validateApiKey: (provider: string, apiKey: string, model: string) => Promise<{ valid: boolean; error?: string }>;
  modelSelectValue: string;
  customModelDraft: string;
}

export function useApiKeyValidation({
  aiApiKey, aiProvider, aiModel, setAiApiKey, showToast,
  validateApiKey, modelSelectValue, customModelDraft,
}: UseApiKeyValidationParams) {
  const [localApiKey, setLocalApiKey] = useState(aiApiKey);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>(
    aiApiKey ? 'valid' : 'idle'
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lgpdExpanded, setLgpdExpanded] = useState(!aiApiKey);

  useEffect(() => {
    setLocalApiKey(aiApiKey);
    if (aiApiKey) {
      setValidationStatus('valid');
    }
    setLgpdExpanded(!aiApiKey);
  }, [aiApiKey]);

  const handleKeyChange = (newKey: string) => {
    setLocalApiKey(newKey);
    if (newKey !== aiApiKey) {
      setValidationStatus('idle');
      setValidationError(null);
    }
  };

  const handleSaveApiKey = async () => {
    if (!localApiKey.trim()) {
      showToast('Digite uma chave de API', 'error');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    const modelForValidation =
      modelSelectValue === 'custom' && customModelDraft.trim()
        ? customModelDraft.trim()
        : aiModel;

    const result = await validateApiKey(aiProvider, localApiKey, modelForValidation);

    setIsValidating(false);

    if (result.valid) {
      setValidationStatus('valid');
      try {
        await setAiApiKey(localApiKey);
        setLgpdExpanded(false);
        showToast('Chave de API validada e salva!', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Falha ao salvar chave de API', 'error');
      }
    } else {
      setValidationStatus('invalid');
      setValidationError(result.error || 'Chave inválida');
      showToast(result.error || 'Chave de API inválida', 'error');
    }
  };

  const handleRemoveApiKey = async () => {
    setLocalApiKey('');
    setValidationStatus('idle');
    setValidationError(null);
    try {
      await setAiApiKey('');
      showToast('Chave de API removida', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao remover chave de API', 'error');
    }
  };

  const hasUnsavedChanges = localApiKey !== aiApiKey;

  return {
    localApiKey,
    isValidating,
    validationStatus,
    validationError,
    lgpdExpanded,
    setLgpdExpanded,
    handleKeyChange,
    handleSaveApiKey,
    handleRemoveApiKey,
    hasUnsavedChanges,
  };
}
