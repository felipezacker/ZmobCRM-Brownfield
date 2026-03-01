'use server'

import { createClient } from '@/lib/supabase/server'
import { sanitizeText, sanitizeNumber } from '@/lib/supabase/utils'
import { normalizePhoneE164 } from '@/lib/phone'
import { DbContact, transformContact, transformContactToDb } from '@/lib/supabase/contacts'
import { calculateLeadScore, recalculateScore, type ScoreBreakdown } from '@/lib/supabase/lead-scoring'
import type { Contact } from '@/types'

export async function createContact(
  contact: Omit<Contact, 'id' | 'createdAt'>
): Promise<{ data: Contact | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const phoneE164 = normalizePhoneE164(contact.phone)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Usuário não autenticado' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) return { data: null, error: 'Perfil não encontrado ou sem organização' }

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
      organization_id: profile.organization_id,
      owner_id: profile.id,
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single()

    if (error) return { data: null, error: 'Erro ao criar contato. Tente novamente.' }

    // Story 3.8 — calculate lead score before returning so the UI shows it immediately
    const { score } = await recalculateScore(data.id, profile.organization_id, supabase)
    const contactData = { ...data, lead_score: score } as DbContact

    return { data: transformContact(contactData), error: null }
  } catch (e) {
    console.error('createContact error:', e)
    return { data: null, error: 'Erro inesperado ao criar contato.' }
  }
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<{ error: string | null; leadScore?: number }> {
  try {
    const supabase = await createClient()
    const dbUpdates = transformContactToDb(updates)
    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('contacts')
      .update(dbUpdates)
      .eq('id', id)

    if (error) return { error: 'Erro ao atualizar contato. Tente novamente.' }

    // Story 3.8 — recalculate lead score synchronously so UI updates immediately
    const { data: contact } = await supabase
      .from('contacts')
      .select('organization_id')
      .eq('id', id)
      .single()

    let leadScore: number | undefined
    if (contact?.organization_id) {
      const { score } = await recalculateScore(id, contact.organization_id, supabase)
      leadScore = score
    }

    return { error: null, leadScore }
  } catch (e) {
    console.error('updateContact error:', e)
    return { error: 'Erro inesperado ao atualizar contato.' }
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

    if (error) return { error: 'Erro ao excluir contato. Tente novamente.' }
    return { error: null }
  } catch (e) {
    console.error('deleteContact error:', e)
    return { error: 'Erro inesperado ao excluir contato.' }
  }
}

// Story 3.8 — Lead Scoring

export async function recalculateLeadScore(
  contactId: string,
  orgId: string
): Promise<{ score: number; breakdown: ScoreBreakdown | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { breakdown, error } = await calculateLeadScore(contactId, orgId, supabase)
    if (error) return { score: 0, breakdown: null, error: 'Erro ao calcular lead score.' }

    const { error: updateError } = await supabase
      .from('contacts')
      .update({ lead_score: breakdown.total })
      .eq('id', contactId)

    if (updateError) return { score: 0, breakdown: null, error: 'Erro ao salvar lead score.' }

    return { score: breakdown.total, breakdown, error: null }
  } catch (e) {
    console.error('recalculateLeadScore error:', e)
    return { score: 0, breakdown: null, error: 'Erro inesperado ao recalcular score.' }
  }
}
