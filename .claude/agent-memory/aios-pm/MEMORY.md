# PM Agent Memory -- ZmobCRM Brownfield

## Brownfield Discovery Phase 10 v2 (2026-03-06)
- Epic TD (v2) created at `docs/stories/epics/epic-td-technical-debt-resolution.md`
- Supersedes: `docs/stories/epics/epic-technical-debt-resolution.md` (v1, TDR prefix, 2026-03-03)
- 10 stories across 6 waves in `docs/stories/active/TD-*.story.md`
- All 73 active debt IDs covered (assessment v2.0 FINAL)
- Wave structure: W0=DeadCode+DB-006, W1=Security+QuickWins, W2=IA+Resilience, W3=Frontend+DesignSystem, W4=Structural, W5=Maturity
- Critical dependency chains: DB-006 -> SYS-004, UX-001 -> UX-003, SYS-002 -> SYS-012/013, UX-024 -> UX-011, Tests -> SYS-001
- i18n (UX-005) deferred as P5 -- no market demand
- Cost: R$ 58.500 - R$ 90.150 (R$ 75.000 medio), ROI 6.3:1

## Story Naming Convention (v2)
- Pattern: `TD-{wave}.{story}-{short-name}.story.md`
- Example: `TD-0.1-dead-code-cleanup.story.md`
- Located in: `docs/stories/active/`
- Old pattern (deprecated): `TDR-{sprint}.{story}-{short-name}.story.md`

## Story Map
| ID | Title | Wave | Debits |
|----|-------|------|--------|
| TD-0.1 | Emergencia DB-006 + Dead Code | 0 | DB-006, UX-018/019/020/025, UX-010 |
| TD-1.1 | Security DEFINER + RLS | 1 | DB-025/014/022/019/012 |
| TD-1.2 | Quick Wins: Button + a11y + AI SDK | 1 | UX-001/021/030/012/015, SYS-011/015/024, DB-024 |
| TD-2.1 | Resilience UX: Error boundaries | 2 | UX-028/029/026/027/016 |
| TD-2.2 | IA: BASE_INSTRUCTIONS + Tools | 2 | SYS-002/014/004/005/012/013 |
| TD-3.1 | Frontend: Giants + Skeletons | 3 | UX-003/004/009/008/017/013/007 |
| TD-3.2 | DB: RLS + Phone Sync + Perf | 3 | DB-007/015/009/024 |
| TD-4.1 | Structural: CRMContext + Hooks | 4 | SYS-001, UX-002/006 |
| TD-4.2 | Structural: Types + Deps + CSP | 4 | SYS-003/008/007/017, DB-004/003 |
| TD-5.1 | Maturity: E2E + Tokens + Backlog | 5 | ~24 remaining debts |

## Assessment References
- Technical Debt Assessment v2.0 FINAL: `docs/prd/technical-debt-assessment.md` (73 debts)
- Executive Report v2.0: `docs/reports/TECHNICAL-DEBT-REPORT.md`
- QA Review v2: `docs/reviews/qa-review.md`
- Old epic (v1, deprecated): `docs/stories/epics/epic-technical-debt-resolution.md` (84 debts, TDR prefix)
