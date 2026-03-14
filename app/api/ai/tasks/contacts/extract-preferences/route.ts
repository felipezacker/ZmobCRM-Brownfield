import { generateObject } from 'ai';
import { z } from 'zod';
import { requireAITaskContext, AITaskHttpError } from '@/lib/ai/tasks/server';

export const maxDuration = 30;

const ExtractedPreferencesSchema = z.object({
  propertyTypes: z.array(z.string()).describe('Tipos de imóvel mencionados (ex: Apartamento, Casa, Terreno, Comercial, Rural, Galpao)'),
  purpose: z.enum(['MORADIA', 'INVESTIMENTO', 'VERANEIO']).nullable().describe('Finalidade: morar=MORADIA, investir=INVESTIMENTO, praia/férias=VERANEIO'),
  priceMin: z.number().nullable().describe('Preço mínimo em reais (inteiro)'),
  priceMax: z.number().nullable().describe('Preço máximo em reais (inteiro)'),
  regions: z.array(z.string()).describe('Bairros ou regiões mencionados'),
  bedroomsMin: z.number().nullable().describe('Número mínimo de quartos'),
  parkingMin: z.number().nullable().describe('Número mínimo de vagas'),
  areaMin: z.number().nullable().describe('Área mínima em m²'),
  acceptsFinancing: z.boolean().nullable().describe('Aceita financiamento?'),
  acceptsFgts: z.boolean().nullable().describe('Aceita FGTS?'),
  urgency: z.enum(['IMMEDIATE', '3_MONTHS', '6_MONTHS', '1_YEAR']).nullable().describe('Urgência: urgente/imediato=IMMEDIATE, 3 meses=3_MONTHS, 6 meses=6_MONTHS, 1 ano/sem pressa=1_YEAR'),
  notes: z.string().nullable().describe('Informações extras que não se encaixam nos campos acima'),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function POST(req: Request) {
  try {
    const { model } = await requireAITaskContext(req);

    const body = await req.json().catch(() => null);
    const text = body?.text;
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return json({ error: { code: 'INVALID_INPUT', message: 'Texto muito curto.' } }, 400);
    }

    const result = await generateObject({
      model,
      maxRetries: 2,
      schema: ExtractedPreferencesSchema,
      prompt: `Extraia as preferências de imóvel do texto abaixo. Retorne APENAS os campos mencionados, deixe null para os não mencionados. Valores monetários em reais (ex: "500k" = 500000, "1.2 milhão" = 1200000). Tipos de imóvel devem ser: Apartamento, Casa, Terreno, Comercial, Rural, Galpao.\n\nTexto: "${text.trim()}"`,
    });

    return json(result.object);
  } catch (err: unknown) {
    if (err instanceof AITaskHttpError) return err.toResponse();
    if (err instanceof z.ZodError) {
      return json({ error: { code: 'INVALID_INPUT', message: 'Payload inválido.' } }, 400);
    }
    console.error('[api/ai/tasks/contacts/extract-preferences] Error:', err);
    return json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao extrair preferências.' } }, 500);
  }
}
