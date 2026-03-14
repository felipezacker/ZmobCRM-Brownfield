import { useState, useCallback } from 'react';
import { useOptionalToast } from '@/context/ToastContext';
import type { ContactPreference } from '@/types';

interface UseAIPreferenceExtractionOptions {
  preferences: ContactPreference | null;
  onUpdate: (updates: Partial<ContactPreference>) => void;
  onCreate?: (initialData?: Partial<ContactPreference>) => void;
}

interface UseAIPreferenceExtractionReturn {
  aiInput: string;
  setAiInput: (value: string) => void;
  aiLoading: boolean;
  handleAIExtract: () => Promise<void>;
}

/**
 * Encapsulates AI preference extraction logic: fetch, parse, toast on error.
 * Replaces the duplicated handleAIExtract blocks in sidebar-preferences,
 * ContactCockpitDataPanel, PreferencesSection, etc.
 */
export function useAIPreferenceExtraction({
  preferences,
  onUpdate,
  onCreate,
}: UseAIPreferenceExtractionOptions): UseAIPreferenceExtractionReturn {
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const { addToast } = useOptionalToast();

  const handleAIExtract = useCallback(async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/tasks/contacts/extract-preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Falha na extração');
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'Erro');

      const updates: Partial<ContactPreference> = {};
      if (data.propertyTypes?.length) updates.propertyTypes = data.propertyTypes;
      if (data.purpose) updates.purpose = data.purpose;
      if (data.priceMin != null) updates.priceMin = data.priceMin;
      if (data.priceMax != null) updates.priceMax = data.priceMax;
      if (data.regions?.length) updates.regions = data.regions;
      if (data.bedroomsMin != null) updates.bedroomsMin = data.bedroomsMin;
      if (data.parkingMin != null) updates.parkingMin = data.parkingMin;
      if (data.areaMin != null) updates.areaMin = data.areaMin;
      if (data.urgency) updates.urgency = data.urgency;
      if (data.notes) updates.notes = data.notes;

      if (!preferences && onCreate) {
        onCreate(updates);
      } else {
        onUpdate(updates);
      }
      setAiInput('');
    } catch (err) {
      console.error('[useAIPreferenceExtraction] AI extract failed:', err);
      addToast('Erro ao extrair preferências. Tente novamente.', 'error');
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiLoading, preferences, onUpdate, onCreate, addToast]);

  return { aiInput, setAiInput, aiLoading, handleAIExtract };
}
