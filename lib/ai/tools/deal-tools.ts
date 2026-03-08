import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure, sanitizeFilterValue, ensureBoardBelongsToOrganization, ensureDealBelongsToOrganization, resolveStageIdForBoard } from './helpers';

interface DealRow {
    id: string;
    title: string;
    value: number | null;
    is_won: boolean;
    is_lost: boolean;
    property_ref?: string | null;
    updated_at?: string;
    board_id?: string;
    stage?: { name?: string; label?: string } | null;
    contact?: { name?: string; email?: string; phone?: string } | null;
    activities?: Array<{ id: string; type: string; title: string; completed: boolean; date: string }>;
}

export function createDealTools({ supabase, organizationId, context, userId, bypassApproval }: ToolContext) {
    return {
        searchDeals: tool({
            description: 'Busca deals por título',
            inputSchema: z.object({
                query: z.string().describe('Termo de busca'),
                limit: z.number().optional().default(5),
            }),
            execute: async ({ query, limit }) => {
                const cleanedQuery = String(query)
                    .trim()
                    .replace(/^["'""'']+/, '')
                    .replace(/["'""'']+$/, '')
                    .trim();

                const normalizedQuery = cleanedQuery
                    .replace(/[^\p{L}\p{N}\s.-]+/gu, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const strippedQuery = normalizedQuery
                    .replace(/\b(buscar|busque|procure|procurar|encontre|encontrar|mostrar|liste|listar|deal|deals|neg[oó]cio|neg[oó]cios|oportunidade|oportunidades|card|cards)\b/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const effectiveQuery = strippedQuery || normalizedQuery;

                console.log('[AI] 🔍 searchDeals EXECUTED!', { query, cleanedQuery, effectiveQuery });

                if (!effectiveQuery) {
                    return { error: 'Informe um termo de busca.' };
                }

                let queryBuilder = supabase
                    .from('deals')
                    .select('id, title, value, is_won, is_lost, property_ref, stage:board_stages(name, label), contact:contacts(name)')
                    .is('deleted_at', null)
                    .limit(limit);

                const terms = effectiveQuery
                    .split(' ')
                    .map((t) => t.trim())
                    .filter(Boolean);

                if (terms.length <= 1) {
                    queryBuilder = queryBuilder.ilike('title', `%${effectiveQuery}%`);
                } else {
                    queryBuilder = queryBuilder.or(
                        terms.map((t) => `title.ilike.%${sanitizeFilterValue(t)}%`).join(',')
                    );
                }

                if (context.boardId) {
                    const guard = await ensureBoardBelongsToOrganization(supabase, organizationId, context.boardId);
                    if (!guard.ok) return { error: guard.error };

                    queryBuilder = queryBuilder
                        .eq('board_id', context.boardId)
                        .or(`organization_id.eq.${organizationId},organization_id.is.null`);
                } else {
                    queryBuilder = queryBuilder.eq('organization_id', organizationId);
                }

                const { data: deals, error: dealsError } = await queryBuilder;

                if (dealsError) {
                    return { error: formatSupabaseFailure(dealsError) };
                }

                return {
                    count: deals?.length || 0,
                    deals: deals?.map((d) => ({
                        id: d.id,
                        title: d.title,
                        value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                        stage: (d.stage as DealRow['stage'])?.name || (d.stage as DealRow['stage'])?.label || 'N/A',
                        contact: (d.contact as DealRow['contact'])?.name || 'N/A',
                        propertyRef: d.property_ref || null,
                        status: d.is_won ? '✅ Ganho' : d.is_lost ? '❌ Perdido' : '🔄 Aberto'
                    })) || []
                };
            },
        }),

        listDealsByStage: tool({
            description: 'Lista todos os deals em um estágio específico do funil',
            inputSchema: z.object({
                stageName: z.string().optional().describe('Nome do estágio (ex: Proposta, Negociação)'),
                stageId: z.string().optional().describe('ID do estágio'),
                boardId: z.string().optional(),
                limit: z.number().optional().default(10),
            }),
            execute: async ({ stageName, stageId, boardId, limit }) => {
                const targetBoardId = boardId || context.boardId;

                console.log('[AI] 📋 listDealsByStage EXECUTING:', { stageName, stageId, boardId, targetBoardId });

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const boardGuard = await ensureBoardBelongsToOrganization(supabase, organizationId, targetBoardId);
                if (!boardGuard.ok) return { error: boardGuard.error };

                const isValidUuid = (str: string) =>
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                const isUuidPrefix = (str: string) =>
                    /^[0-9a-f]{8}$/i.test(str) || /^[0-9a-f]{8}-[0-9a-f]{1,4}$/i.test(str);

                let finalStageId = stageId;
                let effectiveStageName = stageName;

                if (finalStageId && !isValidUuid(finalStageId) && !isUuidPrefix(finalStageId)) {
                    effectiveStageName = finalStageId;
                    finalStageId = undefined;
                }

                if (finalStageId && !isValidUuid(finalStageId) && isUuidPrefix(finalStageId)) {
                    const { data: stages } = await supabase
                        .from('board_stages')
                        .select('id, name')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .ilike('id', `${finalStageId}%`);

                    if (stages && stages.length > 0) {
                        finalStageId = stages[0].id;
                    } else {
                        finalStageId = undefined;
                    }
                }

                if (!finalStageId && effectiveStageName) {
                    const { data: stages, error: stageError } = await supabase
                        .from('board_stages')
                        .select('id, name, label')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .or(`name.ilike.%${sanitizeFilterValue(effectiveStageName)}%,label.ilike.%${sanitizeFilterValue(effectiveStageName)}%`);

                    if (stages && stages.length > 0) {
                        finalStageId = stages[0].id;
                    } else {
                        const { data: allStages } = await supabase
                            .from('board_stages')
                            .select('name, label')
                            .eq('organization_id', organizationId)
                            .eq('board_id', targetBoardId);

                        const stageNames = allStages?.map(s => s.name || s.label).join(', ') || 'nenhum';
                        return { error: `Estágio "${effectiveStageName}" não encontrado. Estágios disponíveis: ${stageNames}` };
                    }
                }

                if (!finalStageId) {
                    return { error: 'Estágio não identificado. Informe o nome do estágio (ex: "Proposta", "Descoberta").' };
                }

                const { data: deals, error: dealsError } = await supabase
                    .from('deals')
                    .select('id, title, value, updated_at, is_won, is_lost, contact:contacts(name)')
                    .eq('board_id', targetBoardId)
                    .eq('stage_id', finalStageId)
                    .is('deleted_at', null)
                    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
                    .order('value', { ascending: false })
                    .limit(Math.max(limit * 5, 50));

                if (dealsError) {
                    return { error: formatSupabaseFailure(dealsError) };
                }

                const openDeals = (deals || []).filter((d) => !d.is_won && !d.is_lost);
                const finalDeals = openDeals.slice(0, limit);
                const totalValue = finalDeals.reduce((s: number, d) => s + (d.value || 0), 0) || 0;

                return {
                    count: finalDeals.length || 0,
                    totalValue: `R$ ${totalValue.toLocaleString('pt-BR')}`,
                    deals: finalDeals.map((d) => ({
                        id: d.id,
                        title: d.title,
                        value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                        contact: (d.contact as DealRow['contact'])?.name || 'N/A'
                    })) || []
                };
            },
        }),

        listStagnantDeals: tool({
            description: 'Lista deals parados/estagnados há mais de X dias sem atualização',
            inputSchema: z.object({
                boardId: z.string().optional(),
                daysStagnant: z.number().int().positive().optional().default(7).describe('Dias sem atualização'),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ boardId, daysStagnant, limit }) => {
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] ⏰ listStagnantDeals EXECUTED!');

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const boardGuard = await ensureBoardBelongsToOrganization(supabase, organizationId, targetBoardId);
                if (!boardGuard.ok) return { error: boardGuard.error };

                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysStagnant);

                const { data: deals } = await supabase
                    .from('deals')
                    .select('id, title, value, updated_at, is_won, is_lost, contact:contacts(name)')
                    .eq('board_id', targetBoardId)
                    .is('deleted_at', null)
                    .or(`organization_id.eq.${organizationId},organization_id.is.null`)
                    .lt('updated_at', cutoffDate.toISOString())
                    .order('updated_at', { ascending: true })
                    .limit(Math.max(limit * 5, 50));

                const openDeals = (deals || []).filter((d) => !d.is_won && !d.is_lost);
                const finalDeals = openDeals.slice(0, limit);

                return {
                    count: finalDeals.length || 0,
                    message: `${finalDeals.length || 0} deals parados há mais de ${daysStagnant} dias`,
                    deals: finalDeals.map((d) => {
                        const days = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24));
                        return {
                            id: d.id,
                            title: d.title,
                            diasParado: days,
                            value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                            contact: (d.contact as DealRow['contact'])?.name || 'N/A'
                        };
                    }) || []
                };
            },
        }),

        listOverdueDeals: tool({
            description: 'Lista deals que possuem atividades atrasadas',
            inputSchema: z.object({
                boardId: z.string().optional(),
                limit: z.number().int().positive().optional().default(10),
            }),
            execute: async ({ boardId, limit }) => {
                const targetBoardId = boardId || context.boardId;

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const now = new Date().toISOString();

                const { data: overdueActivities } = await supabase
                    .from('activities')
                    .select('deal_id, date, title')
                    .eq('organization_id', organizationId)
                    .lt('date', now)
                    .eq('completed', false)
                    .order('date', { ascending: true });

                if (!overdueActivities || overdueActivities.length === 0) {
                    return { count: 0, message: 'Nenhuma atividade atrasada encontrada! 🎉', deals: [] };
                }

                const dealIds = [...new Set(overdueActivities.map(a => a.deal_id).filter(Boolean))];

                const { data: deals } = await supabase
                    .from('deals')
                    .select('id, title, value, contact:contacts(name)')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .is('deleted_at', null)
                    .in('id', dealIds)
                    .limit(limit);

                return {
                    count: deals?.length || 0,
                    message: `⚠️ ${deals?.length || 0} deals com atividades atrasadas`,
                    deals: deals?.map((d) => ({
                        id: d.id,
                        title: d.title,
                        value: `R$ ${(d.value || 0).toLocaleString('pt-BR')}`,
                        contact: (d.contact as DealRow['contact'])?.name || 'N/A',
                        overdueCount: overdueActivities.filter(a => a.deal_id === d.id).length
                    })) || []
                };
            },
        }),

        getDealDetails: tool({
            description: 'Mostra os detalhes completos de um deal específico',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se não fornecido)'),
            }),
            execute: async ({ dealId }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] 🔎 getDealDetails EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: deal, error } = await supabase
                    .from('deals')
                    .select(`
                        *,
                        contact:contacts(name, email, phone),
                        stage:board_stages(name, label),
                        activities(id, type, title, completed, date)
                    `)
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .single();

                if (error || !deal) {
                    return { error: 'Deal não encontrado.' };
                }

                const activities = deal.activities as DealRow['activities'] | undefined;
                const pendingActivities = activities?.filter((a) => !a.completed) || [];
                const stageData = deal.stage as DealRow['stage'];
                const contactData = deal.contact as DealRow['contact'];

                return {
                    id: deal.id,
                    title: deal.title,
                    value: `R$ ${(deal.value || 0).toLocaleString('pt-BR')}`,
                    status: deal.is_won ? '✅ Ganho' : deal.is_lost ? '❌ Perdido' : '🔄 Aberto',
                    stage: stageData?.name || stageData?.label || 'N/A',
                    priority: deal.priority || 'medium',
                    propertyRef: deal.property_ref || null,
                    contact: contactData?.name || 'N/A',
                    contactEmail: contactData?.email || 'N/A',
                    pendingActivities: pendingActivities.length,
                    createdAt: deal.created_at
                };
            },
        }),

        moveDeal: tool({
            description: 'Move um deal para outro estágio do funil. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se não fornecido)'),
                stageName: z.string().optional().describe('Nome do estágio destino'),
                stageId: z.string().optional().describe('ID do estágio destino'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, stageName, stageId }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] 🔄 moveDeal EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: deal } = await supabase
                    .from('deals')
                    .select('board_id, title')
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .single();

                if (!deal) {
                    return { error: 'Deal não encontrado.' };
                }

                let targetStageId = stageId;
                if (!targetStageId && stageName) {
                    const { data: stages } = await supabase
                        .from('board_stages')
                        .select('id, name, label')
                        .eq('organization_id', organizationId)
                        .eq('board_id', deal.board_id)
                        .or(`name.ilike.%${sanitizeFilterValue(stageName)}%,label.ilike.%${sanitizeFilterValue(stageName)}%`);

                    if (stages && stages.length > 0) {
                        targetStageId = stages[0].id;
                    } else {
                        return { error: `Estágio "${stageName}" não encontrado.` };
                    }
                }

                if (!targetStageId) {
                    return { error: 'Especifique o estágio destino.' };
                }

                const { error } = await supabase
                    .from('deals')
                    .update({
                        stage_id: targetStageId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId);

                if (error) {
                    return { success: false, error: error.message };
                }

                return { success: true, message: `Deal "${deal.title}" movido com sucesso!` };
            },
        }),

        createDeal: tool({
            description: 'Cria um novo deal no board atual (ou informado). Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                title: z.string().min(1).describe('Título do deal'),
                value: z.number().optional().default(0).describe('Valor do deal em reais'),
                contactName: z.string().optional().describe('Nome do contato'),
                boardId: z.string().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ title, value, contactName, boardId }) => {
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] ➕ createDeal EXECUTED!', title);

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const { data: stages } = await supabase
                    .from('board_stages')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .order('order', { ascending: true })
                    .limit(1);

                const firstStageId = stages?.[0]?.id;
                if (!firstStageId) {
                    return { error: 'Board não tem estágios configurados.' };
                }

                let contactId: string | null = null;
                if (contactName) {
                    const { data: existing } = await supabase
                        .from('contacts')
                        .select('id')
                        .eq('organization_id', organizationId)
                        .is('deleted_at', null)
                        .ilike('name', contactName)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        contactId = existing[0].id;
                    } else {
                        const { data: newContact } = await supabase
                            .from('contacts')
                            .insert({
                                organization_id: organizationId,
                                name: contactName,
                                owner_id: userId,
                            })
                            .select('id')
                            .single();

                        contactId = newContact?.id ?? null;
                    }
                }

                const { data: deal, error } = await supabase
                    .from('deals')
                    .insert({
                        organization_id: organizationId,
                        board_id: targetBoardId,
                        title,
                        value,
                        contact_id: contactId,
                        stage_id: firstStageId,
                        priority: 'medium',
                        is_won: false,
                        is_lost: false,
                        owner_id: userId,
                    })
                    .select('id, title, value')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message ?? 'Falha ao criar deal' };
                }

                return {
                    success: true,
                    deal: {
                        id: deal.id,
                        title: deal.title,
                        value: `R$ ${(deal.value || 0).toLocaleString('pt-BR')}`
                    },
                    message: `Deal "${title}" criado com sucesso!`
                };
            },
        }),

        updateDeal: tool({
            description: 'Atualiza campos de um deal existente. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (usa contexto se não fornecido)'),
                title: z.string().optional().describe('Novo título'),
                value: z.number().optional().describe('Novo valor'),
                priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, title, value, priority }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] ✏️ updateDeal EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
                if (title) updateData.title = title;
                if (value !== undefined) updateData.value = value;
                if (priority) updateData.priority = priority;

                const { error } = await supabase
                    .from('deals')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId);

                if (error) {
                    return { success: false, error: error.message };
                }

                return { success: true, message: 'Deal atualizado com sucesso!' };
            },
        }),

        markDealAsWon: tool({
            description: 'Marca um deal como GANHO/fechado com sucesso! 🎉 Pode encontrar o deal por ID, título, ou estágio. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal (opcional se fornecer outros identificadores)'),
                dealTitle: z.string().optional().describe('Título/nome do deal para buscar'),
                stageName: z.string().optional().describe('Nome do estágio onde o deal está (ex: "Proposta")'),
                wonValue: z.number().optional().describe('Valor final do fechamento'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, dealTitle, stageName, wonValue }) => {
                let targetDealId = dealId || context.dealId;
                const targetBoardId = context.boardId;

                console.log('[AI] 🎉 markDealAsWon EXECUTING:', { dealId, dealTitle, stageName, targetBoardId });

                if (!targetDealId && targetBoardId) {
                    let query = supabase
                        .from('deals')
                        .select('id, title, value, is_won, is_lost, stage:board_stages(name)')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .is('deleted_at', null);

                    if (dealTitle) {
                        query = query.ilike('title', `%${dealTitle}%`);
                    }

                    const { data: foundDeals } = await query.limit(20);
                    const openFoundDeals = (foundDeals || []).filter((d) => !d.is_won && !d.is_lost);

                    if (stageName && openFoundDeals) {
                        const filtered = openFoundDeals.filter((d) =>
                            (d.stage as DealRow['stage'])?.name?.toLowerCase().includes(stageName.toLowerCase())
                        );
                        if (filtered.length === 1) {
                            targetDealId = filtered[0].id;
                        } else if (filtered.length > 1) {
                            return {
                                error: `Encontrei ${filtered.length} deals em "${stageName}". Especifique qual: ${filtered.map((d) => d.title).join(', ')}`
                            };
                        }
                    } else if (openFoundDeals.length === 1) {
                        targetDealId = openFoundDeals[0].id;
                    } else if (dealTitle && openFoundDeals.length > 0) {
                        return {
                            error: `Encontrei ${openFoundDeals.length} deals com "${dealTitle}". Especifique qual: ${openFoundDeals.map((d) => d.title).join(', ')}`
                        };
                    }
                }

                if (!targetDealId) {
                    return { error: 'Não consegui identificar o deal. Forneça o ID, título ou nome do estágio.' };
                }

                let wonStageId: string | null = null;
                const wonStageNameFromContext = context.wonStage || 'Ganho';

                if (targetBoardId && wonStageNameFromContext) {
                    const { data: wonStages } = await supabase
                        .from('board_stages')
                        .select('id, name, label')
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .or(`name.ilike.%${sanitizeFilterValue(wonStageNameFromContext)}%,label.ilike.%${sanitizeFilterValue(wonStageNameFromContext)}%`)
                        .limit(1);

                    if (wonStages && wonStages.length > 0) {
                        wonStageId = wonStages[0].id;
                    }
                }

                const updateData: Record<string, unknown> = {
                    is_won: true,
                    is_lost: false,
                    closed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                if (wonValue !== undefined) updateData.value = wonValue;
                if (wonStageId) updateData.stage_id = wonStageId;

                const { data: deal, error } = await supabase
                    .from('deals')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .select('title, value')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message || 'Deal não encontrado' };
                }

                return {
                    success: true,
                    message: `🎉 Parabéns! Deal "${deal.title}" marcado como GANHO!`,
                    value: `R$ ${(deal.value || 0).toLocaleString('pt-BR')}`
                };
            },
        }),

        markDealAsLost: tool({
            description: 'Marca um deal como PERDIDO. Requer motivo da perda. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal'),
                reason: z.string().describe('Motivo da perda (ex: Preço, Concorrente, Timing)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, reason }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] ❌ markDealAsLost EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: deal, error } = await supabase
                    .from('deals')
                    .update({
                        is_won: false,
                        is_lost: true,
                        loss_reason: reason,
                        closed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .select('title')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message || 'Deal não encontrado' };
                }

                return {
                    success: true,
                    message: `Deal "${deal.title}" marcado como perdido. Motivo: ${reason}`
                };
            },
        }),

        assignDeal: tool({
            description: 'Reatribui um deal para outro corretor/responsável. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealId: z.string().optional().describe('ID do deal'),
                newOwnerId: z.string().describe('ID do novo responsável (UUID)'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealId, newOwnerId }) => {
                const targetDealId = dealId || context.dealId;
                console.log('[AI] 👤 assignDeal EXECUTED!');

                if (!targetDealId) {
                    return { error: 'Nenhum deal especificado.' };
                }

                const { data: ownerProfile } = await supabase
                    .from('profiles')
                    .select('first_name, nickname')
                    .eq('organization_id', organizationId)
                    .eq('id', newOwnerId)
                    .single();

                const ownerName = ownerProfile?.nickname || ownerProfile?.first_name || 'Novo responsável';

                const { data: deal, error } = await supabase
                    .from('deals')
                    .update({
                        owner_id: newOwnerId,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('organization_id', organizationId)
                    .eq('id', targetDealId)
                    .select('title')
                    .single();

                if (error || !deal) {
                    return { success: false, error: error?.message || 'Deal não encontrado' };
                }

                return {
                    success: true,
                    message: `Deal "${deal.title}" reatribuído para ${ownerName}`
                };
            },
        }),

        moveDealsBulk: tool({
            description: 'Move vários deals de uma vez para outro estágio. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                dealIds: z.array(z.string()).min(1).describe('IDs dos deals a mover'),
                boardId: z.string().optional().describe('Board alvo (usa contexto se não fornecido)'),
                stageName: z.string().optional().describe('Nome do estágio destino (ex: "Contatado")'),
                stageId: z.string().optional().describe('ID do estágio destino'),
                allowPartial: z.boolean().optional().default(true),
                maxDeals: z.number().int().positive().optional().default(50),
                createFollowUpTask: z.boolean().optional().default(false),
                followUpTitle: z.string().optional(),
                followUpDueInDays: z.number().int().positive().optional().default(2),
                followUpType: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']).optional().default('TASK'),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ dealIds, boardId, stageName, stageId, allowPartial, maxDeals, createFollowUpTask, followUpTitle, followUpDueInDays, followUpType }) => {
                const unique = Array.from(new Set((dealIds || []).filter(Boolean)));
                if (unique.length === 0) return { error: 'Informe pelo menos 1 deal.' };
                if (unique.length > maxDeals) {
                    return { error: `Muitos deals (${unique.length}). Por segurança, o máximo por ação é ${maxDeals}. Filtre ou faça em lotes.` };
                }

                const targetBoardId = boardId || context.boardId;
                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado. Vá para um board ou informe qual.' };
                }

                const boardGuard = await ensureBoardBelongsToOrganization(supabase, organizationId, targetBoardId);
                if (!boardGuard.ok) return { error: boardGuard.error };

                const { data: deals, error: dealsError } = await supabase
                    .from('deals')
                    .select('id, title, board_id')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .is('deleted_at', null)
                    .in('id', unique);

                if (dealsError) return { error: formatSupabaseFailure(dealsError) };

                const foundIds = new Set((deals || []).map((d) => d.id));
                const missingIds = unique.filter((id) => !foundIds.has(id));

                if (missingIds.length > 0 && !allowPartial) {
                    return { error: `Alguns deals não foram encontrados neste board/organização (${missingIds.length}).` };
                }

                const stageRes = await resolveStageIdForBoard(supabase, organizationId, { boardId: targetBoardId, stageId, stageName });
                if (!stageRes.ok) return { error: stageRes.error };

                const idsToMove = (deals || []).map((d) => d.id);
                if (idsToMove.length === 0) {
                    return { error: 'Nenhum deal válido encontrado para mover (cheque board/organização).' };
                }

                const { error: updError } = await supabase
                    .from('deals')
                    .update({ stage_id: stageRes.stageId, updated_at: new Date().toISOString() })
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .in('id', idsToMove);

                if (updError) return { error: formatSupabaseFailure(updError) };

                let followUpCreated = 0;
                if (createFollowUpTask) {
                    const maxTasks = Math.min(idsToMove.length, 20);
                    const due = new Date();
                    due.setDate(due.getDate() + (followUpDueInDays || 2));

                    const title = (followUpTitle || 'Follow-up após mudança de estágio').trim();
                    const inserts = idsToMove.slice(0, maxTasks).map((id) => ({
                        organization_id: organizationId,
                        title,
                        description: null,
                        date: due.toISOString(),
                        deal_id: id,
                        type: followUpType,
                        owner_id: userId,
                        completed: false,
                    }));

                    const { error: actError } = await supabase.from('activities').insert(inserts);
                    if (!actError) {
                        followUpCreated = inserts.length;
                    }
                }

                return {
                    success: true,
                    movedCount: idsToMove.length,
                    skippedCount: missingIds.length,
                    followUpCreated,
                    deals: (deals || []).map((d) => ({ id: d.id, title: d.title })),
                    message:
                        `Movi ${idsToMove.length} deal(s) com sucesso.` +
                        (missingIds.length ? ` (${missingIds.length} ignorado(s) por não pertencerem ao board/organização.)` : '') +
                        (followUpCreated ? ` Criei ${followUpCreated} tarefa(s) de follow-up.` : ''),
                };
            },
        }),
    };
}
