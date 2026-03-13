import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DealDetailModal } from '@/features/boards/components/deal-detail';
import { runStorySteps } from './storyRunner';

// Story: US-001 — Abrir um deal no Boards
// User Story: Abrir deal no Boards sem crash

vi.mock('@/hooks/useResponsiveMode', () => ({
  useResponsiveMode: () => ({ mode: 'desktop' }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', role: 'admin', email: 'test@example.com', organization_id: 'org-1' },
  }),
}));

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
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

vi.mock('@/features/boards/components/DealSheet', () => ({
  DealSheet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/boards/components/StageProgressBar', () => ({
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
  stages: [{ id: 'stage-1', label: 'Novo', order: 0, linkedLifecycleStage: 'MQL' }],
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

describe('Story — US-001: Abrir deal no Boards', () => {
  it('simula a história e garante que não quebra', async () => {
    const user = userEvent.setup();

    const Harness = ({ open }: { open: boolean }) => (
      <div>
        <DealDetailModal dealId="deal-1" isOpen={open} onClose={() => {}} />
      </div>
    );

    const { rerender } = render(<Harness open={false} />);

    // Step runner: we "open" by rerendering to simulate the user story action that triggers the modal.
    await runStorySteps(user, [
      { kind: 'expectNotText', text: /Application error/i },
    ]);

    await act(async () => {
      rerender(<Harness open={true} />);
    });

    await runStorySteps(user, [
      { kind: 'expectNotText', text: /Application error/i },
    ]);
    expect(document.body.textContent).toContain('Fulano');

    await act(async () => {
      rerender(<Harness open={false} />);
    });
    expect(document.body.textContent).not.toMatch(/Application error/i);
  });
});


