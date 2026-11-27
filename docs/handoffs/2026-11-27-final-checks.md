# Handoff: final checks of the review modules

Date of this state: 2026-11-27. The work is committed on `feat/review-modules` and sent as a pull request from the fork `intellismartinc-iging` to `iti-vin` `main` (base `9f86101`). Read first: this file, then `2026-11-27-decisions.md`.

## Objective

Run the checks that were left after the decisions, fix what they find, and run the live checks that write, with the approval of the user for each.

## Read this first

**`main` at `9f86101` holds the HIGH finding below until the pull request merges. The repository is public: merge soon.**

### Database scripts before this code, in this order

Run them by hand from `packages/database/migrations/`. The order of the file names is **not** the order of the last two.

1. `2026-11-25-cycle-stage-evaluator.sql`
2. `2026-11-26-slice-5-cycle-and-accomplishment-fields.sql`
3. `2026-11-26-phase-7-peer-evaluators.sql`
4. `2026-11-27-result-visibility.sql`
5. `2026-11-27-earlier-answers-visibility.sql`
6. `2026-11-26-accomplishment-rows-for-active-cycles.sql`: data, one draft report for each participant of a cycle that was active before reports existed
7. `2026-11-26-test-account-review-links.sql`: data for development databases with the test accounts only

The code also expects `pms.evaluation_snapshots` and the column `reopen_reason`. Both are in the schema files of `main` already: a database made from older files needs them by hand.

## Release

| Commit               | Content                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `feat(database)`     | Schema, migrations, seeds                                               |
| `feat(shared-types)` | Contracts and rules                                                     |
| `feat(backend)`      | Services, routes, access rules, audit, rate limit, template write fixes |
| `feat(web)`          | Screens                                                                 |
| `docs`               | The check file, the handoffs, the architecture documents                |

Verified on the code commits in a separate fresh worktree: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and the tests of the four packages (shared-types 156, database 22, backend 937, web 1005): all pass. The workflow of the repository runs no backend and no database tests, so these two are proven here only.

## Security findings of the template writes

Found by reading sections 4 and 5 of the PRD against the code, line by line. Language: TypeScript, NestJS 12, TypeORM. Line numbers of `HEAD`.

| #   | Issue                                                                                                                                                                                                                               | Rating | Lines                                                                          | Why, and reference                                                                                             | State                                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | A create or a draft update of a template took the ids of indicators, sections, and questions from the request. A save with the id of an existing row moves and overwrites that row: a frozen version of the same or another company | HIGH   | `kpi-goals.service.ts` 490-494, `behavioral-assessment.service.ts` 353 and 374 | Needs an HR administrator and the id. Breaks Tpl-G-006 and the company scope. CWE-639, CWE-915, OWASP A01:2021 | Fixed: an indicator keeps an id only when it belongs to the replaced draft, once; sections and questions always get new ids |
| 2   | An update and a publication of a KPI template took no row lock: an update at the same moment could change a draft after its weights were checked                                                                                    | MEDIUM | `kpi-goals.service.ts` 211 and 315                                             | A published template with weights that do not total 100. CWE-362                                               | Fixed: one `lockTemplate` for update, publish, new version, and archive                                                     |

Who can trigger finding 1: only a request that someone writes by hand with an HR administrator login. The web editors send no id of another template: the create form of a KPI template keeps no id, the edit form keeps the ids of the template that it loaded, and the behavioral editor sends none.

Also added at the boundary: a publication needs a unit and a target for each indicator (Tpl-G-002; zero is a target), and an indicator name, a section title, and a question prompt are not blank (Tpl-B-003).

Damage check of the local database (reads): 17 published versions, each with indicators that total 100% with a unit and a target, or with questions in every section. This cannot show an overwrite that left a version whole. The database of the senior developer is not checked.

Overall risk rating after the fix: LOW (the findings of the decisions handoff stay).

### Detection for the senior developer (read only, not run)

The check above misses a moved row when its version still looks whole. These two queries find stored work that points outside its frozen version. An empty result of both is the expected one.

```sql
-- Actual results whose indicator is not in the frozen KPI version of the participant.
SELECT a.accomplishment_id, aa.indicator_id, i.version_id AS indicator_version, p.kpi_version_id AS frozen_version
FROM pms.accomplishment_actuals aa
JOIN pms.accomplishments a ON a.accomplishment_id = aa.accomplishment_id
JOIN pms.cycle_participants p ON p.participant_id = a.participant_id
JOIN pms.kpi_indicators i ON i.indicator_id = aa.indicator_id
WHERE i.version_id IS DISTINCT FROM p.kpi_version_id;

-- Review answers keyed by a question that the frozen behavioral version does not hold.
SELECT r.response_id, k.question_id
FROM pms.assignment_responses r
JOIN pms.assignments s ON s.assignment_id = r.assignment_id
JOIN pms.cycle_participants p ON p.participant_id = s.participant_id
CROSS JOIN LATERAL jsonb_object_keys(r.answers_json) AS k(question_id)
WHERE k.question_id <> 'written_feedback'
  AND NOT EXISTS (
    SELECT 1
    FROM pms.behavioral_questions q
    JOIN pms.behavioral_sections sec ON sec.section_id = q.section_id
    WHERE q.question_id::text = k.question_id AND sec.version_id = p.behavioral_version_id
  );
```

## Screen fixes

| Fix                                                                                                                                                                                                                                                  | Proof                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| KPI template list at 800 px: "Applicable Position / Role" covered "Indicators". Headings wrap, and the name column takes one third on a narrow table                                                                                                 | No heading leaves its cell at 375, 800, 900, 1100, and 1440 px                                                    |
| Behavioral template list at 375 px: six columns of 96 px, headings covered each other, words broke in the middle. The table keeps 672 px and scrolls, and headings wrap                                                                              | No heading leaves its cell at 375, 800, and 1280 px; narrowest column 112 px at 375                               |
| Light contrast: muted text on the full muted surface measured 4.35 (headings of both template lists, the scale labels of a behavioral template, the version tag of a review). The lists use the shared table header, the other two the faint surface | Both template lists, a behavioral template, and a review: no text under 4.5 in light and dark, at 375 and 1280 px |

## Last full run

`pnpm test`: shared-types 156, backend 937 (42 files), web 1005 (81 files). Database 22. `pnpm lint`, `pnpm typecheck`, backend `tsc --noEmit`: pass. No changed or new file holds the test password.

Red runs, each then green: `pnpm --filter @pms/backend test kpi-goal behavioral` 11 failed; `pnpm --filter @pms/web test goal-template-listing` 1 failed; `pnpm --filter @pms/web test review-muted-contrast` 1 failed with the four places; `pnpm --filter @pms/web test behavioral-template-list` 1 failed. The zero target guard was proven on a copy of the source (1 failed). The name column width of the KPI list has no unit test: the measurement is its proof.

## Screen checks (reads)

| Check                                                                 | Seen                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Dark theme and 375 px, 15 screens of the review modules and Goals, HR | No horizontal page scroll, one `h1`, no unnamed control, no duplicate id |
| Wizard, five steps, dark, 375 px                                      | The same. Screens not repeated as manager or employee                    |
| List memory (G11)                                                     | The search of Review Cycles stays after a cycle and Back                 |
| Smoke read, 363 requests, three accounts                              | No unexpected answer                                                     |

Not checked: a screen reader, browser zoom, keyboard order.

## Contrast gap, not fixed: for the designer

Dark theme: the muted value of a select measures 4.19 (seen in wizard steps 2 and 3). It comes from the shared select in `components/ui`, which the whole app uses. `web/DESIGN.md` asks 4.5.

## Sample comparison (Classic layout only)

The user wants the Classic layout, not Workspace. Compared: KPI template list and details, behavioral template list and details, cycle list.

| Difference                                          | State                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| The sample has Duplicate on both template details   | Not built: the PRD does not ask for it                                           |
| The sample has a Preview button on template details | The details page of the app is read only already; Preview exists in both editors |
| Columns, tabs, and filters of the three lists       | The same. The app also shows "Needs attention" above the cycle list (PRD 10.2)   |

## Live checks with writes (local app, test accounts, each approved by the user)

| Check                                                                                  | Seen                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Draft `ZZ id check B` sends the indicator id of draft `ZZ id check A`               | B gets a new id, A keeps its indicator. Both archived                                                                                           |
| B. `ZZ live decisions` (`4ac83a8c-02ff-4fa3-a283-b194e9798bac`), the manager as a peer | Created with earlier answers on. Readiness names the manager; the launch answers 422; the cycle stays Draft                                     |
| The peer stage removed; two launches at once                                           | 200 and 409; three assignments                                                                                                                  |
| Two submissions of the self review at once                                             | 200 and 409; one submitted row in History                                                                                                       |
| The manager, as the later reviewer                                                     | Before the submission: restricted. After: reads the two answers, no edit, no earlier version. The employee opens the manager review: restricted |
| Cancel                                                                                 | The manager and the employee get 404, HR reads                                                                                                  |
| C. Extension of `ZZ slice 4 live check` to verify on 5 January                         | 422 on the manager stage (D6); no date changed                                                                                                  |

## Dead ends

A first search of the PRD check file looked for "Partial" and missed "Partly": Tpl-G-007 is Partly. The sample was switched to Workspace by accident and switched back.

## Files of this round

| Area                         | Files                                                                                                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend, owner review wanted | `kpi-goals/services/kpi-goals.service.ts`, `kpi-goals/dtos/kpi-indicator.dto.ts`, `behavioral-assessment/services/behavioral-assessment.service.ts`, `behavioral-assessment/dtos/behavioral-section.dto.ts`, their specs                                                   |
| Web                          | `review-templates/components/goal-template-list.tsx`, `behavioral-template-list.tsx`, `behavioral-template-editor.tsx`, `review-cycles/components/review-template-card.tsx`; tests `goal-template-listing`, `behavioral-template-list`, `unit/review-muted-contrast` (new) |
| Documents                    | the PRD check file, this handoff, the handoff index                                                                                                                                                                                                                        |

## Open

| Item                                                                                                                                          | Waits for                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Review and merge of the pull request; the HIGH fix is in it                                                                                   | The senior developer                                   |
| Findings 1 to 4 of the decisions handoff                                                                                                      | The senior developer or the product manager            |
| The dark select contrast                                                                                                                      | The designer                                           |
| The two detection queries                                                                                                                     | The senior developer                                   |
| Tpl-G-007 Partly: a stated retention and template deletion policy. D10 sets no limit for completed records; the app deletes no template       | The organization                                       |
| D7 notifications, D8 manager assignment                                                                                                       | A UI design                                            |
| D9                                                                                                                                            | The product manager                                    |
| Timer activation (`ZZ live ready`, `ZZ live blocked`)                                                                                         | 28 November                                            |
| Upward stage live                                                                                                                             | An employee with two or more direct reports (SQL data) |
| A second company, a screen reader, zoom, template audit rows by SQL                                                                           | A later check                                          |
| The list of a person who is not an administrator reads all assignments of the open cycles; a link from a later reviewer to the earlier review | A real need                                            |
| The database of the senior developer                                                                                                          | The senior developer                                   |

The browser of the app is signed in as the test HR administrator.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-final-checks.md.
Check the state of the pull request of feat/review-modules first.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
