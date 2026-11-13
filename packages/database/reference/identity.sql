
-- ============================================================================
-- HRDotNet Performance PMS
-- Identity and Directory Schema
-- PostgreSQL | public schema
-- Reference design only. The package bootstrap does not include this file.
-- Reconcile it with the TypeORM entities before using it for a migration.
--
-- Tables:
--   1. user_role
--   2. employees
--   3. users
--
-- Notes:
--   * User roles are standalone reference records.
--   * Each employee belongs to one user role.
--   * Each user account belongs to exactly one employee.
--   * Each user account has one user role.
--   * Passwords must be stored as Argon2id hashes, never plaintext.
-- ============================================================================

-- ============================================================================
-- 1. User Roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_role (
    user_role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL UNIQUE,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Employees
-- Each employee belongs to one user role.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    guid          UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    code          TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,

    hrdotnet_id   BIGINT,

    user_role_id  BIGINT NOT NULL,

    status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive')),

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_employees_user_role
        FOREIGN KEY (user_role_id)
        REFERENCES public.user_role(user_role_id)
);

-- ============================================================================
-- 3. Users
-- Each user account belongs to exactly one employee and one user role.
-- employee_id UNIQUE enforces at most one user account per employee.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    employee_id   BIGINT NOT NULL UNIQUE,
    user_role_id  BIGINT NOT NULL,

    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_users_employee
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id),

    CONSTRAINT fk_users_user_role
        FOREIGN KEY (user_role_id)
        REFERENCES public.user_role(user_role_id)
);

-- ============================================================================
-- 4. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_employees_user_role_id
    ON public.employees(user_role_id);

CREATE INDEX IF NOT EXISTS idx_users_user_role_id
    ON public.users(user_role_id);
