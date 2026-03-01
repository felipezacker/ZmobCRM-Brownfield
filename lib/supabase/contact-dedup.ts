/**
 * @fileoverview Service de deteccao e merge de contatos duplicados.
 *
 * Story 3.7 — Deteccao e Merge de Contatos Duplicados.
 * QA fixes: org_id filter, RPC transaction, batch phone scan, audit always created.
 *
 * @module lib/supabase/contact-dedup
 */

import { supabase } from './client';
import { Contact } from '@/types';
import { transformContact, DbContact } from './contacts';

// ============================================
// TYPES
// ============================================

export interface DuplicateMatch {
  contact: Contact;
  matchFields: ('email' | 'phone' | 'cpf')[];
  score: number; // 1-3 (mais matches = mais provavel)
}

export interface DuplicateGroup {
  key: string; // e.g. "email:joao@email.com"
  matchType: 'email' | 'phone' | 'cpf';
  matchValue: string;
  contacts: Contact[];
}

export interface MergeResult {
  winnerId: string;
  loserId: string;
  dealsTransferred: number;
  phonesTransferred: number;
  preferencesTransferred: number;
}

// ============================================
// DUPLICATE DETECTION
// ============================================

/**
 * Busca contatos duplicados por email, telefone ou CPF dentro da organizacao.
 * Usa indexes compostos: idx_contacts_email_org, idx_contact_phones_number_org, idx_contacts_cpf_org_unique.
 *
 * @param orgId - ID da organizacao (filtro explicito alem de RLS).
 * @param criteria - Criterios de busca (pelo menos um obrigatorio).
 * @param excludeId - ID de contato a excluir (util ao editar).
 */
export async function findDuplicates(
  orgId: string,
  criteria: { email?: string; phone?: string; cpf?: string },
  excludeId?: string
): Promise<{ data: DuplicateMatch[] | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase nao configurado') };
    }

    const matchMap = new Map<string, { contact: Contact; fields: Set<('email' | 'phone' | 'cpf')> }>();

    // Query por email — uses idx_contacts_email_org
    if (criteria.email?.trim()) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('email', criteria.email.trim().toLowerCase())
        .is('deleted_at', null);

      if (!error && data) {
        for (const row of data) {
          const c = transformContact(row as DbContact);
          if (excludeId && c.id === excludeId) continue;
          const existing = matchMap.get(c.id);
          if (existing) {
            existing.fields.add('email');
          } else {
            matchMap.set(c.id, { contact: c, fields: new Set(['email']) });
          }
        }
      }
    }

    // Query por telefone — uses idx_contact_phones_number_org
    if (criteria.phone?.trim()) {
      const phoneNumber = criteria.phone.trim();
      const { data, error } = await supabase
        .from('contact_phones')
        .select('contact_id')
        .eq('organization_id', orgId)
        .eq('phone_number', phoneNumber);

      if (!error && data) {
        const contactIds = [...new Set(data.map((r: { contact_id: string }) => r.contact_id))];
        if (contactIds.length > 0) {
          const { data: contacts, error: cErr } = await supabase
            .from('contacts')
            .select('*')
            .in('id', contactIds)
            .is('deleted_at', null);

          if (!cErr && contacts) {
            for (const row of contacts) {
              const c = transformContact(row as DbContact);
              if (excludeId && c.id === excludeId) continue;
              const existing = matchMap.get(c.id);
              if (existing) {
                existing.fields.add('phone');
              } else {
                matchMap.set(c.id, { contact: c, fields: new Set(['phone']) });
              }
            }
          }
        }
      }
    }

    // Query por CPF — uses idx_contacts_cpf_org_unique
    if (criteria.cpf?.trim()) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('cpf', criteria.cpf.trim())
        .is('deleted_at', null);

      if (!error && data) {
        for (const row of data) {
          const c = transformContact(row as DbContact);
          if (excludeId && c.id === excludeId) continue;
          const existing = matchMap.get(c.id);
          if (existing) {
            existing.fields.add('cpf');
          } else {
            matchMap.set(c.id, { contact: c, fields: new Set(['cpf']) });
          }
        }
      }
    }

    // Build results
    const results: DuplicateMatch[] = [];
    for (const [, entry] of matchMap) {
      results.push({
        contact: entry.contact,
        matchFields: [...entry.fields],
        score: entry.fields.size,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return { data: results, error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ============================================
// DUPLICATE SCAN (admin)
// ============================================

/**
 * Scan de duplicatas na organizacao inteira.
 * Agrupa contatos com mesmo email, telefone ou CPF.
 * Limitado a 100 grupos para performance.
 *
 * @param orgId - ID da organizacao (filtro explicito para usar indexes compostos).
 */
export async function scanDuplicates(orgId: string): Promise<{
  data: DuplicateGroup[] | null;
  error: Error | null;
}> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase nao configurado') };
    }

    const groups: DuplicateGroup[] = [];
    const seenKeys = new Set<string>();

    // 1. Duplicatas por email — select only needed columns, limit to 5000
    const { data: allContacts, error: err1 } = await supabase
      .from('contacts')
      .select('id, name, email, phone, cpf, stage, status, temperature, classification, contact_type, source, avatar, owner_id, created_at, organization_id')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .not('email', 'is', null)
      .order('email')
      .limit(5000);

    if (!err1 && allContacts) {
      const emailMap = new Map<string, Contact[]>();
      for (const row of allContacts) {
        const c = transformContact(row as DbContact);
        if (!c.email) continue;
        const key = c.email.toLowerCase();
        const list = emailMap.get(key) || [];
        list.push(c);
        emailMap.set(key, list);
      }
      for (const [email, contacts] of emailMap) {
        if (contacts.length > 1) {
          const key = `email:${email}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            groups.push({ key, matchType: 'email', matchValue: email, contacts });
          }
        }
      }
    }

    // 2. Duplicatas por CPF — select only needed columns, limit to 5000
    const { data: cpfContacts, error: err2 } = await supabase
      .from('contacts')
      .select('id, name, email, phone, cpf, stage, status, temperature, classification, contact_type, source, avatar, owner_id, created_at, organization_id')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .not('cpf', 'is', null)
      .order('cpf')
      .limit(5000);

    if (!err2 && cpfContacts) {
      const cpfMap = new Map<string, Contact[]>();
      for (const row of cpfContacts) {
        const c = transformContact(row as DbContact);
        if (!c.cpf) continue;
        const list = cpfMap.get(c.cpf) || [];
        list.push(c);
        cpfMap.set(c.cpf, list);
      }
      for (const [cpf, contacts] of cpfMap) {
        if (contacts.length > 1) {
          const key = `cpf:${cpf}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            groups.push({ key, matchType: 'cpf', matchValue: cpf, contacts });
          }
        }
      }
    }

    // 3. Duplicatas por telefone — batch fetch (fix N+1 queries)
    const { data: phones, error: err3 } = await supabase
      .from('contact_phones')
      .select('contact_id, phone_number')
      .eq('organization_id', orgId)
      .order('phone_number');

    if (!err3 && phones) {
      const phoneMap = new Map<string, string[]>();
      for (const p of phones) {
        const list = phoneMap.get(p.phone_number) || [];
        list.push(p.contact_id);
        phoneMap.set(p.phone_number, list);
      }

      // Collect ALL contact IDs that need fetching (batch)
      const allPhoneContactIds = new Set<string>();
      const phoneGroups: { phoneNumber: string; contactIds: string[] }[] = [];

      for (const [phoneNumber, contactIds] of phoneMap) {
        const uniqueIds = [...new Set(contactIds)];
        if (uniqueIds.length > 1) {
          const key = `phone:${phoneNumber}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            phoneGroups.push({ phoneNumber, contactIds: uniqueIds });
            uniqueIds.forEach(id => allPhoneContactIds.add(id));
          }
        }
      }

      // Single batch fetch for all phone-duplicate contacts
      if (allPhoneContactIds.size > 0) {
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, name, email, phone, cpf, stage, status, temperature, classification, contact_type, source, avatar, owner_id, created_at, organization_id')
          .in('id', [...allPhoneContactIds])
          .is('deleted_at', null);

        if (contactsData) {
          const contactById = new Map<string, Contact>();
          for (const row of contactsData) {
            const c = transformContact(row as DbContact);
            contactById.set(c.id, c);
          }

          for (const { phoneNumber, contactIds } of phoneGroups) {
            const contacts = contactIds
              .map(id => contactById.get(id))
              .filter((c): c is Contact => c !== undefined);

            if (contacts.length > 1) {
              groups.push({
                key: `phone:${phoneNumber}`,
                matchType: 'phone',
                matchValue: phoneNumber,
                contacts,
              });
            }
          }
        }
      }
    }

    // Limit to 100 groups
    return { data: groups.slice(0, 100), error: null };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}

// ============================================
// MERGE SERVICE (via Supabase RPC — transactional)
// ============================================

/**
 * Merge de 2 contatos usando RPC transacional.
 * Transfere deals, telefones, preferencias para o winner.
 * Soft-deleta o loser. Cria audit log como activity.
 * Todas as operacoes em uma unica transaction (rollback automatico em caso de erro).
 *
 * @param winnerId - ID do contato que permanece.
 * @param loserId - ID do contato a ser absorvido.
 * @param fieldsFromLoser - Campos do frontend a copiar do loser para o winner.
 * @param userId - ID do usuario que executou o merge (para audit).
 * @param userName - Nome do usuario (para audit log).
 */
export async function mergeContacts(
  winnerId: string,
  loserId: string,
  fieldsFromLoser: string[],
  userId: string,
  userName: string
): Promise<{ data: MergeResult | null; error: Error | null }> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase nao configurado') };
    }

    if (winnerId === loserId) {
      return { data: null, error: new Error('Nao e possivel fazer merge de um contato consigo mesmo') };
    }

    // Map frontend field names to DB column names for the RPC
    const fieldMapping: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      cpf: 'cpf',
      classification: 'classification',
      temperature: 'temperature',
      contactType: 'contact_type',
      source: 'source',
      addressCep: 'address_cep',
      addressCity: 'address_city',
      addressState: 'address_state',
      notes: 'notes',
      birthDate: 'birth_date',
    };

    // Fetch loser data to get the actual values to copy
    const { data: loserData, error: loserErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', loserId)
      .is('deleted_at', null)
      .single();

    if (loserErr || !loserData) {
      return { data: null, error: loserErr || new Error('Contato perdedor nao encontrado') };
    }

    // Build field_updates JSONB: { db_column_name: value }
    const fieldUpdates: Record<string, unknown> = {};
    for (const field of fieldsFromLoser) {
      const dbField = fieldMapping[field];
      if (dbField && loserData[dbField] !== undefined && loserData[dbField] !== null) {
        fieldUpdates[dbField] = loserData[dbField];
      }
    }

    // Call RPC — all operations in a single transaction
    const { data, error } = await supabase.rpc('merge_contacts', {
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_field_updates: fieldUpdates,
      p_user_id: userId,
      p_user_name: userName,
    });

    if (error) {
      return { data: null, error };
    }

    const result = data as MergeResult;
    return {
      data: {
        winnerId: result.winnerId || winnerId,
        loserId: result.loserId || loserId,
        dealsTransferred: result.dealsTransferred || 0,
        phonesTransferred: result.phonesTransferred || 0,
        preferencesTransferred: result.preferencesTransferred || 0,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
