# Brad Frost Agent Memory — ZmobCRM

## Project Design System State (2026-03-03)

- **Overall maturity score: 2.3/5** (as of Brownfield Discovery)
- Token architecture: 3-layer (Tailwind @theme primitives + shadcn inline semantic + custom OKLCH). Sound concept, leaky execution.
- Component library: `components/ui/` — 23 files. Shadcn atoms + custom molecules. No Skeleton, no Input atom, no Textarea atom, no Select (Radix), no Accordion wrapper.
- No Storybook. No visual regression tests.

## Critical Findings (do not re-investigate)

- `components/ui/` itself has 42 hardcoded color violations (slate/gray/white) — not just features
- 4 Radix primitives installed with zero usage: scroll-area, separator, slider, accordion (no wrapper)
- 3 dialog systems coexist without shared base (Modal, ActionSheet/Sheet, ConfirmModal)
- ConfirmModal does NOT compose Modal — re-implements overlay from scratch
- ActionSheet does NOT compose Sheet — duplicates FocusTrap/backdrop/animation logic
- No `Input` atom exists; input styles live inside FormField.tsx as local const
- `--primary` token (OKLCH) and `--color-primary-500` (hex) are two sources of truth for brand color
- Focus ring (.focus-visible-ring) uses hardcoded hex #2563eb, not var(--ring)
- Chart tokens use hardcoded hex, not OKLCH semantics

## Recommended Action Sequence

1. Add `Input.tsx` and `Textarea.tsx` as atoms
2. Clean 42 hardcodes inside `components/ui/` itself
3. Migrate chart tokens to semantic (3 lines in globals.css)
4. Add z-index token scale (prevents escalating z-[9999] pattern)
5. Remove/expose unused Radix primitives
6. Unify dialog hierarchy: Sheet → ActionSheet → Modal → ConfirmModal
7. Add PageLayout template component
8. Add StatusBadge and UserAvatar molecules
9. Storybook ONLY after atoms are stable

## Key File Paths

- Design tokens: `/app/globals.css` (482 lines)
- UI library: `/components/ui/` (23 files)
- Modal tokens: `/components/ui/modalStyles.ts`
- A11y library: `/lib/a11y/` (components + hooks)
- App shell template: `/components/Layout.tsx`
- Tailwind config: `/tailwind.config.js` (minimal — most config in globals.css @theme)
- Brad Frost review: `/docs/reviews/brad-frost-design-system-review.md`
