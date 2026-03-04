# PM Agent Memory -- ZmobCRM Brownfield

## Brownfield Discovery Phase 10 (2026-03-03)
- Epic TDR created at `docs/stories/epics/epic-technical-debt-resolution.md`
- 23 stories across 5 sprints in `docs/stories/active/TDR-*.story.md`
- All 79 active debt IDs covered (TD-DB-027, TD-DB-028 are informational/not-debts)
- Sprint structure: S1=Security, S2=ErrorHandling+Perf, S3=Architecture, S4=UX+Design, S5=Cleanup
- Critical dependency chains: TDR-3.1 -> TDR-3.2 -> TDR-3.3, TDR-4.1 -> TDR-4.2
- i18n (TD-UX-004, TD-CC-003) deferred as P5 -- no market demand

## Story Naming Convention
- Pattern: `TDR-{sprint}.{story}-{short-name}.story.md`
- Example: `TDR-1.1-fix-webhook-function.story.md`
- Located in: `docs/stories/active/`

## Assessment References
- Technical Debt Assessment FINAL: `docs/prd/technical-debt-assessment.md` (84 debts, 79 active)
- Executive Report: `docs/reports/TECHNICAL-DEBT-REPORT.md`
- QA Review: `docs/reviews/qa-review.md`
