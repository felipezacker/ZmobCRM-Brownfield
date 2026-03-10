import type { MessagePart, ToolLikePart } from './types';

export function isToolLikePart(part: MessagePart): part is ToolLikePart {
    const t = part.type;
    return t === 'dynamic-tool' || t === 'tool-invocation' || t.startsWith('tool-');
}

export function humanizeTestLabel(input: unknown): string | undefined {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw) return undefined;

    // Remove sufixos de dados de teste gerados automaticamente (ex.: "next-ai_<uuid>")
    return raw.replace(/\s*next-ai[_-][0-9a-f-]{8,}\s*$/i, '').trim() || undefined;
}
