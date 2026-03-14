import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';

import { DealDetailModal } from '@/features/boards/components/deal-detail';

// Keep this test focused: we only want to ensure opening/closing the modal
// never crashes due to hook-order issues (React error #310).

vi.mock('@/hooks/useResponsiveMode', () => ({
  useResponsiveMode: () => ({ mode: 'desktop' }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', role: 'admin', email: 'test@example.com', organization_id: 'org-1' },
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
  useOptionalToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/query/hooks', () => ({
  useMoveDealSimple: () => ({ moveDeal: vi.fn() }),
  useDeal: () => ({ data: null }),
}));

vi.mock('@/lib/a11y', () => ({
  FocusTrap: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFocusReturn: () => undefined,
}));

vi.mock('@/components/ConfirmModal', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/LossReasonModal', () => ({
  LossReasonModal: () => null,
}));

vi.mock('../DealSheet', () => ({
  DealSheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../StageProgressBar', () => ({
  StageProgressBar: () => null,
}));

vi.mock('@/features/activities/components/ActivityRow', () => ({
  ActivityRow: () => null,
}));

vi.mock('@/components/ui/CorretorSelect', () => ({
  CorretorSelect: () => null,
}));

vi.mock('@/lib/ai/tasksClient', () => ({
  analyzeLead: vi.fn(),
  generateEmailDraft: vi.fn(),
  generateObjectionResponse: vi.fn(),
}));

vi.mock('@/hooks/useOrganizationMembers', () => ({
  useOrganizationMembers: () => ({ members: [], loading: false }),
}));

vi.mock('@/lib/realtime/useRealtimeSync', () => ({
  useRealtimeSync: () => undefined,
}));

vi.mock('@/lib/query/hooks/useContactsQuery', () => ({
  useContact: () => ({ data: { id: 'contact-1', name: 'Fulano', email: 'fulano@example.com', phone: '' } }),
}));

const mockBoard = {
  id: 'board-1',
  name: 'Pipeline de Vendas',
  stages: [
    { id: 'stage-1', label: 'Novo', order: 0, linkedLifecycleStage: 'MQL' },
  ],
  wonStageId: null,
  lostStageId: null,
  wonStayInStage: false,
  lostStayInStage: false,
  defaultProductId: null,
  agentPersona: null,
  goal: null,
};

const mockDeal = {
  id: 'deal-1',
  title: 'Pequeno Chapéu',
  value: 1000,
  status: 'stage-1',
  boardId: 'board-1',
  contactId: 'contact-1',
  contactName: 'Fulano',
  contactEmail: 'fulano@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  probability: 50,
  items: [],
  contactTags: [],
  contactCustomFields: {},
  isWon: false,
  isLost: false,
  closedAt: undefined,
  lossReason: undefined,
};

vi.mock('@/hooks/useCRMActions', () => ({
  useCRMActions: () => ({
    deals: [mockDeal],
    addDeal: vi.fn(),
    convertContactToDeal: vi.fn(),
    convertLead: vi.fn(),
    checkWalletHealth: vi.fn(),
    checkStagnantDeals: vi.fn(),
  }),
}));

vi.mock('@/lib/query/hooks/useDealsQuery', () => ({
  useDeals: () => ({ data: [mockDeal], isLoading: false, error: null, refetch: vi.fn() }),
  useUpdateDeal: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteDeal: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useAddDealItem: () => ({ mutateAsync: vi.fn() }),
  useRemoveDealItem: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/context/contacts/ContactsContext', () => ({
  useContacts: () => ({
    contacts: [{ id: 'contact-1', stage: null }],
    contactMap: { 'contact-1': { id: 'contact-1', name: 'Fulano', stage: null } },
  }),
}));

vi.mock('@/context/activities/ActivitiesContext', () => ({
  useActivities: () => ({
    activities: [],
    addActivity: vi.fn(),
    updateActivity: vi.fn(),
    deleteActivity: vi.fn(),
    toggleActivityCompletion: vi.fn(),
  }),
}));

vi.mock('@/context/boards/BoardsContext', () => ({
  useBoards: () => ({
    boards: [mockBoard],
    activeBoard: mockBoard,
    activeBoardId: 'board-1',
    getBoardById: () => mockBoard,
  }),
}));

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    products: [],
    customFieldDefinitions: [],
    lifecycleStages: [],
  }),
}));

describe('DealDetailModal', () => {
  it('does not crash when toggling open/close (hook order regression)', async () => {
    const { rerender } = render(
      <DealDetailModal dealId="deal-1" isOpen={false} onClose={() => {}} />
    );

    expect(document.body.textContent).not.toContain('Application error');

    await act(async () => {
      rerender(<DealDetailModal dealId="deal-1" isOpen={true} onClose={() => {}} />);
    });
    expect(document.body.textContent).toContain('Fulano');

    await act(async () => {
      rerender(<DealDetailModal dealId="deal-1" isOpen={false} onClose={() => {}} />);
    });
    expect(document.body.textContent).not.toContain('Application error');
  });
});


