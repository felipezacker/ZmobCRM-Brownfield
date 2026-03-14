import { ToolLoopAgent, stepCountIs } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CRMCallOptionsSchema, type CRMCallOptions } from '@/types/ai';
import { createCRMTools } from './tools';
import { formatPriorityPtBr } from '@/lib/utils/priority';
import { AI_DEFAULT_MODELS, AI_DEFAULT_PROVIDER } from './defaults';
import { getResolvedPrompt } from './prompts/server';

type AIProvider = 'google' | 'openai' | 'anthropic';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampText(v: unknown, max = 240): string | undefined {
    if (typeof v !== 'string') return undefined;
    const s = v.trim();
    if (!s) return undefined;
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
}

type AnyObj = Record<string, unknown>;

function formatCockpitSnapshotForPrompt(snapshot: Record<string, unknown>): string[] {
    if (!snapshot || typeof snapshot !== 'object') return [];

    const lines: string[] = [];

    const deal = snapshot.deal;
    if (deal && typeof deal === 'object') {
        const d = deal as AnyObj;
        const title = clampText(d.title, 120) || clampText(d.name, 120);
        const value = typeof d.value === 'number' ? d.value : undefined;
        const probability = typeof d.probability === 'number' ? d.probability : undefined;
        const priority = clampText(d.priority, 30);
        const status = clampText(d.status, 80);
        lines.push(`🧾 Deal (cockpit): ${title ?? '(sem título)'}${value != null ? ` — R$ ${value.toLocaleString('pt-BR')}` : ''}`);
        if (probability != null) lines.push(`   - Probabilidade: ${probability}%`);
        if (priority) lines.push(`   - Prioridade: ${formatPriorityPtBr(priority)}`);
        if (status) lines.push(`   - Status/Stage ID: ${status}`);
        const lossReason = clampText(d.lossReason, 200);
        if (lossReason) lines.push(`   - Motivo perda: ${lossReason}`);
    }

    const stage = snapshot.stage;
    if (stage && typeof stage === 'object') {
        const label = clampText((stage as AnyObj).label, 80);
        if (label) lines.push(`🏷️ Estágio atual (label): ${label}`);
    }

    const contact = snapshot.contact;
    if (contact && typeof contact === 'object') {
        const c = contact as AnyObj;
        const name = clampText(c.name, 80);
        const email = clampText(c.email, 120);
        const phone = clampText(c.phone, 60);
        lines.push(`👤 Contato (cockpit): ${name ?? '(sem nome)'}`);
        if (email) lines.push(`   - Email: ${email}`);
        if (phone) lines.push(`   - Telefone: ${phone}`);
        const notes = clampText(c.notes, 220);
        if (notes) lines.push(`   - Notas do contato: ${notes}`);

    }

    // Preferências de imóvel: pode vir como snapshot.contact.preferences (array)
    // ou como snapshot.preferences (objeto único do ContactDetailModal)
    const rawPrefs = (contact && typeof contact === 'object' && (contact as AnyObj).preferences)
        || snapshot.preferences;
    const prefsArray: AnyObj[] = Array.isArray(rawPrefs)
        ? rawPrefs as AnyObj[]
        : (rawPrefs && typeof rawPrefs === 'object' ? [rawPrefs as AnyObj] : []);

    if (prefsArray.length > 0) {
        lines.push(`   🏠 Preferências de imóvel:`);
        for (const pref of prefsArray) {
            const types = Array.isArray(pref.propertyTypes) ? (pref.propertyTypes as string[]).join(', ') : undefined;
            const purpose = clampText(pref.purpose, 30);
            const regions = Array.isArray(pref.regions) ? (pref.regions as string[]).join(', ') : undefined;
            const priceMin = typeof pref.priceMin === 'number' ? pref.priceMin : undefined;
            const priceMax = typeof pref.priceMax === 'number' ? pref.priceMax : undefined;
            const bedrooms = typeof pref.bedroomsMin === 'number' ? pref.bedroomsMin : undefined;
            const parking = typeof pref.parkingMin === 'number' ? pref.parkingMin : undefined;
            const area = typeof pref.areaMin === 'number' ? pref.areaMin : undefined;
            const urgency = clampText(pref.urgency, 20);

            if (types) lines.push(`      - Tipo: ${types}`);
            if (purpose) lines.push(`      - Finalidade: ${purpose}`);
            if (priceMin != null || priceMax != null) {
                const range = priceMin != null && priceMax != null
                    ? `R$ ${priceMin.toLocaleString('pt-BR')} — R$ ${priceMax.toLocaleString('pt-BR')}`
                    : priceMin != null ? `a partir de R$ ${priceMin.toLocaleString('pt-BR')}` : `até R$ ${priceMax!.toLocaleString('pt-BR')}`;
                lines.push(`      - Faixa: ${range}`);
            }
            if (regions) lines.push(`      - Regiões: ${regions}`);
            if (bedrooms != null) lines.push(`      - Quartos: ${bedrooms}+`);
            if (parking != null) lines.push(`      - Vagas: ${parking}+`);
            if (area != null) lines.push(`      - Área: ${area}+ m²`);
            if (urgency) lines.push(`      - Urgência: ${urgency}`);
        }
    }

    const signals = snapshot.cockpitSignals;
    if (signals && typeof signals === 'object') {
        const sig = signals as AnyObj;
        if (typeof sig.daysInStage === 'number') {
            lines.push(`⏱️ Dias no estágio: ${sig.daysInStage}`);
        }

        const nba = sig.nextBestAction;
        if (nba && typeof nba === 'object') {
            const n = nba as AnyObj;
            const action = clampText(n.action, 120);
            const reason = clampText(n.reason, 160);
            if (action) lines.push(`👉 Próxima melhor ação (cockpit): ${action}${reason ? ` — ${reason}` : ''}`);
        }

        const ai = sig.aiAnalysis;
        if (ai && typeof ai === 'object') {
            const a = ai as AnyObj;
            const action = clampText(a.action, 120);
            const reason = clampText(a.reason, 180);
            if (action) lines.push(`🤖 Sinal da IA (cockpit): ${action}${reason ? ` — ${reason}` : ''}`);
        }
    }

    const lists = snapshot.lists;
    if (lists && typeof lists === 'object') {
        const l = lists as AnyObj;
        const activitiesObj = l.activities as AnyObj | undefined;
        const activitiesTotal = activitiesObj?.total;
        if (typeof activitiesTotal === 'number') {
            const preview = Array.isArray(activitiesObj?.preview) ? (activitiesObj.preview as AnyObj[]).slice(0, 6) : [];
            lines.push(`🗂️ Atividades no cockpit: ${activitiesTotal}`);
            for (const a of preview) {
                const t = clampText(a?.type, 30);
                const title = clampText(a?.title, 120);
                const date = clampText(a?.date, 40);
                if (t || title) lines.push(`   - ${date ? `[${date}] ` : ''}${t ? `${t}: ` : ''}${title ?? ''}`.trim());
            }
        }

        const notesObj = l.notes as AnyObj | undefined;
        const notesTotal = notesObj?.total;
        if (typeof notesTotal === 'number') {
            lines.push(`📝 Notas no cockpit: ${notesTotal}`);
        }

        const filesObj = l.files as AnyObj | undefined;
        const filesTotal = filesObj?.total;
        if (typeof filesTotal === 'number') {
            lines.push(`📎 Arquivos no cockpit: ${filesTotal}`);
        }

        const scriptsObj = l.scripts as AnyObj | undefined;
        const scriptsTotal = scriptsObj?.total;
        if (typeof scriptsTotal === 'number') {
            const preview = Array.isArray(scriptsObj?.preview) ? (scriptsObj.preview as AnyObj[]).slice(0, 6) : [];
            lines.push(`💬 Scripts no cockpit: ${scriptsTotal}`);
            for (const s of preview) {
                const title = clampText(s?.title, 80);
                const cat = clampText(s?.category, 30);
                if (title) lines.push(`   - ${cat ? `(${cat}) ` : ''}${title}`);
            }
        }
    }

    return lines;
}

function createRetryingFetch(
    baseFetch: typeof fetch,
    opts: {
        label: string;
        retries: number;
        baseDelayMs: number;
        maxDelayMs: number;
        modelFallback?: {
            /** Se o body JSON tiver esse model, substitui por `toModel` em retries (attempt >= 1). */
            fromModels: string[];
            toModel: string;
            /** Só aplicar fallback em respostas com status retryable (default: 429 e 5xx) */
            statuses?: number[];
        };
    }
) {
    const { label, retries, baseDelayMs, maxDelayMs } = opts;

    const isRetryableStatus = (status: number) => {
        // 408: timeout, 429: rate limit, 5xx: instabilidade do provedor.
        return status === 408 || status === 429 || (status >= 500 && status <= 599);
    };

    const shouldApplyModelFallback = (status: number | undefined) => {
        const fb = opts.modelFallback;
        if (!fb) return false;
        if (status == null) return false;

        // Se o caller forneceu uma lista de status, respeitar.
        if (Array.isArray(fb.statuses) && fb.statuses.length > 0) {
            return fb.statuses.includes(status);
        }

        // Default: 429 e 5xx.
        return status === 429 || (status >= 500 && status <= 599);
    };

    const maybeRewriteModelInBody = (body: unknown, attempt: number, lastStatus?: number) => {
        const fb = opts.modelFallback;
        if (!fb) return body;

        // Só tentar fallback a partir do segundo attempt (attempt >= 1)
        if (attempt < 1) return body;
        if (!shouldApplyModelFallback(lastStatus)) return body;

        if (typeof body !== 'string') return body;

        try {
            const parsed = JSON.parse(body);
            const current = parsed?.model;
            if (typeof current !== 'string') return body;
            if (!fb.fromModels.includes(current)) return body;

            parsed.model = fb.toModel;
            const rewritten = JSON.stringify(parsed);

            console.warn(`[${label}] Falling back model`, {
                from: current,
                to: fb.toModel,
                attempt,
                lastStatus,
            });

            return rewritten;
        } catch {
            return body;
        }
    };

    const extractRequestId = (res: Response) => {
        // OpenAI costuma enviar request-id em um desses headers.
        return (
            res.headers.get('x-request-id') ||
            res.headers.get('openai-request-id') ||
            res.headers.get('request-id') ||
            undefined
        );
    };

    const canRetryBody = (body: unknown): boolean => {
        // Evitar retries quando o body é stream não-reutilizável.
        // Strings/ArrayBuffer/Uint8Array/etc são OK.
        if (body == null) return true;
        if (typeof body === 'string') return true;
        if (body instanceof ArrayBuffer) return true;
        if (typeof Uint8Array !== 'undefined' && body instanceof Uint8Array) return true;
        if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
        // FormData geralmente é reusável, mas em alguns ambientes pode falhar; preferir não retry.
        if (typeof FormData !== 'undefined' && body instanceof FormData) return false;
        // ReadableStream: não retry.
        if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return false;
        return false;
    };

    return async (input: RequestInfo | URL, init?: RequestInit) => {
        const bodyRetryable = !(input instanceof Request) && !canRetryBody(init?.body);
        if (bodyRetryable) {
            // Melhor fazer uma chamada única do que tentar retry e falhar ao reusar body.
            return baseFetch(input, init);
        }

        // Quando o SDK chama fetch passando um Request pronto, precisamos "bufferizar" o body
        // para poder refazer a request (e aplicar fallback de model) em retries.
        // Isso é especialmente importante para requests JSON do OpenAI.
        let bufferedFromRequest:
            | {
                url: string;
                init: RequestInit;
                jsonBodyText?: string;
                contentType?: string;
            }
            | undefined;

        const getSignal = () => {
            if (init?.signal) return init.signal;
            if (input instanceof Request) return input.signal;
            return undefined;
        };

        const makeRequest = async (attempt: number, lastStatus?: number) => {
            if (input instanceof Request) {
                // 1) Primeiro build: extrair headers/método/url e, se possível, o body JSON.
                if (!bufferedFromRequest) {
                    const headers = new Headers(input.headers);
                    const contentType = headers.get('content-type') || undefined;

                    let jsonBodyText: string | undefined;
                    const method = input.method || 'GET';
                    const hasBody = method !== 'GET' && method !== 'HEAD';

                    if (hasBody) {
                        try {
                            // clone() para não consumir o Request original.
                            const bodyText = await input.clone().text();
                            // Só guardar se parece JSON; senão, não tentamos reescrever model.
                            if (
                                (contentType && /application\/json/i.test(contentType)) ||
                                bodyText.trim().startsWith('{')
                            ) {
                                jsonBodyText = bodyText;
                            }
                        } catch {
                            // Se não conseguimos ler o body, seguimos sem fallback de model.
                            jsonBodyText = undefined;
                        }
                    }

                    // Recriar RequestInit "mínimo". Não copiamos tudo porque alguns campos
                    // podem não estar disponíveis/ser relevantes no runtime do Next.
                    bufferedFromRequest = {
                        url: input.url,
                        contentType,
                        jsonBodyText,
                        init: {
                            method,
                            headers,
                            // sinal/abort vem de getSignal(), aplicado no Request.
                        },
                    };
                }

                // 2) Se temos body JSON bufferizado, conseguimos aplicar fallback de model.
                const rewritten = maybeRewriteModelInBody(bufferedFromRequest.jsonBodyText, attempt, lastStatus);
                const nextInit: RequestInit = {
                    ...bufferedFromRequest.init,
                    body: rewritten as BodyInit,
                    signal: getSignal(),
                };

                return new Request(bufferedFromRequest.url, nextInit);
            }

            const rewrittenBody = maybeRewriteModelInBody(init?.body, attempt, lastStatus);
            const nextInit: RequestInit = rewrittenBody === init?.body ? init ?? {} : { ...(init ?? {}), body: rewrittenBody as BodyInit };
            return new Request(input, nextInit);
        };

        let lastResponse: Response | undefined;
        let lastStatus: number | undefined;
        for (let attempt = 0; attempt <= retries; attempt++) {
            if (getSignal()?.aborted) {
                // Respeitar abort sem tentar novamente.
                throw new DOMException('The operation was aborted.', 'AbortError');
            }

            try {
                const req = await makeRequest(attempt, lastStatus);
                const res = await baseFetch(req);
                lastResponse = res;
                lastStatus = res.status;

                if (!isRetryableStatus(res.status) || attempt === retries) {
                    return res;
                }

                const requestId = extractRequestId(res);
                const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 120);
                console.warn(`[${label}] Retryable response (${res.status}). Retrying...`, {
                    attempt: attempt + 1,
                    retries,
                    delayMs: delay + jitter,
                    requestId,
                });
                await sleep(delay + jitter);
            } catch (err: unknown) {
                if (attempt === retries) throw err;

                const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
                const jitter = Math.floor(Math.random() * 120);
                console.warn(`[${label}] Fetch error. Retrying...`, {
                    attempt: attempt + 1,
                    retries,
                    delayMs: delay + jitter,
                    message: err instanceof Error ? err.message : String(err),
                });
                await sleep(delay + jitter);
            }
        }

        // Segurança: nunca deve chegar aqui.
        return lastResponse ?? baseFetch(input, init);
    };
}

/**
 * Build context prompt from call options
 * This injects rich context into the system prompt at runtime
 */
function buildContextPrompt(options: CRMCallOptions): string {
    const parts: string[] = [];

    if (options.boardId) {
        parts.push(`📋 Board ID: ${options.boardId}`);
        if (options.boardName) parts.push(`   Nome: ${options.boardName}`);
    }

    if (options.dealId) {
        parts.push(`💼 Deal ID: ${options.dealId}`);
    }

    if (options.contactId) {
        parts.push(`👤 Contato ID: ${options.contactId}`);
    }

    if (options.stages && options.stages.length > 0) {
        const stageList = options.stages.map(s => `${s.name} (${s.id})`).join(', ');
        parts.push(`🎯 Estágios: ${stageList}`);
    }

    if (options.dealCount !== undefined) {
        parts.push(`📊 Métricas:`);
        parts.push(`   - Deals: ${options.dealCount}`);
        if (options.pipelineValue) parts.push(`   - Pipeline: R$ ${options.pipelineValue.toLocaleString('pt-BR')}`);
        if (options.stagnantDeals) parts.push(`   - Parados: ${options.stagnantDeals}`);
        if (options.overdueDeals) parts.push(`   - Atrasados: ${options.overdueDeals}`);
    }

    if (options.wonStage) parts.push(`✅ Estágio Ganho: ${options.wonStage}`);
    if (options.lostStage) parts.push(`❌ Estágio Perdido: ${options.lostStage}`);

    if (options.userName) {
        parts.push(`👋 Usuário: ${options.userName}`);
    }

    if (options.cockpitSnapshot) {
        const lines = formatCockpitSnapshotForPrompt(options.cockpitSnapshot as Record<string, unknown>);
        if (lines.length > 0) {
            parts.push('');
            parts.push('====== CONTEXTO DO COCKPIT ======');
            parts.push(...lines);
        }
    }

    return parts.length > 0
        ? `\n\n====== CONTEXTO DO USUÁRIO ======\n${parts.join('\n')}`
        : '';
}

/**
 * Fallback base instructions used when the prompt catalog is unavailable.
 * The full system prompt is resolved dynamically via getResolvedPrompt()
 * so admin edits in ai_prompt_templates take effect on next request.
 */
const BASE_INSTRUCTIONS_FALLBACK = `Você é o ZmobCRM Pilot, um assistente de vendas inteligente. 🚀

PERSONALIDADE:
- Seja proativo, amigável e analítico
- Use emojis com moderação (máximo 2 por resposta)
- Respostas naturais (evite listas robóticas)
- Máximo 2 parágrafos por resposta

FERRAMENTAS (44 disponíveis):
📊 ANÁLISE: analyzePipeline, getBoardMetrics
🔍 BUSCA: searchDeals (aceita query por título E/OU productName por imóvel/produto), searchContacts (aceita query, tag, customFieldKey+customFieldValue — todos opcionais, funcionam sozinhos), listDealsByStage, listStagnantDeals, listOverdueDeals, getDealDetails, getContactDetails (inclui preferências de imóvel)
🏷️ PIPELINE: listStages, updateStage, reorderStages
⚡ AÇÕES: moveDeal, createDeal, updateDeal, markDealAsWon, markDealAsLost, assignDeal, moveDealsBulk
📝 NOTAS: addDealNote, listDealNotes
📞 ATIVIDADES: createTask, listActivities, completeActivity, rescheduleActivity, logActivity
👤 CONTATOS: createContact, updateContact, linkDealToContact, getLeadScore
🏠 PREFERÊNCIAS: getContactPreferences, createContactPreference, updateContactPreference
🎯 PROSPECÇÃO: listProspectingQueues, getProspectingMetrics, getProspectingGoals, listQuickScripts, createQuickScript, generateAndSaveScript, suggestScript, listSavedQueues, addContactsToQueue, suggestContactsForProspecting, analyzeProspectingPatterns

MEMÓRIA DA CONVERSA (MUITO IMPORTANTE):
- USE as informações das mensagens anteriores! Se você já buscou deals antes, use esses IDs.
- Quando o usuário diz “esse deal”, “ele”, “o único”, “o que acabei de ver” - use o ID do deal mencionado antes.
- NÃO busque novamente se você já tem as informações na conversa.
- Se a última busca retornou 1 deal, use o ID dele automaticamente.
- Para markDealAsWon/Lost: passe o dealId que você já conhece da conversa.
- Para moveDeal: use o dealId do deal que o usuário está se referindo.

LEAD SCORE:
- Quando o usuário perguntar sobre score, qualidade ou temperatura de um lead/contato, use a tool getLeadScore proativamente.
- O score vai de 0 a 100: Frio (<31), Morno (31-60), Quente (>60).

PREFERÊNCIAS DE IMÓVEL (EXTRAÇÃO AUTOMÁTICA):
- getContactDetails já retorna as preferências do contato automaticamente.
- Use getContactPreferences para ver preferências detalhadas de um contato.
- Use createContactPreference quando o usuário descrever o que o cliente busca.
- Use updateContactPreference para ajustar preferências existentes.
- EXTRAÇÃO DE TEXTO NATURAL: Quando o usuário escrever em linguagem livre o que o cliente quer, extraia os campos automaticamente e chame createContactPreference. Exemplos:
    - "cliente quer ap de 3 quartos na zona sul até 500k com vaga" → createContactPreference(propertyTypes=["Apartamento"], bedroomsMin=3, regions=["Zona Sul"], priceMax=500000, parkingMin=1)
    - "ele busca casa para investimento entre 300 e 800 mil, aceita financiamento, urgente" → createContactPreference(propertyTypes=["Casa"], purpose="INVESTIMENTO", priceMin=300000, priceMax=800000, acceptsFinancing=true, urgency="IMMEDIATE")
    - "quer terreno ou casa no centro ou barra, 2+ quartos, usa FGTS, prazo de 6 meses" → createContactPreference(propertyTypes=["Terreno", "Casa"], regions=["Centro", "Barra"], bedroomsMin=2, acceptsFgts=true, urgency="6_MONTHS")
    - "moradia, apto acima de 80m², 2 vagas, até 1 milhão" → createContactPreference(propertyTypes=["Apartamento"], purpose="MORADIA", areaMin=80, parkingMin=2, priceMax=1000000)
- MAPEAMENTO de urgência: "urgente"/"imediato"/"agora" → IMMEDIATE, "3 meses" → 3_MONTHS, "6 meses"/"semestre" → 6_MONTHS, "1 ano"/"sem pressa" → 1_YEAR
- MAPEAMENTO de finalidade: "morar"/"moradia"/"pra ele" → MORADIA, "investir"/"investimento"/"renda" → INVESTIMENTO, "praia"/"veraneio"/"férias" → VERANEIO
- Se o contato já tem preferência, use updateContactPreference ao invés de criar duplicada (cheque com getContactPreferences primeiro).
- Se não tiver contactId no contexto, pergunte qual contato antes de salvar.
- Campos: propertyTypes (tipos de imóvel), purpose (MORADIA/INVESTIMENTO/VERANEIO), priceMin/priceMax (faixa em reais), regions (bairros/regiões), bedroomsMin (quartos), parkingMin (vagas), areaMin (área m²), acceptsFinancing, acceptsFgts, urgency (IMMEDIATE/3_MONTHS/6_MONTHS/1_YEAR), notes (observações livres).

REGRAS:
- Sempre explique os resultados das ferramentas
- Se der erro, informe de forma amigável
- Use o boardId do contexto automaticamente quando disponível
- Para buscas (deals/contatos): ao chamar ferramentas de busca, passe APENAS o termo (ex.: “Nike”), sem frases como “buscar deal Nike”.
- IMÓVEL / PRODUTO: Quando o usuário menciona “imóvel”, “produto”, “empreendimento”, sempre use o campo productName (NUNCA query). Exemplos:
    - “busque deals com imóvel Shift” → searchDeals(productName=”Shift”) — NÃO use query
    - “crie um deal com imóvel Aurora” → createDeal(productName=”Aurora”) — SEMPRE passe productName
    - “deals do produto Ondular” → searchDeals(productName=”Ondular”)
- searchContacts aceita tag, customFieldKey e customFieldValue como filtros standalone (sem query):
    - “contatos com tag VIP” → searchContacts(tag=”VIP”)
    - “contatos com campo origem = indicacao” → searchContacts(customFieldKey=”origem”, customFieldValue=”indicacao”) — passe os DOIS parâmetros
- Para ações que alteram dados (criar, mover, marcar, atualizar, atribuir, criar tarefa):
    - NÃO peça confirmação em texto (não peça “sim/não”, “você confirma?”, etc.)
    - Chame a ferramenta diretamente; a UI já vai mostrar um card único de Aprovar/Negar
    - Só faça perguntas se faltar informação para executar (ex.: qual deal? qual estágio?)
- PRIORIZE usar IDs que você já conhece antes de buscar novamente

APRESENTAÇÃO (MUITO IMPORTANTE):
- NÃO mostre IDs/UUIDs para o usuário final (ex.: “(ID: ...)”)
- NÃO cite nomes internos de tools (ex.: “listStagnantDeals”, “markDealAsWon”)
- Sempre prefira: título do deal (nome do card) + contato + valor + estágio (quando fizer sentido)`;

/**
 * Resolves the system prompt from the ai_prompt_templates catalog.
 * Falls back to BASE_INSTRUCTIONS_FALLBACK if catalog is unavailable.
 */
async function resolveBaseInstructions(
    supabaseClient: SupabaseClient,
    organizationId: string,
): Promise<string> {
    try {
        const resolved = await getResolvedPrompt(supabaseClient, organizationId, 'agent_crm_base_instructions');
        if (resolved?.content) {
            return resolved.content;
        }
    } catch (err) {
        console.warn('[CRMAgent] Failed to resolve prompt from catalog, using fallback.', {
            message: err instanceof Error ? err.message : String(err),
        });
    }
    return BASE_INSTRUCTIONS_FALLBACK;
}

/**
 * Factory function to create a CRM Agent with dynamic context
 * 
 * @param context - Type-safe context from the request
 * @param userId - Current user ID
 * @param apiKey - Google AI API key from organization_settings
 * @param modelId - Model to use (default from AI_DEFAULT_MODELS)
 */
export async function createCRMAgent(
    context: CRMCallOptions,
    userId: string,
    apiKey: string,
    modelId: string = AI_DEFAULT_MODELS.google,
    provider: AIProvider = AI_DEFAULT_PROVIDER,
    supabaseClient?: SupabaseClient
) {
    console.log('[CRMAgent] 🤖 Creating agent with context:', {
        boardId: context.boardId,
        boardName: context.boardName,
        stagesCount: context.stages?.length,
        userId,
        modelId,
        provider,
    });

    // Create provider client with org-specific API key
    // NOTE: Model IDs are stored in organization_settings and passed through.
    const model = (() => {
        switch (provider) {
            case 'google': {
                const google = createGoogleGenerativeAI({ apiKey });
                return google(modelId);
            }
            case 'openai': {
                const openai = createOpenAI({
                    apiKey,
                    fetch: createRetryingFetch(fetch, {
                        label: 'OpenAI',
                        retries: 2,
                        baseDelayMs: 350,
                        maxDelayMs: 2000,
                        modelFallback: {
                            // Muitos modelos "preview"/novos oscilam mais; aqui fazemos fallback automático
                            // para um modelo estável sem exigir intervenção do usuário.
                            fromModels: [modelId],
                            toModel: AI_DEFAULT_MODELS.openai,
                            // Default já cobre 429/5xx; manter explícito só para clareza.
                            statuses: [429, 500, 502, 503, 504],
                        },
                    }),
                });
                return openai(modelId);
            }
            case 'anthropic': {
                const anthropic = createAnthropic({ apiKey });
                return anthropic(modelId);
            }
            default: {
                // Should be unreachable due to type, but keep runtime safety.
                const google = createGoogleGenerativeAI({ apiKey });
                return google(modelId);
            }
        }
    })();

    // Create tools with context injected
    const tools = createCRMTools(context, userId, supabaseClient);

    console.log('[CRMAgent] 🛠️ Tools created. Checking markDealAsWon config:', {
        needsApproval: (tools.markDealAsWon as Record<string, unknown>).needsApproval,
        description: tools.markDealAsWon.description
    });

    // Resolve system prompt from catalog (with fallback)
    const effectiveSupabase = supabaseClient ?? (await import('@/lib/supabase/staticAdminClient')).createStaticAdminClient();
    const instructions = await resolveBaseInstructions(effectiveSupabase, context.organizationId);

    return new ToolLoopAgent({
        model,
        callOptionsSchema: CRMCallOptionsSchema,
        instructions,
        // prepareCall runs ONCE at the start - injects initial context
        prepareCall: ({ options, ...settings }) => {
            return {
                ...settings,
                instructions: settings.instructions + buildContextPrompt(options),
            };
        },
        // prepareStep runs on EACH STEP - extracts and injects dynamic context
        prepareStep: async ({ messages, stepNumber, steps }) => {
            // Extract dealIds from previous tool results
            const foundDealIds: string[] = [];
            const foundDeals: Array<{ id: string; title: string }> = [];

            for (const step of steps) {
                // Check tool results for deal information
                if (step.toolResults) {
                    for (const result of step.toolResults) {
                        const r = result as Record<string, unknown>;
                        const data = (r.result ?? r.output ?? r.data ?? result) as Record<string, unknown>;
                        // Extract deals from listDealsByStage, searchDeals, etc.
                        if (data?.deals && Array.isArray(data.deals)) {
                            for (const deal of data.deals as Array<Record<string, unknown>>) {
                                const dealId = deal.id as string | undefined;
                                const dealTitle = (deal.title as string) || 'Unknown';
                                if (dealId && !foundDealIds.includes(dealId)) {
                                    foundDealIds.push(dealId);
                                    foundDeals.push({ id: dealId, title: dealTitle });
                                }
                            }
                        }
                        // Extract single deal from getDealDetails
                        const dataId = data?.id as string | undefined;
                        const dataTitle = data?.title as string | undefined;
                        if (dataId && dataTitle && !foundDealIds.includes(dataId)) {
                            foundDealIds.push(dataId);
                            foundDeals.push({ id: dataId, title: dataTitle });
                        }
                    }
                }
            }

            // If we found deals, inject a context reminder
            if (foundDeals.length > 0) {
                const lastDeal = foundDeals[foundDeals.length - 1];
                const contextReminder = `\n\n[CONTEXTO DA CONVERSA: Você já obteve informações sobre ${foundDeals.length} deal(s). O último mencionado foi "${lastDeal.title}" (ID: ${lastDeal.id}). Use este ID automaticamente quando o usuário se referir a "esse deal", "ele", "o único", etc.]`;

                console.log('[CRMAgent] 💡 Injecting context reminder:', {
                    dealsFound: foundDeals.length,
                    lastDeal
                });

                // Add a system message with context (modifying messages)
                const systemMessage = messages[0];
                if (systemMessage && systemMessage.role === 'system') {
                    const enhancedSystem = {
                        ...systemMessage,
                        content: typeof systemMessage.content === 'string'
                            ? systemMessage.content + contextReminder
                            : systemMessage.content
                    };
                    return {
                        messages: [enhancedSystem, ...messages.slice(1)]
                    };
                }
            }

            return {}; // No modifications needed
        },
        tools,
        stopWhen: stepCountIs(10),
    });
}

/**
 * Export type for frontend type-safety
 */
export type CRMAgentType = Awaited<ReturnType<typeof createCRMAgent>>;
