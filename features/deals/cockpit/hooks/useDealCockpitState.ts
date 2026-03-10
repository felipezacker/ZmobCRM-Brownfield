import { useEffect, useMemo, useState, useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useDeals } from '@/context/deals/DealsContext';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useSettings } from '@/context/settings/SettingsContext';
import { useMoveDealSimple } from '@/lib/query/hooks';
import { supabase } from '@/lib/supabase/client';
import { calculateEstimatedCommission } from '@/lib/supabase';
import { contactPreferencesService } from '@/lib/supabase/contact-preferences';

import { useAIDealAnalysis, deriveHealthFromProbability } from '@/features/inbox/hooks/useAIDealAnalysis';
import { useDealNotes } from '@/features/inbox/hooks/useDealNotes';
import { useDealFiles } from '@/features/inbox/hooks/useDealFiles';
import { useQuickScripts } from '@/features/inbox/hooks/useQuickScripts';

import type { Activity, Board, BoardStage, ContactPreference, DealView } from '@/types';
import type {
  Actor,
  ChecklistItem,
  NextBestAction,
  Stage,
  TimelineItem,
} from '../cockpit-types';
import {
  formatAtISO,
  formatCurrencyBRL,
  stageToneFromBoardColor,
} from '../cockpit-utils';

export function useDealCockpitState(dealId?: string) {
  const { profile, user } = useAuth();
  const { deals } = useCRMActions();
  const dealsCtx = useDeals();
  const { updateDeal, addItemToDeal, removeItemFromDeal } = dealsCtx;
  const { contacts, updateContact } = useContacts();
  const { boards } = useBoards();
  const activitiesCtx = useActivities();
  const { activities, addActivity } = activitiesCtx;
  const crmLoading = dealsCtx.loading || activitiesCtx.loading;
  const crmError = dealsCtx.error || activitiesCtx.error;
  const refreshCRM = useCallback(async () => {
    await dealsCtx.refresh();
    await activitiesCtx.refresh();
  }, [dealsCtx, activitiesCtx]);

  const { customFieldDefinitions, products } = useSettings();

  // Broker commission rate (fetched from profiles for the deal owner)
  const [brokerCommissionRate, setBrokerCommissionRate] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<ContactPreference | null>(null);

  // --- Actor ---
  const actor: Actor = useMemo(() => {
    const name =
      profile?.nickname?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      user?.email?.split('@')[0] ||
      'Usuário';
    return { name, avatar: profile?.avatar_url ?? '' };
  }, [profile?.avatar_url, profile?.first_name, profile?.last_name, profile?.nickname, user?.email]);

  // --- Lookup maps ---
  const dealsById = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const contactsById = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  const boardsById = useMemo(() => new Map(boards.map((b) => [b.id, b])), [boards]);

  const activitiesByDealIdSorted = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities ?? []) {
      if (!a.dealId) continue;
      const list = map.get(a.dealId);
      if (list) list.push(a);
      else map.set(a.dealId, [a]);
    }
    for (const [, list] of map) {
      list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    }
    return map;
  }, [activities]);

  // --- Selection ---
  const selectedDeal = useMemo(() => {
    if (dealId) return dealsById.get(dealId) ?? null;
    return deals[0] ?? null;
  }, [deals, dealsById, dealId]);

  const sortedDeals = useMemo(() => {
    return (deals ?? []).slice().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [deals]);

  const selectedContact = useMemo(() => {
    if (!selectedDeal) return null;
    return contactsById.get(selectedDeal.contactId) ?? null;
  }, [contactsById, selectedDeal]);

  const selectedBoard = useMemo(() => {
    if (!selectedDeal) return null;
    return boardsById.get(selectedDeal.boardId) ?? null;
  }, [boardsById, selectedDeal]);

  // --- Broker commission ---
  useEffect(() => {
    const ownerId = selectedDeal?.ownerId;
    if (!ownerId || !supabase) {
      setBrokerCommissionRate(null);
      return;
    }
    if (ownerId === user?.id) {
      setBrokerCommissionRate(profile?.commission_rate ?? null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('commission_rate')
      .eq('id', ownerId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setBrokerCommissionRate(data?.commission_rate ?? null);
      });
    return () => { cancelled = true; };
  }, [selectedDeal?.ownerId, user?.id, profile?.commission_rate]);

  // --- Contact preferences ---
  useEffect(() => {
    if (!selectedContact?.id) { setPreferences(null); return; }
    let cancelled = false;
    contactPreferencesService.getByContactId(selectedContact.id)
      .then(({ data }) => { if (!cancelled) setPreferences(data?.[0] ?? null); })
      .catch(err => console.error('[Cockpit] fetch preferences failed:', err));
    return () => { cancelled = true; };
  }, [selectedContact?.id]);

  // --- Commission calculation ---
  const estimatedCommission = useMemo(() => {
    if (!selectedDeal) return null;
    return calculateEstimatedCommission(
      selectedDeal.value,
      selectedDeal.commissionRate,
      brokerCommissionRate,
    );
  }, [selectedDeal, brokerCommissionRate]);

  // --- Template variables ---
  const templateVariables = useMemo(() => {
    const nome = selectedContact?.name?.split(' ')[0]?.trim() || 'Cliente';
    const valor = typeof selectedDeal?.value === 'number' ? formatCurrencyBRL(selectedDeal.value) : '';
    const produto = selectedDeal?.items?.[0]?.name?.trim() || selectedDeal?.title?.trim() || 'Produto';
    return { nome, valor, produto };
  }, [selectedContact?.name, selectedDeal?.items, selectedDeal?.title, selectedDeal?.value]);

  // --- Deal activities ---
  const dealActivities = useMemo(() => {
    if (!selectedDeal) return [] as Activity[];
    return activitiesByDealIdSorted.get(selectedDeal.id) ?? [];
  }, [activitiesByDealIdSorted, selectedDeal]);

  // --- Move deal ---
  const { moveDeal } = useMoveDealSimple(selectedBoard as Board | null, []);

  // --- Stages ---
  const stages: Stage[] = useMemo(() => {
    const ss: BoardStage[] = selectedBoard?.stages ?? [];
    return ss.map((s) => ({
      id: s.id,
      label: s.label,
      tone: stageToneFromBoardColor(s.color),
      rawColor: s.color,
    }));
  }, [selectedBoard]);

  const stageId = selectedDeal?.status ?? '';
  const stageSelection = useMemo(() => {
    if (!stages.length) return { stageIndex: 0, activeStage: undefined as Stage | undefined };
    let idx = 0;
    for (let i = 0; i < stages.length; i += 1) {
      if (stages[i]?.id === stageId) { idx = i; break; }
    }
    return { stageIndex: Math.max(0, idx), activeStage: stages[idx] ?? stages[0] };
  }, [stageId, stages]);
  const stageIndex = stageSelection.stageIndex;
  const activeStage = stageSelection.activeStage ?? stages[0];

  // --- AI analysis ---
  const { data: aiAnalysis, isLoading: aiLoading, refetch: refetchAI } = useAIDealAnalysis(
    selectedDeal,
    selectedDeal?.stageLabel,
  );

  const health = useMemo(() => {
    const probability = aiAnalysis?.probabilityScore ?? selectedDeal?.probability ?? 50;
    return deriveHealthFromProbability(probability);
  }, [aiAnalysis?.probabilityScore, selectedDeal?.probability]);

  const nextBestAction: NextBestAction = useMemo(() => {
    if (aiAnalysis?.action && !aiAnalysis.error) {
      return {
        action: aiAnalysis.action,
        reason: aiAnalysis.reason,
        urgency: aiAnalysis.urgency,
        actionType: aiAnalysis.actionType,
        isAI: true,
      };
    }
    return {
      action: 'Analisar deal manualmente',
      reason: 'Sem sugestão da IA no momento',
      urgency: 'low',
      actionType: 'TASK',
      isAI: false,
    };
  }, [aiAnalysis]);

  // --- Notes / files / scripts ---
  const { notes, isLoading: isNotesLoading, createNote, deleteNote } = useDealNotes(selectedDeal?.id);
  const { files, isLoading: isFilesLoading, uploadFile, deleteFile, downloadFile, formatFileSize } = useDealFiles(selectedDeal?.id);
  const { scripts, isLoading: isScriptsLoading, applyVariables, getCategoryInfo } = useQuickScripts();

  // --- Timeline ---
  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    for (const a of dealActivities) {
      const kind: TimelineItem['kind'] = a.type === 'CALL' ? 'call' : a.type === 'STATUS_CHANGE' ? 'status' : 'note';
      const tone: TimelineItem['tone'] =
        a.type === 'STATUS_CHANGE'
          ? `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase().includes('ganh') ? 'success'
            : `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase().includes('perd') ? 'danger' : 'neutral'
          : undefined;
      const subtitle = a.description?.trim() ? a.description.trim() : undefined;
      items.push({ id: a.id, at: formatAtISO(a.date), sortKey: a.date, kind, title: a.title || a.type, subtitle, tone });
    }
    return items;
  }, [dealActivities]);

  return {
    // Auth
    profile,
    user,

    // CRM state
    deals,
    crmLoading,
    crmError,
    refreshCRM,
    customFieldDefinitions,
    products,

    // CRM actions (pass-through)
    updateDeal,
    addItemToDeal,
    removeItemFromDeal,
    updateContact,
    addActivity,

    // Selection
    selectedDeal,
    selectedContact,
    selectedBoard,
    sortedDeals,

    // Derived
    actor,
    stages,
    stageIndex,
    activeStage,
    dealActivities,
    timelineItems,
    estimatedCommission,
    templateVariables,

    // Preferences
    preferences,
    setPreferences,

    // AI
    aiAnalysis,
    aiLoading,
    refetchAI,
    health,
    nextBestAction,

    // Notes / files / scripts
    notes,
    isNotesLoading,
    createNote,
    deleteNote,
    files,
    isFilesLoading,
    uploadFile,
    deleteFile,
    downloadFile,
    formatFileSize,
    scripts,
    isScriptsLoading,
    applyVariables,
    getCategoryInfo,

    // Move deal
    moveDeal,
  };
}
