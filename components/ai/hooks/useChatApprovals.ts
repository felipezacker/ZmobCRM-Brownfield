import { useState } from 'react';
import type { UIMessage } from 'ai';
import { isToolLikePart } from '../utils';

export function useChatApprovals(messages: UIMessage[]) {
    // UI state para cards de aprovacao (agrupados).
    const [expandedApprovalGroups, setExpandedApprovalGroups] = useState<Record<string, boolean>>({});
    const [selectedApprovalsById, setSelectedApprovalsById] = useState<Record<string, boolean>>({});
    const [selectionModeByGroup, setSelectionModeByGroup] = useState<Record<string, boolean>>({});

    // Se existir uma tool-call aguardando aprovacao, nao podemos aceitar novas mensagens:
    // alguns providers exigem que toda tool-call tenha um tool-result antes de continuar.
    // Caso contrario, aparece o erro "No tool output found for function call ...".
    const pendingApprovalIds = (() => {
        const ids: string[] = [];
        for (const m of messages) {
            for (const part of m.parts ?? []) {
                if (!isToolLikePart(part)) continue;

                if (part.state !== 'approval-requested') continue;
                if (part.approval?.approved != null) continue;

                const id = part.approval?.id || part.toolCallId;
                if (id) ids.push(id);
            }
        }
        return Array.from(new Set(ids));
    })();

    const hasPendingApprovals = pendingApprovalIds.length > 0;

    return {
        expandedApprovalGroups,
        setExpandedApprovalGroups,
        selectedApprovalsById,
        setSelectedApprovalsById,
        selectionModeByGroup,
        setSelectionModeByGroup,
        pendingApprovalIds,
        hasPendingApprovals,
    };
}
