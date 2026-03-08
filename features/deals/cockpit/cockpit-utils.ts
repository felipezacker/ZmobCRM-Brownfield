import type { StageTone, MessageLogContext } from './cockpit-types';

// Performance: reuse Intl formatter instances (avoid creating them per call).
const PT_BR_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR');
const PT_BR_TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

export function humanizeTestLabel(input: string | null | undefined) {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return '';
  if (/^(test_|deal_test|__test|mock_)/i.test(raw)) return `[T] ${raw}`;
  return raw;
}

export function buildExecutionHeader(opts: {
  channel: 'WHATSAPP' | 'EMAIL';
  context?: MessageLogContext | null;
  outsideCRM?: boolean;
}): string {
  const parts: string[] = [];
  parts.push(`Fonte: Cockpit`);
  if (opts.outsideCRM) parts.push(`Fora do CRM: sim`);

  const ctx = opts.context;
  if (ctx) {
    parts.push(`Canal: ${opts.channel}`);
    parts.push(`Origem: ${ctx.origin}`);
    parts.push(`Tipo: ${ctx.source}`);
    if (ctx.template) parts.push(`Template: ${ctx.template.title}`);
    if (ctx.aiSuggested) parts.push(`IA sugeriu: sim`);
    if (ctx.aiActionType) parts.push(`Ação IA: ${ctx.aiActionType}`);
  }

  return parts.join('\n');
}

export function pickEmailPrefill(applied: string, fallbackSubject: string): { subject: string; body: string } {
  const lines = applied.split(/\r?\n/);
  const idx = lines.findIndex((l) => /^\s*(assunto|subject)\s*:\s*/i.test(l));

  if (idx >= 0) {
    const raw = lines[idx] ?? '';
    const subject = raw.replace(/^\s*(assunto|subject)\s*:\s*/i, '').trim() || fallbackSubject;
    const body = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join('\n').trim();
    return { subject, body };
  }

  return { subject: fallbackSubject, body: applied.trim() };
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatAtISO(iso: string): string {
  const d = new Date(iso);
  const dd = PT_BR_DATE_FORMATTER.format(d);
  const tt = PT_BR_TIME_FORMATTER.format(d);
  return `${dd} ${tt}`;
}

export function formatCurrencyBRL(value: number): string {
  return BRL_CURRENCY_FORMATTER.format(value);
}

export function stageToneFromBoardColor(color?: string): StageTone {
  const c = (color ?? '').toLowerCase();
  if (c.includes('blue') || c.includes('cyan') || c.includes('indigo')) return 'blue';
  if (c.includes('violet') || c.includes('purple')) return 'violet';
  if (c.includes('amber') || c.includes('yellow') || c.includes('orange')) return 'amber';
  if (c.includes('green') || c.includes('emerald') || c.includes('lime') || c.includes('teal')) return 'green';
  return 'slate';
}

export function toneToBg(tone: StageTone): string {
  switch (tone) {
    case 'blue':
      return 'bg-blue-500';
    case 'violet':
      return 'bg-violet-500';
    case 'amber':
      return 'bg-amber-500';
    case 'green':
      return 'bg-emerald-500';
    case 'slate':
    default:
      return 'bg-accent';
  }
}

export function toneToGlowColor(tone: StageTone): string {
  switch (tone) {
    case 'blue':
      return 'rgba(59, 130, 246, 0.25)';
    case 'violet':
      return 'rgba(139, 92, 246, 0.25)';
    case 'amber':
      return 'rgba(245, 158, 11, 0.25)';
    case 'green':
      return 'rgba(16, 185, 129, 0.25)';
    case 'slate':
    default:
      return 'rgba(148, 163, 184, 0.15)';
  }
}

export function toneToText(tone: StageTone): string {
  switch (tone) {
    case 'blue':
      return 'text-blue-400';
    case 'violet':
      return 'text-violet-400';
    case 'amber':
      return 'text-amber-400';
    case 'green':
      return 'text-emerald-400';
    case 'slate':
    default:
      return 'text-muted-foreground';
  }
}

export function scriptCategoryChipClass(color: string): string {
  switch (color) {
    case 'cyan':
      return 'bg-cyan-500/15 text-cyan-200';
    case 'amber':
      return 'bg-amber-500/15 text-amber-200';
    case 'emerald':
      return 'bg-emerald-500/15 text-emerald-200';
    case 'violet':
      return 'bg-violet-500/15 text-violet-200';
    case 'rose':
      return 'bg-rose-500/15 text-rose-200';
    default:
      return 'bg-white/10 text-muted-foreground';
  }
}

function normalizeReason(raw?: string) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim();
}

function formatSlot(d: Date) {
  const day = d.toLocaleDateString('pt-BR', { weekday: 'short' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${day} às ${time}`;
}

function proposeTwoSlots() {
  const a = new Date();
  a.setDate(a.getDate() + 1);
  a.setHours(10, 0, 0, 0);

  const b = new Date();
  b.setDate(b.getDate() + 2);
  b.setHours(14, 0, 0, 0);

  return { a: formatSlot(a), b: formatSlot(b) };
}

export function buildSuggestedWhatsAppMessage(opts: {
  contact?: { name?: string | null };
  deal?: { title?: string | null };
  actionType: string;
  action?: string;
  reason?: string;
}): string {
  const { contact, deal, actionType, action, reason } = opts;
  const firstName = contact?.name?.split(' ')[0] || '';

  const r = normalizeReason(reason);
  const dealTitle = deal?.title?.trim();

  const { a, b } = proposeTwoSlots();
  const reasonSentence = r ? `\n\nPensei nisso porque ${r.charAt(0).toLowerCase()}${r.slice(1)}.` : '';

  if (actionType === 'MEETING') {
    return [
      `Olá${firstName ? ` ${firstName}` : ''},`,
      ``,
      `Gostaria de marcar uma conversa rápida${dealTitle ? ` sobre "${dealTitle}"` : ''}.`,
      `Tenho dois horários disponíveis:`,
      ``,
      `• ${a}`,
      `• ${b}`,
      ``,
      `Algum funciona para você?${reasonSentence}`,
    ].join('\n');
  }

  const cleanAction = action?.trim();
  const actionLine = cleanAction ? `\n\n${cleanAction}${dealTitle ? ` (${dealTitle})` : ''}.` : '';

  return [
    `Olá${firstName ? ` ${firstName}` : ''},`,
    actionLine,
    reasonSentence,
    ``,
    `Podemos alinhar? Horários:`,
    `• ${a}`,
    `• ${b}`,
  ].join('\n');
}

export function buildSuggestedEmailBody(opts: {
  contact?: { name?: string | null };
  deal?: { title?: string | null };
  actionType: string;
  action?: string;
  reason?: string;
}): string {
  const { contact, deal, actionType, action, reason } = opts;
  const firstName = contact?.name?.split(' ')[0] || '';

  const r = normalizeReason(reason);
  const dealTitle = deal?.title?.trim();
  const { a, b } = proposeTwoSlots();

  return [
    `Olá${firstName ? ` ${firstName}` : ''},`,
    ``,
    action ? `${action}${dealTitle ? ` — ${dealTitle}` : ''}.` : `Sobre ${dealTitle || 'nosso assunto'}.`,
    r ? `\n${r}` : '',
    ``,
    `Tenho disponibilidade:`,
    `• ${a}`,
    `• ${b}`,
    ``,
    `Atenciosamente.`,
  ]
    .filter(Boolean)
    .join('\n');
}
