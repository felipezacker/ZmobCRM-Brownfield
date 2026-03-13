'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, User, Sparkles, Wrench, X, MessageCircle, Minimize2, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { MODAL_OVERLAY_CLASS } from '@/components/ui/modalStyles';

import type { ToolLikePart, ToolInputPayload } from './types';
export type { UIChatProps } from './types';
import type { UIChatProps } from './types';
import { isToolLikePart } from './utils';
import { useChatContext } from './hooks/useChatContext';
import { useChatApprovals } from './hooks/useChatApprovals';
import { useChatErrors } from './hooks/useChatErrors';
import { useChatUI, toolLabelMap, formatDateTimePtBr, getDateBadge, sanitizeAssistantText } from './hooks/useChatUI';

// Lazy load react-markdown para reduzir bundle inicial em ~35KB
// O chat geralmente inicia minimizado (startMinimized={true}), então o markdown
// só é carregado quando o usuário abre o chat e há mensagens para renderizar
const ReactMarkdown = dynamic(() => import('react-markdown'), {
    ssr: false,
    loading: () => <span className="animate-pulse text-muted-foreground">...</span>
});

/**
 * UI Chat Component using AI SDK UI
 * Uses Route Handler at /api/ai/chat with streaming and context support
 * Reads context from AIContext (set by pages like Boards)
 */
export function UIChat({
    boardId,
    dealId,
    contactId,
    cockpitSnapshot,
    contextMode = 'auto',
    floating = false,
    startMinimized = true,
    onClose
}: UIChatProps) {
    const [isOpen, setIsOpen] = useState(!startMinimized);
    const [isExpanded, setIsExpanded] = useState(false);
    const [input, setInput] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Extracted hooks ---
    const { context, transport, cockpitDealTitle, cockpitContactName } = useChatContext({
        boardId,
        dealId,
        contactId,
        cockpitSnapshot,
        contextMode,
    });

    const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat({
        transport,
        // Re-submete automaticamente quando o usuário aprova/nega uma tool.
        // Sem isso, o clique só atualiza o estado local e a execução pode "parar".
        sendAutomaticallyWhen: ({ messages }) => {
            // Importante: se houver múltiplas aprovações pendentes no mesmo "step" (ex.: mover vários deals),
            // não podemos re-submeter após a PRIMEIRA resposta, senão o backend tenta continuar com tool-calls
            // ainda sem tool-result, gerando erros e executando apenas parte das ações.

            let hasResponded = false;
            let hasPending = false;

            for (const m of messages) {
                if (m.role !== 'assistant') continue;
                for (const part of m.parts ?? []) {
                    if (!isToolLikePart(part)) continue;

                    if (part.state === 'approval-responded') {
                        hasResponded = true;
                    }
                    if (part.state === 'approval-requested' && part.approval?.approved == null) {
                        hasPending = true;
                    }
                }
            }

            return hasResponded && !hasPending;
        },
        // @ts-expect-error - maxSteps is required for approval flow; types may be outdated
        maxSteps: 10,
    });

    const {
        expandedApprovalGroups,
        setExpandedApprovalGroups,
        selectedApprovalsById,
        setSelectedApprovalsById,
        selectionModeByGroup,
        setSelectionModeByGroup,
        pendingApprovalIds,
        hasPendingApprovals,
    } = useChatApprovals(messages);

    const friendlyError = useChatErrors(error);

    const {
        homeHint,
        headerSubtitle,
        summarizeToolInput,
    } = useChatUI({
        cockpitDealTitle,
        cockpitContactName,
        context,
        messages,
    });

    // --- Local helpers ---
    const isLoading = status === 'streaming' || status === 'submitted';
    const canSend = status === 'ready' && !hasPendingApprovals;

    const focusInput = useCallback(() => {
        const el = inputRef.current;
        if (!el) return;
        try {
            el.focus({ preventScroll: true });
        } catch {
            // Fallback para browsers que não suportam FocusOptions
            el.focus();
        }
    }, []);

    // Auto-scroll to bottom (somente dentro do container de mensagens)
    useEffect(() => {
        // Evita "pular"/rolar o painel ao abrir o chat (quando ainda não há mensagens)
        if (messages.length === 0) return;

        const el = messagesContainerRef.current;
        if (!el) return;

        try {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } catch {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages.length]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            focusInput();
        }
    }, [isOpen, focusInput]);

    // DEBUG: Log status changes
    useEffect(() => {
        console.log('[UIChat] Status:', status, 'Error:', error);
    }, [status, error]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[UIChat] Submit attempt:', { input, status, canSend });
        if (!canSend) return;
        if (input.trim()) {
            sendMessage({ text: input });
            setInput('');
        }
    };

    // Floating minimized button
    if (floating && !isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-linear-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 text-white rounded-full shadow-lg shadow-primary-500/25 transition-all hover:scale-105"
            >
                <MessageCircle className="w-6 h-6" />
            </Button>
        );
    }

    // Chat content as JSX (not a component function to preserve input state)
    const chatContent = (
        <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
                <div className="p-2 bg-linear-to-br from-primary-500/20 to-violet-500/20 rounded-xl">
                    <Sparkles className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground">ZmobCRM Pilot</h2>
                    <p className="text-xs text-muted-foreground truncate">
                        {headerSubtitle}
                    </p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${status === 'ready'
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success-text)]'
                    : 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)]'
                    }`}>
                    {status === 'ready' ? 'Pronto' : 'Pensando...'}
                </div>
                {floating && (
                    <div className="flex gap-1">
                        <Button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 hover:bg-muted rounded-lg transition-colors"
                            title={isExpanded ? 'Reduzir' : 'Expandir'}
                        >
                            <Maximize2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-muted rounded-lg transition-colors"
                            title="Minimizar"
                        >
                            <Minimize2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {onClose && (
                            <Button
                                onClick={onClose}
                                className="p-1 hover:bg-muted rounded-lg transition-colors"
                                title="Fechar"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="p-3 bg-linear-to-br from-primary-500/20 to-violet-500/20 rounded-2xl">
                            <Bot className="w-10 h-10 text-primary-400" />
                        </div>
                        <div>
                            <p className="text-foreground mb-1">Como posso ajudar?</p>
                            <p className="text-muted-foreground text-xs">
                                {homeHint.subtitle}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {homeHint.quickActions.map((action) => (
                                <Button
                                    key={action.label}
                                    onClick={() => {
                                        setInput(action.prompt);
                                        focusInput();
                                    }}
                                    className="px-3 py-1.5 bg-muted hover:bg-accent border border-border rounded-lg text-xs text-foreground transition-all"
                                >
                                    {action.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => {
                    const messageParts = message.parts ?? [];

                    // Agrupa múltiplos pedidos de aprovação do mesmo tool numa única confirmação.
                    const getPartToolName = (p: ToolLikePart | { type: string }) => {
                        if (!isToolLikePart(p as ToolLikePart)) return undefined;
                        const tp = p as ToolLikePart;
                        const partType = tp.type;
                        return tp.toolName || (partType.startsWith('tool-') ? partType.replace('tool-', '') : undefined);
                    };

                    const approvalParts = messageParts.filter((p): p is ToolLikePart => {
                        if (!isToolLikePart(p)) return false;
                        return p.state === 'approval-requested';
                    });

                    const approvalsByTool = new Map<string, ToolLikePart[]>();
                    for (const p of approvalParts) {
                        const name = getPartToolName(p) || 'ferramenta';
                        const arr = approvalsByTool.get(name) ?? [];
                        arr.push(p);
                        approvalsByTool.set(name, arr);
                    }

                    const groupedApprovals = Array.from(approvalsByTool.entries())
                        .filter(([, items]) => items.length > 1)
                        .map(([toolName, items]) => ({ toolName, items }));

                    const groupedToolCounts: Record<string, number> = {};
                    for (const { toolName, items } of groupedApprovals) {
                        groupedToolCounts[toolName] = items.length;
                    }

                    // Mini bug comum: às vezes o backend envia uma mensagem do assistente apenas com parts
                    // de tools "silenciosas" (sem necessidade de aprovação) e sem texto.
                    const hasVisibleText = messageParts.some((p) => {
                        if (p.type !== 'text') return false;
                        const raw = String(p.text ?? '').trim();
                        if (!raw) return false;
                        return message.role === 'assistant' ? sanitizeAssistantText(raw).trim().length > 0 : true;
                    });

                    const ungroupedApprovalsCount = approvalParts.filter((p) => {
                        const name = getPartToolName(p) || 'ferramenta';
                        return (groupedToolCounts[name] ?? 0) <= 1;
                    }).length;

                    const hasVisibleApprovals = groupedApprovals.length > 0 || ungroupedApprovalsCount > 0;

                    if (message.role === 'assistant' && !hasVisibleText && !hasVisibleApprovals) {
                        return null;
                    }

                    return (
                        <div
                            key={message.id}
                            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {message.role === 'assistant' && (
                                <div className="shrink-0 w-7 h-7 rounded-full bg-linear-to-br from-primary-500 to-violet-500 flex items-center justify-center">
                                    <Bot className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                            <div className={`max-w-[85%] ${message.role === 'user'
                                ? 'bg-primary-600 text-white rounded-2xl rounded-tr-md'
                                : 'bg-muted text-foreground rounded-2xl rounded-tl-md border border-border'
                                } px-3 py-2`}>

                                {groupedApprovals.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {groupedApprovals.map(({ toolName, items }) => {
                                            const toolTitle = toolLabelMap[toolName] || toolName;
                                            const groupKey = `${message.id}:${toolName}`;
                                            const expanded = !!expandedApprovalGroups[groupKey];
                                            const selectionMode = !!selectionModeByGroup[groupKey];

                                            const getApprovalId = (toolPart: ToolLikePart) => toolPart.approval?.id || toolPart.toolCallId;

                                            const parsedItems = items
                                                .map((toolPart) => {
                                                    const toolInput = (toolPart.input ?? toolPart.args) as ToolInputPayload | undefined;
                                                    const lines = summarizeToolInput(toolName, toolInput);
                                                    const dealLine = lines.find((l) => l.startsWith('Deal: '));
                                                    const dealTitle = dealLine ? dealLine.replace(/^Deal:\s*/, '') : (toolInput?.dealTitle || undefined);
                                                    const dueDate = toolInput?.dueDate as string | undefined;

                                                    const detailLines = lines
                                                        .filter((l) => !l.startsWith('Deal: '))
                                                        // se tiver vencimento, vamos mostrar de forma humanizada fora da lista
                                                        .filter((l) => !l.startsWith('Vencimento: '));

                                                    const main =
                                                        detailLines.find((l) => l.startsWith('Tarefa: '))?.replace(/^Tarefa:\s*/, '') ||
                                                        detailLines.find((l) => l.startsWith('Destino: '))?.replace(/^Destino:\s*/, 'Destino: ') ||
                                                        detailLines.find((l) => l.startsWith('Motivo: '))?.replace(/^Motivo:\s*/, 'Motivo: ') ||
                                                        detailLines.find((l) => l.startsWith('Valor final: '))?.replace(/^Valor final:\s*/, 'Valor final: ') ||
                                                        detailLines[0] ||
                                                        'Confirma essa ação?';

                                                    return {
                                                        toolPart,
                                                        id: getApprovalId(toolPart),
                                                        toolInput,
                                                        dealTitle: dealTitle || 'Sem deal',
                                                        dueDate,
                                                        main,
                                                        extra: detailLines.slice(1),
                                                    };
                                                })
                                                .filter((x) => !!x.id);

                                            const uniqueDeals = new Set(parsedItems.map((p) => p.dealTitle));
                                            const dueDates = parsedItems
                                                .map((p) => (p.dueDate ? new Date(p.dueDate) : null))
                                                .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()))
                                                .sort((a, b) => a.getTime() - b.getTime());

                                            const earliestDue = dueDates[0];
                                            const latestDue = dueDates[dueDates.length - 1];
                                            const dueSummary = (() => {
                                                if (!earliestDue) return null;
                                                const earliestStr = formatDateTimePtBr(earliestDue);
                                                if (latestDue && latestDue.getTime() !== earliestDue.getTime()) {
                                                    const latestStr = formatDateTimePtBr(latestDue);
                                                    return `Vencimentos: ${earliestStr} → ${latestStr}`;
                                                }
                                                return `Vencimento: ${formatDateTimePtBr(earliestDue)}`;
                                            })();

                                            const selectedCount = parsedItems.reduce((acc, p) => acc + ((selectedApprovalsById[p.id] ?? true) ? 1 : 0), 0);
                                            const hasPartialSelection = selectedCount > 0 && selectedCount < parsedItems.length;

                                            const setAllSelection = (value: boolean) => {
                                                setSelectedApprovalsById((prev) => {
                                                    const next = { ...prev };
                                                    for (const p of parsedItems) next[p.id] = value;
                                                    return next;
                                                });
                                            };

                                            const ensureDefaultSelection = () => {
                                                setSelectedApprovalsById((prev) => {
                                                    let changed = false;
                                                    const next = { ...prev };
                                                    for (const p of parsedItems) {
                                                        if (next[p.id] === undefined) {
                                                            next[p.id] = true;
                                                            changed = true;
                                                        }
                                                    }
                                                    return changed ? next : prev;
                                                });
                                            };

                                            const approveItems = (ids: string[], approved: boolean) => {
                                                for (const id of ids) {
                                                    addToolApprovalResponse?.({ id, approved });
                                                }
                                            };

                                            const approveAllIds = parsedItems.map((p) => p.id);
                                            const selectedIds = parsedItems.filter((p) => (selectedApprovalsById[p.id] ?? true)).map((p) => p.id);

                                            const groupedByDeal = (() => {
                                                const map = new Map<string, typeof parsedItems>();
                                                for (const p of parsedItems) {
                                                    const arr = map.get(p.dealTitle) ?? [];
                                                    arr.push(p);
                                                    map.set(p.dealTitle, arr);
                                                }
                                                return Array.from(map.entries());
                                            })();

                                            // Se todas as ações têm o mesmo "main" (ex.: moveDeal com o mesmo destino),
                                            // mostramos esse detalhe uma vez só e listamos apenas os deals.
                                            const commonMain = (() => {
                                                if (parsedItems.length === 0) return null;
                                                const first = parsedItems[0].main;
                                                const allSame = parsedItems.every((p) => p.main === first);
                                                return allSame ? first : null;
                                            })();

                                            const headerTitle = (() => {
                                                if (toolName === 'moveDeal' && commonMain?.startsWith('Destino: ')) {
                                                    const dest = commonMain.replace(/^Destino:\s*/, '').trim();
                                                    return `Mover → ${dest}`;
                                                }
                                                return toolTitle;
                                            })();

                                            return (
                                                <div key={toolName} className="p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning)] rounded-xl">
                                                    <div className="flex items-start gap-2">
                                                        <Wrench className="w-4 h-4 shrink-0 text-[var(--color-warning-text)]" />
                                                        <div className="min-w-0 flex-1">
                                                            {/* Linha 1: só o título (não compete com detalhes) */}
                                                            <div className="flex items-baseline gap-2 min-w-0">
                                                                <div className="text-sm font-semibold text-foreground whitespace-normal leading-snug">
                                                                    {headerTitle}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground shrink-0">({parsedItems.length}x)</span>
                                                            </div>

                                                            {/* Linha 2: contexto + botão */}
                                                            <div className="mt-1 flex items-start justify-between gap-3">
                                                                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 min-w-0">
                                                                    <span>{uniqueDeals.size} deal{uniqueDeals.size === 1 ? '' : 's'}</span>
                                                                    {dueSummary && (
                                                                        <>
                                                                            <span className="opacity-60">•</span>
                                                                            <span>{dueSummary}</span>
                                                                        </>
                                                                    )}
                                                                    {/* Se o parâmetro principal não foi promovido pro título, mostramos como detalhe */}
                                                                    {commonMain && headerTitle === toolTitle && (
                                                                        <>
                                                                            <span className="opacity-60">•</span>
                                                                            <span className="text-foreground">{commonMain}</span>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setExpandedApprovalGroups((prev) => ({ ...prev, [groupKey]: !expanded }));
                                                                        if (!expanded) ensureDefaultSelection();
                                                                    }}
                                                                    className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-[var(--color-warning-bg)] transition-colors whitespace-nowrap"
                                                                    title={expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                                                                >
                                                                    {expanded ? (
                                                                        <>
                                                                            Ocultar <ChevronUp className="w-4 h-4" />
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            Detalhes <ChevronDown className="w-4 h-4" />
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {expanded && (
                                                        <div className="mt-3">
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <div className="text-xs text-muted-foreground">
                                                                    {selectionMode ? `Selecionadas: ${selectedCount}/${parsedItems.length}` : 'Detalhes'}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {!selectionMode ? (
                                                                        <Button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                ensureDefaultSelection();
                                                                                setSelectionModeByGroup((prev) => ({ ...prev, [groupKey]: true }));
                                                                            }}
                                                                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                                                        >
                                                                            Selecionar
                                                                        </Button>
                                                                    ) : (
                                                                        <>
                                                                            <Button
                                                                                type="button"
                                                                                onClick={() => setAllSelection(true)}
                                                                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                                                            >
                                                                                Selecionar todas
                                                                            </Button>
                                                                            <span className="text-muted-foreground/40">·</span>
                                                                            <Button
                                                                                type="button"
                                                                                onClick={() => setAllSelection(false)}
                                                                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                                                            >
                                                                                Limpar
                                                                            </Button>
                                                                            <span className="text-muted-foreground/40">·</span>
                                                                            <Button
                                                                                type="button"
                                                                                onClick={() => setSelectionModeByGroup((prev) => ({ ...prev, [groupKey]: false }))}
                                                                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                                                            >
                                                                                Concluir
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 max-h-90 overflow-auto pr-1">
                                                                {groupedByDeal.map(([dealTitle, dealItems]) => (
                                                                    <div key={dealTitle} className="rounded-lg border border-border bg-muted/30">
                                                                        <div className="px-3 py-2 border-b border-border">
                                                                            <div className="text-xs font-semibold text-foreground truncate">{dealTitle}</div>
                                                                        </div>
                                                                        {!(commonMain && !selectionMode && dealItems.length === 1 && dealItems[0].extra.length === 0 && !dealItems[0].dueDate) && (
                                                                            <div className="px-2 py-2 space-y-1">
                                                                                {dealItems.map((p) => {
                                                                                    const checked = selectedApprovalsById[p.id] ?? true;
                                                                                    const dueBadge = getDateBadge(p.dueDate);
                                                                                    const dueText = p.dueDate ? formatDateTimePtBr(p.dueDate) : null;

                                                                                    const lineMain = commonMain
                                                                                        ? (selectionMode ? commonMain : '')
                                                                                        : p.main;

                                                                                    if (!selectionMode) {
                                                                                        return (
                                                                                            <div key={p.id} className="px-2 py-2 rounded-md">
                                                                                                <div className="flex items-start justify-between gap-2">
                                                                                                    {lineMain ? (
                                                                                                        <div className="text-sm text-foreground leading-snug truncate">
                                                                                                            {lineMain}
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <div className="text-xs text-muted-foreground">
                                                                                                            Incluído
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {(dueBadge || dueText) && (
                                                                                                        <div className="shrink-0 flex items-center gap-2">
                                                                                                            {dueBadge && (
                                                                                                                <span className={`px-2 py-0.5 rounded-full text-xxs ${dueBadge.className}`}>
                                                                                                                    {dueBadge.label}
                                                                                                                </span>
                                                                                                            )}
                                                                                                            {dueText && (
                                                                                                                <span className="text-xxs text-muted-foreground whitespace-nowrap">
                                                                                                                    {dueText}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                {p.extra.length > 0 && (
                                                                                                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                                                                                        {p.extra.map((l, idx) => (
                                                                                                            <div key={idx} className="leading-snug">{l}</div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    }

                                                                                    return (
                                                                                        <label
                                                                                            key={p.id}
                                                                                            className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent cursor-pointer"
                                                                                        >
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                className="mt-0.5"
                                                                                                checked={checked}
                                                                                                onChange={(e) => {
                                                                                                    const value = e.target.checked;
                                                                                                    setSelectedApprovalsById((prev) => ({ ...prev, [p.id]: value }));
                                                                                                }}
                                                                                                aria-label="Selecionar ação"
                                                                                            />
                                                                                            <div className="min-w-0 flex-1">
                                                                                                <div className="flex items-start justify-between gap-2">
                                                                                                    <div className="text-sm text-foreground leading-snug truncate">
                                                                                                        {lineMain || 'Incluído'}
                                                                                                    </div>
                                                                                                    {(dueBadge || dueText) && (
                                                                                                        <div className="shrink-0 flex items-center gap-2">
                                                                                                            {dueBadge && (
                                                                                                                <span className={`px-2 py-0.5 rounded-full text-xxs ${dueBadge.className}`}>
                                                                                                                    {dueBadge.label}
                                                                                                                </span>
                                                                                                            )}
                                                                                                            {dueText && (
                                                                                                                <span className="text-xxs text-muted-foreground whitespace-nowrap">
                                                                                                                    {dueText}
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>

                                                                                                {p.extra.length > 0 && (
                                                                                                    <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                                                                                                        {p.extra.map((l, idx) => (
                                                                                                            <div key={idx} className="leading-snug">{l}</div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <Button
                                                            onClick={() => approveItems(approveAllIds, true)}
                                                            className="px-3 py-2 bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-white text-xs rounded-lg transition-all"
                                                        >
                                                            ✓ Aprovar tudo
                                                        </Button>
                                                        <Button
                                                            onClick={() => approveItems(approveAllIds, false)}
                                                            className="px-3 py-2 bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] text-white text-xs rounded-lg transition-all"
                                                        >
                                                            ✗ Negar tudo
                                                        </Button>

                                                        {expanded && selectionMode && hasPartialSelection && (
                                                            <>
                                                                <Button
                                                                    onClick={() => approveItems(selectedIds, true)}
                                                                    className="px-3 py-2 text-xs rounded-lg transition-all border border-[var(--color-warning)] text-[var(--color-warning-text)] hover:bg-[var(--color-warning-bg)]"
                                                                >
                                                                    Aprovar selecionadas
                                                                </Button>
                                                                <Button
                                                                    onClick={() => approveItems(selectedIds, false)}
                                                                    className="px-3 py-2 text-xs rounded-lg transition-all border border-[var(--color-warning)] text-[var(--color-warning-text)] hover:bg-[var(--color-warning-bg)]"
                                                                >
                                                                    Negar selecionadas
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {messageParts.map((part, index) => {
                                    if (part.type === 'text') {
                                        const text = message.role === 'assistant'
                                            ? sanitizeAssistantText(part.text)
                                            : part.text;

                                        // Markdown só para o assistente (melhora leitura: listas, negrito, etc.).
                                        if (message.role === 'assistant') {
                                            return (
                                                <div key={index} className="text-sm leading-relaxed">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: (props) => <p className="m-0 whitespace-pre-wrap" {...props} />,
                                                            strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
                                                            em: (props) => <em className="italic" {...props} />,
                                                            ul: (props) => <ul className="m-0 mt-2 list-disc pl-5 space-y-1" {...props} />,
                                                            ol: (props) => <ol className="m-0 mt-2 list-decimal pl-5 space-y-1" {...props} />,
                                                            li: (props) => <li className="m-0" {...props} />,
                                                            code: (props) => (
                                                                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" {...props} />
                                                            ),
                                                            a: (props) => (
                                                                <a className="text-primary-600 dark:text-primary-400 underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
                                                            ),
                                                        }}
                                                    >
                                                        {text}
                                                    </ReactMarkdown>
                                                </div>
                                            );
                                        }

                                        return <p key={index} className="text-sm whitespace-pre-wrap m-0">{text}</p>;
                                    }

                                    if (isToolLikePart(part)) {
                                        const toolPart = part;
                                        const partType = toolPart.type;
                                        const toolName = toolPart.toolName || (partType.startsWith('tool-') ? partType.replace('tool-', '') : 'ferramenta');
                                        const toolTitle = toolLabelMap[toolName] || toolName;

                                        // Se houver múltiplas aprovações do mesmo tool, renderizamos uma confirmação
                                        // agrupada acima. Então escondemos as individuais aqui.
                                        if (toolPart.state === 'approval-requested' && (groupedToolCounts[toolName] ?? 0) > 1) {
                                            return null;
                                        }

                                        console.log('[UIChat] 🔧 Handling tool part:', { type: partType, state: toolPart.state, name: toolName });

                                        if (toolPart.state === 'approval-requested') {
                                            const toolInput = (toolPart.input ?? toolPart.args) as ToolInputPayload | undefined;
                                            const summaryLines = summarizeToolInput(toolName, toolInput);

                                            return (
                                                <div key={index} className="mt-2 p-3 bg-[var(--color-warning-bg)] border border-[var(--color-warning)] rounded-lg">
                                                    <div className="flex items-center gap-2 text-sm text-[var(--color-warning-text)] mb-2">
                                                        <Wrench className="w-4 h-4" />
                                                        <span className="font-medium">Confirmar ação: {toolTitle}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mb-3 space-y-1">
                                                        {summaryLines.map((line, i) => (
                                                            <p key={i} className="m-0">• {line}</p>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => addToolApprovalResponse?.({
                                                                id: toolPart.approval?.id || toolPart.toolCallId,
                                                                approved: true,
                                                            })}
                                                            className="px-3 py-1.5 bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] text-white text-xs rounded-lg transition-all"
                                                        >
                                                            ✓ Aprovar
                                                        </Button>
                                                        <Button
                                                            onClick={() => addToolApprovalResponse?.({
                                                                id: toolPart.approval?.id || toolPart.toolCallId,
                                                                approved: false,
                                                            })}
                                                            className="px-3 py-1.5 bg-[var(--color-error)] hover:bg-[var(--color-error-hover)] text-white text-xs rounded-lg transition-all"
                                                        >
                                                            ✗ Negar
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Não renderizar invocações de tools (nome técnico/etapas) na UI.
                                        // O único caso em que mostramos tool é quando precisa de aprovação.
                                        return null;
                                    }

                                    return null;
                                })}
                            </div>


                            {
                                message.role === 'user' && (
                                    <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    </div>
                                )
                            }
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex gap-2">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-linear-to-br from-primary-500 to-violet-500 flex items-center justify-center">
                            <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="bg-muted text-muted-foreground rounded-2xl rounded-tl-md px-3 py-2 border border-border">
                            <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Pensando...</span>
                            </div>
                        </div>
                    </div>
                )}

                {friendlyError && (
                    <div className="p-3 bg-[var(--color-error-bg)] border border-[var(--color-error)] rounded-xl text-[var(--color-error-text)] text-xs">
                        ❌ {friendlyError}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            < form onSubmit={handleSubmit} className="p-3 border-t border-border" >
                {hasPendingApprovals && (
                    <div className="mb-2 rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning-text)]">
                        Você tem {pendingApprovalIds.length} confirmação{pendingApprovalIds.length === 1 ? '' : 'ões'} pendente{pendingApprovalIds.length === 1 ? '' : 's'}. Aprove ou negue acima para continuar.
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pergunte algo..."
                        disabled={!canSend}
                        className="flex-1 px-3 py-2 bg-muted border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all disabled:opacity-50"
                    />
                    <Button
                        type="submit"
                        disabled={!input.trim() || !canSend}
                        className="px-3 py-2 bg-linear-to-r from-primary-600 to-violet-600 hover:from-primary-500 hover:to-violet-500 disabled:bg-muted disabled:from-muted disabled:to-muted text-white rounded-xl transition-all disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </form >
        </>
    );

    // Floating widget - size based on isExpanded
    if (floating) {
        // Expanded: Right-side drawer panel
        if (isExpanded) {
            return (
                <>
                    {/* Overlay */}
                    <div
                        className={`${MODAL_OVERLAY_CLASS} transition-opacity duration-300`}
                        onClick={() => setIsExpanded(false)}
                    />
                    {/* Drawer Panel */}
                    <div className="fixed top-0 right-0 z-50 w-full md:max-w-lg h-full bg-card md:border-l md:border-border shadow-2xl shadow-black/20 flex flex-col transition-transform duration-300">
                        {chatContent}
                    </div>
                </>
            );
        }

        // Minimized: Small widget in corner
        return (
            <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-50 w-full md:w-96 h-full md:h-125 bg-card md:rounded-2xl md:border md:border-border shadow-2xl shadow-black/20 flex flex-col overflow-hidden md:backdrop-blur-xl transition-all duration-300">
                {chatContent}
            </div>
        );
    }

    // Inline component
    return (
        <div className="flex flex-col h-full bg-card border border-border overflow-hidden">
            {chatContent}
        </div>
    );
}

// Export a floating version that can be added to layout
/**
 * Componente React `FloatingAIChat`.
 * @returns {Element | null} Retorna um valor do tipo `Element | null`.
 */
export function FloatingAIChat() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return <UIChat floating startMinimized onClose={() => setIsVisible(false)} />;
}
