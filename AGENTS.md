# PMS: HRDotNet Performance Management System

pnpm 12 monorepo on Node 24. `web`: Next.js 16.4 App Router, React 19, Tailwind CSS 4, shadcn (base-nova), Zod 4. `backend`: NestJS 12, TypeORM, PostgreSQL (main) and read-only MSSQL (HRDotNet). `packages/shared-types`: Zod contracts. `packages/database`: PostgreSQL schema.

## Commands

Run from the repository root.

- Install: `pnpm install` (the root `postinstall` also builds `packages/*`)
- Dev web: `pnpm dev:web` (port 3000; needs `web/.env.local` from `web/.env.example`)
- Dev backend: `pnpm dev:backend` with the backend port set to 4000.
- Build: `pnpm build`
- Test: `pnpm test` or run the test script for each affected workspace. Report actual results and any baseline failures.
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- After you edit `packages/shared-types/src`: `pnpm build:packages` (web and backend read `dist/`)
- After you edit `packages/database/schema.sql`: `pnpm --filter @pms/shared-types generate`, then `pnpm build:packages`

## Lean code (always on)

Apply to every request that writes or changes code. No trigger is needed. `/lean-code off` ends it.

1. Split the task into requirements. Per requirement, stop at the first rung that satisfies it: (1) not needed now, (2) exists in this codebase, (3) standard library, (4) runtime or platform, (5) installed dependency, (6) one expression, (7) smallest implementation.
2. Read the target file, its neighbors, and the manifest before you write.
3. Add no dependency, option, parameter, or abstraction without a present caller. Ask before a new dependency.
4. Never cut validation, security, data safety, accessibility, or tests.
5. End each coding task with a Lean Report: a table of requirement, rung, evidence, and lines written; the deferred items with the trigger that makes each necessary; and the command you ran with its result.
6. `/lean-code review` reports over-engineering in a diff. `/lean-code audit <dir>` reports it in one folder. `/lean-code debt` lists deferred items. Both report only and change no file.

## Security

- Apply `security-best-practices` during every module or feature implementation when the skill is available. Validate external input at the server boundary, enforce authorization where data is accessed or changed, parameterize database queries, and keep secrets out of code, logs, and client responses. Check cookie flags and token handling when the change affects authentication.
- Before reporting a module complete, use `security-auditor` to review all affected layers. If the skill is unavailable, perform the review manually. Check authentication, authorization, input handling, sensitive data, and changed dependencies as applicable. Report verified findings with severity and file references, and state which checks remain unverified.
- Use named skills when available. Apply the rules in these tracked instructions even when a skill is missing from the local install.

## Project rules

- Write in present tense and active voice, in English.
- No emojis in code, comments, or commit messages. No em dashes: use a colon, parentheses, or a new sentence. No Latin abbreviations: write "for example", "that is", "and so forth".
- Write the failing test first (Red, Green, Refactor).
- Validate external input at the boundary. Use shared Zod schemas where applicable and the existing Nest DTO validators for DTO-backed API routes. Hardcode no secret, connection string, or token. Log no secret.
- Replies use the Caveman style at tier `ultra`. Keep code, commands, paths, and negations exact.

## Code style

Web component: a typed props interface, a named function, design tokens in the class (no raw colors).

```tsx
interface StatusBadgeProps {
  label: string;
  tone: ReviewTone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`h-auto max-w-full shrink rounded-pms-tag border-transparent text-pms-label whitespace-normal text-(color:--pms-ink-on-tint) ${REVIEW_TONE_SURFACE_CLASS[tone]}`}
    >
      {label}
    </Badge>
  );
}
```

Shared enum: a database code list as `as const`, a Zod schema from it, and the type from the schema.

```ts
export const CYCLE_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "completed",
  "cancelled",
] as const;

export const cycleStatusSchema = z.enum(CYCLE_STATUSES);
export type CycleStatus = z.infer<typeof cycleStatusSchema>;
```

## Naming

- Files and folders: `kebab-case`. Types, interfaces, classes, components: `PascalCase`. Variables and functions: `camelCase`. Constants: `UPPER_SNAKE_CASE`. SQL: `snake_case`.
- The JSON field is the `camelCase` of its column, with no rename (`cycle_id` becomes `cycleId`). A boolean has a verb: `isActive`, `hasPermission`, `canSubmit`. Never a negative name.
- One verb per operation: `fetch` for a remote call, `get` for an in-memory read, `delete` for destroying a resource, `remove` for taking an item out of a collection.
- Enum values are the database codes (`in_progress`). Words for people live in `web/src/constants/domain-labels.ts`.

## TypeScript, functions, errors

- `strict` stays on. No `any`, no `enum` keyword (use a union or an `as const` list), no cast to hide a type error. Use `import type` for types. Switches over a union are exhaustive.
- A function stays at cognitive complexity 15 or lower. Validate first and return early. Do not mutate a parameter. Three or more parameters become one options object. A function either changes state or returns a value, not both.
- Wrap a third-party exception in a domain error and keep the cause. No empty `catch`. Log once, at the boundary that handles the error. Never send a raw database error in a response.
- Single responsibility outranks DRY. Two real callers justify an abstraction. One does not.

## Architecture

- `web/` is the Next.js app. Folder rules are in `web/llm.txt`. Design tokens are in `web/DESIGN.md`.
- `backend/` is the NestJS API. A controller parses and maps status only. A service holds the rules. A repository or TypeORM entity owns storage. Avoid N+1 queries and wrap multi-step writes in a transaction.
- New endpoints use plural `kebab-case` nouns with no verbs, correct HTTP methods, and `400` or `422` for bad input. Existing routes with `/create` and `/update` stay until the backend owner changes them.
- Dependency direction: `web` imports `@pms/shared-types` only. `backend` imports `@pms/shared-types` and never `@pms/web`. `shared-types` imports no `@pms/*`. Import a package by its root name, never by path. Lint enforces this.
- Auth: the web server action posts to the backend and stores the access token in the httpOnly cookie `pms-session`. `web/src/proxy.ts` gates pages. The backend verifies the token on every call.

## Shared contracts and database changes

- For `@pms/shared-types`, apply `typescript-standards` when available. Keep Zod contracts and inferred types compatible with web and backend. Use database codes for shared enums and export contracts from the package entry point.
- For `@pms/database`, apply `database-principles` to schema work and `database-migration` to changes that affect existing databases when available. Treat `schema.sql` as the schema source of truth. Use expand-and-contract for schema changes, preserve existing data, and index foreign keys.
- Regenerate shared row types after schema changes. Run the affected package checks and rebuild shared contracts before checking consumers.

## Boundaries

- Do not edit `packages/shared-types/src/rows/`. Run `generate`.
- Do not edit the designer palette (`--base-*`, `--status-*`, `--attendance-*`, `--calendar-*`) in `web/src/styles/colors.css`.
- Keep local agent tooling separate from tracked project rules.
- Do not commit `.env*` except `.env.example`, or any secret.
- Edit only the files the user names. `backend/` belongs to the backend developer: change only what the task names.
- Use `docs/workspace-blueprint.md` for ownership, builds, and releases.

## Git workflow

- Branch names: `feat/<name>`, `fix/<name>`. Do not push to `main`.
- One logical change per commit. Present tense, active voice, no emojis.
- Commit and push only when the user asks.
- Reviewers: the owners in `.github/CODEOWNERS`.
