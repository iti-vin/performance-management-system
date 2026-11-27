# Project Structure

HRDotNet Performance (PMS) is a pnpm monorepo with two apps and two shared packages. This file is the map of every folder and the rule each folder follows. When the folders on disk and this file disagree, correct one of them in the same pull request.

## 1. Repository

```text
performance-management-system/
├── .github/
│   ├── CODEOWNERS                 # Owners per path, asked for review on a pull request
│   └── workflows/ci.yml           # Typecheck, lint, build and tests on the affected workspaces
├── .husky/pre-commit              # Runs lint-staged before every commit
├── backend/                       # @pms/backend: NestJS API
├── web/                           # @pms/web: Next.js app
├── packages/
│   ├── shared-types/              # @pms/shared-types: Zod enums, row schemas, request and response schemas
│   └── database/                  # @pms/database: PostgreSQL schema, seed and init script
├── docs/                          # Product and engineering documents
├── AGENTS.md                      # Instructions for coding agents
├── CLAUDE.md                      # Claude Code entry point
├── README.md
├── eslint.config.mjs              # ESLint for packages/. web has its own config, backend uses Oxlint
├── .prettierrc
├── .prettierignore
├── .gitignore
├── package.json                   # Root scripts
├── pnpm-workspace.yaml            # Workspaces (web, backend, packages/*) and the version catalog
├── pnpm-lock.yaml
└── tsconfig.base.json             # Shared TypeScript settings
```

### Which workspace may import which

| Workspace               | May import          | Never imports                   |
| ----------------------- | ------------------- | ------------------------------- |
| `web`                   | `@pms/shared-types` | `@pms/backend`, `@pms/database` |
| `backend`               | `@pms/shared-types` | `@pms/web`                      |
| `packages/shared-types` | `zod` only          | any other workspace             |
| `packages/database`     | `pg` only           | any other workspace             |

A package is imported by its name, from its root (`@pms/shared-types`). No relative path reaches into another workspace. Lint enforces these rules.

## 2. `backend/` (NestJS API)

Each feature is one module under `src/modules/`. Inside a module, every folder holds one kind of file and every file has one job.

```text
backend/
├── src/
│   ├── main.ts                              # Bootstrap: ValidationPipe, Swagger, listen on PORT
│   ├── app.module.ts                        # Config, the two database connections, the feature modules
│   │
│   ├── config/
│   │   ├── env.config.ts                    # Zod schema of the environment variables, checked at startup
│   │   └── env.config.spec.ts
│   │
│   ├── common/                              # Only code that two or more modules use
│   │   ├── decorators/
│   │   │   └── matches.decorator.ts
│   │   ├── dtos/
│   │   │   └── api-response.dto.ts
│   │   ├── filters/
│   │   │   ├── api-exception.filter.ts      # Global filter: every failure leaves as the shared error envelope
│   │   │   └── api-exception.filter.spec.ts
│   │   └── guards/
│   │       └── jwt-auth.guard.ts
│   │
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts
│       │   │   └── auth.controller.spec.ts
│       │   ├── services/
│       │   │   ├── account-registration.service.ts
│       │   │   ├── auth.service.ts
│       │   │   └── auth.service.spec.ts
│       │   ├── dtos/
│       │   │   ├── current-user-response.dto.ts
│       │   │   ├── login.dto.ts
│       │   │   ├── password-length.spec.ts
│       │   │   ├── refresh-token.dto.ts
│       │   │   └── token-response.dto.ts
│       │   ├── entities/
│       │   │   ├── user-role.entity.ts
│       │   │   └── user.entity.ts
│       │   ├── strategies/
│       │   │   └── jwt.strategy.ts
│       │   └── types/
│       │       └── jwt-payload.types.ts
│       │
│       ├── employees/
│       │   ├── employees.module.ts
│       │   ├── controllers/
│       │   │   ├── employees.controller.ts
│       │   │   └── employees.controller.spec.ts
│       │   ├── services/
│       │   │   ├── employee.service.ts
│       │   │   └── employee.service.spec.ts
│       │   ├── dtos/
│       │   │   ├── create-employee.dto.ts
│       │   │   ├── employee-page.dto.ts
│       │   │   ├── list-employees-query.dto.ts
│       │   │   └── update-employee.dto.ts
│       │   ├── entities/
│       │   │   └── employee-domain.entity.ts
│       │   ├── guards/
│       │   │   └── admin-role.guard.ts
│       │   └── types/
│       │       ├── authed-user.types.ts
│       │       └── employee-status.enum.ts
│       │
│       ├── kpi-goals/
│       │   ├── kpi-goals.module.ts
│       │   ├── controllers/
│       │   │   ├── kpi-goals.controller.ts
│       │   │   └── kpi-goals.controller.spec.ts
│       │   ├── services/
│       │   │   ├── publication-history.ts
│       │   │   ├── company-resolver.service.ts      # Company and actor GUID of the signed-in account
│       │   │   ├── company-resolver.service.spec.ts
│       │   │   ├── kpi-goals.service.ts
│       │   │   └── kpi-goals.service.spec.ts
│       │   ├── dtos/
│       │   │   ├── create-kpi-goal-template.dto.ts
│       │   │   ├── kpi-goal-template-contract.spec.ts
│       │   │   ├── kpi-indicator.dto.ts
│       │   │   └── update-kpi-goal-template.dto.ts
│       │   ├── entities/
│       │   │   ├── kpi-goal-template.entity.ts
│       │   │   ├── kpi-indicator-matrix-cell.entity.ts
│       │   │   ├── kpi-indicator-matrix-column.entity.ts
│       │   │   ├── kpi-indicator-matrix-row.entity.ts
│       │   │   ├── kpi-indicator-scale.entity.ts
│       │   │   ├── kpi-indicator.entity.ts
│       │   │   └── kpi-template-version.entity.ts
│       │   └── types/
│       │       └── template-tree.types.ts
│       │
│       ├── review-cycles/
│       │   ├── review-cycles.module.ts
│       │   ├── controllers/
│       │   │   ├── accomplishments.controller.ts
│       │   │   ├── accomplishments.controller.spec.ts
│       │   │   ├── parsed-input.ts
│       │   │   ├── review-cycles.controller.ts
│       │   │   ├── review-cycles.controller.spec.ts
│       │   │   ├── reviews.controller.ts
│       │   │   └── reviews.controller.spec.ts
│       │   ├── services/
│       │   │   ├── accomplishments.service.ts
│       │   │   ├── accomplishments.service.spec.ts
│       │   │   ├── accomplishment-rules.ts
│       │   │   ├── review-cycles.service.ts
│       │   │   ├── cycle-facts.ts
│       │   │   ├── cycle-readiness.ts
│       │   │   ├── cycle-readiness.spec.ts
│       │   │   ├── participant-resolver.ts
│       │   │   ├── participant-resolver.spec.ts
│       │   │   ├── review-cycles.service.spec.ts
│       │   │   ├── reviews.service.ts
│       │   │   ├── reviews.service.spec.ts
│       │   │   ├── review-assessment.service.ts
│       │   │   ├── review-assessment.service.spec.ts
│       │   │   ├── review-answers.ts
│       │   │   ├── review-stages.ts
│       │   │   ├── review-reopening.ts
│       │   │   ├── cycle-extension.ts
│       │   │   ├── assert-open-cycle.ts
│       │   │   ├── anonymity.ts
│       │   │   ├── cycle-activation.service.ts
│       │   │   ├── cycle-work.ts
│       │   │   ├── result-snapshots.ts
│       │   │   ├── cycle-attention.service.ts
│       │   │   ├── cycle-history.service.ts
│       │   │   ├── results.service.ts
│       │   │   ├── review-feedback.ts
│       │   │   ├── review-stage-cards.ts
│       │   │   ├── scoring.ts
│       │   │   └── viewer.ts
│       │   ├── dtos/
│       │   │   ├── cancel-review-cycle.dto.ts
│       │   │   ├── create-review-cycle.dto.ts
│       │   │   ├── extend-review-cycle.dto.ts
│       │   │   ├── reopen-review.dto.ts
│       │   │   └── review-cycle-contract.spec.ts
│       │   ├── entities/
│       │   │   ├── accomplishment-actual.entity.ts
│       │   │   ├── accomplishment-version.entity.ts
│       │   │   ├── accomplishment.entity.ts
│       │   │   ├── assignment-response.entity.ts
│       │   │   ├── assignment.entity.ts
│       │   │   ├── cycle-participant.entity.ts
│       │   │   ├── cycle-stage.entity.ts
│       │   │   ├── cycle.entity.ts
│       │   │   └── manager-assignment.entity.ts
│       │   └── testing/
│       │       └── memory-table-spec.ts
│       │
│       └── behavioral-assessment/
│           ├── behavioral-assessment.module.ts
│           ├── controllers/
│           │   └── behavioral-assessment.controller.ts
│           ├── services/
│           │   ├── behavioral-assessment.service.ts
│           │   └── behavioral-assessment.service.spec.ts
│           ├── dtos/
│           │   ├── behavioral-section.dto.ts
│           │   ├── create-behavioral-template.dto.ts
│           │   └── update-behavioral-template.dto.ts
│           ├── entities/
│           │   ├── behavioral-choice-option.entity.ts
│           │   ├── behavioral-question.entity.ts
│           │   ├── behavioral-section.entity.ts
│           │   ├── behavioral-template-version.entity.ts
│           │   └── behavioral-template.entity.ts
│           └── types/
│               └── template-tree.types.ts
│
├── .env.example                             # Names of the environment variables, no values
├── .gitignore
├── .prettierrc
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── nest-cli.json
├── oxlint.json                              # Lint rules, including the import rules below
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts                         # Unit tests
└── vitest.config.e2e.ts                     # End-to-end tests
```

### 2.1 Folders inside a module

A module has only the folders it needs. Do not create an empty folder.

| Folder             | Holds                                                 | File name                           | Rule                                                                                                              |
| ------------------ | ----------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `controllers/`     | HTTP endpoints                                        | `<name>.controller.ts`              | Transport only: read the route, query and body, call one service method, return the response. No business rules.  |
| `services/`        | Business logic                                        | `<name>.service.ts`                 | Rules, state changes and transactions. A service never reads the HTTP request or response.                        |
| `dtos/`            | Request and response shapes                           | `<purpose>.dto.ts`                  | Validated with `class-validator`. An entity is never used as a request body.                                      |
| `entities/`        | Database models                                       | `<name>.entity.ts`                  | One TypeORM entity per file.                                                                                      |
| `guards/`          | Access checks used by this module only                | `<name>.guard.ts`                   | A guard used by two or more modules moves to `common/guards/`.                                                    |
| `strategies/`      | Passport strategies                                   | `<name>.strategy.ts`                | Auth module only.                                                                                                 |
| `types/`           | Interfaces, type aliases and enums with no decorators | `<name>.types.ts`, `<name>.enum.ts` | Interfaces are imported with `import type`. A type derived from an entity's value list stays in that entity file. |
| `<name>.module.ts` | Module registration                                   | at the module root                  | Lists the module's controllers, providers, imports and exports.                                                   |

Tests sit next to the file they test: `auth.service.ts` and `auth.service.spec.ts`.

Names from other frameworks:

| Asked for | In this NestJS project | Why                                                                                                                                                              |
| --------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `models/` | `entities/`            | NestJS with TypeORM calls a database model an entity.                                                                                                            |
| `routes/` | `controllers/`         | NestJS has no route files. The `@Controller()`, `@Get()` and `@Post()` decorators on a controller define the routes. A separate routes folder would repeat them. |

### 2.2 One job per file

- One class per file: one controller, one service, one entity, one guard.
- A file states its job in its name (`kpi-goals.service.ts`, `login.dto.ts`).
- Split a file when it has more than one job or grows past about 300 lines. Split a service by use case (for example `kpi-template-read.service.ts` and `kpi-template-write.service.ts`), and a DTO file by operation (`create-*.dto.ts`, `update-*.dto.ts`, `*-response.dto.ts`). The nested parts of one request body may share a file (`kpi-indicator.dto.ts` holds the indicator and its scales and matrix).
- An interface declared inside a controller or a service moves to `types/` when it is exported or when a second file needs it.

### 2.3 `config/` and `common/`

| Directory/File                           | Responsibility                                                                                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/env.config.ts`                   | Defines every environment variable the API reads, `PORT` included, with a Zod schema. `ConfigModule` runs it at startup and stops the start when a variable is missing or invalid. |
| `common/guards/jwt-auth.guard.ts`        | Protects routes by requiring valid JWT authentication. Used by every module.                                                                                                       |
| `common/dtos/api-response.dto.ts`        | Defines the standard API error response structure. Used by every controller.                                                                                                       |
| `common/decorators/matches.decorator.ts` | Validation decorator that checks one field equals another.                                                                                                                         |

`common/` holds only code that two or more modules use. It is not a place for code that has no other home.

### 2.4 Dependency direction

```text
main.ts -> app.module.ts -> modules/<feature> -> common/, config/
```

- A module imports `common/` and `config/`. `common/` and `config/` never import a module (`oxlint.json` enforces this).
- Inside a module: controller -> service -> entity. A service never imports a controller.
- A module uses another module through that module's exported service, registered in `imports` of its `*.module.ts`. Known exceptions today: `employees` imports the `User` entity and `ADMIN_ROLE_ID` of `auth`, and `kpi-goals` imports `AdminRoleGuard`, `EmployeeService`, and `AuthedUser` of `employees` and the `User` entity of `auth`. `system-architecture.md` lists them.

### 2.5 Error handling

The rules are in `error-handling.md`. Their place in this structure:

| Concern                                | Place                                                                                                    | State              |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------ |
| Request validation                     | `dtos/` with the global `ValidationPipe` in `main.ts`                                                    | In place           |
| Business failures                      | Thrown by `services/` as NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, and so forth) | In place           |
| Access failures                        | Thrown by `guards/`                                                                                      | In place           |
| One error envelope for every failure   | `common/filters/api-exception.filter.ts` (a global exception filter, set in `main.ts`)                   | In place           |
| Domain error classes with stable codes | `common/exceptions/`                                                                                     | Planned, not built |

A controller does not catch errors to change them. A `catch` either adds context and rethrows with `cause`, or handles the failure completely. An empty `catch` is not allowed.

### 2.6 Adding a module

1. Create `src/modules/<feature>/` with `<feature>.module.ts`.
2. Add `entities/` and register them with `TypeOrmModule.forFeature()` in the module.
3. Add `dtos/` for each request and response.
4. Add `services/<feature>.service.ts` with its `*.spec.ts`.
5. Add `controllers/<feature>.controller.ts` and list it in the module's `controllers`.
6. Add `types/`, `guards/` or `strategies/` only when the module has such a file.
7. Import the module in `app.module.ts`.

## 3. `web/` (Next.js app)

```text
web/
├── src/
│   ├── proxy.ts                             # Runs before each page: redirects by the pms-session cookie
│   │
│   ├── app/                                 # Routes only
│   │   ├── layout.tsx                       # Root layout
│   │   ├── globals.css                      # Tailwind entry and token imports
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── favicon.ico
│   │   ├── (auth)/                          # Signed-out pages
│   │   │   ├── layout.tsx
│   │   │   └── login/page.tsx
│   │   └── (workspace)/                     # Signed-in pages
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       ├── error.tsx
│   │       ├── not-found.tsx
│   │       ├── 202-files/page.tsx
│   │       ├── employees/page.tsx
│   │       ├── goals/
│   │       │   ├── page.tsx                 # With goals-content.tsx and goals-description.tsx: the KPI reports
│   │       │   └── [accomplishment-id]/     # page.tsx, record-content.tsx
│   │       ├── my-team/page.tsx
│   │       ├── pip/page.tsx
│   │       ├── reports/page.tsx
│   │       ├── review-cycles/
│   │       │   ├── page.tsx                 # Register
│   │       │   ├── new/page.tsx             # Create wizard
│   │       │   └── [cycle-id]/              # page.tsx and details-content.tsx (Cycle Details), edit/page.tsx
│   │       └── reviews/
│   │           ├── page.tsx
│   │           ├── [assignment-id]/         # page.tsx, review-content.tsx
│   │           └── templates/
│   │               ├── behavioral-assessment-template/page.tsx
│   │               └── kpi-goal-template/
│   │                   ├── page.tsx             # List
│   │                   ├── new/page.tsx         # Builder
│   │                   └── [template-id]/
│   │                       ├── page.tsx         # Details
│   │                       └── edit/page.tsx    # Edit
│   │
│   ├── components/                          # Reusable components with no feature knowledge
│   │   ├── ui/                              # shadcn primitives on Base UI
│   │   ├── atoms/                           # Smallest display pieces: badges, score bar, progress cell
│   │   ├── molecules/                       # Groups of atoms and ui primitives
│   │   ├── organisms/                       # Data table, filtered table, charts, error and not-found states, notification menu
│   │   └── templates/                       # Page skeletons: listing, detail, form, placeholder
│   │
│   ├── features/                            # One folder per feature
│   │   ├── auth/
│   │   │   ├── api/                         # auth-requests.ts
│   │   │   ├── components/                  # credentials-form.tsx, password-input.tsx
│   │   │   ├── hooks/                       # use-credentials-form.ts
│   │   │   └── services/                    # auth-credentials.ts, current-user.ts, refresh-session.ts, session-cookie.ts, session-guard.ts, sign-out.ts, submit-credentials.ts
│   │   ├── evaluations/
│   │   │   ├── components/                  # evaluator-scoring-form.tsx, review-question-field.tsx, review-history.tsx, rating-field.tsx, review-completion.tsx
│   │   │   └── services/                    # assessment-request.ts
│   │   ├── position-goals/
│   │   │   ├── api/                         # accomplishment-requests.ts (server only)
│   │   │   ├── components/                  # accomplishment-record.tsx (one report) with its summary, values, history, indicator table, indicator criteria and card, reporting form, and verification panel; accomplishments-list.tsx, accomplishments-table.tsx, goals-notice.tsx
│   │   │   └── services/                    # accomplishment-reader.ts, accomplishment-response.ts, actuals-request.ts, target-result.ts, kpi-template-label.ts
│   │   ├── review-cycles/
│   │   │   ├── api/                         # review-cycle-requests.ts (server only)
│   │   │   ├── components/                  # The create wizard (cycle-wizard, details, participants, templates, stages), review-cycles-table.tsx and review-cycles-content.tsx (the register), reviews-content.tsx, review-list.tsx, reviews-table.tsx, and review-list-notice.tsx (All Reviews), review-summary.tsx and review-template-card.tsx (one review), cycle-details.tsx with cycle-overview.tsx, cycle-participants-tab.tsx, cycle-progress-tab.tsx, extend-deadlines-dialog.tsx, anonymous-stages.tsx, cycle-results-tab.tsx, results-table.tsx, result-details.tsx, and review-assessment-header.tsx
│   │   │   └── services/                    # review-cycle-reader.ts, cycle-draft.ts, cycle-changes.ts, cycle-components.ts, result-reader.ts, result-words.ts, cycle-progress.ts, status-filter.ts, launch-confirmation.ts, manage-review-cycle.ts, save-review-cycle.ts, review-list-params.ts, review-response.ts
│   │   └── review-templates/
│   │       ├── api/                         # goal-template-requests.ts (server only)
│   │       ├── components/                  # kpi-goal-template-editor.tsx, indicator-matrix-editor.tsx, goal-template-* (list, listing, details, create, edit, notices), behavioral-template-editor.tsx (not routed)
│   │       └── services/                    # create-goal-template.ts, manage-goal-template.ts, goal-template-reader.ts, goal-template-selection.ts, goal-template-editor-state.ts, goal-template-format.ts, indicator-matrix.ts, template-requests.ts
│   │
│   ├── layouts/                             # auth-layout.tsx, workspace-layout.tsx, workspace-account-menu.tsx, workspace-clock.tsx
│   ├── constants/                           # domain-labels.ts, goal-template-path.ts, review-tones.ts, workspace-config.ts, workspace-navigation.ts
│   ├── context/                             # query-provider.tsx, theme-provider.tsx
│   ├── stores/                              # workspace-store.ts (Zustand)
│   ├── hooks/                               # use-mobile.ts, use-problem-focus.ts, use-unsaved-changes-warning.ts
│   ├── api/                                 # api-client.ts, api-url.ts, authorized-requests.ts (server side only)
│   ├── services/                            # api-read.ts, api-send.ts: calls of two or more features (server side only)
│   ├── lib/                                 # utils.ts (class name helper)
│   ├── utils/                               # api-error-text.ts, csv.ts, form-problems.ts, workspace-date.ts
│   ├── styles/                              # colors.css, typography.css, layout.css, media.css, motion.css, surfaces.css
│   └── types/                               # chart.ts, form-action.ts, person.ts, role.ts
│
├── public/
│   ├── assets/                              # 404 image and the HRDotNet logos
│   └── logo/                                # App icons and site.webmanifest
├── tests/
│   ├── setup.ts
│   ├── utils/render.tsx
│   ├── unit/
│   ├── component/
│   ├── integration/
│   └── e2e/
├── .env.example
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── DESIGN.md                                # Design system notes. The CSS in src/styles wins when they differ
├── README.md
├── components.json                          # shadcn configuration
├── eslint.config.mjs
├── llm.txt
├── next.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.mts
```

### 3.1 Folder rules

| Folder                                                        | Holds                                                            | Rule                                                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `app/`                                                        | Routes, layouts, `loading`, `error` and `not-found` files        | Routing only. A page composes components and features. No business rules.            |
| `app/(auth)/`, `app/(workspace)/`                             | Route groups                                                     | The parentheses keep the group name out of the URL. Each group has one `layout.tsx`. |
| `components/ui/`                                              | shadcn primitives                                                | Added with the shadcn CLI. Not edited for one feature's needs.                       |
| `components/atoms/`, `molecules/`, `organisms/`, `templates/` | Shared components, smallest to largest                           | No import from `features/`. A component used by one feature lives in that feature.   |
| `features/<feature>/components/`                              | Components of one feature                                        | A feature does not import another feature.                                           |
| `features/<feature>/services/`                                | Request builders, server actions and session code of one feature | A request body is checked with a schema from `@pms/shared-types`.                    |
| `layouts/`                                                    | Page shells used by the route group layouts                      |                                                                                      |
| `constants/`                                                  | Static values                                                    | `domain-labels.ts` is the only place a domain code becomes words.                    |
| `context/`                                                    | React providers mounted by the root layout                       |                                                                                      |
| `stores/`                                                     | Zustand stores                                                   | UI state only, never server records.                                                 |
| `hooks/`                                                      | Hooks shared by two or more features                             |                                                                                      |
| `api/`                                                        | The API client                                                   | Server side only. The browser never calls the backend directly.                      |
| `lib/`, `utils/`                                              | Small pure helpers                                               |                                                                                      |
| `styles/`                                                     | Design tokens                                                    | The designer palette in `colors.css` is not edited without the designer.             |
| `types/`                                                      | UI view types                                                    | Domain contracts come from `@pms/shared-types`, not from here.                       |
| `tests/`                                                      | `unit/`, `component/`, `integration/`, `e2e/`                    | Shared setup in `setup.ts` and `utils/render.tsx`.                                   |

Dependency direction: `app` -> `features`, `layouts`, `components` -> `hooks`, `stores`, `context` -> `api`, `lib`, `utils`, `constants`, `types`.

## 4. `packages/shared-types/`

```text
packages/shared-types/
├── src/
│   ├── index.ts                   # The only entry point
│   ├── common.ts                  # Shared Zod pieces
│   ├── domain/                    # One enum per file: <name>.enum.ts, plus index.ts
│   ├── rows/                      # One generated row schema per table: <table>.row.ts, plus index.ts
│   ├── rules/                     # Rules both apps and the editor share: kpi-matrix.ts, kpi-target.ts, kpi-weights.ts
│   └── dtos/                      # Request and response schemas: <topic>.schema.ts
├── scripts/generate-rows.mjs      # Writes src/rows from packages/database/schema.sql
├── test/                          # One <topic>.test.mjs per area (auth, db-enums, errors, goal-template, ids, kpi rules, rows)
├── README.md
├── package.json
└── tsconfig.json
```

| Folder    | Rule                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| `domain/` | One Zod enum per file. The values match the database.                                       |
| `rows/`   | Generated. Edit the owning SQL module, then run `pnpm --filter @pms/shared-types generate`. |
| `dtos/`   | One file per topic. `web` and `backend` both validate with these.                           |

## 5. `packages/database/`

```text
packages/database/
├── schema.sql                     # Ordered schema entry point
├── schema/                        # Table and constraint definitions by module
├── seed.sql                       # Ordered development fixture entry point
├── seeds/                         # Development fixtures by module
├── init-db.mjs                    # Creates the database, applies schema.sql and seed.sql
├── schema.test.mjs
├── sql-files.mjs                  # Reads the ordered SQL includes for Node callers
├── reference/                     # Identity design notes and reference SQL
├── README.md
└── package.json
```

The module definitions under `schema/` supply the row schemas generated by `shared-types`. The generator and initializer both follow the order declared in `schema.sql`. The backend TypeORM definitions remain separate. See `workspace-blueprint.md` for the open ownership decision.

## 6. `docs/`

| File                                       | Subject                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `README.md`                                | Index of the documents                                                          |
| `product-requirements-document.md`         | What the system does                                                            |
| `project-structure.md`                     | This file                                                                       |
| `system-architecture.md`                   | Topology, stack, directory layout, module boundaries, request flows             |
| `workspace-blueprint.md`                   | Workspaces, their boundaries and versions                                       |
| `coding-standards.md`                      | Backend coding conventions                                                      |
| `engineering-rules.md`                     | Rules for every change                                                          |
| `api-contracts.md`                         | Endpoints and response shapes                                                   |
| `error-handling.md`                        | Error categories, envelope and status codes                                     |
| `database-schema.md`, `database-design.md` | Tables and the logical model                                                    |
| `security-policies.md`                     | Security rules                                                                  |
| `legacy-gap-analysis.md`                   | What the legacy web app has that `web/` lacks                                   |
| `handoffs/`                                | State snapshots for whoever continues a piece of work. `README.md` is the index |
