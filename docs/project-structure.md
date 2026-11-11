# Project Structure

This project follows a **modular architecture** using NestJS. Each module is responsible for a specific feature and contains its own DTOs, entities, guards, services, strategies, and controllers.

## Directory Structure

```text
pms/
├── src/
│   ├── modules/
│   │   └── auth/
│   │       ├── dtos/
│   │       │   ├── api-response.dto.ts
│   │       │   ├── auth-response.dto.ts
│   │       │   ├── login.dto.ts
│   │       │   └── signin.dto.ts
│   │       │
│   │       ├── entities/
│   │       │   └── user.entity.ts
│   │       │
│   │       ├── guards/
│   │       │   └── jwt-auth.guard.ts
│   │       │
│   │       ├── services/
│   │       │   └── auth.service.ts
│   │       │
│   │       ├── strategies/
│   │       │   └── jwt.strategy.ts
│   │       │
│   │       ├── auth.controller.ts
│   │       └── auth.module.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   └── test-db.mjs
│
├── nest-cli.json
├── oxlint.json
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.build.json
├── tsconfig.json
├── vitest.config.e2e.ts
└── vitest.config.ts
```

## Directory and File Responsibilities

### 1. `src/`

Contains the main application source code.

- **`modules/`** – Contains feature-based modules that organize the application's business logic.
- **`app.module.ts`** – The root application module responsible for importing and registering application modules.
- **`main.ts`** – The application entry point responsible for bootstrapping the NestJS application.

### 2. `src/modules/auth/`

Contains all authentication-related functionality.

| Directory/File | Responsibility |
|---|---|
| `dtos/` | Defines Data Transfer Objects (DTOs) for validating and structuring incoming requests and outgoing responses. |
| `api-response.dto.ts` | Defines the standard API response structure. |
| `auth-response.dto.ts` | Defines the authentication response structure. |
| `login.dto.ts` | Defines and validates login request data. |
| `signin.dto.ts` | Defines and validates sign-in or registration request data. |
| `entities/` | Contains database entities and their structures. |
| `user.entity.ts` | Defines the user database entity. |
| `guards/` | Contains route guards responsible for protecting endpoints. |
| `jwt-auth.guard.ts` | Protects routes by requiring valid JWT authentication. |
| `services/` | Contains authentication business logic. |
| `auth.service.ts` | Handles authentication operations such as login, registration, and token generation. |
| `strategies/` | Contains authentication strategies. |
| `jwt.strategy.ts` | Validates JWT tokens and extracts authenticated user information. |
| `auth.controller.ts` | Handles authentication HTTP endpoints and delegates operations to the service. |
| `auth.module.ts` | Registers and organizes authentication-related dependencies. |

### 3. `test/`

Contains application testing files.

- **`app.e2e-spec.ts`** – Contains end-to-end tests for application functionality.
- **`test-db.mjs`** – Contains database-related utilities for testing.

### 4. Root Configuration Files

| File | Responsibility |
|---|---|
| `nest-cli.json` | Configures the NestJS CLI. |
| `oxlint.json` | Configures Oxlint rules and code-quality checks. |
| `package.json` | Defines project metadata, dependencies, and npm scripts. |
| `package-lock.json` | Locks dependency versions for consistent installations. |
| `README.md` | Provides project documentation and setup instructions. |
| `tsconfig.json` | Defines TypeScript compiler configuration. |
| `tsconfig.build.json` | Defines TypeScript configuration specifically for production builds. |
| `vitest.config.ts` | Configures Vitest for unit testing. |
| `vitest.config.e2e.ts` | Configures Vitest for end-to-end testing. |

## Architectural Guidelines

To maintain consistency, scalability, and maintainability, follow these guidelines:

1. **Modular Architecture** – Organize application features into independent modules.
2. **Separation of Concerns** – Keep controllers, services, DTOs, entities, guards, and strategies in their respective directories.
3. **DTO Validation** – Use DTOs to validate and define request and response data structures.
4. **Business Logic** – Keep business logic inside services rather than controllers.
5. **Authentication and Authorization** – Use guards and strategies to secure protected endpoints.
6. **Scalability** – Create a dedicated module for every new application feature.
7. **Maintainability** – Follow consistent naming conventions and folder organization.

## Adding New Modules

When introducing a new feature, follow the same modular structure.

Example:

```text
src/
└── modules/
    ├── auth/
    ├── users/
    ├── employees/
    ├── departments/
    └── roles/
```

Each feature should own its related components and business logic to maintain a clean and scalable application architecture.
