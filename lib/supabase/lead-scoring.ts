/**
 * @fileoverview Lead Scoring Engine — Story 3.8
 *
 * Calcula score 0-100 para contatos baseado em 7 fatores deterministicos.
 * Usado via server actions para recalculo apos eventos (create, update, won, lost).
 *
 * @module lib/supabase/lead-scoring
 */

import { supabase as globalClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface ScoreBreakdown {
  recentInteraction: number;
  ltv: number;
  stageAge: number;
  completedActivities: number;
  preferences: number;
  activeDeals: number;
  temperature: number;
  total: number;
}

// ============================================
// SCORE CALCULATION
// ============================================

/**
 * Calcula o lead score (0-100) de um contato baseado em 7 fatores.
 *
 * @param contactId - ID do contato
 * @param orgId - ID da organizacao
 * @param client - Supabase client opcional (usa global se omitido)
 */
export async function calculateLeadScore(
  contactId: string,
  orgId: string,
  client?: SupabaseClient
): Promise<{ breakdown: ScoreBreakdown; oldScore: number; error: Error | null }> {
  const breakdown: ScoreBreakdown = {
    recentInteraction: 0,
    ltv: 0,
    stageAge: 0,
    completedActivities: 0,
    preferences: 0,
    activeDeals: 0,
    temperature: 0,
    total: 0,
  };

  try {
    const sb = client || globalClient;
    if (!sb) {
      return { breakdown, oldScore: 0, error: new Error('Supabase nao configurado') };
    }

    // Fetch contact data (includes lead_score for history tracking)
    const { data: contact, error: contactError } = await sb
      .from('contacts')
      .select('id, last_interaction, total_value, temperature, updated_at, deleted_at, lead_score')
      .eq('id', contactId)
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .single();

    if (contactError || !contact) {
      return { breakdown, oldScore: 0, error: contactError || new Error('Contato nao encontrado') };
    }

    const previousScore = contact.lead_score ?? 0;

    const now = Date.now();

    // Factor 1: Recent interaction
    if (contact.last_interaction) {
      const daysSinceInteraction = (now - new Date(contact.last_interaction).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceInteraction < 7) breakdown.recentInteraction = 20;
      else if (daysSinceInteraction < 30) breakdown.recentInteraction = 10;
    }

    // Factor 2: LTV
    if ((contact.total_value || 0) > 0) {
      breakdown.ltv = 15;
    }

    // Factor 3: Stage age (using updated_at as proxy — PO nota)
    if (contact.updated_at) {
      const daysSinceUpdate = (now - new Date(contact.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) breakdown.stageAge = 10;
      else if (daysSinceUpdate > 90) breakdown.stageAge = -10;
    }

    // Factor 4: Completed activities
    // Query via deals do contato + diretamente via contact_id (single OR query to avoid double-counting)
    const { data: dealIds } = await sb
      .from('deals')
      .select('id')
      .eq('contact_id', contactId)
      .is('deleted_at', null);

    const contactDealIds = (dealIds || []).map((d: { id: string }) => d.id);

    let completedCount = 0;
    if (contactDealIds.length > 0) {
      // Single OR query: activities linked via deal OR via contact_id (no double-count)
      const { count } = await sb
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('completed', true)
        .or(`contact_id.eq.${contactId},deal_id.in.(${contactDealIds.join(',')})`);
      completedCount = count || 0;
    } else {
      // No deals — only count direct contact activities
      const { count } = await sb
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('contact_id', contactId)
        .eq('completed', true);
      completedCount = count || 0;
    }

    if (completedCount > 5) breakdown.completedActivities = 15;
    else if (completedCount > 2) breakdown.completedActivities = 8;

    // Factor 5: Preferences filled
    const { count: prefCount } = await sb
      .from('contact_preferences')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId);

    if ((prefCount || 0) > 0) {
      breakdown.preferences = 10;
    }

    // Factor 6: Active deals (not won, not lost)
    const { count: activeDealCount } = await sb
      .from('deals')
      .select('id', { count: 'exact', head: true })
      .eq('contact_id', contactId)
      .eq('is_won', false)
      .eq('is_lost', false)
      .is('deleted_at', null);

    const activeCount = activeDealCount || 0;
    if (activeCount > 0) breakdown.activeDeals = 20;
    if (activeCount > 1) breakdown.activeDeals = 25; // 20 + 5 bonus

    // Factor 7: Temperature
    if (contact.temperature === 'HOT') breakdown.temperature = 10;
    else if (contact.temperature === 'COLD') breakdown.temperature = -10;

    // Calculate total (clamped 0-100)
    breakdown.total = Math.max(0, Math.min(100,
      breakdown.recentInteraction +
      breakdown.ltv +
      breakdown.stageAge +
      breakdown.completedActivities +
      breakdown.preferences +
      breakdown.activeDeals +
      breakdown.temperature
    ));

    return { breakdown, oldScore: previousScore, error: null };
  } catch (e) {
    return { breakdown, oldScore: 0, error: e as Error };
  }
}

/**
 * Recalcula e salva o lead score de um contato no banco.
 *
 * @param contactId - ID do contato
 * @param orgId - ID da organizacao
 * @param client - Supabase client opcional (usa global se omitido)
 */
export async function recalculateScore(
  contactId: string,
  orgId: string,
  client?: SupabaseClient
): Promise<{ score: number; error: Error | null }> {
  try {
    const sb = client || globalClient;
    if (!sb) {
      return { score: 0, error: new Error('Supabase nao configurado') };
    }

    const { breakdown, oldScore, error } = await calculateLeadScore(contactId, orgId, sb);
    if (error) return { score: 0, error };

    const newScore = breakdown.total;

    const { error: updateError } = await sb
      .from('contacts')
      .update({ lead_score: newScore })
      .eq('id', contactId);

    if (updateError) return { score: 0, error: updateError };

    // Record history if score changed
    if (oldScore !== newScore) {
      const { error: historyError } = await sb.from('lead_score_history').insert({
        contact_id: contactId,
        organization_id: orgId,
        old_score: oldScore,
        new_score: newScore,
        change: newScore - oldScore,
      });
      if (historyError) {
        console.error('Failed to record score history:', historyError);
      }
    }

    return { score: newScore, error: null };
  } catch (e) {
    return { score: 0, error: e as Error };
  }
}

/**
 * Recalcula scores de todos contatos de uma org em batches de 500.
 *
 * @param orgId - ID da organizacao
 * @param client - Supabase client opcional (usa global se omitido)
 */
export async function batchRecalculateScores(
  orgId: string,
  client?: SupabaseClient
): Promise<{ updated: number; error: Error | null }> {
  try {
    const sb = client || globalClient;
    if (!sb) {
      return { updated: 0, error: new Error('Supabase nao configurado') };
    }

    let updated = 0;
    let offset = 0;
    const batchSize = 500;

    while (true) {
      const { data: contacts, error } = await sb
        .from('contacts')
        .select('id')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .range(offset, offset + batchSize - 1);

      if (error) return { updated, error };
      if (!contacts || contacts.length === 0) break;

      for (const contact of contacts) {
        const { error: recalcError } = await recalculateScore(contact.id, orgId, sb);
        if (!recalcError) updated++;
      }

      offset += batchSize;
      if (contacts.length < batchSize) break;
    }

    return { updated, error: null };
  } catch (e) {
    return { updated: 0, error: e as Error };
  }
}
