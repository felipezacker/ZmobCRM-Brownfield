import type { UIMessagePart, DynamicToolUIPart, UIDataTypes, UITools } from 'ai';

/** Narrowed part type for tool-related UI parts (both static tool-{name} and dynamic-tool). */
export type ToolLikePart = DynamicToolUIPart & {
    /** Runtime alias used by some tool states */
    args?: unknown;
    /** Runtime output payload for tool results */
    output?: unknown;
};

/** Type alias for a single UIMessagePart used throughout this component. */
export type MessagePart = UIMessagePart<UIDataTypes, UITools>;

/** Shape expected from cockpitSnapshot for title/contact extraction. */
export interface CockpitSnapshotShape {
    deal?: { title?: string };
    contact?: { name?: string };
}

/** Represents the input payload for CRM tool calls (summarizeToolInput). */
export interface ToolInputPayload {
    dealId?: string;
    dealTitle?: string;
    title?: string;
    reason?: string;
    wonValue?: number;
    stageName?: string;
    dueDate?: string;
    [key: string]: unknown;
}

/** Shape of a deal-like object in tool outputs. */
export interface DealRecord {
    id?: string;
    title?: string;
    [key: string]: unknown;
}

/** Shape of tool output containing deals. */
export interface ToolOutputWithDeals {
    deals?: DealRecord[];
    id?: string;
    title?: string;
    [key: string]: unknown;
}

export type ActiveObjectMetadata = {
    boardId?: string;
    boardName?: string;
    dealId?: string;
    contactId?: string;
    stages?: Array<{ id: string; name: string }>;
    dealCount?: number;
    pipelineValue?: number;
    stagnantDeals?: number;
    overdueDeals?: number;
    wonStage?: string;
    lostStage?: string;
};

export interface UIChatProps {
    /** Optional explicit context (overrides provider context) */
    boardId?: string;
    dealId?: string;
    contactId?: string;
    /** Snapshot rico do cockpit (deal/contato/atividades/notas/arquivos/scripts etc.) */
    cockpitSnapshot?: unknown;
    /**
     * Controla de onde vem o contexto:
     * - 'auto' (default): usa props e faz fallback para AIContext (global/board/deal)
     * - 'props-only': usa SOMENTE props (nao le AIContext para montar body.context)
     */
    contextMode?: 'auto' | 'props-only';
    /** Whether to show as a floating widget */
    floating?: boolean;
    /** Starting minimized state (for floating) */
    startMinimized?: boolean;
    /** On close callback (for floating) */
    onClose?: () => void;
}
