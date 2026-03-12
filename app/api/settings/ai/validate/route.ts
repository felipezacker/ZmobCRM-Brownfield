import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const ValidateSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic']),
  apiKey: z.string().min(10, 'Chave muito curta'),
  model: z.string().min(1),
});

async function validateGoogle(apiKey: string, model: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
    },
  );

  if (res.ok) return { valid: true };

  const body = await res.json().catch(() => null);

  if (res.status === 400 && body?.error?.message?.includes('API key not valid')) {
    return { valid: false, error: 'Chave de API inválida' };
  }
  if (res.status === 400 && body?.error?.message?.includes('not found')) {
    return { valid: false, error: `Modelo "${model}" não encontrado. Verifique o ID.` };
  }
  if (res.status === 403) {
    return { valid: false, error: 'Chave sem permissão para este modelo' };
  }
  if (res.status === 429) {
    return { valid: true }; // Rate limit = key is valid
  }

  return { valid: false, error: body?.error?.message || 'Erro desconhecido' };
}

async function validateOpenAI(apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.ok) return { valid: true };
  if (res.status === 401) return { valid: false, error: 'Chave de API inválida' };
  return { valid: false, error: 'Erro ao validar chave' };
}

async function validateAnthropic(apiKey: string, model: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  });

  if (res.ok) return { valid: true };
  if (res.status === 401) return { valid: false, error: 'Chave de API inválida' };
  if (res.status === 429) return { valid: true }; // Rate limit = key valid
  return { valid: false, error: 'Erro ao validar chave' };
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = ValidateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ valid: false, error: 'Payload inválido' }, 400);
  }

  const { provider, apiKey, model } = parsed.data;

  try {
    let result: { valid: boolean; error?: string };

    switch (provider) {
      case 'google':
        result = await validateGoogle(apiKey, model);
        break;
      case 'openai':
        result = await validateOpenAI(apiKey);
        break;
      case 'anthropic':
        result = await validateAnthropic(apiKey, model);
        break;
      default:
        result = { valid: false, error: 'Provedor não suportado' };
    }

    return json(result);
  } catch (error) {
    console.error('[ai/validate] Validation error:', error);
    return json({ valid: false, error: 'Falha ao conectar com o provedor. Tente novamente.' }, 500);
  }
}
