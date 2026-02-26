import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure, sanitizeFilterValue, ensureDealBelongsToOrganization } from './helpers';

export function createContactTools({ supabase, organizationId, context, userId, bypassApproval }: ToolContext) {
    return {
        searchContacts: tool({
            description: 'Busca contatos por nome ou email',
            inputSchema: z.object({
                query: z.string().describe('Termo de busca'),
                limit: z.number().optional().default(5),
            }),
            execute: async ({ query, limit }) => {
                console.log('[AI] 🔍 searchContacts EXECUTED!', query);

                const { data: contacts } = await supabase
                    .from('contacts')
                    .select('id, name, email, phone')
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
                    .or(`name.ilike.%${sanitizeFilterValue(query)}%,email.ilike.%${sanitizeFilterValue(query)}%`)
                    .limit(limit);

                return {
                    count: contacts?.length || 0,
                    contacts: contacts?.map(c => ({
                        id: c.id,
                        name: c.name,
                        email: c.email || 'N/A',
                        phone: c.phone || 'N/A',
                    })) || []
                };
            },
        }),

        createContact: tool({
            description: 'Cria um novo contato. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                name: z.string().min(1),
                email: z.string().email().optional(),
                phone: z.string().optional(),
                notes: z.string().optional(),
                status: z.string().optional().default('ACTIVE'),
                stage: z.string().optional().default('LEAD'),
                source: z.string().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ name, email, phone, notes, status, stage, source }) => {
                const { data, error } = await supabase
                    .from('contacts')
                    .insert({
                        organization_id: organizationId,
                        name,
                        email: email || null,
                        phone: phone || null,
                        notes: notes || null,
                        status,
                        stage,
                        source: source || null,
                        owner_id: userId,
                        updated_at: new Date().toISOString(),
                    })
                    .select('id, name, email, phone')
                    .single();
                if (error) return { error: formatSupabaseFailure(error) };
                return { success: true, contact: data, message: `Contato "${data.name}" criado.` };
            },
        }),

        updateContact: tool({
            description: 'Atualiza campos de um contato. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                contactId: z.string(),
                name: z.string().optional(),
                email: z.string().email().optional(),
                phone: z.string().optional(),
                notes: z.string().optional(),
                status: z.string().optional(),
                stage: z.string().optional(),
                source: z.string().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ contactId, ...patch }) => {
                const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (patch.name !== undefined) updateData.name = patch.name;
                if (patch.email !== undefined) updateData.email = patch.email;
                if (patch.phone !== undefined) updateData.phone = patch.phone;
                if (patch.notes !== undefined) updateData.notes = patch.notes;
                if (patch.status !== undefined) updateData.status = patch.status;
                if (patch.stage !== undefined) updateData.stage = patch.stage;
                if (patch.source !== undefined) updateData.source = patch.source;

                const { data, error } = await supabase
                    .from('contacts')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .select('id, name, email, phone')
                    .maybeSingle();
                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Contato não encontrado nesta organização.' };
                return { success: true, contact: data, message: `Contato "${data.name}" atualizado.` };
            },
        }),

        getContactDetails: tool({
            description: 'Mostra detalhes de um contato.',
            inputSchema: z.object({
                contactId: z.string(),
            }),
            execute: async ({ contactId }) => {
                const { data, error } = await supabase
                    .from('contacts')
                    .select('id, name, email, phone, notes, status, stage, source, created_at, updated_at')
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Contato não encontrado nesta organização.' };
                return data;
            },
        }),

        linkDealToContact: tool({
            description: 'Associa um deal a um contato (define deal.contact_id). Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se não fornecido)'),
                contactId: z.string().describe('ID do contato'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, contactId }) => {
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) return { error: 'Nenhum deal especificado.' };

                const dealGuard = await ensureDealBelongsToOrganization(supabase, organizationId, targetDealId);
                if (!dealGuard.ok) return { error: dealGuard.error };

                const { data: contact, error: contactError } = await supabase
                    .from('contacts')
                    .select('id, name')
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (contactError) return { error: formatSupabaseFailure(contactError) };
                if (!contact) return { error: 'Contato não encontrado nesta organização.' };

                const { error } = await supabase
                    .from('deals')
                    .update({ contact_id: contactId, updated_at: new Date().toISOString() })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId);
                if (error) return { error: formatSupabaseFailure(error) };

                return { success: true, message: `Deal "${dealGuard.deal.title}" associado ao contato "${contact.name}".` };
            },
        }),
    };
}
