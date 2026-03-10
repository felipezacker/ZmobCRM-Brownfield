interface ParsedProviderError {
    requestId: string | null;
    isToolApproval: boolean;
    isOpenAIServerError: boolean;
    isRateLimit: boolean;
    isAuth: boolean;
    isModelNotFound: boolean;
    raw: string;
}

function extractRequestId(text: string): string | null {
    // Ex.: req_7a077671db1e471aa7f7b88ae828db92
    const m = text.match(/\breq_[a-z0-9]+\b/i);
    return m?.[0] ?? null;
}

export function parseProviderError(rawMessage: string): ParsedProviderError {
    const msg = rawMessage.trim();
    const requestId = extractRequestId(msg);

    const has = (re: RegExp) => re.test(msg);

    // Heuristicas bem conservadoras: preferimos errar para "mensagem generica"
    // do que inventar causa.
    const isToolApproval = /No tool output found for function call/i.test(msg);

    const isOpenAIServerError =
        has(/\bserver_error\b/i) ||
        has(/"type"\s*:\s*"server_error"/i) ||
        (has(/openai/i) && has(/\b5\d\d\b/));

    const isRateLimit =
        has(/rate[_ -]?limit/i) ||
        has(/quota/i) ||
        has(/\b429\b/);

    const isAuth =
        has(/invalid[_ -]?api[_ -]?key/i) ||
        has(/\b401\b/) ||
        has(/incorrect api key/i);

    const isModelNotFound =
        has(/model not found/i) ||
        has(/does not exist/i) ||
        has(/no such model/i);

    return {
        requestId,
        isToolApproval,
        isOpenAIServerError,
        isRateLimit,
        isAuth,
        isModelNotFound,
        raw: msg,
    };
}

export function useChatErrors(error: Error | undefined) {
    const msg = error?.message;
    if (!msg) return null;

    const parsed = parseProviderError(msg);

    if (parsed.isToolApproval) {
        return 'Existe uma confirmacao pendente acima. Aprove ou negue a acao anterior antes de enviar uma nova mensagem.';
    }

    if (parsed.isAuth) {
        return 'Falha de autenticacao com o provedor de IA. Confira a chave em Configuracoes \u2192 Inteligencia Artificial.';
    }

    if (parsed.isModelNotFound) {
        return 'Modelo nao encontrado para o provedor configurado. Confira o provedor/modelo em Configuracoes \u2192 Inteligencia Artificial.';
    }

    if (parsed.isRateLimit) {
        return 'A IA esta limitando requisicoes (rate limit). Aguarde alguns segundos e tente novamente.';
    }

    if (parsed.isOpenAIServerError) {
        const id = parsed.requestId ? ` (ID: ${parsed.requestId})` : '';
        return `A OpenAI parece estar instavel no momento (erro interno). Tente novamente em alguns segundos. Se persistir, troque para um modelo mais estavel (ex.: gpt-4o) em Configuracoes \u2192 IA${id}.`;
    }

    // Fallback: manter a mensagem original (util p/ debug), mas sem deixar 100% "crua".
    return parsed.requestId ? `${parsed.raw} (ID: ${parsed.requestId})` : parsed.raw;
}
