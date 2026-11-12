# @pms/backend

The PMS API: a NestJS 12 service with JWT authentication, employee records, KPI goal templates, and behavioral assessment templates.

## Overview

- Every route except sign-up, register, login, and refresh-token needs a bearer token (`JwtAuthGuard`).
- Employee reads of a single record, create, and update need the admin role (`AdminRoleGuard`).
- Request bodies are validated with class-validator. The global `ValidationPipe` strips unknown fields and rejects extra ones (`whitelist` and `forbidNonWhitelisted`).
- The API connects to two databases: a main PostgreSQL database that it owns, and a read-only SQL Server database from HRDotNet (`secondaryDB`).
- Swagger UI is at `/swagger`.

## Endpoints

| Method and path                                | Purpose                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| `POST /auth/sign-up`                           | Create a login for an existing employee code              |
| `POST /auth/register`                          | Register a user connected to HRDotNet                     |
| `POST /auth/login`                             | Log in with an email or username. Returns `{ accessToken, expiresIn }` |
| `POST /auth/refresh-token`                     | Exchange a valid access token for a new one               |
| `GET /auth/me`                                 | The authenticated user (`userId`, `email`, `username`)    |
| `GET /employees`, `GET /employees/me/profile`  | List employees, and the current user's record             |
| `GET /employees/:id`                           | One employee (admin)                                      |
| `POST /employees/create`, `POST /employees/:id/update` | Create and edit an employee (admin)               |
| `GET /kpi-goals`, `GET /kpi-goals/:id`         | List KPI goal templates, and one with its indicator tree  |
| `POST /kpi-goals/create`                       | Create a draft template                                   |
| `POST /kpi-goals/:id/update`                   | Replace the draft version                                 |
| `POST /kpi-goals/:id/published`, `POST /kpi-goals/:id/archived` | Publish the draft, archive a template   |
| `GET /behavioral-assessment`, `GET /behavioral-assessment/:id` | List templates, and one with its section tree |
| `POST /behavioral-assessment/create`, `POST /behavioral-assessment/:id/update`, `POST /behavioral-assessment/:id/published` | Create, replace the draft, publish |

## Tech Stack

NestJS 12 (Express), TypeORM 1.1 (a `postgres` and an `mssql` connection), Passport JWT, `@nestjs/swagger`, bcryptjs, class-validator and class-transformer, `@nestjs/observe`. ESM modules (`"type": "module"`). Tests use Vitest. Lint uses oxlint.

## Architecture

### Folder Structure

```text
src/
├── main.ts            Bootstrap: ValidationPipe, Swagger, listen on PORT
├── app.module.ts      Database connections and the feature modules
├── config/            env.config.ts: environment variables, checked at startup
├── common/            Decorators, DTOs and guards that two or more modules use
├── modules/           Each module: controllers/, services/, dtos/, entities/, types/
│   ├── auth/          Controller, service, JWT strategy, DTOs, entities
│   ├── employees/     Controller, service, admin guard, entities
│   ├── kpi-goals/     KPI goal templates, versions, indicators, scales, matrix
│   └── behavioral-assessment/   Templates, versions, sections, questions, options
```

The full layout and its rules are in `docs/project-structure.md`.

### Application Flow

A controller parses the request and maps the status. A service holds the rules and reads or writes through TypeORM repositories. Entities define the tables.

### Notes on the databases

`backend/package.json` declares the `mssql` driver but not `pg`, which the `postgres` connection loads. The workspace install makes `pg` resolvable today because `@pms/database` depends on it. Add `pg` to this package.

The main connection sets `synchronize: true`, so TypeORM creates and alters tables from the entities when the app starts. The repository also holds `packages/database/schema.sql`. The two are separate definitions of the same tables. See the schema ownership note in [docs/workspace-blueprint.md](../docs/workspace-blueprint.md).

## Prerequisites

Node.js 24, pnpm 12.14.0, a PostgreSQL server, and access to the HRDotNet SQL Server. The app throws at startup when `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, or `DB_DATABASE` is missing.

## Configuration

```bash
cp .env.example .env
```

| Variable                                  | Default      | Purpose                              |
| ----------------------------------------- | ------------ | ------------------------------------ |
| `PORT`                                    | `3000`       | API port                             |
| `POSTGRES_HOST`                           | `localhost`  | Main database host                   |
| `POSTGRES_PORT`                           | `5433`       | Main database port                   |
| `POSTGRES_DB`                             | `postgres`   | Main database name                   |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`      | `postgres`, empty | Main database login             |
| `DB_HOST`, `DB_DATABASE`                  | none, required | HRDotNet SQL Server                |
| `DB_PORT`                                 | `1433`       | HRDotNet SQL Server port             |
| `DB_USERNAME`, `DB_PASSWORD`              | none, required | HRDotNet SQL Server login          |
| `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE` | unset      | Set to `true` to turn them on        |
| `DB_CONNECTION_TIMEOUT`, `DB_REQUEST_TIMEOUT` | `30000`  | Milliseconds                         |
| `JWT_ACCESS_SECRET`                       | a development value in code | Secret that signs tokens. Set it in every environment |

`.env.example` does not list the `POSTGRES_*` variables. Add them.

## Running the Project

The default port clashes with the web dev server, so run the API on 4000:

```bash
PORT=4000 pnpm dev:backend
```

On Windows PowerShell: `$env:PORT=4000; pnpm dev:backend`. Run it from the repository root, or use `pnpm start:dev` in this folder. Production: `pnpm build`, then `pnpm start:prod`.

## Development

| Task    | Command          |
| ------- | ---------------- |
| Build   | `pnpm build`     |
| Lint    | `pnpm lint`      |
| Format  | `pnpm format`    |

ESLint rules in `oxlint.json` block imports from `@pms/web`, deep imports into `@pms/shared-types`, and relative paths into another workspace.

## Testing

```bash
pnpm test           # unit tests
pnpm test:cov       # with coverage
pnpm test:e2e       # uses vitest.config.e2e.ts; no e2e tests exist yet
```

Today the 8 tests in `auth.service.spec.ts` fail with a Nest dependency error. Spec files also exist for the employee and behavioral assessment services.
