# @pms/backend

The PMS API: a NestJS 12 service with JWT authentication, employee records, KPI goal templates, and behavioral assessment templates.

## Overview

- Every route except login and refresh-token needs a bearer token (`JwtAuthGuard`).
- Employee reads of a single record, create, and update need the admin role (`AdminRoleGuard`).
- Request bodies are validated with class-validator. The global `ValidationPipe` strips unknown fields and rejects extra ones (`whitelist` and `forbidNonWhitelisted`).
- The API connects to one PostgreSQL database. Auth and employee data live in the `pms` schema.
- Swagger UI is at `/swagger`.

## Endpoints

| Method and path                                | Purpose                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| `POST /auth/login`                             | Log in with an email or username. Returns `{ accessToken, expiresIn }` |
| `POST /auth/refresh-token`                     | Exchange a valid access token for a new one               |
| `GET /auth/me`                                 | The authenticated user (`userId`, `email`, `username`)    |
| `GET /employees`, `GET /employees/me/profile`  | List employee records by page, or get the current user's record |
| `GET /employees/:id`                           | One employee (admin)                                      |
| `POST /employees/create`, `POST /employees/:id/update` | Create and edit an employee (admin)               |
| `GET /kpi-goals`, `GET /kpi-goals/:id`         | List KPI goal templates, and one with its indicator tree  |
| `POST /kpi-goals/create`                       | Create a draft template                                   |
| `POST /kpi-goals/:id/update`                   | Replace the draft version                                 |
| `POST /kpi-goals/:id/published`, `POST /kpi-goals/:id/archived` | Publish the draft, archive a template   |
| `GET /behavioral-assessment`, `GET /behavioral-assessment/:id` | List templates, and one with its section tree |
| `POST /behavioral-assessment/create`, `POST /behavioral-assessment/:id/update`, `POST /behavioral-assessment/:id/published` | Create, replace the draft, publish |

`GET /employees?page=1&pageSize=20` returns `{ items, page, pageSize, pageCount, total }`. Page numbers start at 1. The default page size is 20 and the maximum is 100. The API orders rows by employee ID. An empty result set has a page count of 0. A page past the end returns empty `items` with the requested page number and the full counts.

## Tech Stack

NestJS 12 (Express), TypeORM 1.1 (one `postgres` connection), Passport JWT, `@nestjs/swagger`, bcryptjs, class-validator and class-transformer, `@nestjs/observe`. ESM modules (`"type": "module"`). Tests use Vitest. Lint uses oxlint.

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

The connection sets `synchronize: false`. `packages/database/schema.sql` owns the tables, and the entities map them without changing them.

## Prerequisites

Node.js 24, pnpm 12.14.0, and a PostgreSQL server with `packages/database/schema.sql` applied. The app throws at startup when `JWT_ACCESS_SECRET` is missing or blank.

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
| `JWT_ACCESS_SECRET`                       | none, required | Secret used to sign and verify access tokens |


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

Unit tests cover authentication, environment validation, employee records and pagination, and behavioral assessment.
