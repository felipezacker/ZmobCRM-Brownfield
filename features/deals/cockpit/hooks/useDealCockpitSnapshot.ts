import { useMemo } from 'react';

import type { Activity, Board, Contact, DealView } from '@/types';
import type { DealNote } from '@/lib/supabase/dealNotes';
import type { DealFile } from '@/lib/supabase/dealFiles';
import type { QuickScript } from '@/lib/supabase/quickScripts';
import type { CockpitSnapshot, NextBestAction, Stage } from '../cockpit-types';

type SnapshotDeps = {
  selectedDeal: DealView | null;
  selectedContact: Contact | null;
  selectedBoard: Board | null;
  activeStage: Stage | undefined;
  dealActivities: Activity[];
  notes: DealNote[];
  files: DealFile[];
  scripts: QuickScript[];
  nextBestAction: NextBestAction;
  aiAnalysis: unknown;
  aiLoading: boolean;
  isNotesLoading: boolean;
  isFilesLoading: boolean;
  isScriptsLoading: boolean;
};

export function useDealCockpitSnapshot(deps: SnapshotDeps): CockpitSnapshot | undefined {
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
  } = deps;

  return useMemo(() => {
    if (!selectedDeal) return undefined;

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

    return {
      meta: { generatedAt: new Date().toISOString(), source: 'deal-cockpit', version: 1 },
      deal: {
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
        contactTags: selectedDeal.contactTags,
        items: selectedDeal.items,
        contactCustomFields: selectedDeal.contactCustomFields,
        lastStageChangeDate: selectedDeal.lastStageChangeDate,
        lossReason: selectedDeal.lossReason,
        createdAt: selectedDeal.createdAt,
        updatedAt: selectedDeal.updatedAt,
        stageLabel: selectedDeal.stageLabel,
      },
      contact: contactInfo,
      board: boardInfo,
      stage: stageInfo,
      cockpitSignals: { nextBestAction, aiAnalysis: aiAnalysis ?? null, aiAnalysisLoading: aiLoading },
      lists: {
        activities: {
          total: dealActivities.length,
          preview: dealActivities.slice(0, 25).map((a) => ({ id: a.id, type: a.type, title: a.title, description: a.description, date: a.date, completed: a.completed, user: a.user?.name })),
          limit: 25,
          truncated: dealActivities.length > 25,
        },
        notes: {
          total: notes.length,
          preview: notes.slice(0, 50).map((n) => ({ id: n.id, content: n.content, created_at: n.created_at, updated_at: n.updated_at, created_by: n.created_by })),
          loading: isNotesLoading,
          limit: 50,
          truncated: notes.length > 50,
        },
        files: {
          total: files.length,
          preview: files.slice(0, 50).map((f) => ({ id: f.id, file_name: f.file_name, file_size: f.file_size, mime_type: f.mime_type, file_path: f.file_path, created_at: f.created_at, created_by: f.created_by })),
          loading: isFilesLoading,
          limit: 50,
          truncated: files.length > 50,
        },
        scripts: {
          total: scripts.length,
          preview: scripts.slice(0, 50).map((s) => ({ id: s.id, title: s.title, category: s.category, template: s.template, icon: s.icon, is_system: s.is_system, updated_at: s.updated_at })),
          loading: isScriptsLoading,
          limit: 50,
          truncated: scripts.length > 50,
        },
      },
    };
  }, [selectedDeal, selectedContact, selectedBoard, activeStage, dealActivities, notes, files, scripts, nextBestAction, aiAnalysis, aiLoading, isNotesLoading, isFilesLoading, isScriptsLoading]);
}
