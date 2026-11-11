# Security Policies

**System:** HRDotNet Performance (PMS)  
**Basis:** PRD v2.0, especially role/company rules and production gates  
**Status:** Required production security baseline; policy decisions remain subject to HR/Security approval

## 1. Purpose

HRDotNet Performance handles employee performance records, evaluator feedback, KPI evidence, journal entries, NTEs and PIP information. Security controls must protect confidentiality, integrity and availability across all API and data-access paths.

The current prototype's browser-local storage and role preview are not production security controls.

## 2. Security principles

- Enforce least privilege and deny by default.
- Authenticate every protected request.
- Authorize every resource read and mutation server-side.
- Enforce company isolation in queries and writes.
- Derive actor identity from the authenticated session/token, not request-body fields.
- Minimize personal data returned, logged and exported.
- Preserve evidence and audit history against unauthorized modification.
- Fail closed when identity, scope or policy cannot be established.

## 3. Roles and access scope

| Role | Permitted scope | Key restrictions |
|---|---|---|
| Employee | Own records, exact assigned evaluator work, own released result, own issued NTE and own PIP workflow | No access to other employees' records, manager/HR journals or another evaluator's response |
| Manager | Current performance-management team in current company, plus exact assignments owned | Cannot edit another evaluator's response; cannot create, issue, cancel or resolve NTEs |
| HR Administrator | Authorized organization/company scope | Administrative access and exceptional actions must be audited |

Additional requirements:

- Subject participation does not imply evaluator authority.
- Manager scope must use current effective manager assignment and company context.
- In-progress/submitted evaluator response ownership remains with the original evaluator after manager reassignment.
- Employee access to results is gated by result release.
- Draft NTEs are not employee-visible.
- Managers may read only issued NTEs for permitted team employees.
- List counts, search results, exports, detail routes and linked records must use the same authorized dataset.

## 4. Authentication and session management

The PRD requires authenticated backend access but does not prescribe a specific identity provider or token architecture. Select and document the production authentication mechanism before deployment.

Minimum requirements:

- Use secure credential handling and a vetted authentication mechanism.
- Store passwords only using an approved password-hashing algorithm if local credentials are used.
- Protect sessions/tokens against theft and replay.
- Define expiration, refresh, revocation and logout behavior.
- Establish account recovery, lockout/rate-limit and administrative access policies.
- Validate token issuer, audience, signature, expiry and relevant claims.
- Do not expose tokens in URLs, logs or client-visible error messages.
- Establish policy for delegated access, acting roles and break-glass administration (PRD AUTH-007).

## 5. Authorization enforcement

- Apply authorization in guards and service/data-access layers; guards alone are insufficient for record-level scope.
- Scope every query by company and the caller's permitted employee/assignment relationships.
- Verify ownership before returning a resource or applying a mutation.
- Verify target and source records independently for cross-resource operations.
- Reject unauthorized access even if a caller guesses a UUID.
- Do not rely on frontend route protection, hidden buttons, role selectors or client-side filters.
- Ensure pagination totals and aggregate reports do not leak out-of-scope records.
- Apply the same authorization to file/document access, exports, notifications and audit views.

## 6. Company/tenant isolation

- Resolve company membership from trusted authenticated context.
- Validate that employee, manager, position, cycle, template and related records belong to the same authorized company as required.
- Do not accept a client-provided company identifier as proof of access.
- Add company-aware query constraints and appropriate relational integrity.
- Test cross-company ID substitution for every resource type.
- Company selector in the prototype is a local demonstration only, not tenant isolation.

## 7. Data protection and privacy

The PRD identifies privacy and retention as production gates but does not define final retention periods or legal bases. HR/Privacy must approve them before production.

Required engineering controls:

- Collect and expose only fields needed for the current task.
- Protect sensitive data in transit using approved TLS configuration.
- Protect database, backups and document storage using approved encryption controls.
- Restrict database credentials and secrets to the minimum required privileges.
- Store secrets outside source control and rotate them under an approved process.
- Define retention, archival, deletion, legal hold and data-subject request handling with HR/Privacy.
- Restrict access to NTE content, employee explanations, journals, evaluator narratives and PIP records.
- Avoid placing sensitive employee content in notifications; notifications should link to authorized source records.
- Establish privacy review and access logging before real employee data is loaded.

## 8. Audit and monitoring

Record security-relevant and business-critical events, including:

- Authentication and session events as approved.
- Access denied events and administrative access.
- Create/update/submit/verify/return actions.
- Assignment changes and workflow recovery.
- Finalization and result release.
- NTE issue, read receipt, response, early close and cancellation.
- PIP referral, source exclusion, weekly assessment and closure.
- Export and sensitive record access where required by policy.

Audit events must capture actor, entity, action, timestamp, company/context, reason where required, and before/after values where appropriate. The audit store must be append-only; ordinary application users must not update or delete audit events.

## 9. API and application security

- Validate all inputs at the API boundary.
- Use parameterized database operations.
- Apply rate limits to authentication and abuse-prone operations.
- Set safe CORS, security headers and request size limits.
- Prevent mass assignment by explicitly mapping allowed DTO fields.
- Do not expose stack traces, SQL errors or internal implementation details.
- Use secure file handling if attachments are later introduced; the PRD requires attachment scanning if attachments are introduced.
- Keep dependencies patched and scan dependencies/build artifacts under the team's approved process.

## 10. Reporting and exports

- Apply row-level authorization before aggregation or export.
- Include only fields permitted for the caller.
- Suppress anonymous Peer/Upward results and narratives below the configured minimum distinct-submitter threshold.
- Prevent export endpoints from bypassing screen-level scope.
- Log sensitive export events where required by policy.
- Do not include evaluator identity in anonymous aggregate outputs.

## 11. Security testing

Before production, test:

- Unauthenticated requests to protected routes.
- Employee A attempting to access Employee B's records.
- Manager accessing employees outside current team scope.
- Cross-company UUID substitution.
- Subject attempting to edit evaluator response.
- Evaluator attempting to edit another evaluator's assignment.
- Employee viewing unreleased results or draft NTEs.
- Manager attempting NTE create/issue/close/cancel.
- Unauthorized export, search, count and notification access.
- Replay/duplicate requests and stale concurrent updates.
- Audit tampering attempts and sensitive-data leakage in logs/errors.

## 12. Decisions required before production

HR, Security and Engineering must approve: identity provider/authentication model, session policy, company membership model, delegated/break-glass access, encryption/key management, retention/deletion periods, privacy notice/purpose, audit retention, incident response, export policy and integration credentials.
