/** Shared constants for CockpitDataPanel sub-components. */

/** Labels legiveis para deal_type. */
export const DEAL_TYPE_LABELS: Record<string, string> = {
  VENDA: 'Venda',
  LOCACAO: 'Locacao',
  PERMUTA: 'Permuta',
};

/** Labels para temperatura do lead. */
export const TEMPERATURE_CONFIG: Record<string, { label: string; color: string }> = {
  HOT: { label: 'Quente', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/20' },
  WARM: { label: 'Morno', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20' },
  COLD: { label: 'Frio', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/20' },
};

/** Labels para classificacao do contato. */
export const CLASSIFICATION_CONFIG: Record<string, { label: string; color: string }> = {
  COMPRADOR: { label: 'Comprador', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 ring-blue-500/20' },
  VENDEDOR: { label: 'Vendedor', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-300 ring-purple-500/20' },
  LOCATARIO: { label: 'Locatario', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 ring-cyan-500/20' },
  LOCADOR: { label: 'Locador', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-300 ring-teal-500/20' },
  INVESTIDOR: { label: 'Investidor', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20' },
  PERMUTANTE: { label: 'Permutante', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-300 ring-orange-500/20' },
};

/** Labels para prioridade. */
export const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 ring-rose-500/20' },
  medium: { label: 'Media', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/20' },
  low: { label: 'Baixa', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-300 ring-sky-500/20' },
};

/** Labels para urgencia de preferencia. */
export const URGENCY_LABELS: Record<string, string> = {
  IMMEDIATE: 'Imediato',
  '3_MONTHS': 'Ate 3 meses',
  '6_MONTHS': 'Ate 6 meses',
  '1_YEAR': 'Ate 1 ano',
};

/** Labels para finalidade. */
export const PURPOSE_LABELS: Record<string, string> = {
  MORADIA: 'Moradia',
  INVESTIMENTO: 'Investimento',
  VERANEIO: 'Veraneio',
};

export const PROPERTY_TYPES = ['APARTAMENTO', 'CASA', 'TERRENO', 'COMERCIAL', 'RURAL', 'GALPAO'] as const;

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTAMENTO: 'Apto',
  CASA: 'Casa',
  TERRENO: 'Terreno',
  COMERCIAL: 'Comercial',
  RURAL: 'Rural',
  GALPAO: 'Galpao',
};

export const INPUT_CLASS =
  'bg-transparent outline-none text-sm hover:bg-muted dark:hover:bg-white/5 rounded px-1 py-0.5 focus:ring-1 focus:ring-cyan-500 focus:bg-white dark:focus:bg-white/5 transition-colors';
export const SELECT_CLASS = `${INPUT_CLASS} cursor-pointer`;
