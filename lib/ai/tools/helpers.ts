import type { SupabaseClient } from '@supabase/supabase-js';
import type { BoardGuardResult, DealGuardResult, StageResolveResult } from './types';

/**
 * Strips PostgREST special characters from user input before interpolation
 * into `.or()` filter strings to prevent filter injection.
 */
export function sanitizeFilterValue(value: string): string {
    // Remove PostgREST filter metacharacters: comma (separates filters),
    // parentheses (grouping), backslash (escape). Dots and @ are kept
    // because they appear in emails and domain names used as search terms.
    return value.replace(/[,()\\]/g, '');
}

export function formatSupabaseFailure(error: any): string {
    const msg = (error?.message || error?.error_description || String(error || '')).trim();
    const normalized = msg.toLowerCase();

    const looksLikeAuth =
        normalized.includes('jwt') ||
        normalized.includes('invalid api key') ||
        normalized.includes('apikey') ||
        normalized.includes('permission denied') ||
        normalized.includes('unauthorized') ||
        normalized.includes('forbidden');

    const hint = looksLikeAuth
        ? ' Dica: verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada e corresponde ao mesmo projeto do `NEXT_PUBLIC_SUPABASE_URL`.'
        : '';

    return `Falha ao consultar o Supabase. ${msg || 'Erro desconhecido.'}${hint}`;
}

export async function ensureBoardBelongsToOrganization(
    supabase: SupabaseClient,
    organizationId: string,
    boardId: string
): Promise<BoardGuardResult> {
    const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('id', boardId)
        .maybeSingle();

    if (boardError) {
        return { ok: false, error: formatSupabaseFailure(boardError) };
    }

    if (!board) {
        return {
            ok: false,
            error:
                'O board selecionado não pertence à sua organização no backend da IA. Se você acabou de trocar de organização/board, recarregue a página. Se persistir, verifique se a IA está apontando para o mesmo projeto Supabase do app.'
        };
    }

    return { ok: true };
}

export async function ensureDealBelongsToOrganization(
    supabase: SupabaseClient,
    organizationId: string,
    dealId: string
): Promise<DealGuardResult> {
    const { data: deal, error: dealError } = await supabase
        .from('deals')
        .select('id, title, board_id, stage_id, contact_id')
        .eq('organization_id', organizationId)
        .eq('id', dealId)
        .maybeSingle();

    if (dealError) {
        return { ok: false, error: formatSupabaseFailure(dealError) };
    }

    if (!deal) {
        return { ok: false, error: 'Deal não encontrado nesta organização.' };
    }

    return { ok: true, deal };
}

export async function resolveStageIdForBoard(
    supabase: SupabaseClient,
    organizationId: string,
    params: { boardId: string; stageId?: string; stageName?: string }
): Promise<StageResolveResult> {
    if (params.stageId) return { ok: true, stageId: params.stageId };

    const stageName = (params.stageName || '').trim();
    if (!stageName) {
        return { ok: false, error: 'Especifique o estágio destino.' };
    }

    const lowered = stageName.toLowerCase();
    if (/(primeiro|in[íi]cio|inicial)/.test(lowered)) {
        const { data: first, error } = await supabase
            .from('board_stages')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('board_id', params.boardId)
            .order('order', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (error) return { ok: false, error: formatSupabaseFailure(error) };
        if (!first?.id) return { ok: false, error: 'Board não tem estágios configurados.' };
        return { ok: true, stageId: first.id };
    }

    if (/(u[úu]ltimo|final)/.test(lowered)) {
        const { data: last, error } = await supabase
            .from('board_stages')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('board_id', params.boardId)
            .order('order', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) return { ok: false, error: formatSupabaseFailure(error) };
        if (!last?.id) return { ok: false, error: 'Board não tem estágios configurados.' };
        return { ok: true, stageId: last.id };
    }

    const { data: stages, error } = await supabase
        .from('board_stages')
        .select('id, name, label')
        .eq('organization_id', organizationId)
        .eq('board_id', params.boardId)
        .or(`name.ilike.%${sanitizeFilterValue(stageName)}%,label.ilike.%${sanitizeFilterValue(stageName)}%`)
        .limit(5);

    if (error) return { ok: false, error: formatSupabaseFailure(error) };
    if (!stages || stages.length === 0) {
        const { data: allStages } = await supabase
            .from('board_stages')
            .select('name, label')
            .eq('organization_id', organizationId)
            .eq('board_id', params.boardId);

        const stageNames = allStages?.map((s) => s.name || s.label).filter(Boolean).join(', ') || 'nenhum';
        return { ok: false, error: `Estágio "${stageName}" não encontrado. Estágios disponíveis: ${stageNames}` };
    }

    if (stages.length > 1) {
        const opts = stages.map((s) => s.name || s.label || s.id).join(', ');
        return { ok: false, error: `Estágio "${stageName}" está ambíguo. Possíveis: ${opts}` };
    }

    return { ok: true, stageId: stages[0].id };
}
