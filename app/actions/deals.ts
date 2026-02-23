'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeUUID, requireUUID, isValidUUID } from '@/lib/supabase/utils'
import type { Deal, DealItem } from '@/types'

type DbDeal = {
  id: string
  organization_id: string
  title: string
  value: number
  probability: number
  status: string | null
  priority: string
  board_id: string | null
  stage_id: string | null
  contact_id: string | null
  ai_summary: string | null
  loss_reason: string | null
  tags: string[]
  last_stage_change_date: string | null
  custom_fields: Record<string, unknown>
  created_at: string
  updated_at: string
  owner_id: string | null
  is_won: boolean
  is_lost: boolean
  closed_at: string | null
}

type DbDealItem = {
  id: string
  organization_id: string
  deal_id: string
  product_id: string | null
  name: string
  quantity: number
  price: number
  created_at: string
}

interface DbDealWithItems extends DbDeal {
  deal_items: DbDealItem[]
}

function transformDeal(db: DbDeal | DbDealWithItems, items?: DbDealItem[]): Deal {
  const stageStatus = db.stage_id || db.status || ''
  const dealItems = 'deal_items' in db ? db.deal_items : (items || [])
  const filteredItems = 'deal_items' in db
    ? dealItems
    : dealItems.filter(i => i.deal_id === db.id)

  return {
    id: db.id,
    organizationId: db.organization_id,
    title: db.title,
    value: db.value || 0,
    probability: db.probability || 0,
    status: stageStatus,
    isWon: db.is_won ?? false,
    isLost: db.is_lost ?? false,
    closedAt: db.closed_at || undefined,
    priority: (db.priority as Deal['priority']) || 'medium',
    boardId: db.board_id || '',
    contactId: db.contact_id || '',
    aiSummary: db.ai_summary || undefined,
    lossReason: db.loss_reason || undefined,
    tags: db.tags || [],
    lastStageChangeDate: db.last_stage_change_date || undefined,
    customFields: db.custom_fields || {},
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    items: filteredItems.map(i => ({
      id: i.id,
      organizationId: i.organization_id,
      productId: i.product_id || '',
      name: i.name,
      quantity: i.quantity,
      price: i.price,
    })),
    owner: { name: 'Sem Dono', avatar: '' },
    ownerId: db.owner_id || undefined,
  }
}

function transformDealToDb(deal: Partial<Deal>): Record<string, unknown> {
  const db: Record<string, unknown> = {}
  if (deal.title !== undefined) db.title = deal.title
  if (deal.value !== undefined) db.value = deal.value
  if (deal.probability !== undefined) db.probability = deal.probability
  if (deal.status !== undefined && isValidUUID(deal.status)) {
    db.stage_id = deal.status
  }
  if (deal.isWon !== undefined) db.is_won = deal.isWon
  if (deal.isLost !== undefined) db.is_lost = deal.isLost
  if (deal.closedAt !== undefined) db.closed_at = deal.closedAt || null
  if (deal.priority !== undefined) db.priority = deal.priority
  if (deal.boardId !== undefined) db.board_id = sanitizeUUID(deal.boardId)
  if (deal.contactId !== undefined) db.contact_id = sanitizeUUID(deal.contactId)
  if (deal.aiSummary !== undefined) db.ai_summary = deal.aiSummary || null
  if (deal.lossReason !== undefined) db.loss_reason = deal.lossReason || null
  if (deal.tags !== undefined) db.tags = deal.tags
  if (deal.lastStageChangeDate !== undefined) db.last_stage_change_date = deal.lastStageChangeDate || null
  if (deal.customFields !== undefined) db.custom_fields = deal.customFields
  if (deal.ownerId !== undefined) db.owner_id = sanitizeUUID(deal.ownerId)
  return db
}

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
