import { useState, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';

export function useTagsSettings(
  supabase: SupabaseClient,
  organizationId: string | null | undefined,
  setError: (msg: string) => void,
) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const tagsLowerSet = useMemo(() => new Set(availableTags.map(t => t.toLowerCase())), [availableTags]);

  const loadTags = useCallback(async () => {
    if (!organizationId) return;
    const { data: tagsData } = await supabase
      .from('tags')
      .select('name')
      .eq('organization_id', organizationId);
    if (tagsData) setAvailableTags(tagsData.map((t) => t.name));
  }, [supabase, organizationId]);

  const addTag = useCallback(async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || !organizationId) return;
    if (tagsLowerSet.has(trimmed.toLowerCase())) return;
    const { error: insertError } = await supabase
      .from('tags')
      .insert({ name: trimmed, organization_id: organizationId });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAvailableTags(prev => [...prev, trimmed]);
  }, [tagsLowerSet, supabase, organizationId, setError]);

  const removeTag = useCallback(async (tag: string) => {
    if (!organizationId) return;
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('name', tag)
      .eq('organization_id', organizationId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAvailableTags(prev => prev.filter(t => t !== tag));
  }, [supabase, organizationId, setError]);

  return {
    availableTags,
    addTag,
    removeTag,
    loadTags,
  };
}
