# Architect Agent Memory

## EPIC-ACT Wave 2 Quality Gate Review (2026-02-06)
- Reviewed: ACT-6 (Unified Activation Pipeline, 67 tests, APPROVED)
- Total EPIC-ACT: 255 tests pass across 4 test suites (0 regressions)
- UnifiedActivationPipeline: single entry point, 5-way parallel load, 3-phase sequential, GreetingBuilder final
- Timeout architecture: 150ms per-loader, 200ms total pipeline, fallback greeting on failure
- Timer leak concern: _timeoutFallback setTimeout not cancelled when pipeline wins the race (advisory, not blocking)
- generate-greeting.js refactored to thin wrapper; backward compatible
- All 12 agent .md files updated with unified STEP 3 reference
- *validate-agents command added to aios-master (validate-agents.md task file)

## EPIC-ACT Wave 1 Quality Gate Review (2026-02-06)
- Reviewed: ACT-1 (config fix, merged), ACT-2 (user_profile audit, 31 tests), ACT-3 (ProjectStatusLoader, 90 tests), ACT-4 (PermissionMode, 67 tests)
- All 188 tests pass across 3 test suites
- Key patterns: fingerprint-based cache invalidation, file locking with wx flag, mode cycling (ask>auto>explore)
- PermissionMode reads from `.aios/config.yaml`, NOT from `.aios-core/core-config.yaml` - different config hierarchy
- GreetingPreferenceManager reads from `.aios-core/core-config.yaml` (agentIdentity.greeting.preference)
- The *yolo command cycles PermissionMode; it does NOT directly change greeting preference

## Architecture Patterns to Track
- Agent activation: UnifiedActivationPipeline is now THE single entry point for all 12 agents (ACT-6)
- Previous two paths (Direct 9 agents + CLI wrapper 3 agents) are now unified
- generate-greeting.js is thin wrapper around UnifiedActivationPipeline (backward compat)
- user_profile cascades: config-resolver > validate-user-profile > greeting-preference-manager > greeting-builder
- Permission system: permission-mode.js + operation-guard.js + index.js (facade)
- ProjectStatusLoader: .aios/project-status.yaml (runtime cache), separate from .aios-core/ (framework config)
- PM agent bypasses bob mode restriction in _resolvePreference()

## Key File Locations
- Unified Pipeline: `.aios-core/development/scripts/unified-activation-pipeline.js`
- Permissions: `.aios-core/core/permissions/`
- Greeting system: `.aios-core/development/scripts/greeting-builder.js`, `greeting-preference-manager.js`
- Project status: `.aios-core/infrastructure/scripts/project-status-loader.js`
- User profile validation: `.aios-core/infrastructure/scripts/validate-user-profile.js`
- Post-commit hook: `.aios-core/infrastructure/scripts/git-hooks/post-commit.js` + `.husky/post-commit`
- Validate agents task: `.aios-core/development/tasks/validate-agents.md`

## Pre-existing Test Failures (not EPIC-ACT related)
- squads/mmos-squad/ (6 suites): missing clickup module
- tests/core/orchestration/ (2 suites): greenfield-handler, terminal-spawner

## ZmobCRM Brownfield Discovery (2026-03-06)

### Phase 1 - System Architecture (@architect)
- **Doc:** `docs/architecture/system-architecture.md` (931 lines, v2)
- **Version:** 1.5.1, branch develop, 54 migrations, 68 API routes, 18 protected pages
- **Stack:** Next.js 15.5.12 (App Router + Turbopack), React 19.2.1, Supabase, Tailwind v4, Zustand v5
- **AI:** Vercel AI SDK 6.0.72, 3 providers (Google/OpenAI/Anthropic), ToolLoopAgent with 27 tools
- **Top debt:** CRMContext monolith (930 lines), BASE_INSTRUCTIONS hardcoded (lists 15/27 tools), `any` everywhere (209 in lib/), rate limiter in-memory (won't work in serverless)
- **Prospecting module:** Largest feature (24 components, 25 tests, 7 hooks) but INVISIBLE to AI agent
- **Test coverage:** 65 test files, strong in prospecting, weak in contexts/auth/layout

### Phase 2 - Database Audit (@data-engineer)
- **Docs:** `supabase/docs/SCHEMA.md`, `supabase/docs/DB-AUDIT.md`
- **24 debits:** 0 CRITICAL, 6 HIGH, 14 MEDIUM, 4 LOW
- **Security:** system_notifications + rate_limits still have permissive RLS; merge_contacts() DEFINER lacks org check
- **Performance:** RLS subqueries in profiles for every request; get_dashboard_stats() does 6 separate COUNTs
- **Integrity:** updated_at triggers missing on main tables; client_company_id orphan column

### Phase 3 - Frontend/UX Spec (@ux-design-expert)
- **Doc:** `docs/frontend/frontend-spec.md` (1222 lines, v2)
- **25 debits:** 3 CRITICAL, 6 HIGH, 11 MEDIUM, 5 LOW
- **Critical:** Button duplicated (2 versions), CRMContext monolith (34KB), 4 giant components (110KB, 88KB, 76KB, 48KB)
- **Strengths:** a11y above average (lib/a11y), OKLCH tokens, 3-nav-pattern responsive, PWA
- **Debts:** no i18n, controller hooks 30-37KB, skeletons for only 4/18 routes, hex hardcoded in scrollbar/charts

### Phase 4 - Technical Debt DRAFT (@architect)
- **Doc:** `docs/prd/technical-debt-DRAFT.md` (v2)
- **67 total debits:** 6 CRITICAL, 19 HIGH, 30 MEDIUM, 12 LOW
- **Estimated effort:** ~430-560 hours

### Phase 5 - DB Specialist Review (@data-engineer)
- **5 debits REMOVED** (already fixed in migrations): DB-001, DB-002, DB-005, DB-008, DB-010
- **4 new debits** added: DB-022 (dashboard_stats DEFINER), DB-023 (rate_limits no org), DB-024 (notifications INSERT), DB-025 (merge SQL injection)
- **DB-006 elevated to CRITICAL** (merge_contacts DEFINER, only genuine CRITICAL in DB)
- **DB-014 elevated to HIGH** (LTV RPCs DEFINER)
- **4 rebaixados to LOW**: DB-011, DB-013, DB-016, DB-018
- Adjusted DB effort: ~64h (20 active debits)

### Phase 6 - UX Specialist Review (@ux-design-expert)
- **7 new debits** added: UX-026 (overlay inconsistent), UX-027 (z-index), UX-028 (error.tsx), UX-029 (not-found.tsx), UX-030 (a11y), UX-031 (empty states), UX-032 (destructive actions)
- **Button inversion**: 130 files import COPY, 2 import original (opposite of DRAFT description)
- **UX-011 elevated to HIGH** (2000+ occurrences of Tailwind direct colors)
- **UX-024 elevated to MEDIUM** (needed before UX-011 migration)
- **8 rebaixados**: UX-005, UX-007, UX-008, UX-010, UX-012, UX-015, UX-018, UX-019, UX-020
- Adjusted UX effort: ~180-280h (32 active debits)

### Phase 7 - QA Gate (@qa)
- **Gate: APPROVED** with 8 conditions for Phase 8
- 7 cross-area risks documented (RC-01 to RC-07)
- OWASP analysis: A01 (Broken Access Control) best covered, A07/A09/A10 NOT evaluated
- GAP-01 (API routes audit) and GAP-02 (AI tools security) flagged as areas not evaluated
- All 22 severity adjustments validated

### Phase 8 - FINAL Assessment (@architect) -- COMPLETED 2026-03-06
- **Doc:** `docs/prd/technical-debt-assessment.md` (v2.0 FINAL)
- **73 total active debits:** 4 CRITICAL, 16 HIGH, 26 MEDIUM, 27 LOW
- **Estimated effort:** ~420-590 hours (~250h without P4/P5)
- **6 waves:** Dead Code (30min) > Security+QuickWins (1-2w) > AI+Resilience (3-5w) > Frontend Quality (6-9w) > Structural Refactor (10-14w) > Maturity (backlog)
- **P0 emergency:** DB-006 (merge_contacts, 3h, must fix immediately)
- **Top 5:** DB-006, SYS-002, SYS-001, SYS-003, SYS-004
- **Next:** Phase 9 (@analyst executive report), Phase 10 (@pm epic + stories)
