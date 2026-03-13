/**
 * Chart color palette — re-exports from centralized design tokens.
 *
 * All chart components should import from here or from '@/lib/design-tokens'.
 * Recharts/SVG APIs require actual color values (not CSS classes).
 *
 * @see lib/design-tokens.ts for the canonical token definitions.
 */

export {
  CHART_PALETTE,
  getChartPalette,
  OUTCOME_COLORS,
  REVENUE_ACCENT,
  DEFAULT_STAGE_COLOR,
  DEFAULT_STAGE_COLOR_ALT,
  chartTheme,
  getChartTheme,
} from '@/lib/design-tokens';
