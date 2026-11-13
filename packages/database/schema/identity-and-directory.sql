-- ============================================================================
-- 2. Identity and Directory
-- ============================================================================
-- Defines role codes and the company, department, position, and employee directory.

-- Stores named role codes for the PMS directory.
CREATE TABLE IF NOT EXISTS pms.user_role (
    id          bigint PRIMARY KEY,
    code        text NOT NULL,
    name        text NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Stores company-level settings and the optional demo date.
CREATE TABLE IF NOT EXISTS pms.companies (
    company_id  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        text NOT NULL,
    demo_mode   boolean NOT NULL DEFAULT false,   -- Clk-002
    demo_date   date,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Groups employees within a company.
CREATE TABLE IF NOT EXISTS pms.departments (
    department_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id    bigint NOT NULL REFERENCES pms.companies(company_id),
    name          text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);


-- Defines company-specific job titles.
CREATE TABLE IF NOT EXISTS pms.positions (
    position_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id  bigint NOT NULL REFERENCES pms.companies(company_id),
    title       text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
