/**
 * @fileoverview Servico Supabase para preferencias de imovel do contato.
 *
 * CRUD completo para a tabela `contact_preferences`.
 * Segue o padrao de `contactPhonesService` em contacts.ts.
 *
 * @module lib/supabase/contact-preferences
 */

import { supabase } from './client';
import { ContactPreference } from '@/types';

// ============================================
// DB INTERFACE
// ============================================

/** Representacao de contact_preferences no banco de dados. */
export interface DbContactPreference {
  id: string;
  contact_id: string;
  property_types: string[];
  purpose: string | null;
  price_min: number | null;
  price_max: number | null;
  regions: string[];
  bedrooms_min: number | null;
  parking_min: number | null;
  area_min: number | null;
  accepts_financing: boolean | null;
  accepts_fgts: boolean | null;
  urgency: string | null;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// TRANSFORMS
// ============================================

/** Transforma ContactPreference do formato DB para o formato da aplicacao. */
export const transformContactPreference = (db: DbContactPreference): ContactPreference => ({
  id: db.id,
  contactId: db.contact_id,
  propertyTypes: db.property_types || [],
  purpose: db.purpose as ContactPreference['purpose'],
  priceMin: db.price_min,
  priceMax: db.price_max,
  regions: db.regions || [],
  bedroomsMin: db.bedrooms_min,
  parkingMin: db.parking_min,
  areaMin: db.area_min,
  acceptsFinancing: db.accepts_financing,
  acceptsFgts: db.accepts_fgts,
  urgency: db.urgency as ContactPreference['urgency'],
  notes: db.notes,
  organizationId: db.organization_id,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/** Transforma ContactPreference do formato da aplicacao para o formato DB. */
export const transformContactPreferenceToDb = (
  pref: Partial<ContactPreference>
): Partial<DbContactPreference> => {
  const db: Partial<DbContactPreference> = {};

  if (pref.contactId !== undefined) db.contact_id = pref.contactId;
  if (pref.propertyTypes !== undefined) db.property_types = pref.propertyTypes;
  if (pref.purpose !== undefined) db.purpose = pref.purpose;
  if (pref.priceMin !== undefined) db.price_min = pref.priceMin;
  if (pref.priceMax !== undefined) db.price_max = pref.priceMax;
  if (pref.regions !== undefined) db.regions = pref.regions;
  if (pref.bedroomsMin !== undefined) db.bedrooms_min = pref.bedroomsMin;
  if (pref.parkingMin !== undefined) db.parking_min = pref.parkingMin;
  if (pref.areaMin !== undefined) db.area_min = pref.areaMin;
  if (pref.acceptsFinancing !== undefined) db.accepts_financing = pref.acceptsFinancing;
  if (pref.acceptsFgts !== undefined) db.accepts_fgts = pref.acceptsFgts;
  if (pref.urgency !== undefined) db.urgency = pref.urgency;
  if (pref.notes !== undefined) db.notes = pref.notes;
  if (pref.organizationId !== undefined) db.organization_id = pref.organizationId;

  return db;
};

// ============================================
// SERVICE
// ============================================

/**
 * Servico de preferencias de imovel de contatos.
 * CRUD para a tabela `contact_preferences`.
 */
export const contactPreferencesService = {
  /**
   * Busca todas as preferencias de um contato.
   */
  async getByContactId(
    contactId: string
  ): Promise<{ data: ContactPreference[] | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nao configurado') };
      }
      const { data, error } = await supabase
        .from('contact_preferences')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true });

      if (error) return { data: null, error };
      return {
        data: (data || []).map(p => transformContactPreference(p as DbContactPreference)),
        error: null,
      };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Cria uma nova preferencia para um contato.
   */
  async create(
    preference: Omit<ContactPreference, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ data: ContactPreference | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nao configurado') };
      }

      const { data, error } = await supabase
        .from('contact_preferences')
        .insert({
          contact_id: preference.contactId,
          property_types: preference.propertyTypes || [],
          purpose: preference.purpose || null,
          price_min: preference.priceMin ?? null,
          price_max: preference.priceMax ?? null,
          regions: preference.regions || [],
          bedrooms_min: preference.bedroomsMin ?? null,
          parking_min: preference.parkingMin ?? null,
          area_min: preference.areaMin ?? null,
          accepts_financing: preference.acceptsFinancing ?? null,
          accepts_fgts: preference.acceptsFgts ?? null,
          urgency: preference.urgency || null,
          notes: preference.notes || null,
          organization_id: preference.organizationId,
        })
        .select()
        .single();

      if (error) return { data: null, error };
      return { data: transformContactPreference(data as DbContactPreference), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Atualiza uma preferencia existente.
   */
  async update(
    id: string,
    updates: Partial<ContactPreference>
  ): Promise<{ data: ContactPreference | null; error: Error | null }> {
    try {
      if (!supabase) {
        return { data: null, error: new Error('Supabase nao configurado') };
      }

      const dbUpdates = transformContactPreferenceToDb(updates);

      const { data, error } = await supabase
        .from('contact_preferences')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { data: null, error };
      return { data: transformContactPreference(data as DbContactPreference), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },

  /**
   * Exclui uma preferencia (hard delete — CASCADE da tabela).
   */
  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      if (!supabase) {
        return { error: new Error('Supabase nao configurado') };
      }

      const { error } = await supabase
        .from('contact_preferences')
        .delete()
        .eq('id', id);

      return { error };
    } catch (e) {
      return { error: e as Error };
    }
  },
};
