import { z } from 'zod';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';
import { hasMinRole, type Role } from '@/lib/auth/roles';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const SendInviteSchema = z
  .object({
    email: z.string().email('Email invalido'),
    role: z.enum(['admin', 'diretor', 'corretor']).default('corretor'),
    expiresAt: z.union([z.string().datetime(), z.null()]).optional(),
  })
  .strict();

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) return json({ error: 'Forbidden' }, 403);

  // Validate Resend API key
  if (!process.env.RESEND_API_KEY) {
    return json({ error: 'Email service not configured' }, 503);
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { data: me, error: meError } = await supabase
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  if (meError || !me?.organization_id) return json({ error: 'Profile not found' }, 404);
  if (!hasMinRole(me.role as Role, 'admin')) return json({ error: 'Forbidden' }, 403);

  // Parse and validate input
  const raw = await req.json().catch(() => null);
  const parsed = SendInviteSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  const { email, role, expiresAt: rawExpiresAt } = parsed.data;

  // AC8: Check for existing pending invite with same email in this org
  const { data: existingInvite } = await supabase
    .from('organization_invites')
    .select('id')
    .eq('organization_id', me.organization_id)
    .eq('email', email)
    .is('used_at', null)
    .limit(1)
    .maybeSingle();

  if (existingInvite) {
    return json({ error: 'Ja existe um convite pendente para este email' }, 409);
  }

  // AC6: Rate limiting — max 10 invites/hour per organization
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from('organization_invites')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', me.organization_id)
    .gte('created_at', oneHourAgo);

  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    return json({ error: 'Limite de 10 convites/hora atingido' }, 429);
  }

  // Create invite in database
  const expiresAt = rawExpiresAt ?? null;

  const { data: invite, error: insertError } = await supabase
    .from('organization_invites')
    .insert({
      organization_id: me.organization_id,
      role: role as Role,
      email,
      expires_at: expiresAt,
      created_by: me.id,
    })
    .select('id, token, role, email, created_at, expires_at, used_at, created_by')
    .single();

  if (insertError || !invite) {
    console.error('[settings/invite POST] Database error:', insertError);
    return json({ error: insertError?.message ?? 'Failed to create invite' }, 500);
  }

  // Build invite link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const link = `${appUrl}/join?token=${invite.token}`;

  // Send email via Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'ZmobCRM <noreply@zmob.com.br>',
      to: email,
      subject: 'Voce foi convidado para o ZmobCRM',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #1a1a1a; margin-bottom: 16px;">Convite para o ZmobCRM</h2>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Voce foi convidado para participar de uma equipe no ZmobCRM como <strong>${role}</strong>.
          </p>
          <p style="color: #4a4a4a; line-height: 1.6;">
            Clique no botao abaixo para aceitar o convite:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}" style="display: inline-block; background-color: #6366f1; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">
              Aceitar Convite
            </a>
          </div>
          <p style="color: #888; font-size: 13px; line-height: 1.5;">
            Ou copie e cole este link no navegador:<br/>
            <a href="${link}" style="color: #6366f1; word-break: break-all;">${link}</a>
          </p>
        </div>
      `,
    });

    return json({ invite, emailSent: true }, 201);
  } catch (emailError) {
    console.error('[settings/invite POST] Email send failed:', emailError);
    // AC3: Invite already created — return link for manual copy
    return json({ invite, emailSent: false, link }, 200);
  }
}
