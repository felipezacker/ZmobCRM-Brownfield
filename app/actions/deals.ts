'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeUUID, requireUUID } from '@/lib/supabase/utils'
import { DbDeal, DbDealItem, DbDealWithItems, transformDeal, transformDealToDb } from '@/lib/supabase/deals'
import type { Deal, DealItem } from '@/types'

export async function createDeal(
  deal: Omit<Deal, 'id' | 'createdAt' | 'isWon' | 'isLost'> & {
    isWon?: boolean
    isLost?: boolean
    stageId?: string
  }
): Promise<{ data: Deal | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const stageId = deal.stageId || deal.status || null

    let boardId: string
    try {
      boardId = requireUUID(deal.boardId, 'Board ID')
    } catch (e) {
      return { data: null, error: (e as Error).message }
    }

    // Verify board exists and get organization_id
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, organization_id')
      .eq('id', boardId)
      .single()

    if (boardError || !board) {
      return { data: null, error: `Board não encontrado: ${boardId}. Recarregue a página.` }
    }

    const organizationId = sanitizeUUID((deal as Record<string, unknown>).organizationId as string)
      || sanitizeUUID((board as Record<string, unknown>).organization_id as string)

    if (!organizationId) {
      return { data: null, error: 'Organização não identificada para este deal.' }
    }

    const insertData = {
      organization_id: organizationId,
      title: deal.title,
      value: deal.value || 0,
      probability: deal.probability || 0,
      status: deal.status,
      priority: deal.priority || 'medium',
      board_id: boardId,
      stage_id: sanitizeUUID(stageId),
      contact_id: sanitizeUUID(deal.contactId),
      tags: deal.tags || [],
      custom_fields: deal.customFields || {},
      owner_id: sanitizeUUID(deal.ownerId),
      is_won: deal.isWon ?? false,
      is_lost: deal.isLost ?? false,
      closed_at: deal.closedAt ?? null,
    }

    const { data, error } = await supabase
      .from('deals')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505' || error.message?.includes('unique_violation') || error.message?.includes('Já existe um negócio')) {
        return { data: null, error: 'Já existe um negócio com este título para este contato.' }
      }
      return { data: null, error: error.message }
    }

    // Create items if any
    if (deal.items && deal.items.length > 0) {
      const itemsToInsert = deal.items.map(item => ({
        deal_id: data.id,
        product_id: item.productId || null,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))

      const { error: itemsError } = await supabase
        .from('deal_items')
        .insert(itemsToInsert)

      if (itemsError) return { data: null, error: itemsError.message }
    }

    // Fetch items for complete deal
    const { data: items } = await supabase
      .from('deal_items')
      .select('*')
      .eq('deal_id', data.id)

    return {
      data: transformDeal(data as DbDeal, (items || []) as DbDealItem[]),
      error: null,
    }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
}

export async function updateDeal(
  id: string,
  updates: Partial<Deal>
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const dbUpdates = transformDealToDb(updates)
    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('deals')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      if (error.code === '23505' || error.message?.includes('unique_violation') || error.message?.includes('Já existe um negócio')) {
        return { error: 'Já existe um negócio com este título para este contato.' }
      }
      return { error: error.message }
    }
    return { error: null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteDeal(
  id: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id)

    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
