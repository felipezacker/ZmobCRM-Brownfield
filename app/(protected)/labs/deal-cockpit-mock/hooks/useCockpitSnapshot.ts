'use client';

import { useMemo } from 'react';
import type { useCockpitDealState } from './useCockpitDealState';

type DealState = ReturnType<typeof useCockpitDealState>;

export function useCockpitSnapshot(state: {
  selectedDeal: DealState['selectedDeal'];
  selectedContact: DealState['selectedContact'];
  selectedBoard: DealState['selectedBoard'];
  activeStage: DealState['activeStage'];
  dealActivities: DealState['dealActivities'];
  notes: DealState['notes'];
  files: DealState['files'];
  scripts: DealState['scripts'];
  nextBestAction: DealState['nextBestAction'];
  aiAnalysis: DealState['aiAnalysis'];
  aiLoading: DealState['aiLoading'];
  isNotesLoading: DealState['isNotesLoading'];
  isFilesLoading: DealState['isFilesLoading'];
  isScriptsLoading: DealState['isScriptsLoading'];
}) {
  const {
    selectedDeal,
    selectedContact,
    selectedBoard,
    activeStage,
    dealActivities,
    notes,
    files,
    scripts,
    nextBestAction,
    aiAnalysis,
    aiLoading,
    isNotesLoading,
    isFilesLoading,
    isScriptsLoading,
  } = state;

  const cockpitSnapshot = useMemo(() => {
    if (!selectedDeal) return null;

    const stageInfo = activeStage
      ? { id: activeStage.id, label: activeStage.label, color: activeStage.rawColor ?? '' }
      : undefined;

    const boardInfo = selectedBoard
      ? {
        id: selectedBoard.id,
        name: selectedBoard.name,
        description: selectedBoard.description,
        wonStageId: selectedBoard.wonStageId,
        lostStageId: selectedBoard.lostStageId,
        stages: (selectedBoard.stages ?? []).map((s) => ({ id: s.id, label: s.label, color: s.color })),
      }
      : undefined;

    const contactInfo = selectedContact
      ? {
        id: selectedContact.id,
        name: selectedContact.name,
        email: selectedContact.email,
        phone: selectedContact.phone,
        avatar: selectedContact.avatar,
        status: selectedContact.status,
        stage: selectedContact.stage,
        source: selectedContact.source,
        notes: selectedContact.notes,
        lastInteraction: selectedContact.lastInteraction,
        birthDate: selectedContact.birthDate,
        lastPurchaseDate: selectedContact.lastPurchaseDate,
        totalValue: selectedContact.totalValue,
      }
      : undefined;

    const dealInfo = {
      id: selectedDeal.id,
      title: selectedDeal.title,
      value: selectedDeal.value,
      status: selectedDeal.status,
      isWon: selectedDeal.isWon,
      isLost: selectedDeal.isLost,
      probability: selectedDeal.probability,
      priority: selectedDeal.priority,
      owner: selectedDeal.owner,
      ownerId: selectedDeal.ownerId,
      nextActivity: selectedDeal.nextActivity,
      contactTags: selectedDeal.contactTags || [],
      items: selectedDeal.items,
      contactCustomFields: selectedDeal.contactCustomFields || {},
      lastStageChangeDate: selectedDeal.lastStageChangeDate,
      lossReason: selectedDeal.lossReason,
      createdAt: selectedDeal.createdAt,
      updatedAt: selectedDeal.updatedAt,
      stageLabel: selectedDeal.stageLabel,
    };

    const activitiesLimit = 25;
    const activitiesPreview = (dealActivities ?? []).slice(0, activitiesLimit).map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      date: a.date,
      completed: a.completed,
      user: a.user?.name,
    }));

    const notesLimit = 50;
    const notesPreview = (notes ?? []).slice(0, notesLimit).map((n) => ({
      id: n.id,
      content: n.content,
      created_at: n.created_at,
      updated_at: n.updated_at,
      created_by: n.created_by,
    }));

    const filesLimit = 50;
    const filesPreview = (files ?? []).slice(0, filesLimit).map((f) => ({
      id: f.id,
      file_name: f.file_name,
      file_size: f.file_size,
      mime_type: f.mime_type,
      file_path: f.file_path,
      created_at: f.created_at,
      created_by: f.created_by,
    }));

    const scriptsLimit = 50;
    const scriptsPreview = (scripts ?? []).slice(0, scriptsLimit).map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      template: s.template,
      icon: s.icon,
      is_system: s.is_system,
      updated_at: s.updated_at,
    }));

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        source: 'labs-deal-cockpit-mock',
        version: 1,
      },
      deal: dealInfo,
      contact: contactInfo,
      board: boardInfo,
      stage: stageInfo,
      cockpitSignals: {
        nextBestAction,
        aiAnalysis: aiAnalysis ?? null,
        aiAnalysisLoading: aiLoading,
      },
      lists: {
        activities: {
          total: (dealActivities ?? []).length,
          preview: activitiesPreview,
          limit: activitiesLimit,
          truncated: (dealActivities ?? []).length > activitiesLimit,
        },
        notes: {
          total: (notes ?? []).length,
          preview: notesPreview,
          loading: isNotesLoading,
          limit: notesLimit,
          truncated: (notes ?? []).length > notesLimit,
        },
        files: {
          total: (files ?? []).length,
          preview: filesPreview,
          loading: isFilesLoading,
          limit: filesLimit,
          truncated: (files ?? []).length > filesLimit,
        },
        scripts: {
          total: (scripts ?? []).length,
          preview: scriptsPreview,
          loading: isScriptsLoading,
          limit: scriptsLimit,
          truncated: (scripts ?? []).length > scriptsLimit,
        },
      },
    };
  }, [
    selectedDeal,
    selectedContact,
    selectedBoard,
    activeStage,
    dealActivities,
    notes,
    files,
    scripts,
    nextBestAction,
    aiAnalysis,
    aiLoading,
    isNotesLoading,
    isFilesLoading,
    isScriptsLoading,
  ]);

  return cockpitSnapshot;
}
