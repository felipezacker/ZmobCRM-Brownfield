// ============================================
// Constantes de estilo compartilhadas — Contacts
// ============================================

export const INPUT_CLASS = 'w-full bg-background dark:bg-black/20 border border-border dark:border-border rounded-lg px-3 py-2 text-sm text-foreground  outline-none focus:ring-2 focus:ring-primary-500';
export const LABEL_CLASS = 'block text-xs font-bold text-muted-foreground uppercase mb-1';
export const LEGEND_CLASS = 'text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1';
export const INPUT_ERROR_CLASS = 'w-full bg-background dark:bg-black/20 border border-red-400 dark:border-red-600 rounded-lg px-3 py-2 text-sm text-foreground  outline-none focus:ring-2 focus:ring-red-500';

// ============================================
// Constantes de dominio compartilhadas
// ============================================

export const CLASSIFICATION_LABELS: Record<string, string> = {
  COMPRADOR: 'Comprador',
  VENDEDOR: 'Vendedor',
  LOCATARIO: 'Locatario',
  LOCADOR: 'Locador',
  INVESTIDOR: 'Investidor',
  PERMUTANTE: 'Permutante',
};

export const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  LINKEDIN: 'LinkedIn',
  REFERRAL: 'Indicacao',
  MANUAL: 'Manual',
};

export const TEMPERATURE_CONFIG: Record<string, { label: string; cls: string }> = {
  HOT: { label: 'Quente', cls: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/20' },
  WARM: { label: 'Morno', cls: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20' },
  COLD: { label: 'Frio', cls: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20' },
};

export const STAGE_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  MQL: 'MQL',
  PROSPECT: 'Prospect',
  CUSTOMER: 'Cliente',
};
