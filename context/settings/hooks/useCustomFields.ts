import { useState, useCallback } from 'react';
import { CustomFieldDefinition } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';

export function useCustomFields(
  supabase: SupabaseClient,
  organizationId: string | null | undefined,
  setError: (msg: string) => void,
) {
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);

  const loadCustomFields = useCallback(async () => {
    if (!organizationId) return;
    const { data: cfData } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('entity_type', 'contact');
    if (cfData) setCustomFieldDefinitions(cfData as CustomFieldDefinition[]);
  }, [supabase, organizationId]);

  const addCustomField = useCallback(async (field: Omit<CustomFieldDefinition, 'id'>) => {
    if (!organizationId) return;
    const key = field.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const { data, error: insertError } = await supabase
      .from('custom_field_definitions')
      .insert({ key, label: field.label, type: field.type, options: field.options, organization_id: organizationId, entity_type: 'contact' })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) {
      setCustomFieldDefinitions(prev => [...prev, data as CustomFieldDefinition]);
    }
  }, [supabase, organizationId, setError]);

  const updateCustomField = useCallback(async (id: string, updates: Partial<CustomFieldDefinition>) => {
    if (!organizationId) return;
    const { error: updateError } = await supabase
      .from('custom_field_definitions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCustomFieldDefinitions(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  }, [supabase, organizationId, setError]);

  const removeCustomField = useCallback(async (id: string) => {
    if (!organizationId) return;
    const { error: deleteError } = await supabase
      .from('custom_field_definitions')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setCustomFieldDefinitions(prev => prev.filter(f => f.id !== id));
  }, [supabase, organizationId, setError]);

  return {
    customFieldDefinitions,
    addCustomField,
    updateCustomField,
    removeCustomField,
    loadCustomFields,
  };
}
