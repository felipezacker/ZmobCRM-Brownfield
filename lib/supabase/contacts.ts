/**
 * @fileoverview Serviço Supabase para gerenciamento de contatos.
 *
 * Este módulo fornece operações CRUD para contatos,
 * com transformação automática entre o formato do banco e o formato da aplicação.
 *
 * ## Conceitos Multi-Tenant
 *
 * - Contatos são isolados por `organization_id` (tenant)
 *
 * @module lib/supabase/contacts
 */

import { supabase } from './client';
import { Contact, ContactPhone, OrganizationId, PaginationState, PaginatedResponse, ContactsServerFilters } from '@/types';
import { sanitizeUUID, sanitizeText, sanitizeNumber } from './utils';
import { normalizePhoneE164 } from '@/lib/phone';

// ============================================
// CONTACTS SERVICE
// ============================================

/**
 * Representação de contato no banco de dados.
 * 
 * @interface DbContact
 */
export interface DbContact {
  /** ID único do contato (UUID). */
  id: string;
  /** ID da organização/tenant (para RLS). */
  organization_id: string;
  /** Nome completo do contato. */
  name: string;
  /** Email do contato. */
  email: string | null;
  /** Telefone do contato. */
  phone: string | null;
  /** URL do avatar. */
  avatar: string | null;
  /** Observações sobre o contato. */
  notes: string | null;
  /** Status do contato (ACTIVE, INACTIVE). */
  status: string;
  /** Estágio no funil (LEAD, MQL, etc). */
  stage: string;
  /** Fonte de origem do contato. */
  source: string | null;
  /** Data de aniversário. */
  birth_date: string | null;
  /** Data da última interação. */
  last_interaction: string | null;
  /** Data da última compra. */
  last_purchase_date: string | null;
  /** Valor total de compras. */
  total_value: number;
  /** Data de criação. */
  created_at: string;
  /** Data de atualização. */
  updated_at: string;
  /** ID do dono/responsável. */
  owner_id: string | null;

  // Story 3.1 — Novos campos
  /** CPF do contato (somente PF). */
  cpf: string | null;
  /** Tipo de contato: PF ou PJ. */
  contact_type: string | null;
  /** Classificação no mercado imobiliário. */
  classification: string | null;
  /** Temperatura do lead. */
  temperature: string | null;
  /** CEP do endereço. */
  address_cep: string | null;
  /** Cidade do endereço. */
  address_city: string | null;
  /** UF do endereço (2 caracteres). */
  address_state: string | null;
  /** Dados extras em JSONB. */
  profile_data: Record<string, unknown> | null;
  /** Lead score calculado (0-100). Story 3.8. */
  lead_score: number;
  /** Tags do contato. */
  tags: string[];
  /** Campos customizados (JSONB). */
  custom_fields: Record<string, unknown>;
  /** CP-7.1: LGPD opt-out flag. */
  do_not_contact: boolean;
  /** CP-7.1: Motivo do bloqueio. */
  do_not_contact_reason: string | null;
  /** CP-7.1: Data do bloqueio. */
  do_not_contact_at: string | null;
  /** CP-7.1: Quem bloqueou. */
  do_not_contact_by: string | null;
}

/** Representação de contact_phones no banco de dados. */
export interface DbContactPhone {
  id: string;
  contact_id: string;
  phone_number: string;
  phone_type: string;
  is_whatsapp: boolean;
  is_primary: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transforma contato do formato DB para o formato da aplicação.
 * 
 * @param db - Contato no formato do banco.
 * @returns Contato no formato da aplicação.
 */
export const transformContact = (db: DbContact): Contact => ({
  id: db.id,
  organizationId: db.organization_id,
  name: db.name,
  email: db.email || '',
  phone: normalizePhoneE164(db.phone),
  avatar: db.avatar || '',
  notes: db.notes || '',
  status: db.status as Contact['status'],
  stage: db.stage,
  source: db.source as Contact['source'] || undefined,
  birthDate: db.birth_date || undefined,
  lastInteraction: db.last_interaction || undefined,
  lastPurchaseDate: db.last_purchase_date || undefined,
  totalValue: db.total_value || 0,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  ownerId: db.owner_id || undefined,
  // Story 3.1
  cpf: db.cpf || undefined,
  contactType: (db.contact_type as Contact['contactType']) || undefined,
  classification: (db.classification as Contact['classification']) || undefined,
  temperature: (db.temperature as Contact['temperature']) || undefined,
  addressCep: db.address_cep || undefined,
  addressCity: db.address_city || undefined,
  addressState: db.address_state || undefined,
  profileData: db.profile_data || undefined,
  leadScore: db.lead_score || 0,
  tags: db.tags || [],
  customFields: db.custom_fields || {},
  // CP-7.1
  doNotContact: db.do_not_contact || false,
  doNotContactReason: db.do_not_contact_reason || undefined,
  doNotContactAt: db.do_not_contact_at || undefined,
  doNotContactBy: db.do_not_contact_by || undefined,
});

/** Transforma ContactPhone do formato DB para o formato da aplicação. */
export const transformContactPhone = (db: DbContactPhone): ContactPhone => ({
  id: db.id,
  contactId: db.contact_id,
  phoneNumber: db.phone_number,
  phoneType: db.phone_type as ContactPhone['phoneType'],
  isWhatsapp: db.is_whatsapp,
  isPrimary: db.is_primary,
  organizationId: db.organization_id || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at || undefined,
});

/**
 * Transforma contato do formato da aplicação para o formato DB.
 * 
 * @param contact - Contato parcial no formato da aplicação.
 * @returns Contato parcial no formato do banco.
 */
export const transformContactToDb = (contact: Partial<Contact>): Partial<DbContact> => {
  const db: Partial<DbContact> = {};

  if (contact.name !== undefined) db.name = contact.name;
  if (contact.email !== undefined) db.email = contact.email || null;
  if (contact.phone !== undefined) {
    const e164 = normalizePhoneE164(contact.phone);
    db.phone = e164 ? e164 : null;
  }
  if (contact.avatar !== undefined) db.avatar = contact.avatar || null;
  if (contact.notes !== undefined) db.notes = contact.notes || null;
  if (contact.status !== undefined) db.status = contact.status;
  if (contact.stage !== undefined) db.stage = contact.stage;
  if (contact.source !== undefined) db.source = contact.source || null;
  if (contact.birthDate !== undefined) db.birth_date = contact.birthDate || null;
  if (contact.lastInteraction !== undefined) db.last_interaction = contact.lastInteraction || null;
  if (contact.lastPurchaseDate !== undefined) db.last_purchase_date = contact.lastPurchaseDate || null;
  if (contact.totalValue !== undefined) db.total_value = contact.totalValue;
  if (contact.ownerId !== undefined) db.owner_id = contact.ownerId || null;
  // Story 3.1
  if (contact.cpf !== undefined) db.cpf = contact.cpf || null;
  if (contact.contactType !== undefined) db.contact_type = contact.contactType || null;
  if (contact.classification !== undefined) db.classification = contact.classification || null;
  if (contact.temperature !== undefined) db.temperature = contact.temperature || null;
  if (contact.addressCep !== undefined) db.address_cep = contact.addressCep || null;
  if (contact.addressCity !== undefined) db.address_city = contact.addressCity || null;
  if (contact.addressState !== undefined) db.address_state = contact.addressState || null;
  if (contact.profileData !== undefined) db.profile_data = contact.profileData || null;
  if (contact.tags !== undefined) db.tags = contact.tags;
  if (contact.customFields !== undefined) db.custom_fields = contact.customFields;

  return db;
};

/**
 * Serviço de contatos do Supabase.
 * 
 * Fornece operações CRUD para a tabela `contacts`.
 * Todos os dados são filtrados por RLS baseado no `organization_id`.
 * 
 * @example
 * ```typescript
 * // Buscar todos os contatos
 * const { data, error } = await contactsService.getAll();
 * 
 * // Criar um novo contato
 * const { data, error } = await contactsService.create(
 *   { name: 'João', email: 'joao@email.com', status: 'ACTIVE', stage: 'LEAD' },
 *   organizationId
 * );
 * ```
 */
export const contactsService = {
  /**
   * Busca contagens de contatos por estágio do funil.
   * Usa RPC para query eficiente no servidor.
   * 
   * @param orgId - ID da organização (tenant) para filtrar contatos.
   * @returns Promise com objeto de contagens por estágio.
   *
   * @example
   * ```typescript
   * const { data } = await contactsService.getStageCounts('org-uuid');
   * // data = { LEAD: 1500, MQL: 2041, PROSPECT: 800, ... }
   * ```
   */
  async getStageCounts(orgId: string): Promise<{ data: Record<string, number> | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }
      const { data, error } = await supabase.rpc('get_contact_stage_counts', { p_org_id: orgId });

      if (error) return { data: null, error };

      // Transform array to object (RPC returns stage_id, contact_count)
      const counts: Record<string, number> = {};
      if (data) {
        for (const row of data as Array<{ stage_id: string; stage_name: string; contact_count: number }>) {
          counts[row.stage_id] = row.contact_count;
        }
      }

      return { data: counts, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca um contato por ID.
   */
  async getById(id: string): Promise<{ data: Contact | null; error: Error | null }> {
    try {
      if (!supabase) return { data: null, error: new Error('Supabase não configurado') };
      if (!id) return { data: null, error: new Error('ID obrigatório') };

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) return { data: null, error };
      return { data: transformContact(data as DbContact), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca contatos por uma lista de IDs.
   * Otimizado para buscar apenas os contatos necessários.
   *
   * @param ids - Array de IDs de contatos a buscar.
   * @returns Promise com array de contatos ou erro.
   */
  async getByIds(ids: string[]): Promise<{ data: Contact[] | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }
      // Se não há IDs, retorna array vazio (evita query inválida)
      if (!ids || ids.length === 0) {
        return { data: [], error: null };
      }
      // Remove duplicatas e valores vazios
      const uniqueIds = [...new Set(ids.filter(Boolean))];
      if (uniqueIds.length === 0) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .in('id', uniqueIds)
        .is('deleted_at', null);

      if (error) return { data: null, error };
      return { data: (data || []).map(c => transformContact(c as DbContact)), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca todos os contatos da organização.
   *
   * @returns Promise com array de contatos ou erro.
   */
  async getAll(): Promise<{ data: Contact[] | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }
      // Safety limit: Prevent unbounded queries when pagination isn't used
      // For paginated access, use getAllPaginated() instead
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error) return { data: null, error };
      return { data: (data || []).map(c => transformContact(c as DbContact)), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca contatos com paginação e filtros server-side.
   * 
   * @param pagination - Estado de paginação { pageIndex, pageSize }.
   * @param filters - Filtros opcionais (search, stage, status, dateRange).
   * @returns Promise com resposta paginada ou erro.
   * 
   * @example
   * ```typescript
   * const { data, error } = await contactsService.getAllPaginated(
   *   { pageIndex: 0, pageSize: 50 },
   *   { search: 'João', stage: 'LEAD' }
   * );
   * // data.data = Contact[]
   * // data.totalCount = 10000
   * // data.hasMore = true
   * ```
   */
  async getAllPaginated(
    pagination: PaginationState,
    filters?: ContactsServerFilters
  ): Promise<{ data: PaginatedResponse<Contact> | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }
      const { pageIndex, pageSize } = pagination;
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      // Build query with count
      // CL-1: Use !inner join when filtering by list (server-side, no URL limit)
      const selectStr = filters?.contactListId
        ? '*, contact_list_members!inner(list_id)'
        : '*';

      let query = supabase
        .from('contacts')
        .select(selectStr, { count: 'exact' })
        .is('deleted_at', null);

      // Apply filters
      if (filters) {
        // T007: Search filter (name OR email OR phone)
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim().replace(/[%_\\]/g, '\\$&');
          const phoneDigits = searchTerm.replace(/\D/g, '');
          const phoneFilter = phoneDigits.length >= 3
            ? `phone.ilike.%${phoneDigits}%`
            : `phone.ilike.%${searchTerm}%`;
          query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,${phoneFilter}`);
        }

        // T008: Stage filter
        if (filters.stage && filters.stage !== 'ALL') {
          query = query.eq('stage', filters.stage);
        }

        // T009 & T010: Status filter (including RISK logic)
        if (filters.status && filters.status !== 'ALL') {
          if (filters.status === 'RISK') {
            // T010: RISK = ACTIVE + lastPurchaseDate > 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            query = query
              .eq('status', 'ACTIVE')
              .lt('last_purchase_date', thirtyDaysAgo.toISOString());
          } else {
            query = query.eq('status', filters.status);
          }
        }

        // T011: Date range filters
        if (filters.dateStart) {
          query = query.gte('created_at', filters.dateStart);
        }
        if (filters.dateEnd) {
          query = query.lte('created_at', filters.dateEnd);
        }

        // Story 3.5 filters
        if (filters.classification && filters.classification.length > 0) {
          query = query.in('classification', filters.classification);
        }
        if (filters.temperature && filters.temperature !== 'ALL') {
          query = query.eq('temperature', filters.temperature);
        }
        if (filters.contactType && filters.contactType !== 'ALL') {
          query = query.eq('contact_type', filters.contactType);
        }
        if (filters.ownerId) {
          query = query.eq('owner_id', filters.ownerId);
        }
        if (filters.source && filters.source !== 'ALL') {
          query = query.eq('source', filters.source);
        }

        // CL-1: Filter by contact list membership (server-side !inner join)
        if (filters.contactListId) {
          query = query.eq('contact_list_members.list_id', filters.contactListId);
        }

        // CL-1: Filter contacts not in any list
        // Uses NOT IN with member IDs. Safe for org-level volumes (<500 unique members).
        if (filters.noList) {
          const { data: allMembers } = await supabase
            .from('contact_list_members')
            .select('contact_id');

          const memberedIds = [...new Set((allMembers || []).map(r => r.contact_id))];
          if (memberedIds.length > 0) {
            query = query.not('id', 'in', `(${memberedIds.join(',')})`);
          }
        }

      }

      // Apply pagination and ordering
      const sortColumn = filters?.sortBy || 'created_at';
      const sortAscending = filters?.sortOrder === 'asc';

      const { data, count, error } = await query
        .order(sortColumn, { ascending: sortAscending })
        .range(from, to);

      if (error) return { data: null, error };

      const totalCount = count ?? 0;
      const contacts = (data || []).map(c => transformContact(c as unknown as DbContact));
      const hasMore = (pageIndex + 1) * pageSize < totalCount;

      return {
        data: {
          data: contacts,
          totalCount,
          pageIndex,
          pageSize,
          hasMore,
        },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Cria um novo contato.
   * 
   * @param contact - Dados do contato (sem id e createdAt).
   * @returns Promise com contato criado ou erro.
   */
  async create(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<{ data: Contact | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }

      // organization_id e owner_id são obrigatórios para RLS.
      // Se não vierem no objeto, inferimos do usuário autenticado.
      let organizationId = sanitizeUUID((contact as { organizationId?: string }).organizationId);
      let ownerId = sanitizeUUID(contact.ownerId);

      if (!organizationId || !ownerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { data: null, error: new Error('Usuário não autenticado') };
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          return { data: null, error: new Error('Perfil sem organização') };
        }
        if (!organizationId) organizationId = profile.organization_id;
        if (!ownerId) ownerId = profile.id;
      }

      const phoneE164 = normalizePhoneE164(contact.phone);
      const insertData = {
        name: contact.name,
        email: sanitizeText(contact.email),
        phone: sanitizeText(phoneE164),
        avatar: sanitizeText(contact.avatar),
        notes: sanitizeText(contact.notes),
        status: contact.status || 'ACTIVE',
        stage: contact.stage || 'LEAD',
        source: sanitizeText(contact.source),
        birth_date: sanitizeText(contact.birthDate),
        last_interaction: sanitizeText(contact.lastInteraction),
        last_purchase_date: sanitizeText(contact.lastPurchaseDate),
        total_value: sanitizeNumber(contact.totalValue, 0),
        // Story 3.1
        cpf: sanitizeText(contact.cpf),
        contact_type: sanitizeText(contact.contactType) || 'PF',
        classification: sanitizeText(contact.classification),
        temperature: sanitizeText(contact.temperature) || 'WARM',
        address_cep: sanitizeText(contact.addressCep),
        address_city: sanitizeText(contact.addressCity),
        address_state: sanitizeText(contact.addressState),
        profile_data: contact.profileData || null,
        tags: contact.tags || [],
        custom_fields: contact.customFields || {},
        organization_id: organizationId,
        owner_id: ownerId,
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert(insertData)
        .select()
        .single();

      if (error) return { data: null, error };

      return { data: transformContact(data as DbContact), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Atualiza um contato existente.
   * 
   * @param id - ID do contato a ser atualizado.
   * @param updates - Campos a serem atualizados.
   * @returns Promise com erro, se houver.
   */
  async update(id: string, updates: Partial<Contact>): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase não configurado') };
      }
      const dbUpdates = transformContactToDb(updates);
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('contacts')
        .update(dbUpdates)
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Soft-delete de um contato (SET deleted_at = NOW()).
   * O trigger cascade_contact_delete no banco soft-deleta activities associadas.
   *
   * @param id - ID do contato a ser excluído.
   * @returns Promise com erro, se houver.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase não configurado') };
      }

      const { error } = await supabase
        .from('contacts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Verifica se o contato tem deals associados.
   * 
   * @param contactId - ID do contato.
   * @returns Promise com informações sobre os deals associados.
   */
  async hasDeals(contactId: string): Promise<{ hasDeals: boolean; dealCount: number; deals: Array<{ id: string; title: string }>; error: Error | null }> {
    try {
      if (!supabase) {
        return {
          hasDeals: false,
          dealCount: 0,
          deals: [],
          error: new Error('Supabase não configurado'),
        };
      }
      const { data, count, error } = await supabase
        .from('deals')
        .select('id, title', { count: 'exact' })
        .eq('contact_id', contactId)
        .is('deleted_at', null);

      if (error) return { hasDeals: false, dealCount: 0, deals: [], error };
      const deals = (data || []).map(d => ({ id: d.id, title: d.title }));
      return { hasDeals: (count || 0) > 0, dealCount: count || 0, deals, error: null };
    } catch (e) {
      return { hasDeals: false, dealCount: 0, deals: [], error: e as Error };
    }
  },

  /**
   * CP-7.1: Marca contato como "nao ligar mais" (LGPD opt-out).
   * Chama RPC que valida org membership e remove de filas ativas.
   */
  async markDoNotContact(contactId: string, reason: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase não configurado') };
      const { error } = await supabase.rpc('mark_do_not_contact', {
        p_contact_id: contactId,
        p_reason: reason,
      });
      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * CP-7.1: Reverte bloqueio "nao ligar mais". Apenas admin/diretor.
   */
  async revertDoNotContact(contactId: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) return { error: new Error('Supabase não configurado') };
      const { error } = await supabase.rpc('revert_do_not_contact', {
        p_contact_id: contactId,
      });
      if (error) {
        // Translate permission error to user-friendly message
        if (error.message?.includes('admin ou diretor')) {
          return { error: new Error('Apenas admin ou diretor pode reverter bloqueio') };
        }
        return { error };
      }
      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Soft-delete de contato e todos os deals associados (cascade).
   *
   * @param contactId - ID do contato.
   * @returns Promise com erro, se houver.
   */
  async deleteWithDeals(contactId: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase não configurado') };
      }
      const now = new Date().toISOString();

      // Soft-delete all deals for this contact
      const { error: dealsError } = await supabase
        .from('deals')
        .update({ deleted_at: now })
        .eq('contact_id', contactId)
        .is('deleted_at', null);

      if (dealsError) return { error: dealsError };

      // Then soft-delete the contact
      const { error: contactError } = await supabase
        .from('contacts')
        .update({ deleted_at: now })
        .eq('id', contactId)
        .is('deleted_at', null);

      return { error: contactError };
    } catch (e) {
      return { error: e as Error };
    }
  },
};

// ============================================
// CONTACT PHONES SERVICE (Story 3.1)
// ============================================

/**
 * Serviço de telefones de contatos.
 * CRUD para a tabela `contact_phones`.
 */
export const contactPhonesService = {
  /**
   * Busca todos os telefones de um contato.
   */
  async getByContactId(contactId: string): Promise<{ data: ContactPhone[] | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }
      const { data, error } = await supabase
        .from('contact_phones')
        .select('*')
        .eq('contact_id', contactId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) return { data: null, error };
      return {
        data: (data || []).map(p => transformContactPhone(p as DbContactPhone)),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Cria um novo telefone para um contato.
   * Primary uniqueness e sync com contacts.phone sao gerenciados por DB triggers
   * (ensure_single_primary_phone + sync_phones_to_contact).
   */
  async create(
    phone: Omit<ContactPhone, 'id' | 'createdAt' | 'updatedAt' | 'organizationId'>
  ): Promise<{ data: ContactPhone | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }

      const { data, error } = await supabase
        .from('contact_phones')
        .insert({
          contact_id: phone.contactId,
          phone_number: phone.phoneNumber,
          phone_type: phone.phoneType,
          is_whatsapp: phone.isWhatsapp,
          is_primary: phone.isPrimary,
        })
        .select()
        .single();

      if (error) return { data: null, error };

      return { data: transformContactPhone(data as DbContactPhone), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Atualiza um telefone existente.
   * Primary uniqueness e sync com contacts.phone sao gerenciados por DB triggers.
   */
  async update(
    id: string,
    updates: Partial<Pick<ContactPhone, 'phoneNumber' | 'phoneType' | 'isWhatsapp' | 'isPrimary'>>
  ): Promise<{ data: ContactPhone | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }

      const dbUpdates: Record<string, unknown> = {};
      if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
      if (updates.phoneType !== undefined) dbUpdates.phone_type = updates.phoneType;
      if (updates.isWhatsapp !== undefined) dbUpdates.is_whatsapp = updates.isWhatsapp;
      if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('contact_phones')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { data: null, error };

      return { data: transformContactPhone(data as DbContactPhone), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Exclui um telefone.
   * Sync com contacts.phone e gerenciado pelo DB trigger sync_phones_to_contact.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase não configurado') };
      }

      const { error } = await supabase
        .from('contact_phones')
        .delete()
        .eq('id', id);

      if (error) return { error };

      return { error: null };
    } catch (e) {
      return { error: e as Error };
    }
  },
};
