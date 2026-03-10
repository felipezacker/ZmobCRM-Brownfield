import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContactPreference } from '@/types';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';

interface UseContactPreferencesParams {
  contactId?: string;
  organizationId?: string;
  externalBufferRef?: React.MutableRefObject<ContactPreference[]>;
}

export function useContactPreferences({ contactId, organizationId, externalBufferRef }: UseContactPreferencesParams) {
  const [preferences, setPreferences] = useState<ContactPreference[]>([]);
  const [loading, setLoading] = useState(!!contactId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const internalBufferRef = useRef<ContactPreference[]>([]);
  const bufferedPrefsRef = externalBufferRef || internalBufferRef;

  const loadPreferences = useCallback(async () => {
    if (!contactId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await contactPreferencesService.getByContactId(contactId);
    if (result.error) {
      setError(result.error.message);
    } else {
      setPreferences(result.data || []);
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const saveEdit = async (
    expandedId: string,
    payload: Record<string, unknown>,
    callbacks: { onSuccess: () => void },
  ) => {
    if (!contactId) {
      const updater = (prev: ContactPreference[]) => prev.map(p =>
        p.id === expandedId ? { ...p, ...payload } : p
      );
      setPreferences(updater);
      bufferedPrefsRef.current = updater(bufferedPrefsRef.current);
      callbacks.onSuccess();
      return;
    }

    setSaving(true);
    const result = await contactPreferencesService.update(expandedId, payload);
    setSaving(false);

    if (result.error) {
      setError(`Erro ao atualizar: ${result.error.message}`);
      return;
    }
    callbacks.onSuccess();
    await loadPreferences();
  };

  const saveNew = async (
    payload: Record<string, unknown>,
    callbacks: { onSuccess: () => void },
  ) => {
    if (!contactId) {
      const tempPref = {
        id: `temp-${Date.now()}`,
        contactId: '',
        organizationId: organizationId || '',
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ContactPreference;
      setPreferences(prev => [...prev, tempPref]);
      bufferedPrefsRef.current = [...bufferedPrefsRef.current, tempPref];
      callbacks.onSuccess();
      return;
    }

    setSaving(true);
    const result = await contactPreferencesService.create({
      ...payload,
      contactId,
      organizationId,
    } as Omit<ContactPreference, 'id' | 'createdAt' | 'updatedAt'>);
    setSaving(false);

    if (result.error) {
      setError(`Erro ao criar: ${result.error.message}`);
      return;
    }
    callbacks.onSuccess();
    await loadPreferences();
  };

  const handleDelete = async (id: string, expandedId: string | null, setExpandedId: (id: string | null) => void) => {
    if (!contactId) {
      setPreferences(prev => prev.filter(p => p.id !== id));
      bufferedPrefsRef.current = bufferedPrefsRef.current.filter(p => p.id !== id);
      if (expandedId === id) setExpandedId(null);
      return;
    }
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id: string, expandedId: string | null, setExpandedId: (id: string | null) => void) => {
    const result = await contactPreferencesService.delete(id);
    if (result.error) {
      setError(`Erro ao excluir: ${result.error.message}`);
      return;
    }
    if (expandedId === id) setExpandedId(null);
    await loadPreferences();
  };

  return {
    preferences,
    setPreferences,
    loading,
    error,
    setError,
    saving,
    confirmDeleteId,
    setConfirmDeleteId,
    bufferedPrefsRef,
    loadPreferences,
    saveEdit,
    saveNew,
    handleDelete,
    executeDelete,
  };
}
