// Route Handler for AI "actions" (RPC-style helpers)
//
// This is the supported non-streaming endpoint for UI features that need a single, direct
// AI result (e.g. email draft, board generation, daily briefing).
//
// IMPORTANT:
// - Auth is cookie-based (Supabase SSR).
// - API keys are read server-side from `organization_settings`.
// - This is NOT the streaming Agent chat endpoint; that one is `/api/ai/chat`.
//
// Contract:
// POST { action: string, data: object }
// -> 200 { result?: unknown, error?: string, consentType?: string, retryAfter?: number }

import { generateObject, generateText } from 'ai';
import { getModel, type AIProvider } from '@/lib/ai/config';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { getResolvedPrompt } from '@/lib/ai/prompts/server';
import { renderPromptTemplate } from '@/lib/ai/prompts/render';
import { isAIFeatureEnabled } from '@/lib/ai/features/server';
import { decryptApiKey } from '@/lib/crypto/encryption';

export const maxDuration = 60;

type AIActionResponse<T = unknown> = {
  result?: T;
  error?: string;
  consentType?: string;
  retryAfter?: number;
};

type AIAction =
  | 'analyzeLead'
  | 'generateEmailDraft'
  | 'rewriteMessageDraft'
  | 'generateObjectionResponse'
  | 'generateDailyBriefing'
  | 'generateRescueMessage'
  | 'parseNaturalLanguageAction'
  | 'chatWithCRM'
  | 'generateBirthdayMessage'
  | 'generateBoardStructure'
  | 'generateBoardStrategy'
  | 'refineBoardWithAI'
  | 'chatWithBoardAgent'
  | 'generateSalesScript';

// --- Per-action data shapes (destructured from request body) ---

type DealData = {
  title?: string;
  value?: number;
  status?: string;
  probability?: number;
  contactName?: string;
};

type AnalyzeLeadData = {
  deal?: DealData;
  stageLabel?: string;
};

type GenerateEmailDraftData = {
  deal?: DealData;
};

type RewriteMessageDraftData = {
  channel?: string;
  currentSubject?: string;
  currentMessage?: string;
  nextBestAction?: unknown;
  cockpitSnapshot?: unknown;
};

type GenerateRescueMessageData = {
  deal?: DealData;
  channel?: string;
};

type LifecycleStageInput = {
  id?: string;
  name?: string;
};

type GenerateBoardStructureData = {
  description?: string;
  lifecycleStages?: unknown[];
};

type GenerateBoardStrategyData = {
  boardData?: { boardName?: string };
};

type RefineBoardData = {
  currentBoard?: unknown;
  userInstruction?: string;
  chatHistory?: unknown;
};

type GenerateObjectionResponseData = {
  deal?: DealData;
  objection?: string;
};

type ParseNaturalLanguageActionData = {
  text?: string;
};

type ChatWithCRMData = {
  message?: string;
  context?: unknown;
};

type GenerateBirthdayMessageData = {
  contactName?: string;
  age?: number | string;
};

type ChatWithBoardAgentData = {
  message?: string;
  boardContext?: { agentName?: string; [key: string]: unknown };
};

type GenerateSalesScriptData = {
  deal?: DealData;
  scriptType?: string;
  context?: string;
};

// --- Org settings shape from Supabase select ---

type OrgSettingsRow = {
  ai_enabled: boolean | null;
  ai_provider: string | null;
  ai_model: string | null;
  ai_google_key: string | null;
  ai_openai_key: string | null;
  ai_anthropic_key: string | null;
};

// -----------------------------------------------

const AnalyzeLeadSchema = z.object({
  action: z.string().max(50).describe('Acao curta e direta, maximo 50 caracteres.'),
  reason: z.string().max(80).describe('Razao breve, maximo 80 caracteres.'),
  actionType: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK', 'WHATSAPP']).describe('Tipo de acao sugerida'),
  urgency: z.enum(['low', 'medium', 'high']).describe('Urgencia da acao'),
  probabilityScore: z.number().min(0).max(100).describe('Score de probabilidade (0-100)'),
});

const BoardStructureSchema = z.object({
  boardName: z.string().describe('Nome do board em portugues'),
  description: z.string().describe('Descricao do proposito do board'),
  stages: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      color: z.string().describe('Classe Tailwind CSS, ex: bg-blue-500'),
      linkedLifecycleStage: z.string().describe('ID do lifecycle stage: LEAD, MQL, PROSPECT, CUSTOMER ou OTHER'),
      estimatedDuration: z.string().optional(),
    })
  ),
  automationSuggestions: z.array(z.string()),
});

const BoardStrategySchema = z.object({
  goal: z.object({
    description: z.string(),
    kpi: z.string(),
    targetValue: z.string(),
  }),
  agentPersona: z.object({
    name: z.string(),
    role: z.string(),
    behavior: z.string(),
  }),
  entryTrigger: z.string(),
});

const RefineBoardSchema = z.object({
  message: z.string().describe('Resposta conversacional explicando mudancas'),
  board: BoardStructureSchema.nullable().describe('Board modificado ou null se apenas pergunta'),
});

const ObjectionResponseSchema = z.array(z.string()).describe('3 respostas diferentes para contornar objecao');

const ParsedActionSchema = z.object({
  title: z.string(),
  type: z.enum(['CALL', 'MEETING', 'EMAIL', 'TASK']),
  date: z.string().optional(),
  contactName: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const RewriteMessageDraftSchema = z.object({
  subject: z
    .string()
    .max(120)
    .optional()
    .describe('Assunto do email (somente para canal EMAIL).'),
  message: z
    .string()
    .max(1600)
    .describe('Mensagem final para enviar no canal escolhido.'),
});

function safeContextText(v: unknown, maxBytes = 80_000): string {
  if (v == null) return '';
  try {
    const text = typeof v === 'string' ? v : JSON.stringify(v);
    if (text.length <= maxBytes) return text;
    return text.slice(0, maxBytes) + '\n... [TRUNCADO]';
  } catch {
    return '';
  }
}

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

/**
 * Handler HTTP `POST` deste endpoint (Next.js Route Handler).
 *
 * @param {Request} req - Objeto da requisicao.
 * @returns {Promise<Response>} Retorna um valor do tipo `Promise<Response>`.
 */
export async function POST(req: Request) {
  // Mitigacao CSRF: bloqueia POST cross-site em endpoint que usa auth via cookies.
  if (!isAllowedOrigin(req)) {
    return json<AIActionResponse>({ error: 'Forbidden' }, 403);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json<AIActionResponse>({ error: 'Unauthorized' }, 401);
  }

  const body = await req.json().catch(() => null);
  const action = body?.action as AIAction | undefined;
  const data = (body?.data ?? {}) as Record<string, unknown>;

  if (!action) {
    return json<AIActionResponse>({ error: "Invalid request format. Missing 'action'." }, 400);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    return json<AIActionResponse>({ error: 'Profile not found' }, 404);
  }

  const { data: orgSettings, error: orgError } = await supabase
    .from('organization_settings')
    .select('ai_enabled, ai_provider, ai_model, ai_google_key, ai_openai_key, ai_anthropic_key')
    .eq('organization_id', profile.organization_id)
    .single();

  const typedSettings = orgSettings as OrgSettingsRow | null;
  const aiEnabled = typeof typedSettings?.ai_enabled === 'boolean' ? typedSettings.ai_enabled : true;
  if (!aiEnabled) {
    return json<AIActionResponse>(
      { error: 'IA desativada pela organizacao. Um admin pode ativar em Configuracoes -> Central de I.A.' },
      403
    );
  }

  // Feature flag per action (default: enabled)
  const featureKeyByAction: Partial<Record<AIAction, string>> = {
    analyzeLead: 'ai_deal_analyze',
    generateEmailDraft: 'ai_email_draft',
    generateObjectionResponse: 'ai_objection_responses',
    generateDailyBriefing: 'ai_daily_briefing',
    generateSalesScript: 'ai_sales_script',
    generateBoardStructure: 'ai_board_generate_structure',
    generateBoardStrategy: 'ai_board_generate_strategy',
    refineBoardWithAI: 'ai_board_refine',
    chatWithBoardAgent: 'ai_chat_agent',
    chatWithCRM: 'ai_chat_agent',
    rewriteMessageDraft: 'ai_email_draft',
  };

  const featureKey = featureKeyByAction[action];
  if (featureKey) {
    const enabled = await isAIFeatureEnabled(supabase, profile.organization_id, featureKey);
    if (!enabled) {
      return json<AIActionResponse>(
        { error: `Funcao de IA desativada para esta acao (${action}).` },
        403
      );
    }
  }

  // Frontend expects "AI consent required" as a *payload* error.
  const provider: AIProvider = (typedSettings?.ai_provider ?? 'google') as AIProvider;
  const apiKey: string | null =
    provider === 'google'
      ? (typedSettings?.ai_google_key ?? null)
      : provider === 'openai'
        ? (typedSettings?.ai_openai_key ?? null)
        : (typedSettings?.ai_anthropic_key ?? null);

  if (orgError || !apiKey) {
    return json<AIActionResponse>({ error: 'AI consent required', consentType: 'AI_CONSENT' }, 200);
  }

  const modelId = typedSettings?.ai_model || '';
  const model = getModel(provider, apiKey, modelId);

  try {
    switch (action) {
      case 'analyzeLead': {
        const { deal, stageLabel } = data as unknown as AnalyzeLeadData;
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_deals_analyze');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          dealTitle: deal?.title || '',
          dealValue: deal?.value?.toLocaleString?.('pt-BR') ?? deal?.value ?? 0,
          stageLabel: stageLabel || deal?.status || '',
          probability: deal?.probability || 50,
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: AnalyzeLeadSchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateEmailDraft': {
        const { deal } = data as unknown as GenerateEmailDraftData;
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_deals_email_draft');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          contactName: deal?.contactName || 'Cliente',
          dealTitle: deal?.title || '',
        });
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'rewriteMessageDraft': {
        const {
          channel,
          currentSubject,
          currentMessage,
          nextBestAction,
          cockpitSnapshot,
        } = data as unknown as RewriteMessageDraftData;

        const channelLabel = channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP';

        const snapshotText = safeContextText(cockpitSnapshot);
        const nbaText = safeContextText(nextBestAction);

        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: RewriteMessageDraftSchema,
          prompt: `Voce e um corretor senior e copywriter.
Sua tarefa e REESCREVER (melhorar) uma mensagem para enviar ao cliente.

CANAL: ${channelLabel}

RASCUNHO ATUAL:
- subject (se houver): ${String(currentSubject ?? '')}
- message: ${String(currentMessage ?? '')}

PROXIMA ACAO (sugestao/NBA):
${nbaText || '[nao fornecida]'}

CONTEXTO COMPLETO (cockpitSnapshot):
${snapshotText || '[nao fornecido]'}

REGRAS:
1) Portugues do Brasil, natural e humano. Evite jargao e evite rotulos tipo "Contexto:"/"Sobre:".
2) Use o contexto para personalizar (nome, deal, etapa, proximos passos), mas NAO invente fatos.
3) Para WHATSAPP: curto, direto e MUITO legivel no WhatsApp. Use quebras de linha (paragrafos) e, quando houver opcoes, use lista com marcadores no formato "- item" (hifen + espaco). Evite paragrafos longos. 3-10 linhas.
4) Para EMAIL: devolva subject + body (message = body). Aplique boas praticas de email de vendas/CRM:
   - Assunto curto e especifico (<= 80), sem ALL CAPS e sem "RE:" falso.
   - Corpo SEMPRE bem escaneavel: paragrafos curtos (1-2 frases), com linhas em branco entre blocos.
   - Estrutura sugerida (adapte ao contexto):
     a) Saudacao breve (use o nome se tiver certeza).
     b) 1 frase de contexto (por que esta falando agora).
     c) 1-2 bullets com valor/objetivo ou proximos passos (use "- ").
     d) CTA claro e simples (uma pergunta) e, se houver opcoes de agenda, liste em bullets ("- segunda 10h", "- terca 15h").
     e) Fechamento curto (ex.: "Obrigado!"), sem assinatura com dados pessoais.
   - Evite bloco unico de texto: NAO devolva tudo em um paragrafo.
   - Tamanho: 6-16 linhas no total (incluindo linhas em branco).
5) Nao inclua placeholders (tipo "[nome]") e nao inclua assinatura com dados pessoais.

Retorne APENAS no formato do schema (subject opcional, message obrigatorio).`,
        });

        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateRescueMessage': {
        const { deal, channel } = data as unknown as GenerateRescueMessageData;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Gere uma mensagem de resgate/follow-up para reativar um deal parado.
DEAL: ${deal?.title} (${deal?.contactName || ''})
CANAL: ${channel}
Responda em portugues do Brasil.`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateBoardStructure': {
        const { description, lifecycleStages } = data as unknown as GenerateBoardStructureData;
        const lifecycleList =
          Array.isArray(lifecycleStages) && lifecycleStages.length > 0
            ? lifecycleStages.map((s: unknown) => {
                const stage = s as LifecycleStageInput;
                return { id: stage?.id || '', name: stage?.name || String(s) };
              })
            : [
                { id: 'LEAD', name: 'Lead' },
                { id: 'MQL', name: 'MQL' },
                { id: 'PROSPECT', name: 'Oportunidade' },
                { id: 'CUSTOMER', name: 'Cliente' },
                { id: 'OTHER', name: 'Outros' },
              ];

        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_boards_generate_structure');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          description,
          lifecycleJson: JSON.stringify(lifecycleList),
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: BoardStructureSchema,
          prompt,
        });

        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateBoardStrategy': {
        const { boardData } = data as unknown as GenerateBoardStrategyData;
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_boards_generate_strategy');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          boardName: boardData?.boardName || '',
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: BoardStrategySchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'refineBoardWithAI': {
        const { currentBoard, userInstruction, chatHistory } = data as unknown as RefineBoardData;
        const historyContext = chatHistory ? `\nHistorico:\n${JSON.stringify(chatHistory)}` : '';
        const boardContext = currentBoard
          ? `\nBoard atual (JSON):\n${JSON.stringify(currentBoard)}`
          : '';
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_boards_refine');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          userInstruction,
          boardContext,
          historyContext,
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: RefineBoardSchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'generateObjectionResponse': {
        const { deal, objection } = data as unknown as GenerateObjectionResponseData;
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_deals_objection_responses');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          objection,
          dealTitle: deal?.title || '',
        });
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: ObjectionResponseSchema,
          prompt,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'parseNaturalLanguageAction': {
        const { text } = data as unknown as ParseNaturalLanguageActionData;
        const result = await generateObject({
          model,
          maxRetries: 3,
          schema: ParsedActionSchema,
          prompt: `Parse para CRM Action: "${text}".
Campos: title, type (CALL/MEETING/EMAIL/TASK), date, contactName, confidence.`,
        });
        return json<AIActionResponse>({ result: result.object });
      }

      case 'chatWithCRM': {
        const { message, context } = data as unknown as ChatWithCRMData;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Assistente CRM.
Contexto: ${JSON.stringify(context)}
Usuario: ${message}
Responda em portugues.`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateBirthdayMessage': {
        const { contactName, age } = data as unknown as GenerateBirthdayMessageData;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Parabens para ${contactName} (${age || ''} anos). Curto e profissional.`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateDailyBriefing': {
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_inbox_daily_briefing');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          dataJson: JSON.stringify(data),
        });
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'chatWithBoardAgent': {
        const { message, boardContext } = data as unknown as ChatWithBoardAgentData;
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt: `Persona: ${boardContext?.agentName}. Contexto: ${JSON.stringify(boardContext)}. Msg: ${message}`,
        });
        return json<AIActionResponse>({ result: result.text });
      }

      case 'generateSalesScript': {
        const { deal, scriptType, context } = data as unknown as GenerateSalesScriptData;
        const resolved = await getResolvedPrompt(supabase, profile.organization_id, 'task_inbox_sales_script');
        const prompt = renderPromptTemplate(resolved?.content || '', {
          scriptType: scriptType || 'geral',
          dealTitle: deal?.title || '',
          context: context || '',
        });
        const result = await generateText({
          model,
          maxRetries: 3,
          prompt,
        });
        return json<AIActionResponse>({ result: { script: result.text, scriptType, generatedFor: deal?.title } });
      }

      default: {
        const exhaustive: never = action;
        return json<AIActionResponse>({ error: `Unknown action: ${exhaustive}` }, 200);
      }
    }
  } catch (err: unknown) {
    console.error('[api/ai/actions] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return json<AIActionResponse>({ error: message }, 200);
  }
}
