# Handoff: rate limit on every API route

Date of this state: 2026-11-27. Branch `main` at `9f86101`, nothing committed. Read first: `2026-11-27-review-module-live-checks.md`. This closes finding 6 (no rate limit, CWE-770) of the security report in `2026-11-26-review-module-pending-closed.md`.

## State

| Item                                        | State                                          |
| ------------------------------------------- | ---------------------------------------------- |
| Limit on every route that reaches a handler | Built, tested, checked live on the login route |
| Login page words for 429                    | Built, tested. Not seen live                   |
| New dependency                              | None                                           |

Verified after the last change: `pnpm test` (shared-types 150, backend 772 in 35 files, web 924 in 69 files), `pnpm lint`, `pnpm typecheck`, and the backend `tsc --noEmit`: all pass.

## Limits of one minute

| Request                        | Counts for                               | Limit |
| ------------------------------ | ---------------------------------------- | ----- |
| `POST /auth/login`             | The login name, trimmed, any letter case | 10    |
| `POST /auth/login`             | The address, for all names together      | 300   |
| `POST /auth/refresh-token`     | The address                              | 600   |
| `GET /auth/me`                 | The user                                 | 1200  |
| Other `GET` and `HEAD`         | The user                                 | 300   |
| Other methods                  | The user                                 | 60    |
| A route with no signed-in user | The address                              | 600   |

Over a limit: 429 in the error envelope (`(429) RATE_LIMITED`), with `Retry-After` in seconds. A refused login name does not use up the cap of the address. The account lock after repeated wrong passwords is older and unchanged.

## Decisions and reasons

| Decision                                                                 | Reason                                                                                                            |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Own limiter in `backend/src/common/rate-limit/`, not `@nestjs/throttler` | No new dependency. The default store of that package is also in memory                                            |
| Signed-in requests count for the user                                    | The web server sends every request from one address. A limit by address would be one bucket for the whole company |
| A global interceptor                                                     | It runs after the guards, which name the user                                                                     |
| The login policy is a decorator on the handler                           | A path match would miss `/AUTH/LOGIN/`                                                                            |
| Fixed numbers, no setting                                                | One caller today                                                                                                  |

## Red and green runs

| Part                              | Command                                                      | Red                 | Green |
| --------------------------------- | ------------------------------------------------------------ | ------------------- | ----- |
| Limiter, interceptor, auth routes | `pnpm --filter @pms/backend test rate-limit auth.controller` | 10 failed, 6 passed | 16    |
| Login words                       | `pnpm --filter @pms/web test submit-credentials`             | 1 failed, 4 passed  | 5     |

Tests that passed before their code were proven by a temporary change: one key for all, and the address counted before the name, each failed a test. The test of a new window first passed with a broken window; it now checks the refusal inside the new window, and fails with that change.

## Live check

Local backend, a login name with no account, so no row changed. Ten requests answered 400 (the test password is over 16 characters, and the limit counts before the body check), the eleventh 429 with `Retry-After: 60`. The same name in another letter case, and on `/AUTH/LOGIN/`, answered 429. Another name answered 400. A signed-in administrator page still loads.

Signed-in reads: with a token of the `user` test account, 302 reads of `/reviews` in 2 seconds answered 200 three hundred times, then 429 from request 301. So the bucket is that of the user (`validate()` of the JWT strategy answers `userId`), not the shared bucket of the address, which ends at 600. `/auth/me` still answered 200. A successful login changes no row.

## Known limits

1. The counts are in the memory of one process. Two processes count separately, and a restart clears them.
2. A request that a guard refuses (no token, wrong role) is not counted, because the interceptor runs after the guards. An unknown route is not counted either.
3. Someone can hold one login name at 429 by sending it 10 times a minute. The account lock already allowed a similar block.
4. The web server shares one address: 300 logins a minute is the cap of the whole company through the web, and a flood can use it up. A limit at the proxy or gateway, with the real client address, closes 2 and 4.
5. The `login_rejected` log records the address of the web server (older behavior).
6. Refreshes of all users share the 600 of the web server address. The proxy refreshes a token only in its last 10 minutes, and a renewed token lasts 2 hours, so each user needs a few calls every 2 hours: it bites only with thousands of active users.
7. A new login name is counted before the cap of the address. A flood of new names keeps adding keys after the cap refuses them. With the map full (10,000 keys), each new key scans it and drops the oldest windows, those of signed-in users too. They then start a new count.
8. A read refused with 429 shows the "unavailable, reload" notice, and reloading adds to the count. A 429 on `/auth/me` would trip the error page of the workspace (limit 1200 a minute).
9. Not checked: the change limit and the login page words for 429 live, refresh under load, and the link prefetching of a production build, which dev mode does not do.

## Open after this

The full requirement check of the review modules and the remaining plan: `docs/reviews/2026-11-27-review-modules-prd-check-and-plan.md`. Read it first.

HR administrator who is a participant reads the reviews about themselves; HR approval of the scoring policy; Team Reviews tab; no way to remove one assignment; export, PIP referral, notifications; the live checks listed in the earlier handoff; nothing is committed.

## Opening prompt for the next session

```text
Read AGENTS.md, CLAUDE.md, and docs/handoffs/2026-11-27-rate-limit.md.
Ask me before any write to the database. Commit nothing until I ask. I run all SQL.
```
