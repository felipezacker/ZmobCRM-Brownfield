'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface TagItem {
  name: string;
  color: string | null;
  description: string | null;
}

/**
 * Hook centralizado para gerenciar tags do catálogo (tabela `tags` no Supabase).
 * Inclui organization_id para isolamento multi-tenant.
 */
export function useTags() {
  const supabase = createClient()!;
  const { organizationId } = useAuth();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('tags')
      .select('name, color, description')
      .eq('organization_id', organizationId)
      .then(({ data }) => {
        if (data) setTags(data.map((t) => ({ name: t.name, color: (t.color && t.color.startsWith('#')) ? t.color : null, description: t.description || null })));
        setLoading(false);
      });
  }, [supabase, organizationId]);

  const tagsLowerSet = useMemo(() => new Set(tags.map(t => t.name.toLowerCase())), [tags]);

  const addTag = useCallback(
    async (name: string, color?: string | null, description?: string | null) => {
      const trimmed = name.trim();
      if (!trimmed || tagsLowerSet.has(trimmed.toLowerCase())) return;
      if (!organizationId) return;
      const desc = description?.trim() || null;
      const { error } = await supabase
        .from('tags')
        .insert({ name: trimmed, color: color ?? null, description: desc, organization_id: organizationId });
      if (!error) {
        setTags((prev) => [...prev, { name: trimmed, color: color ?? null, description: desc }]);
      }
    },
    [tagsLowerSet, supabase, organizationId],
  );

  const removeTag = useCallback(
    async (name: string) => {
      if (!organizationId) return;
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('name', name)
        .eq('organization_id', organizationId);
      if (!error) {
        setTags((prev) => prev.filter((t) => t.name !== name));
      }
    },
    [supabase, organizationId],
  );

  const renameTag = useCallback(
    async (oldName: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed === oldName || !organizationId) return;
      if (tagsLowerSet.has(trimmed.toLowerCase()) && trimmed.toLowerCase() !== oldName.toLowerCase()) return;

      const { error } = await supabase
        .from('tags')
        .update({ name: trimmed })
        .eq('name', oldName)
        .eq('organization_id', organizationId);
      if (error) return;

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

      setTags((prev) => prev.map((t) => t.name === oldName ? { ...t, name: trimmed } : t));
    },
    [supabase, organizationId, tagsLowerSet],
  );

  const updateTagDescription = useCallback(
    async (name: string, description: string | null) => {
      if (!organizationId) return;
      const { error } = await supabase
        .from('tags')
        .update({ description })
        .eq('name', name)
        .eq('organization_id', organizationId);
      if (!error) {
        setTags((prev) => prev.map((t) => t.name === name ? { ...t, description } : t));
      }
    },
    [supabase, organizationId],
  );

  const updateTagColor = useCallback(
    async (name: string, color: string | null) => {
      if (!organizationId) return;
      const { error } = await supabase
        .from('tags')
        .update({ color })
        .eq('name', name)
        .eq('organization_id', organizationId);
      if (!error) {
        setTags((prev) => prev.map((t) => t.name === name ? { ...t, color } : t));
      }
    },
    [supabase, organizationId],
  );

  return { tags, loading, addTag, removeTag, renameTag, updateTagColor, updateTagDescription, tagsLowerSet };
}
