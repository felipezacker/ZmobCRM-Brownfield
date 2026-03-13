/**
 * Design Token Resolver — Bridge between CSS custom properties and JS consumers.
 *
 * CSS custom properties (globals.css) are the source of truth.
 * This module provides runtime access for contexts that need raw color values:
 * - Recharts / SVG APIs
 * - Canvas rendering
 * - Inline style objects
 *
 * SSR-safe: falls back to hardcoded values when `document` is unavailable.
 */

// ---------------------------------------------------------------------------
// CSS Variable Resolver
// ---------------------------------------------------------------------------

/**
 * Read a CSS custom property from :root at runtime.
 * Returns empty string on server or if variable is not set.
 */
function getCSSVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Resolve a CSS variable with a hardcoded fallback for SSR.
 */
function resolve(varName: string, fallback: string): string {
  return getCSSVar(varName) || fallback;
}

// ---------------------------------------------------------------------------
// Tailwind Class → Hex Mapping
// Used when DB stores Tailwind class names (e.g. stage.color = "bg-blue-500")
// and we need raw hex for inline styles / SVG.
// ---------------------------------------------------------------------------

export const TAILWIND_TO_HEX: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-yellow-500': '#eab308',
  'bg-purple-500': '#a855f7',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-orange-500': '#f97316',
  'bg-red-500': '#ef4444',
  'bg-pink-500': '#ec4899',
  'bg-indigo-500': '#6366f1',
  'bg-cyan-500': '#06b6d4',
  'bg-teal-500': '#14b8a6',
  'bg-accent': '#64748b',
  'bg-violet-500': '#8b5cf6',
  'bg-lime-500': '#84cc16',
  'bg-amber-500': '#f59e0b',
  'bg-rose-500': '#f43f5e',
  'bg-sky-500': '#0ea5e9',
  'bg-fuchsia-500': '#d946ef',
} as const;

/** Resolve a Tailwind class to hex. Returns fallback if not mapped. */
export function resolveTailwindColor(twClass: string, fallback = '#64748b'): string {
  return TAILWIND_TO_HEX[twClass] || fallback;
}

// ---------------------------------------------------------------------------
// Chart Palette — reads from CSS vars (--chart-*), falls back to hex
// ---------------------------------------------------------------------------

const CHART_FALLBACKS = {
  indigo:  '#6366f1',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  violet:  '#8b5cf6',
  cyan:    '#06b6d4',
  orange:  '#f97316',
  teal:    '#14b8a6',
  blue:    '#3b82f6',
  green:   '#22c55e',
  yellow:  '#eab308',
  purple:  '#a855f7',
  pink:    '#ec4899',
  slate:   '#64748b',
} as const;

/** 8-color general-purpose chart palette, theme-aware. */
export function getChartPalette(): string[] {
  return [
    resolve('--chart-indigo',  CHART_FALLBACKS.indigo),
    resolve('--chart-emerald', CHART_FALLBACKS.emerald),
    resolve('--chart-amber',   CHART_FALLBACKS.amber),
    resolve('--chart-red',     CHART_FALLBACKS.red),
    resolve('--chart-purple',  CHART_FALLBACKS.violet),
    resolve('--chart-cyan',    CHART_FALLBACKS.cyan),
    resolve('--chart-orange',  CHART_FALLBACKS.orange),
    resolve('--chart-teal',    CHART_FALLBACKS.teal),
  ];
}

/** Static fallback for SSR or contexts that need a const array. */
export const CHART_PALETTE = [
  CHART_FALLBACKS.indigo,
  CHART_FALLBACKS.emerald,
  CHART_FALLBACKS.amber,
  CHART_FALLBACKS.red,
  CHART_FALLBACKS.violet,
  CHART_FALLBACKS.cyan,
  CHART_FALLBACKS.orange,
  CHART_FALLBACKS.teal,
] as const;

// ---------------------------------------------------------------------------
// Semantic Chart Colors
// ---------------------------------------------------------------------------

/** Prospecting call outcome colors */
export const OUTCOME_COLORS = {
  connected: '#10b981',
  no_answer: '#ef4444',
  voicemail: '#f59e0b',
  busy:      '#6b7280',
  other:     '#a78bfa',
} as const;

/** Revenue/area chart accent */
export const REVENUE_ACCENT = '#0ea5e9';

/** Default fallback when a stage has no color from DB */
export const DEFAULT_STAGE_COLOR = '#94a3b8';
export const DEFAULT_STAGE_COLOR_ALT = '#3b82f6';

// ---------------------------------------------------------------------------
// Chart Theme — theme-aware Recharts style props
// Reads from CSS vars (--chart-text, --chart-grid, etc.) with hex fallbacks.
// ---------------------------------------------------------------------------

export function getChartTheme(isDark: boolean) {
  return {
    grid:          resolve('--chart-grid',          isDark ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.1)'),
    tick:          resolve('--chart-text',           isDark ? '#94a3b8' : '#64748b'),
    text:          resolve('--chart-text',           isDark ? '#e2e8f0' : '#1e293b'),
    tooltipBg:     resolve('--chart-tooltip-bg',     isDark ? '#1e293b' : '#ffffff'),
    tooltipBorder: resolve('--chart-tooltip-border', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.1)'),
    cursor:        isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    itemStyle:     isDark ? '#bae6fd' : '#e2e8f0',
  } as const;
}

/** Legacy compat: same signature as old chartTheme() */
export const chartTheme = getChartTheme;

// ---------------------------------------------------------------------------
// Roadmap Phase Colors
// ---------------------------------------------------------------------------

export const ROADMAP_PHASE_COLORS = {
  next:      CHART_FALLBACKS.amber,   // #f59e0b
  planned:   '#60a5fa',               // blue-400
  completed: CHART_FALLBACKS.emerald, // #10b981
} as const;

export const ROADMAP_SECTION_COLORS = {
  primary: { hex: CHART_FALLBACKS.blue, glow: 'rgba(59, 130, 246, 0.2)' },
  emerald: { hex: CHART_FALLBACKS.emerald, glow: 'rgba(16, 185, 129, 0.2)' },
  sky:     { hex: '#60a5fa', glow: 'rgba(96, 165, 250, 0.2)' },
  amber:   { hex: CHART_FALLBACKS.amber, glow: 'rgba(245, 158, 11, 0.2)' },
} as const;

// ---------------------------------------------------------------------------
// Pipeline Config Colors (inbox ActivityTimeline color schemes)
// ---------------------------------------------------------------------------

export const PIPELINE_CONFIG_COLORS = {
  blue:   { border: CHART_FALLBACKS.blue,   bg: 'rgba(59, 130, 246, 0.1)',  text: '#60a5fa' },
  purple: { border: CHART_FALLBACKS.purple, bg: 'rgba(168, 85, 247, 0.1)', text: '#c084fc' },
  orange: { border: CHART_FALLBACKS.orange, bg: 'rgba(249, 115, 22, 0.1)', text: '#fb923c' },
} as const;

// ---------------------------------------------------------------------------
// Shadow Tokens (for inline styles where Tailwind classes don't apply)
// ---------------------------------------------------------------------------

export const SHADOW_TOKENS = {
  subtle:    '2px 0 4px -2px rgba(0, 0, 0, 0.06)',
  tooltip:   '0 4px 12px rgba(0, 0, 0, 0.1)',
  glow: {
    primary: 'rgba(59, 130, 246, 0.5)',
    success: 'rgba(34, 197, 94, 0.15)',
    error:   'rgba(239, 68, 68, 0.15)',
  },
} as const;

// ---------------------------------------------------------------------------
// Error Page Colors (global-error.tsx — inline styles for resilience)
// ---------------------------------------------------------------------------

export const ERROR_PAGE_COLORS = {
  bg:           '#020617',
  text:         '#f8fafc',
  textMuted:    '#94a3b8',
  textSubtle:   '#64748b',
  codeBg:       'rgba(255, 255, 255, 0.05)',
  errorIconBg:  'rgba(239, 68, 68, 0.15)',
  buttonBg:     '#0ea5e9',
  buttonHover:  '#0284c7',
  buttonText:   '#020617',
  linkText:     '#e2e8f0',
  linkBorder:   'rgba(255, 255, 255, 0.1)',
  linkHoverBg:  'rgba(255, 255, 255, 0.05)',
  footerText:   'rgba(148, 163, 184, 0.4)',
} as const;

// ---------------------------------------------------------------------------
// Typography Scale (semantic → Tailwind mapping reference)
// ---------------------------------------------------------------------------

export const TYPOGRAPHY_SCALE = {
  caption:  { class: 'text-xs',  size: '0.75rem',  weight: 'font-medium' },
  body:     { class: 'text-sm',  size: '0.875rem', weight: 'font-normal' },
  subtitle: { class: 'text-lg',  size: '1.125rem', weight: 'font-semibold' },
  title:    { class: 'text-xl',  size: '1.25rem',  weight: 'font-semibold' },
  heading:  { class: 'text-2xl', size: '1.5rem',   weight: 'font-bold' },
  display:  { class: 'text-3xl', size: '1.875rem', weight: 'font-bold' },
  hero:     { class: 'text-5xl', size: '3rem',     weight: 'font-bold' },
} as const;

// ---------------------------------------------------------------------------
// Spacing Scale (semantic → Tailwind mapping reference)
// ---------------------------------------------------------------------------

export const SPACING_SCALE = {
  '0':  '0px',
  '1':  '0.25rem',  // 4px
  '2':  '0.5rem',   // 8px
  '3':  '0.75rem',  // 12px
  '4':  '1rem',     // 16px
  '6':  '1.5rem',   // 24px
  '8':  '2rem',     // 32px
  '12': '3rem',     // 48px
} as const;

// ---------------------------------------------------------------------------
// Border Radius Scale
// ---------------------------------------------------------------------------

export const RADIUS_SCALE = {
  sm:   '0.25rem',  // 4px  — small elements, badges
  md:   '0.375rem', // 6px  — inputs, small cards
  lg:   '0.75rem',  // 12px — cards, modals (primary)
  full: '9999px',   // pill shapes, avatars
} as const;
