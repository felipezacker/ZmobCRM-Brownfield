/**
 * Centralized chart color palette.
 * All chart components must import from here instead of hardcoding hex values.
 * Recharts/SVG APIs require actual color values (not CSS classes).
 */

/** General-purpose chart palette (8 colors) */
export const CHART_PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
] as const;

/** Prospecting call outcome colors */
export const OUTCOME_COLORS = {
  connected: '#10b981',
  no_answer: '#ef4444',
  voicemail: '#f59e0b',
  busy: '#6b7280',
  other: '#a78bfa',
} as const;

/** Revenue/area chart accent */
export const REVENUE_ACCENT = '#0ea5e9';

/** Default fallback when a stage has no color from DB */
export const DEFAULT_STAGE_COLOR = '#94a3b8';
export const DEFAULT_STAGE_COLOR_ALT = '#3b82f6';

/** Theme-aware chart tokens for Recharts style props */
export const chartTheme = (isDark: boolean) => ({
  grid: isDark ? '#334155' : '#e2e8f0',
  tick: isDark ? '#94a3b8' : '#64748b',
  text: isDark ? '#e2e8f0' : '#1e293b',
  tooltipBg: isDark ? '#1e293b' : '#ffffff',
  tooltipBorder: isDark ? '#334155' : '#e2e8f0',
  cursor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
  itemStyle: isDark ? '#bae6fd' : '#e2e8f0',
}) as const;
