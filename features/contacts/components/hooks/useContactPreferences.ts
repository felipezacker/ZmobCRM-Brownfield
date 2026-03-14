import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContactPreference } from '@/types';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';

interface UseContactPreferencesParams {
  contactId?: string;
  organizationId?: string;
  externalBufferRef?: React.MutableRefObject<ContactPreference | null>;
}

export function useContactPreferences({ contactId, organizationId, externalBufferRef }: UseContactPreferencesParams) {
  const [preference, setPreference] = useState<ContactPreference | null>(null);
  const [loading, setLoading] = useState(!!contactId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const internalBufferRef = useRef<ContactPreference | null>(null);
  const bufferedPrefRef = externalBufferRef || internalBufferRef;

  const loadPreference = useCallback(async () => {
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
      const first = result.data && result.data.length > 0 ? result.data[0] : null;
      setPreference(first);
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  /** Upsert: create if no preference exists, update if one does */
  const save = async (
    payload: Record<string, unknown>,
    callbacks: { onSuccess: () => void },
  ) => {
    if (!contactId) {
      // Buffer mode (new contact, no ID yet)
      const tempPref = {
        id: preference?.id || `temp-${Date.now()}`,
        contactId: '',
        organizationId: organizationId || '',
        propertyTypes: [] as string[],
        purpose: null,
        priceMin: null,
        priceMax: null,
        regions: [] as string[],
        bedroomsMin: null,
        parkingMin: null,
        areaMin: null,
        acceptsFinancing: null,
        acceptsFgts: null,
        urgency: null,
        notes: null,
        ...payload,
        createdAt: preference?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ContactPreference;
      setPreference(tempPref);
      bufferedPrefRef.current = tempPref;
      callbacks.onSuccess();
      return;
    }

    setSaving(true);
    if (preference) {
      // Update existing
      const result = await contactPreferencesService.update(preference.id, payload);
      setSaving(false);
      if (result.error) {
        setError(`Erro ao atualizar: ${result.error.message}`);
        return;
      }
    } else {
      // Create new
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
    }
    callbacks.onSuccess();
    await loadPreference();
  };

  const handleDelete = async () => {
    if (!contactId) {
      setPreference(null);
      bufferedPrefRef.current = null;
      return;
    }
    if (preference) setConfirmDeleteId(preference.id);
  };

  const executeDelete = async (id: string) => {
    const result = await contactPreferencesService.delete(id);
    if (result.error) {
      setError(`Erro ao excluir: ${result.error.message}`);
      return;
    }
    setPreference(null);
  };

  return {
    preference,
    setPreference,
    loading,
    error,
    setError,
    saving,
    confirmDeleteId,
    setConfirmDeleteId,
    bufferedPrefRef,
    loadPreference,
    save,
    handleDelete,
    executeDelete,
  };
}
