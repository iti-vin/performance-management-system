# Handoff: PMS Backend Restructure

November 12, 2026 · State of the backend folder restructure, for the co-developer who continues it.

## 1. Objective

Make the NestJS backend easier to maintain and debug by giving every folder one kind of file and every file one job, with no change to what the API does. Fixes (auth issues, error handling) are a separate, later step.

## 2. Current State

- Branch `refactor/backend-structure`, cut from `main` at `d16c648`. **Nothing is committed and nothing is pushed.** All work is in the working tree.
- `pnpm build` passes. `pnpm lint` reports 0 warnings and 0 errors (19 warnings before).
- `pnpm test`: 26 pass, 8 fail. The 8 failures are all in `src/modules/auth/services/auth.service.spec.ts` and failed the same way on `main` before this work.
- **The API was not started.** It needs PostgreSQL and SQL Server. The new startup check of the environment variables is covered by unit tests only.
- The senior developer has not yet reviewed `docs/project-structure.md`.

## 3. Key Decisions & Rationale

- **Per module: `controllers/`, `services/`, `dtos/`, `entities/`, `types/`, plus `guards/` and `strategies/` where a module has them:** the senior developer asked for one folder per kind of file so that no file grows too large.
- **`entities/` instead of `models/`, and no `routes/` folder:** NestJS with TypeORM calls a database model an entity, and the decorators on a controller are the routes. A routes folder would repeat them.
- **`web/structure-sample.md` is not followed and was deleted:** it describes another project (Vetted Studio, Prisma). It has no place for TypeORM entities.
- **`common/` holds only code that two or more modules use:** `JwtAuthGuard` and `ApiErrorResponseDto` were in `auth` but used by all four controllers. `AdminRoleGuard` stays in `employees` because only that module uses it and it depends on `EmployeeService`.
- **`config/env.config.ts` validates the environment with Zod at startup:** one place lists every variable, and a missing or invalid one stops the start with its name.
- **`JWT_ACCESS_SECRET` stays optional in the schema:** making it required is a fix, and this branch is restructure only. The fallback value is still written in three auth files.
- **A lint rule stops `common/` and `config/` from importing a feature module (`oxlint.json`, `overrides`):** it keeps the dependency direction from drifting. Checked with a probe file; it reports an error.
- **The three non-null assertions in `auth.service.ts` were removed by widening `toEmployeeDto` to accept `string | null`:** the HRDotNet columns are nullable, and the assertion hid that. The value returned at runtime is the same.
- **`zod` added to the backend through the workspace catalog:** the same version `shared-types` already uses.

## 4. Dead Ends (Do Not Retry)

- **Moving entities out of `auth`:** `Employee` (in `auth`) and `EmployeeDomain` (in `employees`) both map the `employees` table. The correct change is to merge them, which changes logic. `User` is needed by both `auth` and `employees`, so any location leaves one cross-module import.
- **Moving the database setup out of `app.module.ts` into `config/`:** the setup lists entities of every module, so `config/` would import modules and break the new lint rule.
- **Adopting the sample's layout (`dto/`, strategy and types in `common/`):** it conflicts with what the senior developer asked for and with this project's own documents.
- **Adding a global exception filter now:** it changes the shape of every error response, which affects the web app. It needs approval first.

## 5. Artifacts and File Changes

All paths are under the repository root. Status is of the working tree, uncommitted.

- `backend/src/common/guards/jwt-auth.guard.ts`, `common/dtos/api-response.dto.ts`, `common/decorators/matches.decorator.ts`: completed (moved, content unchanged).
- `backend/src/config/env.config.ts`, `env.config.spec.ts`: completed (new, 8 tests).
- `backend/src/modules/*/controllers/*.controller.ts`: completed (4 controllers moved; unused imports removed).
- `backend/src/modules/*/types/`: completed (`jwt-payload.types.ts`, `authed-user.types.ts`, `employee-status.enum.ts`, two `template-tree.types.ts`).
- `backend/src/modules/*/dtos/`: completed. Split by operation: `kpi-indicator`, `create-` and `update-kpi-goal-template`; `behavioral-section`, `create-` and `update-behavioral-template`; `create-` and `update-employee`; `register` split from `sign-up`.
- `backend/src/app.module.ts`, `backend/src/main.ts`: completed (read the validated environment; `PORT` included).
- `backend/oxlint.json`, `backend/package.json`, `pnpm-lock.yaml`: completed.
- `backend/README.md`: completed (folder section updated).
- `docs/project-structure.md`: completed, pending senior review. Rewritten to cover the whole repository and the rule of each folder.
- `docs/database-design.md`: completed (renamed from `database_design.md`; references updated in `project-structure.md` and in one comment line each of `packages/database/schema.sql` and `seed.sql`).
- `docs/legacy-gap-analysis.md`: completed (moved from `web/docs/`, which no longer exists). Its paths still read from the web folder's point of view.
- `web/structure-sample.md`: deleted.
- `docs/api-contracts.md`, `coding-standards.md`, `database-schema.md`, `error-handling.md`, `product-requirements-document.md`, `security-policies.md`: **unverified.** They show as modified with table spacing changes only, which look like an editor's formatter. This work did not edit them on purpose. Review the diff or discard it before committing.

## 6. Verbatim Essentials & Constraints

- Module layout and file names: see `docs/project-structure.md`, section 2.1.
- Dependency direction: `main.ts -> app.module.ts -> modules/<feature> -> common/, config/`.
- Split a file when it has more than one job or grows past about 300 lines. Largest file now: `kpi-goals.service.ts`, 290 lines.
- Environment schema: required `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`. Defaults: `PORT` 3000, `POSTGRES_HOST` localhost, `POSTGRES_PORT` 5433, `POSTGRES_DB` postgres, `POSTGRES_USER` postgres, `POSTGRES_PASSWORD` empty, `DB_PORT` 1433, both timeouts 30000.
- Behavior differences introduced, all at startup: a non-numeric `PORT`, `DB_PORT` or `POSTGRES_PORT` now stops the start; an empty `PORT=` gives a random port; a missing SQL Server variable is now reported by name instead of "Missing required MSSQL environment variables".
- Developer's instruction for this branch: restructure only, remove nothing, no fixes.

## 7. Working Preferences & Writing Rules

- English only in code, comments, documents and commit messages. No emojis, no em dashes, no Latin abbreviations (repository `AGENTS.md`).
- kebab-case file names. One class per file.
- Commit and push only when the developer asks. One concern per commit.
- Report results as they are: failing tests are stated, not hidden.

## 8. Open Items & Immediate Next Steps

- Next action: the senior developer reviews `docs/project-structure.md`. Change the layout once, after that review, if needed.
- Next action: start the API (`pnpm start:dev` in `backend/`) with real databases to confirm the environment check and the moved files at runtime.
- Next action: review or discard the six unverified document diffs, then commit and open a pull request to `main`.
- Backend auth issues, not fixed: `register` accepts `userRoleId` from the caller; the JWT secret falls back to a value in code (three files); `pg` is missing from `backend/package.json`; `auth.service.spec.ts` fails (8 tests).
- Error handling, not started, needs approval: a global exception filter in `common/filters/` for the envelope in `docs/error-handling.md`; `auth.service.ts` line 199 has a `catch` that drops the cause; `kpi-goals.service.ts` and `behavioral-assessment.service.ts` each have a `.catch(() => null)` that turns a database error into "not found".
- Blocked: merging the two `employees` entities. Unblocked by a decision from the backend owner on which entity is the real one.
- Small leftovers: `docs/README.md` describes files that do not exist; the SQL comments point to `.docs/` instead of `docs/`; `docs/coding-standards.md` section 2 does not mention `common/`, `config/` or `types/`.

### Plan for November 12, 2026

From the developer's Daily Update for the day. Items 3 and 4 are done on the branch; items 1 and 2 are not started.

| #   | Plan                                                                                         | State                         | Where                                                                                  |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------- |
| 1   | Integrate the PMS web app with the backend for authentication (login, register, and sign-up) | Not started                   | `web/src/features/auth/services/`, `web/src/api/api-client.ts`, backend `modules/auth` |
| 2   | Fix the backend authentication issues reported to the backend owner                          | Not started                   | The four issues listed above, in `backend/src/modules/auth` and `backend/package.json` |
| 3   | Restructure the PMS backend so it is easier to maintain and debug                            | Done, uncommitted             | Sections 2 to 5 of this handoff                                                        |
| 4   | Update the project structure documentation and ask the senior developer to review it         | Written; review not yet asked | `docs/project-structure.md`                                                            |

Notes for items 1 and 2:

- The web app already posts credentials from a server action and sets the httpOnly cookie `pms-session`; `web/src/proxy.ts` redirects by that cookie. The browser never calls the backend directly.
- Request bodies are checked with the schemas in `@pms/shared-types` (`src/dtos/auth.schema.ts`). The backend validates the same requests with its own `class-validator` DTOs, so the two can differ. Compare them before connecting each form.
- The backend `register` DTO is now in `modules/auth/dtos/register.dto.ts` (split from `sign-up.dto.ts`).
- Fix order suggested: make the 8 failing tests in `auth.service.spec.ts` pass first, so the other three fixes have a working test file to extend.
- Each fix changes behavior, so it does not belong in the restructure pull request. Use a separate branch and pull request.

## 9. Suggested Opening Prompt for Next Session

```text
Continue the PMS backend work on branch refactor/backend-structure (uncommitted).
Read docs/handoffs/2026-11-12-backend-restructure.md and docs/project-structure.md first.
The restructure is done and unreviewed. Do not move folders again unless the senior developer asks.
Next: fix the backend auth issues listed in the handoff, section 8, one at a time, with a failing test first.
Keep the layout rules in docs/project-structure.md. English only, no em dashes. Commit only when I ask.
```
