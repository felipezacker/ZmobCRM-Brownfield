import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure, ensureBoardBelongsToOrganization } from './helpers';

export function createActivityTools({ supabase, organizationId, context, userId, bypassApproval }: ToolContext) {
    return {
        createTask: tool({
            description: 'Cria uma nova tarefa ou atividade para acompanhamento. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                title: z.string().describe('Título da tarefa'),
                description: z.string().optional(),
                dueDate: z.string().optional().describe('Data de vencimento ISO'),
                dealId: z.string().optional(),
                type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']).optional().default('TASK'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, description, dueDate, dealId, type }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] ✏️ createTask EXECUTED!', title);

                const date = dueDate || new Date().toISOString();

                const { data, error } = await supabase
                    .from('activities')
                    .insert({
                        organization_id: organizationId,
                        title,
                        description,
                        date,
                        deal_id: targetDealId,
                        type,
                        owner_id: userId,
                        completed: false,
                    })
                    .select()
                    .single();

                if (error) {
                    return { success: false, error: error.message };
                }

                return {
                    success: true,
                    activity: { id: data.id, title: data.title, type: data.type },
                    message: `Atividade "${title}" criada com sucesso!`
                };
            },
        }),

        listActivities: tool({
            description: 'Lista atividades (tarefas/ligações/reuniões) filtrando por deal/contato/board e status.',
            inputSchema: z.object({
                boardId: z.string().optional(),
                dealId: z.string().optional(),
                contactId: z.string().optional(),
                completed: z.boolean().optional(),
                fromDate: z.string().optional().describe('ISO'),
                toDate: z.string().optional().describe('ISO'),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ boardId, dealId, contactId, completed, fromDate, toDate, limit }) => {
                const targetBoardId = boardId || context.boardId;

                if (targetBoardId) {
                    const guard = await ensureBoardBelongsToOrganization(supabase, organizationId, targetBoardId);
                    if (!guard.ok) return { error: guard.error };
                }

                let q = supabase
                    .from('activities')
                    .select('id, title, description, type, date, completed, deal_id, contact_id, deals(title, board_id), contact:contacts(name)')
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
                    .order('date', { ascending: true })
                    .limit(limit);

                if (dealId) q = q.eq('deal_id', dealId);
                if (contactId) q = q.eq('contact_id', contactId);
                if (completed !== undefined) q = q.eq('completed', completed);
                if (fromDate) q = q.gte('date', fromDate);
                if (toDate) q = q.lte('date', toDate);

                if (targetBoardId) {
                    q = supabase
                        .from('activities')
                        .select('id, title, description, type, date, completed, deal_id, contact_id, deals!inner(title, board_id), contact:contacts(name)')
                        .eq('organization_id', organizationId)
                        .is('deleted_at', null)
                        .order('date', { ascending: true })
                        .limit(limit)
                        .eq('deals.board_id', targetBoardId);

                    if (dealId) q = q.eq('deal_id', dealId);
                    if (contactId) q = q.eq('contact_id', contactId);
                    if (completed !== undefined) q = q.eq('completed', completed);
                    if (fromDate) q = q.gte('date', fromDate);
                    if (toDate) q = q.lte('date', toDate);
                }

                const { data, error } = await q;
                if (error) return { error: formatSupabaseFailure(error) };

                return {
                    count: data?.length || 0,
                    activities:
                        (data || []).map((a: any) => ({
                            id: a.id,
                            title: a.title,
                            type: a.type,
                            date: a.date,
                            completed: !!a.completed,
                            dealTitle: a.deals?.title || null,
                            contactName: a.contact?.name || null,
                        })) || [],
                };
            },
        }),

        completeActivity: tool({
            description: 'Marca uma atividade como concluída. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                activityId: z.string(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ activityId }) => {
                const { data, error } = await supabase
                    .from('activities')
                    .update({ completed: true })
                    .eq('organization_id', organizationId)
                    .eq('id', activityId)
                    .select('id, title')
                    .maybeSingle();

                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Atividade não encontrada nesta organização.' };
                return { success: true, message: `Atividade "${data.title}" marcada como concluída.` };
            },
        }),

        rescheduleActivity: tool({
            description: 'Reagenda uma atividade (altera a data). Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                activityId: z.string(),
                newDate: z.string().describe('Nova data/hora (ISO)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ activityId, newDate }) => {
                const { data, error } = await supabase
                    .from('activities')
                    .update({ date: newDate })
                    .eq('organization_id', organizationId)
                    .eq('id', activityId)
                    .select('id, title, date')
                    .maybeSingle();

                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Atividade não encontrada nesta organização.' };
                return { success: true, message: `Atividade "${data.title}" reagendada.`, date: data.date };
            },
        }),

        logActivity: tool({
            description: 'Registra uma interação (ligação/email/reunião) e já marca como concluída. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                title: z.string().min(1),
                description: z.string().optional(),
                dealId: z.string().optional(),
                contactId: z.string().optional(),
                type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']).optional().default('CALL'),
                date: z.string().optional().describe('ISO (padrão: agora)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, description, dealId, contactId, type, date }) => {
                const payload = {
                    organization_id: organizationId,
                    title,
                    description: description || null,
                    type,
                    date: date || new Date().toISOString(),
                    deal_id: dealId || context.dealId || null,
                    contact_id: contactId || null,
                    owner_id: userId,
                    completed: true,
                };

                const { data, error } = await supabase
                    .from('activities')
                    .insert(payload)
                    .select('id, title, type, date')
                    .single();

                if (error) return { error: formatSupabaseFailure(error) };
                return { success: true, activity: data, message: `Registro criado: "${data.title}".` };
            },
        }),
    };
}
