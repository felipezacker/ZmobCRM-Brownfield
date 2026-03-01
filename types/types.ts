/**
 * @fileoverview Definições de Tipos do CRM
 * 
 * Arquivo central de tipos TypeScript para o sistema ZmobCRM.
 * Contém interfaces para todas as entidades do domínio.
 * 
 * @module types
 * 
 * Sistema SINGLE-TENANT (migrado em 2025-12-07)
 * 
 * @example
 * ```tsx
 * import { Deal, DealView, Contact, Board } from '@/types';
 * 
 * const deal: Deal = {
 *   title: 'Meu deal',
 *   value: 1000,
 *   // ...
 * };
 * ```
 */

/**
 * @deprecated Use deal.isWon e deal.isLost para verificar status final.
 * O estágio atual é deal.status (UUID do stage no board).
 * Mantido apenas para compatibilidade de código legado.
 */
export enum DealStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

// =============================================================================
// TYPE ALIASES (LEGACY - MANTIDOS PARA COMPATIBILIDADE)
// =============================================================================

/**
 * @deprecated Sistema migrado para single-tenant.
 * Mantido apenas para compatibilidade de código legado.
 * Campos organization_id são opcionais e ignorados.
 */
export type OrganizationId = string;


// =============================================================================
// Core Types
// =============================================================================

// Estágio do Ciclo de Vida (Dinâmico)
export interface LifecycleStage {
  id: string;
  name: string;
  color: string; // Tailwind class or hex
  order: number;
  isDefault?: boolean; // Cannot be deleted
}

// Estágio do Contato no Funil de Carteira
// @deprecated - Use LifecycleStage IDs (strings)
export enum ContactStage {
  LEAD = 'LEAD', // Suspeito - ainda não qualificado
  MQL = 'MQL', // Marketing Qualified Lead
  PROSPECT = 'PROSPECT', // Em negociação ativa
  CUSTOMER = 'CUSTOMER', // Cliente fechado
}

// @deprecated - Use Contact com stage: ContactStage.LEAD
// Mantido apenas para compatibilidade de migração
export interface Lead {
  id: string;
  name: string;
  email: string;
  source: 'WEBSITE' | 'LINKEDIN' | 'REFERRAL' | 'MANUAL';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED';
  createdAt: string;
  notes?: string;
}

// =============================================================================
// Organization (Tenant - who pays for SaaS)
// =============================================================================

/**
 * Organization - The SaaS tenant (company paying for the service)
 * Previously named "Company" - renamed to avoid confusion with CRM client companies
 */
export interface Organization {
  id: OrganizationId;
  name: string;
  industry?: string;
  website?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * @deprecated Use Organization instead
 * Kept for backwards compatibility during migration
 */
export type Company = Organization;

// =============================================================================
// Contact (Person we talk to)
// =============================================================================

// Tipos de contato
export type ContactType = 'PF' | 'PJ';

// Classificação do contato no mercado imobiliário
export type ContactClassification =
  | 'COMPRADOR'
  | 'VENDEDOR'
  | 'LOCATARIO'
  | 'LOCADOR'
  | 'INVESTIDOR'
  | 'PERMUTANTE';

// Temperatura do lead
export type ContactTemperature = 'HOT' | 'WARM' | 'COLD';

// Tipo de telefone
export type PhoneType = 'CELULAR' | 'COMERCIAL' | 'RESIDENCIAL';

// =============================================================================
// Contact Preferences (Story 3.2 — Perfil de Interesse do Contato)
// =============================================================================

/** Tipos de imovel disponiveis para preferencia. */
export type PropertyType = 'APARTAMENTO' | 'CASA' | 'TERRENO' | 'COMERCIAL' | 'RURAL' | 'GALPAO';

/** Finalidade da busca de imovel. */
export type PreferencePurpose = 'MORADIA' | 'INVESTIMENTO' | 'VERANEIO';

/** Urgencia na busca de imovel. */
export type PreferenceUrgency = 'IMMEDIATE' | '3_MONTHS' | '6_MONTHS' | '1_YEAR';

/** Perfil de interesse de imovel de um contato. */
export interface ContactPreference {
  id: string;
  contactId: string;
  propertyTypes: string[];
  purpose: PreferencePurpose | null;
  priceMin: number | null;
  priceMax: number | null;
  regions: string[];
  bedroomsMin: number | null;
  parkingMin: number | null;
  areaMin: number | null;
  acceptsFinancing: boolean | null;
  acceptsFgts: boolean | null;
  urgency: PreferenceUrgency | null;
  notes: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// A Pessoa (Com quem falamos)
export interface Contact {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional during migration
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  lastInteraction?: string;
  birthDate?: string; // New field for Agentic AI tasks
  status: 'ACTIVE' | 'INACTIVE' | 'CHURNED';
  stage: string; // ID do LifecycleStage (antes era ContactStage enum)
  source?: 'WEBSITE' | 'LINKEDIN' | 'REFERRAL' | 'MANUAL'; // Origem do contato
  notes?: string; // Anotações gerais
  lastPurchaseDate?: string;
  totalValue?: number; // LTV
  createdAt: string;
  updatedAt?: string; // Última modificação do registro
  ownerId?: string; // ID do corretor responsável

  // Story 3.1 — Modelo de Dados Contatos
  cpf?: string; // CPF (somente PF)
  contactType?: ContactType; // PF ou PJ (default PF)
  classification?: ContactClassification; // Perfil no mercado imobiliário
  temperature?: ContactTemperature; // Temperatura do lead (default WARM)
  addressCep?: string; // CEP (formato 00000-000)
  addressCity?: string; // Cidade
  addressState?: string; // UF (2 caracteres)
  profileData?: Record<string, unknown>; // Dados extras em JSONB

  // Story 3.8 — Lead Scoring
  leadScore?: number; // Score 0-100 calculado automaticamente

  // Tags & Custom Fields (migrado de Deal para Contact)
  tags?: string[];
  customFields?: Record<string, any>;
}

// Telefone de contato (tabela contact_phones)
export interface ContactPhone {
  id: string;
  contactId: string;
  phoneNumber: string;
  phoneType: PhoneType;
  isWhatsapp: boolean;
  isPrimary: boolean;
  organizationId?: string;
  createdAt: string;
  updatedAt?: string;
}

// ITEM 3: Produtos e Serviços
export interface Product {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional during migration
  name: string;
  description?: string;
  price: number;
  sku?: string;
  /** Se está ativo no catálogo (itens inativos não devem aparecer no dropdown do deal). */
  active?: boolean;
}

export interface DealItem {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional during migration
  productId: string;
  name: string; // Snapshot of name
  quantity: number;
  price: number; // Snapshot of price
}

// CUSTOM FIELDS DEFINITION
export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  key: string; // camelCase identifier
  label: string;
  type: CustomFieldType;
  options?: string[]; // For select type
}

// O Dinheiro/Oportunidade (O que vai no Kanban)
export interface Deal {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional during migration
  title: string; // Ex: "Licença Anual"
  contactId: string; // Relacionamento
  boardId: string; // Qual board este deal pertence
  value: number;
  items: DealItem[]; // Lista de Produtos
  status: string; // Stage ID dentro do board (UUID)
  isWon: boolean; // Deal foi ganho?
  isLost: boolean; // Deal foi perdido?
  closedAt?: string; // Quando foi fechado
  createdAt: string;
  updatedAt: string;
  probability: number;
  priority: 'low' | 'medium' | 'high';
  owner: {
    name: string;
    avatar: string;
  };
  ownerId?: string; // ID do usuário responsável
  nextActivity?: {
    type: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK';
    date: string;
    isOverdue?: boolean;
  };
  aiSummary?: string;
  /** Metadados internos do deal (checklist, rastreabilidade, etc.) — não é user-facing. */
  metadata?: Record<string, unknown>;
  lastStageChangeDate?: string; // For stagnation tracking
  lossReason?: string; // For win/loss analysis
  dealType?: 'VENDA' | 'LOCACAO' | 'PERMUTA'; // Tipo da transação imobiliária
  expectedCloseDate?: string; // Data prevista de fechamento (ISO date)
  commissionRate?: number | null; // Taxa de comissão override (0-100, nullable)
}

// Helper Type para Visualização (Desnormalizado)
export interface DealView extends Deal {
  contactName: string;
  contactEmail: string;
  /** Telefone do contato vinculado (read-only no deal). */
  contactPhone: string;
  /** Tags do contato vinculado (read-only no deal). */
  contactTags: string[];
  /** Campos customizados do contato vinculado (read-only no deal). */
  contactCustomFields: Record<string, any>;
  /** Nome/label do estágio atual (resolvido a partir do status UUID) */
  stageLabel: string;
}

export interface Activity {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional during migration
  dealId: string;
  /** ID do contato associado (opcional). Útil para tarefas sem deal. */
  contactId?: string;
  /** IDs dos contatos participantes (opcional). */
  participantContactIds?: string[];
  dealTitle: string;
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'NOTE' | 'STATUS_CHANGE';
  title: string;
  description?: string;
  date: string;
  user: {
    name: string;
    avatar: string;
  };
  completed: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | null;
  recurrenceEndDate?: string | null;
}

export interface DashboardStats {
  totalDeals: number;
  pipelineValue: number;
  conversionRate: number;
  winRate: number;
}

// Estágio de um Board (etapa do Kanban)
export interface BoardStage {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional for templates
  boardId?: string; // Board FK - optional for templates
  label: string;
  color: string;
  linkedLifecycleStage?: string; // ID do LifecycleStage
}

// Metas do Board (Revenue Ops)
export interface BoardGoal {
  description: string; // "Converter 20% dos leads"
  kpi: string; // "Taxa de Conversão"
  targetValue: string; // "20%"
  currentValue?: string; // "15%" (Progresso atual)
  type?: 'currency' | 'number' | 'percentage'; // Explicit type for calculation
}

// Persona do Agente (Quem opera o board)
export interface AgentPersona {
  name: string; // "Dra. Ana (Virtual)"
  role: string; // "Consultora de Beleza"
  behavior: string; // "Empática, usa emojis..."
}

// Board = Kanban configurável (ex: Pipeline de Vendas, Onboarding, etc)
export interface Board {
  id: string;
  organizationId?: OrganizationId; // Tenant FK (for RLS) - optional for templates
  name: string;
  /**
   * Identificador humano e estável (slug) para integrações.
   * Ex.: "sales", "pos-venda".
   */
  key?: string;
  description?: string;
  linkedStage?: ContactStage; // Quando mover para etapa final, atualiza o stage do contato
  linkedLifecycleStage?: string; // Qual lifecycle stage este board gerencia (ex: 'LEAD', 'MQL', 'CUSTOMER')
  nextBoardId?: string; // Quando mover para etapa final (Ganho), cria um card neste board
  wonStageId?: string; // Estágio de Ganho
  lostStageId?: string; // Estágio de Perda
  wonStayInStage?: boolean; // Se true, "Arquiva" na etapa atual (status Won) em vez de mover
  lostStayInStage?: boolean; // Se true, "Arquiva" na etapa atual (status Lost) em vez de mover
  /** Produto padrão sugerido para deals desse board (opcional). */
  defaultProductId?: string;
  stages: BoardStage[];
  isDefault?: boolean;
  template?: 'PRE_SALES' | 'SALES' | 'ONBOARDING' | 'CS' | 'CUSTOM'; // Template usado para criar este board
  automationSuggestions?: string[]; // Sugestões de automação da IA

  // AI Strategy Fields
  goal?: BoardGoal;
  agentPersona?: AgentPersona;
  entryTrigger?: string; // "Quem deve entrar aqui?"

  createdAt: string;
}

// Estágios padrão do board de vendas
export const DEFAULT_BOARD_STAGES: BoardStage[] = [
  { id: DealStatus.NEW, label: 'Novas Oportunidades', color: 'bg-blue-500' },
  { id: DealStatus.CONTACTED, label: 'Contatado', color: 'bg-yellow-500' },
  {
    id: DealStatus.PROPOSAL,
    label: 'Proposta',
    color: 'bg-purple-500',
    linkedLifecycleStage: ContactStage.PROSPECT,
  },
  {
    id: DealStatus.NEGOTIATION,
    label: 'Negociação',
    color: 'bg-orange-500',
    linkedLifecycleStage: ContactStage.PROSPECT,
  },
  {
    id: DealStatus.CLOSED_WON,
    label: 'Ganho',
    color: 'bg-green-500',
    linkedLifecycleStage: ContactStage.CUSTOMER,
  },
];

// @deprecated - Use DEFAULT_BOARD_STAGES
export const PIPELINE_STAGES = DEFAULT_BOARD_STAGES;

// Registry Types
export interface RegistryTemplate {
  id: string;
  path: string;
  name: string;
  description: string;
  author: string;
  version: string;
  tags: string[];
}

export interface RegistryIndex {
  version: string;
  templates: RegistryTemplate[];
}

export interface JourneyDefinition {
  schemaVersion: string;
  name?: string;
  boards: {
    slug: string;
    name: string;
    columns: {
      name: string;
      color?: string;
      linkedLifecycleStage?: string;
    }[];
    strategy?: {
      agentPersona?: AgentPersona;
      goal?: BoardGoal;
      entryTrigger?: string;
    };
  }[];
}

// =============================================================================
// Pagination Types (Server-Side)
// =============================================================================

/**
 * Estado de paginação para controle de navegação.
 * Compatível com TanStack Table.
 * 
 * @example
 * ```ts
 * const [pagination, setPagination] = useState<PaginationState>({
 *   pageIndex: 0,
 *   pageSize: 50,
 * });
 * ```
 */
export interface PaginationState {
  /** Índice da página atual (0-indexed). */
  pageIndex: number;
  /** Quantidade de itens por página. */
  pageSize: number;
}

/** Opções válidas para tamanho de página. */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/** Tamanho de página padrão. */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * Resposta paginada genérica do servidor.
 * 
 * @template T Tipo dos itens retornados.
 * 
 * @example
 * ```ts
 * const response: PaginatedResponse<Contact> = {
 *   data: [...],
 *   totalCount: 10000,
 *   pageIndex: 0,
 *   pageSize: 50,
 *   hasMore: true,
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** Array de itens da página atual. */
  data: T[];
  /** Total de registros no banco (para calcular número de páginas). */
  totalCount: number;
  /** Índice da página retornada (0-indexed). */
  pageIndex: number;
  /** Tamanho da página solicitada. */
  pageSize: number;
  /** Se existem mais páginas após esta. */
  hasMore: boolean;
}

/**
 * Filtros de contatos para busca server-side.
 * Extensão dos filtros existentes com suporte a paginação.
 */
export interface ContactsServerFilters {
  /** Busca por nome ou email (case-insensitive). */
  search?: string;
  /** Filtro por estágio do funil. */
  stage?: string | 'ALL';
  /** Filtro por status. */
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'CHURNED' | 'RISK';
  /** Data de início (created_at >= dateStart). */
  dateStart?: string;
  /** Data de fim (created_at <= dateEnd). */
  dateEnd?: string;
  /** Campo para ordenação. */
  sortBy?: ContactSortableColumn;
  /** Direção da ordenação. */
  sortOrder?: 'asc' | 'desc';
  /** Story 3.5 — Filtro por classificação (multi-select). */
  classification?: string[];
  /** Story 3.5 — Filtro por temperatura. */
  temperature?: string;
  /** Story 3.5 — Filtro por tipo de contato (PF/PJ). */
  contactType?: string;
  /** Story 3.5 — Filtro por responsável (owner_id). */
  ownerId?: string;
  /** Story 3.5 — Filtro por origem. */
  source?: string;
}

/** Colunas ordenáveis na tabela de contatos. */
export type ContactSortableColumn = 'name' | 'created_at' | 'updated_at' | 'stage' | 'owner_id' | 'source' | 'lead_score';

// =============================================================================
// Notifications (Story 3.9 — Notificacoes Inteligentes)
// =============================================================================

/** Tipos de notificacao CRM. */
export type NotificationType = 'BIRTHDAY' | 'CHURN_ALERT' | 'DEAL_STAGNANT' | 'SCORE_DROP';

/** Notificacao CRM persistida no banco. */
export interface CrmNotification {
  id: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  description: string | null;
  contactId: string | null;
  dealId: string | null;
  isRead: boolean;
  createdAt: string;
  ownerId: string | null;
}
