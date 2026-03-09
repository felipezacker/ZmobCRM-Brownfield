import { tool } from 'ai';
import { z } from 'zod';
import type { ToolContext } from './types';
import { formatSupabaseFailure, ensureBoardBelongsToOrganization } from './helpers';

export function createPipelineTools({ supabase, organizationId, context, bypassApproval }: ToolContext) {
    return {
        analyzePipeline: tool({
            description: 'Analisa o pipeline de vendas completo com métricas e breakdown por estágio',
            inputSchema: z.object({
                boardId: z.string().optional().describe('ID do board (usa contexto se não fornecido)'),
            }),
            execute: async ({ boardId }) => {
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] 🚀 analyzePipeline EXECUTED!', { targetBoardId });

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado. Vá para um board ou especifique qual.' };
                }

                const { data: deals, error: dealsError } = await supabase
                    .from('deals')
                    .select('id, title, value, is_won, is_lost, stage:board_stages(name, label)')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .is('deleted_at', null);

                if (dealsError) {
                    return { error: formatSupabaseFailure(dealsError) };
                }

                const openDeals = deals?.filter(d => !d.is_won && !d.is_lost) || [];
                const wonDeals = deals?.filter(d => d.is_won) || [];
                const lostDeals = deals?.filter(d => d.is_lost) || [];

                const totalValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                const winRate = wonDeals.length + lostDeals.length > 0
                    ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100)
                    : 0;

                const stageMap = new Map<string, { count: number; value: number }>();
                openDeals.forEach((deal) => {
                    const stageInfo = deal.stage as { name?: string; label?: string } | null;
                    const stageName = stageInfo?.name || stageInfo?.label || 'Sem estágio';
                    const existing = stageMap.get(stageName) || { count: 0, value: 0 };
                    stageMap.set(stageName, {
                        count: existing.count + 1,
                        value: existing.value + (deal.value || 0)
                    });
                });

                return {
                    totalDeals: deals?.length || 0,
                    openDeals: openDeals.length,
                    wonDeals: wonDeals.length,
                    lostDeals: lostDeals.length,
                    winRate: `${winRate}%`,
                    pipelineValue: `R$ ${totalValue.toLocaleString('pt-BR')}`,
                    wonValue: `R$ ${wonValue.toLocaleString('pt-BR')}`,
                    stageBreakdown: Object.fromEntries(stageMap)
                };
            },
        }),

        getBoardMetrics: tool({
            description: 'Calcula métricas e KPIs do board: Win Rate, Total Pipeline, contagem de deals',
            inputSchema: z.object({
                boardId: z.string().optional(),
            }),
            execute: async ({ boardId }) => {
                const targetBoardId = boardId || context.boardId;
                console.log('[AI] 📊 getBoardMetrics EXECUTED!');

                if (!targetBoardId) {
                    return { error: 'Nenhum board selecionado.' };
                }

                const { data: deals, error: dealsError } = await supabase
                    .from('deals')
                    .select('id, value, is_won, is_lost, created_at')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .is('deleted_at', null);

                if (dealsError) {
                    return { error: formatSupabaseFailure(dealsError) };
                }

                const total = deals?.length || 0;
                const won = deals?.filter(d => d.is_won) || [];
                const lost = deals?.filter(d => d.is_lost) || [];
                const open = deals?.filter(d => !d.is_won && !d.is_lost) || [];

                const winRate = won.length + lost.length > 0
                    ? Math.round(won.length / (won.length + lost.length) * 100)
                    : 0;

                return {
                    totalDeals: total,
                    openDeals: open.length,
                    wonDeals: won.length,
                    lostDeals: lost.length,
                    winRate: `${winRate}%`,
                    pipelineValue: `R$ ${open.reduce((s, d) => s + (d.value || 0), 0).toLocaleString('pt-BR')}`,
                    closedValue: `R$ ${won.reduce((s, d) => s + (d.value || 0), 0).toLocaleString('pt-BR')}`
                };
            },
        }),

        listStages: tool({
            description: 'Lista estágios de um board (colunas).',
            inputSchema: z.object({
                boardId: z.string().optional(),
            }),
            execute: async ({ boardId }) => {
                const targetBoardId = boardId || context.boardId;
                if (!targetBoardId) return { error: 'Nenhum board selecionado.' };
                const guard = await ensureBoardBelongsToOrganization(supabase, organizationId, targetBoardId);
                if (!guard.ok) return { error: guard.error };

                const { data, error } = await supabase
                    .from('board_stages')
                    .select('id, name, label, color, order, is_default')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .order('order', { ascending: true });

                if (error) return { error: formatSupabaseFailure(error) };
                return { count: data?.length || 0, stages: data || [] };
            },
        }),

        updateStage: tool({
            description: 'Atualiza um estágio (nome/label/cor/ordem). Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                stageId: z.string(),
                name: z.string().optional(),
                label: z.string().optional(),
                color: z.string().optional(),
                order: z.number().int().optional(),
                isDefault: z.boolean().optional(),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ stageId, name, label, color, order, isDefault }) => {
                const updateData: Record<string, unknown> = {};
                if (name !== undefined) updateData.name = name;
                if (label !== undefined) updateData.label = label;
                if (color !== undefined) updateData.color = color;
                if (order !== undefined) updateData.order = order;
                if (isDefault !== undefined) updateData.is_default = isDefault;

                const { data, error } = await supabase
                    .from('board_stages')
                    .update(updateData)
                    .eq('organization_id', organizationId)
                    .eq('id', stageId)
                    .select('id, name, label, color, order, is_default')
                    .maybeSingle();

                if (error) return { error: formatSupabaseFailure(error) };
                if (!data) return { error: 'Estágio não encontrado nesta organização.' };
                return { success: true, stage: data, message: `Estágio atualizado: ${data.name}` };
            },
        }),

        reorderStages: tool({
            description: 'Reordena os estágios de um board. Requer aprovação no card (Aprovar/Negar) — não peça confirmação em texto.',
            inputSchema: z.object({
                boardId: z.string().optional(),
                orderedStageIds: z.array(z.string()).min(2),
            }),
            needsApproval: !bypassApproval,
            execute: async ({ boardId, orderedStageIds }) => {
                const targetBoardId = boardId || context.boardId;
                if (!targetBoardId) return { error: 'Nenhum board selecionado.' };
                const guard = await ensureBoardBelongsToOrganization(supabase, organizationId, targetBoardId);
                if (!guard.ok) return { error: guard.error };

                const { data: stages, error: stError } = await supabase
                    .from('board_stages')
                    .select('id')
                    .eq('organization_id', organizationId)
                    .eq('board_id', targetBoardId)
                    .in('id', orderedStageIds);

                if (stError) return { error: formatSupabaseFailure(stError) };
                const found = new Set((stages || []).map((s: { id: string }) => s.id));
                const missing = orderedStageIds.filter((id) => !found.has(id));
                if (missing.length) return { error: 'Alguns estágios não pertencem a este board/organização.' };

                for (let i = 0; i < orderedStageIds.length; i++) {
                    const id = orderedStageIds[i];
                    const { error } = await supabase
                        .from('board_stages')
                        .update({ order: i })
                        .eq('organization_id', organizationId)
                        .eq('board_id', targetBoardId)
                        .eq('id', id);
                    if (error) return { error: formatSupabaseFailure(error) };
                }

                return { success: true, message: `Reordenei ${orderedStageIds.length} estágio(s).` };
            },
        }),
    };
}
