import { useState, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import type { TagItem } from '@/hooks/useTags';

export function useTagsSettings(
  supabase: SupabaseClient,
  organizationId: string | null | undefined,
  setError: (msg: string) => void,
) {
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);

  const tagsLowerSet = useMemo(() => new Set(availableTags.map(t => t.name.toLowerCase())), [availableTags]);

  const loadTags = useCallback(async () => {
    if (!organizationId) return;
    const { data: tagsData } = await supabase
      .from('tags')
      .select('name, color, description')
      .eq('organization_id', organizationId);
    if (tagsData) setAvailableTags(tagsData.map((t) => ({ name: t.name, color: (t.color && t.color.startsWith('#')) ? t.color : null, description: t.description || null })));
  }, [supabase, organizationId]);

  const addTag = useCallback(async (tag: string, color?: string | null, description?: string | null) => {
    const trimmed = tag.trim();
    if (!trimmed || !organizationId) return;
    if (tagsLowerSet.has(trimmed.toLowerCase())) return;
    const desc = description?.trim() || null;
    const { error: insertError } = await supabase
      .from('tags')
      .insert({ name: trimmed, color: color ?? null, description: desc, organization_id: organizationId });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAvailableTags(prev => [...prev, { name: trimmed, color: color ?? null, description: desc }]);
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
    setAvailableTags(prev => prev.filter(t => t.name !== tag));
  }, [supabase, organizationId, setError]);

  const renameTag = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || !organizationId) return;
    if (tagsLowerSet.has(trimmed.toLowerCase()) && trimmed.toLowerCase() !== oldName.toLowerCase()) return;

    const { error: updateError } = await supabase
      .from('tags')
      .update({ name: trimmed })
      .eq('name', oldName)
      .eq('organization_id', organizationId);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Update contacts that have the old tag name
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, tags')
      .eq('organization_id', organizationId)
      .contains('tags', [oldName]);

    if (contacts && contacts.length > 0) {
      const results = await Promise.allSettled(contacts.map(c => {
        const newTags = (c.tags as string[]).map(t => t === oldName ? trimmed : t);
        return supabase.from('contacts').update({ tags: newTags }).eq('id', c.id);
      }));
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`Failed to update tags on ${failures.length}/${contacts.length} contacts`);
      }
    }

    setAvailableTags(prev => prev.map(t => t.name === oldName ? { ...t, name: trimmed } : t));
  }, [supabase, organizationId, tagsLowerSet, setError]);

  const updateTagColor = useCallback(async (name: string, color: string | null) => {
    if (!organizationId) return;
    const { error: updateError } = await supabase
      .from('tags')
      .update({ color })
      .eq('name', name)
      .eq('organization_id', organizationId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAvailableTags(prev => prev.map(t => t.name === name ? { ...t, color } : t));
  }, [supabase, organizationId, setError]);

  const updateTagDescription = useCallback(async (name: string, description: string | null) => {
    if (!organizationId) return;
    const { error: updateError } = await supabase
      .from('tags')
      .update({ description })
      .eq('name', name)
      .eq('organization_id', organizationId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAvailableTags(prev => prev.map(t => t.name === name ? { ...t, description } : t));
  }, [supabase, organizationId, setError]);

  return {
    availableTags,
    addTag,
    removeTag,
    renameTag,
    updateTagColor,
    updateTagDescription,
    loadTags,
  };
}
