/**
 * Testa o guard clause de contactId no addDeal do useCRMActions.
 *
 * Cenário crítico: quando deal.contactId já está preenchido (contato existente
 * selecionado pelo usuário), a resolução de contato deve ser pulada para evitar
 * criação de duplicata e sobrescrita do ID correto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCRMActions } from '../useCRMActions';

// --- Mocks de contexto ---

const mockAddContact = vi.fn();
const mockAddDealState = vi.fn().mockResolvedValue({ id: 'created-deal-id' });
const mockSetQueryData = vi.fn();

// Contacts mutável — permite que cada teste configure sua própria lista
let mockContacts: Array<{ id: string; email: string; name: string }> = [];

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));

vi.mock('@/lib/query', () => ({
  queryKeys: { deals: { lists: () => ['deals', 'list'] } },
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', nickname: 'Dex', avatar_url: '', organization_id: 'org-1' },
    user: { id: 'user-1', email: 'dex@example.com' },
  }),
}));

vi.mock('@/lib/query/hooks/useDealsQuery', () => ({
  useDeals: () => ({ data: [], isLoading: false, error: null, refetch: vi.fn() }),
  useCreateDeal: () => ({ mutateAsync: mockAddDealState }),
  useUpdateDeal: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useDeleteDeal: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useAddDealItem: () => ({ mutateAsync: vi.fn() }),
  useRemoveDealItem: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/context/contacts/ContactsContext', () => ({
  useContacts: () => ({
    get contacts() { return mockContacts; },
    contactMap: {},
    addContact: mockAddContact,
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
    boards: [],
    activeBoard: null,
    activeBoardId: null,
    getBoardById: vi.fn(),
  }),
}));

vi.mock('@/context/settings/SettingsContext', () => ({
  useSettings: () => ({
    leads: [],
    discardLead: vi.fn(),
  }),
}));

// --- Deal base para os testes ---
const baseDeal = {
  title: 'Negócio Teste',
  value: 1000,
  probability: 50,
  status: 'stage-1',
  priority: 'medium' as const,
  boardId: 'board-1',
  ownerId: 'user-1',
  isWon: false,
  isLost: false,
  dealType: 'VENDA' as const,
  metadata: {},
};

describe('useCRMActions — addDeal guard clause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDealState.mockResolvedValue({ id: 'created-deal-id' });
    mockContacts = []; // reset entre testes
  });

  it('NÃO chama addContact quando deal.contactId já está preenchido', async () => {
    const { result } = renderHook(() => useCRMActions());

    await act(async () => {
      await result.current.addDeal(
        { ...baseDeal, contactId: 'existing-contact-id' },
        { contact: { name: 'Contato Existente', email: 'existing@example.com' } }
      );
    });

    expect(mockAddContact).not.toHaveBeenCalled();
    // O deal deve ser criado com o contactId original
    expect(mockAddDealState).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 'existing-contact-id' })
    );
  });

  it('chama addContact quando deal.contactId está vazio e relatedData.contact tem nome', async () => {
    mockAddContact.mockResolvedValue({ id: 'new-contact-id' });

    const { result } = renderHook(() => useCRMActions());

    await act(async () => {
      await result.current.addDeal(
        { ...baseDeal, contactId: '' },
        { contact: { name: 'Novo Contato', email: 'novo@example.com' } }
      );
    });

    expect(mockAddContact).toHaveBeenCalledOnce();
    // O deal deve ser criado com o ID do novo contato
    expect(mockAddDealState).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 'new-contact-id' })
    );
  });

  it('não chama addContact quando relatedData não tem contato', async () => {
    const { result } = renderHook(() => useCRMActions());

    await act(async () => {
      await result.current.addDeal({ ...baseDeal, contactId: '' });
    });

    expect(mockAddContact).not.toHaveBeenCalled();
    expect(mockAddDealState).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: '' })
    );
  });

  it('encontra contato existente por email em vez de criar duplicata', async () => {
    // Popula a lista de contatos antes de renderizar o hook
    mockContacts = [{ id: 'found-contact-id', email: 'found@example.com', name: 'Já Existe' }];

    const { result } = renderHook(() => useCRMActions());

    await act(async () => {
      await result.current.addDeal(
        { ...baseDeal, contactId: '' },
        { contact: { name: 'Já Existe', email: 'found@example.com' } }
      );
    });

    // Não deve criar novo — usa o existente
    expect(mockAddContact).not.toHaveBeenCalled();
    expect(mockAddDealState).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: 'found-contact-id' })
    );
  });
});
