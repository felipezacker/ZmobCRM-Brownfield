# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-25

### Features

- **activities:** Replace deal select with searchable combobox (type-ahead, keyboard nav, clear button)

### New Files

- `components/ui/DealSearchCombobox.tsx` — Reusable deal search picker (adapts ContactSearchCombobox pattern)

## [1.1.0] - 2026-02-24

### Features

- **activities:** Add date filter dropdown, date range picker, and sort order toggle
- **activities:** Separate activities and history into tabs, update date presets (Atrasadas, Hoje, Amanha, Esta semana, Este mes, Personalizado)

### Bug Fixes

- **a11y:** Add aria-labels to calendar nav, day buttons, sort and period selects
- **lint:** Replace raw `<button>` with `<Button>` design system component in activity tabs
- **code:** Extract shared DatePreset/SortOrder types, fix import aliases, remove stale JSDoc
- **perf:** Derive thisWeek/thisMonth from cached todayTs instead of redundant `new Date()`

### Technical

- New `features/activities/types.ts` shared type module
- New `components/ui/date-range-picker.tsx` with Radix Popover + date-fns
- All CodeRabbit PR #8 findings addressed

## [1.0.1] - 2026-02-24

### Features

- **monitoring:** Add Sentry infrastructure and token coverage report
- **a11y:** Add keyboard navigation and ARIA to Kanban board (FE-017)
- **ui:** Make AI Panel responsive with fullscreen mobile (FE-006)
- **api:** Add in-memory rate limiting to public API v1 (TD-017)
- **ui:** Create reusable EmptyState component and migrate 7 locations (FE-019)

### Bug Fixes

- **rls:** Add organization_id and owner_id to activities insert
- **db:** Address 5 CodeRabbit findings — RLS tenant isolation + trigger security
- **ui:** Standardize border-radius to 4 variations (FE-013)
- **ui:** Standardize font-weight to 3 variations (FE-015)
- **layout:** Eliminate hydration flash on mobile (FE-009)

### Refactoring

- Migrate raw `<button>` to `<Button>` design system component (83 files)
- Eliminate CRMContext monolith [Story 1.5]
- Flatten provider nesting + consolidate profiles columns

## [1.0.0] - 2026-02-23

- Initial release — ZmobCRM Brownfield baseline after technical debt resolution (Epic-TD)
