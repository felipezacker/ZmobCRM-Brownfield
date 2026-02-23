'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeNumber } from '@/lib/supabase/utils'
import { normalizePhoneE164 } from '@/lib/phone'
import type { Contact } from '@/types'

type DbContact = {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  notes: string | null
  status: string
  stage: string
  source: string | null
  birth_date: string | null
  last_interaction: string | null
  last_purchase_date: string | null
  total_value: number
  created_at: string
  updated_at: string
  owner_id: string | null
}

function transformContact(db: DbContact): Contact {
  return {
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
  }
}

function transformContactToDb(contact: Partial<Contact>): Record<string, unknown> {
  const db: Record<string, unknown> = {}
  if (contact.name !== undefined) db.name = contact.name
  if (contact.email !== undefined) db.email = contact.email || null
  if (contact.phone !== undefined) {
    const e164 = normalizePhoneE164(contact.phone)
    db.phone = e164 ? e164 : null
  }
  if (contact.avatar !== undefined) db.avatar = contact.avatar || null
  if (contact.notes !== undefined) db.notes = contact.notes || null
  if (contact.status !== undefined) db.status = contact.status
  if (contact.stage !== undefined) db.stage = contact.stage
  if (contact.source !== undefined) db.source = contact.source || null
  if (contact.birthDate !== undefined) db.birth_date = contact.birthDate || null
  if (contact.lastInteraction !== undefined) db.last_interaction = contact.lastInteraction || null
  if (contact.lastPurchaseDate !== undefined) db.last_purchase_date = contact.lastPurchaseDate || null
  if (contact.totalValue !== undefined) db.total_value = contact.totalValue
  if (contact.ownerId !== undefined) db.owner_id = contact.ownerId || null
  return db
}

export async function createContact(
  contact: Omit<Contact, 'id' | 'createdAt'>
): Promise<{ data: Contact | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const phoneE164 = normalizePhoneE164(contact.phone)

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
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single()

    if (error) return { data: null, error: error.message }
    return { data: transformContact(data as DbContact), error: null }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const dbUpdates = transformContactToDb(updates)
    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('contacts')
      .update(dbUpdates)
      .eq('id', id)

    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function deleteContact(
  id: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)

    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
