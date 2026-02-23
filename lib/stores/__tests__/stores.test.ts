import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, useFormStore, useNotificationStore } from '../index';

describe('Zustand stores', () => {
  describe('useUIStore', () => {
    beforeEach(() => {
      useUIStore.setState({
        sidebarOpen: true,
        aiAssistantOpen: false,
        activeModal: null,
        modalData: {},
        globalSearchQuery: '',
        loadingStates: {},
      });
    });

    it('toggleSidebar flips state', () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it('toggleAIAssistant flips state', () => {
      expect(useUIStore.getState().aiAssistantOpen).toBe(false);
      useUIStore.getState().toggleAIAssistant();
      expect(useUIStore.getState().aiAssistantOpen).toBe(true);
    });

    it('setAIAssistantOpen sets value', () => {
      useUIStore.getState().setAIAssistantOpen(true);
      expect(useUIStore.getState().aiAssistantOpen).toBe(true);
    });

    it('openModal / closeModal', () => {
      useUIStore.getState().openModal('deal-edit', { dealId: '123' });
      expect(useUIStore.getState().activeModal).toBe('deal-edit');
      expect(useUIStore.getState().modalData).toEqual({ dealId: '123' });
      useUIStore.getState().closeModal();
      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().modalData).toEqual({});
    });

    it('setGlobalSearchQuery', () => {
      useUIStore.getState().setGlobalSearchQuery('test');
      expect(useUIStore.getState().globalSearchQuery).toBe('test');
    });

    it('setLoading / isLoading', () => {
      useUIStore.getState().setLoading('deals', true);
      expect(useUIStore.getState().isLoading('deals')).toBe(true);
      expect(useUIStore.getState().isLoading('other')).toBe(false);
    });
  });

  describe('useFormStore', () => {
    beforeEach(() => {
      useFormStore.setState({ drafts: {}, submitting: {} });
    });

    it('saveDraft / getDraft', () => {
      useFormStore.getState().saveDraft('form-1', { name: 'test' });
      const draft = useFormStore.getState().getDraft('form-1');
      expect(draft).not.toBeNull();
      expect(draft!.data).toEqual({ name: 'test' });
      expect(draft!.savedAt).toBeGreaterThan(0);
    });

    it('getDraft returns null for missing', () => {
      expect(useFormStore.getState().getDraft('nope')).toBeNull();
    });

    it('clearDraft removes specific draft', () => {
      useFormStore.getState().saveDraft('a', { x: 1 });
      useFormStore.getState().saveDraft('b', { y: 2 });
      useFormStore.getState().clearDraft('a');
      expect(useFormStore.getState().getDraft('a')).toBeNull();
      expect(useFormStore.getState().getDraft('b')).not.toBeNull();
    });

    it('clearAllDrafts', () => {
      useFormStore.getState().saveDraft('a', { x: 1 });
      useFormStore.getState().clearAllDrafts();
      expect(useFormStore.getState().drafts).toEqual({});
    });

    it('setSubmitting / isSubmitting', () => {
      useFormStore.getState().setSubmitting('form-1', true);
      expect(useFormStore.getState().isSubmitting('form-1')).toBe(true);
      expect(useFormStore.getState().isSubmitting('other')).toBe(false);
    });
  });

  describe('useNotificationStore', () => {
    beforeEach(() => {
      useNotificationStore.setState({ notifications: [] });
    });

    it('addNotification adds and returns id', () => {
      const id = useNotificationStore.getState().addNotification({
        type: 'success',
        title: 'Done',
        duration: 0, // persistent
      });
      expect(typeof id).toBe('string');
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
      expect(useNotificationStore.getState().notifications[0].title).toBe('Done');
    });

    it('removeNotification removes by id', () => {
      const id = useNotificationStore.getState().addNotification({
        type: 'error',
        title: 'Oops',
        duration: 0,
      });
      useNotificationStore.getState().removeNotification(id);
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('clearAll removes everything', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A', duration: 0 });
      useNotificationStore.getState().addNotification({ type: 'info', title: 'B', duration: 0 });
      useNotificationStore.getState().clearAll();
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });
});
