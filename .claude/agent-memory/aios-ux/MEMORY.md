# UX Design Expert Agent Memory

## ZmobCRM Frontend Architecture (confirmed 2026-03-03)

### Stack
- Next.js 15.5 (App Router, Turbopack), React 19.2, TS strict, Tailwind v4 (CSS-first @theme)
- shadcn/ui (Radix + CVA), Zustand stores, TanStack Query, Framer Motion (limited)
- Design tokens: 3-layer system (Tailwind @theme -> shadcn semantic -> custom OKLCH)
- Dark mode: class-based `.dark`, default on, persisted in localStorage

### Key Patterns
- Button has 2 copies: `components/ui/button.tsx` and `app/components/ui/Button.tsx` (unstyled variant)
- Modal system: centralized tokens in `modalStyles.ts`, sidebar-aware overlay offset
- Responsive: 3-mode (mobile <768, tablet 768-1280, desktop >=1280) via `useResponsiveMode()`
- Navigation: BottomNav (mobile), NavigationRail (tablet), Sidebar (desktop)
- A11y library: `lib/a11y/` with FocusTrap, SkipLink, LiveRegion, useFocusReturn, useAnnounce
- 10 composed providers in `app/(protected)/providers.tsx`
- CRMContext (33KB) is legacy monolith, domain contexts preferred

### Known Debts (UX)
- Button duplication (DEBT-001)
- Missing skeletons (DEBT-002)
- Giant components: FocusContextPanel 109KB, DealDetailModal 87KB, BoardCreationWizard 75KB
- No i18n (all strings hardcoded PT-BR)
- Hex colors in scrollbar/chart tokens instead of OKLCH
- Controller hooks too large (30KB+)

### File Paths
- Design tokens: `app/globals.css`
- App shell: `components/Layout.tsx`
- UI components: `components/ui/`
- Stores: `lib/stores/index.ts`
- A11y: `lib/a11y/`
- Responsive: `lib/utils/responsive.ts`
- Query config: `lib/query/index.tsx`
- Frontend spec: `docs/frontend/frontend-spec.md`
