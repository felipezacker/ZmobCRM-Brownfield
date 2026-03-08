import { useCallback } from 'react';
import { Activity } from '@/types';
import type { ParsedAction } from '@/types/aiActions';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useCreateActivity, useUpdateActivity, useDeleteActivity } from '@/lib/query/hooks/useActivitiesQuery';
import { useCreateContact, useUpdateContact } from '@/lib/query/hooks/useContactsQuery';
import { useCreateDeal } from '@/lib/query/hooks/useDealsQuery';
import { SuggestionType } from '@/lib/supabase/aiSuggestions';
import { isDebugMode, generateFakeContacts, fakeDeal } from '@/lib/debug';
import { supabase } from '@/lib/supabase/client';
import type { AISuggestion } from './useInboxMessages';

interface UseInboxActionsParams {
  activities: Activity[];
  aiSuggestions: AISuggestion[];
  activeBoardId: string;
  activeBoard: { id: string; stages: { id: string; [k: string]: any }[] } | null | undefined;
  recordInteraction: { mutate: (data: any) => void };
}

/** Extract entity info from a suggestion (shared by dismiss/snooze). */
function resolveSuggestionEntity(suggestion: AISuggestion | undefined, suggestionId: string) {
  const sType = (suggestion?.type || suggestionId.slice(0, suggestionId.indexOf('-') === -1 ? undefined : suggestionId.indexOf('-')))
    .toString().toUpperCase() as SuggestionType;
  const eId = suggestion?.data.deal?.id || suggestion?.data.contact?.id
    || (suggestionId.includes('-') ? suggestionId.slice(suggestionId.indexOf('-') + 1) : '');
  const eType: 'deal' | 'contact' = suggestion?.data.deal ? 'deal' : suggestion?.data.contact ? 'contact' : (sType === 'RESCUE' ? 'contact' : 'deal');
  return { sType, eId, eType };
}

const USER = { name: 'Eu', avatar: '' };

/** Sub-hook: all mutation handlers for inbox actions. */
export const useInboxActions = ({ activities, aiSuggestions, activeBoardId, activeBoard, recordInteraction }: UseInboxActionsParams) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const createAct = useCreateActivity();
  const updateAct = useUpdateActivity();
  const deleteAct = useDeleteActivity();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const createDeal = useCreateDeal();

  const handleCreateAction = useCallback((action: ParsedAction) => {
    createAct.mutate({ activity: { title: action.title, type: action.type, description: '', date: action.date || new Date().toISOString(), dealId: '', dealTitle: '', completed: false, user: USER } });
    showToast(`Atividade criada: ${action.title}`, 'success');
  }, [createAct, showToast]);

  const handleCompleteActivity = useCallback((id: string) => {
    const a = activities.find(x => x.id === id);
    if (a) updateAct.mutate({ id, updates: { completed: !a.completed } }, { onSuccess: () => showToast(a.completed ? 'Atividade reaberta' : 'Atividade concluida!', 'success') });
  }, [activities, updateAct, showToast]);

  const handleSnoozeActivity = useCallback((id: string, days = 1) => {
    const a = activities.find(x => x.id === id);
    if (!a) return;
    const nd = new Date(a.date); nd.setDate(nd.getDate() + days);
    updateAct.mutate({ id, updates: { date: nd.toISOString() } }, { onSuccess: () => showToast(`Adiado para ${nd.toLocaleDateString('pt-BR')}`, 'success') });
  }, [activities, updateAct, showToast]);

  const handleDiscardActivity = useCallback((id: string) => {
    deleteAct.mutate(id, { onSuccess: () => showToast('Atividade removida', 'info') });
  }, [deleteAct, showToast]);

  const handleAcceptSuggestion = useCallback((s: AISuggestion) => {
    if (s.type === 'UPSELL' && s.data.deal && activeBoard) {
      const d = s.data.deal;
      createDeal.mutate({ title: `Renovacao/Upsell: ${d.title}`, boardId: activeBoardId, status: activeBoard.stages[0]?.id || 'NEW', value: Math.round(d.value * 1.2), probability: 30, priority: 'medium', contactId: d.contactId, items: [], owner: USER, isWon: false, isLost: false });
      showToast('Oportunidade de Upsell criada!', 'success');
    } else if (s.type === 'STALLED' && s.data.deal) {
      const d = s.data.deal, due = new Date(); due.setDate(due.getDate() + 1); due.setHours(10, 0, 0, 0);
      createAct.mutate({ activity: { title: `Follow-up: ${d.title}`, type: 'TASK', description: 'Deal parado \u2014 fazer follow-up para destravar o proximo passo', date: due.toISOString(), dealId: d.id, contactId: d.contactId, participantContactIds: d.contactId ? [d.contactId] : [], dealTitle: d.title, completed: false, user: USER } });
      showToast('Follow-up criado para reativar o negocio', 'success');
    } else if (s.type === 'RESCUE' && s.data.contact) {
      const c = s.data.contact;
      createAct.mutate({ activity: { title: `Reativar cliente: ${c.name}`, type: 'CALL', description: 'Cliente em risco de churn - ligar para reativar', date: new Date().toISOString(), dealId: '', contactId: c.id, participantContactIds: [c.id], dealTitle: '', completed: false, user: USER } });
      showToast('Tarefa de reativacao criada!', 'success');
    }
    const eType = s.data.deal ? 'deal' : 'contact';
    recordInteraction.mutate({ suggestionType: s.type as SuggestionType, entityType: eType, entityId: s.data.deal?.id || s.data.contact?.id || '', action: 'ACCEPTED' });
  }, [activeBoard, activeBoardId, createAct, createDeal, recordInteraction, showToast]);

  const handleDismissSuggestion = useCallback((sid: string) => {
    const { sType, eId, eType } = resolveSuggestionEntity(aiSuggestions.find(x => x.id === sid), sid);
    if (!eId) return;
    recordInteraction.mutate({ suggestionType: sType, entityType: eType, entityId: eId, action: 'DISMISSED' });
    showToast('Sugestao descartada', 'info');
  }, [aiSuggestions, recordInteraction, showToast]);

  const handleSnoozeSuggestion = useCallback((sid: string) => {
    const { sType, eId, eType } = resolveSuggestionEntity(aiSuggestions.find(x => x.id === sid), sid);
    if (!eId) return;
    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
    recordInteraction.mutate({ suggestionType: sType, entityType: eType, entityId: eId, action: 'SNOOZED', snoozedUntil: tmrw });
    showToast('Sugestao adiada para amanha', 'info');
  }, [aiSuggestions, recordInteraction, showToast]);

  const seedInboxDebug = useCallback(async () => {
    if (!isDebugMode()) { showToast('Ative o Debug Mode para usar o Seed Inbox.', 'info'); return; }
    if (!supabase || !profile?.id || !activeBoardId || !activeBoard?.stages?.length) { showToast('Supabase/board nao configurado para seed.', 'error'); return; }
    try {
      const now = new Date(), ago40 = new Date(now), ago10 = new Date(now);
      ago40.setDate(ago40.getDate() - 40); ago10.setDate(ago10.getDate() - 10);
      const [sc] = generateFakeContacts(1);
      const cc = await createContact.mutateAsync({ name: sc.name, email: sc.email, phone: sc.phone, status: 'ACTIVE', stage: 'CUSTOMER', totalValue: 0 } as any);
      await supabase.from('contacts').update({ created_at: ago40.toISOString() }).eq('id', cc.id);
      const stg = activeBoard!.stages[0];
      const ud = await createDeal.mutateAsync({ title: `Upsell - ${fakeDeal().title}`, contactId: cc.id, boardId: activeBoardId, status: stg.id, value: 12000, probability: 90, priority: 'high', items: [], owner: USER, isWon: true, isLost: false } as any);
      await supabase.from('deals').update({ updated_at: ago40.toISOString(), is_won: true }).eq('id', ud.id);
      const sd = await createDeal.mutateAsync({ title: `Stalled - ${fakeDeal().title}`, contactId: cc.id, boardId: activeBoardId, status: stg.id, value: 8000, probability: 60, priority: 'medium', items: [], owner: USER, isWon: false, isLost: false } as any);
      await supabase.from('deals').update({ updated_at: ago10.toISOString() }).eq('id', sd.id);
      updateContact.mutate({ id: cc.id, updates: { lastPurchaseDate: ago40.toISOString() } } as any);
      showToast('Seed Inbox criado (Upsell, Stalled, Rescue). Abra a Inbox.', 'success');
    } catch (e) { showToast(`Erro ao seedar Inbox: ${(e as Error).message}`, 'error'); }
  }, [activeBoard, activeBoardId, createContact, createDeal, profile?.id, showToast, updateContact]);

  return { handleCreateAction, handleCompleteActivity, handleSnoozeActivity, handleDiscardActivity, handleAcceptSuggestion, handleDismissSuggestion, handleSnoozeSuggestion, seedInboxDebug };
};
