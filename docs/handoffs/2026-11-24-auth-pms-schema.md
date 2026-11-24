# Handoff: auth and employees on the pms schema

2026-11-24 · The backend auth and employees entities now read the `pms` schema. The register and sign-up routes are gone, and so is the `secondaryDB` use in the registration service. TypeORM `synchronize` is off. Nothing is committed (branch `hersvin`).

## 1. Objective

Point the auth entities (`User`, `UserRole`, employee) at `pms`, map `EmployeeDomain` to `packages/database/schema/employees.sql` column for column, remove `POST /auth/register` and `POST /auth/sign-up`, and remove `secondaryDB` from `AccountRegistrationService`.

## 2. Current state

- `CompanyResolver` (KPI goals) no longer reads `pms.employees.company_id`. It takes the account's `pms.employees` row from `EmployeeService.findByUser`, matches `company` (text) to exactly one `pms.companies.name`, and uses that row's `company_id`. The actor is the employee `guid`. No match, or two companies with that name: 403.
- Verified 2026-11-24: backend `pnpm test` 13 files, 160 tests pass. `tsc --noEmit -p tsconfig.json` clean. `pnpm --filter @pms/backend lint` exits 0. `pnpm --filter @pms/database test` 9 pass.
- Live database, read on 2026-11-24 (read-only queries): `pms.employees` has the new columns and 0 rows. `pms.users` exists with the OLD shape (uuid `id`, `password`) and 0 rows. `pms.user_role` does not exist. The 6 employees, 5 accounts, and the roles are still in `public.employees`, `public.users`, `public.user_role`.
- Until `packages/database/migrations/2026-11-24-auth-tables-to-pms.sql` runs, login fails: the entities read pms tables that are empty or missing.
- The migration script was NOT run, not even as a dry run (the tool permission was denied). Unverified.
- `pnpm --filter @pms/shared-types generate` fails: `CHECK IN columns with no enum mapping: employees.gender`. Cause: the new CHECK lists in `employees.sql`. Row types are not regenerated and `pnpm build:packages` was not run.
- The backend was not started.

## 3. Decisions (all chosen by the user on 2026-11-24)

- `pms.users` follows the `User` entity (bigint id, `employee_id`, `user_role_id`, `password_hash`), not the old `users.sql`. `users.sql` is rewritten to match, with indexes on both foreign keys.
- The role comes from `users.user_role_id`: `pms.employees` has no role column. `AdminRoleGuard` and `AuthService.getCurrentUser` read the account role. A new sign-up account gets the `USER` role.
- One entity per table: auth uses `EmployeeDomain`; `auth/entities/employee.entity.ts` is deleted.
- `synchronize: false` on the PostgreSQL connection: the SQL files own the tables, and a mismatched entity can no longer drop or retype columns.
- A copy script moves the public data. The user reviews and runs it.

## 4. Files

| File                                                                                      | Status                                                                                    |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `backend/src/app.module.ts`                                                               | `synchronize: false`                                                                      |
| `backend/src/modules/auth/controllers/auth.controller.ts`                                 | sign-up and register routes removed                                                       |
| `backend/src/modules/auth/dtos/register.dto.ts`, `sign-up.dto.ts`, `auth-response.dto.ts` | deleted (no caller)                                                                       |
| `backend/src/modules/auth/entities/employee.entity.ts`                                    | deleted (replaced by `EmployeeDomain`)                                                    |
| `backend/src/modules/auth/entities/user.entity.ts`                                        | schema `pms`                                                                              |
| `backend/src/modules/auth/entities/user-role.entity.ts`                                   | schema `pms`, primary key column `id`                                                     |
| `backend/src/modules/auth/services/account-registration.service.ts`                       | `secondaryDB` and `register()` removed; `signUp()` kept, no route calls it                |
| `backend/src/modules/auth/services/auth.service.ts`                                       | `EmployeeDomain`, role from the account                                                   |
| `backend/src/modules/auth/auth.module.ts`                                                 | no `secondaryDB` feature, `EmployeeDomain`                                                |
| `backend/src/modules/employees/entities/employee-domain.entity.ts`                        | all 27 `pms.employees` columns, no `userRoleId`                                           |
| `backend/src/modules/employees/types/employee-codes.ts`                                   | new: CHECK code lists                                                                     |
| `backend/src/modules/employees/dtos/create-employee.dto.ts`, `update-employee.dto.ts`     | `id`, company, position, division, department, branch, employment status; no `userRoleId` |
| `backend/src/modules/employees/guards/admin-role.guard.ts` (+ new spec)                   | account role                                                                              |
| `packages/database/schema/users.sql`                                                      | entity shape                                                                              |
| `packages/database/migrations/2026-11-24-auth-tables-to-pms.sql`                          | new, not run                                                                              |
| `backend/src/modules/kpi-goals/services/company-resolver.service.ts` (+ spec)             | company name to `pms.companies.company_id`                                                |

## 5. Open items

1. Fill the `REPLACE_ME` values in the migration script, run it, then log in with an existing account.
2. Live database has no `pms.companies` and no `pms.positions`, though `schema/identity-and-directory.sql` defines both. KPI goals fail until they exist. Load them from the schema, and add a `pms.companies` row whose `name` equals each `pms.employees.company` exactly.
3. Shared-types: add enum mappings for the new `employees` CHECK columns, then `generate` and `build:packages`.
4. Web still calls `/auth/register` and `/auth/sign-up` (`web/src/features/auth/api/auth-requests.ts`, `auth-credentials.ts`): those now return 404.
5. `secondaryDB` connection and `hrdotnet.entity.ts` stay in `app.module.ts`: nothing reads them now. Remove them together with the `DB_*` keys and `mssql` when the owner agrees.
6. `AccountRegistrationService.signUp()` has no caller: delete it, or add a route back.
7. Demographic fields (gender, birth date, and so forth) are in the entity but not in the create and update DTOs.

## 7. Seeds (2026-11-24, later)

- `packages/database/seeds/employees.sql`: 3 employees (ids 21, 22, 23; GUIDs ...021 to ...023, which the other seeds use), every `pms.employees` column filled or NULL.
- `packages/database/seeds/users.sql`: roles 1 ADMIN, 2 MANAGER, 3 USER (backend `ADMIN_ROLE_ID` is 1; codes from `ROLE_CODES`), and one login per employee. The dev password and usernames are in the file header; the file stores bcrypt hashes only (checked: all 3 match).
- `seed.sql` loads them in place of the deleted `seeds/identity-and-directory.sql`.
- `schema/users.sql` now creates `pms.user_role` before `pms.users` (the user chose this after deleting `schema/identity-and-directory.sql`).
- Verified: `pnpm --filter @pms/database test` 10 pass (new test: load order, role ids, GUIDs, hashes only). The seeds were not run against a database.
- Gap: `schema/identity-and-directory.sql` is deleted, but `kpi-goals.sql`, `behavioral-assessments.sql`, `manager-assignments.sql`, `review-cycles.sql`, `202-files.sql`, `pip.sql`, and `operational-goals.sql` still reference `pms.companies`, `pms.positions`, or `pms.departments`, and their seeds insert `company_id` 1 and `position_id` 11. `schema.sql` and `seed.sql` fail on a fresh database until those tables return or the references go. `CompanyResolver` also reads `pms.companies`.
- Gap: the live `public.user_role` has code `HR_ADMIN` for id 1, which `roleCodeSchema` rejects (`/auth/me` answers 403 for that account). The seed and the migration copy differ here: the copy keeps `HR_ADMIN`.

## 8. Shared types (2026-11-24, later)

- New enums in `packages/shared-types/src/domain`: `EMPLOYMENT_STATUSES`, `GENDERS`, `MARITAL_STATUSES`, `BLOOD_TYPES` (from the `employees.sql` CHECK lists), mapped in `scripts/generate-rows.mjs` and checked in `test/db-enums.test.mjs`. The backend imports them; its own `employee-codes.ts` copy is deleted.
- Rows regenerated: `employees.row.ts` has the new columns, `users.row.ts` is new (pms.users), `companies`, `departments`, and `positions` rows are gone with their tables, and so are `companyDtoSchema`, `departmentDtoSchema`, and `positionDtoSchema` (no consumer outside shared-types).
- Open item 3 above is done. Verified: `pnpm build:packages`, backend build, `pnpm typecheck`, `pnpm test` (shared-types 80, web 188, backend 160), database 10, `pnpm lint`: all exit 0. Web `next build` not run (web dev server was on port 3000; web is unchanged).
- Branch `feat/auth-pms-schema`, pushed for review. Do not merge without the reviewer.

## 6. Opening prompt

```text
Continue in C:\Users\admin\Desktop\pms. Read docs/handoffs/2026-11-24-auth-pms-schema.md. I ran (or did not run) packages/database/migrations/2026-11-24-auth-tables-to-pms.sql. Next: open item 2 (load pms.companies and pms.positions), then open item 3.
```
