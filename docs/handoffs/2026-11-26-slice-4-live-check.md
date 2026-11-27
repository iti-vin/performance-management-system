# Handoff: slice 4 live check, and two form fixes

Date of this state: 2026-11-26. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-26-sample-alignment-slice-4.md`. That handoff says the editable controls were not seen in a browser and that writes 2 to 4 are open: both are closed here.

## Objective

See the editable rating buttons, the completion panel, and the indicator fields in a real browser, on a new demo cycle.

## State

| Item                                              | State                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Four writes approved by the user                  | All done and read back after a reload                                                 |
| Rating buttons, completion panel, indicator table | Seen live, work                                                                       |
| Two bugs found and fixed test first               | A problem of a field stayed after the field was changed (review form and goal record) |
| Check query of the database                       | Written below. Not run: the user runs SQL                                             |

Verified on 2026-11-26, from the repository root, after the last change: `pnpm test` (shared-types 130, backend 558 in 27 files, web 790 in 65 files), `pnpm --filter @pms/database test` (18), `pnpm lint`, and `pnpm typecheck`: all pass.

## The demo cycle

`ZZ slice 4 live check`, id `f67833ad-5445-42a9-b3c8-55d26b204024`, settings of the phase 0 demo, one participant (the `user` employee), KPI template `429c9433-66c2-48e0-880e-f627b509dc99`.

| Write                                                                        | Who pressed                                                                 | Result                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| 1. Save the draft cycle                                                      | Agent                                                                       | Draft, readiness empty                            |
| 2. Launch                                                                    | User (the permission mode of the agent tool refused the click of the agent) | Active, three assignments, one report             |
| 3. Save the self review (`fae7cb51-420c-4b60-b709-a2f86e509c72`) as a draft  | Agent as `user`                                                             | In Progress; ratings 4 and 3, Weekly, one comment |
| 4. Save the goals report (`d8ead2f9-c92e-4e3c-af86-c34e54cb88d0`) as a draft | Agent as `user`                                                             | Draft; 92, 100, 90, 100, 95, one remark           |

Nothing was submitted. The cycle stays Active with open work: a submission of it is a new write, and removing it means cancelling it.

## Seen live

| Check                                                                                        | Result                                                     |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Heading "name · position", template card "Quarterly Performance v2"                          | Shown                                                      |
| Rating radios named "1 Never" to "5 Always", and "Not Observed" where the question offers it | Yes                                                        |
| Click, then the right arrow key                                                              | The choice and the focus move                              |
| Completion panel                                                                             | Counts required questions, Not Observed among them; 4 of 4 |
| Submit with empty fields (review and report)                                                 | Fields marked, no dialog                                   |
| Bad value in an indicator field                                                              | Named on its field, nothing sent                           |
| 375 pixels, rating buttons                                                                   | Two columns, the page is not wider than the screen         |
| Manager on the report draft                                                                  | "Not shown", no comparison, no field, no remark            |
| Manager on the locked manager review                                                         | "Waiting for the Self stage.", no panel, no radio          |

Not seen: the clear button of an optional rating (the template has no optional rating), the dark theme, 200% zoom, a screen reader.

## The fixes

| Fix                                                                        | Red                                     | Green         |
| -------------------------------------------------------------------------- | --------------------------------------- | ------------- |
| Review form: a changed answer loses its problem                            | 1 failed, 23 passed                     | 785 web tests |
| Review form: the words about required questions go with the last problem   | 1 failed, 24 passed                     | 786 web tests |
| Goal record: the same for values, texts, and the return reason             | 3 failed, 32 passed                     | 789 web tests |
| Goal record: a field being typed in keeps the focus                        | 1 failed, 34 passed (the removal alone) | 789 web tests |
| Goal record: the focus reaches a problem when a click leaves it in a field | 1 failed, 35 passed                     | 790 web tests |

`web/src/utils/form-problems.ts` (new) holds the rule for both forms. The goal record moves the focus to a field with a problem only after an action that found one, never after an edit. A first version looked at the focused element instead: Safari and Firefox on macOS leave the focus in the field on a button click, so it would have skipped the move.

Seen live after the first two kinds of fix: the review form and the goal record. The return reason and the last focus change are covered by their tests only.

## Check query (read only)

```sql
SELECT state FROM pms.cycles WHERE cycle_id = 'f67833ad-5445-42a9-b3c8-55d26b204024';

SELECT s.perspective, a.state, r.version, r.status
FROM pms.assignments a
JOIN pms.cycle_stages s ON s.stage_id = a.stage_id
LEFT JOIN pms.assignment_responses r ON r.assignment_id = a.assignment_id
WHERE a.cycle_id = 'f67833ad-5445-42a9-b3c8-55d26b204024'
ORDER BY s.sort_order;

SELECT c.status, c.remarks, count(v.actual_value) AS values_reported
FROM pms.accomplishments c
LEFT JOIN pms.accomplishment_actuals v ON v.accomplishment_id = c.accomplishment_id
WHERE c.cycle_id = 'f67833ad-5445-42a9-b3c8-55d26b204024'
GROUP BY c.accomplishment_id, c.status, c.remarks;

SELECT entity_type, action
FROM pms.audit_events
WHERE entity_id IN ('f67833ad-5445-42a9-b3c8-55d26b204024', 'fae7cb51-420c-4b60-b709-a2f86e509c72', 'd8ead2f9-c92e-4e3c-af86-c34e54cb88d0')
ORDER BY occurred_at;
```

| Query | Expected rows                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------- |
| 1     | `active`                                                                                            |
| 2     | `self`, `in_progress`, 1, `draft`; `manager`, `locked`, null, null; `hr`, `locked`, null, null      |
| 3     | `draft`, `Demo goals draft: slice 4 live check.`, 5                                                 |
| 4     | `cycle` `created`; `cycle` `launched`; `assignment` `draft_saved`; `accomplishment` `actuals_saved` |

## Open

1. Run this query and the one of the phase 2 demo handoff.
2. A NUL character in a text field ends in a 500 (low, phase 2 security review): waits for the user.
3. The KPI template list of the wizard shows two templates with one name and no version.
4. A submit with empty fields on a review does not move the focus to the first problem; the goal record does.
5. The other open items of the slice 4 handoff stay (second review screen of the sample, the doubled "Submitted" words, `security-auditor` over slices 3 and 4, phase 3 remainder, slice 5).
6. 187 or more entries are uncommitted on `main`.

## File inventory

All uncommitted.

| File                                                                                    | Status  |
| --------------------------------------------------------------------------------------- | ------- |
| `web/src/utils/form-problems.ts`                                                        | New     |
| `web/src/features/evaluations/components/evaluator-scoring-form.tsx`                    | Changed |
| `web/src/features/position-goals/components/accomplishment-record.tsx`                  | Changed |
| `web/tests/component/evaluator-scoring-form.test.tsx`, `accomplishment-record.test.tsx` | Changed |
| `docs/project-structure.md`, `docs/system-architecture.md`                              | Changed |

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, docs/handoffs/2026-11-26-slice-4-live-check.md, and the slice 4 handoff.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
