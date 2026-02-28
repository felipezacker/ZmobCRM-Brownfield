'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CustomFieldDefinition, CustomFieldType } from '@/types';
import { useTags } from '@/hooks/useTags';
import { useAuth } from '@/context/AuthContext';

export function useSettingsController() {
  const supabase = createClient()!;
  const { organizationId } = useAuth();

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

  // Tags (centralized via useTags hook — reads/writes Supabase `tags` table)
  const { tags: availableTags, addTag, removeTag } = useTags();
  const [newTagName, setNewTagName] = useState('');

  const handleAddTag = useCallback(async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    await addTag(trimmed);
    setNewTagName('');
  }, [newTagName, addTag]);

  // Custom fields
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity_type', 'contact')
      .then(({ data }) => {
        if (data) setCustomFieldDefinitions(data as CustomFieldDefinition[]);
      });
  }, [supabase, organizationId]);

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
        .eq('id', editingId)
        .eq('organization_id', organizationId);
      if (!error) {
        setCustomFieldDefinitions((prev) =>
          prev.map((f) => (f.id === editingId ? { ...f, label, type: newFieldType, options } : f)),
        );
        cancelEditingField();
      }
    } else {
      const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const { data, error } = await supabase
        .from('custom_field_definitions')
        .insert({ key, label, type: newFieldType, options, organization_id: organizationId, entity_type: 'contact' })
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
      const { error } = await supabase.from('custom_field_definitions').delete().eq('id', id).eq('organization_id', organizationId);
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
