/**
 * @fileoverview Service de deteccao e merge de contatos duplicados.
 *
 * Story 3.7 — Deteccao e Merge de Contatos Duplicados.
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
 * Busca contatos duplicados por email, telefone ou CPF.
 * Retorna matches agrupados com score (mais criterios = mais provavel duplicata).
 *
 * @param orgId - ID da organizacao.
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

    // Query por email
    if (criteria.email && criteria.email.trim()) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
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

    // Query por telefone (contact_phones)
    if (criteria.phone && criteria.phone.trim()) {
      const phoneNumber = criteria.phone.trim();
      const { data, error } = await supabase
        .from('contact_phones')
        .select('contact_id')
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

    // Query por CPF
    if (criteria.cpf && criteria.cpf.trim()) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
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
 */
export async function scanDuplicates(): Promise<{
  data: DuplicateGroup[] | null;
  error: Error | null;
}> {
  try {
    if (!supabase) {
      return { data: null, error: new Error('Supabase nao configurado') };
    }

    const groups: DuplicateGroup[] = [];
    const seenKeys = new Set<string>();

    // 1. Duplicatas por email
    const { data: allContacts, error: err1 } = await supabase
      .from('contacts')
      .select('*')
      .is('deleted_at', null)
      .not('email', 'is', null)
      .order('email');

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

    // 2. Duplicatas por CPF
    const { data: cpfContacts, error: err2 } = await supabase
      .from('contacts')
      .select('*')
      .is('deleted_at', null)
      .not('cpf', 'is', null)
      .order('cpf');

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

    // 3. Duplicatas por telefone (contact_phones)
    const { data: phones, error: err3 } = await supabase
      .from('contact_phones')
      .select('contact_id, phone_number')
      .order('phone_number');

    if (!err3 && phones) {
      const phoneMap = new Map<string, string[]>();
      for (const p of phones) {
        const list = phoneMap.get(p.phone_number) || [];
        list.push(p.contact_id);
        phoneMap.set(p.phone_number, list);
      }
      for (const [phoneNumber, contactIds] of phoneMap) {
        const uniqueIds = [...new Set(contactIds)];
        if (uniqueIds.length > 1) {
          const key = `phone:${phoneNumber}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            // Fetch contacts
            const { data: contactsData } = await supabase
              .from('contacts')
              .select('*')
              .in('id', uniqueIds)
              .is('deleted_at', null);

            if (contactsData && contactsData.length > 1) {
              groups.push({
                key,
                matchType: 'phone',
                matchValue: phoneNumber,
                contacts: contactsData.map((r: unknown) => transformContact(r as DbContact)),
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
// MERGE SERVICE
// ============================================

/**
 * Merge de 2 contatos: transfere deals, telefones, preferencias para o winner.
 * Soft-deleta o loser. Cria audit log como activity.
 *
 * @param winnerId - ID do contato que permanece.
 * @param loserId - ID do contato a ser absorvido.
 * @param fieldsFromLoser - Campos a copiar do loser para o winner.
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

    // 1. Buscar dados do loser para copiar campos selecionados
    const { data: loserData, error: loserErr } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', loserId)
      .is('deleted_at', null)
      .single();

    if (loserErr || !loserData) {
      return { data: null, error: loserErr || new Error('Contato perdedor nao encontrado') };
    }

    // 2. Copiar campos selecionados do loser para o winner
    if (fieldsFromLoser.length > 0) {
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

      const updates: Record<string, unknown> = {};
      for (const field of fieldsFromLoser) {
        const dbField = fieldMapping[field];
        if (dbField && loserData[dbField] !== undefined) {
          updates[dbField] = loserData[dbField];
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const { error: updateErr } = await supabase
          .from('contacts')
          .update(updates)
          .eq('id', winnerId);

        if (updateErr) {
          return { data: null, error: updateErr };
        }
      }
    }

    // 3. Transferir deals
    const { data: dealsData } = await supabase
      .from('deals')
      .select('id')
      .eq('contact_id', loserId)
      .is('deleted_at', null);

    const dealsTransferred = dealsData?.length || 0;

    if (dealsTransferred > 0) {
      const { error: dealsErr } = await supabase
        .from('deals')
        .update({ contact_id: winnerId, updated_at: new Date().toISOString() })
        .eq('contact_id', loserId)
        .is('deleted_at', null);

      if (dealsErr) {
        return { data: null, error: dealsErr };
      }
    }

    // 4. Transferir telefones
    const { data: phonesData } = await supabase
      .from('contact_phones')
      .select('id')
      .eq('contact_id', loserId);

    const phonesTransferred = phonesData?.length || 0;

    if (phonesTransferred > 0) {
      const { error: phonesErr } = await supabase
        .from('contact_phones')
        .update({ contact_id: winnerId, updated_at: new Date().toISOString() })
        .eq('contact_id', loserId);

      if (phonesErr) {
        return { data: null, error: phonesErr };
      }
    }

    // 5. Transferir preferencias
    const { data: prefsData } = await supabase
      .from('contact_preferences')
      .select('id')
      .eq('contact_id', loserId);

    const preferencesTransferred = prefsData?.length || 0;

    if (preferencesTransferred > 0) {
      const { error: prefsErr } = await supabase
        .from('contact_preferences')
        .update({ contact_id: winnerId, updated_at: new Date().toISOString() })
        .eq('contact_id', loserId);

      if (prefsErr) {
        return { data: null, error: prefsErr };
      }
    }

    // 6. Soft delete do loser
    const { error: deleteErr } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', loserId);

    if (deleteErr) {
      return { data: null, error: deleteErr };
    }

    // 7. Audit log — registrar o merge como atividade
    const loserContact = transformContact(loserData as DbContact);
    // Find a deal to attach the activity to (use first deal of winner)
    const { data: winnerDeals } = await supabase
      .from('deals')
      .select('id, title')
      .eq('contact_id', winnerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);

    const dealId = winnerDeals?.[0]?.id;
    const dealTitle = winnerDeals?.[0]?.title || 'N/A';

    if (dealId) {
      await supabase.from('activities').insert({
        deal_id: dealId,
        type: 'NOTE',
        title: 'Merge de contatos',
        description: `Contato "${loserContact.name}" (${loserId}) foi unificado com este contato. ${dealsTransferred} deals, ${phonesTransferred} telefones e ${preferencesTransferred} preferencias transferidos. Executado por ${userName}.`,
        date: new Date().toISOString(),
        user: JSON.stringify({ name: userName, avatar: '' }),
        completed: true,
      });
    }

    return {
      data: {
        winnerId,
        loserId,
        dealsTransferred,
        phonesTransferred,
        preferencesTransferred,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e as Error };
  }
}
