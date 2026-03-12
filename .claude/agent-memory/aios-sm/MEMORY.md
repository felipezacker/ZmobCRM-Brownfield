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
- RT Epic stories use naming `docs/stories/RT-{n}.{m}.story.md` (flat, no slug, no active/ subdir)

## Realtime Architecture (Epic RT — confirmed 2026-03-12)

- `lib/realtime/useRealtimeSync.ts`: hook central; `useRealtimeSyncAll` (linha 191) cobre deals/contacts/activities/boards/prospecting_*; `useRealtimeSyncKanban` cobre deals/board_stages/contacts
- `board_stages` NAO esta em `useRealtimeSyncAll` — apenas em `useRealtimeSyncKanban`
- Layout global: `components/Layout.tsx` e Client Component (tem useState/useEffect) — pode receber hooks diretamente
- App shell renderizado via `app/(protected)/providers.tsx` linha 61: `<Layout>{children}</Layout>`
- Header app: `components/layout/AppHeader.tsx` — renderizado em `Layout.tsx:144`; props atuais: isGlobalAIOpen, onToggleAI, debugEnabled, onToggleDebug
- `refetchOnWindowFocus` override status: deals (true), dealsView (true), boards (true), boardStages (true) = false; contacts (false) = ainda true; activities (false) = ainda true — RT-3.2 adiciona override em contacts e activities
- `isConnected` atual em useRealtimeSync: booleano simples — RT-3.2 adiciona `connectionStatus: 'connected'|'disconnected'|'reconnecting'`
