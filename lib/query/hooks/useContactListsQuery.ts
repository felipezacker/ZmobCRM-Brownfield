/**
 * React Query hooks for Contact Lists (CL-1).
 *
 * Provides queries and mutations for CRUD on contact_lists
 * and membership management on contact_list_members.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactListsService } from '@/lib/supabase/contact-lists';
import { useAuth } from '@/context/AuthContext';
import type { ContactList } from '@/types';

const CONTACT_LISTS_KEY = ['contactLists'] as const;

// ============ QUERIES ============

/**
 * Count contacts not in any list (server-side via RPC).
 */
export const useNoListCount = () => {
  const { user, organizationId, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: [...CONTACT_LISTS_KEY, 'noListCount', organizationId] as const,
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase/client');
      if (!supabase || !organizationId) return 0;
      const { data, error } = await supabase
        .rpc('count_contacts_without_list', { p_org_id: organizationId });
      if (error) return 0;
      return (data as number) ?? 0;
    },
    enabled: !authLoading && !!user && !!organizationId,
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch all contact lists with member counts.
 */
export const useContactLists = () => {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: CONTACT_LISTS_KEY,
    queryFn: async () => {
      const { data, error } = await contactListsService.fetchAll();
      if (error) throw error;
      return data || [];
    },
    enabled: !authLoading && !!user,
  });
};

/**
 * Fetch contact IDs belonging to a specific list.
 */
export const useContactListMembers = (listId: string | null) => {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: [...CONTACT_LISTS_KEY, 'members', listId] as const,
    queryFn: async () => {
      if (!listId) return [];
      const { data, error } = await contactListsService.fetchContactIdsByList(listId);
      if (error) throw error;
      return data || [];
    },
    enabled: !authLoading && !!user && !!listId,
  });
};

// ============ MUTATIONS ============

/**
 * Create a new contact list.
 */
export const useCreateContactList = () => {
  const queryClient = useQueryClient();
  const { user, organizationId } = useAuth();

  return useMutation({
    mutationFn: async (params: { name: string; color?: string; description?: string }) => {
      const { data, error } = await contactListsService.create({
        ...params,
        organizationId: organizationId!,
        createdBy: user?.id,
      });
      if (error) throw error;
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_KEY });
    },
  });
};

/**
 * Update a contact list.
 */
export const useUpdateContactList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; color?: string; description?: string } }) => {
      const { error } = await contactListsService.update(id, updates);
      if (error) throw error;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: CONTACT_LISTS_KEY });
      const previous = queryClient.getQueryData<ContactList[]>(CONTACT_LISTS_KEY);
      queryClient.setQueryData<ContactList[]>(CONTACT_LISTS_KEY, (old = []) =>
        old.map(list => (list.id === id ? { ...list, ...updates } : list))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONTACT_LISTS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_KEY });
    },
  });
};

/**
 * Delete a contact list.
 */
export const useDeleteContactList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await contactListsService.delete(id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CONTACT_LISTS_KEY });
      const previous = queryClient.getQueryData<ContactList[]>(CONTACT_LISTS_KEY);
      queryClient.setQueryData<ContactList[]>(CONTACT_LISTS_KEY, (old = []) =>
        old.filter(list => list.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONTACT_LISTS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_KEY });
    },
  });
};

/**
 * Add contacts to a list.
 */
export const useAddContactsToList = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ listId, contactIds }: { listId: string; contactIds: string[] }) => {
      const { error } = await contactListsService.addContacts(listId, contactIds, user?.id);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_KEY });
    },
  });
};

/**
 * Remove contacts from a list.
 */
export const useRemoveContactsFromList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, contactIds }: { listId: string; contactIds: string[] }) => {
      const { error } = await contactListsService.removeContacts(listId, contactIds);
      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CONTACT_LISTS_KEY });
    },
  });
};
