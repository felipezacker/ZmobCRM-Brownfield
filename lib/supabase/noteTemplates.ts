/**
 * Prospecting Note Templates Service
 * CRUD for customizable note templates per outcome type
 */
import { supabase } from './client'

export interface NoteTemplate {
  id: string
  outcome: string
  text: string
  organization_id: string
  created_by: string
  created_at: string
}

export interface CreateNoteTemplateInput {
  outcome: string
  text: string
}

export const noteTemplatesService = {
  async getAll() {
    if (!supabase) {
      return { data: null as NoteTemplate[] | null, error: new Error('Supabase não configurado') }
    }
    const { data, error } = await supabase
      .from('prospecting_note_templates')
      .select('*')
      .order('outcome')
      .order('created_at')

    return { data: data as NoteTemplate[] | null, error }
  },

  async getByOutcome(outcome: string) {
    if (!supabase) {
      return { data: null as NoteTemplate[] | null, error: new Error('Supabase não configurado') }
    }
    const { data, error } = await supabase
      .from('prospecting_note_templates')
      .select('*')
      .eq('outcome', outcome)
      .order('created_at')

    return { data: data as NoteTemplate[] | null, error }
  },

  async create(input: CreateNoteTemplateInput) {
    if (!supabase) {
      return { data: null as NoteTemplate | null, error: new Error('Supabase não configurado') }
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get org_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('No organization found')

    const { data, error } = await supabase
      .from('prospecting_note_templates')
      .insert({
        outcome: input.outcome,
        text: input.text,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single()

    return { data: data as NoteTemplate | null, error }
  },

  async update(id: string, input: Partial<CreateNoteTemplateInput>) {
    if (!supabase) {
      return { data: null as NoteTemplate | null, error: new Error('Supabase não configurado') }
    }
    const { data, error } = await supabase
      .from('prospecting_note_templates')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    return { data: data as NoteTemplate | null, error }
  },

  async delete(id: string) {
    if (!supabase) {
      return { error: new Error('Supabase não configurado') }
    }
    const { error } = await supabase
      .from('prospecting_note_templates')
      .delete()
      .eq('id', id)

    return { error }
  },
}
