/**
 * @fileoverview Serviço Supabase para gerenciamento de atividades do CRM.
 * 
 * Este módulo fornece operações CRUD para atividades (tarefas, reuniões, ligações, etc.)
 * com validação de segurança defense-in-depth para isolamento multi-tenant.
 * 
 * ## Segurança Multi-Tenant
 * 
 * Além das políticas RLS, este serviço implementa verificação adicional
 * de organization_id antes de update/delete para prevenir ataques cross-tenant.
 * 
 * @module lib/supabase/activities
 */

import { supabase } from './client';
import { Activity } from '@/types';
import { sanitizeUUID } from './utils';
import { sortActivitiesSmart } from '@/lib/utils/activitySort';
import { recalculateScore } from './lead-scoring';

interface PostgrestError {
  message?: string;
  code?: string;
  details?: string;
}

// ============================================
// HELPERS
// ============================================

let cachedOrgUserId: string | null = null;
let cachedOrgId: string | null = null;

async function getOrganizationId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (cachedOrgUserId === user.id && cachedOrgId) return cachedOrgId;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (error) return null;

  const orgId = sanitizeUUID((profile as { organization_id?: string } | null)?.organization_id);
  cachedOrgUserId = user.id;
  cachedOrgId = orgId;
  return orgId;
}


// ============================================
// ACTIVITIES SERVICE
// ============================================

/**
 * Representação de atividade no banco de dados.
 * 
 * @interface DbActivity
 */
export interface DbActivity {
  /** ID único da atividade (UUID). */
  id: string;
  /** ID da organização/tenant. */
  organization_id: string;
  /** Título da atividade. */
  title: string;
  /** Descrição detalhada. */
  description: string | null;
  /** Tipo (CALL, MEETING, EMAIL, TASK). */
  type: string;
  /** Data/hora agendada. */
  date: string;
  /** Se a atividade foi concluída. */
  completed: boolean;
  /** ID do deal associado. */
  deal_id: string | null;
  /** ID do contato associado. */
  contact_id: string | null;
  /** IDs dos contatos participantes (opcional). */
  participant_contact_ids?: string[] | null;
  /** Data de criação. */
  created_at: string;
  /** ID do dono/responsável. */
  owner_id: string | null;
  /** Tipo de recorrência (daily, weekly, monthly). */
  recurrence_type?: string | null;
  /** Data limite da recorrência. */
  recurrence_end_date?: string | null;
  /** Structured metadata (call outcome, duration, etc.). CP-1.1 */
  metadata?: Record<string, unknown> | null;
}

// Interface auxiliar para o retorno do Supabase com o join
interface DbActivityWithDeal extends DbActivity {
  deals?: { title: string } | null;
}

/**
 * Transforma atividade do formato DB para o formato da aplicação.
 * 
 * @param db - Atividade no formato do banco.
 * @returns Atividade no formato da aplicação.
 */
const transformActivity = (db: DbActivityWithDeal): Activity => ({
  id: db.id,
  organizationId: db.organization_id,
  title: db.title,
  description: db.description || undefined,
  type: db.type as Activity['type'],
  date: db.date,
  completed: db.completed,
  dealId: db.deal_id || undefined,
  contactId: db.contact_id || undefined,
  participantContactIds: db.participant_contact_ids || [],
  dealTitle: db.deals?.title || '',
  user: { name: 'Você', avatar: '' }, // Will be enriched later
  recurrenceType: (db.recurrence_type as Activity['recurrenceType']) || null,
  recurrenceEndDate: db.recurrence_end_date || null,
  metadata: db.metadata || undefined,
});

/**
 * Transforma atividade do formato da aplicação para o formato DB.
 * 
 * @param activity - Atividade parcial no formato da aplicação.
 * @returns Atividade parcial no formato do banco.
 */
const transformActivityToDb = (activity: Partial<Activity>): Partial<DbActivity> => {
  const db: Partial<DbActivity> = {};

  if (activity.title !== undefined) db.title = activity.title;
  if (activity.description !== undefined) db.description = activity.description || null;
  if (activity.type !== undefined) db.type = activity.type;
  if (activity.date !== undefined) db.date = activity.date;
  if (activity.completed !== undefined) db.completed = activity.completed;
  if (activity.dealId !== undefined) db.deal_id = sanitizeUUID(activity.dealId);
  if (activity.contactId !== undefined) db.contact_id = sanitizeUUID(activity.contactId);
  if (activity.participantContactIds !== undefined) db.participant_contact_ids = activity.participantContactIds || [];
  if (activity.recurrenceType !== undefined) db.recurrence_type = activity.recurrenceType || null;
  if (activity.recurrenceEndDate !== undefined) db.recurrence_end_date = activity.recurrenceEndDate || null;
  if (activity.metadata !== undefined) db.metadata = activity.metadata || null;

  return db;
};

export const activitiesService = {
  /**
   * Busca todas as atividades.
   * 
   * @returns Promise com array de atividades ou erro.
   */
  async getAll(): Promise<{ data: Activity[] | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const { data, error } = await sb
        .from('activities')
        .select(`
          *,
          deals:deal_id (title)
        `)
        .order('date', { ascending: false }); // Ordenação básica do banco

      if (error) return { data: null, error };
      
      // Transforma e aplica ordenação inteligente
      const activities = (data || []).map(a => transformActivity(a as DbActivityWithDeal));
      return { data: sortActivitiesSmart(activities), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Busca as últimas N atividades de um contato específico (CP-2.1).
   * Usado pelo ContactHistory no PowerDialer.
   */
  async getContactActivities(contactId: string, limit = 5): Promise<{ data: Activity[] | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const { data, error } = await sb
        .from('activities')
        .select(`
          *,
          deals:deal_id (title)
        `)
        .eq('contact_id', contactId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) return { data: null, error };
      return { data: (data || []).map(a => transformActivity(a as DbActivityWithDeal)), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Cria uma nova atividade.
   *
   * @param activity - Dados da atividade (sem id e createdAt).
   * @returns Promise com atividade criada ou erro.
   */
  async create(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<{ data: Activity | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      const orgId = await getOrganizationId();
      if (!orgId) return { data: null, error: new Error('Organização não encontrada') };

      const { data: { user } } = await sb.auth.getUser();

      const contactIdSanitized = sanitizeUUID(activity.contactId);
      const insertData: Record<string, unknown> = {
        title: activity.title,
        description: activity.description || null,
        type: activity.type,
        date: activity.date,
        completed: activity.completed || false,
        deal_id: sanitizeUUID(activity.dealId),
        contact_id: contactIdSanitized,
        participant_contact_ids: activity.participantContactIds || [],
        organization_id: orgId,
        owner_id: user?.id || null,
        recurrence_type: activity.recurrenceType || null,
        recurrence_end_date: activity.recurrenceEndDate || null,
        metadata: activity.metadata || null,
      };

      const { data, error } = await sb.from('activities').insert(insertData).select().single();

      if (error) {
        const pgError = error as PostgrestError;
        const msg = pgError?.message || '';
        const code = pgError?.code || '';
        const isColumnMissing = code === '42703' || msg.includes('schema cache') || code === 'PGRST204';
        if (isColumnMissing) {
          if (msg.includes('participant_contact_ids')) delete insertData.participant_contact_ids;
          if (msg.includes('recurrence_type')) delete insertData.recurrence_type;
          if (msg.includes('recurrence_end_date')) delete insertData.recurrence_end_date;
          if (msg.includes('metadata')) delete insertData.metadata;
          const retry = await sb.from('activities').insert(insertData).select().single();
          if (retry.error) return { data: null, error: retry.error };
          const result = transformActivity(retry.data as DbActivity);
          if (contactIdSanitized && activity.completed) {
            recalculateScore(contactIdSanitized, orgId).catch(() => {});
          }
          return { data: result, error: null };
        }
        return { data: null, error };
      }
      if (contactIdSanitized && activity.completed) {
        recalculateScore(contactIdSanitized, orgId).catch(() => {});
      }
      return { data: transformActivity(data as DbActivity), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Atualiza uma atividade existente.
   * 
   * @param id - ID da atividade.
   * @param updates - Campos a serem atualizados.
   * @returns Promise com erro, se houver.
   */
  async update(id: string, updates: Partial<Activity>): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const dbUpdates = transformActivityToDb(updates);

      const { error } = await sb.from('activities').update(dbUpdates as Partial<DbActivity>).eq('id', id);

      // Retry se colunas novas não existem ainda ou schema cache desatualizado
      if (error) {
        const pgError = error as PostgrestError;
        const msg = pgError?.message || '';
        const code = pgError?.code || '';
        const isColumnMissing = code === '42703' || msg.includes('schema cache') || code === 'PGRST204';
        if (isColumnMissing) {
          const cleaned: Record<string, unknown> = { ...dbUpdates };
          if (msg.includes('participant_contact_ids')) delete cleaned.participant_contact_ids;
          if (msg.includes('recurrence_type')) delete cleaned.recurrence_type;
          if (msg.includes('recurrence_end_date')) delete cleaned.recurrence_end_date;
          const retry = await sb.from('activities').update(cleaned).eq('id', id);
          if (retry.error) return { error: retry.error };
          return { error: null };
        }
      }

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Exclui uma atividade.
   * 
   * @param id - ID da atividade.
   * @returns Promise com erro, se houver.
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { error: new Error('Supabase não configurado') };

      const { error } = await sb
        .from('activities')
        .delete()
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },

  /**
   * Alterna o status de conclusão de uma atividade.
   * 
   * @param id - ID da atividade.
   * @returns Promise com novo status de conclusão ou erro.
   */
  async toggleCompletion(id: string): Promise<{ data: boolean | null; error: Error | null }> {
    try {
      const sb = supabase;
      if (!sb) return { data: null, error: new Error('Supabase não configurado') };

      // First get current state
      const { data: current, error: fetchError } = await sb
        .from('activities')
        .select('completed, contact_id')
        .eq('id', id)
        .single();

      if (fetchError || !current) {
        return { data: null, error: new Error('Activity not found') };
      }

      const newCompleted = !current.completed;

      const { error } = await sb
        .from('activities')
        .update({ completed: newCompleted })
        .eq('id', id);

      if (error) return { data: null, error };

      // Story 3.8 — fire-and-forget lead score recalculation when completing
      if (newCompleted && current.contact_id) {
        const orgId = await getOrganizationId();
        if (orgId) {
          recalculateScore(current.contact_id, orgId).catch(() => {});
        }
      }

      return { data: newCompleted, error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },
};
