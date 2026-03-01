'use client';

import { useState, useCallback } from 'react';
import { CustomFieldDefinition, CustomFieldType } from '@/types';
import { useTags } from '@/hooks/useTags';
import { useSettings } from '@/context/settings/SettingsContext';

export function useSettingsController() {
  // Default route
  const [defaultRoute, setDefaultRouteState] = useState('/dashboard');

  const setDefaultRoute = useCallback((route: string) => {
    setDefaultRouteState(route);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zmob_default_route', route);
    }
  }, []);

  // Load saved default route on mount (useState initializer avoids useEffect)
  const [defaultRouteLoaded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zmob_default_route');
      if (saved) setDefaultRouteState(saved);
    }
    return true;
  });
  void defaultRouteLoaded;

  // Tags (centralized via useTags hook — reads/writes Supabase `tags` table)
  const { tags: availableTags, addTag, removeTag } = useTags();
  const [newTagName, setNewTagName] = useState('');

  const handleAddTag = useCallback(async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    await addTag(trimmed);
    setNewTagName('');
  }, [newTagName, addTag]);

  // Custom fields — data from SettingsContext (single source of truth, no duplicate query)
  const {
    customFieldDefinitions,
    addCustomField: ctxAddCustomField,
    updateCustomField: ctxUpdateCustomField,
    removeCustomField: ctxRemoveCustomField,
  } = useSettings();

  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEditingField = useCallback((field: CustomFieldDefinition) => {
    setEditingId(field.id);
    setNewFieldLabel(field.label);
    setNewFieldType(field.type);
    setNewFieldOptions(field.options?.join(', ') ?? '');
  }, []);

  const cancelEditingField = useCallback(() => {
    setEditingId(null);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
  }, []);

  const handleSaveField = useCallback(async () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    const options =
      newFieldType === 'select'
        ? newFieldOptions
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    if (editingId) {
      await ctxUpdateCustomField(editingId, { label, type: newFieldType, options });
    } else {
      const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      await ctxAddCustomField({ key, label, type: newFieldType, options });
    }
    cancelEditingField();
  }, [newFieldLabel, newFieldType, newFieldOptions, editingId, ctxAddCustomField, ctxUpdateCustomField, cancelEditingField]);

  const removeCustomField = useCallback(
    async (id: string) => {
      await ctxRemoveCustomField(id);
    },
    [ctxRemoveCustomField],
  );

  return {
    defaultRoute,
    setDefaultRoute,
    availableTags,
    newTagName,
    setNewTagName,
    handleAddTag,
    removeTag,
    customFieldDefinitions,
    newFieldLabel,
    setNewFieldLabel,
    newFieldType,
    setNewFieldType,
    newFieldOptions,
    setNewFieldOptions,
    editingId,
    startEditingField,
    cancelEditingField,
    handleSaveField,
    removeCustomField,
  };
}
