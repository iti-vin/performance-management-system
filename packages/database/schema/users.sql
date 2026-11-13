-- ============================================================================
-- 14. Users (authentication)
-- Lives in public schema so TypeORM entity @Entity({ name: 'users' }) works
-- without a schema prefix on the connection.
-- ============================================================================
-- Defines the legacy standalone authentication table. The backend TypeORM model differs.
-- Keep this definition separate from a TypeORM-managed database until ownership is aligned.

-- Stores the legacy standalone account fields and temporary login lock state.
CREATE TABLE IF NOT EXISTS public.users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text NOT NULL UNIQUE,
    username   text NOT NULL UNIQUE,
    password   text NOT NULL,
    failed_login_attempts integer NOT NULL DEFAULT 0,
    login_locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
