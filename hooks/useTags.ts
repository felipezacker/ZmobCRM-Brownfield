'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook centralizado para gerenciar tags do catálogo (tabela `tags` no Supabase).
 * Inclui organization_id para isolamento multi-tenant.
 */
export function useTags() {
  const supabase = createClient()!;
  const { organizationId } = useAuth();
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from('tags')
      .select('name')
      .eq('organization_id', organizationId)
      .then(({ data }) => {
        if (data) setTags(data.map((t) => t.name));
        setLoading(false);
      });
  }, [supabase, organizationId]);

  const tagsLowerSet = useMemo(() => new Set(tags.map(t => t.toLowerCase())), [tags]);

  const addTag = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || tagsLowerSet.has(trimmed.toLowerCase())) return;
      if (!organizationId) return;
      const { error } = await supabase
        .from('tags')
        .insert({ name: trimmed, organization_id: organizationId });
      if (!error) {
        setTags((prev) => [...prev, trimmed]);
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
        setTags((prev) => prev.filter((t) => t !== name));
      }
    },
    [supabase, organizationId],
  );

  return { tags, loading, addTag, removeTag, tagsLowerSet };
}
