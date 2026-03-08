import { useCallback } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useToast } from '@/context/ToastContext';
import { useInboxMessages } from './useInboxMessages';
import { useInboxFilters } from './useInboxFilters';
import { useInboxActions } from './useInboxActions';

// Re-export types for backward compatibility
export type { AISuggestionType, AISuggestion, ViewMode, FocusItem } from './useInboxMessages';
import type { ViewMode, AISuggestion } from './useInboxMessages';

/**
 * Composition hook that orchestrates the 3 sub-hooks and returns
 * the same API shape as the original monolithic useInboxController.
 */
export const useInboxController = () => {
  const { showToast } = useToast();

  // --- Sub-hook 1: Data layer ---
  const messages = useInboxMessages();

  const activeBoardId = messages.defaultBoard?.id || '';
  const activeBoard = messages.defaultBoard;

  // View mode (persisted)
  const [viewMode, setViewMode] = usePersistedState<ViewMode>('inbox_view_mode', 'overview');

  // --- Sub-hook 2: Filters, suggestions, focus queue, stats, briefing ---
  const filters = useInboxFilters({
    overdueActivities: messages.overdueActivities,
    todayActivities: messages.todayActivities,
    todayMeetings: messages.todayMeetings,
    todayTasks: messages.todayTasks,
    stalledDeals: messages.stalledDeals,
    upsellDeals: messages.upsellDeals,
    rescueContacts: messages.rescueContacts,
    birthdaysThisMonth: messages.birthdaysThisMonth,
  });

  // --- Sub-hook 3: All mutation handlers ---
  const actions = useInboxActions({
    activities: messages.activities,
    aiSuggestions: filters.aiSuggestions,
    activeBoardId,
    activeBoard,
    recordInteraction: filters.recordInteraction,
  });

  // --- Focus mode composite handlers ---
  const handleFocusSkip = useCallback(() => {
    filters.handleFocusNext();
    showToast('Pulado para o proximo', 'info');
  }, [filters.handleFocusNext, showToast]);

  const handleFocusDone = useCallback(() => {
    const item = filters.currentFocusItem;
    if (!item) return;

    if (item.type === 'activity') {
      actions.handleCompleteActivity(item.id);
    } else {
      actions.handleAcceptSuggestion(item.data as AISuggestion);
    }

    if (filters.focusIndex >= filters.focusQueue.length - 1) {
      filters.setFocusIndex(Math.max(0, filters.focusQueue.length - 2));
    }
  }, [
    filters.currentFocusItem,
    filters.focusIndex,
    filters.focusQueue.length,
    filters.setFocusIndex,
    actions.handleCompleteActivity,
    actions.handleAcceptSuggestion,
  ]);

  const handleFocusSnooze = useCallback(() => {
    const item = filters.currentFocusItem;
    if (!item) return;

    if (item.type === 'activity') {
      actions.handleSnoozeActivity(item.id, 1);
    } else {
      actions.handleSnoozeSuggestion(item.id);
    }

    if (filters.focusIndex >= filters.focusQueue.length - 1) {
      filters.setFocusIndex(Math.max(0, filters.focusQueue.length - 2));
    }
  }, [
    filters.currentFocusItem,
    filters.focusIndex,
    filters.focusQueue.length,
    filters.setFocusIndex,
    actions.handleSnoozeActivity,
    actions.handleSnoozeSuggestion,
  ]);

  const handleSelectActivity = useCallback((id: string) => {
    const index = filters.focusQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      filters.setFocusIndex(index);
      setViewMode('focus');
    }
  }, [filters.focusQueue, filters.setFocusIndex, setViewMode]);

  return {
    // Loading
    isLoading: messages.isLoading,

    // View Mode
    viewMode,
    setViewMode,

    // Briefing
    briefing: filters.briefing,
    isGeneratingBriefing: filters.isGeneratingBriefing,

    // Activities
    overdueActivities: messages.overdueActivities,
    todayActivities: messages.todayActivities,
    todayMeetings: messages.todayMeetings,
    todayTasks: messages.todayTasks,
    upcomingActivities: messages.upcomingActivities,

    // AI Suggestions
    aiSuggestions: filters.aiSuggestions,

    // Focus Mode
    focusQueue: filters.focusQueue,
    focusIndex: filters.focusIndex,
    setFocusIndex: filters.setFocusIndex,
    currentFocusItem: filters.currentFocusItem,
    handleFocusNext: filters.handleFocusNext,
    handleFocusPrev: filters.handleFocusPrev,
    handleFocusSkip,
    handleFocusDone,
    handleFocusSnooze,

    // Stats
    stats: filters.stats,
    isInboxZero: filters.isInboxZero,

    // Activity Handlers
    handleCompleteActivity: actions.handleCompleteActivity,
    handleSnoozeActivity: actions.handleSnoozeActivity,
    handleDiscardActivity: actions.handleDiscardActivity,

    // Suggestion Handlers
    handleAcceptSuggestion: actions.handleAcceptSuggestion,
    handleDismissSuggestion: actions.handleDismissSuggestion,
    handleSnoozeSuggestion: actions.handleSnoozeSuggestion,
    seedInboxDebug: actions.seedInboxDebug,
    handleSelectActivity,
  };
};
