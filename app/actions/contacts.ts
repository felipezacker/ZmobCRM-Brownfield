'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeNumber } from '@/lib/supabase/utils'
import { normalizePhoneE164 } from '@/lib/phone'
import { DbContact, transformContact, transformContactToDb } from '@/lib/supabase/contacts'
import type { Contact } from '@/types'

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
      // Story 3.1
      cpf: sanitizeText(contact.cpf),
      contact_type: sanitizeText(contact.contactType) || 'PF',
      classification: sanitizeText(contact.classification),
      temperature: sanitizeText(contact.temperature) || 'WARM',
      address_cep: sanitizeText(contact.addressCep),
      address_city: sanitizeText(contact.addressCity),
      address_state: sanitizeText(contact.addressState),
      profile_data: contact.profileData || null,
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
    // Soft-delete: marca deleted_at em vez de remover fisicamente
    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    return { error: error?.message ?? null }
  } catch (e) {
    return { error: (e as Error).message }
  }
}
