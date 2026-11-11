# Error Handling

**System:** HRDotNet Performance (PMS)  
**Basis:** PRD common requirements, workflow exception tables and production gates  
**Purpose:** Consistent, safe and recoverable API and workflow failures

## 1. Goals

Errors must be actionable without disclosing restricted information. Validation failures must preserve valid user input. Failed multi-step operations must not leave partial state. Retryable operations must be idempotent and observable.

## 2. Error categories

| Category | Examples | Expected handling |
|---|---|---|
| Validation | Missing required field, negative KPI actual, invalid date order, invalid question answer | Reject request; identify field and correction |
| Authentication | Missing, expired or invalid credentials | Return authentication failure without sensitive detail |
| Authorization | Out-of-scope employee, company or assignment | Reject without confirming restricted resource details |
| Not found | Unknown or inaccessible resource | Use a non-disclosing not-found response where needed |
| Conflict | Invalid lifecycle transition, duplicate action, stale version | Return conflict; explain allowed next step |
| Business rule | Incomplete cycle readiness, overlapping PIP weeks, missing return reason | Return stable business error code and actionable message |
| Rate limit | Excessive requests | Return rate-limit response and retry guidance |
| Dependency/technical | Database unavailable, worker failure, notification provider failure | Fail safely, log correlation ID, retry only when safe |
| Unexpected | Unhandled application error | Generic response; full diagnostic details only in protected logs |

## 3. API error envelope

Use a consistent envelope. This is a proposed contract; exact codes and field names should be standardized during API implementation.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      {
        "field": "actualValue",
        "code": "NON_NEGATIVE_REQUIRED",
        "message": "Actual value must be zero or greater."
      }
    ],
    "correlationId": "request-correlation-id"
  }
}
```

Do not return stack traces, SQL text, secrets, token claims, internal hostnames or restricted employee data.

## 4. HTTP status mapping

| HTTP status | Use |
|---|---|
| `400 Bad Request` | Malformed request or invalid syntax |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated caller lacks permission |
| `404 Not Found` | Resource does not exist or must not be disclosed |
| `409 Conflict` | Invalid state transition, duplicate command or stale version |
| `422 Unprocessable Entity` | Structurally valid request that fails business validation |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server failure |
| `503 Service Unavailable` | Temporarily unavailable service/dependency |

Use one consistent mapping across modules. Do not return HTTP 200 for failed operations.

## 5. Validation behavior

- Validate DTO shape and primitive constraints at the API boundary.
- Validate business rules in the service layer immediately before mutation.
- Preserve valid form values when validation fails.
- Return field-specific details when safe.
- Validate numeric values as finite; reject NaN/infinity and negative values where prohibited.
- Zero is valid for KPI targets/actuals where the PRD specifies it.
- Validate weight totals, score ranges, threshold ordering, date intervals, stage order, question types and unique options.
- Validate company and record ownership independently of DTO values.

## 6. Workflow conflict handling

Return a conflict when the record has changed or the requested transition is no longer valid. Include the current permitted state only if the caller is authorized to see it.

Examples:

- A verified accomplishment cannot be edited through the normal employee path.
- A submitted assessment cannot be edited unless HR performs the documented reopen action with reason and impact confirmation.
- A cycle cannot be finalized until required assignments and accomplishments meet completion gates.
- Results cannot be released before finalization.
- An NTE cannot be closed early without a reason and explicit confirmation.
- An NTE response cannot be submitted a second time.
- A PIP cannot close while required source coverage/referral review or weekly assessment gates remain incomplete.
- A manager assignment cannot apply if live eligibility or reporting graph validation fails.

## 7. Transactions and partial failures

- Wrap related writes in a database transaction.
- On failure, roll back all writes in the unit of work.
- Never show success until the transaction commits.
- If an external notification fails after a business transaction commits, preserve the business action and record delivery failure for retry; do not duplicate the business record.
- Use an outbox or equivalent durable delivery mechanism when reliable notification delivery is implemented.
- Reconcile interrupted worker operations using durable state and idempotency keys.

## 8. Idempotency and retries

- Require idempotency keys for retryable workflow commands where the PRD/database design specifies them.
- Bind a key to the authenticated actor, operation and request intent.
- Store the result or operation identity durably.
- A repeated identical request returns the original outcome rather than creating duplicates.
- Reject reuse of the same key with a materially different request.
- Retry transient dependency failures with bounded backoff and operational monitoring.
- Do not automatically retry non-idempotent writes without a deduplication guarantee.

## 9. Concurrency and stale writes

- Use optimistic version checks for versioned records such as operational goals.
- Use row locks or equivalent transaction isolation for critical lifecycle transitions.
- Reject stale updates with `409 Conflict`; do not silently overwrite newer data.
- Preserve user input and provide a refresh/review path.
- Enforce unique constraints to prevent duplicate participants, assignments and PIP source rows.
- Test concurrent cycle activation, assessment submission, NTE response and PIP assessment.

## 10. Scheduled jobs and background work

- Production scheduling runs independently of browser sessions.
- Revalidate eligibility, dates, state and scope when the job executes.
- Record job key, source record, result, blocked reason, attempt count and idempotency key.
- Retry transient failures; move exhausted jobs to a dead-letter or equivalent review queue.
- Alert operators about repeated failures and overdue work.
- Never silently substitute a different template or mutate an already-applied assignment.

## 11. Logging and correlation

- Generate or propagate a request correlation ID.
- Include it in error responses and structured logs.
- Log error category, operation, outcome, actor reference and affected record ID only as permitted.
- Redact credentials, tokens, secrets and sensitive employee content.
- Keep diagnostic logs separate from immutable business audit events.

## 12. User-facing messages

Messages should state:
1. What action failed.
2. Which field or workflow condition needs attention.
3. What the user can do next.
4. Whether the data was saved, rejected or remains pending.

Do not blame the user, expose internal system details or imply an action succeeded when it did not.

## 13. Operational response

Production operations must define alert thresholds, on-call ownership, incident escalation, retry/dead-letter review, database recovery and user communication. The PRD requires production correlation IDs, reliable scheduling, durable persistence and operational monitoring; numeric SLOs and retry thresholds remain to be approved.
