import { useMemo } from 'react';
import type { UIMessage } from 'ai';
import type { ToolInputPayload, ToolOutputWithDeals, DealRecord } from '../types';
import { isToolLikePart } from '../utils';

interface UseChatUIParams {
    cockpitDealTitle: string | undefined;
    cockpitContactName: string | undefined;
    context: {
        boardId?: string;
        dealId?: string;
        contactId?: string;
    };
    messages: UIMessage[];
}

export const toolLabelMap: Record<string, string> = {
    moveDeal: 'Mover estagio',
    createDeal: 'Criar novo deal',
    updateDeal: 'Atualizar deal',
    markDealAsWon: 'Marcar deal como ganho',
    markDealAsLost: 'Marcar deal como perdido',
    assignDeal: 'Atribuir deal',
    createTask: 'Criar tarefa',
};

export function formatDateTimePtBr(isoLike: string | Date): string {
    const d = isoLike instanceof Date ? isoLike : new Date(isoLike);
    if (Number.isNaN(d.getTime())) return String(isoLike);

    const ddmm = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d);
    const hhmm = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
    return `${ddmm} as ${hhmm}`;
}

export function getDateBadge(isoLike?: string): { label: string; className: string } | null {
    if (!isoLike) return null;
    const due = new Date(isoLike);
    if (Number.isNaN(due.getTime())) return null;

    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86400000);

    if (diffDays < 0) return { label: 'Atrasada', className: 'bg-[var(--color-error-bg)] text-[var(--color-error-text)] border border-[var(--color-error)]' };
    if (diffDays === 0) return { label: 'Hoje', className: 'bg-muted text-muted-foreground border border-border' };
    if (diffDays === 1) return { label: 'Amanha', className: 'bg-[var(--color-info-bg)] text-[var(--color-info-text)] border border-[var(--color-info)]' };
    return null;
}

export function sanitizeAssistantText(text: string) {
    // Remove UUIDs e trechos comuns do tipo "(ID: <uuid>)" para nao poluir a UI.
    // Mantem o texto humano (titulo/contato/valor) e evita exposicao de identificadores internos.
    let t = text;
    t = t.replace(/\(ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, '');
    t = t.replace(/\bID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '');
    t = t.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '');
    // Nao colapsar quebras de linha (senao markdown de lista vira um paragrafo com "*").
    t = t.replace(/[\t ]{2,}/g, ' ').trim();
    return t;
}

export function useChatUI({
    cockpitDealTitle,
    cockpitContactName,
    context,
    messages,
}: UseChatUIParams) {
    const dealTitleById = useMemo(() => {
        const map = new Map<string, string>();

        const recordDeal = (d: DealRecord | undefined) => {
            if (d?.id && d?.title && !map.has(d.id)) {
                map.set(d.id, d.title);
            }
        };

        for (const m of messages) {
            for (const p of m.parts) {
                if (!isToolLikePart(p)) continue;

                const output = p.output as ToolOutputWithDeals | undefined;
                if (!output) continue;

                if (Array.isArray(output.deals)) {
                    for (const d of output.deals) recordDeal(d);
                }
                // getDealDetails-like
                recordDeal(output);
            }
        }

        return map;
    }, [messages]);

    const homeHint = useMemo(() => {
        const hasDealContext = Boolean(cockpitDealTitle || context.dealId);
        const hasBoardContext = Boolean(context.boardId);

        if (hasDealContext) {
            return {
                subtitle: 'Deal \u2022 Contato \u2022 Atividades \u2022 Notas \u2022 Arquivos \u2022 Scripts',
                quickActions: [
                    {
                        label: '\uD83E\uDDF2 Diagnostico do Deal',
                        prompt:
                            'Faca um diagnostico completo deste deal usando o contexto do cockpit (notas, atividades e arquivos). Liste riscos, proximos passos e um plano de follow-up para 7 dias.',
                    },
                    {
                        label: '\uD83D\uDC49 Proxima acao',
                        prompt:
                            'Qual a proxima melhor acao para avancar este deal agora? Seja especifico e use o historico do cockpit para justificar.',
                    },
                    {
                        label: '\u270D\uFE0F Mensagem WhatsApp',
                        prompt:
                            'Escreva uma mensagem curta de follow-up para WhatsApp para este contato, baseada no estagio atual e no historico do cockpit. Traga 2 variacoes.',
                    },
                    {
                        label: '\u2705 Tarefas da semana',
                        prompt:
                            'Crie 3 tarefas objetivas para avancar este deal nesta semana (com datas sugeridas) e descreva rapidamente o porque de cada uma.',
                    },
                ],
            };
        }

        if (hasBoardContext) {
            return {
                subtitle: 'Pipeline \u2022 Deals \u2022 Contatos \u2022 Tarefas',
                quickActions: [
                    { label: '\uD83D\uDCCA Analisar Pipeline', prompt: 'Analise meu pipeline de vendas' },
                    { label: '\u23F0 Deals Parados', prompt: 'Quais deals estao parados ha mais de 7 dias?' },
                    { label: '\uD83D\uDD0D Buscar', prompt: 'Buscar deals por: ' },
                ],
            };
        }

        return {
            subtitle: 'Deals \u2022 Contatos \u2022 Tarefas',
            quickActions: [
                { label: '\uD83D\uDD0D Buscar deals', prompt: 'Buscar deals por: ' },
                { label: '\uD83D\uDC64 Buscar contatos', prompt: 'Buscar contatos por: ' },
                { label: '\u2705 Proximas tarefas', prompt: 'Quais tarefas eu deveria priorizar hoje?' },
            ],
        };
    }, [cockpitDealTitle, context.boardId, context.dealId]);

    const headerSubtitle = useMemo(() => {
        // No cockpit, priorizar titulo do deal / nome do contato em vez de IDs.
        if (cockpitDealTitle) return `Deal: ${cockpitDealTitle}`;
        if (cockpitContactName) return `Contato: ${cockpitContactName}`;

        if (context.dealId) return `Deal: ${context.dealId.slice(0, 8)}...`;
        if (context.boardId) return `Board: ${context.boardId.slice(0, 8)}...`;
        if (context.contactId) return `Contato: ${context.contactId.slice(0, 8)}...`;
        return 'AI Assistant';
    }, [cockpitContactName, cockpitDealTitle, context.boardId, context.contactId, context.dealId]);

    const summarizeToolInput = (toolName: string, input: ToolInputPayload | undefined): string[] => {
        const lines: string[] = [];

        const dealTitleFromId = (id?: string) => {
            if (!id) return undefined;
            return dealTitleById.get(id);
        };

        switch (toolName) {
            case 'markDealAsLost': {
                const title = input?.dealTitle || dealTitleFromId(input?.dealId);
                if (title) lines.push(`Deal: ${title}`);
                if (input?.reason) lines.push(`Motivo: ${input.reason}`);
                break;
            }
            case 'markDealAsWon': {
                const title = input?.dealTitle || dealTitleFromId(input?.dealId);
                if (title) lines.push(`Deal: ${title}`);
                if (input?.wonValue !== undefined) lines.push(`Valor final: R$ ${Number(input.wonValue).toLocaleString('pt-BR')}`);
                break;
            }
            case 'moveDeal': {
                const title = input?.dealTitle || dealTitleFromId(input?.dealId);
                if (title) lines.push(`Deal: ${title}`);
                if (input?.stageName) lines.push(`Destino: ${input.stageName}`);
                break;
            }
            case 'createTask': {
                if (input?.title) lines.push(`Tarefa: ${input.title}`);
                if (input?.dueDate) lines.push(`Vencimento: ${formatDateTimePtBr(input.dueDate)}`);
                {
                    const title = input?.dealTitle || dealTitleFromId(input?.dealId);
                    if (title) lines.push(`Deal: ${title}`);
                }
                break;
            }
            default: {
                // Fallback: tente ao menos mostrar o titulo do deal, sem expor UUID.
                {
                    const title = input?.dealTitle || dealTitleFromId(input?.dealId);
                    if (title) lines.push(`Deal: ${title}`);
                }
                break;
            }
        }

        return lines.length > 0 ? lines : ['Confirma essa acao?'];
    };

    return {
        dealTitleById,
        homeHint,
        headerSubtitle,
        summarizeToolInput,
    };
}
