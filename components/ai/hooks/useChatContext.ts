import { useMemo } from 'react';
import { DefaultChatTransport } from 'ai';
import { useAI } from '@/context/AIContext';
import type { ActiveObjectMetadata, CockpitSnapshotShape } from '../types';
import { humanizeTestLabel } from '../utils';

interface UseChatContextParams {
    boardId?: string;
    dealId?: string;
    contactId?: string;
    cockpitSnapshot?: unknown;
    contextMode: 'auto' | 'props-only';
}

export function useChatContext({
    boardId,
    dealId,
    contactId,
    cockpitSnapshot,
    contextMode,
}: UseChatContextParams) {
    const { activeContext } = useAI();

    const cockpitDealTitle = useMemo(() => {
        const s = cockpitSnapshot as CockpitSnapshotShape | null | undefined;
        const title = s?.deal?.title;
        return humanizeTestLabel(title) ?? (typeof title === 'string' && title.trim() ? title.trim() : undefined);
    }, [cockpitSnapshot]);

    const cockpitContactName = useMemo(() => {
        const s = cockpitSnapshot as CockpitSnapshotShape | null | undefined;
        const name = s?.contact?.name;
        return humanizeTestLabel(name) ?? (typeof name === 'string' && name.trim() ? name.trim() : undefined);
    }, [cockpitSnapshot]);

    // Extract FULL context from AIContext for AI SDK v6 (somente quando permitido)
    const metadata = (contextMode === 'auto'
        ? (activeContext?.activeObject?.metadata as ActiveObjectMetadata | undefined)
        : undefined);

    // Build rich context with all available info
    const context = useMemo(() => ({
        // Core IDs
        boardId: boardId ?? metadata?.boardId,
        dealId: dealId ?? metadata?.dealId,
        contactId: contactId ?? metadata?.contactId,

        // Cockpit snapshot (quando fornecido via props)
        cockpitSnapshot,

        // Board Context
        boardName:
            contextMode === 'auto'
                ? ((activeContext?.activeObject?.type === 'board'
                    ? activeContext?.activeObject?.name
                    : metadata?.boardName) ?? undefined)
                : undefined,
        stages: metadata?.stages,

        // Metrics
        dealCount: metadata?.dealCount,
        pipelineValue: metadata?.pipelineValue,
        stagnantDeals: metadata?.stagnantDeals,
        overdueDeals: metadata?.overdueDeals,

        // Board Config
        wonStage: metadata?.wonStage,
        lostStage: metadata?.lostStage,
    }), [
        boardId, dealId, contactId,
        cockpitSnapshot,
        contextMode,
        metadata?.boardId, metadata?.dealId, metadata?.contactId,
        activeContext?.activeObject?.type,
        activeContext?.activeObject?.name,
        metadata?.boardName,
        metadata?.stages, metadata?.dealCount, metadata?.pipelineValue,
        metadata?.stagnantDeals, metadata?.overdueDeals,
        metadata?.wonStage, metadata?.lostStage
    ]);

    // Dev-only: ajuda a inspecionar o contexto real enviado ao backend.
    if (process.env.NODE_ENV === 'development') {
        console.log('[UIChat Debug] Context ready (will be sent in POST /api/ai/chat body.context):', {
            id: `chat-${context.boardId || context.dealId || 'global'}`,
            context,
        });
    }

    // Use transport with dynamic body function + maxSteps for approval flow
    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/api/ai/chat',
                body: { context },
            }),
        [context]
    );

    return {
        context,
        transport,
        cockpitDealTitle,
        cockpitContactName,
    };
}
