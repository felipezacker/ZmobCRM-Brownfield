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

                const items = (data || []).map((item) => {
                    const contactRef = Array.isArray(item.contacts) ? item.contacts[0] : item.contacts;
                    return {
                        id: item.id,
                        contactName: contactRef?.name || 'N/A',
                        contactPhone: contactRef?.phone || null,
                        contactEmail: contactRef?.email || null,
                        status: item.status,
                        position: item.position,
                        createdAt: item.created_at,
                    };
                });

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

                type ActivityRow = { id: string; date: string; owner_id: string; contact_id: string | null; metadata: Record<string, unknown> | null };
                const activities = (data || []) as ActivityRow[];
                const totalCalls = activities.length;
                const connectedCalls = activities.filter((a) => a.metadata?.outcome === 'connected').length;
                const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

                const durations = activities
                    .map((a) => a.metadata?.duration_seconds)
                    .filter((d: unknown): d is number => typeof d === 'number' && d > 0);
                const avgDuration = durations.length > 0
                    ? Math.round(durations.reduce((s: number, d: number) => s + d, 0) / durations.length)
                    : 0;

                const uniqueContacts = new Set(activities.filter((a) => a.contact_id).map((a) => a.contact_id)).size;

                const outcomeMap = new Map<string, number>();
                for (const a of activities) {
                    const outcome = (a.metadata?.outcome as string) || 'unknown';
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
                    scripts: (data || []).map((s: { id: string; title: string; category: string; template: string; is_system: boolean }) => ({
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

        suggestScript: tool({
            description: 'Analisa o contexto do contato (historico, outcome, stage) e sugere o script mais adequado das categorias existentes em quick_scripts.',
            inputSchema: z.object({
                contactId: z.string().describe('ID do contato para analisar contexto'),
                outcome: z.enum(['connected', 'no_answer', 'voicemail', 'busy']).optional().describe('Outcome da ultima ligacao'),
                stage: z.string().optional().describe('Stage atual do deal (ex: negotiation, closing, prospecting)'),
            }),
            execute: async ({ contactId, outcome, stage }) => {
                console.log('[AI] 🎯 suggestScript EXECUTED!', { contactId, outcome, stage });

                // 1. Fetch recent activity history for the contact
                const { data: activities, error: actError } = await supabase
                    .from('activities')
                    .select('id, type, date, metadata')
                    .eq('organization_id', organizationId)
                    .eq('contact_id', contactId)
                    .is('deleted_at', null)
                    .order('date', { ascending: false })
                    .limit(10);

                if (actError) return { error: formatSupabaseFailure(actError) };

                const activityCount = activities?.length ?? 0;
                const callActivities = (activities ?? []).filter((a: { type: string }) => a.type === 'CALL');
                const lastOutcome = outcome ?? (callActivities[0]?.metadata as Record<string, unknown> | null)?.outcome as string | undefined;

                // 2. Determine best script category based on context
                let category: 'followup' | 'objection' | 'closing' | 'intro' | 'rescue' | 'other';
                let reason: string;
                const stageLower = (stage ?? '').toLowerCase();

                if (stageLower.includes('negotiat') || stageLower.includes('negoci') || stageLower.includes('closing') || stageLower.includes('fechamento')) {
                    category = 'closing';
                    reason = `Contato esta no estagio "${stage}" — script de fechamento e o mais adequado.`;
                } else if (stageLower.includes('objec') || stageLower.includes('objecao') || stageLower.includes('objeção')) {
                    category = 'objection';
                    reason = `Contato esta em fase de objecoes — script de contorno de objecoes recomendado.`;
                } else if (lastOutcome === 'no_answer' || lastOutcome === 'voicemail') {
                    category = 'rescue';
                    reason = `Ultimo outcome foi "${lastOutcome}" — script de resgate/reengajamento sugerido.`;
                } else if (activityCount === 0) {
                    category = 'intro';
                    reason = 'Nenhuma atividade anterior — script de primeiro contato recomendado.';
                } else if (lastOutcome === 'connected' || activityCount > 1) {
                    category = 'followup';
                    reason = `Contato ja teve ${activityCount} interacoes — script de follow-up adequado.`;
                } else if (lastOutcome === 'busy') {
                    category = 'rescue';
                    reason = 'Ultimo outcome foi "busy" — script de resgate para retentativa.';
                } else {
                    category = 'followup';
                    reason = 'Contexto generico — follow-up e a opcao mais segura.';
                }

                // 3. Fetch scripts from the selected category
                const { data: scripts, error: scriptError } = await supabase
                    .from('quick_scripts')
                    .select('id, title, category, template')
                    .or(`is_system.eq.true,organization_id.eq.${organizationId}`)
                    .eq('category', category)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (scriptError) return { error: formatSupabaseFailure(scriptError) };

                if (!scripts || scripts.length === 0) {
                    return {
                        suggestedCategory: category,
                        reason,
                        script: null,
                        message: `Categoria "${category}" sugerida, mas nenhum script encontrado. Crie um com createQuickScript.`,
                    };
                }

                const bestScript = scripts[0];
                return {
                    suggestedCategory: category,
                    reason,
                    script: {
                        id: bestScript.id,
                        title: bestScript.title,
                        category: bestScript.category,
                        template: bestScript.template,
                    },
                    alternativeCount: scripts.length - 1,
                    context: {
                        activityCount,
                        lastOutcome: lastOutcome ?? null,
                        stage: stage ?? null,
                    },
                };
            },
        }),

        listSavedQueues: tool({
            description: 'Lista filas salvas de prospeccao do usuario (proprias + compartilhadas da organizacao). Use quando o usuario perguntar sobre filas salvas, quiser carregar uma fila existente ou ver o que ja foi organizado.',
            inputSchema: z.object({}),
            execute: async () => {
                console.log('[AI] 📋 listSavedQueues EXECUTED!');

                const { data, error } = await supabase
                    .from('prospecting_saved_queues')
                    .select('id, name, filters, owner_id, is_shared, created_at')
                    .or(`owner_id.eq.${userId},is_shared.eq.true`)
                    .eq('organization_id', organizationId)
                    .order('created_at', { ascending: false });

                if (error) return { error: formatSupabaseFailure(error) };

                const queues = (data || []).map((q: { id: string; name: string; filters: Record<string, unknown> | null; owner_id: string; is_shared: boolean; created_at: string }) => {
                    const filtersObj = q.filters as { contact_ids?: string[] } | null;
                    const contactCount = filtersObj?.contact_ids?.length ?? 0;

                    return {
                        id: q.id,
                        name: q.name,
                        contactCount,
                        isShared: q.is_shared,
                        isOwn: q.owner_id === userId,
                        createdAt: q.created_at,
                    };
                });

                return {
                    count: queues.length,
                    queues,
                };
            },
        }),

        addContactsToQueue: tool({
            description: 'Adiciona contatos a fila de prospeccao do usuario em batch. Requer aprovacao. Pula duplicatas automaticamente. Limite de 100 items na fila.',
            inputSchema: z.object({
                contactIds: z.array(z.string()).min(1).max(100).describe('IDs dos contatos para adicionar a fila'),
                targetOwnerId: z.string().optional().describe('ID do corretor dono da fila (padrao: usuario atual)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ contactIds, targetOwnerId }) => {
                console.log('[AI] ➕ addContactsToQueue EXECUTED!', { count: contactIds.length });

                const ownerId = targetOwnerId || userId;

                // Check current queue size
                const { data: existing, error: existError } = await supabase
                    .from('prospecting_queues')
                    .select('contact_id')
                    .eq('owner_id', ownerId)
                    .in('status', ['pending', 'in_progress']);

                if (existError) return { error: formatSupabaseFailure(existError) };

                const existingIds = new Set((existing || []).map((e: { contact_id: string }) => e.contact_id));
                const currentSize = existingIds.size;

                // Filter out duplicates
                const newIds = contactIds.filter(id => !existingIds.has(id));

                if (currentSize + newIds.length > 100) {
                    return {
                        error: `Fila excederia o limite de 100 items. Atual: ${currentSize}, novos: ${newIds.length}, total seria: ${currentSize + newIds.length}. Remova items da fila antes de adicionar novos.`,
                    };
                }

                if (newIds.length === 0) {
                    return { added: 0, skipped: contactIds.length, reason: 'Todos os contatos ja estao na fila.' };
                }

                // Get max position
                const { data: maxPosData } = await supabase
                    .from('prospecting_queues')
                    .select('position')
                    .eq('owner_id', ownerId)
                    .order('position', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                let nextPosition = maxPosData ? (maxPosData as { position: number }).position + 1 : 0;

                const rows = newIds.map(contactId => ({
                    contact_id: contactId,
                    owner_id: ownerId,
                    organization_id: organizationId,
                    status: 'pending' as const,
                    position: nextPosition++,
                    session_id: null,
                    assigned_by: ownerId !== userId ? userId : null,
                }));

                const { error: insertError } = await supabase.from('prospecting_queues').insert(rows);
                if (insertError) return { error: formatSupabaseFailure(insertError) };

                return {
                    added: newIds.length,
                    skipped: contactIds.length - newIds.length,
                };
            },
        }),

        suggestContactsForProspecting: tool({
            description: 'Sugere contatos para ligar agora, rankeados por score composto (lead score, dias sem contato, horario ideal, outcomes). Use quando o usuario perguntar "quem devo ligar?" ou "sugira contatos para prospectar".',
            inputSchema: z.object({
                count: z.number().min(1).max(20).default(10).describe('Quantidade de sugestoes (padrao 10)'),
                stage: z.string().optional().describe('Filtrar por stage do deal (ex: prospecting, qualification)'),
                temperature: z.enum(['HOT', 'WARM', 'COLD']).optional().describe('Filtrar por temperatura do lead'),
            }),
            execute: async ({ count, stage, temperature }) => {
                console.log('[AI] 🎯 suggestContactsForProspecting EXECUTED!', { count, stage, temperature });

                // 1. Fetch active contacts with phone
                let contactQuery = supabase
                    .from('contacts')
                    .select('id, name, phone, email, stage, temperature, lead_score, last_contact_date, created_at')
                    .eq('organization_id', organizationId)
                    .is('deleted_at', null)
                    .not('phone', 'is', null)
                    .limit(500);

                if (stage) {
                    contactQuery = contactQuery.eq('stage', stage);
                }
                if (temperature) {
                    contactQuery = contactQuery.eq('temperature', temperature);
                }

                const { data: contacts, error: contactError } = await contactQuery;
                if (contactError) return { error: formatSupabaseFailure(contactError) };
                if (!contacts || contacts.length === 0) {
                    return { suggestions: [], count: 0, message: 'Nenhum contato encontrado com os filtros especificados.' };
                }

                // 2. Fetch recent call activities for outcome data
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: recentCalls } = await supabase
                    .from('activities')
                    .select('contact_id, date, metadata')
                    .eq('organization_id', organizationId)
                    .eq('type', 'CALL')
                    .is('deleted_at', null)
                    .gte('date', thirtyDaysAgo.toISOString())
                    .limit(5000);

                // Build lookup: contact_id -> { lastCallDate, consecutiveNoAnswer }
                type CallInfo = { lastCallDate: string; consecutiveNoAnswer: number };
                const callMap = new Map<string, CallInfo>();
                const callsByContact = new Map<string, Array<{ date: string; outcome: string }>>();

                for (const call of (recentCalls || [])) {
                    const cid = call.contact_id as string | null;
                    if (!cid) continue;

                    const outcome = (call.metadata as Record<string, unknown> | null)?.outcome as string || 'unknown';
                    if (!callsByContact.has(cid)) callsByContact.set(cid, []);
                    callsByContact.get(cid)!.push({ date: call.date as string, outcome });
                }

                for (const [cid, calls] of callsByContact) {
                    calls.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    let consecutiveNoAnswer = 0;
                    for (const c of calls) {
                        if (c.outcome === 'no_answer') consecutiveNoAnswer++;
                        else break;
                    }
                    callMap.set(cid, { lastCallDate: calls[0].date, consecutiveNoAnswer });
                }

                // 3. Get current hour for best_hour_match
                const currentHour = new Date().getHours();

                // 4. Score and rank contacts
                type ContactRow = { id: string; name: string; phone: string | null; email: string | null; stage: string | null; temperature: string | null; lead_score: number | null; last_contact_date: string | null; created_at: string };
                const scored = (contacts as ContactRow[]).map(contact => {
                    const leadScore = contact.lead_score ?? 0;
                    const callInfo = callMap.get(contact.id);

                    // Days since last contact
                    const lastDate = callInfo?.lastCallDate || contact.last_contact_date || contact.created_at;
                    const daysSinceLastContact = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));

                    // Skip contacts with 3+ consecutive no_answer
                    const consecutiveNoAnswer = callInfo?.consecutiveNoAnswer ?? 0;
                    if (consecutiveNoAnswer >= 3) return null;

                    // Best hour match (simple heuristic: business hours 8-18 = higher score)
                    const bestHourScore = (currentHour >= 8 && currentHour <= 18) ? 80 : 40;

                    // Outcome penalty
                    const outcomePenalty = consecutiveNoAnswer * 10;

                    // Composite score (0-100 range)
                    const compositeScore = Math.round(
                        (leadScore * 0.4) +
                        (Math.min(daysSinceLastContact * 3, 100) * 0.3) +
                        (bestHourScore * 0.2) -
                        (outcomePenalty * 0.1)
                    );

                    // Suggested action
                    let suggestedAction: string;
                    let reason: string;

                    if (daysSinceLastContact > 14) {
                        suggestedAction = 'Reengajar — muito tempo sem contato';
                        reason = `${daysSinceLastContact} dias sem contato, lead score ${leadScore}`;
                    } else if (leadScore >= 60) {
                        suggestedAction = 'Ligar agora — lead quente';
                        reason = `Lead score alto (${leadScore}), temperatura ${contact.temperature || 'N/A'}`;
                    } else if (daysSinceLastContact > 7) {
                        suggestedAction = 'Follow-up — manter contato';
                        reason = `${daysSinceLastContact} dias desde ultimo contato`;
                    } else {
                        suggestedAction = 'Acompanhar — contato recente';
                        reason = `Lead score ${leadScore}, ultimo contato ha ${daysSinceLastContact} dia(s)`;
                    }

                    return {
                        name: contact.name,
                        phone: contact.phone,
                        leadScore,
                        temperature: contact.temperature || 'N/A',
                        daysSinceLastContact,
                        suggestedAction,
                        reason,
                        _compositeScore: compositeScore,
                    };
                }).filter(Boolean) as Array<{
                    name: string;
                    phone: string | null;
                    leadScore: number;
                    temperature: string;
                    daysSinceLastContact: number;
                    suggestedAction: string;
                    reason: string;
                    _compositeScore: number;
                }>;

                // Sort by composite score DESC
                scored.sort((a, b) => b._compositeScore - a._compositeScore);

                // Return top N without internal score field
                const suggestions = scored.slice(0, count).map(({ _compositeScore, ...rest }) => rest);

                return {
                    count: suggestions.length,
                    totalEvaluated: contacts.length,
                    suggestions,
                };
            },
        }),

        analyzeProspectingPatterns: tool({
            description: 'Analisa padroes de prospeccao do usuario: melhor horario, dia mais produtivo, taxa de conexao por stage, contatos negligenciados. Use quando o usuario pedir "analise meus padroes" ou "como estou prospectando?".',
            inputSchema: z.object({
                period: z.enum(['7d', '30d', '90d']).default('30d').describe('Periodo de analise: 7d, 30d ou 90d'),
            }),
            execute: async ({ period }) => {
                console.log('[AI] 📈 analyzeProspectingPatterns EXECUTED!', { period });

                const now = new Date();
                const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
                const days = daysMap[period];
                const startDate = new Date(now);
                startDate.setDate(startDate.getDate() - days);

                // 1. Fetch call activities in period
                const { data: activities, error } = await supabase
                    .from('activities')
                    .select('id, date, contact_id, metadata')
                    .eq('organization_id', organizationId)
                    .eq('type', 'CALL')
                    .eq('owner_id', userId)
                    .is('deleted_at', null)
                    .gte('date', startDate.toISOString())
                    .lte('date', now.toISOString())
                    .limit(5000)
                    .order('date', { ascending: false });

                if (error) return { error: formatSupabaseFailure(error) };

                type ActivityRow = { id: string; date: string; contact_id: string | null; metadata: Record<string, unknown> | null };
                const calls = (activities || []) as ActivityRow[];

                if (calls.length === 0) {
                    return {
                        period,
                        totalCalls: 0,
                        summary: `Nenhuma ligacao registrada nos ultimos ${days} dias. Comece a prospectar para gerar insights!`,
                    };
                }

                // 2. Aggregate by hour
                const hourStats = new Map<number, { total: number; connected: number }>();
                for (let h = 0; h < 24; h++) hourStats.set(h, { total: 0, connected: 0 });

                // 3. Aggregate by day of week
                const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
                const dayStats = new Map<number, { total: number; connected: number }>();
                for (let d = 0; d < 7; d++) dayStats.set(d, { total: 0, connected: 0 });

                // 4. Aggregate by contact stage
                const contactIds = new Set<string>();
                const contactLastCall = new Map<string, string>();

                for (const call of calls) {
                    const callDate = new Date(call.date);
                    const hour = callDate.getHours();
                    const day = callDate.getDay();
                    const outcome = (call.metadata?.outcome as string) || 'unknown';
                    const isConnected = outcome === 'connected';

                    const hs = hourStats.get(hour)!;
                    hs.total++;
                    if (isConnected) hs.connected++;

                    const ds = dayStats.get(day)!;
                    ds.total++;
                    if (isConnected) ds.connected++;

                    if (call.contact_id) {
                        contactIds.add(call.contact_id);
                        const existing = contactLastCall.get(call.contact_id);
                        if (!existing || call.date > existing) {
                            contactLastCall.set(call.contact_id, call.date);
                        }
                    }
                }

                // Best hour (highest connection rate with min 3 calls)
                let bestHour = { hour: 0, connectionRate: 0 };
                for (const [hour, stats] of hourStats) {
                    if (stats.total >= 3) {
                        const rate = Math.round((stats.connected / stats.total) * 100);
                        if (rate > bestHour.connectionRate) {
                            bestHour = { hour, connectionRate: rate };
                        }
                    }
                }

                // Best day (highest total calls)
                let bestDay = { dayOfWeek: '', totalCalls: 0, connectionRate: 0 };
                for (const [day, stats] of dayStats) {
                    if (stats.total > bestDay.totalCalls) {
                        const rate = stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0;
                        bestDay = { dayOfWeek: dayNames[day], totalCalls: stats.total, connectionRate: rate };
                    }
                }

                // 5. Neglected contacts (>7 days since last call)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                // Fetch contact details for neglected ones
                const neglectedIds: string[] = [];
                for (const [contactId, lastCall] of contactLastCall) {
                    if (new Date(lastCall) < sevenDaysAgo) {
                        neglectedIds.push(contactId);
                    }
                }

                let neglectedContacts: Array<{ name: string; daysSince: number; temperature: string | null; leadScore: number | null }> = [];

                if (neglectedIds.length > 0) {
                    const { data: neglectedData } = await supabase
                        .from('contacts')
                        .select('id, name, temperature, lead_score')
                        .in('id', neglectedIds.slice(0, 20))
                        .is('deleted_at', null);

                    neglectedContacts = (neglectedData || []).map((c: { id: string; name: string; temperature: string | null; lead_score: number | null }) => {
                        const lastCall = contactLastCall.get(c.id) || '';
                        const daysSince = Math.floor((Date.now() - new Date(lastCall).getTime()) / (1000 * 60 * 60 * 24));
                        return {
                            name: c.name,
                            daysSince,
                            temperature: c.temperature,
                            leadScore: c.lead_score,
                        };
                    }).sort((a: { daysSince: number }, b: { daysSince: number }) => b.daysSince - a.daysSince).slice(0, 10);
                }

                // 6. Build summary
                const totalCalls = calls.length;
                const totalConnected = calls.filter(c => (c.metadata?.outcome as string) === 'connected').length;
                const overallRate = totalCalls > 0 ? Math.round((totalConnected / totalCalls) * 100) : 0;

                const summary = `Nos ultimos ${days} dias: ${totalCalls} ligacoes, ${overallRate}% taxa de conexao. ` +
                    `Melhor horario: ${bestHour.hour}h (${bestHour.connectionRate}% conexao). ` +
                    `Dia mais produtivo: ${bestDay.dayOfWeek} (${bestDay.totalCalls} ligacoes). ` +
                    `${neglectedContacts.length} contatos negligenciados (>7 dias sem contato).`;

                return {
                    period,
                    totalCalls,
                    connectionRate: `${overallRate}%`,
                    bestHour,
                    bestDay,
                    neglectedContacts,
                    summary,
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
