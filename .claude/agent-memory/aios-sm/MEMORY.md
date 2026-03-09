# SM Agent Memory — ZmobCRM Brownfield

## Story Rework Protocol (confirmed pattern)

When performing @po-requested rework on a story, the standard fix set includes:
- SYS-1: CodeRabbit Integration section (after Dev Notes)
- SYS-2: Testing subsection inside Dev Notes
- SYS-3: Source Tree subsection inside Dev Notes (with exact file paths and line numbers)
- SYS-4: Decompose Tasks into actionable Subtasks

Additional required sections if missing: Dependencies, Risks, Business Value, Criteria of Done.

## Story Structure Checklist (quick reference)

Required sections in every story:
1. Metadata + Executor Assignment
2. Story (user story sentence)
3. Descricao (context, root cause)
4. Acceptance Criteria (Given/When/Then)
5. Scope (IN / OUT)
6. Dependencies
7. Risks
8. Business Value
9. Criteria of Done
10. Tasks (with Subtasks)
11. Dev Notes (with Source Tree + Testing subsections)
12. CodeRabbit Integration
13. File List (placeholder if new)
14. Change Log

## Project-Specific Notes

- Stories path: `docs/stories/active/`
- Story naming: `{epicId}.{storyNum}-{slug}.story.md`
- Staging DB has real data — testing notes should reference staging
- Kanban quick-add (QuickAddType) is separate from activity type enum — scope OUT by default
- activity-tools.ts already includes WHATSAPP (Epic TD) — reference as "confirmado" never "provavelmente"
