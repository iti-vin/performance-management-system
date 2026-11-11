# Coding Standards

**System:** HRDotNet Performance (PMS)  
**Backend baseline:** NestJS + TypeScript  
**Architecture reference:** Supplied `pms/` project structure  
**Status:** Engineering conventions proposed to implement the PRD and database design

## 1. Purpose

These standards keep the NestJS backend modular, predictable, testable and consistent. The PRD defines business behavior; the database design defines the logical persistence model; this document defines implementation conventions. Where a tool version, lint rule or formatting setting is not specified by the project configuration, treat it as a team decision.

## 2. Project architecture

Use feature-oriented modules under `src/modules/`. A module owns its controller, service, DTOs, entities and supporting guards/strategies where relevant.

```text
pms/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── employees/
│   │   ├── manager-assignments/
│   │   ├── kpi-templates/
│   │   ├── behavioral-templates/
│   │   ├── cycles/
│   │   ├── accomplishments/
│   │   ├── evaluations/
│   │   ├── files/
│   │   ├── pip/
│   │   ├── operational-goals/
│   │   ├── notifications/
│   │   └── audit/
│   ├── app.module.ts
│   └── main.ts
├── test/
├── nest-cli.json
├── oxlint.json
├── package.json
└── tsconfig*.json
```

The module names above are a suggested decomposition from the PRD scope, not a statement that all modules already exist.

## 3. Module responsibilities

- **Controller:** HTTP transport only; parse route/query/body inputs, invoke a service, and return a documented response.
- **Service:** Business rules, authorization-aware operations, transaction orchestration and domain state transitions.
- **DTO:** Request validation and response shape. Do not use persistence entities as public request contracts.
- **Entity/model:** Persistence mapping and domain data representation.
- **Guard/strategy:** Authentication and request-level authorization integration.
- **Repository/data-access layer:** Encapsulate persistence queries where the chosen ORM/data-access technology supports it.
- **Shared utilities:** Only genuinely cross-cutting code; do not turn `common/` into a dumping ground.

Keep controllers thin. Do not place scoring calculations, role scope rules, workflow transitions or multi-table writes in controllers.

## 4. Naming conventions

| Item | Convention | Example |
|---|---|---|
| Module directory | kebab-case | `manager-assignments/` |
| File | kebab-case with role suffix | `auth.controller.ts` |
| Class | PascalCase | `AuthService` |
| Method/function | camelCase, verb-led | `releaseResults()` |
| Variable/property | camelCase | `companyId` |
| DTO class | PascalCase + purpose suffix | `CreateCycleDto` |
| Entity class | PascalCase singular | `Employee` |
| Database table/column | snake_case | `cycle_participants` |
| Enum values | stable lowercase identifiers | `in_progress` |
| Constants | descriptive; uppercase for true constants | `MAX_RETRY_COUNT` |

Use domain terms from the PRD consistently: `cycle`, `participant`, `assignment`, `accomplishment`, `evaluation snapshot`, `NTE`, `PIP`, `operational goal`.

## 5. TypeScript practices

- Enable and preserve strict TypeScript checks where supported by the project configuration.
- Avoid `any`; use explicit types, discriminated unions and `unknown` with validation at boundaries.
- Avoid non-null assertions unless the invariant is documented and guaranteed.
- Use `readonly` for values that must not be reassigned.
- Keep functions focused and avoid hidden side effects.
- Prefer explicit return types for public service methods and exported helpers.
- Do not use TypeScript types as runtime validation; validate untrusted HTTP input with DTO validation.
- Use UTC instants (`Date`/ISO timestamp semantics) for persisted timestamps and explicit company-local date handling for workflow calendar dates.

## 6. DTO and validation standards

- Create separate DTOs for create, update, action/transition and response operations.
- Validate all client-supplied values at the API boundary and revalidate critical business invariants inside the service.
- Reject unknown or malformed values according to the configured validation policy.
- Validate numeric values as finite numbers; reject negative KPI actuals/targets; allow zero where the PRD says zero is valid.
- Validate score ranges, percentage totals, date order, seven-day PIP week intervals, unique multiple-choice options and question-type-specific answers.
- Validate UUIDs and enum-like state values.
- Do not trust client-supplied `companyId`, `employeeId`, actor identity, role, evaluator ownership or authorization claims. Derive identity/scope from the authenticated principal and verify referenced records server-side.

## 7. Service and domain logic

- Implement each workflow transition as an explicit service operation, such as `submitAccomplishment`, `verifyAccomplishment`, `finalizeCycle`, `releaseResults`, `issueNte` or `assessPipWeek`.
- Check current state, actor authority, company scope, deadlines and prerequisites before mutation.
- Use a transaction for operations that must succeed or fail as a unit.
- Use idempotency keys for retryable commands.
- Preserve immutable snapshots and version history; do not update frozen template versions, finalized result evidence or submitted response history in place.
- Separate finalization from release.
- Keep operational goals separate from KPI scoring.
- Do not implement automated disciplinary, compensation or employment decisions; these are outside the PRD scope.

## 8. Persistence conventions

- Use the PostgreSQL schema conventions in `database-schema.md`.
- Keep database access parameterized through the selected ORM/query layer; never concatenate untrusted input into SQL.
- Use migrations for schema changes; do not rely on manual production schema edits.
- Add foreign keys and unique constraints for declared relationships and uniqueness rules.
- Put complex cross-row/business validation in services and enforce it again in transactional workflows.
- Use optimistic concurrency/version checks for stale-write-sensitive records.
- Avoid physical deletion of business records; use lifecycle state/archive/cancellation semantics.
- Keep audit records append-only.

## 9. API and response conventions

- Use resource-oriented routes and HTTP methods.
- Use consistent response envelopes and error shapes as defined in `api-contracts.md`.
- Return appropriate HTTP status codes; do not encode every failure as HTTP 200.
- Do not expose persistence internals, stack traces, SQL messages, secrets or fields outside the caller's scope.
- Paginate list endpoints and apply filters after authorization scope has been established.
- Keep list counts, pagination, detail routes and exports based on the same authorized dataset.

## 10. Testing standards

- Unit-test domain rules and scoring boundaries.
- Test service authorization for employee self-scope, manager team scope and HR company/organization scope.
- Test API DTO validation and response contracts.
- Test transaction rollback, idempotency, duplicate submissions and concurrent updates.
- Test immutable template/result snapshots.
- Add integration tests against PostgreSQL-compatible behavior for constraints and transaction semantics.
- Add end-to-end tests for critical workflows and role boundaries.
- Include positive, negative, boundary, overdue, cancelled, returned and recovery cases.
- Never rely only on frontend tests for server-side security.

## 11. Logging and observability

- Use structured logs with a request/correlation ID.
- Log workflow identifiers, action, outcome and actor reference only when permitted.
- Do not log passwords, access tokens, secrets, full NTE bodies, employee explanations or unnecessary personal data.
- Record business audit events separately from operational diagnostic logs.
- Avoid swallowing exceptions; translate known failures at the service/API boundary and allow unexpected failures to be observed by centralized handling.

## 12. Formatting, linting and code review

- Follow the repository's configured TypeScript, Oxlint and test settings.
- Do not introduce new formatting or lint tools without team agreement.
- Keep imports organized and remove dead code.
- Require review for authorization, scoring, lifecycle, database migration and audit changes.
- Every behavior change should include tests and a PRD requirement reference where applicable.
