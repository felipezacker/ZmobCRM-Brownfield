import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure, ensureDealBelongsToOrganization } from './helpers';

export function createNoteTools({ supabase, organizationId, context, userId, bypassApproval }: ToolContext) {
    return {
        addDealNote: tool({
            description: 'Adiciona uma nota a um deal. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se não fornecido)'),
                content: z.string().min(1).describe('Conteúdo da nota'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, content }) => {
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) return { error: 'Nenhum deal especificado.' };

                const guard = await ensureDealBelongsToOrganization(supabase, organizationId, targetDealId);
                if (!guard.ok) return { error: guard.error };

                const { data, error } = await supabase
                    .from('deal_notes')
                    .insert({ deal_id: targetDealId, content, created_by: userId, organization_id: organizationId })
                    .select('id, content, created_at')
                    .single();

                if (error) return { error: formatSupabaseFailure(error) };
                return { success: true, note: data, message: `Nota adicionada no deal "${guard.deal.title}".` };
            },
        }),

        listDealNotes: tool({
            description: 'Lista as últimas notas de um deal.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se não fornecido)'),
                limit: z.number().int().positive().optional().default(5),
            }),
            execute: async ({ dealId, limit }) => {
                const targetDealId = dealId || context.dealId;
                if (!targetDealId) return { error: 'Nenhum deal especificado.' };

                const guard = await ensureDealBelongsToOrganization(supabase, organizationId, targetDealId);
                if (!guard.ok) return { error: guard.error };

                const { data, error } = await supabase
                    .from('deal_notes')
                    .select('id, content, created_at, created_by')
                    .eq('deal_id', targetDealId)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (error) return { error: formatSupabaseFailure(error) };
                return {
                    count: data?.length || 0,
                    dealTitle: guard.deal.title,
                    notes: (data || []).map((n: any) => ({ id: n.id, content: n.content, createdAt: n.created_at, createdBy: n.created_by })),
                };
            },
        }),
    };
}
