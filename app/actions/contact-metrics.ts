'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getNewContactsByPeriod,
  getContactsBySource,
  getConversionFunnel,
  getDistribution,
  getBrokerPerformance,
} from '@/lib/supabase/contact-metrics'
import type {
  PeriodCount,
  SourceCount,
  FunnelStage,
  DistributionItem,
  BrokerPerformance,
} from '@/lib/supabase/contact-metrics'

export async function fetchNewContactsByPeriod(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<{ data: PeriodCount[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await getNewContactsByPeriod(orgId, startDate, endDate, supabase)
    if (error) return { data: [], error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: [], error: (e as Error).message }
  }
}

export async function fetchContactsBySource(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<{ data: SourceCount[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await getContactsBySource(orgId, startDate, endDate, supabase)
    if (error) return { data: [], error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: [], error: (e as Error).message }
  }
}

export async function fetchConversionFunnel(
  orgId: string
): Promise<{ data: FunnelStage[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await getConversionFunnel(orgId, supabase)
    if (error) return { data: [], error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: [], error: (e as Error).message }
  }
}

export async function fetchDistribution(
  orgId: string
): Promise<{
  data: { byClassification: DistributionItem[]; byTemperature: DistributionItem[] };
  error: string | null;
}> {
  try {
    const supabase = await createClient()
    const { data, error } = await getDistribution(orgId, supabase)
    if (error) return { data: { byClassification: [], byTemperature: [] }, error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: { byClassification: [], byTemperature: [] }, error: (e as Error).message }
  }
}

export async function fetchBrokerPerformance(
  orgId: string
): Promise<{ data: BrokerPerformance[]; error: string | null }> {
  try {
    const supabase = await createClient()
    const { data, error } = await getBrokerPerformance(orgId, supabase)
    if (error) return { data: [], error: error.message }
    return { data, error: null }
  } catch (e) {
    return { data: [], error: (e as Error).message }
  }
}
