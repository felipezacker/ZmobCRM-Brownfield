/**
 * @fileoverview Service de metricas de contatos (Story 3.10)
 *
 * Queries agregadas para dashboard de metricas:
 * - Contatos novos por periodo
 * - Contatos por source
 * - Funil de conversao por stage
 * - Distribuicao por classificacao/temperatura
 * - Performance por corretor
 *
 * @module lib/supabase/contact-metrics
 */

import { supabase } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface PeriodCount {
  period: string; // YYYY-MM or YYYY-WW
  count: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

export interface DistributionItem {
  label: string;
  count: number;
}

export interface BrokerPerformance {
  ownerId: string;
  ownerName: string;
  contactCount: number;
  dealsWon: number;
  ltvGenerated: number;
}

// ============================================
// QUERIES
// ============================================

/**
 * Contatos novos por mes dentro de um periodo.
 */
export async function getNewContactsByPeriod(
  orgId: string,
  startDate: string,
  endDate: string,
  client?: SupabaseClient
): Promise<{ data: PeriodCount[]; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { data: [], error: new Error('Supabase nao configurado') };

    const { data, error } = await sb
      .from('contacts')
      .select('created_at')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) return { data: [], error };

    // Group by month client-side
    const grouped: Record<string, number> = {};
    for (const c of data || []) {
      const month = c.created_at.substring(0, 7); // YYYY-MM
      grouped[month] = (grouped[month] || 0) + 1;
    }

    const result = Object.entries(grouped).map(([period, count]) => ({ period, count }));
    return { data: result, error: null };
  } catch (e) {
    return { data: [], error: e as Error };
  }
}

/**
 * Contatos por source (WEBSITE, LINKEDIN, REFERRAL, MANUAL).
 */
export async function getContactsBySource(
  orgId: string,
  startDate: string,
  endDate: string,
  client?: SupabaseClient
): Promise<{ data: SourceCount[]; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { data: [], error: new Error('Supabase nao configurado') };

    const { data, error } = await sb
      .from('contacts')
      .select('source')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) return { data: [], error };

    const grouped: Record<string, number> = {};
    for (const c of data || []) {
      const src = (c as any).source || 'MANUAL';
      grouped[src] = (grouped[src] || 0) + 1;
    }

    const result = Object.entries(grouped)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
    return { data: result, error: null };
  } catch (e) {
    return { data: [], error: e as Error };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Funil de conversao por lifecycle stage.
 * Resolve UUIDs de board_stages para nomes de lifecycle stage automaticamente.
 */
export async function getConversionFunnel(
  orgId: string,
  client?: SupabaseClient
): Promise<{ data: FunnelStage[]; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { data: [], error: new Error('Supabase nao configurado') };

    const { data, error } = await sb
      .from('contacts')
      .select('stage')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (error) return { data: [], error };

    // Collect raw stage values
    const rawStages: string[] = (data || []).map((c: any) => c.stage || 'LEAD');

    // Detect UUID stage values and resolve them via board_stages
    const uuidStages = [...new Set(rawStages.filter(s => UUID_RE.test(s)))];
    const uuidToName: Record<string, string> = {};

    if (uuidStages.length > 0) {
      const { data: boardStages } = await sb
        .from('board_stages')
        .select('id, label, linked_lifecycle_stage')
        .in('id', uuidStages);

      for (const bs of boardStages || []) {
        // Prefer linked_lifecycle_stage (LEAD/MQL/etc.), fallback to label
        uuidToName[bs.id] = (bs as any).linked_lifecycle_stage || (bs as any).label || bs.id;
      }
    }

    // Group by resolved stage name
    const grouped: Record<string, number> = {};
    for (const raw of rawStages) {
      const resolved = uuidToName[raw] || raw;
      grouped[resolved] = (grouped[resolved] || 0) + 1;
    }

    const total = rawStages.length || 1;
    const stageOrder = ['LEAD', 'MQL', 'PROSPECT', 'CUSTOMER'];
    const result: FunnelStage[] = [];

    for (const stage of stageOrder) {
      const count = grouped[stage] || 0;
      result.push({ stage, count, percentage: Math.round((count / total) * 100) });
    }

    // Add any other stages not in the standard order
    for (const [stage, count] of Object.entries(grouped)) {
      if (!stageOrder.includes(stage)) {
        result.push({ stage, count, percentage: Math.round((count / total) * 100) });
      }
    }

    return { data: result, error: null };
  } catch (e) {
    return { data: [], error: e as Error };
  }
}

/**
 * Distribuicao por classificacao e temperatura.
 */
export async function getDistribution(
  orgId: string,
  client?: SupabaseClient
): Promise<{
  data: { byClassification: DistributionItem[]; byTemperature: DistributionItem[] };
  error: Error | null;
}> {
  try {
    const sb = client || supabase;
    if (!sb) return { data: { byClassification: [], byTemperature: [] }, error: new Error('Supabase nao configurado') };

    const { data, error } = await sb
      .from('contacts')
      .select('classification, temperature')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (error) return { data: { byClassification: [], byTemperature: [] }, error };

    const classGrouped: Record<string, number> = {};
    const tempGrouped: Record<string, number> = {};

    for (const c of data || []) {
      const cls = (c as any).classification || 'Nao classificado';
      const temp = (c as any).temperature || 'WARM';
      classGrouped[cls] = (classGrouped[cls] || 0) + 1;
      tempGrouped[temp] = (tempGrouped[temp] || 0) + 1;
    }

    return {
      data: {
        byClassification: Object.entries(classGrouped)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
        byTemperature: Object.entries(tempGrouped)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      },
      error: null,
    };
  } catch (e) {
    return { data: { byClassification: [], byTemperature: [] }, error: e as Error };
  }
}

/**
 * Performance por corretor: contatos, deals won, LTV.
 */
export async function getBrokerPerformance(
  orgId: string,
  client?: SupabaseClient
): Promise<{ data: BrokerPerformance[]; error: Error | null }> {
  try {
    const sb = client || supabase;
    if (!sb) return { data: [], error: new Error('Supabase nao configurado') };

    // Get profiles (brokers)
    const { data: profiles, error: profErr } = await sb
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId);

    if (profErr) return { data: [], error: profErr };

    // Get contacts per owner
    const { data: contacts, error: conErr } = await sb
      .from('contacts')
      .select('owner_id, total_value')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    if (conErr) return { data: [], error: conErr };

    // Get won deals per owner
    const { data: deals, error: dealErr } = await sb
      .from('deals')
      .select('owner_id, value')
      .eq('organization_id', orgId)
      .eq('is_won', true)
      .is('deleted_at', null);

    if (dealErr) return { data: [], error: dealErr };

    // Build broker map
    const brokerMap: Record<string, BrokerPerformance> = {};
    for (const p of profiles || []) {
      brokerMap[p.id] = {
        ownerId: p.id,
        ownerName: (p as any).full_name || 'Sem nome',
        contactCount: 0,
        dealsWon: 0,
        ltvGenerated: 0,
      };
    }

    for (const c of contacts || []) {
      const oid = (c as any).owner_id;
      if (oid && brokerMap[oid]) {
        brokerMap[oid].contactCount++;
      }
    }

    for (const d of deals || []) {
      const oid = (d as any).owner_id;
      if (oid && brokerMap[oid]) {
        brokerMap[oid].dealsWon++;
        brokerMap[oid].ltvGenerated += (d as any).value || 0;
      }
    }

    const result = Object.values(brokerMap)
      .filter(b => b.contactCount > 0 || b.dealsWon > 0)
      .sort((a, b) => b.ltvGenerated - a.ltvGenerated);

    return { data: result, error: null };
  } catch (e) {
    return { data: [], error: e as Error };
  }
}
