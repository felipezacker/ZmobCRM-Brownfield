import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Board, Contact, ContactStage } from '@/types';
import {
  useCreateContact,
  useUpdateContact,
  useBulkDeleteContacts,
} from '@/lib/query/hooks/useContactsQuery';
import { useCreateDeal } from '@/lib/query/hooks/useDealsQuery';
import { normalizePhoneE164 } from '@/lib/phone';
import { generateFakeContacts } from '@/lib/debug';
import { supabase } from '@/lib/supabase/client';

interface UseContactImportParams {
  toast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  contacts: Contact[];
  boards: Board[];
}

export const useContactImport = ({ toast, contacts, boards }: UseContactImportParams) => {
  const queryClient = useQueryClient();
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  const bulkDeleteContactsMutation = useBulkDeleteContacts();
  const createDealMutation = useCreateDeal();

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Create Deal state
  const [createDealContactId, setCreateDealContactId] = useState<string | null>(null);
  const contactForDeal = contacts.find(c => c.id === createDealContactId);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const ids = contacts.map(c => c.id);
    setSelectedIds(prev =>
      prev.size === ids.length ? new Set() : new Set(ids)
    );
  }, [contacts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk delete
  const confirmBulkDelete = useCallback(async () => {
    const ids: string[] = Array.from(selectedIds);
    let successCount = 0;
    let errorCount = 0;

    try {
      const result = await bulkDeleteContactsMutation.mutateAsync({
        ids,
        forceDeleteDeals: true,
        concurrency: 3,
      });
      successCount = result.successCount;
      errorCount = result.errorCount;
    } catch {
      errorCount = ids.length;
    }

    if (successCount > 0) toast(`${successCount} contato(s) excluido(s)`, 'success');
    if (errorCount > 0) toast(`Falha ao excluir ${errorCount} contato(s)`, 'error');

    setSelectedIds(new Set());
    setBulkDeleteConfirm(false);
  }, [selectedIds, bulkDeleteContactsMutation, toast]);

  // Bulk reassign owner
  const bulkReassignOwner = useCallback(async (newOwnerId: string) => {
    if (!supabase || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('contacts')
      .update({ owner_id: newOwnerId, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      toast(`Erro ao reatribuir: ${error.message}`, 'error');
    } else {
      toast(`${ids.length} contato(s) reatribuido(s)`, 'success');
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
  }, [selectedIds, toast, queryClient]);

  const createDealDirectly = useCallback((contactId: string, board: typeof boards[0]) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) { toast('Contato nao encontrado', 'error'); return; }
    if (!board.stages?.length) { toast('Board nao tem estagios configurados', 'error'); return; }

    const firstStage = board.stages[0];
    createDealMutation.mutate(
      {
        title: `Deal - ${contact.name}`,
        contactId: contact.id,
        boardId: board.id,
        status: firstStage.id,
        value: 0,
        probability: 0,
        priority: 'medium',
        items: [],
        owner: { name: 'Eu', avatar: '' },
        isWon: false,
        isLost: false,
      },
      {
        onSuccess: () => toast(`Deal criado no board "${board.name}"`, 'success'),
        onError: (error: Error) => toast(`Erro ao criar deal: ${error.message}`, 'error'),
      }
    );
  }, [contacts, createDealMutation, toast]);

  // Convert contact to deal
  const convertContactToDeal = useCallback((contactId: string) => {
    if (boards.length === 0) {
      toast('Nenhum board disponivel. Crie um board primeiro.', 'error');
      return;
    }
    if (boards.length === 1) {
      createDealDirectly(contactId, boards[0]);
      return;
    }
    setCreateDealContactId(contactId);
  }, [boards, toast, createDealDirectly]);

  // Called from modal after board selection
  const createDealForContact = useCallback((boardId: string) => {
    const contact = contacts.find(c => c.id === createDealContactId);
    const board = boards.find(b => b.id === boardId);
    if (!contact || !board) { toast('Erro ao criar deal', 'error'); setCreateDealContactId(null); return; }
    createDealDirectly(contact.id, board);
    setCreateDealContactId(null);
  }, [contacts, boards, createDealContactId, createDealDirectly, toast]);

  // Create fake contacts batch
  const createFakeContactsBatch = useCallback(async (count: number) => {
    const fakeContacts = generateFakeContacts(count);
    let createdCount = 0;
    for (const fake of fakeContacts) {
      await createContactMutation.mutateAsync({
        name: fake.name, email: fake.email, phone: normalizePhoneE164(fake.phone),
        status: 'ACTIVE', stage: ContactStage.LEAD, totalValue: 0,
      });
      createdCount++;
    }
    toast(`${createdCount} contatos fake criados!`, 'success');
  }, [toast, createContactMutation]);

  // Update contact wrapper
  const updateContact = useCallback((contactId: string, data: Partial<Contact>) => {
    updateContactMutation.mutate({
      id: contactId,
      updates: { name: data.name, email: data.email, phone: data.phone, status: data.status, stage: data.stage },
    });
  }, [updateContactMutation]);

  return {
    selectedIds, toggleSelect, toggleSelectAll, clearSelection,
    bulkDeleteConfirm, setBulkDeleteConfirm, confirmBulkDelete,
    bulkReassignOwner,
    convertContactToDeal, createDealForContact, createDealDirectly,
    createDealContactId, setCreateDealContactId, contactForDeal,
    createFakeContactsBatch, updateContact,
  };
};
