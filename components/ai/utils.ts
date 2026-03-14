import type { MessagePart, ToolLikePart } from './types';

export function isToolLikePart(part: MessagePart): part is ToolLikePart {
    const t = part.type;
    return t === 'dynamic-tool' || t === 'tool-invocation' || t.startsWith('tool-');
}

/** Safely extract tool metadata from a ToolLikePart without `as any` casting. */
export function getToolPartInfo(part: ToolLikePart): {
    toolName: string;
    state: string;
    output: unknown;
    toolCallId?: string;
} | null {
    const p = part as Record<string, unknown>;
    const toolName = (p.toolName ?? p.name ?? p.toolCallId) as string | undefined;
    const state = p.state as string | undefined;
    if (!toolName || !state) return null;
    return {
        toolName,
        state,
        output: p.output ?? p.result,
        toolCallId: p.toolCallId as string | undefined,
    };
}

export function humanizeTestLabel(input: unknown): string | undefined {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw) return undefined;

    // Remove sufixos de dados de teste gerados automaticamente (ex.: "next-ai_<uuid>")
    return raw.replace(/\s*next-ai[_-][0-9a-f-]{8,}\s*$/i, '').trim() || undefined;
}
