# Handoff: Review Cycles, phase 2B-2 (edit a draft)

State at 2026-11-25. Uncommitted on `main`. Phase 2 is whole: the create, the edit, and the saves of both ran from the browser. Read it with the handoffs before it.

## Objective

HR opens a saved draft, changes it in the same wizard, sees what blocks its launch per step, and saves it with `PUT`.

## Current state (verified)

Failing test first on every slice. Commands run from the repository root.

| Slice                                                                                                   | Command                                                                    | Red     | Green    |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------- | -------- |
| Backend detail returns `kpiTemplateId` and `behavioralTemplateId` per participant (two batched queries) | `pnpm --filter @pms/backend test review-cycles.service`                    | 1 fail  | 36 pass  |
| Shared `reviewCycleDetailSchema` and `reviewCycleReadinessSchema`                                       | `pnpm --filter @pms/shared-types test`                                     | 3 fail  | 103 pass |
| `draftFromDetail`                                                                                       | `pnpm --filter @pms/web test cycle-draft`                                  | 5 fail  | 36 pass  |
| Readers `getReviewCycle` and `getReviewCycleReadiness`, action `updateReviewCycle`, the updated notice  | `... test review-cycle-reader save-review-cycle review-cycle-saved-notice` | 17 fail | 41 pass  |
| Wizard edit mode, readiness per step                                                                    | `... test cycle-wizard`                                                    | 5 fail  | 17 pass  |
| Draft name links to the edit page, the not-a-draft notice                                               | `... test review-cycles-table review-cycles-content`                       | 2 fail  | pass     |

Totals after the last change: shared-types 103, backend 315, web 439 (44 files), database 15. `pnpm lint` and `pnpm typecheck` are clean.

Tests that passed on a stub, each proven by a one-line mutation that went red and was restored:

- `draftFromDetail` drops an archived behavioral template: without the offered check it fails.
- It drops a KPI template of another position: without the position check it fails.
- It drops a participant that the options no longer list: without the filter it fails.
- The wizard has nothing to discard until an edit: with "dirty" compared against a blank draft it fails; with `isDirty` always false the leave tests fail.
- A cycle that is not a draft gets no link: with every row linked, the four state cases fail.

## Live check (read, and one save with the user's yes)

Against the running web and API, signed in as the seed admin `lebronjames`:

- The shared detail, readiness, and options schemas parse the real responses of all three cycles.
- `/review-cycles/<draft id>/edit` renders on the server with no bailout, opens with the saved name and the dates back as the days that were typed (1 and 30 April), restores the saved choices on the templates step (the behavioral default, the KPI template chosen from the two that share the position), and says on the review step that nothing blocks the launch.
- The register links only the draft to its edit page.
- **An edit was saved from the browser**: on the draft "ZZ wizard check", the name changed to "ZZ wizard check (edited)" and the verification deadline from 30 April to 5 May. The page went to `/review-cycles?saved=updated` with the "Cycle updated" notice. Read back through the API: state still `draft`, the new deadline stored as `2027-05-05T15:59:59Z` (end of the day in Manila), the participant kept with both its KPI and behavioral version, the three stages kept with the same deadlines and the HR evaluator, and readiness empty. Nothing was lost by the `PUT`. It added one `audit_events` row (append-only).
- The active seed cycle's edit URL shows "This cycle cannot be edited". A route id that is not a GUID shows the not-found page.

## Decisions and reasons

1. The detail names the template of each frozen version through the version rows, with no extra template read. A re-edit sends the same ids. Each save re-resolves a template to its current published version: right for a draft, because the version freezes at launch.
2. `draftFromDetail` keeps a template or an employee only if the options still offer it. A stored archived template, a KPI template of another position, or an employee who left would make the save answer 400 and block HR from fixing the draft. The user sees the draft without them, and the readiness list asks for a new choice. The default behavioral template is the most used one, and a position whose participants differ gets an override.
3. A saved draft opens every step (the stepper allows all five). Leaving, or Next hiding the page, returns it to the saved draft, not to a blank one. "Dirty" means different from the saved draft.
4. The page checks the state: only a draft opens the wizard. Other states show a notice, an id that is not a GUID or a missing cycle shows the not-found page.
5. A save removes the saved participants that the options no longer list, so the wizard says so first. The page compares the saved participants with the draft and passes the count: "N saved participants are no longer active in your company. A save removes them." on the participants step and the review step. Without it a save with no change would delete rows without a word.
6. Readiness is read when the page loads. The list says "As saved. Save the draft to check again.", because it does not follow the edits that HR has not saved.
7. Readiness itself does not flag an inactive employee: its employee query has no status filter (the same small gap as the HR evaluator). The note above is the only warning.
8. `draftFromDetail` is split into `behavioralChoicesOf`, `kpiChoicesOf`, and `stagesOf`, and the wizard keeps its notices in `WizardNotices`, so no function is over the size rule.

## Dead ends

None new. The two bugs of mine in the first test run (a regex that lost a backslash, a step name without a space) are in the 2B-1 handoff.

## File inventory

New (web): `web/src/app/(workspace)/review-cycles/[cycleId]/edit/page.tsx`. Changed (web, `src/features/review-cycles/`): `components/cycle-wizard.tsx`, `cycle-review-summary.tsx`, `review-cycles-table.tsx`, `review-cycles-content.tsx`, `review-cycle-saved-notice.tsx`, `services/cycle-draft.ts`, `services/review-cycle-reader.ts`, `services/save-review-cycle.ts`, `api/review-cycle-requests.ts`. Backend: `review-cycles.service.ts` and its spec. Shared: `review-cycle.schema.ts` and its test. Docs: this file, the index row.

## Not done

- The 403 for a non-admin account, 375, 768, and 1440 px, the light theme at phone width, 200% zoom, keyboard use of the selects, and `next build` (do not run it while `next dev` serves).
- The edit of a draft whose template was archived since, in the browser (covered by the unit test of `draftFromDetail` only).
- Phase 3, launch, and phase 4, All Reviews, are not started. `toDateInput` now has its first real caller (`draftFromDetail`).

## Opening prompt for phase 3

```text
Basahin muna ang AGENTS.md, CLAUDE.md, backend/AGENTS.md, web/AGENTS.md, web/llm.txt, web/DESIGN.md, at ang apat na handoff ng Review Cycles sa docs/handoffs (2026-11-25-review-cycles-backend-and-list.md, ...-participants-and-readiness.md, ...-wizard-create.md, ...-wizard-edit.md). Tawagin mo si Hersvin na "boss hersvin". Taglish at Caveman ultra ang sagot. Failing test muna sa bawat slice, at i-report ang red at green run na may command. Wag mag-run ng SQL sa database ko: SQL script lang ang gawin mo, ako ang magru-run. Walang commit o push hanggang sabihin ko.

Phase 3 ng Review Cycles: ang launch. Sundin ang seksyong "Phase 3" ng plan sa handoff ng phase 1 at ng 2A: POST :id/launch sa isang transaction (lock sa row, draft papuntang active, readiness ulit, assignments na may ON CONFLICT DO NOTHING, audit row), ang dialog bago mag-launch, at ang dialog ng cancellation na may reason. Tawagin ang advisor bago magsulat ng code at bago sabihing tapos.
```
