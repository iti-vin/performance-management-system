# Handoff: Review Cycles, phase 3B (launch and cancel in the web)

State at 2026-11-25. Uncommitted on `main`. The web side of phase 3. Read it with the 3A handoff (the backend) and the handoffs before it.

## Objective

HR launches a ready draft from the edit page, after a dialog that says what cannot be undone, and cancels a draft with a reason (PRD 6.11, Cyc-006, Cyc-007).

## Current state (verified)

Failing test first on every slice. Commands run from the repository root.

| Slice                                                                                                                 | Command                                                               | Red     | Green    |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------- | -------- |
| Shared `cancelReviewCycleRequestSchema`                                                                               | `pnpm --filter @pms/shared-types test`                                | 1 fail  | 104 pass |
| Actions `launchReviewCycle` and `cancelReviewCycle` (and the save actions on a shared request helper)                 | `pnpm --filter @pms/web test manage-review-cycle save-review-cycle`   | 16 fail | 31 pass  |
| Launch confirmation text, the launched and cancelled notices, the Launch and Cancel buttons and dialogs of the wizard | `... test launch-confirmation review-cycle-saved-notice cycle-wizard` | 12 fail | 40 pass  |

Totals after the last change: shared-types 104, backend 336 (unchanged), web 471 (46 files), database 15. `pnpm lint` and `pnpm typecheck` are clean.

Stub-passing test, proven by a mutation that went red and was restored: "offers neither on the review step of a new cycle" (with the buttons always offered it fails). Three expectations of mine were wrong, not the code, and were corrected: the 422 error code of a fixture (the API sends `(422) BUSINESS_RULE`), the singular of the confirmation text, and the reason dialog, whose button stays on and refuses an empty reason with "Reason is required." instead of being disabled.

## What exists now

- On the review step of a saved draft (the edit page): **Launch Cycle** and **Cancel Cycle**. Launch is off while the saved draft has problems ("Fix the problems above before you launch.") and while there are unsaved edits ("Save your changes first. A launch uses the saved draft."), because a launch uses the saved draft, not the screen. A new cycle has neither button.
- Launch opens a confirmation dialog that names the cycle and says what cannot be undone: the assignments of N participants are created, the templates freeze, the cycle can only be cancelled. Confirm calls `launchReviewCycle`: on success the page goes to `/review-cycles?saved=launched` (notice "Cycle launched"); on a refusal the reason shows in an alert and the page stays. A 422 lists the problems of the API.
- Cancel Cycle opens a reason dialog. The reason is trimmed and checked again by the shared schema in the action. Success goes to `?saved=cancelled`.
- The actions check the id and the body again, map 401, 403, 404, and 409 to their own words, and keep addresses and headers out of any message. `cycle-request.ts` is the one helper that the save, launch, and cancel actions share.

## Decisions and reasons

1. Launch and cancel live on the edit page because it is the only page of a draft. Cancelling an `active` cycle has no page yet: it waits for a cycle detail page. Trigger: that page.
2. The wizard receives the two actions as props (`edit.onLaunch`, `edit.onCancel`), bound to the cycle id by the page, so the component stays testable and has no server import.
3. The cancel body is sent as the object `{ reason }`, so the same shared schema checks it on the client and in the action.
4. The words of the dialog come from `launch-confirmation.ts`, one place, tested as text. They name the cycle, the effects that cannot be undone, and the resulting state (Active), as PRD 6.11 asks.
5. The buttons, the two dialogs, and their handlers are in `cycle-manage.tsx`, split out of the wizard to keep each function within the size rule. The wizard passes a `run` function that runs an action as a transition and shows its message under a title ("The cycle was not launched", "...not cancelled") when it fails.
6. When Launch Cycle is off, the reason is a paragraph that the button points at with `aria-describedby`, so a screen reader announces it.
7. `cycle-request.ts` is `server-only`, like the other modules that read the session cookie.

## Dead ends

None new.

## Live pass (ran, with the user's yes to two throwaway drafts)

Against the running web and API, signed in as the seed admin `lebronjames`. Two ready drafts were created through the API (the wizard saves were already proven in 2B), "ZZ launch check" (`88f0657a-b2ac-4031-9879-17e3b6592dc3`) and "ZZ cancel check" (`09866e76-2c69-44ae-9acb-d163fe8a70b7`), each with one participant, a KPI template chosen from the two that share the position, and a behavioral template. Readiness of both was empty.

- **Disabled states.** On "ZZ cancel check", a typed but unsaved change to the name left Launch Cycle disabled, and its `aria-describedby` pointed at "Save your changes first. A launch uses the saved draft." (the page was reloaded with the change discarded).
- **Cancel dialog.** Cancel Cycle with no reason: the dialog stayed open and said "Reason is required.". With a reason: the page went to `/review-cycles?saved=cancelled`, with the notice "Cycle cancelled", and the register shows the cycle as Cancelled.
- **Launch dialog.** On "ZZ launch check", Launch Cycle opened the dialog with the cycle name, "creates the assignments of 1 participant", "It becomes Active.", the freeze, and "This cannot be undone." The dialog's Cancel button closed it and launched nothing (the API still showed a draft with 0 assignments).
- **Launch.** Confirming went to `/review-cycles?saved=launched`, with the notice "Cycle launched". The register shows the cycle as Active with 3 assignments (0 submitted).

Left in the local database: one active cycle with 3 assignments ("ZZ launch check", it can only be cancelled now) and one cancelled cycle ("ZZ cancel check"), with their audit rows (append-only).

## File inventory

New (web, `src/features/review-cycles/`): `components/cycle-manage.tsx`, `services/manage-review-cycle.ts`, `services/cycle-request.ts`, `services/launch-confirmation.ts`. Changed: `components/cycle-wizard.tsx`, `review-cycle-saved-notice.tsx`, `services/save-review-cycle.ts` (on the shared helper), `api/review-cycle-requests.ts`, and the edit page. Shared: `review-cycle.schema.ts` and its test. Tests: `web/tests/integration/manage-review-cycle.test.ts`, `web/tests/unit/launch-confirmation.test.ts`, and the additions to the wizard and notice tests. Docs: this file, the index row.

## Not done

- `security-auditor` for the whole module runs at its close, after phase 4, not now.
- The live 422 in the browser: it can only come from a race, because the button is off while readiness has problems. It stays covered by the unit tests.
- The disabled state for a saved draft with readiness problems (the unsaved state was seen live; the problems state is covered by the unit tests).
- the 403 for a non-admin, 375, 768, and 1440 px, the light theme at phone width, 200% zoom, keyboard use of the dialogs, and `next build`.
- Cancelling an active cycle (decision 1).
- Phase 4, All Reviews (`/reviews`), and the assessment module. The assessment module must require its cycle to be `active` on every assignment read and write (see the 3A handoff).

## Opening prompt for phase 4

```text
Basahin muna ang AGENTS.md, CLAUDE.md, backend/AGENTS.md, web/AGENTS.md, web/llm.txt, web/DESIGN.md, at ang mga handoff ng Review Cycles sa docs/handoffs (lalo na ang launch-backend at launch-web). Tawagin mo si Hersvin na "boss hersvin". Taglish at Caveman ultra ang sagot. Failing test muna sa bawat slice, at i-report ang red at green run na may command. Wag mag-run ng SQL sa database ko: SQL script lang ang gawin mo, ako ang magru-run. Walang commit o push hanggang sabihin ko.

Phase 4 ng Review Cycles: ang All Reviews (/reviews), isang read-only na listahan ng assignments. Admin: lahat ng assignment ng company. Employee at manager: ang sarili lang (subject o evaluator). Ang mga filter at search ay tumatakbo sa parehong authorized na set ng counts. Tawagin ang advisor bago magsulat ng code at bago sabihing tapos.
```
