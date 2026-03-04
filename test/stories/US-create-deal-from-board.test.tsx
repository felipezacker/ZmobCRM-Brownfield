import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CreateDealModal } from '@/features/boards/components/Modals/CreateDealModal';
import type { Board } from '@/types';

// ── Mocks ──────────────────────────────────────────────────

const mockAddDeal = vi.fn().mockResolvedValue({ id: 'deal-new-1' });

vi.mock('@/hooks/useCRMActions', () => ({
  useCRMActions: () => ({
    addDeal: mockAddDeal,
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', nickname: 'Felipe', first_name: 'Felipe', email: 'felipe@test.com', avatar_url: '' },
    user: { id: 'user-1', email: 'felipe@test.com' },
  }),
}));

vi.mock('@/context/boards/BoardsContext', () => ({
  useBoards: () => ({
    activeBoard: null,
    activeBoardId: null,
  }),
}));

vi.mock('@/hooks/useOrganizationMembers', () => ({
  useOrganizationMembers: () => ({
    members: [
      { id: 'user-1', name: 'Felipe', avatar_url: '' },
      { id: 'user-2', name: 'Maria', avatar_url: '' },
    ],
    loading: false,
  }),
}));

vi.mock('@/components/ui/ContactSearchCombobox', () => ({
  ContactSearchCombobox: ({ onCreateNew }: { onCreateNew: (term: string) => void }) => (
    <div data-testid="contact-search">
      {/* eslint-disable-next-line no-restricted-syntax -- mock component */}
      <button data-testid="trigger-create-new" onClick={() => onCreateNew('João Silva')}>
        Criar novo
      </button>
    </div>
  ),
}));

vi.mock('@/components/debug/DebugFillButton', () => ({
  DebugFillButton: () => null,
}));

vi.mock('@/lib/debug', () => ({
  fakeDeal: vi.fn(),
  fakeContact: () => ({ name: 'Fake', email: 'fake@test.com', phone: '11999999999' }),
}));

vi.mock('@/app/components/ui/Button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    // eslint-disable-next-line no-restricted-syntax -- mock component
    <button {...props}>{children}</button>
  ),
}));

// ── Test Data ──────────────────────────────────────────────

const makeBoard = (overrides?: Partial<Board>): Board => ({
  id: 'board-1',
  name: 'Pipeline de Vendas',
  description: '',
  stages: [
    { id: 'stage-lead', label: 'Lead', order: 0, color: 'bg-blue-500' },
    { id: 'stage-qualificado', label: 'Qualificado', order: 1, color: 'bg-green-500' },
    { id: 'stage-proposta', label: 'Proposta', order: 2, color: 'bg-yellow-500' },
    { id: 'stage-won', label: 'Ganho', order: 3, color: 'bg-emerald-500' },
    { id: 'stage-lost', label: 'Perdido', order: 4, color: 'bg-red-500' },
  ],
  wonStageId: 'stage-won',
  lostStageId: 'stage-lost',
  createdAt: new Date().toISOString(),
  ...overrides,
} as Board);

// ── Tests ──────────────────────────────────────────────────

describe('CreateDealModal — Abertura com dados corretos', () => {
  const board = makeBoard();
  const onClose = vi.fn();
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não renderiza nada quando isOpen=false', () => {
    const { container } = render(
      <CreateDealModal
        isOpen={false}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza o modal quando isOpen=true', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );
    expect(screen.getByText('Novo Negócio')).toBeDefined();
  });

  it('exibe apenas estágios que NÃO são won/lost', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );

    // Deve exibir Lead, Qualificado, Proposta
    expect(screen.getByText('Lead')).toBeDefined();
    expect(screen.getByText('Qualificado')).toBeDefined();
    expect(screen.getByText('Proposta')).toBeDefined();

    // NÃO deve exibir Ganho e Perdido
    expect(screen.queryByText('Ganho')).toBeNull();
    expect(screen.queryByText('Perdido')).toBeNull();
  });

  it('pré-seleciona o initialStageId quando fornecido', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
        initialStageId="stage-qualificado"
      />
    );

    // O botão "Qualificado" deve ter a classe de selecionado (scale-105)
    const qualificadoBtn = screen.getByText('Qualificado').closest('button');
    expect(qualificadoBtn?.className).toContain('scale-105');

    // O botão "Lead" NÃO deve estar selecionado
    const leadBtn = screen.getByText('Lead').closest('button');
    expect(leadBtn?.className).not.toContain('scale-105');
  });

  it('seleciona o primeiro estágio por default quando sem initialStageId', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );

    // "Lead" é o primeiro estágio disponível — deve estar selecionado
    const leadBtn = screen.getByText('Lead').closest('button');
    expect(leadBtn?.className).toContain('scale-105');
  });

  it('exibe responsáveis do useOrganizationMembers', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );

    // Verifica select de responsável
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option'));

    expect(options.some(o => o.textContent?.includes('Felipe'))).toBe(true);
    expect(options.some(o => o.textContent?.includes('Maria'))).toBe(true);
  });

  it('pré-seleciona o usuário logado como responsável', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('user-1');
  });

  it('mostra mensagem de erro se board não tem estágios', () => {
    const emptyBoard = makeBoard({ stages: [] });

    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={emptyBoard}
        activeBoardId={emptyBoard.id}
      />
    );

    expect(screen.getByText(/Nenhum board selecionado ou board sem estágios/)).toBeDefined();
  });

  it('mostra mensagem de erro se activeBoard é null', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={null}
        activeBoardId={null}
      />
    );

    expect(screen.getByText(/Nenhum board selecionado ou board sem estágios/)).toBeDefined();
  });

  it('botão Criar Negócio fica desabilitado sem contato', () => {
    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
      />
    );

    const submitBtn = screen.getByText('Criar Negócio');
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('chama addDeal com dados corretos ao submeter', async () => {
    const user = userEvent.setup();

    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
        initialStageId="stage-qualificado"
        onCreated={onCreated}
      />
    );

    // Clica no botão "+ Novo" do toggle para abrir o formulário inline
    const novoBtn = screen.getByText('+ Novo');
    await user.click(novoBtn);

    // Aguarda o form inline aparecer após state change
    const nameInput = await screen.findByPlaceholderText('Nome do contato *');
    await user.clear(nameInput);
    await user.type(nameInput, 'Carlos Teste');

    // Submete
    const submitBtn = screen.getByText('Criar Negócio');
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
    await user.click(submitBtn);

    // Verifica que addDeal foi chamado
    expect(mockAddDeal).toHaveBeenCalledTimes(1);

    const [dealArg, relatedArg] = mockAddDeal.mock.calls[0];

    // Verifica dados do deal
    expect(dealArg.boardId).toBe('board-1');
    expect(dealArg.status).toBe('stage-qualificado');
    expect(dealArg.ownerId).toBe('user-1');
    expect(dealArg.title).toBe('Carlos Teste');

    // Verifica dados do contato relacionado
    expect(relatedArg.contact.name).toBe('Carlos Teste');

    // Verifica que onCreated foi chamado com o id do deal
    expect(onCreated).toHaveBeenCalledWith('deal-new-1');
  });

  it('ao clicar no estágio diferente, muda a seleção', async () => {
    const user = userEvent.setup();

    render(
      <CreateDealModal
        isOpen={true}
        onClose={onClose}
        activeBoard={board}
        activeBoardId={board.id}
        initialStageId="stage-lead"
      />
    );

    // Inicialmente Lead está selecionado
    const leadBtn = screen.getByText('Lead').closest('button')!;
    expect(leadBtn.className).toContain('scale-105');

    // Clica em Proposta
    const propostaBtn = screen.getByText('Proposta').closest('button')!;
    await user.click(propostaBtn);

    // Agora Proposta deve estar selecionada e Lead não
    expect(propostaBtn.className).toContain('scale-105');
    expect(leadBtn.className).not.toContain('scale-105');
  });
});
