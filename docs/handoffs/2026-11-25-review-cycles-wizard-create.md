# Handoff: Review Cycles, phase 2B-1 (the create wizard in the web)

State at 2026-11-25. Uncommitted on `main`. Phase 2 has three parts: 2A (backend, done), 2B-1 (the create wizard, this handoff), 2B-2 (edit a draft, not started). Read it with the two handoffs before it.

## Objective

HR creates a draft cycle in the web: details, participants, templates, stages, review, then Save as Draft (PRD Cyc-001 to Cyc-004). Launch comes in phase 3.

## Current state (verified)

Failing test first on every slice. Commands run from the repository root.

| Slice                                                                                                                     | Command                                   | Red                 | Green    |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------- | -------- |
| Shared `reviewCycleOptionsSchema`                                                                                         | `pnpm --filter @pms/shared-types test`    | 2 fail              | 100 pass |
| Draft helpers: Manila instants and the round trip back to a day, the KPI match rule, the path to step map, default stages | `pnpm --filter @pms/web test cycle-draft` | 13 and 1 fail       | 28 pass  |
| Request builder `toCycleRequest`                                                                                          | same                                      | 5 fail              | pass     |
| Reader `getReviewCycleOptions` (the reader is now generic)                                                                | `... test review-cycle-reader`            | 4 fail              | 11 pass  |
| Server action `createReviewCycle`                                                                                         | `... test save-review-cycle`              | 7 fail              | 7 pass   |
| Participant step on the options                                                                                           | `... test participant-selection`          | 5 fail              | 7 pass   |
| Details form, controlled, DB codes, no description                                                                        | `... test cycle-details-form`             | 5 fail              | 6 pass   |
| Templates step                                                                                                            | `... test cycle-templates-step`           | 9 fail              | 9 pass   |
| Stages step                                                                                                               | `... test cycle-stages-step`              | 7 fail              | pass     |
| Wizard shell: steps, save, jump to the step of the first problem, leave guard, Activity reset, step names                 | `... test cycle-wizard`                   | 9 fail, then 1 fail | 10 pass  |
| Saved notice                                                                                                              | `... test review-cycle-saved-notice`      | 1 fail              | 5 pass   |

Totals after the last change: shared-types 100, backend 313 (unchanged), web 396 (44 files), database 15. `pnpm lint` and `pnpm typecheck` are clean for the web.

Tests that passed on a stub, each proven by a one-line mutation that went red and was restored:

- `toInstant` of an empty day: without the empty guard it fails.
- `stepOfPath`, the details cases: with the last return changed to `stages` they fail.
- `matchKpi`, the exact position: with a case-insensitive compare it fails. With `> 1` changed to `>= 0` the none cases fail.
- `newCycleDraft` is the same every time: with a random name it fails.
- The saved notice says nothing for `published` and for an array flag: with `!saved` it fails.
- The options reader `unavailable`: with no parse it fails.

The two empty states of the participant step (no employees, no match) are scaffold behavior from before, so they passed at once and are not a red of this work. Two tests of mine had a wrong expectation, not wrong code, and were corrected: a regex that lost a backslash, and the stepper text, which has no space after the number.

## What exists now

- `/review-cycles/new`: a wizard of five steps. Save as Draft runs the shared create schema on the client, opens the step of the first problem with its message, and otherwise calls the server action, which checks the body again, posts it, and redirects to `/review-cycles?saved=draft`.
- The register has a Create cycle button and a saved notice.
- The leave guard is the one of the behavioral builder: a browser prompt on tab close, a dialog on the back link, and a reset when Next keeps the hidden page (tested with `Activity`). The first render has no random value.

## Decisions and reasons

1. Weights are fixed at 50/50 (PRD 6.6), with no input. A KPI template is sent only when HR chose one: the server matches the one published template of the exact position, and the step says so first ("Matched: X", a select when several share the position, a message when none does).
2. The behavioral default and the position overrides expand on the client into one template id per participant. A participant with no position gets the default.
3. Dates are calendar days in Asia/Manila. A start of day is `T00:00:00+08:00`, an end of day (deadlines, verification) is `T23:59:59+08:00`. The round trip back from the UTC string the API stores is tested, including a day that crosses midnight UTC. Backend readiness still uses the UTC date for "today": the known gap, not changed.
4. The HR evaluator list leaves out the selected participants.
5. The scaffold `cycle-details-form` and `participant-selection` were adapted (they had no other caller). `cycle-setup-stepper` has the new step names. Not used in this phase, and not deleted: `evaluation-workflow`, `goal-mapping-editor`, `goal-readiness`, `release-settings`, `cycle-launch-summary`. They model operational goals, the release policy of Section 9, peer and upward stages, and the mock `@/types/employee`.
6. `ReviewCycleNotice` is shared by the register and the wizard page.

## Dead ends

- The wizard page logged a server rendering error in `next dev`: "Cannot read properties of undefined (reading 'standard')". The compiled chunk had `REVIEW_TYPE_LABELS` defined, the tests passed, and touching the files did not clear it. **Restarting `pnpm dev:web` cleared it with no code change**, so it was a stale server module in the running dev process (the export was added while it ran). Moving the options to render time did not help, and was reverted. A Next.js feedback report draft was opened for the user to review; nothing was sent.
- A test that renders the wizard to HTML in a node environment (to tell a code fault from a stale server) cannot run: `tests/setup.ts` uses `window`. Removed.
- The pane does not hydrate a page on its first load: log in with Enter after a second read of the page.

## Live check (ran, with the user's yes to a save)

Against the running web (`localhost:3000`) and API, signed in as the seed admin `lebronjames`, after the dev server restart:

- `/review-cycles/new` renders on the server with no bailout, and with the review type in words.
- The wizard was filled and saved through the browser: details, one participant (Iging DotTech), a behavioral default, a KPI template chosen from the select (two published templates share the position "Software Engineer"), three stage deadlines, and an HR evaluator. The HR list left out Iging DotTech, who is a participant.
- Save as Draft went to `/review-cycles?saved=draft`, with the notice, and the register lists "ZZ wizard check" as Draft with 1 participant and the last stage deadline.
- Read back through the API: state `draft`, weights 0.5 and 0.5, assessment start `2027-03-31T16:00:00.000Z` (1 April 00:00 in Manila), deadlines at `15:59:59Z` (end of day in Manila), the HR stage names the evaluator and the other two stages have none, the participant has both a KPI and a behavioral version, and readiness returns an empty list.
- At 320 px in the dark theme the page has no horizontal scroll, and the stepper wraps.

The draft stays in the local database: id `7d47ea3a-ec86-4120-abde-c13b7b14dbf4`, "ZZ wizard check". It has one `audit_events` row (append-only). Cancel it from the API if it is in the way.

## File inventory

New (web, `web/src/features/review-cycles/`): `components/cycle-wizard.tsx`, `cycle-templates-step.tsx`, `cycle-stages-step.tsx`, `review-cycle-saved-notice.tsx`, `services/cycle-draft.ts`, `services/save-review-cycle.ts`; `components/cycle-review-summary.tsx` (the review step, split out of the wizard to keep each function small); `web/src/app/(workspace)/review-cycles/new/page.tsx`. Changed: `components/cycle-details-form.tsx`, `participant-selection.tsx`, `cycle-setup-stepper.tsx`, `review-cycles-content.tsx`, `api/review-cycle-requests.ts`, `services/review-cycle-reader.ts`, the register page. Shared: `review-cycle.schema.ts` and its test. Tests: `web/tests/unit/cycle-draft.test.ts`, `web/tests/component/cycle-*.test.tsx`, `participant-selection.test.tsx`, `review-cycle-saved-notice.test.tsx`, `web/tests/integration/save-review-cycle.test.ts`, and the reader test.

## Not done

- `toDateInput` has only a test as a caller so far. 2B-2 is its first real caller (it turns a stored instant back into the day of a date input).
- 2B-2: `/review-cycles/[cycleId]/edit` for drafts only, rebuilt from the saved detail and saved with `PUT`; readiness shown per step; the draft name in the register links to it. The backend must then return `kpiTemplateId` and `behavioralTemplateId` for each participant (batched lookups, with a company filter), and the web must keep a stored template id only if it is still in the options: an archived template would otherwise make the resend answer 400 and block the draft. Each save re-resolves to the current published version, which is right for a draft: the version freezes at launch. The shared detail and readiness schemas land there, validated against a live `GET` (the participants have no `createdAt`).
- 375, 768, and 1440 px widths, the light theme at phone width, and 200% zoom on the wizard (320 px dark was checked). The keyboard path and the select popups were not tested by keyboard.
- `next build` (do not run it while `next dev` serves).

## Opening prompt for 2B-2

```text
Basahin muna ang AGENTS.md, CLAUDE.md, backend/AGENTS.md, web/AGENTS.md, web/llm.txt, web/DESIGN.md, at ang tatlong handoff ng Review Cycles sa docs/handoffs (2026-11-25-review-cycles-backend-and-list.md, ...-participants-and-readiness.md, ...-wizard-create.md). Tawagin mo si Hersvin na "boss hersvin". Taglish at Caveman ultra ang sagot. Failing test muna sa bawat slice, at i-report ang red at green run na may command. Wag mag-run ng SQL sa database ko. Walang commit o push hanggang sabihin ko.

Phase 2B-2: ang edit ng draft. Sundin ang seksyong "Not done" ng handoff ng 2B-1. Tawagin ang advisor bago magsulat ng code at bago sabihing tapos.
```
