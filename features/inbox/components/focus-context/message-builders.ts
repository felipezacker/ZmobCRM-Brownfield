export function normalizeReason(raw?: string) {
    if (typeof raw !== 'string') return '';
    return raw.replace(/\s*-\s*Sugerido por IA\s*$/i, '').trim();
}

export function formatSlot(d: Date) {
    const day = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${time}`;
}

export function proposeTwoSlots() {
    const a = new Date();
    a.setDate(a.getDate() + 1);
    a.setHours(10, 0, 0, 0);

    const b = new Date();
    b.setDate(b.getDate() + 2);
    b.setHours(15, 0, 0, 0);

    return { a, b };
}

export function buildSuggestedWhatsAppMessage(
    actionType: string,
    action: string,
    reason: string | undefined,
    contactName: string | undefined,
    dealTitle: string | undefined
) {
    const firstName = contactName?.split(' ')[0] || '';
    const greeting = firstName ? `Oi ${firstName}, tudo bem?` : 'Oi, tudo bem?';
    const r = normalizeReason(reason);
    const title = dealTitle?.trim();

    const { a, b } = proposeTwoSlots();
    const dealCtx = title ? ` sobre ${title}` : '';
    const reasonSentence = r ? `\n\nPensei nisso porque ${r.charAt(0).toLowerCase()}${r.slice(1)}.` : '';

    if (actionType === 'MEETING') {
        return (
            `${greeting}` +
            `\n\nQueria marcar um papo rapido (15 min)${dealCtx} pra alinharmos os proximos passos.` +
            `${reasonSentence}` +
            `\n\nVoce consegue ${formatSlot(a)} ou ${formatSlot(b)}? Se preferir, me diga um horario bom pra voce.`
        );
    }

    if (actionType === 'CALL') {
        return (
            `${greeting}` +
            `\n\nPodemos fazer uma ligacao rapidinha${dealCtx}?` +
            `${reasonSentence}` +
            `\n\nVoce prefere ${formatSlot(a)} ou ${formatSlot(b)}?`
        );
    }

    if (actionType === 'TASK') {
        return (
            `${greeting}` +
            `\n\nSo pra alinharmos${dealCtx}: ${action.trim()}.` +
            `${reasonSentence}` +
            `\n\nPode me confirmar quando conseguir?`
        );
    }

    const cleanAction = action?.trim();
    const actionLine = cleanAction ? `\n\n${cleanAction}${title ? ` (${title})` : ''}.` : '';
    return `${greeting}${actionLine}${reasonSentence}`;
}

export function buildSuggestedEmailBody(
    actionType: string,
    action: string,
    reason: string | undefined,
    contactName: string | undefined,
    dealTitle: string | undefined
) {
    const firstName = contactName?.split(' ')[0] || '';
    const greeting = firstName ? `Ola ${firstName},` : 'Ola,';
    const r = normalizeReason(reason);
    const title = dealTitle?.trim();
    const { a, b } = proposeTwoSlots();
    const reasonSentence = r ? `\n\nMotivo: ${r}.` : '';
    const dealSentence = title ? `\n\nAssunto: ${title}.` : '';

    if (actionType === 'MEETING') {
        return (
            `${greeting}` +
            `\n\nQueria marcar uma conversa rapida (15 min) para alinharmos proximos passos.` +
            `${dealSentence}` +
            `${reasonSentence}` +
            `\n\nVoce teria disponibilidade em ${formatSlot(a)} ou ${formatSlot(b)}?` +
            `\n\nAbs,`
        );
    }

    if (actionType === 'CALL') {
        return (
            `${greeting}` +
            `\n\nPodemos falar rapidamente por telefone?` +
            `${dealSentence}` +
            `${reasonSentence}` +
            `\n\nSugestoes de horario: ${formatSlot(a)} ou ${formatSlot(b)}.` +
            `\n\nAbs,`
        );
    }

    if (actionType === 'TASK') {
        return (
            `${greeting}` +
            `\n\n${action.trim()}.` +
            `${dealSentence}` +
            `${reasonSentence}` +
            `\n\nAbs,`
        );
    }

    return (
        `${greeting}` +
        `\n\n${action.trim()}.` +
        `${dealSentence}` +
        `${reasonSentence}` +
        `\n\nAbs,`
    );
}
