import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure } from './helpers';

/**
 * Prospecting tools for the CRM AI agent (TD-2.2 / SYS-004 + SYS-012).
 *
 * Exposes prospecting queues, metrics, goals, and quick scripts
 * to the AI agent so it can assist with the prospecting workflow.
 */
export function createProspectingTools({ supabase, organizationId, userId, bypassApproval }: ToolContext) {
    return {
        listProspectingQueues: tool({
            description: 'Lista as filas de prospecao ativas do usuario ou da organizacao.',
            inputSchema: z.object({
                ownerId: z.string().optional().describe('Filtrar por dono (padrao: usuario atual)'),
                status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).optional().describe('Filtrar por status'),
                limit: z.number().int().positive().optional().default(20),
            }),
            execute: async ({ ownerId, status, limit }) => {
                console.log('[AI] 🎯 listProspectingQueues EXECUTED!');

                let q = supabase
                    .from('prospecting_queues')
                    .select('id, contact_id, owner_id, status, position, session_id, created_at, contacts(name, phone, email)')
                    .eq('organization_id', organizationId)
                    .order('position', { ascending: true })
                    .limit(limit);

                if (ownerId) {
                    q = q.eq('owner_id', ownerId);
                } else {
                    q = q.eq('owner_id', userId);
                }

                if (status) {
                    q = q.eq('status', status);
                }

                const { data, error } = await q;
                if (error) return { error: formatSupabaseFailure(error) };

                const items = (data || []).map((item: any) => ({
                    id: item.id,
                    contactName: item.contacts?.name || 'N/A',
                    contactPhone: item.contacts?.phone || null,
                    contactEmail: item.contacts?.email || null,
                    status: item.status,
                    position: item.position,
                    createdAt: item.created_at,
                }));

                const statusCounts: Record<string, number> = {};
                for (const item of items) {
                    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
                }

                return {
                    count: items.length,
                    statusCounts,
                    queue: items,
                };
            },
        }),

        getProspectingMetrics: tool({
            description: 'Retorna metricas de prospeccao: total de ligacoes, taxa de conexao, duracao media, contatos unicos, breakdown por outcome.',
            inputSchema: z.object({
                period: z.enum(['today', '7d', '30d']).optional().default('7d').describe('Periodo: today, 7d ou 30d'),
                ownerId: z.string().optional().describe('Filtrar por corretor (padrao: todos da org)'),
            }),
            execute: async ({ period, ownerId }) => {
                console.log('[AI] 📊 getProspectingMetrics EXECUTED!', { period });

                const now = new Date();
                const end = now.toISOString().split('T')[0];
                let start: string;

                if (period === 'today') {
                    start = end;
                } else if (period === '7d') {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 6);
                    start = d.toISOString().split('T')[0];
                } else {
                    const d = new Date(now);
                    d.setDate(d.getDate() - 29);
                    start = d.toISOString().split('T')[0];
                }

                let q = supabase
                    .from('activities')
                    .select('id, date, owner_id, contact_id, metadata')
                    .eq('organization_id', organizationId)
                    .eq('type', 'CALL')
                    .not('metadata', 'is', null)
                    .gte('date', `${start}T00:00:00`)
                    .lte('date', `${end}T23:59:59`)
                    .is('deleted_at', null)
                    .limit(5000)
                    .order('date', { ascending: false });

                if (ownerId) {
                    q = q.eq('owner_id', ownerId);
                }

                const { data, error } = await q;
                if (error) return { error: formatSupabaseFailure(error) };

                const activities = data || [];
                const totalCalls = activities.length;
                const connectedCalls = activities.filter((a: any) => a.metadata?.outcome === 'connected').length;
                const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

                const durations = activities
                    .map((a: any) => a.metadata?.duration_seconds)
                    .filter((d: unknown): d is number => typeof d === 'number' && d > 0);
                const avgDuration = durations.length > 0
                    ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / durations.length)
                    : 0;

                const uniqueContacts = new Set(activities.filter((a: any) => a.contact_id).map((a: any) => a.contact_id)).size;

                const outcomeMap = new Map<string, number>();
                for (const a of activities) {
                    const outcome = (a as any).metadata?.outcome || 'unknown';
                    outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);
                }

                return {
                    period: `${start} a ${end}`,
                    totalCalls,
                    connectedCalls,
                    connectionRate: `${connectionRate}%`,
                    avgDurationSeconds: avgDuration,
                    uniqueContacts,
                    byOutcome: Object.fromEntries(outcomeMap),
                };
            },
        }),

        getProspectingGoals: tool({
            description: 'Retorna metas diarias de prospeccao e o progresso atual (ligacoes feitas vs meta).',
            inputSchema: z.object({
                ownerId: z.string().optional().describe('Filtrar por corretor (padrao: usuario atual)'),
            }),
            execute: async ({ ownerId }) => {
                console.log('[AI] 🎯 getProspectingGoals EXECUTED!');

                const targetOwner = ownerId || userId;

                // Get goal
                const { data: goal, error: goalError } = await supabase
                    .from('prospecting_daily_goals')
                    .select('calls_target, owner_id')
                    .eq('organization_id', organizationId)
                    .eq('owner_id', targetOwner)
                    .maybeSingle();

                if (goalError) return { error: formatSupabaseFailure(goalError) };

                const callsTarget = goal?.calls_target ?? 30;

                // Count today's calls
                const today = new Date().toISOString().split('T')[0];
                const { count, error: countError } = await supabase
                    .from('activities')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', organizationId)
                    .eq('type', 'CALL')
                    .eq('owner_id', targetOwner)
                    .gte('date', `${today}T00:00:00`)
                    .lte('date', `${today}T23:59:59`)
                    .is('deleted_at', null);

                if (countError) return { error: formatSupabaseFailure(countError) };

                const current = count || 0;
                const percentage = callsTarget > 0 ? Math.round((current / callsTarget) * 100) : 0;
                const label = percentage >= 100 ? 'Meta atingida!' : percentage >= 50 ? 'Em progresso' : 'Inicio';

                return {
                    target: callsTarget,
                    current,
                    percentage: `${percentage}%`,
                    label,
                    isComplete: percentage >= 100,
                    remaining: Math.max(0, callsTarget - current),
                };
            },
        }),

        listQuickScripts: tool({
            description: 'Lista scripts rapidos disponiveis, filtrados por categoria (followup, objection, closing, intro, rescue, other).',
            inputSchema: z.object({
                category: z.enum(['followup', 'objection', 'closing', 'intro', 'rescue', 'other']).optional().describe('Filtrar por categoria'),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ category, limit }) => {
                console.log('[AI] 💬 listQuickScripts EXECUTED!', { category });

                let q = supabase
                    .from('quick_scripts')
                    .select('id, title, category, template, icon, is_system, created_at')
                    .or(`is_system.eq.true,organization_id.eq.${organizationId}`)
                    .order('created_at', { ascending: false })
                    .limit(limit);

                if (category) {
                    q = q.eq('category', category);
                }

                // RLS handles user-scoped access; org filter ensures admin client safety
                const { data, error } = await q;
                if (error) return { error: formatSupabaseFailure(error) };

                return {
                    count: data?.length || 0,
                    scripts: (data || []).map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        category: s.category,
                        template: s.template,
                        isSystem: s.is_system,
                    })),
                };
            },
        }),

        createQuickScript: tool({
            description: 'Cria/salva um novo script rapido na tabela quick_scripts. Requer aprovacao no card.',
            inputSchema: z.object({
                title: z.string().min(1).describe('Titulo do script'),
                category: z.enum(['followup', 'objection', 'closing', 'intro', 'rescue', 'other']).describe('Categoria do script'),
                template: z.string().min(1).describe('Conteudo/template do script'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, category, template }) => {
                console.log('[AI] ✏️ createQuickScript EXECUTED!', { title, category });

                const { data, error } = await supabase
                    .from('quick_scripts')
                    .insert({
                        title,
                        category,
                        template,
                        icon: 'MessageSquare',
                        is_system: false,
                        user_id: userId,
                        organization_id: organizationId,
                    })
                    .select('id, title, category')
                    .single();

                if (error) return { error: formatSupabaseFailure(error) };
                return {
                    success: true,
                    script: data,
                    message: `Script "${data.title}" salvo na categoria "${data.category}".`,
                };
            },
        }),

        generateAndSaveScript: tool({
            description: 'Salva um script de vendas na tabela quick_scripts. O conteudo do script deve ser composto por voce (LLM) e passado no campo "template". Use "context" apenas como referencia para composicao. Requer aprovacao no card.',
            inputSchema: z.object({
                title: z.string().min(1).describe('Titulo do script'),
                category: z.enum(['followup', 'objection', 'closing', 'intro', 'rescue', 'other']).describe('Categoria'),
                template: z.string().min(1).describe('Conteudo completo do script (composto pelo LLM)'),
                context: z.string().optional().describe('Contexto de referencia (deal, contato, situacao)'),
                baseScriptId: z.string().optional().describe('ID de um script existente para usar como base'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, category, template: providedTemplate, context: scriptContext, baseScriptId }) => {
                console.log('[AI] 🤖 generateAndSaveScript EXECUTED!', { title, category });

                let baseContent = '';
                if (baseScriptId) {
                    const { data: baseScript } = await supabase
                        .from('quick_scripts')
                        .select('template')
                        .eq('id', baseScriptId)
                        .maybeSingle();
                    baseContent = baseScript?.template || '';
                }

                // Use the LLM-composed template directly. Fall back to base script or context.
                const template = providedTemplate
                    || (baseContent ? `${baseContent}\n\n[Contexto: ${scriptContext || 'nenhum'}]` : scriptContext || title);

                const { data, error } = await supabase
                    .from('quick_scripts')
                    .insert({
                        title,
                        category,
                        template,
                        icon: 'MessageSquare',
                        is_system: false,
                        user_id: userId,
                        organization_id: organizationId,
                    })
                    .select('id, title, category, template')
                    .single();

                if (error) return { error: formatSupabaseFailure(error) };

                return {
                    success: true,
                    script: data,
                    message: `Script "${data.title}" gerado e salvo na categoria "${data.category}".`,
                };
            },
        }),
    };
}
