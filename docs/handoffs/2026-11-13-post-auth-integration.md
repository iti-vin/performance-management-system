# Handoff: Auth integration and next module

2026-11-13 · For the co-developer taking over after [PR #5](https://github.com/iti-vin/performance-management-system/pull/5).

## Current state

**Main baseline** `757678d`. Auth is integrated in code. Continue the next module in development while auth acceptance and production hardening remain open. The [earlier auth handoff](2026-11-13-auth-integration.md) is a historical snapshot.

| Area               | Delivered                                                                                                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth and workspace | Login, sign-up, register, current user, access-token renewal, and logout are wired. The server owns the HttpOnly session cookie. The web shows the account name and email, uses the role for navigation, and confirms logout. The mobile menu shows the Manila date.          |
| Validation and API | Shared Zod contracts, backend input validation, a global error envelope, inline auth field errors, and validated employee pagination. Existing API clients and Postman collections need the new error shape.                                                                  |
| Database           | Module SQL and demo fixtures share one ordered bootstrap. The fresh schema enforces total cycle weights, one current actual per indicator, and finalization before release. The [Mermaid diagrams](../database-schema.md#14-key-relationship-map) show the SQL relationships. |
| Team workflow      | Root, web, and backend instructions carry the applicable checks in plain text. Use named security skills when installed. Local skill files stay gitignored.                                                                                                                   |

**Verified on main:** 36 shared-types, 90 backend, 35 web, and 4 database tests pass. The generator matches 40 tables. Package build, lint, and web/backend typechecks passed before merge. The isolated PostgreSQL 18 bootstrap and constraint rejection checks passed before merge. Real-account browser acceptance and lockout against the running app database remain open.

## Open items and release gates

1. **Run auth acceptance.** Use approved test accounts to check register/sign-up, login, role menus for `ADMIN`, `MANAGER`, and `USER`, denied API access, protected navigation, logout, and the five-failure lock with a 15-minute cooldown. Verify successful renewal. Check a clean browser profile if credentials reappear after logout. Password managers can repopulate cleared fields.
2. **Verify employee ownership before exposing public account creation.** Use an approved invite or trusted employee verification flow for sign-up and registration. Also review employee list role and company scoping. The list currently requires a JWT and its query has no company filter.
3. **Finish session and abuse controls.** Access JWTs last one hour on login and two hours after renewal. Replace access-token renewal with a short-lived access JWT and a dedicated rotating refresh session that the backend revokes on logout. Add per-client IP throttling once trusted ingress is confirmed. The current IP log records the backend connection peer. Per-account lockout already exists.
4. **Agree on schema ownership before migrating existing databases.** TypeORM synchronization and the standalone SQL define different identity shapes. Preserve the user, user-role, and employee definitions pending a team decision. The three bootstrap constraints require explicit migrations on existing databases. Resolve the registration behavior for HRDotNet employees without email and confirm which role field is authoritative.

## Next module

Start **KPI Goal Templates** on a feature branch. This is the recommended next slice because templates feed review cycles under [PRD section 4](../product-requirements-document.md#4-kpi-goal-templates). Nest already has `/kpi-goals` routes. The workspace page is a placeholder. Compare the existing controller, services, and shared contracts first. Confirm HR and company scope before connecting the web. Start with list/detail, then implement edit and publish with version and validation checks. Behavioral Assessment Templates are the next template dependency before Review Cycles.

Keep HTTP calls in the feature API layer, contracts in shared types, and authorization and workflow rules in the backend. Run the security review before reporting the module complete. Follow-ups include wider web error mapping, enabling backend and database tests in CI, and replacing provisional department and recovery UI behavior as requirements are confirmed.

## Local setup and constraints

- Web uses port 3000. Backend uses port 4000. Set `PMS_API_BASE_URL=http://localhost:4000/` for web.
- While backend dev is running, use `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json`. Nest build deletes the running server's output directory.
- Use `db:init` for isolated demo databases. It loads fixtures. Edit the owning SQL module, regenerate shared rows, and rebuild packages when row shapes change.
- Use English in code and docs. Keep changes lean, verify against the PRD, and coordinate backend changes with its owner before merge.

## Opening prompt

```text
Read AGENTS.md, this handoff, and PRD section 4. Start a KPI Goal Templates
feature branch from current main. Inspect the existing Nest routes, shared
contracts, and placeholder page. Confirm HR and company access rules, then
integrate list and detail. Keep auth acceptance and production hardening
tracked as separate work.
```
