# API Contracts

**System:** HRDotNet Performance (PMS)  
**Backend:** NestJS  
**Persistence:** PostgreSQL logical model  
**Status:** Proposed API contract baseline derived from the PRD and database design

## 1. Purpose and contract status

The supplied PRD describes user workflows, roles, validations and acceptance behavior, but it does not define a complete route catalogue, authentication provider, exact request/response schemas or API versioning policy. Therefore, this document establishes consistent contract rules and a proposed resource map. Endpoint paths and payload examples below are implementation proposals and require engineering review before being treated as final.

## 2. General API conventions

- Base path: `/swagger/v1` (proposed).
- Use JSON for request and response bodies unless a documented export/download endpoint requires another media type.
- Use UUID identifiers for resource IDs, consistent with the database design.
- Use ISO 8601 timestamps with timezone offsets for instants; use `YYYY-MM-DD` for company calendar dates.
- Use `snake_case` in database storage and choose one consistent public JSON convention. This proposal uses `camelCase`.
- Use pagination for collection endpoints.
- Apply authorization scope before search, filtering, aggregation, counting and pagination.
- Validate every request; never trust caller-provided actor identity or role.
- Return stable error codes and correlation IDs as specified in `error-handling.md`.
- Do not expose internal database entity structures directly.

## 3. Standard response envelopes

### Success

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "draft"
  },
  "meta": {
    "correlationId": "request-correlation-id"
  }
}
```

### Collection

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "correlationId": "request-correlation-id"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "The requested action is not available in the current state.",
    "details": [],
    "correlationId": "request-correlation-id"
  }
}
```

## 4. HTTP method semantics

| Method | Intended use |
|---|---|
| `GET` | Read a resource or collection; no state mutation |
| `POST` | Create a resource or execute a named workflow command |
| `PATCH` | Partially update an editable resource |
| `PUT` | Replace a resource only where full replacement is explicitly supported |
| `DELETE` | Avoid for business records; use archive/cancel lifecycle actions instead |

Workflow transitions should use explicit action routes or command DTOs rather than allowing clients to set arbitrary `status` fields.

## 5. Proposed resource and route map

These routes are a suggested organization of PRD capabilities, not existing endpoints.

| Resource | Proposed routes | Main actors |
|---|---|---|
| Authentication | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | Authenticated users |
| Employees | `GET /employees`, `GET /employees/:employeeId` | HR; Manager within team scope |
| Manager assignments | `GET /manager-assignments`, `POST /manager-assignments`, `POST /manager-assignments/:id/cancel` | HR |
| KPI templates | `GET/POST /kpi-templates`, `GET/PATCH /kpi-templates/:id`, `POST /kpi-templates/:id/publish`, `POST /kpi-templates/:id/archive` | HR |
| Behavioral templates | `GET/POST /behavioral-templates`, `GET/PATCH /behavioral-templates/:id`, `POST /behavioral-templates/:id/publish`, `POST /behavioral-templates/:id/archive` | HR |
| Cycles | `GET/POST /cycles`, `GET/PATCH /cycles/:id`, `POST /cycles/:id/validate`, `POST /cycles/:id/launch`, `POST /cycles/:id/schedule`, `POST /cycles/:id/cancel` | HR |
| Accomplishments | `GET /cycles/:cycleId/accomplishments`, `GET /accomplishments/:id`, `PATCH /accomplishments/:id`, `POST /accomplishments/:id/submit`, `POST /accomplishments/:id/verify`, `POST /accomplishments/:id/return` | Employee, eligible Manager, HR per policy |
| Evaluator assignments | `GET /assignments`, `GET /assignments/:id`, `PATCH /assignments/:id/response`, `POST /assignments/:id/submit`, `POST /assignments/:id/reopen` | Assigned evaluator; HR for reopen |
| Evaluation results | `GET /cycles/:cycleId/results`, `GET /evaluation-snapshots/:id`, `POST /cycles/:cycleId/finalize`, `POST /cycles/:cycleId/release` | HR; scoped viewers |
| Journals | `GET /journal-entries`, `POST /journal-entries`, `GET /journal-entries/:id` | HR/Manager within permitted scope |
| NTE | `GET/POST /nte-notices`, `GET /nte-notices/:id`, `POST /nte-notices/:id/issue`, `POST /nte-notices/:id/respond`, `POST /nte-notices/:id/close`, `POST /nte-notices/:id/cancel`, `POST /nte-notices/:id/read` | HR; employee own response/read; Manager read-only team scope |
| PIP | `GET/POST /pip-plans`, `GET/PATCH /pip-plans/:id`, `POST /pip-plans/:id/weeks`, `POST /pip-weeks/:id/updates`, `POST /pip-weeks/:id/assess`, `POST /pip-plans/:id/close`, `POST /pip-plans/:id/cancel` | HR, permitted Manager, employee own progress |
| Operational goals | `GET/POST /operational-goals`, `GET/PATCH /operational-goals/:id`, `POST /operational-goals/:id/progress` | Employee, Manager, HR by scope |
| Notifications | `GET /notifications`, `POST /notifications/:id/read`, `GET/PATCH /notification-preferences` | Recipient |
| Reports | `GET /reports/...` | Manager/HR by report scope |

## 6. Request contract examples

### 6.1 Login

```json
{
  "email": "user@example.com",
  "password": "provided-secret"
}
```

The authentication implementation and exact credential fields must match the selected identity provider. Never log the password.

### 6.2 Create KPI accomplishment draft

```json
{
  "remarks": "Optional employee remarks",
  "actuals": [
    {
      "indicatorId": "uuid",
      "actualValue": 0
    }
  ]
}
```

Rules: actuals must reference indicators in the participant's frozen KPI template; values must be finite and nonnegative; zero is valid. Actor and employee ownership come from the authenticated principal and authorized participant relationship.

### 6.3 Submit accomplishment

```json
{
  "correctionReason": "Required only when the workflow is a correction/resubmission"
}
```

The service must validate evaluation period, completeness and current state. Preserve prior submitted versions.

### 6.4 Verify or return accomplishment

```json
{
  "decision": "verified"
}
```

For return:

```json
{
  "decision": "returned",
  "reason": "Please correct the reported actual for the specified indicator."
}
```

The eligible manager is resolved from server-side current scope. A return requires a reason.

### 6.5 Submit assessment response

```json
{
  "answers": [
    {
      "questionId": "uuid",
      "value": 4
    },
    {
      "questionId": "uuid",
      "value": "Example narrative response"
    }
  ]
}
```

Validate each answer against the frozen question type and requiredness. Rating values must be 1–5 or configured Not Observed. Submitted responses lock.

### 6.6 Finalize and release

Finalization and release are separate commands. The client must not set `finalizedAt`, `releasedAt`, scores or evidence directly.

```json
{
  "reason": "Optional administrative note where policy requires"
}
```

The service calculates and freezes the evidence snapshot. Release is allowed only after successful finalization and visibility checks.

### 6.7 NTE response

```json
{
  "explanationText": "Employee explanation"
}
```

One response is allowed while the notice remains open, including after the deadline. The service determines notice ownership and state.

### 6.8 PIP week assessment

```json
{
  "outcome": "missed",
  "verifiedActual": 0,
  "remarks": "Assessment remarks",
  "missedReason": "Required when outcome is missed"
}
```

The service validates assessor authority, week state and required reason. Outcome semantics follow the PIP workflow.

## 7. Pagination and filtering

Suggested query parameters:

- `page`: 1-based page number.
- `pageSize`: bounded page size.
- `search`: text search.
- `status`: allowed lifecycle state.
- `companyId`: accepted only if validated against authenticated company membership; preferably derive active company from context.
- `employeeId`, `cycleId`, `fromDate`, `toDate`: accepted only after scope validation.
- `sortBy`, `sortOrder`: allowlisted fields and directions only.

Do not accept arbitrary SQL column names or unbounded page sizes.

## 8. Workflow contract rules

- The server derives actor identity and role.
- The server verifies company scope and record ownership on every command.
- State transitions are explicit commands, not arbitrary status updates.
- Commands validate lifecycle state and preconditions.
- Commands that can be retried accept idempotency keys in a header such as `Idempotency-Key` (proposed).
- Stale updates return a conflict response.
- Mutations return the resulting resource state or a stable operation result.
- No success response is sent before transaction commit.
- Notification delivery failure does not roll back a committed business event; it is retried through durable delivery handling.

## 9. Authorization summary

| Operation | Employee | Manager | HR Administrator |
|---|---|---|---|
| Read own released result | Yes | Own result if applicable | Authorized scope |
| Read another employee result | No | Permitted team scope | Authorized scope |
| Submit own KPI actual | Yes | Only if also the subject and policy permits | Administrative workflow only |
| Verify accomplishment | No | Eligible current manager | As explicitly authorized |
| Submit evaluator response | Exact assignment only | Exact assignment only | Not as another evaluator |
| Reopen submitted assessment | No | No | Yes, with reason/impact confirmation |
| Issue/close/cancel NTE | No | No | Yes |
| Respond to own NTE | Yes, one response while open | No | Administrative access as approved |
| Submit own PIP progress | Yes | No, unless also employee actor | Administrative workflow |
| Assess team PIP week | No | Permitted team scope | Authorized scope |
| Publish templates/finalize/release | No | No | Yes |

## 10. Contract versioning and compatibility

- Version public APIs under a stable prefix.
- Add optional response fields compatibly where possible.
- Treat breaking request/response changes as a versioning decision.
- Keep DTOs separate from database entities.
- Document deprecated fields and removal windows.
- Keep PRD requirement references in endpoint tests and API documentation.

## 11. Open API decisions

Before implementation is considered contract-complete, approve: authentication provider and claims, exact route names, public JSON casing, pagination limits, error code catalogue, idempotency header/storage semantics, export formats, file upload/download strategy, report filters, API versioning policy and HRDotNet integration contract. The PRD explicitly excludes HRDotNet write-back from current scope.
