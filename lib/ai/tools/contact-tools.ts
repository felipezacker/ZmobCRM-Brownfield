import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure, sanitizeFilterValue, ensureDealBelongsToOrganization } from './helpers';
import { calculateLeadScore } from '@/lib/supabase/lead-scoring';

export function createContactTools({ supabase, organizationId, context, userId, bypassApproval }: ToolContext) {
    return {
        searchContacts: tool({
            description: 'Busca contatos por nome/email (query), tag, ou campo customizado (customFieldKey+customFieldValue). Todos os filtros funcionam sozinhos sem query. Para "campo X = Y", use customFieldKey e customFieldValue.',
            inputSchema: z.object({
                query: z.string().optional().describe('Busca por nome ou email — NÃO use para tags ou campos custom'),
                tag: z.string().optional().describe('Filtrar por tag (ex: "VIP"). Funciona sozinho sem query.'),
                customFieldKey: z.string().optional().describe('Nome do campo custom (ex: "origem", "segmento"). SEMPRE use junto com customFieldValue. Quando o usuário diz "campo X = Y", passe X aqui.'),
                customFieldValue: z.string().optional().describe('Valor do campo custom (ex: "indicacao", "premium"). SEMPRE use junto com customFieldKey. Quando o usuário diz "campo X = Y", passe Y aqui.'),
                limit: z.number().optional().default(5),
            }),
            execute: async ({ query, tag, customFieldKey, customFieldValue, limit }) => {
                if (!query && !tag && !customFieldKey) {
                    return { error: 'Informe um termo de busca (query), tag ou campo customizado (customFieldKey).' };
                }

                console.log('[AI] 🔍 searchContacts EXECUTED!', { query, tag, customFieldKey, customFieldValue });

                let q = supabase
                    .from('contacts')
                    .select('id, name, email, phone, tags, custom_fields')
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null);

                if (query) {
                    q = q.or(`name.ilike.%${sanitizeFilterValue(query)}%,email.ilike.%${sanitizeFilterValue(query)}%`);
                }

                if (tag) {
                    q = q.contains('tags', [tag]);
                }

                if (customFieldKey && customFieldValue) {
                    q = q.contains('custom_fields', { [customFieldKey]: customFieldValue });
                }

                const { data: contacts } = await q.limit(limit);

                return {
                    count: contacts?.length || 0,
                    contacts: contacts?.map((c: { id: string; name: string; email: string | null; phone: string | null; tags: string[] | null; custom_fields: Record<string, unknown> | null }) => ({
                        id: c.id,
                        name: c.name,
                        email: c.email || 'N/A',
                        phone: c.phone || 'N/A',
                        tags: c.tags || [],
                        customFields: c.custom_fields || {},
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
                tags: z.array(z.string()).optional().describe('Tags do contato (ex: ["VIP", "Indicação"])'),
                customFields: z.record(z.string(), z.string()).optional().describe('Campos customizados (ex: {"origem": "site", "segmento": "premium"})'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ name, email, phone, notes, status, stage, source, tags, customFields }) => {
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
                        tags: tags || null,
                        custom_fields: customFields || null,
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
                tags: z.array(z.string()).optional().describe('Substituir tags do contato'),
                customFields: z.record(z.string(), z.string()).optional().describe('Substituir campos customizados'),
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
                if (patch.tags !== undefined) updateData.tags = patch.tags;
                if (patch.customFields !== undefined) updateData.custom_fields = patch.customFields;

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
            description: 'Mostra detalhes de um contato, incluindo tags e campos customizados.',
            inputSchema: z.object({
                contactId: z.string(),
            }),
            execute: async ({ contactId }) => {
                const { data, error } = await supabase
                    .from('contacts')
                    .select('id, name, email, phone, notes, status, stage, source, tags, custom_fields, created_at, updated_at')
                    .eq('organization_id', organizationId)
                    .eq('id', contactId)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Contato não encontrado nesta organização.' };
                const row = data as typeof data & { tags?: string[] | null; custom_fields?: Record<string, unknown> | null };
                return {
                    ...data,
                    tags: row.tags || [],
                    customFields: row.custom_fields || {},
                };
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

        // Story 3.8 — Lead Score
        getLeadScore: tool({
            description: 'Retorna o lead score (0-100) de um contato com breakdown dos fatores e sugestão de ação.',
            inputSchema: z.object({
                contactId: z.string().describe('ID do contato'),
            }),
            execute: async ({ contactId }) => {
                const { breakdown, error } = await calculateLeadScore(contactId, organizationId, supabase);
                if (error) return { error: error.message };

                const score = breakdown.total;
                const suggestion = score >= 61
                    ? 'Lead quente — priorize o contato, agende reunião ou envie proposta.'
                    : score >= 31
                    ? 'Lead morno — mantenha engajamento, envie conteúdo relevante ou faça follow-up.'
                    : 'Lead frio — nutrir com automação, reavaliar interesse.';

                return {
                    score,
                    label: score >= 61 ? 'Quente' : score >= 31 ? 'Morno' : 'Frio',
                    suggestion,
                    breakdown: {
                        recentInteraction: breakdown.recentInteraction,
                        ltv: breakdown.ltv,
                        stageAge: breakdown.stageAge,
                        completedActivities: breakdown.completedActivities,
                        preferences: breakdown.preferences,
                        activeDeals: breakdown.activeDeals,
                        temperature: breakdown.temperature,
                    },
                };
            },
        }),
    };
}
