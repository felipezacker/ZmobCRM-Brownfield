'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CustomFieldDefinition, CustomFieldType } from '@/types';

export function useSettingsController() {
  const supabase = createClient()!;

  // Default route
  const [defaultRoute, setDefaultRouteState] = useState('/dashboard');

  const setDefaultRoute = useCallback((route: string) => {
    setDefaultRouteState(route);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zmob_default_route', route);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zmob_default_route');
      if (saved) setDefaultRouteState(saved);
    }
  }, []);

  // Tags
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    supabase
      .from('tags')
      .select('name')
      .then(({ data }) => {
        if (data) setAvailableTags(data.map((t) => t.name));
      });
  }, [supabase]);

  const handleAddTag = useCallback(async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || availableTags.includes(trimmed)) return;
    const { error } = await supabase.from('tags').insert({ name: trimmed });
    if (!error) {
      setAvailableTags((prev) => [...prev, trimmed]);
      setNewTagName('');
    }
  }, [newTagName, availableTags, supabase]);

  const removeTag = useCallback(
    async (tag: string) => {
      const { error } = await supabase.from('tags').delete().eq('name', tag);
      if (!error) {
        setAvailableTags((prev) => prev.filter((t) => t !== tag));
      }
    },
    [supabase],
  );

  // Custom fields
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('custom_field_definitions')
      .select('*')
      .then(({ data }) => {
        if (data) setCustomFieldDefinitions(data as CustomFieldDefinition[]);
      });
  }, [supabase]);

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
      const { error } = await supabase
        .from('custom_field_definitions')
        .update({ label, type: newFieldType, options })
        .eq('id', editingId);
      if (!error) {
        setCustomFieldDefinitions((prev) =>
          prev.map((f) => (f.id === editingId ? { ...f, label, type: newFieldType, options } : f)),
        );
        cancelEditingField();
      }
    } else {
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .insert({ label, type: newFieldType, options })
        .select()
        .single();
      if (!error && data) {
        setCustomFieldDefinitions((prev) => [...prev, data as CustomFieldDefinition]);
        cancelEditingField();
      }
    }
  }, [newFieldLabel, newFieldType, newFieldOptions, editingId, supabase, cancelEditingField]);

  const removeCustomField = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id);
      if (!error) {
        setCustomFieldDefinitions((prev) => prev.filter((f) => f.id !== id));
      }
    },
    [supabase],
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
