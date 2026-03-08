/**
 * Deal Notes Service
 * CRUD operations for deal notes persisted in Supabase
 */
import { supabase } from './client';

export interface DealNote {
    id: string;
    deal_id: string;
    organization_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

export const dealNotesService = {
    /**
     * Get all notes for a deal
     */
    async getNotesForDeal(dealId: string) {
        if (!supabase) {
            return { data: null as DealNote[] | null, error: new Error('Supabase não configurado') };
        }
        const { data, error } = await supabase
            .from('deal_notes')
            .select('*')
            .eq('deal_id', dealId)
            .order('created_at', { ascending: false });

        return { data: data as DealNote[] | null, error };
    },

    /**
     * Create a new note.
     * organization_id is required (NOT NULL in DB since migration 20260226100005).
     */
    async createNote(dealId: string, content: string, organizationId?: string) {
        if (!supabase) {
            return { data: null as DealNote | null, error: new Error('Supabase não configurado') };
        }
        const { data: { user } } = await supabase.auth.getUser();

        // Resolve organization_id: caller-provided > profile lookup
        let orgId = organizationId;
        if (!orgId && user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            orgId = (profile as { organization_id?: string } | null)?.organization_id ?? undefined;
        }

        if (!orgId) {
            return { data: null as DealNote | null, error: new Error('organization_id obrigatório para criar nota') };
        }

        const { data, error } = await supabase
            .from('deal_notes')
            .insert({
                deal_id: dealId,
                content,
                organization_id: orgId,
                created_by: user?.id || null,
            })
            .select()
            .single();

        return { data: data as DealNote | null, error };
    },

    /**
     * Update a note
     */
    async updateNote(noteId: string, content: string) {
        if (!supabase) {
            return { data: null as DealNote | null, error: new Error('Supabase não configurado') };
        }
        const { data, error } = await supabase
            .from('deal_notes')
            .update({ content })
            .eq('id', noteId)
            .select()
            .single();

        return { data: data as DealNote | null, error };
    },

    /**
     * Delete a note
     */
    async deleteNote(noteId: string) {
        if (!supabase) {
            return { error: new Error('Supabase não configurado') };
        }
        const { error } = await supabase
            .from('deal_notes')
            .delete()
            .eq('id', noteId);

        return { error };
    },
};
