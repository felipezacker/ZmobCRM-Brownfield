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
import { Contact, OrganizationId, PaginationState, PaginatedResponse, ContactsServerFilters } from '@/types';
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
   * @returns Promise com objeto de contagens por estágio.
   * 
   * @example
   * ```typescript
   * const { data } = await contactsService.getStageCounts();
   * // data = { LEAD: 1500, MQL: 2041, PROSPECT: 800, ... }
   * ```
   */
  async getStageCounts(): Promise<{ data: Record<string, number> | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase não configurado') };
      }
      const { data, error } = await supabase.rpc('get_contact_stage_counts');

      if (error) return { data: null, error };

      // Transform array to object
      const counts: Record<string, number> = {};
      if (data) {
        for (const row of data as Array<{ stage: string; count: number }>) {
          counts[row.stage] = row.count;
        }
      }

      return { data: counts, error: null };
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
        .in('id', uniqueIds);

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
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters) {
        // T007: Search filter (name OR email)
        if (filters.search && filters.search.trim()) {
          const searchTerm = filters.search.trim();
          query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
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

      }

      // Apply pagination and ordering
      const sortColumn = filters?.sortBy || 'created_at';
      const sortAscending = filters?.sortOrder === 'asc';

      const { data, count, error } = await query
        .order(sortColumn, { ascending: sortAscending })
        .range(from, to);

      if (error) return { data: null, error };

      const totalCount = count ?? 0;
      const contacts = (data || []).map(c => transformContact(c as DbContact));
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
   * Exclui um contato.
   * 
   * @param id - ID do contato a ser excluído.
   * @returns Promise com erro, se houver.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase não configurado') };
      }
      // UX: ao excluir contato, também removemos atividades "contact-only"
      // (FK em activities.contact_id é SET NULL, então deletamos explicitamente
      // para evitar tarefas órfãs aparecerem no Inbox/Focus.)
      const { error: activitiesError } = await supabase
        .from('activities')
        .delete()
        .eq('contact_id', id);
      if (activitiesError) return { error: activitiesError };

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

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
        .eq('contact_id', contactId);

      if (error) return { hasDeals: false, dealCount: 0, deals: [], error };
      const deals = (data || []).map(d => ({ id: d.id, title: d.title }));
      return { hasDeals: (count || 0) > 0, dealCount: count || 0, deals, error: null };
    } catch (e) {
      return { hasDeals: false, dealCount: 0, deals: [], error: e as Error };
    }
  },

  /**
   * Exclui contato e todos os deals associados (cascade).
   * 
   * @param contactId - ID do contato.
   * @returns Promise com erro, se houver.
   */
  async deleteWithDeals(contactId: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase não configurado') };
      }
      // First delete all deals for this contact
      const { error: dealsError } = await supabase
        .from('deals')
        .delete()
        .eq('contact_id', contactId);

      if (dealsError) return { error: dealsError };

      // Then delete the contact
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      return { error: contactError };
    } catch (e) {
      return { error: e as Error };
    }
  },
};
