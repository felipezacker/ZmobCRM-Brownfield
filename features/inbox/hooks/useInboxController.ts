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

  // Destructure stable references from sub-hooks for use in callbacks
  const {
    handleFocusNext: filtersHandleFocusNext,
    currentFocusItem,
    focusIndex,
    focusQueue,
    setFocusIndex,
  } = filters;
  const {
    handleCompleteActivity,
    handleAcceptSuggestion,
    handleSnoozeActivity: actionsHandleSnoozeActivity,
    handleSnoozeSuggestion: actionsHandleSnoozeSuggestion,
  } = actions;

  // --- Focus mode composite handlers ---
  const handleFocusSkip = useCallback(() => {
    filtersHandleFocusNext();
    showToast('Pulado para o proximo', 'info');
  }, [filtersHandleFocusNext, showToast]);

  const handleFocusDone = useCallback(() => {
    const item = currentFocusItem;
    if (!item) return;

    if (item.type === 'activity') {
      handleCompleteActivity(item.id);
    } else {
      handleAcceptSuggestion(item.data as AISuggestion);
    }

    if (focusIndex >= focusQueue.length - 1) {
      setFocusIndex(Math.max(0, focusQueue.length - 2));
    }
  }, [
    currentFocusItem,
    focusIndex,
    focusQueue.length,
    setFocusIndex,
    handleCompleteActivity,
    handleAcceptSuggestion,
  ]);

  const handleFocusSnooze = useCallback(() => {
    const item = currentFocusItem;
    if (!item) return;

    if (item.type === 'activity') {
      actionsHandleSnoozeActivity(item.id, 1);
    } else {
      actionsHandleSnoozeSuggestion(item.id);
    }

    if (focusIndex >= focusQueue.length - 1) {
      setFocusIndex(Math.max(0, focusQueue.length - 2));
    }
  }, [
    currentFocusItem,
    focusIndex,
    focusQueue.length,
    setFocusIndex,
    actionsHandleSnoozeActivity,
    actionsHandleSnoozeSuggestion,
  ]);

  const handleSelectActivity = useCallback((id: string) => {
    const index = focusQueue.findIndex(item => item.id === id);
    if (index !== -1) {
      setFocusIndex(index);
      setViewMode('focus');
    }
  }, [focusQueue, setFocusIndex, setViewMode]);

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
