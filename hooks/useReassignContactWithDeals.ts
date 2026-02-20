import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query';

interface ReassignParams {
  contactId: string;
  newOwnerId: string;
  cascadeDeals: boolean;
  name?: string;
  email?: string;
  phone?: string;
}

interface ReassignResult {
  contact_updated: boolean;
  deals_updated: number;
}

export function useReassignContactWithDeals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, newOwnerId, cascadeDeals, name, email, phone }: ReassignParams) => {
      if (!supabase) throw new Error('Supabase não configurado');

      const { data, error } = await supabase.rpc('reassign_contact_with_deals', {
        p_contact_id: contactId,
        p_new_owner_id: newOwnerId,
        p_cascade_deals: cascadeDeals,
        p_name: name ?? null,
        p_email: email ?? null,
        p_phone: phone ?? null,
      });

      if (error) throw error;
      return data as ReassignResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}

export function useActiveDealsCount(contactId: string | null) {
  const fetchCount = useCallback(async (): Promise<number> => {
    if (!contactId || !supabase) return 0;

    const { count, error } = await supabase
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('is_won', false)
      .eq('is_lost', false)
      .is('deleted_at', null);

    if (error) return 0;
    return count ?? 0;
  }, [contactId]);

  return { fetchCount };
}
