/**
 * @fileoverview Hook de ações CRM cross-domain
 *
 * Contém a lógica de negócio que opera entre múltiplos domínios
 * (deals + contacts + activities + boards). Substituiu o CRMContext.
 */
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useDeals } from '@/context/deals/DealsContext';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useSettings } from '@/context/settings/SettingsContext';
import { queryKeys } from '@/lib/query';
import type { Deal, DealView, Contact } from '@/types';

export function useCRMActions() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const {
    rawDeals,
    addDeal: addDealState,
    updateDeal,
    deleteDeal,
    addItemToDeal,
    removeItemFromDeal,
  } = useDeals();
  const { contacts, contactMap, addContact } = useContacts();
  const { activities, addActivity, updateActivity, deleteActivity, toggleActivityCompletion } = useActivities();
  const { boards, activeBoard, activeBoardId, getBoardById } = useBoards();
  const { leads, discardLead } = useSettings();

  const ownerName = profile?.nickname || profile?.first_name || (user?.email?.split('@')[0]) || 'Eu';
  const ownerAvatar = profile?.avatar_url || '';

  // View projection: deals with contact/company names
  const deals: DealView[] = useMemo(() => rawDeals.map(deal => {
    const board = boards.find(b => b.id === deal.boardId);
    const stage = board?.stages?.find(s => s.id === deal.status);
    return {
      ...deal,
      contactName: deal.contactId ? (contactMap[deal.contactId]?.name || 'Sem Contato') : 'Sem Contato',
      contactEmail: deal.contactId ? (contactMap[deal.contactId]?.email || '') : '',
      contactPhone: deal.contactId ? (contactMap[deal.contactId]?.phone || '') : '',
      contactTags: deal.contactId ? (contactMap[deal.contactId]?.tags || []) : [],
      contactCustomFields: deal.contactId ? (contactMap[deal.contactId]?.customFields || {}) : {},
      stageLabel: stage?.label || 'Desconhecido',
      owner: (deal.ownerId === profile?.id || deal.ownerId === user?.id) ? {
        name: ownerName,
        avatar: ownerAvatar,
      } : deal.owner
    };
  }), [rawDeals, boards, contactMap, profile, user, ownerName, ownerAvatar]);

  // Complex addDeal with contact creation and optimistic updates
  const addDeal = useCallback(async (
    deal: Omit<Deal, 'id' | 'createdAt'>,
    relatedData?: { contact?: Partial<Contact> }
  ) => {
    const optimisticTempId = `temp-${Date.now()}`;
    const optimisticBoardId = deal.boardId || '';
    const optimisticStageId = deal.status || '';
    const optimisticStageLabel =
      activeBoard?.stages?.find((s) => s.id === optimisticStageId)?.label || 'Estágio não identificado';
    const optimisticContactName = (relatedData?.contact?.name || 'Sem contato').trim() || 'Sem contato';
    const optimisticContactEmail = (relatedData?.contact?.email || '').trim();
    const optimisticContactPhone = (relatedData?.contact?.phone || '').trim();

    if (optimisticBoardId) {
      try {
        const optimisticDealView: DealView = {
          ...deal,
          id: optimisticTempId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contactId: deal.contactId || '',
          contactName: optimisticContactName,
          contactEmail: optimisticContactEmail,
          contactPhone: optimisticContactPhone,
          contactTags: [],
          contactCustomFields: {},
          stageLabel: optimisticStageLabel,
        } as DealView;
        queryClient.setQueryData<DealView[]>(
          [...queryKeys.deals.lists(), 'view'],
          (old = []) => [optimisticDealView, ...old]
        );
      } catch (e) { /* Never break deal creation */ }
    }

    let finalContactId = deal.contactId;

    // Se deal.contactId já está preenchido (contato existente selecionado), pula a
    // resolução de contato. Sem essa guarda, contatos sem email geravam um duplicado
    // com ID diferente, e o card aparecia sem dados após a criação.
    if (!finalContactId && relatedData?.contact && relatedData.contact.name) {
      const existingContact = relatedData.contact.email
        ? contacts.find(c => (c.email || '').toLowerCase() === relatedData.contact!.email!.toLowerCase())
        : undefined;

      if (existingContact) {
        finalContactId = existingContact.id;
      } else {
        let initialStage = 'LEAD';
        if (activeBoard) {
          const targetBoardStage = activeBoard.stages.find(s => s.id === deal.status);
          if (targetBoardStage && targetBoardStage.linkedLifecycleStage) {
            initialStage = targetBoardStage.linkedLifecycleStage;
          }
        }
        const newContact = await addContact({
          name: relatedData.contact.name,
          email: relatedData.contact.email || '',
          phone: relatedData.contact.phone || '',
          status: 'ACTIVE',
          stage: initialStage,
          lastPurchaseDate: '',
          totalValue: 0,
        } as Omit<Contact, 'id' | 'createdAt'>);
        if (newContact) {
          finalContactId = newContact.id;
        }
      }
    }

    const createdDeal = await addDealState({ ...deal, contactId: finalContactId });

    if (optimisticBoardId) {
      try {
        if (createdDeal) {
          const createdDealView: DealView = {
            ...createdDeal,
            contactName: optimisticContactName,
            contactEmail: optimisticContactEmail,
            contactPhone: optimisticContactPhone,
            contactTags: [],
            contactCustomFields: {},
            stageLabel: optimisticStageLabel,
          };
          queryClient.setQueryData<DealView[]>(
            [...queryKeys.deals.lists(), 'view'],
            (old = []) => {
              const withoutTemp = old.filter((d) => d.id !== optimisticTempId);
              const alreadyIndex = withoutTemp.findIndex((d) => d.id === createdDeal.id);
              if (alreadyIndex !== -1) {
                // Realtime já adicionou o deal cru (sem contactName).
                // Enriquece com dados otimistas para evitar "Sem Nome" no card.
                return withoutTemp.map((d, i) =>
                  i === alreadyIndex
                    ? { ...d, contactName: optimisticContactName, contactEmail: optimisticContactEmail, contactPhone: optimisticContactPhone, stageLabel: optimisticStageLabel }
                    : d
                );
              }
              return [createdDealView, ...withoutTemp];
            }
          );
          // Atualiza cache raw também para que DealDetailModal encontre o deal
          // imediatamente sem precisar esperar o Supabase Realtime.
          // Sem isso, selectedDealId fica setado mas o modal retorna null,
          // e clicar no card novamente não dispara re-render (mesmo valor de estado).
          queryClient.setQueryData<Deal[]>(queryKeys.deals.lists(), (old = []) => {
            const withoutTemp = old.filter((d) => d.id !== optimisticTempId);
            if (withoutTemp.findIndex(d => d.id === createdDeal.id) === -1) {
              return [createdDeal, ...withoutTemp];
            }
            return withoutTemp;
          });
        } else {
          queryClient.setQueryData<DealView[]>(
            [...queryKeys.deals.lists(), 'view'],
            (old = []) => old.filter((d) => d.id !== optimisticTempId)
          );
        }
      } catch (e) { /* Ignore */ }
    }

    if (createdDeal) {
      await addActivity({
        dealId: createdDeal.id,
        dealTitle: createdDeal.title,
        type: 'STATUS_CHANGE',
        title: 'Negócio Criado',
        date: new Date().toISOString(),
        user: { name: ownerName, avatar: ownerAvatar },
        completed: true,
      });
    }

    return createdDeal;
  }, [contacts, activeBoard, addContact, addDealState, addActivity, queryClient, ownerName, ownerAvatar]);

  const convertContactToDeal = useCallback(async (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact || !activeBoard || activeBoard.stages.length === 0) return;

    const newDeal: Omit<Deal, 'id' | 'createdAt'> = {
      title: `Negócio com ${contact.name}`,
      contactId: contact.id,
      boardId: activeBoardId,
      value: 0,
      items: [],
      status: activeBoard.stages[0].id,
      updatedAt: new Date().toISOString(),
      probability: 20,
      priority: 'medium',
      owner: { name: ownerName, avatar: ownerAvatar },
      isWon: false,
      isLost: false,
    };

    const createdDeal = await addDealState(newDeal);
    if (createdDeal) {
      await addActivity({
        dealId: createdDeal.id,
        dealTitle: createdDeal.title,
        type: 'STATUS_CHANGE',
        title: 'Convertido de Contato',
        description: `Contato ${contact.name} convertido em oportunidade.`,
        date: new Date().toISOString(),
        user: { name: 'Sistema', avatar: '' },
        completed: true,
      });
    }
  }, [contacts, activeBoard, activeBoardId, addDealState, addActivity]);

  const convertLead = useCallback(async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead || !activeBoard || activeBoard.stages.length === 0) return;

    const newContact = await addContact({
      name: lead.name,
      email: lead.email,
      phone: '',
      status: 'ACTIVE',
      stage: 'LEAD',
      lastPurchaseDate: '',
      totalValue: 0,
      tags: lead.source ? ['Origem: ' + lead.source] : [],
    } as Omit<Contact, 'id' | 'createdAt'>);
    if (!newContact) return;

    const newDeal: Omit<Deal, 'id' | 'createdAt'> = {
      title: `Negócio com ${lead.name}`,
      contactId: newContact.id,
      boardId: activeBoardId,
      value: 0,
      items: [],
      status: activeBoard.stages[0].id,
      updatedAt: new Date().toISOString(),
      probability: 20,
      priority: 'medium',
      owner: { name: ownerName, avatar: ownerAvatar },
      isWon: false,
      isLost: false,
    };

    const createdDeal = await addDealState(newDeal);

    if (!createdDeal) return;

    // Only discard lead after deal is successfully created to prevent data loss
    discardLead(leadId);

    if (createdDeal) {
      await addActivity({
        dealId: createdDeal.id,
        dealTitle: createdDeal.title,
        type: 'STATUS_CHANGE',
        title: 'Convertido de Lead',
        description: `Lead ${lead.name} convertido automaticamente.`,
        date: new Date().toISOString(),
        user: { name: 'Sistema', avatar: '' },
        completed: true,
      });
    }
  }, [leads, activeBoard, activeBoardId, addContact, addDealState, addActivity, discardLead]);

  const checkWalletHealth = useCallback(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const riskyContacts = contacts.filter(c => {
      if (c.status !== 'ACTIVE' || c.stage !== 'CUSTOMER') return false;
      const createdAtTs = Date.parse(c.createdAt);
      if (!c.lastPurchaseDate && !c.lastInteraction) {
        return createdAtTs < thirtyDaysAgo.getTime();
      }
      const lastInteractionTs = c.lastInteraction ? Date.parse(c.lastInteraction) : null;
      const lastPurchaseTs = c.lastPurchaseDate ? Date.parse(c.lastPurchaseDate) : null;
      const lastActivityTs =
        lastInteractionTs != null && lastPurchaseTs != null
          ? Math.max(lastInteractionTs, lastPurchaseTs)
          : lastInteractionTs ?? lastPurchaseTs;
      return lastActivityTs !== null && lastActivityTs < thirtyDaysAgo.getTime();
    });

    const activitiesToCreate = riskyContacts
      .filter(contact => {
        const existingTask = activities.find(
          a => a.title === 'Análise de Carteira: Risco de Churn' && a.description?.includes(contact.name) && !a.completed
        );
        return !existingTask;
      })
      .map(contact => ({
        dealId: '',
        dealTitle: 'Carteira de Clientes',
        type: 'TASK' as const,
        title: 'Análise de Carteira: Risco de Churn',
        description: `O cliente ${contact.name} está inativo há mais de 30 dias.`,
        date: new Date().toISOString(),
        user: { name: 'Sistema', avatar: '' },
        completed: false,
      }));

    if (activitiesToCreate.length > 0) {
      await Promise.all(activitiesToCreate.map(activity => addActivity(activity)));
    }
    return activitiesToCreate.length;
  }, [contacts, activities, addActivity]);

  const checkStagnantDeals = useCallback(async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const stagnantDeals = rawDeals.filter(
      d => !d.isWon && !d.isLost && (!d.lastStageChangeDate || new Date(d.lastStageChangeDate) < tenDaysAgo)
    );
    if (stagnantDeals.length === 0) return 0;

    const activitiesToCreate = stagnantDeals
      .slice(0, 3)
      .filter(deal => {
        const existingAlert = activities.find(
          a => a.dealId === deal.id && a.title === 'Alerta de Estagnação' && !a.completed
        );
        return !existingAlert;
      })
      .map(deal => {
        const board = getBoardById(deal.boardId);
        const stageLabel = board?.stages.find(s => s.id === deal.status)?.label || deal.status;
        return {
          dealId: deal.id,
          dealTitle: deal.title,
          type: 'TASK' as const,
          title: 'Alerta de Estagnação',
          description: `Oportunidade parada em ${stageLabel} há mais de 10 dias.`,
          date: new Date().toISOString(),
          user: { name: 'Sistema', avatar: '' },
          completed: false,
        };
      });

    if (activitiesToCreate.length > 0) {
      await Promise.all(activitiesToCreate.map(activity => addActivity(activity)));
    }
    return stagnantDeals.length;
  }, [rawDeals, activities, addActivity, getBoardById]);

  return {
    // Enriched data
    deals,
    // Cross-domain actions
    addDeal,
    convertContactToDeal,
    convertLead,
    checkWalletHealth,
    checkStagnantDeals,
  };
}
