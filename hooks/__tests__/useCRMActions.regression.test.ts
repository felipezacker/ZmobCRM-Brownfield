/**
 * Regression tests for useCRMActions cross-domain logic.
 *
 * These tests verify the API surface that consumers depend on.
 * After CRMContext split (TD-4.1), these MUST continue to pass
 * with the new domain-specific hooks.
 *
 * Covers:
 * - Task 1.1: Criar deal no pipeline (addDeal + contact auto-creation)
 * - Task 1.2: Move deal (useMoveDeal — separate hook, tested separately)
 * - Task 1.3: Editar contato (updateContact passthrough)
 * - Task 1.4: Criar atividade (addActivity passthrough)
 * - Task 1.5: View projection (deals DealView enrichment)
 * - checkWalletHealth & checkStagnantDeals business logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCRMActions } from '../useCRMActions';

// --- Mocks ---

const mockAddContact = vi.fn();
const mockAddDealState = vi.fn();
const mockAddActivity = vi.fn();
const mockUpdateActivity = vi.fn();
const mockDeleteActivity = vi.fn();
const mockToggleActivityCompletion = vi.fn();
const mockDiscardLead = vi.fn();
const mockSetQueryData = vi.fn();

let mockContacts: Array<any> = [];
let mockContactMap: Record<string, any> = {};
let mockRawDeals: Array<any> = [];
let mockBoards: Array<any> = [];
let mockActiveBoard: any = null;
let mockActivities: Array<any> = [];
let mockLeads: Array<any> = [];

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: mockSetQueryData, getQueryData: vi.fn(() => []) }),
}));

vi.mock('@/lib/query', () => ({
  queryKeys: { deals: { lists: () => ['deals', 'list'] } },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', nickname: 'TestUser', first_name: 'Test', avatar_url: '', organization_id: 'org-1' },
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

vi.mock('@/context/deals/DealsContext', () => ({
  useDeals: () => ({
    get rawDeals() { return mockRawDeals; },
    addDeal: mockAddDealState,
    updateDeal: vi.fn(),
    deleteDeal: vi.fn(),
    addItemToDeal: vi.fn(),
    removeItemFromDeal: vi.fn(),
  }),
}));

vi.mock('@/context/contacts/ContactsContext', () => ({
  useContacts: () => ({
    get contacts() { return mockContacts; },
    get contactMap() { return mockContactMap; },
    addContact: mockAddContact,
  }),
}));

vi.mock('@/context/activities/ActivitiesContext', () => ({
  useActivities: () => ({
    get activities() { return mockActivities; },
    addActivity: mockAddActivity,
    updateActivity: mockUpdateActivity,
    deleteActivity: mockDeleteActivity,
    toggleActivityCompletion: mockToggleActivityCompletion,
  }),
}));

vi.mock('@/context/boards/BoardsContext', () => ({
  useBoards: () => ({
    get boards() { return mockBoards; },
    get activeBoard() { return mockActiveBoard; },
    activeBoardId: 'board-1',
    getBoardById: (id: string) => mockBoards.find(b => b.id === id) || null,
  }),
}));

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    get leads() { return mockLeads; },
    discardLead: mockDiscardLead,
  }),
}));

// --- Test data factories ---

const mockBoard = {
  id: 'board-1',
  name: 'Pipeline de Vendas',
  stages: [
    { id: 'stage-new', label: 'Novo', order: 0, linkedLifecycleStage: 'MQL' },
    { id: 'stage-qual', label: 'Qualificado', order: 1, linkedLifecycleStage: 'SQL' },
    { id: 'stage-won', label: 'Ganho', order: 2 },
  ],
};

const baseDeal = {
  title: 'Deal Teste',
  value: 5000,
  probability: 50,
  status: 'stage-new',
  priority: 'medium' as const,
  boardId: 'board-1',
  ownerId: 'user-1',
  isWon: false,
  isLost: false,
  items: [],
  updatedAt: new Date().toISOString(),
};

// --- Tests ---

describe('useCRMActions — Regression Suite (TD-4.1 Baseline)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContacts = [];
    mockContactMap = {};
    mockRawDeals = [];
    mockBoards = [mockBoard];
    mockActiveBoard = mockBoard;
    mockActivities = [];
    mockLeads = [];
    mockAddDealState.mockResolvedValue({ id: 'deal-created', title: 'Deal Teste', boardId: 'board-1', status: 'stage-new' });
    mockAddContact.mockResolvedValue({ id: 'contact-new', name: 'Novo Contato' });
    mockAddActivity.mockResolvedValue({ id: 'activity-1' });
  });

  // ===========================================
  // Task 1.1: Criar deal no pipeline
  // ===========================================
  describe('addDeal — Criar deal no pipeline', () => {
    it('cria deal e registra atividade STATUS_CHANGE', async () => {
      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        const deal = await result.current.addDeal(baseDeal);
        expect(deal).toEqual(expect.objectContaining({ id: 'deal-created' }));
      });

      expect(mockAddDealState).toHaveBeenCalledOnce();
      expect(mockAddActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'STATUS_CHANGE',
          title: 'Negócio Criado',
          dealId: 'deal-created',
        })
      );
    });

    it('cria contato automaticamente quando relatedData.contact fornecido sem contactId', async () => {
      mockAddContact.mockResolvedValue({ id: 'auto-contact-id' });

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.addDeal(
          { ...baseDeal, contactId: '' },
          { contact: { name: 'Auto Contact', email: 'auto@test.com' } }
        );
      });

      expect(mockAddContact).toHaveBeenCalledOnce();
      expect(mockAddDealState).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: 'auto-contact-id' })
      );
    });

    it('usa linkedLifecycleStage do stage do board para novo contato', async () => {
      mockAddContact.mockResolvedValue({ id: 'contact-mql' });

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.addDeal(
          { ...baseDeal, contactId: '', status: 'stage-new' },
          { contact: { name: 'Lead MQL' } }
        );
      });

      expect(mockAddContact).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'MQL' })
      );
    });

    it('insere optimistic deal no cache antes do servidor responder', async () => {
      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.addDeal(baseDeal);
      });

      // Primeiro setQueryData é optimistic insert, segundo é replace com real
      expect(mockSetQueryData).toHaveBeenCalled();
      const firstCall = mockSetQueryData.mock.calls[0];
      expect(firstCall[0]).toEqual(['deals', 'list', 'view']);
    });

    it('aborta e limpa cache se addContact falha', async () => {
      mockAddContact.mockResolvedValue(null);

      const { result } = renderHook(() => useCRMActions());

      await expect(
        act(async () => {
          await result.current.addDeal(
            { ...baseDeal, contactId: '' },
            { contact: { name: 'Fail Contact' } }
          );
        })
      ).rejects.toThrow('Não foi possível criar o contato');

      expect(mockAddDealState).not.toHaveBeenCalled();
    });

    it('não cria atividade se deal creation falha', async () => {
      mockAddDealState.mockResolvedValue(null);

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.addDeal(baseDeal);
      });

      expect(mockAddActivity).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Task 1.3: Editar contato (via convertContactToDeal)
  // ===========================================
  describe('convertContactToDeal — Converter contato em deal', () => {
    it('cria deal com dados do contato e atividade de conversão', async () => {
      mockContacts = [{ id: 'contact-1', name: 'Maria Silva', email: 'maria@test.com' }];
      mockAddDealState.mockResolvedValue({ id: 'converted-deal', title: 'Negócio com Maria Silva' });

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.convertContactToDeal('contact-1');
      });

      expect(mockAddDealState).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Negócio com Maria Silva',
          contactId: 'contact-1',
          boardId: 'board-1',
          status: 'stage-new',
        })
      );
      expect(mockAddActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Convertido de Contato',
          type: 'STATUS_CHANGE',
        })
      );
    });

    it('não faz nada se contato não existe', async () => {
      mockContacts = [];

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.convertContactToDeal('nonexistent');
      });

      expect(mockAddDealState).not.toHaveBeenCalled();
    });

    it('não faz nada se activeBoard não tem stages', async () => {
      mockContacts = [{ id: 'contact-1', name: 'Test' }];
      mockActiveBoard = { ...mockBoard, stages: [] };

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.convertContactToDeal('contact-1');
      });

      expect(mockAddDealState).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Task 1.4: Criar atividade (via convertLead)
  // ===========================================
  describe('convertLead — Lead → Contact → Deal pipeline', () => {
    it('cria contato + deal + atividade e descarta lead', async () => {
      mockLeads = [{ id: 'lead-1', name: 'João Lead', email: 'joao@lead.com', source: 'Google Ads' }];
      mockAddContact.mockResolvedValue({ id: 'new-contact-from-lead' });
      mockAddDealState.mockResolvedValue({ id: 'deal-from-lead', title: 'Negócio com João Lead' });

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.convertLead('lead-1');
      });

      // Contact created with lead data
      expect(mockAddContact).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'João Lead',
          email: 'joao@lead.com',
          tags: ['Origem: Google Ads'],
        })
      );
      // Deal created with new contact
      expect(mockAddDealState).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: 'new-contact-from-lead',
          status: 'stage-new',
        })
      );
      // Lead discarded after successful creation
      expect(mockDiscardLead).toHaveBeenCalledWith('lead-1');
      // Activity created
      expect(mockAddActivity).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Convertido de Lead' })
      );
    });

    it('não descarta lead se deal creation falha', async () => {
      mockLeads = [{ id: 'lead-1', name: 'Fail Lead', email: '' }];
      mockAddContact.mockResolvedValue({ id: 'contact-ok' });
      mockAddDealState.mockResolvedValue(null);

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.convertLead('lead-1');
      });

      expect(mockDiscardLead).not.toHaveBeenCalled();
    });

    it('aborta se contato creation falha', async () => {
      mockLeads = [{ id: 'lead-1', name: 'Fail Lead', email: '' }];
      mockAddContact.mockResolvedValue(null);

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.convertLead('lead-1');
      });

      expect(mockAddDealState).not.toHaveBeenCalled();
      expect(mockDiscardLead).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Task 1.5: View projection (deals enrichment)
  // ===========================================
  describe('deals — DealView projection', () => {
    it('enriquece deals com dados do contato', () => {
      mockRawDeals = [
        { id: 'deal-1', title: 'Deal A', contactId: 'c-1', boardId: 'board-1', status: 'stage-new', ownerId: 'other' },
      ];
      mockContactMap = {
        'c-1': { name: 'Ana', email: 'ana@test.com', phone: '11999', tags: ['vip'], customFields: { cpf: '123' } },
      };

      const { result } = renderHook(() => useCRMActions());

      expect(result.current.deals).toHaveLength(1);
      expect(result.current.deals[0]).toEqual(expect.objectContaining({
        contactName: 'Ana',
        contactEmail: 'ana@test.com',
        contactPhone: '11999',
        contactTags: ['vip'],
        contactCustomFields: { cpf: '123' },
        stageLabel: 'Novo',
      }));
    });

    it('retorna "Sem Contato" quando deal não tem contactId', () => {
      mockRawDeals = [
        { id: 'deal-2', title: 'Sem Contato', contactId: '', boardId: 'board-1', status: 'stage-new', ownerId: 'other' },
      ];

      const { result } = renderHook(() => useCRMActions());

      expect(result.current.deals[0].contactName).toBe('Sem Contato');
    });

    it('resolve stageLabel do board correto', () => {
      mockRawDeals = [
        { id: 'deal-3', title: 'Qualificado', boardId: 'board-1', status: 'stage-qual', ownerId: 'other' },
      ];

      const { result } = renderHook(() => useCRMActions());

      expect(result.current.deals[0].stageLabel).toBe('Qualificado');
    });

    it('mostra owner name do perfil quando ownerId coincide', () => {
      mockRawDeals = [
        { id: 'deal-4', title: 'Meu Deal', boardId: 'board-1', status: 'stage-new', ownerId: 'user-1' },
      ];

      const { result } = renderHook(() => useCRMActions());

      expect(result.current.deals[0].owner).toEqual(
        expect.objectContaining({ name: 'TestUser' })
      );
    });
  });

  // ===========================================
  // Business logic: checkWalletHealth
  // ===========================================
  describe('checkWalletHealth — Churn risk detection', () => {
    it('detecta clientes inativos há mais de 30 dias', async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      mockContacts = [{
        id: 'c-risky',
        name: 'Cliente Inativo',
        status: 'ACTIVE',
        stage: 'CUSTOMER',
        createdAt: new Date('2025-01-01').toISOString(),
        lastPurchaseDate: sixtyDaysAgo.toISOString(),
        lastInteraction: null,
      }];

      const { result } = renderHook(() => useCRMActions());

      let count: number | undefined;
      await act(async () => {
        count = await result.current.checkWalletHealth();
      });

      expect(count).toBe(1);
      expect(mockAddActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Análise de Carteira: Risco de Churn',
          description: expect.stringContaining('Cliente Inativo'),
        })
      );
    });

    it('não cria atividade duplicada se já existe tarefa aberta', async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      mockContacts = [{
        id: 'c-risky',
        name: 'Cliente Já Alertado',
        status: 'ACTIVE',
        stage: 'CUSTOMER',
        createdAt: new Date('2025-01-01').toISOString(),
        lastPurchaseDate: sixtyDaysAgo.toISOString(),
      }];
      mockActivities = [{
        id: 'existing-alert',
        title: 'Análise de Carteira: Risco de Churn',
        description: 'O cliente Cliente Já Alertado está inativo há mais de 30 dias.',
        completed: false,
      }];

      const { result } = renderHook(() => useCRMActions());

      let count: number | undefined;
      await act(async () => {
        count = await result.current.checkWalletHealth();
      });

      expect(count).toBe(0);
      expect(mockAddActivity).not.toHaveBeenCalled();
    });

    it('ignora contatos que não são CUSTOMER', async () => {
      mockContacts = [{
        id: 'c-lead',
        name: 'Lead Recente',
        status: 'ACTIVE',
        stage: 'LEAD',
        createdAt: new Date('2025-01-01').toISOString(),
        lastPurchaseDate: new Date('2025-01-01').toISOString(),
      }];

      const { result } = renderHook(() => useCRMActions());

      let count: number | undefined;
      await act(async () => {
        count = await result.current.checkWalletHealth();
      });

      expect(count).toBe(0);
      expect(mockAddActivity).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // Business logic: checkStagnantDeals
  // ===========================================
  describe('checkStagnantDeals — Stagnant deal detection', () => {
    it('detecta deals parados há mais de 10 dias', async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      mockRawDeals = [{
        id: 'stagnant-1',
        title: 'Deal Parado',
        boardId: 'board-1',
        status: 'stage-new',
        isWon: false,
        isLost: false,
        lastStageChangeDate: twentyDaysAgo.toISOString(),
      }];

      const { result } = renderHook(() => useCRMActions());

      let count: number | undefined;
      await act(async () => {
        count = await result.current.checkStagnantDeals();
      });

      expect(count).toBe(1);
      expect(mockAddActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Alerta de Estagnação',
          dealId: 'stagnant-1',
          description: expect.stringContaining('Novo'), // stageLabel resolved
        })
      );
    });

    it('limita a 3 alertas por execução', async () => {
      const twentyDaysAgo = new Date();
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      mockRawDeals = Array.from({ length: 5 }, (_, i) => ({
        id: `stagnant-${i}`,
        title: `Deal ${i}`,
        boardId: 'board-1',
        status: 'stage-new',
        isWon: false,
        isLost: false,
        lastStageChangeDate: twentyDaysAgo.toISOString(),
      }));

      const { result } = renderHook(() => useCRMActions());

      await act(async () => {
        await result.current.checkStagnantDeals();
      });

      expect(mockAddActivity).toHaveBeenCalledTimes(3);
    });

    it('ignora deals ganhos ou perdidos', async () => {
      mockRawDeals = [
        { id: 'd-won', title: 'Ganho', isWon: true, isLost: false, lastStageChangeDate: '2025-01-01' },
        { id: 'd-lost', title: 'Perdido', isWon: false, isLost: true, lastStageChangeDate: '2025-01-01' },
      ];

      const { result } = renderHook(() => useCRMActions());

      let count: number | undefined;
      await act(async () => {
        count = await result.current.checkStagnantDeals();
      });

      expect(count).toBe(0);
    });
  });

  // ===========================================
  // API surface: exported members
  // ===========================================
  describe('API surface — exported members', () => {
    it('exports exactly the expected members', () => {
      const { result } = renderHook(() => useCRMActions());

      const keys = Object.keys(result.current).sort();
      expect(keys).toEqual([
        'addDeal',
        'checkStagnantDeals',
        'checkWalletHealth',
        'convertContactToDeal',
        'convertLead',
        'deals',
      ]);
    });
  });
});
