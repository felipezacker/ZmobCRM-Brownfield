'use client';

import { useMemo, useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useCRMActions } from '@/hooks/useCRMActions';
import { useContacts } from '@/context/contacts/ContactsContext';
import { useBoards } from '@/context/boards/BoardsContext';
import { useActivities } from '@/context/activities/ActivitiesContext';
import { useUpdateDeal } from '@/lib/query/hooks/useDealsQuery';
import { useMoveDealSimple } from '@/lib/query/hooks';

import { useAIDealAnalysis, deriveHealthFromProbability } from '@/features/inbox/hooks/useAIDealAnalysis';
import { useDealNotes } from '@/features/inbox/hooks/useDealNotes';
import { useDealFiles } from '@/features/inbox/hooks/useDealFiles';
import { useQuickScripts } from '@/features/inbox/hooks/useQuickScripts';

import type { Activity, Board } from '@/types';
import type { Stage, TimelineItem } from '../types';
import { formatAtISO, formatCurrencyBRL, stageToneFromBoardColor } from '../utils';

export function useCockpitDealState(dealId?: string) {
  const { profile, user } = useAuth();
  const { deals } = useCRMActions();
  const { contacts } = useContacts();
  const { boards } = useBoards();
  const { activities, addActivity } = useActivities();
  const { mutate: mutateUpdateDeal } = useUpdateDeal();
  const updateDeal = useCallback((id: string, updates: Partial<import('@/types').Deal>) => {
    mutateUpdateDeal({ id, updates });
  }, [mutateUpdateDeal]);

  const actor = useMemo(() => {
    const name =
      profile?.nickname?.trim() ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      user?.email?.split('@')[0] ||
      'Usu\u00e1rio';

    return {
      name,
      avatar: profile?.avatar_url ?? '',
    };
  }, [profile?.avatar_url, profile?.first_name, profile?.last_name, profile?.nickname, user?.email]);

  const selectedDeal = useMemo(() => {
    if (dealId) return deals.find((d) => d.id === dealId) ?? null;
    return deals[0] ?? null;
  }, [deals, dealId]);

  const sortedDeals = useMemo(() => {
    return (deals ?? []).slice().sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  }, [deals]);

  const selectedContact = useMemo(() => {
    if (!selectedDeal) return null;
    return contacts.find((c) => c.id === selectedDeal.contactId) ?? null;
  }, [contacts, selectedDeal]);

  const selectedBoard = useMemo(() => {
    if (!selectedDeal) return null;
    return boards.find((b) => b.id === selectedDeal.boardId) ?? null;
  }, [boards, selectedDeal]);

  const templateVariables = useMemo(() => {
    const nome = selectedContact?.name?.split(' ')[0]?.trim() || 'Cliente';
    const valor = typeof selectedDeal?.value === 'number' ? formatCurrencyBRL(selectedDeal.value) : '';
    const produto =
      selectedDeal?.items?.[0]?.name?.trim() ||
      selectedDeal?.title?.trim() ||
      'Produto';

    return { nome, valor, produto };
  }, [selectedContact?.name, selectedDeal?.items, selectedDeal?.title, selectedDeal?.value]);

  const dealActivities = useMemo(() => {
    if (!selectedDeal) return [] as Activity[];
    return (activities ?? [])
      .filter((a) => a.dealId === selectedDeal.id)
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities, selectedDeal]);

  const { moveDeal } = useMoveDealSimple(selectedBoard as Board | null, []);

  const stages: Stage[] = useMemo(() => {
    const ss = selectedBoard?.stages ?? [];
    return ss.map((s) => ({
      id: s.id,
      label: s.label,
      tone: stageToneFromBoardColor(s.color),
      rawColor: s.color,
    }));
  }, [selectedBoard]);

  const stageId = selectedDeal?.status ?? '';
  const stageIndex = Math.max(0, stages.findIndex((s) => s.id === stageId));
  const activeStage = stages.find((s) => s.id === stageId) ?? stages[0];

  const { data: aiAnalysis, isLoading: aiLoading, refetch: refetchAI } = useAIDealAnalysis(
    selectedDeal,
    selectedDeal?.stageLabel
  );

  const health = useMemo(() => {
    const probability = aiAnalysis?.probabilityScore ?? selectedDeal?.probability ?? 50;
    return deriveHealthFromProbability(probability);
  }, [aiAnalysis?.probabilityScore, selectedDeal?.probability]);

  const nextBestAction = useMemo(() => {
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
      reason: 'Sem sugest\u00e3o da IA no momento',
      urgency: 'low' as const,
      actionType: 'TASK' as const,
      isAI: false,
    };
  }, [aiAnalysis]);

  const { notes, isLoading: isNotesLoading, createNote, deleteNote } = useDealNotes(selectedDeal?.id);
  const { files, isLoading: isFilesLoading, uploadFile, deleteFile, downloadFile, formatFileSize } = useDealFiles(selectedDeal?.id);
  const { scripts, isLoading: isScriptsLoading, applyVariables, getCategoryInfo } = useQuickScripts();

  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    for (const a of dealActivities) {
      const kind: TimelineItem['kind'] =
        a.type === 'CALL'
          ? 'call'
          : a.type === 'STATUS_CHANGE'
            ? 'status'
            : 'note';

      const tone: TimelineItem['tone'] =
        a.type === 'STATUS_CHANGE'
          ? `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase().includes('ganh')
            ? 'success'
            : `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase().includes('perd')
              ? 'danger'
              : 'neutral'
          : undefined;

      const subtitle = a.description?.trim() ? a.description.trim() : undefined;

      items.push({
        id: a.id,
        at: formatAtISO(a.date),
        kind,
        title: a.title || a.type,
        subtitle,
        tone,
      });
    }

    return items;
  }, [dealActivities]);

  const latestNonSystem = useMemo(() => timelineItems.find((t) => t.kind !== 'system') ?? null, [timelineItems]);
  const latestCall = useMemo(() => timelineItems.find((t) => t.kind === 'call') ?? null, [timelineItems]);
  const latestMove = useMemo(() => timelineItems.find((t) => t.kind === 'status') ?? null, [timelineItems]);

  return {
    // Auth / actor
    actor,
    // Deal selection
    selectedDeal,
    sortedDeals,
    selectedContact,
    selectedBoard,
    templateVariables,
    dealActivities,
    // Pipeline stages
    stages,
    stageId,
    stageIndex,
    activeStage,
    // AI
    aiAnalysis,
    aiLoading,
    refetchAI,
    health,
    nextBestAction,
    // Notes / Files / Scripts
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
    // Timeline
    timelineItems,
    latestNonSystem,
    latestCall,
    latestMove,
    // Mutations
    moveDeal,
    addActivity,
    updateDeal,
  };
}
