# Handoff: Authentication integration (web and backend)

2026-11-13 · State of the auth module across `web`, `backend`, and `@pms/shared-types`, for the co-developer who continues the work and for the next AI session.

## 1. Objective

Connect the web auth pages to the backend auth endpoints through shared contracts, protect the workspace pages, and give every API error one shape. Later modules reuse the same pattern.

## 2. Current State

**Answer to "is authentication integrated?": yes, all five endpoints, in code. The full flow with a real account is not yet proven in the browser.**

All five backend endpoints are called from the web:

| Endpoint                   | Web side                                                                                                                          | State      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `POST /auth/login`         | `/login` form, server action sets the httpOnly cookie `pms-session`                                                               | Integrated |
| `POST /auth/sign-up`       | `/sign-up` form                                                                                                                   | Integrated |
| `POST /auth/register`      | `/register` form, redirects to `/login` on success                                                                                | Integrated |
| `GET /auth/me`             | `getCurrentUser()` in the workspace layout. Returns the account, its role, and the employee name. The role picks the sidebar menu | Integrated |
| `POST /auth/refresh-token` | `web/src/proxy.ts` renews a token in its last 10 minutes and rewrites the cookie                                                  | Integrated |

Also in place: the route guard `web/src/proxy.ts`, log out (`signOut`, wired to the account menu), and the "Session ended" screen when `/auth/me` answers 401.

**Verification, run on 2026-11-13:**

- `@pms/shared-types`: 36 tests pass.
- `@pms/backend`: 80 tests pass (8 files), `tsc --noEmit` clean.
- `@pms/web`: 26 tests pass (4 files), typecheck clean.
- `pnpm lint`: clean.

**Verified against the running backend (port 4000) on 2026-11-13:**

- The error envelope: a short password on `POST /auth/login` answers 400 with `"(400) VALIDATION_ERROR"` and a `password` detail. A forged token on `POST /auth/refresh-token` answers 401 with `"(401) UNAUTHENTICATED"`.
- A failed refresh does not break a page: a request with a forged token near its end still returns 200 and sets no cookie.

- `GET /auth/me` in Swagger lists `userId, email, username, role, firstName, lastName`, with the role enum `ADMIN/MANAGER/USER`. A bad token answers 401 in the error envelope.

**Not verified:**

- The sidebar changing with a real login of each role (ADMIN, MANAGER, USER). Only tests and the Swagger schema prove it.

- The success path of the refresh with a real token: the new cookie being set after 50 minutes of a session.

- A full manual run in the browser against the real databases (register, log in, open a page, log out). During the session, sign-up failed with `users_email_key` and an employee endpoint answered `403 Admin role required`. The sign-up bug is fixed in code. Neither flow was re-tested after the fix.
- The redesigned auth pages by eye, in dark theme, and at 768px and 1024px.

**Repository state:** branch `fix/auth-service-tests`, based on `main` at `176376c`. **Everything is uncommitted** (50 modified files and 16 untracked paths, counting this handoff). Nothing from this handoff is pushed. Part of the diff was made by the developer outside the AI session (backend config, employees module, docs).

**Local setup that the code now expects:** backend on port 4000 (`backend/.env` has `PORT=4000`, gitignored), web on port 3000, `web/.env.local` with `PMS_API_BASE_URL=http://localhost:4000/`.

## 3. Key Decisions & Rationale

- Backend runs on port 4000, web on 3000: both default to 3000 and cannot share it. `backend/.env.example` now says `PORT=4000`.
- The access token lives in an httpOnly cookie set by a server action: client code never reads the token.
- `proxy.ts` reads only the `exp` claim of the token: the signing secret belongs to the backend, so the web cannot check the signature. The backend checks it on every call. The guard is a page gate, not authorization.
- `getCurrentUser()` calls `await connection()` before the HTTP request: the HTTP client reads the clock, and Next.js 16 with `cacheComponents` stops the prerender with a "blocking route" error otherwise.
- The sidebar menu comes from the role of the logged-in account, and the "Preview as user type" switcher is removed: requested by the developer, the role must come from `public.user_role`.
- Role codes are `ADMIN`, `MANAGER`, `USER` (`ROLE_CODES` in `@pms/shared-types`): these are the `code` values of the three rows of `public.user_role`. The earlier guess (`system_admin`, `hr_admin`, `manager`, `employee`) is removed.
- The header greets the user by the first name of the employee record, and the account menu shows the full name, the role with the employee code, and the email: requested by the developer, the data comes from `GET /auth/me`. An account with no employee record falls back to its username.
- The default department is "ITI HRDotNet Department": requested by the developer until a department source exists.
- Menu mapping in `WORKSPACE_ROLE_BY_CODE`: `ADMIN` sees the HR administrator menu, `MANAGER` the manager menu, `USER` the employee menu. Assumed by the AI, not confirmed by the product owner.
- `GET /auth/me` reads the role from the employee record (`employees.user_role_id`), and from `users.user_role_id` only when the account has no employee record: `AdminRoleGuard` checks the employee record, so the menu matches what the API allows.
- `register` looks up the role with code `USER` (it looked up `employee`, which is not a row of `public.user_role`, so registration answered 503).
- A role code outside `ROLE_CODES` answers 403: the web cannot pick a menu for it.
- Token refresh runs in `proxy.ts`, not in a page: a cookie can be written in a proxy, a server action, or a route handler, and not during a page render. The proxy sees every page request, so an active user is renewed without any client code.
- Refresh happens only in the last 10 minutes of a token (`REFRESH_WINDOW_SECONDS = 600`): the backend refuses an expired token, and renewing on every request would call the backend on every page.
- A failed refresh returns null and keeps the current token: the token still works until it ends, so the page must not fail.
- Login and refresh share `sessionCookieOptions()`, capped at `SESSION_MAX_AGE_SECONDS = 7200`: the backend issues 3600 seconds on login and 7200 on refresh.
- Sign-up stores `employees.email` as the user email and the typed value as the username: the old code stored an empty string in one of the two, and both columns are unique, so the second sign-up failed.
- Sign-up rejects an email address as the username (400): login treats an email-shaped identifier as an email lookup, so such a username could never log in by username.
- Sign-up answers 409 for a taken username or email, and maps the PostgreSQL unique violation `23505` to 409: a duplicate is a conflict, not a server error.
- One error envelope for every failed request, built in one place: a global `ApiExceptionFilter` plus `exceptionFactory` on the `ValidationPipe`. Modules keep throwing Nest exceptions and write no error body.
- The error `code` carries its HTTP status, for example `"(409) CONFLICT"`: requested by the developer so the status is visible in the body.
- Unexpected errors answer 500 with a generic message and are logged once with the correlation id: raw database text must not reach the client.
- The Swagger error DTO classes `implements` the shared types: the build fails when the documented shape and the real shape differ.
- `register` no longer accepts `userRoleId` from the caller, and the backend assigns the `employee` role: a caller could pick the admin role before.
- Auth pages use a brand panel plus form from 1024px and a single column below, with design tokens only: requested redesign, no new dependency and no new color.

## 4. Dead Ends (Do Not Retry)

- Running `nest build` (`pnpm --filter @pms/backend build`) while `pnpm dev:backend` is running: `deleteOutDir: true` wipes `dist/` under the running app and it exits with `ERR_MODULE_NOT_FOUND`. Verify with `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json` instead.
- `config.get("s")` for the secondary database host: a typo for `"DB_HOST"`. TypeScript did not catch it because `Env` is a `z.looseObject`.
- Treating `cookies()` as enough to make the workspace layout request-time: with `partialPrefetching` the clock read still fails. `connection()` is required.
- Comparing an error code with a hand-typed string: use `ERROR_CODE_BY_STATUS[409]`, so a typo is a type error.
- Inserting `id` into `public.employees`: the column is `GENERATED ALWAYS`.

## 5. Artifacts and File Changes

All paths verified on disk. All uncommitted.

Shared contracts (`packages/shared-types/`):

- `src/dtos/error.schema.ts`: completed. New. `ERROR_CODE_BY_STATUS`, `ERROR_CODES`, `apiErrorResponseSchema`, `createApiError`, `readApiError`, `errorCodeForStatus`.
- `src/dtos/auth.schema.ts`: completed. Login, sign-up, register, refresh, token, account-created, current-user schemas. `MIN_PASSWORD_LENGTH` 8, `MAX_PASSWORD_LENGTH` 16. `currentUserDtoSchema` now has `role`, `employeeCode`, `firstName`, `lastName`.
- `src/domain/role-code.enum.ts`: completed. `ADMIN`, `MANAGER`, `USER`.
- `src/common.ts`: completed. Old `apiErrorSchema` (problem details) and `nestErrorSchema` removed.
- `src/rows/employees.row.ts`: completed. Regenerated, `guid` is nullable to match `schema.sql`.
- `test/errors.test.mjs`: completed. New.

Backend (`backend/src/`):

- `common/filters/api-exception.filter.ts` and `.spec.ts`: completed. New.
- `common/dtos/api-response.dto.ts`: completed. Swagger classes for the new envelope.
- `main.ts`: completed. Registers the filter and the validation `exceptionFactory`.
- `app.module.ts`: completed. `DB_HOST` typo fixed.
- `modules/auth/services/auth.service.ts` and `.spec.ts`: completed. Sign-up fix, `getCurrentUser()`, default role `USER`.
- `modules/auth/dtos/current-user-response.dto.ts`: completed. New. Swagger class for `GET /auth/me`.
- `modules/auth/controllers/auth.controller.ts`: completed. `me` calls `getCurrentUser()`.
- `modules/auth/**`, `modules/employees/**`, `config/env.config.ts`: changed by the developer in this branch, not reviewed line by line in this session.

Web (`web/`):

- `src/features/auth/services/submit-credentials.ts`: completed. Server action for login, sign-up, register. Reads errors with `readApiError`.
- `src/features/auth/services/current-user.ts`: completed. `connection()` added.
- `src/features/auth/services/refresh-session.ts`: completed. New. `refreshAccessToken()`, returns null on any failure.
- `src/features/auth/services/session-cookie.ts`: completed. `sessionCookieOptions()`, `SESSION_MAX_AGE_SECONDS`.
- `src/features/auth/services/sign-out.ts`, `session-guard.ts`, `session-cookie.ts`, `auth-credentials.ts`: completed.
- `src/proxy.ts`: completed. Route guard and token refresh.
- `src/constants/workspace-navigation.ts`: completed. `WORKSPACE_ROLE_BY_CODE`.
- `src/constants/workspace-config.ts`: completed. Only `departmentName` is left.
- `src/app/(workspace)/layout.tsx`, `src/layouts/workspace-layout.tsx`, `src/layouts/workspace-account-menu.tsx`: completed. Real role and name, no preview switcher.
- `src/layouts/auth-layout.tsx`, `src/features/auth/components/auth-option-link.tsx`, `src/features/auth/components/credentials-form.tsx`, `src/app/(auth)/{login,register,sign-up}/page.tsx`: completed, not checked by eye.
- `tests/integration/submit-credentials.test.ts`, `tests/integration/workspace-session.test.ts`, `tests/integration/refresh-session.test.ts`, `tests/unit/session-guard.test.ts`: completed.

Config:

- `backend/.env.example`: completed. `PORT=4000`.
- `backend/.env`: local only, gitignored. `PORT=4000`.

## 6. Verbatim Essentials & Constraints

Error envelope, for every failed request:

```json
{
  "success": false,
  "error": {
    "code": "(400) VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "password",
        "code": "MIN_LENGTH",
        "message": "password must be longer than or equal to 8 characters"
      }
    ],
    "correlationId": "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
  }
}
```

Codes: `(400) VALIDATION_ERROR`, `(401) UNAUTHENTICATED`, `(403) FORBIDDEN`, `(404) NOT_FOUND`, `(409) CONFLICT`, `(422) BUSINESS_RULE`, `(429) RATE_LIMITED`, `(500) INTERNAL_ERROR`, `(503) SERVICE_UNAVAILABLE`. A status that is not listed falls back to the 400 or the 500 code. `details` is always an array. `details[].code` has no status. The correlation id is also returned in the header `x-correlation-id`.

Request bodies (the backend rejects any extra field, `forbidNonWhitelisted`):

- Login: `{ identifier, password }`. Response: `{ accessToken, expiresIn }`, `expiresIn` 3600.
- Sign-up: `{ employeeCode, username, password, confirmPassword }`. The employee must exist in `public.employees`. Response: `{ message, data }`, no token.
- Register: `{ employeeCode, password, confirmPassword }`. The employee must exist in HRDotNet. Response: `{ message, data }`, no token.
- `GET /auth/me`: `{ userId, email, username, role, employeeCode, firstName, lastName }`. `role` is `ADMIN`, `MANAGER`, or `USER`. `employeeCode` and the names are null for an account with no employee record.

Admin rule: `AdminRoleGuard` needs `employees.user_role_id = 1` (`ADMIN_ROLE_ID`) on the employee that `users.employee_id` points to. The admin account had no employee row, which caused the 403. The SQL to create it was given to the developer and was **not run by the AI**.

Cookie name: `pms-session`. Password length: 8 to 16. Refresh: `{ accessToken }` in, `{ accessToken, expiresIn }` out, `expiresIn` 7200.

## 7. Working Preferences & Writing Rules

- Replies in Caveman style, tier `ultra`. Code, commands, paths, and negations stay exact.
- Lean code is always on: reuse before writing, no speculative options, end coding tasks with a Lean Report.
- Present tense, active voice, English in code and docs. No emojis. No em dashes. No Latin abbreviations.
- Write the failing test first.
- Parse external input with Zod at the boundary. No hardcoded secrets.
- Commit and push only when the developer asks. Conventional commits. One logical change per commit.
- `backend/` belongs to the backend developer: tell him before a backend change is merged.
- The AI does not run SQL against the developer's database and does not edit `.env` values other than on request.
- Push goes to the fork `intellismartinc-iging/performance-management-system` (remote `fork`). The account has no write access to `iti-vin` (`origin`). Pull requests are opened with `gh pr create` into `iti-vin` `main`.

## 8. Open Items & Immediate Next Steps

Next actions, in order:

1. Restart the backend (`pnpm dev:backend`) and run the manual flow: `/register` or `/sign-up`, `/login`, open `/reviews`, log out, wrong password. Confirm the error envelope appears.
2. Run the cleanup SQL for existing rows with a blank email in `public.users`, and the admin employee SQL, both given in the session.
3. Commit the branch in logical commits (shared error contract, backend filter, sign-up fix, web auth, auth redesign) and open a pull request.
4. Tell the backend developer that the shape of every API error changed (breaking for Postman collections and any other client).

Open, not started:

- A session that sits idle past the end of its token is not renewed (the backend refuses an expired token, and there is no separate refresh token). The user logs in again. An active user is renewed up to 2 hours at a time.
- Future: the header shows the default department "ITI HRDotNet Department" for every user (`WORKSPACE_CONFIG.departmentName` is `"ITI HRDotNet"`, and the header adds the word "Department"). The employee record has no department column. When the backend returns a department, add it to `currentUserDtoSchema` and pass it to `WorkspaceLayout`.
- The role is used for the menu only. No page checks the role, so a `USER` can open `/employees` by typing the URL. The backend still refuses the data. Add a per-route role check in `proxy.ts` or in the pages.
- The role lives in two columns, `users.user_role_id` and `employees.user_role_id`. Decide which one is the source of truth.
- `ROLE_CODES` mirrors rows of a table, not a CHECK constraint, so no test catches a new row. `ADMIN_ROLE_ID = "1"` in the backend also assumes the row id.
- `register` still writes `hrEmployee.email ?? ""` in two places (`auth.service.ts`, lines 90 and 103). Two HRDotNet employees with no email hit the same unique error that sign-up had. Needs a decision on the email fallback.
- `ObserveModule.forRoot` has placeholder keys `YOUR_APP_KEY` and `YOUR_APP_SECRET` in `app.module.ts`.
- `backend/.env.example` lists variables that no code reads (`APP_BASE_URL`, `JWT_REFRESH_SECRET`, `SMTP_*`) and does not list `POSTGRES_*`.
- `docs/error-handling.md` still calls the envelope a "proposed contract". It is implemented now, with the status inside `code`.
- Copy of the auth brand panel was written by the AI and needs designer approval.
- No "Forgot password" flow: no endpoint exists.

Planned, not started: use `error.schema.ts` across the whole PMS.

- Backend: already global. `ApiExceptionFilter` covers every module (auth, employees, kpi-goals, behavioral-assessment, and any new one) with no change in the module.
- Web: only auth reads it today. Add one shared server-side request helper (for example `web/src/api/api-request.ts`) that calls the API, checks the response with a schema, and returns `readApiError(body)` on failure, then use it in every feature service. Show `error.message`, and map `error.details[].field` to form fields.
- Backend controllers still declare `@ApiBadRequestResponse({ type: ApiErrorResponseDto })` one by one. They already point at the new class, so Swagger is correct.

Pattern for the next modules:

1. Contract in `packages/shared-types/src/dtos/<module>.schema.ts`, built from `src/rows`.
2. Backend throws Nest exceptions. The filter writes the body.
3. Web calls the API from a server action or a server-only service, checks the response with the shared schema, and reads failures with `readApiError`.
4. A form draft becomes a request body in the feature `services/` folder.

## 9. Suggested Opening Prompt for Next Session

```text
Read docs/handoffs/2026-11-13-auth-integration.md and AGENTS.md first.

Repository: C:\Users\mdasalla\Documents\GitHub\performance-management-system
Branch: fix/auth-service-tests (uncommitted work, do not discard it).

State: auth is integrated in code between web, backend, and @pms/shared-types.
All tests pass (shared 36, backend 80, web 26). It is not yet tested end to end
in the browser.

Do not run `nest build` while the backend dev server runs. Use
`pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`.

First task: [state the task, for example "help me run the manual auth test and
then split the branch into commits"].
```
