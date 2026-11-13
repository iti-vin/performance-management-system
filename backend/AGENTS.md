# PMS Backend

The root instructions apply to this workspace.

## Commands

- From the repository root, run `pnpm dev:backend` with the backend port set to 4000.
- Run `pnpm --filter @pms/backend test` and `pnpm --filter @pms/backend lint` for affected changes.
- Use `pnpm --filter @pms/backend exec tsc --noEmit -p tsconfig.json` for type checking. A Nest build deletes the compiled output, so run it only when the backend dev server is stopped.

## NestJS and API validation

- Use `backend-development` and `api-design` for backend and API changes when available.
- Keep controllers focused on routing and HTTP concerns. Put business rules in services and persistence in repositories or entities.
- Validate API inputs with the existing Nest DTO validators or Zod at the request boundary. Keep required fields, types, and limits consistent with shared contracts.
- Use the shared API error envelope for client-facing errors. Return field details for validation failures and keep raw database errors out of responses.
- Verify validation and authorization with requests that reach the API directly, including rejected input and denied access.

## Authorization and data

- Enforce authorization at the API boundary. Apply `auth-architecture` to auth and session changes when available.
- Keep HRDotNet MSSQL access read-only. Use transactions for multi-step PostgreSQL writes, parameterize queries, and avoid N+1 access.
- Follow the root security review workflow when completing a module. Coordinate backend changes with its owner before merge.
